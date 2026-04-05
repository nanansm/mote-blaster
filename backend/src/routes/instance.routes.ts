import { Router } from 'express';
import { instanceController } from '../controllers/instance.controller';
import { authMiddleware, checkPlanLimit } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', checkPlanLimit, instanceController.listInstances);
router.post('/', checkPlanLimit, instanceController.createInstance);
router.get('/:id', checkPlanLimit, instanceController.getInstance);
router.post('/:id/connect', checkPlanLimit, instanceController.connectInstance);
router.get('/:id/qr', checkPlanLimit, instanceController.getQRCode);
router.delete('/:id', checkPlanLimit, instanceController.deleteInstance);

export default router;
