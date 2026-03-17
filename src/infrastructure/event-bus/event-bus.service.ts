import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../shared/domain/domain-event.base';
import { AggregateRoot } from '../../shared/domain/aggregate-root.base';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publishFromAggregate(aggregate: AggregateRoot): Promise<void> {
    const events = aggregate.getDomainEvents();

    if (events.length === 0) return;

    for (const event of events) {
      await this.publish(event);
    }

    aggregate.clearDomainEvents();
  }

  async publish(event: DomainEvent): Promise<void> {
    this.logger.debug(
      `Publishing domain event: ${event.eventName} [aggregate: ${event.aggregateId}]`,
    );

    await this.eventEmitter.emitAsync(event.eventName, event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
