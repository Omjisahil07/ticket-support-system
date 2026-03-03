const path = require('node:path');

const DEFAULT_PORT = 4000;

function getApiConfig() {
  const port = Number(process.env.API_PORT || DEFAULT_PORT);

  return {
    port: Number.isFinite(port) ? port : DEFAULT_PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    dataFile: process.env.DATA_FILE || path.join(__dirname, '..', '.data', 'dev-db.json'),
    queueFile:
      process.env.EMAIL_QUEUE_FILE ||
      path.join(__dirname, '..', '..', 'worker', '.data', 'email-queue.json'),
    seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@company.local',
    seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123'
  };
}

module.exports = { getApiConfig };
