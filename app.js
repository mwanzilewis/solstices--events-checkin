const API = ""; // same domain
let pollInterval = null;

async function scan() {
  const id = document.getElementById('attendeeId').value.trim();
  if (!id) return;

  setStatus('pending', '⏳', `${id} - PRINT_PENDING`, 'Queued to vendor queue. Waiting for webhook...');
  addLog(`[QUEUE] Published print job for ${id}`);

  const res = await fetch(`${API}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendee_id: id, name: id })
  }).then(r => r.json());

  console.log(res);

  if (res.blocked) {
    setStatus('blocked', '🚫', `${id} - DUPLICATE BLOCKED`, 'No second badge printed. Requirement passed.');
    addLog(`[BLOCKED] Duplicate scan for ${id} blocked`);
    refreshDB();
    return;
  }

  // Start polling GET /api/status/:id
  startPolling(id);
}

function startPolling(id) {
  if (pollInterval) clearInterval(pollInterval);
  let tries = 0;
  pollInterval = setInterval(async () => {
    tries++;
    const s = await fetch(`${API}/api/status/${id}`).then(r => r.json());
    refreshDB();

    if (s.status === 'CHECKED_IN') {
      clearInterval(pollInterval);
      setStatus('checked', '✅', `${id} - CHECKED_IN`, `Badge printed! Job: ${s.jobId} (via webhook)`);
      addLog(`[WEBHOOK] ${id} confirmed CHECKED_IN via ${s.jobId}`);
    } else if (tries > 15) {
      clearInterval(pollInterval);
      setStatus('pending', '⚠️', 'Still pending...', 'Webhook delayed');
    }
  }, 800);
}

function setStatus(type, icon, text, sub) {
  const card = document.getElementById('statusCard');
  card.className = `card ${type}`;
  document.getElementById('statusIcon').textContent = icon;
  document.getElementById('statusText').textContent = text;
  document.getElementById('statusSub').textContent = sub;
}

async function refreshDB() {
  const data = await fetch(`${API}/api/attendees`).then(r => r.json());
  document.getElementById('dbView').textContent = JSON.stringify(data, null, 2);
}

function addLog(msg) {
  const log = document.getElementById('webhookLog');
  log.innerHTML = `${new Date().toLocaleTimeString()} - ${msg}<br>` + log.innerHTML;
}

async function runPivotTest() {
  setStatus('pending', '🧪', 'Running Pivot Test', '3 attendees including duplicate...');
  const res = await fetch(`${API}/api/test-pivot`, { method: 'POST' }).then(r => r.json());
  document.getElementById('dbView').textContent = JSON.stringify(res, null, 2);
  if (res.pass) {
    setStatus('checked', '🎉', 'PIVOT TEST PASSED', 'Duplicate blocked, 2 badges printed, async works');
  } else {
    setStatus('blocked', '❌', 'TEST FAILED', JSON.stringify(res));
  }
  addLog(`[TEST] Pivot test result: ${res.pass ? 'PASS' : 'FAIL'}`);
}

async function clearDB() {
  // Quick hack - just reload with new IDs, server test-pivot clears for you
  refreshDB();
  setStatus('idle', '💤', 'Ready to scan...', 'Database view refreshed');
  document.getElementById('webhookLog').innerHTML = 'Cleared...';
}

// Auto-refresh DB every 2s
setInterval(refreshDB, 2000);
refreshDB();

// Enter key scans
document.getElementById('attendeeId').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') scan();
});
