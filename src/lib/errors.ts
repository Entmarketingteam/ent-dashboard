export class LTKAuthError extends Error {
  constructor(
    message: string,
    public readonly slug: string
  ) {
    super(message);
    this.name = 'LTKAuthError';
  }
}

export class LTKApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'LTKApiError';
  }
}

export function isAuthError(err: unknown): boolean {
  return (
    err instanceof LTKAuthError ||
    (err instanceof Error && err.message.includes('needs re-authentication'))
  );
}
