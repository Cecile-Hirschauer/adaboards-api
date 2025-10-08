import { Request, Response } from 'express';
import { boardService } from '../services/board.service';

export class BoardController {
  /**
   * GET /api/boards
   * Récupérer tous les boards de l'utilisateur connecté
   */
  async getBoards(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const boards = await boardService.getUserBoards(userId);
      res.json(boards);
    } catch (error) {
      console.error('Error fetching boards:', error);
      res.status(500).json({ error: 'Failed to fetch boards' });
    }
  }

  /**
   * GET /api/boards/:id
   * Récupérer un board par ID
   */
  async getBoard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const boardId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const board = await boardService.getBoard(boardId, userId);
      res.json(board);
    } catch (error) {
      console.error('Error fetching board:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch board';
      const status = message.includes('not found') || message.includes('access denied') ? 404 : 500;
      res.status(status).json({ error: message });
    }
  }

  /**
   * POST /api/boards
   * Créer un nouveau board
   */
  async createBoard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { name } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Board name is required' });
      }

      const board = await boardService.createBoard(name.trim(), userId);
      res.status(201).json(board);
    } catch (error) {
      console.error('Error creating board:', error);
      res.status(500).json({ error: 'Failed to create board' });
    }
  }

  /**
   * PATCH /api/boards/:id
   * Mettre à jour un board
   */
  async updateBoard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const boardId = req.params.id;
      const { name } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Board name is required' });
      }

      const board = await boardService.updateBoard(boardId, userId, { name: name.trim() });
      res.json(board);
    } catch (error) {
      console.error('Error updating board:', error);
      const message = error instanceof Error ? error.message : 'Failed to update board';
      const status = message.includes('not found') || message.includes('access denied') ? 404 :
                     message.includes('Only owners') ? 403 : 500;
      res.status(status).json({ error: message });
    }
  }

  /**
   * DELETE /api/boards/:id
   * Supprimer un board
   */
  async deleteBoard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const boardId = req.params.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await boardService.deleteBoard(boardId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting board:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete board';
      const status = message.includes('not found') || message.includes('access denied') ? 404 :
                     message.includes('Only owners') ? 403 : 500;
      res.status(status).json({ error: message });
    }
  }
}

export const boardController = new BoardController();
