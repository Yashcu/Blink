/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    // 1. Rename the old table (backup)
    pgm.sql('ALTER TABLE analytics RENAME TO analytics_old;');

    // 2. [CRITICAL FIX] Rename the old Primary Key to free up the name
    // This allows the NEW table to claim 'analytics_pkey'
    pgm.sql('ALTER TABLE analytics_old RENAME CONSTRAINT analytics_pkey TO analytics_old_pkey;');

    // 3. Create the NEW partitioned table structure (Temporary definition for node-pg-migrate)
    pgm.createTable('analytics', {
        event_id: { type: 'uuid', notNull: true },
        short_code: { type: 'varchar(8)', notNull: true },
        timestamp: { type: 'timestamp', notNull: true },
        ip_hash: { type: 'varchar(64)', notNull: true },
        user_agent: { type: 'varchar(500)' },
        referer: { type: 'text' },
        country: { type: 'char(2)' },
        device_type: { type: 'varchar(10)' },
        os: { type: 'varchar(50)' },
        browser: { type: 'varchar(50)' },
        is_bot: { type: 'boolean' },
    }, {
        constraints: {
            primaryKey: ['event_id', 'timestamp'] // This will now successfully create 'analytics_pkey'
        }
    });

    // 4. Enable Partitioning
    // We drop the standard table we just defined to replace it with a PARTITIONED one.
    // (node-pg-migrate limitation: createTable doesn't support PARTITION BY natively yet)
    pgm.dropTable('analytics');

    pgm.sql(`
        CREATE TABLE analytics (
            event_id uuid NOT NULL,
            short_code varchar(8) NOT NULL,
            timestamp timestamp NOT NULL,
            ip_hash varchar(64) NOT NULL,
            user_agent varchar(500),
            referer text,
            country char(2),
            device_type varchar(10),
            os varchar(50),
            browser varchar(50),
            is_bot boolean,
            PRIMARY KEY (event_id, timestamp)
        ) PARTITION BY RANGE (timestamp);
    `);

    // 5. Create Partitions
    pgm.sql('CREATE TABLE analytics_default PARTITION OF analytics DEFAULT;');
    pgm.sql("CREATE TABLE analytics_y2025 PARTITION OF analytics FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');");
    pgm.sql("CREATE TABLE analytics_y2026 PARTITION OF analytics FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');");
    pgm.sql("CREATE TABLE analytics_y2027 PARTITION OF analytics FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');");

    // 6. Indexes
    pgm.createIndex('analytics', 'short_code');
    pgm.createIndex('analytics', 'timestamp');

    // 7. Data Migration (Copy old data to new partitions)
    pgm.sql(`
        INSERT INTO analytics (
            event_id, short_code, timestamp, ip_hash, user_agent, referer, country, device_type, os, browser, is_bot
        )
        SELECT 
            event_id, short_code, timestamp, ip_hash, user_agent, referer, country, device_type, os, browser, is_bot
        FROM analytics_old;
    `);
};

exports.down = (pgm) => {
    // Drop the partitioned table
    pgm.dropTable('analytics');

    // Rename the old constraint back (Restore original state)
    pgm.sql('ALTER TABLE analytics_old RENAME CONSTRAINT analytics_old_pkey TO analytics_pkey;');

    // Rename table back
    pgm.sql('ALTER TABLE analytics_old RENAME TO analytics;');
};