import { Router } from 'express';
import passport from 'passport';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  authController.googleCallback
);

// Protected routes
router.get('/me', authMiddleware, authController.me);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);

export default router;
