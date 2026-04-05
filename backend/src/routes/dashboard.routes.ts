import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authMiddleware, checkPlanLimit } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/stats', checkPlanLimit, dashboardController.getStats);
router.get('/chart/daily', checkPlanLimit, dashboardController.getDailyChart);
router.get('/chart/campaigns', checkPlanLimit, dashboardController.getCampaignChart);

export default router;
