const { db } = require('./database');

// Simulate vendor processing then calling OUR webhook
// In real: AWS SQS / RabbitMQ + vendor does POST https://your-app/webhook/print-complete

async function publishToVendorQueue(jobId, attendeeId) {
  console.log(`[VENDOR QUEUE] Queued ${jobId} for ${attendeeId}`);
  
  // Random delay 1-3s to simulate out-of-order arrival
  const delay = 1000 + Math.random() * 2000;
  await new Promise(r => setTimeout(r, delay));

  // Vendor calls our webhook internally
  const { handleVendorCallback } = require('./checkin');
  await handleVendorCallback({
    job_id: jobId,
    attendee_id: attendeeId,
    status: 'SUCCESS',
    timestamp: Date.now()
  });
}

module.exports = { publishToVendorQueue };
