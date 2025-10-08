import { Router } from 'express';
import { membershipController } from '../controllers/membership.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// GET /api/users/search - Rechercher des utilisateurs
router.get('/search', (req, res) =>
  membershipController.searchUsers(req, res)
);

export default router;
