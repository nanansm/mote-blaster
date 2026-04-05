import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_refresh_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
const refreshSignOptions: SignOptions = { expiresIn: JWT_REFRESH_EXPIRES_IN as any };

export function generateAccessToken(payload: { userId: string; email: string; plan: string }) {
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

export function generateRefreshToken(payload: { userId: string }) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, refreshSignOptions);
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; plan: string };
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
}
