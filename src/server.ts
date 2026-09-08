import express from 'express';
import executeRouter from './routes/execute';

const app = express();
app.use(express.json());
app.use('/', executeRouter);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});