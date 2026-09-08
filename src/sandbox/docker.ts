
import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const docker = new Docker(); // connects to the local Docker daemon over the socket

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export async function runInSandbox(
  userCode: string,
  onProgress: (line: number, elapsed: number) => void
): Promise<ExecutionResult> {
  // 1. Write the user's code to a temp file on the HOST machine, its mount this single file into the container — the container never receives anything except this one file.
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-'));
  const hostCodePath = path.join(tempDir, 'user_code.js');
  fs.writeFileSync(hostCodePath, userCode);

  let container: Docker.Container | undefined;
  let timedOut = false;

  try {
    // 2. Create the container with security limits applied up front.
    container = await docker.createContainer({
      Image: 'code-sandbox-node',
      Cmd: ['node', 'runner.js'],
      HostConfig: {
        Binds: [`${hostCodePath}:/sandbox/user_code.js:ro`], // ro = read-only mount
        Memory: 50 * 1024 * 1024,       // 50MB hard memory limit
        MemorySwap: 50 * 1024 * 1024,   // disable swap beyond the memory limit
        NanoCpus: 500_000_000,          // 0.5 CPU cores
        NetworkMode: 'none',            // no network access at all
        PidsLimit: 64,                  // stop fork-bombs
        AutoRemove: false                // we remove it manually after reading logs
      },
      Tty: false
    });

    // 3. Attach to the container's output stream BEFORE starting it,
    //    so we don't miss any early output.
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    let stdout = '';
    let stderr = '';

    // Docker multiplexes stdout/stderr together on one stream with an 8-byte
    // header per chunk. dockerode gives us a helper to split them cleanly.
    container.modem.demuxStream(
      stream,
      { write: (chunk: Buffer) => { stdout += handleChunk(chunk, onProgress); } } as any,
      { write: (chunk: Buffer) => { stderr += chunk.toString(); } } as any
    );

    await container.start();

    // 4. Enforce the hard timeout ourselves — Docker won't do this automatically.
    const TIMEOUT_MS = 8000;
    const timeoutHandle = setTimeout(async () => {
      timedOut = true;
      try {
        await container?.kill();
      } catch {
        // container may have already exited naturally; ignore
      }
    }, TIMEOUT_MS);

    // 5. Wait for the container to actually finish (or be killed above).
    const waitResult = await container.wait();
    clearTimeout(timeoutHandle);

    return {
      stdout,
      stderr,
      exitCode: waitResult.StatusCode,
      timedOut
    };
  } finally {
    // 6. Always clean up — remove the container and delete the temp file,
    //    whether execution succeeded, failed, or timed out.
    if (container) {
      try { await container.remove({ force: true }); } catch {}
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Parses each line of output, extracts __PROGRESS__ markers via the callback,
// and returns only the "real" output lines for stdout.
function handleChunk(chunk: Buffer, onProgress: (line: number, elapsed: number) => void): string {
  const text = chunk.toString();
  const lines = text.split('\n');
  const realOutputLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^__PROGRESS__:(\d+):([\d.]+)$/);
    if (match) {
      onProgress(Number(match[1]), Number(match[2]));
    } else if (line.length > 0) {
      realOutputLines.push(line);
    }
  }

  return realOutputLines.length ? realOutputLines.join('\n') + '\n' : '';
}