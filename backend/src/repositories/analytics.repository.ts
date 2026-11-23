import { pool } from '../infra/database';

/**
 * Analytics event to be stored in the database.
 * All fields are derived from the redirect request and IP geo-lookup.
 */
export interface AnalyticsEvent {
    /** Unique event ID (UUID v5, deterministic from shortCode+timestamp+IP+UA) */
    id: string;
    /** Short code of the redirected URL */
    shortCode: string;
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** SHA-256 hash of IP + salt (privacy-preserving) */
    ipHash: string;
    /** Raw User-Agent string */
    userAgent: string | null;
    /** Referer header value */
    referer: string | null;
    /** ISO 3166-1 alpha-2 country code (e.g., "US", "IN") */
    country: string | null;
    /** Region/state code (e.g., "CA", "NY", "MH") */
    region: string | null;
    /** Operating system name */
    os: string | null;
    /** Browser name */
    browser: string | null;
    /** Device type: desktop, mobile, tablet */
    deviceType: string | null;
    /** Whether the request appears to be from a bot/crawler */
    isBot: boolean;
}

/**
 * Aggregated analytics statistics for one or more short codes.
 */
export interface AnalyticsStats {
    totalClicks: number;
    lastAccessed: Date | null;
    countries: Array<{ country: string; count: number }>;
    regions: Array<{ region: string; count: number }>;
    devices: Record<string, number>;
    osStats: Array<{ os: string; count: number }>;
    browserStats: Array<{ browser: string; count: number }>;
    bots: number;
}

export class AnalyticsRepository {
    /**
     * Inserts multiple analytics events in a single batch.
     * Uses ON CONFLICT DO NOTHING to handle deduplication (same event_id + timestamp).
     *
     * @param events - Array of analytics events to insert
     */
    async insertBatch(events: AnalyticsEvent[]): Promise<void> {
        if (events.length === 0) return;

        const client = await pool.connect();
        try {
            const values: (string | number | boolean | null)[] = [];
            const placeholders: string[] = [];

            events.forEach((ev, index) => {
                const i = index * 12;
                placeholders.push(`(
                    $${i + 1}, $${i + 2}, to_timestamp(($${i + 3}::BIGINT) / 1000),
                    $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7},
                    $${i + 8}, $${i + 9}, $${i + 10}, $${i + 11}, $${i + 12}
                )`);

                values.push(
                    ev.id,
                    ev.shortCode,
                    ev.timestamp,
                    ev.ipHash,
                    ev.userAgent,
                    ev.referer,
                    ev.country,
                    ev.region,
                    ev.os,
                    ev.browser,
                    ev.deviceType,
                    ev.isBot,
                );
            });

            const query = `
                INSERT INTO analytics (
                    event_id, short_code, timestamp, ip_hash, user_agent,
                    referer, country, region, os, browser, device_type, is_bot
                )
                VALUES ${placeholders.join(', ')}
                ON CONFLICT (event_id, timestamp) DO NOTHING
            `;

            await client.query(query, values);
        } finally {
            client.release();
        }
    }

    /**
     * Retrieves aggregated analytics statistics for given short codes.
     * Includes country, region, device, OS, browser breakdowns.
     *
     * @param shortCodes - Array of short codes to get stats for
     * @returns Aggregated analytics statistics
     */
    async getStatsByShortCodes(shortCodes: string[]): Promise<AnalyticsStats> {
        if (!shortCodes.length) {
            return {
                totalClicks: 0,
                lastAccessed: null,
                countries: [],
                regions: [],
                devices: {},
                osStats: [],
                browserStats: [],
                bots: 0,
            };
        }

        const [total, last, countries, regions, devices, os, browser, bots] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM analytics WHERE short_code = ANY($1)', [shortCodes]),
            pool.query('SELECT MAX(timestamp) AS last FROM analytics WHERE short_code = ANY($1)', [shortCodes]),
            pool.query(
                'SELECT country, COUNT(*) FROM analytics WHERE short_code = ANY($1) AND country IS NOT NULL GROUP BY country',
                [shortCodes],
            ),
            pool.query(
                'SELECT region, COUNT(*) FROM analytics WHERE short_code = ANY($1) AND region IS NOT NULL GROUP BY region',
                [shortCodes],
            ),
            pool.query(
                'SELECT device_type, COUNT(*) FROM analytics WHERE short_code = ANY($1) AND device_type IS NOT NULL GROUP BY device_type',
                [shortCodes],
            ),
            pool.query(
                'SELECT os, COUNT(*) FROM analytics WHERE short_code = ANY($1) AND os IS NOT NULL GROUP BY os',
                [shortCodes],
            ),
            pool.query(
                'SELECT browser, COUNT(*) FROM analytics WHERE short_code = ANY($1) AND browser IS NOT NULL GROUP BY browser',
                [shortCodes],
            ),
            pool.query(
                'SELECT COUNT(*) FROM analytics WHERE short_code = ANY($1) AND is_bot = true',
                [shortCodes],
            ),
        ]);

        return {
            totalClicks: Number(total.rows[0].count),
            lastAccessed: last.rows[0].last,
            countries: countries.rows.map((r) => ({
                country: r.country,
                count: Number(r.count),
            })),
            regions: regions.rows.map((r) => ({
                region: r.region,
                count: Number(r.count),
            })),
            devices: devices.rows.reduce(
                (acc, r) => ({ ...acc, [r.device_type]: Number(r.count) }),
                {},
            ),
            osStats: os.rows.map((r) => ({ os: r.os, count: Number(r.count) })),
            browserStats: browser.rows.map((r) => ({
                browser: r.browser,
                count: Number(r.count),
            })),
            bots: Number(bots.rows[0].count),
        };
    }
}
