import { Router } from 'express';
import { membershipController } from '../controllers/membership.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// GET /api/boards/:boardId/members - Récupérer tous les membres d'un board
router.get('/boards/:boardId/members', (req, res) =>
  membershipController.getBoardMembers(req, res)
);

// POST /api/boards/:boardId/members - Ajouter un membre à un board
router.post('/boards/:boardId/members', (req, res) =>
  membershipController.addMember(req, res)
);

// PATCH /api/boards/:boardId/members/:userId - Modifier le rôle d'un membre
router.patch('/boards/:boardId/members/:userId', (req, res) =>
  membershipController.updateMemberRole(req, res)
);

// DELETE /api/boards/:boardId/members/:userId - Retirer un membre d'un board
router.delete('/boards/:boardId/members/:userId', (req, res) =>
  membershipController.removeMember(req, res)
);

export default router;
