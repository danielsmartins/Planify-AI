import '@testing-library/jest-dom/vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_minimum_32_characters_long_12345';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';
process.env.CRON_SECRET = process.env.CRON_SECRET || 'test_cron_secret_token_12345';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '123456789:test_bot_token';
process.env.TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'test_telegram_webhook_secret';

