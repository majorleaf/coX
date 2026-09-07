import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
                
            }
        })
    }
}