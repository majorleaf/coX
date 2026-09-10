

import { io as ioClient } from 'socket.io-client';

const socket = ioClient('http://localhost:3000');

socket.on('connect', async () => {
  console.log('Connected, submitting code...');

  const res = await fetch('http://localhost:3000/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'console.log("hi");\nfor (let i=0;i<3;i++){ console.log(i); }'
    })
  });
  const { jobId } = await res.json();
  console.log('Job submitted:', jobId);

  socket.emit('subscribe', jobId);
});

socket.on('progress', (data) => {
  console.log('[progress]', data);
});
