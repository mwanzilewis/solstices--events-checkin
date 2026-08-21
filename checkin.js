const { db, jobs } = require('./database');
const { publishToVendorQueue } = require('./queue');

// Locks per attendee to prevent race condition
const locks = new Map();

async function acquireLock(id) {
  while (locks.get(id)) await new Promise(r => setTimeout(r, 10));
  locks.set(id, true);
}
function releaseLock(id) { locks.set(id, false); }

async function checkInAttendee(attendeeId, name = '') {
  await acquireLock(attendeeId);
  try {
    const existing = db.get(attendeeId);

    // REQUIREMENT: Duplicate-scan protection - must NOT print second badge
    if (existing && ['PRINT_PENDING', 'CHECKED_IN'].includes(existing.status)) {
      return {
        attendee_id: attendeeId,
        status: existing.status,
        job_id: existing.jobId,
        blocked: true,
        message: 'DUPLICATE BLOCKED: Already checked-in/pending. No second badge.'
      };
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    
    db.set(attendeeId, {
      attendee_id: attendeeId,
      name,
      status: 'PRINT_PENDING', // UI must show PENDING
      jobId,
      createdAt: Date.now(),
      checkedInAt: null
    });
    jobs.set(jobId, attendeeId);

    // PIVOT: Async - don't wait, publish to queue
    publishToVendorQueue(jobId, attendeeId); // fire and forget

    return {
      attendee_id: attendeeId,
      status: 'PRINT_PENDING',
      job_id: jobId,
      message: 'Queued to vendor. Poll GET /api/status/:id until CHECKED_IN'
    };
  } finally {
    releaseLock(attendeeId);
  }
}

// Our webhook vendor calls
async function handleVendorCallback({ job_id, attendee_id, status }) {
  const mappedId = jobs.get(job_id);
  if (!mappedId) return { ok: false, reason: 'Unknown job_id - ignored' };
  if (mappedId !== attendee_id) return { ok: false, reason: 'Job/attendee mismatch' };

  await acquireLock(attendee_id);
  try {
    const current = db.get(attendee_id);
    if (!current) return { ok: false, reason: 'Attendee not found' };

    // REQUIREMENT: Out-of-order protection
    if (current.jobId !== job_id) {
      return { ok: false, ignored: true, reason: `Out-of-order. Current job ${current.jobId}, got ${job_id}` };
    }

    // Idempotent
    if (current.status === 'CHECKED_IN') {
      return { ok: true, ignored: true, reason: 'Already CHECKED_IN' };
    }

    if (status === 'SUCCESS') {
      current.status = 'CHECKED_IN';
      current.checkedInAt = Date.now();
      console.log(`[CHECKED IN] ${attendee_id} via ${job_id}`);
    } else {
      current.status = 'PRINT_FAILED';
    }
    return { ok: true, new_status: current.status };
  } finally {
    releaseLock(attendee_id);
  }
}

module.exports = { checkInAttendee, handleVendorCallback };
