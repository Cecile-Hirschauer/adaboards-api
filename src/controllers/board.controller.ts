import { Request, Response } from 'express';
import { boardService } from '../services/board.service';
import { UnauthorizedError, BadRequestError } from '../errors';
import { mapError } from '../utils/http';

export class BoardController {
  /**
   * GET /api/boards
   * Récupérer tous les boards de l'utilisateur connecté
   */
  async getBoards(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError();
      }

      const boards = await boardService.getUserBoards(userId);
      return res.json(boards);
    } catch (error) {
      console.error('Error fetching boards:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
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
        throw new UnauthorizedError();
      }

      const board = await boardService.getBoard(boardId, userId);
      return res.json(board);
    } catch (error) {
      console.error('Error fetching board:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
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
        throw new UnauthorizedError();
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new BadRequestError('Board name is required');
      }

      const board = await boardService.createBoard(name.trim(), userId);
      return res.status(201).json(board);
    } catch (error) {
      console.error('Error creating board:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
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
        throw new UnauthorizedError();
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new BadRequestError('Board name is required');
      }

      const board = await boardService.updateBoard(boardId, userId, { name: name.trim() });
      return res.json(board);
    } catch (error) {
      console.error('Error updating board:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
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
        throw new UnauthorizedError();
      }

      await boardService.deleteBoard(boardId, userId);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting board:', error);
      const { status, body } = mapError(error);
      return res.status(status).json(body);
    }
  }
}

export const boardController = new BoardController();
