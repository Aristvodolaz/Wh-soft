import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const correlationId =
      ((request as Record<string, unknown>).correlationId as string) ??
      (request.headers[CORRELATION_ID_HEADER] as string) ??
      '-';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const elapsed = Date.now() - startTime;
          this.logger.log(
            `${method} ${url} ${statusCode} ${elapsed}ms [${correlationId}] — ${ip} "${userAgent}"`,
          );
        },
        error: (error: Error) => {
          const elapsed = Date.now() - startTime;
          this.logger.warn(
            `${method} ${url} ERROR ${elapsed}ms [${correlationId}] — ${ip} "${userAgent}" — ${error.message}`,
          );
        },
      }),
    );
  }
}
