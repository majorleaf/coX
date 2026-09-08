import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import write = require('fs');

//connects to local daemonover the socket
const docker = new Docker();

export interface ExecuteResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
}

export async function runInSandbox(
    userCode: string,
    onProgress: (line: number, elapsed: number) => void
): Promise<ExecutionResult> {
    // Writes the user code to a temp file on the HOST machine.
    // this single file is mounted into the container , the container never receives anything except this one file 
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-'));
    const hostCodePath = path.join(tempDir, 'user_code.js');
    fs.writeFileSync(hostCodePath, userCode);

    let container: Docker.container | undefined;
    let timedOut = false;

    try {
        //creates the container with security limits applied up front 
        container = await docker.createContainer({
            Image: 'code-sandbox-node',
            Cmd: ['node', 'runner.js'],
            HostConfig: {
                Binds: [`${hostCodePath}:/sandbox/user_code.js:ro`],
                Memory: 50 * 1024 * 1024,
                MemorySwap: 50 * 1024 * 1024,
                NanoCpus: 500_000_000,
                NetworkMode: 'none',
                PidsLimit: 64,
                AutoRemove: false

            },
            Tty: false
        });

        //Attach to the container output stream BEFORE starting it, so we dont miss any early output 
        const stream = await container.attach({
            stream: true,
            stdout: true,
            stderr: true
        });

        let stdout = '';
        let stderr = '';


        //Docker mi=ultiplexes stdout/stderr together on one stream with an 8-byte
        //header per chunk, dockerode gives us a helper to split them cleanly
        container.modem.demuxStream(
            stream,
            {write: (chunk: Buffer) => {stdout += handleChunk(chunk, onProgress); } } as any,
            {write: (chunk: Buffer) => {stdout += chunk.toString(); } } as any
        );

        await container.start();

        // personally enforced the hard timeout because docker wont do this automatically
        const TIMEOUT_MS = 8000;
        const timeoutHandle = setTimeout(async () => {
            timedOut = true;
            try {
                await container?.kill();
            } catch {
                // ignore ifcontainer may have already exited naturally 
            }
        }, TIMEOUT_MS);
         

        // Wait for the container to finish or be killed above
        const waitResult = await container.wait();
        clearTimeout(timeoutHandle);

        return {
            stdout,
            stderr,
            exitCode: waitResult.StatusCode,
            timedOut
        };
    } finally {

    }
}