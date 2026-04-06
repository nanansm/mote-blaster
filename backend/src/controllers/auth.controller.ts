import { Request, Response } from 'express';
import cookie from 'cookie';
import { prisma } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const authController = {
  // GET /api/v1/auth/google
  googleAuth: (req: Request, res: Response) => {
    // This will be handled by Passport middleware in routes
    res.redirect('/api/v1/auth/google');
  },

  // GET /api/v1/auth/google/callback
  googleCallback: async (req: Request, res: Response) => {
    try {
      // @ts-ignore
      const user = req.user as { userId: string; email: string; plan: string } | undefined;

      if (!user) {
        return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
      }

      const accessToken = generateAccessToken({
        userId: user.userId,
        email: user.email,
        plan: user.plan,
      });

      const refreshToken = generateRefreshToken({ userId: user.userId });

      // Store refresh token in DB
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Set httpOnly cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/',
      };

      res.setHeader('Set-Cookie', [
        cookie.serialize('access_token', accessToken, cookieOptions),
        cookie.serialize('refresh_token', refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      ]);

      return res.redirect(`${FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error('googleCallback error:', error);
      return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
  },

  // POST /api/v1/auth/refresh
  refreshToken: async (req: Request, res: Response) => {
    try {
      const cookies = cookie.parse(req.headers.cookie || '');
      const refreshToken = cookies.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Check if token exists in DB
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenRecord) {
        return res.status(401).json({ error: 'Refresh token not found' });
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new access token
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        plan: user.plan,
      });

      res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          plan: user.plan,
        },
      });
    } catch (error) {
      console.error('refreshToken error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // POST /api/v1/auth/logout
  logout: async (req: Request, res: Response) => {
    try {
      const cookies = cookie.parse(req.headers.cookie || '');
      const refreshToken = cookies.refresh_token;

      if (refreshToken) {
        await prisma.refreshToken.delete({
          where: { token: refreshToken },
        });
      }

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      return res.json({ success: true });
    } catch (error) {
      console.error('logout error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // GET /api/v1/auth/me
  me: async (req: any, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          plan: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    } catch (error) {
      console.error('me error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
