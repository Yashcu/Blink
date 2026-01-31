export const AUTH_CONSTRAINTS = {
    EMAIL_MAX_LENGTH: 254, // RFC‑safe
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 72, // bcrypt safe max
};

export const URL_CONSTRAINTS = {
    ALIAS_MIN_LENGTH: 3,
    ALIAS_MAX_LENGTH: 50,
};
