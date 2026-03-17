import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Correlation ID Middleware
 *
 * Attaches a unique correlation ID to every request.
 * If the client sends X-Correlation-ID, it is preserved.
 * Otherwise a new UUID v4 is generated.
 *
 * The ID is:
 * - Added to the request object as req.correlationId
 * - Echoed back in the response header X-Correlation-ID
 * - Used in LoggingInterceptor for structured log output
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = (req.headers[CORRELATION_ID_HEADER] as string) ?? uuidv4();

    // Attach to request for downstream access
    (req as Request & { correlationId: string }).correlationId = correlationId;

    // Echo back in response
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, uuidv4());

    next();
  }
}
