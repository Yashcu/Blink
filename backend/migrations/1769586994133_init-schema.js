exports.up = (pgm) => {
    /* USERS */
    pgm.createTable('users', {
        id: { type: 'uuid', primaryKey: true },
        email: { type: 'varchar(255)', notNull: true },
        password_hash: { type: 'varchar(255)', notNull: true },
        custom_aliases_used: { type: 'int', default: 0 },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('now()'),
        },
    });
    pgm.createIndex('users', 'lower(email)', {
        unique: true,
        name: 'users_email_lower_unique',
    });

    /* BLACKLISTED URLS */
    pgm.createTable('blacklisted_urls', {
        id: 'id',
        pattern: { type: 'text', notNull: true },
        reason: { type: 'text' },
        created_at: { type: 'timestamp', default: pgm.func('now()') },
    });

    /* URLS */
    pgm.createTable('urls', {
        id: { type: 'uuid', primaryKey: true },
        user_id: {
            type: 'uuid',
            references: 'users(id)',
            onDelete: 'cascade',
        },
        short_code: { type: 'varchar(8)', notNull: true, unique: true },
        long_url: { type: 'text', notNull: true },
        custom_alias: { type: 'varchar(20)' },
        expiry_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', default: pgm.func('now()') },
        updated_at: { type: 'timestamp', default: pgm.func('now()') },
    });
    pgm.addConstraint('urls', 'unique_user_alias', 'UNIQUE(user_id, custom_alias)');
    pgm.createIndex('urls', ['user_id', 'created_at']);
    pgm.createIndex('urls', ['expiry_at']);

    /* AUTH SESSIONS */
    pgm.createTable('auth_sessions', {
        id: { type: 'uuid', primaryKey: true },
        user_id: {
            type: 'uuid',
            references: 'users(id)',
            onDelete: 'cascade',
            notNull: true,
        },
        expires_at: { type: 'timestamp', notNull: true },
        created_at: { type: 'timestamp', default: pgm.func('now()') },
        last_used_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('now()'),
        },
        fingerprint: { type: 'text' },
    });
    pgm.createIndex('auth_sessions', ['user_id']);
    pgm.createIndex('auth_sessions', ['expires_at']);

    /* ANALYTICS */
    pgm.createTable('analytics', {
        event_id: { type: 'uuid', primaryKey: true },
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
    });
};

exports.down = (pgm) => {
    pgm.dropTable('analytics');
    pgm.dropTable('auth_sessions');
    pgm.dropTable('urls');
    pgm.dropTable('blacklisted_urls');
    pgm.dropTable('users');
};
