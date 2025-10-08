import { Router } from 'express';
import { boardController } from '../controllers/board.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Toutes les routes boards nécessitent une authentification
router.use(authenticateToken);

// GET /api/boards - Récupérer tous les boards de l'utilisateur
router.get('/', (req, res) => boardController.getBoards(req, res));

// GET /api/boards/:id - Récupérer un board par ID
router.get('/:id', (req, res) => boardController.getBoard(req, res));

// POST /api/boards - Créer un nouveau board
router.post('/', (req, res) => boardController.createBoard(req, res));

// PATCH /api/boards/:id - Mettre à jour un board
router.patch('/:id', (req, res) => boardController.updateBoard(req, res));

// DELETE /api/boards/:id - Supprimer un board
router.delete('/:id', (req, res) => boardController.deleteBoard(req, res));

export default router;
