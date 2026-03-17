export class DomainException extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'DomainException';
    Object.setPrototypeOf(this, DomainException.prototype);
  }

  static invalidArgument(message: string): DomainException {
    return new DomainException('INVALID_ARGUMENT', message);
  }

  static businessRule(code: string, message: string): DomainException {
    return new DomainException(code, message);
  }
}
