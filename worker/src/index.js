const fs = require('node:fs');
const path = require('node:path');

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);
const MAX_ATTEMPTS = Number(process.env.WORKER_MAX_ATTEMPTS || 3);
const QUEUE_FILE =
  process.env.EMAIL_QUEUE_FILE || path.join(__dirname, '..', '.data', 'email-queue.json');

function ensureQueue() {
  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
  if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({ jobs: [] }, null, 2));
  }
}

function readQueue() {
  ensureQueue();
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function writeQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function deliver(job) {
  console.log(`[worker] sending email to=${job.to} subject=\"${job.subject}\" ticketId=${job.ticketId}`);
}

function processQueueOnce() {
  const queue = readQueue();
  const job = queue.jobs.find((item) => item.status === 'PENDING');

  if (!job) {
    console.log('[worker] queue empty');
    return;
  }

  try {
    job.attempts += 1;
    deliver(job);
    job.status = 'SENT';
    job.lastError = null;
    job.updatedAt = new Date().toISOString();
  } catch (error) {
    job.lastError = String(error.message || error);
    job.updatedAt = new Date().toISOString();
    job.status = job.attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
  }

  writeQueue(queue);
}

console.log(`[worker] started. polling every ${POLL_INTERVAL_MS}ms`);
processQueueOnce();
setInterval(processQueueOnce, POLL_INTERVAL_MS);
