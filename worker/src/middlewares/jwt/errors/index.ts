export class SigningKeyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SigningKeyNotFoundError';
  }
}

export class ArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgumentError';
  }
}
export class JwksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwksError';
  }
}
export class JwksRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwksRateLimitError';
  }
}