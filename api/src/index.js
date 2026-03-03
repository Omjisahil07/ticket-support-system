const express = require('express');
const { getApiConfig } = require('./config');
const { createTicket, listTickets } = require('./store');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api' });
});

app.get('/tickets', (_req, res) => {
  res.json({ data: listTickets() });
});

app.post('/tickets', (req, res) => {
  const { subject, description, requesterEmail, requesterName, priority } = req.body || {};

  if (!subject || !description || !requesterEmail) {
    return res.status(400).json({
      error: 'subject, description, and requesterEmail are required'
    });
  }

  const ticket = createTicket({
    subject,
    description,
    requesterEmail,
    requesterName,
    priority
  });

  return res.status(201).json({ data: ticket });
});

const { port } = getApiConfig();
app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
