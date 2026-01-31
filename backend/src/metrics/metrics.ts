import client from 'prom-client';

client.collectDefaultMetrics();

export const redirectLatency = new client.Histogram({
    name: 'http_redirect_duration_seconds',
    help: 'Redirect request latency',
    labelNames: ['result'],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

export const cacheHits = new client.Counter({
    name: 'redirect_cache_hits_total',
    help: 'Redirect cache hits',
    labelNames: ['type'],
});

export const cacheMisses = new client.Counter({
    name: 'redirect_cache_misses_total',
    help: 'Redirect cache misses',
    labelNames: ['type'],
});

export const redirectErrors = new client.Counter({
    name: 'redirect_errors_total',
    help: 'Redirect errors',
});

export const registry = client.register;
