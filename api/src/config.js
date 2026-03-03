const DEFAULT_PORT = 4000;

function getApiConfig() {
  const port = Number(process.env.API_PORT || DEFAULT_PORT);

  return {
    port: Number.isFinite(port) ? port : DEFAULT_PORT,
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

module.exports = { getApiConfig };
