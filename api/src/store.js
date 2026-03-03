const tickets = [];

function createTicket(input) {
  const now = new Date().toISOString();
  const ticket = {
    id: crypto.randomUUID(),
    pid: generatePid(),
    subject: input.subject,
    description: input.description,
    requesterName: input.requesterName || null,
    requesterEmail: input.requesterEmail,
    status: 'NEW',
    priority: input.priority || 'MEDIUM',
    createdAt: now
  };

  tickets.push(ticket);
  return ticket;
}

function listTickets() {
  return tickets;
}

function generatePid() {
  const now = new Date();
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const serial = String(tickets.length + 1).padStart(6, '0');
  return `${yyyymm}-${serial}`;
}

module.exports = {
  createTicket,
  listTickets
};
