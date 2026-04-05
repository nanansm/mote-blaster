import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public webhook route (no auth)
router.post('/webhook', billingController.webhook);

// Routes that require authentication
router.use(authMiddleware);

router.get('/plans', billingController.getPlans);
router.get('/subscription', billingController.getSubscription);
router.post('/subscribe', billingController.subscribe);
router.post('/cancel', billingController.cancelSubscription);
router.get('/invoices', billingController.getInvoices);

export default router;
