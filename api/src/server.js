const http = require('node:http');
const { URL } = require('node:url');
const { createStore } = require('./store');

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function getAuthToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.replace('Bearer ', '');
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function createApiServer(config) {
  const store = createStore(config);
  store.seedAdminIfMissing();

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, { ok: true, service: 'api' });
      }

      if (req.method === 'POST' && url.pathname === '/auth/login') {
        const body = await parseBody(req);
        if (!body.email || !body.password) {
          return json(res, 400, { error: 'email and password are required' });
        }

        const auth = store.login(body.email, body.password);
        if (!auth) return json(res, 401, { error: 'invalid credentials' });
        return json(res, 200, { data: auth });
      }

      if (req.method === 'POST' && url.pathname === '/users') {
        const token = getAuthToken(req);
        const actor = token ? store.findUserByToken(token) : null;
        if (!actor || actor.role !== 'ADMIN') return json(res, 403, { error: 'admin required' });

        const body = await parseBody(req);
        if (!body.email || !body.password || !body.role) {
          return json(res, 400, { error: 'email, password and role are required' });
        }

        return json(res, 201, { data: store.createUser(body) });
      }

      if (req.method === 'POST' && url.pathname === '/tickets') {
        const body = await parseBody(req);
        if (!body.subject || !body.description || !body.requesterEmail) {
          return json(res, 400, { error: 'subject, description, requesterEmail are required' });
        }
        return json(res, 201, { data: store.createTicket(body) });
      }

      if (req.method === 'GET' && url.pathname === '/tickets') {
        const filters = {
          status: url.searchParams.get('status') || undefined,
          priority: url.searchParams.get('priority') || undefined,
          assignedTo: url.searchParams.get('assigned_to') || undefined,
          page: url.searchParams.get('page') || undefined,
          pageSize: url.searchParams.get('page_size') || undefined
        };
        return json(res, 200, store.listTickets(filters));
      }

      const assignMatch = url.pathname.match(/^\/tickets\/([^/]+)\/assign$/);
      if (req.method === 'POST' && assignMatch) {
        const token = getAuthToken(req);
        const actor = token ? store.findUserByToken(token) : null;
        if (!actor) return json(res, 401, { error: 'auth required' });

        const body = await parseBody(req);
        if (!body.assignedToUserId) return json(res, 400, { error: 'assignedToUserId is required' });

        const ticket = store.assignTicket(assignMatch[1], actor, body.assignedToUserId);
        return json(res, 200, { data: ticket });
      }

      const messageMatch = url.pathname.match(/^\/tickets\/([^/]+)\/messages$/);
      if (req.method === 'POST' && messageMatch) {
        const token = getAuthToken(req);
        const actor = token ? store.findUserByToken(token) : null;
        const body = await parseBody(req);
        if (!body.body) return json(res, 400, { error: 'body is required' });

        const message = store.addMessage(messageMatch[1], body, actor);
        return json(res, 201, { data: message });
      }

      if (req.method === 'GET' && messageMatch) {
        return json(res, 200, { data: store.listMessages(messageMatch[1]) });
      }

      const eventMatch = url.pathname.match(/^\/tickets\/([^/]+)\/events$/);
      if (req.method === 'GET' && eventMatch) {
        return json(res, 200, { data: store.listEvents(eventMatch[1]) });
      }

      if (req.method === 'POST' && url.pathname === '/webhooks/inbound-email') {
        const body = await parseBody(req);
        if (!body.ticketId || !body.body) {
          return json(res, 400, { error: 'ticketId and body are required' });
        }
        if (!store.getTicket(body.ticketId)) {
          return json(res, 404, { error: 'ticket not found' });
        }
        const message = store.addMessage(body.ticketId, { body: body.body, attachments: [] }, null);
        return json(res, 202, { data: message });
      }

      return json(res, 404, { error: 'not found' });
    } catch (error) {
      if (error instanceof SyntaxError) return json(res, 400, { error: 'invalid json' });
      if (error.message === 'invalid priority') return json(res, 400, { error: error.message });
      if (error.message === 'forbidden_role') return json(res, 403, { error: 'role not allowed' });
      if (error.message === 'ticket_not_found') return json(res, 404, { error: 'ticket not found' });
      if (error.message === 'assignee_not_found') return json(res, 404, { error: 'assignee not found' });
      if (error.message === 'invalid_role') return json(res, 400, { error: 'invalid role' });
      if (error.message === 'email_exists') return json(res, 409, { error: 'email exists' });
      return json(res, 500, { error: 'internal_error' });
    }
  });
}

module.exports = { createApiServer };
