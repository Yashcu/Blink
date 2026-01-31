exports.up = (pgm) => {
    pgm.createIndex('analytics', 'short_code', { name: 'analytics_short_code_idx' });
    pgm.createIndex('analytics', 'timestamp', { name: 'analytics_timestamp_idx' });
};

exports.down = (pgm) => {
    pgm.dropIndex('analytics', 'short_code', { name: 'analytics_short_code_idx' });
    pgm.dropIndex('analytics', 'timestamp', { name: 'analytics_timestamp_idx' });
};
