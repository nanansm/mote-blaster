import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Database error',
      message: 'A record with this data already exists',
    });
  }

  // Validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message,
    });
  }

  // Default error
  const statusCode = (res.statusCode === 200) ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: err.name === 'ValidationError' ? 'Validation error' : 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
