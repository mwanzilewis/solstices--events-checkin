// Production would be Redis / Postgres
// Status: NOT_CHECKED_IN -> PRINT_PENDING -> CHECKED_IN

const db = new Map(); // attendeeId -> { status, jobId, name, timestamps }
const jobs = new Map(); // jobId -> attendeeId

module.exports = { db, jobs };
