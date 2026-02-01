import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Configuration: Simulate a "Viral" event
// We ramp up to 1000 users over 30 seconds, hold, then ramp down.
export const options = {
    stages: [
        { duration: '10s', target: 100 },  // Warm up
        { duration: '30s', target: 1000 }, // ⚠️ THE SPIKE (1000 users)
        { duration: '10s', target: 0 },    // Cool down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete in < 500ms
        http_req_failed: ['rate<0.01'],   // Error rate must be < 1%
    },
};

const BASE_URL = 'http://host.docker.internal:3000'; // Target localhost from Docker

export default function () {
    // 2. The Test: Hit a known 404 (or real link if you have one)
    // We use a random string to force the Cache -> DB check path
    const randomId = Math.random().toString(36).substring(7);

    const res = http.get(`${BASE_URL}/${randomId}`);

    // 3. Validation
    // We expect a 404 (Not Found) for random links, but it shouldn't be a 500 (Server Error)
    check(res, {
        'status is 404 (handled correctly)': (r) => r.status === 404,
        'status is NOT 500 (crash)': (r) => r.status !== 500,
    });

    sleep(1); // Think time (1 second between clicks)
}