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

export const activeUsers = new client.Gauge({
    name: 'business_active_users_1h',
    help: 'Number of unique users creating links in the last hour',
});

export const maliciousUrlAttempts = new client.Counter({
    name: 'business_malicious_url_attempts_total',
    help: 'Number of times users tried to shorten a blacklisted URL',
});

export const queueLatency = new client.Histogram({
    name: 'business_analytics_queue_latency_seconds',
    help: 'Time from click event to DB insertion',
    buckets: [1, 5, 10, 30, 60],
});

export const registry = client.register;
