const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Safe database - won't crash if file name wrong
let db, jobs;
try {
  const data = require('./database');
  db = data.db; jobs = data.jobs;
} catch(e) {
  try {
    const data = require('./databae');
    db = data.db; jobs = data.jobs;
  } catch(e2) {
    const dbMap = new Map(); const jobsMap = new Map();
    db = dbMap; jobs = jobsMap;
  }
}

// API - List attendees
app.get('/api/attendees', (req,res) => {
  const obj = {};
  db.forEach((v,k) => obj[k]=v);
  res.json(obj);
});

// API - Clear
app.post('/api/clear', (req,res) => {
  db.clear(); jobs.clear();
  res.json({cleared:true});
});

// API - Checkin Async
app.post('/api/checkin', (req,res) => {
  const { attendeeId } = req.body;
  if (!attendeeId) return res.status(400).json({error:'Missing ID'});

  if (db.has(attendeeId) && db.get(attendeeId).status === 'checked_in') {
    return res.status(409).json({error:'DUPLICATE', attendeeId, status:'already_checked_in'});
  }

  const jobId = 'job_' + Date.now() + '_' + attendeeId;
  jobs.set(jobId, { status:'pending', attendeeId });
  db.set(attendeeId, { status:'pending', jobId, timestamp:new Date().toISOString() });

  // Simulate vendor queue async (2 sec)
  setTimeout(() => {
    jobs.set(jobId, { status:'completed', attendeeId });
    db.set(attendeeId, { status:'checked_in', jobId, timestamp:new Date().toISOString() });
    console.log(`Webhook: ${attendeeId} checked in via ${jobId}`);
  }, 2000);

  res.json({ jobId, status:'queued', message:'Check-in queued for vendor verification' });
});

// API - Job status
app.get('/api/job/:jobId', (req,res) => {
  const job = jobs.get(req.params.jobId);
  if(!job) return res.status(404).json({error:'Job not found'});
  res.json(job);
});

// Serve frontend LAST
app.use(express.static(path.join(__dirname)));
app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Running on', PORT));
}
