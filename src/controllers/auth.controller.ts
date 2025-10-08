import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { RegisterDTO, LoginDTO } from '../types/auth.types';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const data: RegisterDTO = req.body;

      // Validation basique
      if (!data.email || !data.name || !data.password) {
        res.status(400).json({ error: 'Email, name and password are required' });
        return;
      }

      if (data.password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      const result = await authService.register(data);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Email already exists') {
          res.status(409).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const data: LoginDTO = req.body;

      // Validation basique
      if (!data.email || !data.password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await authService.login(data);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          res.status(401).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const authController = new AuthController();
