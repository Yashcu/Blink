import { pool } from '../infra/database';

export interface AnalyticsEvent {
    id: string;
    shortCode: string;
    timestamp: number;
    ipHash: string;
    userAgent: string | null;
    referer: string | null;
    country: string | null;
    os: string | null;
    browser: string | null;
    deviceType: string | null;
    isBot: boolean;
}

export class AnalyticsRepository {
    async insertBatch(events: AnalyticsEvent[]): Promise<void> {
        if (events.length === 0) return;

        const client = await pool.connect();
        try {
            const values: (string | number | boolean | null)[] = [];
            const placeholders: string[] = [];

            events.forEach((ev, index) => {
                const i = index * 11;
                placeholders.push(`(
                    $${i + 1}, $${i + 2}, to_timestamp(($${i + 3}::BIGINT) / 1000),
                    $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7},
                    $${i + 8}, $${i + 9}, $${i + 10}, $${i + 11}
                )`);

                values.push(
                    ev.id,
                    ev.shortCode,
                    ev.timestamp,
                    ev.ipHash,
                    ev.userAgent,
                    ev.referer,
                    ev.country,
                    ev.os,
                    ev.browser,
                    ev.deviceType,
                    ev.isBot
                );
            });

            const query = `
                INSERT INTO analytics (
                    event_id, short_code, timestamp, ip_hash, user_agent,
                    referer, country, os, browser, device_type, is_bot
                )
                VALUES ${placeholders.join(', ')}
                ON CONFLICT (event_id) DO NOTHING
            `;

            await client.query(query, values);
        } finally {
            client.release();
        }
    }

    async getStatsByShortCodes(shortCodes: string[]) {
        if (!shortCodes.length) {
            return {
                totalClicks: 0,
                lastAccessed: null,
                countries: [],
                devices: {},
                osStats: [],
                browserStats: [],
                bots: 0,
            };
        }

        const [total, last, countries, devices, os, browser, bots] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM analytics WHERE short_code = ANY($1)', [shortCodes]),
            pool.query('SELECT MAX(timestamp) AS last FROM analytics WHERE short_code = ANY($1)', [shortCodes]),
            pool.query(
                'SELECT country, COUNT(*) FROM analytics WHERE short_code = ANY($1) AND country IS NOT NULL GROUP BY country',
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
