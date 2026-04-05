import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './database';

export function initializePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || '';
          const name = profile.displayName;
          const googleId = profile.id;
          const avatarUrl = profile.photos?.[0]?.value || null;

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { googleId },
          });

          if (!user) {
            // Check if email already exists (shouldn't happen with Google but safe)
            user = await prisma.user.findUnique({
              where: { email },
            });
          }

          if (!user) {
            user = await prisma.user.create({
              data: {
                googleId,
                email,
                name,
                avatarUrl,
                plan: 'FREE',
              },
            });
          } else {
            // Update user info
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                name,
                avatarUrl,
              },
            });
          }

          const payload = {
            userId: user.id,
            email: user.email,
            plan: user.plan,
          };

          return done(null, payload);
        } catch (error) {
          console.error('Passport strategy error:', error);
          return done(error as any, false);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
}
