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
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());

// Debug middleware - log all requests
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Adaboards API' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Board-related routes - order matters!
// 1. Task routes (more specific path with /tasks suffix)
app.use('/api/boards/:boardId/tasks', taskRoutes);
// 2. Membership routes (with /members suffix)
app.use('/api', membershipRoutes);
// 3. Board routes (general /boards/:id)
app.use('/api/boards', boardRoutes);

export default app;
