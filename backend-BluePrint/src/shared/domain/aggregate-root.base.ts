import { DomainEvent } from './domain-event.base';
import { BaseEntity } from './entity.base';

export abstract class AggregateRoot extends BaseEntity {
  private readonly _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  getDomainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  hasDomainEvents(): boolean {
    return this._domainEvents.length > 0;
  }
}
