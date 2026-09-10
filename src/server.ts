import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import executeRouter, { setSocketServer } from './routes/execute';

const app = express();
app.use(express.json());
app.use('/', executeRouter);

// wraps the express app in a created plain http to enable
//socket.io attachment alongside normal HTTP routes
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*'}// for production later
});

io.on('connection', (socket) => {
  socket.on('subscribe', (jobId: string) => {
    socket.join(jobId);
    console.log(`Socket ${socket.id} subscribed to job ${jobId}`);
  });
  socket.on('disconnect', () => {
    console.log(`client disconnected: ${socket.id}`);
  });
});

// Give the routes module a reference to `io` so it can emit events
// from inside runInSandbox's progress callback.
setSocketServer(io);


const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});