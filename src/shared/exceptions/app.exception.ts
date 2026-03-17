import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppExceptionDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class AppException extends HttpException {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, statusCode);
    this.code = code;
    this.details = details;
  }

  static notFound(resource: string, id?: string): AppException {
    return new AppException(
      'RESOURCE_NOT_FOUND',
      id ? `${resource} with id "${id}" not found` : `${resource} not found`,
      HttpStatus.NOT_FOUND,
    );
  }

  static unauthorized(message = 'Unauthorized'): AppException {
    return new AppException('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = 'Forbidden'): AppException {
    return new AppException('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }

  static conflict(message: string, details?: Record<string, unknown>): AppException {
    return new AppException('CONFLICT', message, HttpStatus.CONFLICT, details);
  }

  static unprocessable(message: string, details?: Record<string, unknown>): AppException {
    return new AppException(
      'UNPROCESSABLE_ENTITY',
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }
}
