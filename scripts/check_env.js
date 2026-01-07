// scripts/check_env.js

const requiredEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_DB_URL',
  'SENTRY_DSN',
  'ENCRYPTION_KEY',
  'CRON_SECRET',
];

function checkEnv() {
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:');
    missingVars.forEach((varName) => console.error(`- ${varName}`));
    process.exit(1);
  }

  console.log('All required environment variables are set.');
}

checkEnv();
