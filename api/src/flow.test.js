const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApiServer } = require('./server');

async function request(baseUrl, method, route, body, token) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return {
    status: response.status,
    json: await response.json()
  };
}

test('complete ticket flow: auth, create, assign, message', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'support-api-'));
  const config = {
    port: 0,
    dataFile: path.join(tempDir, 'db.json'),
    queueFile: path.join(tempDir, 'queue.json'),
    seedAdminEmail: 'admin@company.local',
    seedAdminPassword: 'admin123'
  };

  const server = createApiServer(config);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const login = await request(baseUrl, 'POST', '/auth/login', {
      email: 'admin@company.local',
      password: 'admin123'
    });
    assert.equal(login.status, 200);
    const token = login.json.data.token;

    const user = await request(
      baseUrl,
      'POST',
      '/users',
      { email: 'agent@company.local', password: 'agent123', role: 'AGENT', fullName: 'Agent' },
      token
    );
    assert.equal(user.status, 201);

    const ticket = await request(baseUrl, 'POST', '/tickets', {
      subject: 'Printer broken',
      description: 'Office printer does not work',
      requesterEmail: 'requester@example.com'
    });
    assert.equal(ticket.status, 201);

    const assign = await request(
      baseUrl,
      'POST',
      `/tickets/${ticket.json.data.id}/assign`,
      { assignedToUserId: user.json.data.id },
      token
    );
    assert.equal(assign.status, 200);

    const msg = await request(
      baseUrl,
      'POST',
      `/tickets/${ticket.json.data.id}/messages`,
      { body: 'We are checking this now.' },
      token
    );
    assert.equal(msg.status, 201);

    const events = await request(baseUrl, 'GET', `/tickets/${ticket.json.data.id}/events`);
    assert.equal(events.status, 200);
    assert.equal(events.json.data.length, 3);

    const queue = JSON.parse(fs.readFileSync(config.queueFile, 'utf8'));
    assert.equal(queue.jobs.length, 1);
  } finally {
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
