import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true }); // Permet d'accéder aux params du parent

// Toutes les routes tasks nécessitent une authentification
router.use(authenticateToken);

// Ces routes seront montées sur /api/boards/:boardId/tasks dans index.ts
// Donc ici on définit juste les chemins relatifs

// GET /api/boards/:boardId/tasks - Récupérer toutes les tâches d'un board
router.get('/', (req, res) => taskController.getTasks(req, res));

// POST /api/boards/:boardId/tasks - Créer une nouvelle tâche
router.post('/', (req, res) => taskController.createTask(req, res));

// PATCH /api/boards/:boardId/tasks/:taskId - Mettre à jour une tâche
router.patch('/:taskId', (req, res) => taskController.updateTask(req, res));

// DELETE /api/boards/:boardId/tasks/:taskId - Supprimer une tâche
router.delete('/:taskId', (req, res) => taskController.deleteTask(req, res));

export default router;
