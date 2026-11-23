import { EventEmitter } from 'events';

/**
 * Simple in-process event bus for decoupling side effects.
 * Note: For distributed systems, replace with a message broker (Redis Streams, Kafka, etc.).
 */
class EventBus extends EventEmitter {}

// Singleton instance
export const eventBus = new EventBus();

// Event Constants
export const EVENTS = {
    URL: {
        CREATED: 'url.created',
        UPDATED: 'url.updated',
        DELETED: 'url.deleted',
    },
} as const;
