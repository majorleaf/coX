import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketIOServer } from 'socket.io';
import { runInSandbox } from '../sandbox/docker';
import { createJob, getJob, updateJob, getElapsedMs } from '../sandbox/jobs';
import { exitCode } from 'node:process';

const router = Router();

let io: SocketIOServer | null = null;
export function setSocketServer(server: SocketIOServer) {
  io = server;
}

// POST /execute submit code, get a job ID back immediately
router.post('/execute', (req: Request, res: Response) => {
  const { code } = req.body;

  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or invalid "code" field' });
  }

  // Respond immediately with the job ID, don't make the client wait
  // for execution to finish. They'll poll (or later, use sockets) for status.
  const jobId = uuidv4();
  createJob(jobId);
  res.status(202).json({ jobId });

  // Run the sandbox in the background, after the response is already sent.
  runInSandbox(code, (line, elapsed) => {
    const job = getJob(jobId);
    if (job) {
      updateJob(jobId, {
        currentLine: line,
        linesExecuted: job.linesExecuted + 1
      });

      // push the update immediately to any client subscribed to this job's room
      const payload = [ jobId, line, elapsed ];
      job.events.push({ type: 'progress', payload });
      io?.to(jobId).emit('progress', { jobId, line, elapsed });
    }
  })
    .then((result) => {
      const finalStatus = result.timedOut ? 'timeout' : (result.exitCode === 0 ? 'completed' : 'failed');
      updateJob (jobId, {
        status: finalStatus,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      });

      const payload = { 
        jobId,
         status: finalStatus,
          stdout: result.stdout,
           stderr: result.stderr,
          exitCode: result.exitCode 
        }
        const job = getJob(jobId);
        job?.events.push({ type: 'done', payload });
        io?.to(jobId).emit('done', payload);

      //Notify that the job is done
      io?.to(jobId).emit('done', {
        jobId,
        status: finalStatus,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      });
    })
    .catch((err) => {
      updateJob(jobId, {
        status: 'failed',
        stderr: String(err)
      });
    });
});

// GET /status/:jobId — poll for current status
router.get('/status/:jobId', (req: Request, res: Response) => {
  const job = getJob(req.params.jobId as string);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    status: job.status,
    startTime: job.startTime,
    elapsedMs: getElapsedMs(job),
    currentLine: job.currentLine,
    linesExecuted: job.linesExecuted,
    stdout: job.stdout,
    stderr: job.stderr,
    exitCode: job.exitCode
  });
});

export default router;