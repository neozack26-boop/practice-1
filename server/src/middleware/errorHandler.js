import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      issues: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Handle JSON parsing errors in express
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }

  // Default to 500 internal server error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
}

