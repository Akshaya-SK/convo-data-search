import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import planRouter from './routes/plan.js';

const app = express();
const ORIGIN = 'http://localhost:5173';

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/plan', planRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
