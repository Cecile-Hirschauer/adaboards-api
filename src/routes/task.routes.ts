import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Toutes les routes tasks nécessitent une authentification
router.use(authenticateToken);

// GET /api/boards/:boardId/tasks - Récupérer toutes les tâches d'un board
router.get('/:boardId/tasks', (req, res) => taskController.getTasks(req, res));

// POST /api/boards/:boardId/tasks - Créer une nouvelle tâche
router.post('/:boardId/tasks', (req, res) => taskController.createTask(req, res));

// PATCH /api/boards/:boardId/tasks/:taskId - Mettre à jour une tâche
router.patch('/:boardId/tasks/:taskId', (req, res) => taskController.updateTask(req, res));

// DELETE /api/boards/:boardId/tasks/:taskId - Supprimer une tâche
router.delete('/:boardId/tasks/:taskId', (req, res) => taskController.deleteTask(req, res));

export default router;
