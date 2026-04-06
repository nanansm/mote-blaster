export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'WPPCONNECT_SECRET_KEY',
    'XENDIT_SECRET_KEY',
    'XENDIT_WEBHOOK_TOKEN',
    'REDIS_URL',
  ];

  const optional = [
    'NODE_ENV',
    'PORT',
    'FRONTEND_URL',
    'GOOGLE_CALLBACK_URL',
    'WPPCONNECT_BASE_URL',
    'JWT_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'XENDIT_PRO_PLAN_PRICE',
    'XENDIT_PRO_PLAN_NAME',
    'FREE_PLAN_DAILY_LIMIT',
    'FREE_PLAN_MAX_INSTANCES',
    'FREE_PLAN_MAX_CAMPAIGNS',
    'MIN_DELAY_SECONDS',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate FRONTEND_URL is set (should be treated as required in production)
  if (!process.env.FRONTEND_URL) {
    console.warn('⚠️  FRONTEND_URL is not set. CORS and redirects may not work correctly. Falling back to http://localhost:5173');
  }

  // Validate JWT secrets are not default
  if (process.env.JWT_SECRET === 'your_jwt_secret' || process.env.JWT_REFRESH_SECRET === 'your_refresh_secret') {
    console.warn('⚠️  JWT secrets are using default values. Please set strong secrets in production.');
  }

  console.log('✅ Environment validation passed');
}
