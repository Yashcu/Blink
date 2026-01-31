import { pool } from '../infra/database';
import crypto from 'crypto';

export class AnalyticsRepository {
    async insert(event: {
        shortCode: string;
        timestamp: number;
        ip: string;
        userAgent: string | null;
        referer: string | null;
        country: string | null;
        os: string | null;
        browser: string | null;
        deviceType: string | null;
        isBot: boolean;
    }) {
        const ipHash = crypto
            .createHash('sha256')
            .update(event.ip + process.env.IP_HASH_SALT)
            .digest('hex');

        try {
            await pool.query(
                `
      INSERT INTO analytics (
        event_id,
        short_code,
        timestamp,
        ip_hash,
        user_agent,
        referer,
        country,
        os,
        browser,
        device_type,
        is_bot
      )
      VALUES (
        gen_random_uuid(),
        $1,
        to_timestamp(($2::BIGINT) / 1000),
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10
      )
      `,
                [
                    event.shortCode,
                    event.timestamp,
                    ipHash,
                    event.userAgent,
                    event.referer,
                    event.country,
                    event.os,
                    event.browser,
                    event.deviceType,
                    event.isBot,
                ],
            );
        } catch (err) {
            console.error('[ANALYTICS] insert failed', err);
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
            pool.query('SELECT MAX(timestamp) AS last FROM analytics WHERE short_code = ANY($1)', [
                shortCodes,
            ]),
            pool.query(
                `
                SELECT country, COUNT(*)
                FROM analytics
                WHERE short_code = ANY($1) AND country IS NOT NULL
                GROUP BY country
            `,
                [shortCodes],
            ),
            pool.query(
                `
                SELECT device_type, COUNT(*)
                FROM analytics
                WHERE short_code = ANY($1) AND device_type IS NOT NULL
                GROUP BY device_type
            `,
                [shortCodes],
            ),
            pool.query(
                `
                SELECT os, COUNT(*)
                FROM analytics
                WHERE short_code = ANY($1) AND os IS NOT NULL
                GROUP BY os
            `,
                [shortCodes],
            ),
            pool.query(
                `
                SELECT browser, COUNT(*)
                FROM analytics
                WHERE short_code = ANY($1) AND browser IS NOT NULL
                GROUP BY browser
            `,
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
