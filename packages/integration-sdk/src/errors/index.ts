export class IntegrationError extends Error {
  constructor(public message: string, public statusCode?: number, public code?: string) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class RateLimitError extends IntegrationError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends IntegrationError {
  constructor(message: string) {
    super(message, 401, 'AUTHENTICATION_FAILED');
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends IntegrationError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}
