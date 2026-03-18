export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly tenantId: string;
  /** Optional free-form data carried by the event */
  readonly payload?: Record<string, unknown>;
}

export abstract class BaseDomainEvent implements DomainEvent {
  abstract readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly tenantId: string;

  constructor(aggregateId: string, tenantId: string) {
    this.aggregateId = aggregateId;
    this.tenantId = tenantId;
    this.occurredAt = new Date();
  }
}
