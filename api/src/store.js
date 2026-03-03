const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  USER_ROLES,
  MESSAGE_AUTHOR_TYPES
} = require('../../shared/src/constants');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function ensureFile(filePath, fallbackState) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallbackState, null, 2));
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createStore(config) {
  const defaultState = {
    users: [],
    tickets: [],
    ticketMessages: [],
    ticketEvents: [],
    pidCounters: {}
  };
  ensureFile(config.dataFile, defaultState);
  ensureFile(config.queueFile, { jobs: [] });

  const sessions = new Map();

  function readState() {
    return readJson(config.dataFile);
  }

  function saveState(state) {
    writeJson(config.dataFile, state);
  }

  function seedAdminIfMissing() {
    const state = readState();
    const existing = state.users.find((u) => u.email === config.seedAdminEmail);
    if (!existing) {
      state.users.push({
        id: crypto.randomUUID(),
        email: config.seedAdminEmail,
        passwordHash: hashPassword(config.seedAdminPassword),
        role: 'ADMIN',
        fullName: 'Seed Admin',
        createdAt: new Date().toISOString()
      });
      saveState(state);
    }
  }

  function login(email, password) {
    const state = readState();
    const user = state.users.find((u) => u.email === email);
    if (!user || user.passwordHash !== hashPassword(password)) return null;

    const token = crypto.randomUUID();
    sessions.set(token, user.id);
    return { token, user: sanitizeUser(user) };
  }

  function sanitizeUser(user) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      createdAt: user.createdAt
    };
  }

  function findUserByToken(token) {
    const state = readState();
    const userId = sessions.get(token);
    if (!userId) return null;
    const user = state.users.find((item) => item.id === userId);
    return user ? sanitizeUser(user) : null;
  }

  function nextTicketPid(state) {
    const now = new Date();
    const period = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const current = state.pidCounters[period] || 0;
    const next = current + 1;
    state.pidCounters[period] = next;
    return `${period}-${String(next).padStart(6, '0')}`;
  }

  function createTicket(input) {
    if (!TICKET_PRIORITIES.includes(input.priority || 'MEDIUM')) {
      throw new Error('invalid priority');
    }

    const state = readState();
    const ticket = {
      id: crypto.randomUUID(),
      pid: nextTicketPid(state),
      subject: input.subject,
      description: input.description,
      status: 'NEW',
      priority: input.priority || 'MEDIUM',
      requesterName: input.requesterName || null,
      requesterEmail: input.requesterEmail,
      assignedTo: null,
      createdAt: new Date().toISOString()
    };
    state.tickets.push(ticket);
    state.ticketEvents.push({
      id: crypto.randomUUID(),
      ticketId: ticket.id,
      eventType: 'CREATED',
      actorUserId: null,
      metadata: { pid: ticket.pid },
      createdAt: new Date().toISOString()
    });
    saveState(state);
    return ticket;
  }

  function listTickets(filters) {
    const state = readState();
    const page = Math.max(Number(filters.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(filters.pageSize || 20), 1), 100);

    let rows = state.tickets.slice();
    if (filters.status && TICKET_STATUSES.includes(filters.status)) {
      rows = rows.filter((item) => item.status === filters.status);
    }
    if (filters.priority && TICKET_PRIORITIES.includes(filters.priority)) {
      rows = rows.filter((item) => item.priority === filters.priority);
    }
    if (filters.assignedTo) {
      rows = rows.filter((item) => item.assignedTo === filters.assignedTo);
    }

    const total = rows.length;
    const data = rows.slice((page - 1) * pageSize, page * pageSize);
    return { data, page, pageSize, total };
  }

  function assignTicket(ticketId, actorUser, assignedToUserId) {
    if (!['ADMIN', 'SUB_ADMIN'].includes(actorUser.role)) {
      throw new Error('forbidden_role');
    }

    const state = readState();
    const ticket = state.tickets.find((item) => item.id === ticketId);
    if (!ticket) throw new Error('ticket_not_found');

    const assignee = state.users.find((u) => u.id === assignedToUserId);
    if (!assignee || !USER_ROLES.includes(assignee.role)) {
      throw new Error('assignee_not_found');
    }

    ticket.assignedTo = assignedToUserId;
    state.ticketEvents.push({
      id: crypto.randomUUID(),
      ticketId,
      eventType: 'ASSIGNED',
      actorUserId: actorUser.id,
      metadata: { assignedToUserId },
      createdAt: new Date().toISOString()
    });
    saveState(state);
    return ticket;
  }

  function addMessage(ticketId, payload, actorUser) {
    const state = readState();
    const ticket = state.tickets.find((item) => item.id === ticketId);
    if (!ticket) throw new Error('ticket_not_found');

    const authorType = actorUser ? 'AGENT' : 'REQUESTER';
    if (!MESSAGE_AUTHOR_TYPES.includes(authorType)) {
      throw new Error('invalid_author_type');
    }

    const message = {
      id: crypto.randomUUID(),
      ticketId,
      authorType,
      authorUserId: actorUser?.id || null,
      body: payload.body,
      attachments: payload.attachments || [],
      createdAt: new Date().toISOString()
    };

    state.ticketMessages.push(message);
    state.ticketEvents.push({
      id: crypto.randomUUID(),
      ticketId,
      eventType: 'MESSAGE_ADDED',
      actorUserId: actorUser?.id || null,
      metadata: { messageId: message.id },
      createdAt: new Date().toISOString()
    });
    saveState(state);

    const queue = readJson(config.queueFile);
    queue.jobs.push({
      id: crypto.randomUUID(),
      type: 'SEND_EMAIL',
      status: 'PENDING',
      attempts: 0,
      ticketId,
      messageId: message.id,
      to: ticket.requesterEmail,
      subject: `Ticket ${ticket.pid}: New message`,
      createdAt: new Date().toISOString(),
      lastError: null
    });
    writeJson(config.queueFile, queue);

    return message;
  }

  function listMessages(ticketId) {
    const state = readState();
    return state.ticketMessages.filter((item) => item.ticketId === ticketId);
  }

  function listEvents(ticketId) {
    const state = readState();
    return state.ticketEvents.filter((item) => item.ticketId === ticketId);
  }

  function createUser(input) {
    if (!USER_ROLES.includes(input.role)) throw new Error('invalid_role');
    const state = readState();
    const exists = state.users.find((u) => u.email === input.email);
    if (exists) throw new Error('email_exists');

    const user = {
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role,
      fullName: input.fullName || null,
      createdAt: new Date().toISOString()
    };
    state.users.push(user);
    saveState(state);
    return sanitizeUser(user);
  }

  function getTicket(ticketId) {
    const state = readState();
    return state.tickets.find((item) => item.id === ticketId) || null;
  }

  return {
    seedAdminIfMissing,
    login,
    findUserByToken,
    createTicket,
    listTickets,
    assignTicket,
    addMessage,
    listMessages,
    listEvents,
    createUser,
    getTicket
  };
}

module.exports = {
  createStore
};
