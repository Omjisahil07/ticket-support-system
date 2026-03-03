const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);

function pollQueue() {
  const now = new Date().toISOString();
  console.log(`[worker] poll tick at ${now}`);
}

console.log('[worker] starting background worker');
pollQueue();
setInterval(pollQueue, POLL_INTERVAL_MS);
