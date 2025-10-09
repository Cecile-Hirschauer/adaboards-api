import './types/express'; // Load Express type extensions
import express, { Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import boardRoutes from './routes/board.routes';
import taskRoutes from './routes/task.routes';
import membershipRoutes from './routes/membership.routes';
import userRoutes from './routes/user.routes';

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Adaboards API' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api', membershipRoutes);
app.use('/api/boards/:boardId/tasks', taskRoutes);
app.use('/api/users', userRoutes);

export default app;
