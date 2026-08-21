const express = require('express');
const cors = require('cors');
const path = require('path');
const { checkInAttendee, handleVendorCallback } = require('./checkin');
const { db } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serves index.html, app.js, style.css

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Kiosk scans QR
app.post('/api/checkin', async (req, res) => {
  const { attendee_id, attendeeId, name } = req.body;
  const id = attendee_id || attendeeId;
  if (!id) return res.status(400).json({ error: 'attendee_id required' });
  const result = await checkInAttendee(id, name);
  res.json(result);
});

// Our webhook vendor calls
app.post('/webhook/print-complete', async (req, res) => {
  const result = await handleVendorCallback(req.body);
  res.json(result);
});

// UI polls this
app.get('/api/status/:id', (req, res) => {
  const data = db.get(req.params.id);
  if (!data) return res.json({ attendee_id: req.params.id, status: 'NOT_CHECKED_IN' });
  res.json(data);
});

app.get('/api/attendees', (req, res) => {
  res.json(Object.fromEntries(db));
});

// Test: 3 attendees including duplicate
app.post('/api/test-pivot', async (req, res) => {
  db.clear();
  const { jobs } = require('./database');
  jobs.clear();
  
  const r1 = await checkInAttendee('ATT-001', 'Alice');
  const r2 = await checkInAttendee('ATT-002', 'Bob');
  const r3 = await checkInAttendee('ATT-001', 'Alice Duplicate'); // should block

  // Wait for webhooks to complete
  setTimeout(() => {
    res.json({
      test: '3 scans including duplicate',
      scans: [r1, r2, r3],
      final_db: Object.fromEntries(db),
      pass: r3.blocked === true && Object.keys(Object.fromEntries(db)).length === 2
    });
  }, 4000);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Solstice Kiosk ASYNC running on ${PORT}`));
