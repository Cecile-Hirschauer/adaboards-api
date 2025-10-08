import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
      console.error('[Auth] No token provided');
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const payload = authService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error instanceof Error ? error.message : error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};
