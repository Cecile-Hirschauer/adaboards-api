import {
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
  ValidationError,
  ConflictError
} from '../errors';

export interface HttpErrorResponse {
  status: number;
  body: { error: string };
}

/**
 * Maps application errors to HTTP responses
 */
export function mapError(error: unknown): HttpErrorResponse {
  if (error instanceof NotFoundError) {
    return { status: 404, body: { error: error.message } };
  }

  if (error instanceof ForbiddenError) {
    return { status: 403, body: { error: error.message } };
  }

  if (error instanceof UnauthorizedError) {
    return { status: 401, body: { error: error.message } };
  }

  if (error instanceof BadRequestError || error instanceof ValidationError) {
    return { status: 400, body: { error: error.message } };
  }

  if (error instanceof ConflictError) {
    return { status: 409, body: { error: error.message } };
  }

  // Default internal error
  console.error('Unexpected error:', error);
  return {
    status: 500,
    body: { error: 'Internal server error' }
  };
}
