const { getApiConfig } = require('./config');
const { createApiServer } = require('./server');

const config = getApiConfig();
const server = createApiServer(config);

server.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
});
