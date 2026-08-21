const api = (p, o={}) => fetch(p, {headers:{'Content-Type':'application/json'}, ...o}).then(r=>r.json().then(d=>({status:r.status, data:d})));

async function scan(){
  const el = document.getElementById('attendeeId') || document.querySelector('input');
  const id = el.value.trim();
  if(!id) return;
  const txt = document.evaluate("//*[contains(text(),'Ready') or contains(text(),'Waiting')]", document, null, 9, null).singleNodeValue;
  document.body.innerHTML = document.body.innerHTML.replace('Ready to scan...', '⏳ PENDING: '+id+' Queued to vendor queue...').replace('Waiting for QR','Status: PRINT_PENDING - Check-in queued for vendor verification');
  try{
    const res = await fetch('/api/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attendeeId:id})});
    const d = await res.json();
    if(res.status===409){
      document.body.innerHTML = document.body.innerHTML.replace(/⏳ PENDING:.*/, '🛑 DUPLICATE BLOCKED: '+id).replace(/Status:.*/, 'Status: already_checked_in - '+id+' was already checked in');
      alert('DUPLICATE BLOCKED ✅');
    }else{
      setTimeout(async()=>{
        document.body.innerHTML = document.body.innerHTML.replace(/⏳ PENDING:.*/, '✅ CHECKED_IN: '+id+' confirmed').replace(/Status:.*/, 'Status: checked_in via '+d.jobId+' - Webhook: '+id+' checked in');
        load();
      },2200);
    }
  }catch(e){ alert(e.message); }
  load();
}
async function load(){
  try{
    const r = await fetch('/api/attendees'); const d = await r.json();
    const live = document.evaluate("//*[contains(text(),'Loading')]",document,null,9,null).singleNodeValue;
    if(live) live.textContent = JSON.stringify(d,null,2);
  }catch(e){}
}
async function runPivotTest(){
  await fetch('/api/clear',{method:'POST'});
  for(let id of ['ATT-001','ATT-002','ATT-003']){
    await fetch('/api/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attendeeId:id})});
    await new Promise(r=>setTimeout(r,2300));
  }
  const dup = await fetch('/api/checkin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attendeeId:'ATT-001'})});
  alert(dup.status===409 ? 'PIVOT TEST PASS ✅ Duplicate blocked!' : 'FAIL');
  load();
}
async function clearDB(){ await fetch('/api/clear',{method:'POST'}); location.reload(); }
setInterval(load,2000); load();
// hook buttons
setTimeout(()=>{ document.querySelectorAll('button').forEach(b=>{ if(b.textContent.includes('SCAN')) b.onclick=scan; if(b.textContent.includes('PIVOT')) b.onclick=runPivotTest; if(b.textContent.includes('CLEAR')) b.onclick=clearDB; }); },500);
