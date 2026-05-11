export function throwHttp(statusCode: number, message: string, detail?: string): never {
  const error = new Error(detail || message) as Error & { statusCode?: number; error?: string };
  error.statusCode = statusCode;
  error.error = message;
  throw error;
}
