import { EventEmitter } from 'events';

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
};
