import { z } from '@hono/zod-openapi';

// Every error response has the same shape: { error: { code, message, details? } }.
export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: 'not_found' }),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .openapi('Error');

export type ErrorBody = z.infer<typeof ErrorSchema>;

export function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}
