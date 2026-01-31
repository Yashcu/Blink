# Shorty - High-Performance URL Shortener Backend

Shorty is a robust, scalable, and high-performance URL shortening service designed to handle high traffic loads with low latency. It leverages a modern tech stack including **TypeScript**, **Node.js (Express)**, **Redis**, **PostgreSQL**, and **BullMQ** to ensure reliability and speed.

## 🚀 Key Features

-   **High Performance Redirection**:
    -   Multi-layer caching strategy using **Redis** to minimize database hits.
    -   **~1-2ms** latency for cached redirects.
-   **Scalable Architecture**:
    -   **Asynchronous Analytics**: Analytics data is processed via a high-throughput job queue (**BullMQ**) to ensure redirect speed is never compromised by write operations.
    -   **Database Partitioning**: Analytics data is partitioned by time ranges in PostgreSQL for efficient querying and data management.
-   **Advanced Rate Limiting**: Token-bucket based rate limiting on a per-IP basis, designed to "fail open" to ensure service availability during cache outages.
-   **Observability First**: Built-in **Prometheus** metrics for monitoring request latency, cache hit/miss rates, and error rates.
-   **Custom Aliases**: Support for custom vanity URLs.
-   **Expiration**: URLs can have set expiration times.

## 🛠 Tech Stack

-   **Runtime**: [Node.js](https://nodejs.org/) (v20+)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Framework**: [Express.js](https://expressjs.com/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) (with `pg` driver)
-   **Caching & Queues**: [Redis](https://redis.io/) (via `ioredis`)
-   **Job Queue**: [BullMQ](https://docs.bullmq.io/)
-   **Metrics**: [prom-client](https://github.com/siimon/prom-client) (Prometheus)
-   **Migrations**: [node-pg-migrate](https://salsita.github.io/node-pg-migrate/#/)

## 📐 System Design

The system is designed to prioritize **read availability** and **low latency**.

```mermaid
graph TD
    Client[User / Client]
    LB[Load Balancer / Nginx]
    Server[Node.js API Server]
    RedisCache[(Redis Cache)]
    RedisQueue[(Redis BullMQ)]
    Worker[Analytics Worker]
    DB[(PostgreSQL Primary)]
    Prometheus[Prometheus Monitor]

    Client -->|HTTP GET /:code| LB
    LB --> Server

    subgraph "Redirect Flow (Hot Path)"
        Server -->|1. Check Cache| RedisCache
        RedisCache -- Miss --> Server
        Server -->|2. DB Lookup (Fallback)| DB
        DB -- Result --> Server
        Server -->|3. Populate Cache| RedisCache
        Server -->|4. 302 Redirect| Client
    end

    subgraph "Async Analytics (Write Path)"
        Server -.->|5. Enqueue Event| RedisQueue
        RedisQueue --> Worker
        Worker -->|6. Batch Insert| DB
    end

    subgraph "Monitoring"
        Prometheus --> |Scrape /metrics| Server
    end
```

### Data Flow Explanation

1.  **Redirection**:
    -   Incoming requests are checked against **Redis** first.
    -   If valid, the server immediately returns a `302` redirect.
    -   If not in cache, it queries **PostgreSQL**, caches the result (for 24h or until expiry), and then redirects.
2.  **Analytics**:
    -   We do **not** write to the database during the redirect request.
    -   Instead, an event is pushed to a **BullMQ** queue in Redis.
    -   Dedicated worker processes consume this queue and write analytics data to the partitioned PostgreSQL table, preventing high-latency database writes from slowing down users.

## 📂 Project Structure

```text
backend/
├── migrations/         # Database migration files
├── src/
│   ├── analytics/      # Analytics worker and queue logic
│   ├── auth/           # Authentication logic (JWT)
│   ├── config/         # Environment configuration
│   ├── infra/          # Infrastructure setup (DB, Redis)
│   ├── metrics/        # Prometheus metric definitions
│   ├── redirect/       # Redirection logic (Service & Controller)
│   ├── repositories/   # Data access layer
│   ├── url/            # URL creation and management
│   ├── server.ts       # Application entry point
│   └── routes.ts       # Main router
└── package.json
```

## ⚡ Getting Started

### Prerequisites

-   Node.js (v18+)
-   PostgreSQL
-   Redis source instance (or Docker)

### 1. Installation

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/shorty
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key
# Rate Limiting
WINDOW_SIZE_IN_HOURS=24
MAX_REQUEST_WINDOW=100
WINDOW_LOG_INTERVAL_IN_HOURS=1
```

### 3. Database Migration

Run migrations to set up the schema:

```bash
npm run migrate:up
```

### 4. Running the Service

**Development Mode:**
```bash
npm run dev
```

**Start Analytics Worker:**
(Run this in a separate terminal)
```bash
npm run worker
```

**Production Build:**
```bash
npm run build
npm start
```

## 📊 Monitoring & Metrics

The service exposes a `/metrics` endpoint compatible with Prometheus.

Key Metrics Tracked:
-   `http_request_duration_seconds`: Latency of redirects.
-   `url_shortener_cache_hits_total`: Efficacy of the Redis cache.
-   `url_shortener_cache_misses_total`: Rate of DB fallbacks.
-   `url_shortener_redirect_errors_total`: Error tracking.

## 🛡️ Security

-   **Input Validation**: Strict validation of long URLs to prevent injection or malicious links.
-   **Rate Limiting**: Protects against abuse and DDoS attacks.
-   **Secure Headers**: implementation of standard security headers.

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request
