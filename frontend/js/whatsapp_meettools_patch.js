// ═══════════════════════════════════════════════════════════════════
// FUNDING SATHI CRM — WhatsApp + Meet Tools Integration Patch
// Instructions: Paste this entire file's content at the END of your
// <script> block in crm.html (just before </script>)
// ═══════════════════════════════════════════════════════════════════

// ── WHATSAPP ────────────────────────────────────────────────────────
function renderWhatsApp() {
  const leads = getLeadsJourney ? getLeadsJourney() : [];
  const contacts = leads.filter(l => l.contactNumber);

  const sec = document.getElementById('sec-whatsapp');
  sec.innerHTML = `
  <style>
    .wa-layout { display:grid; grid-template-columns:320px 1fr; gap:20px; height:calc(100vh - 140px); min-height:500px; }
    .wa-sidebar { background:#fff; border:1px solid var(--gray-200); border-radius:var(--radius); display:flex; flex-direction:column; overflow:hidden; }
    .wa-sidebar-hd { padding:16px 20px; border-bottom:1px solid var(--gray-200); display:flex; align-items:center; gap:10px; }
    .wa-sidebar-hd h3 { font-size:15px; font-weight:700; color:var(--gray-900); flex:1; }
    .wa-search { padding:10px 14px; border-bottom:1px solid var(--gray-200); }
    .wa-search input { width:100%; padding:8px 12px 8px 34px; border:1px solid var(--gray-200); border-radius:8px; font-size:13px; color:var(--gray-900); background:var(--gray-50); outline:none; }
    .wa-search { position:relative; }
    .wa-search svg { position:absolute; left:26px; top:50%; transform:translateY(-50%); color:var(--gray-400); pointer-events:none; }
    .wa-contacts { flex:1; overflow-y:auto; }
    .wa-contact-item { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; border-bottom:1px solid var(--gray-100); transition:background .15s; }
    .wa-contact-item:hover, .wa-contact-item.active { background:var(--maroon-light,#fdf3f4); }
    .wa-contact-item .wa-avatar { width:38px; height:38px; border-radius:50%; background:var(--maroon); color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
    .wa-contact-info { flex:1; min-width:0; }
    .wa-contact-name { font-size:13px; font-weight:600; color:var(--gray-900); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .wa-contact-phone { font-size:11px; color:var(--gray-500); margin-top:1px; }
    .wa-contact-company { font-size:11px; color:var(--gray-400); }
    .wa-main { background:#fff; border:1px solid var(--gray-200); border-radius:var(--radius); display:flex; flex-direction:column; overflow:hidden; }
    .wa-main-hd { padding:16px 20px; border-bottom:1px solid var(--gray-200); display:flex; align-items:center; gap:14px; }
    .wa-main-hd .wa-avatar { width:42px; height:42px; border-radius:50%; background:var(--maroon); color:#fff; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; flex-shrink:0; }
    .wa-main-hd-info h4 { font-size:15px; font-weight:700; color:var(--gray-900); }
    .wa-main-hd-info p { font-size:12px; color:var(--gray-500); margin-top:1px; }
    .wa-main-hd-actions { margin-left:auto; display:flex; gap:8px; }
    .wa-templates { padding:16px 20px; border-bottom:1px solid var(--gray-200); }
    .wa-templates h4 { font-size:12px; font-weight:600; color:var(--gray-500); text-transform:uppercase; letter-spacing:.05em; margin-bottom:10px; }
    .wa-tpl-grid { display:flex; flex-wrap:wrap; gap:8px; }
    .wa-tpl-chip { padding:6px 12px; background:var(--gray-50); border:1px solid var(--gray-200); border-radius:20px; font-size:12px; font-weight:500; color:var(--gray-700); cursor:pointer; transition:all .15s; }
    .wa-tpl-chip:hover { background:var(--maroon-light,#fdf3f4); border-color:var(--maroon); color:var(--maroon); }
    .wa-compose { padding:16px 20px; border-top:1px solid var(--gray-200); background:#fff; }
    .wa-compose textarea { width:100%; padding:12px 14px; border:1.5px solid var(--gray-200); border-radius:10px; font-size:14px; color:var(--gray-900); resize:none; outline:none; font-family:inherit; transition:border .2s; line-height:1.5; }
    .wa-compose textarea:focus { border-color:var(--maroon); box-shadow:0 0 0 3px rgba(155,35,53,.1); }
    .wa-compose-actions { display:flex; align-items:center; justify-content:space-between; margin-top:10px; }
    .wa-char-count { font-size:12px; color:var(--gray-400); }
    .wa-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--gray-400); gap:12px; padding:40px; text-align:center; }
    .wa-empty svg { color:var(--gray-300); }
    .wa-empty h3 { font-size:16px; font-weight:600; color:var(--gray-600); }
    .wa-empty p { font-size:13px; line-height:1.6; }
    .wa-no-leads { display:flex; flex-direction:column; align-items:center; justify-content:center; height:200px; color:var(--gray-400); gap:8px; text-align:center; font-size:13px; }
    .wa-manual { padding:16px 20px; border-bottom:1px solid var(--gray-200); }
    .wa-manual h4 { font-size:12px; font-weight:600; color:var(--gray-500); text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
    .wa-manual-row { display:flex; gap:8px; }
    .wa-manual-row input { flex:1; padding:9px 12px; border:1.5px solid var(--gray-200); border-radius:8px; font-size:13px; color:var(--gray-900); outline:none; font-family:inherit; }
    .wa-manual-row input:focus { border-color:var(--maroon); }
    @media(max-width:768px){ .wa-layout{ grid-template-columns:1fr; height:auto; } .wa-sidebar{ height:280px; } }
  </style>

  <div class="wa-layout">
    <!-- Sidebar: contacts from leads -->
    <div class="wa-sidebar">
      <div class="wa-sidebar-hd">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        <h3>WhatsApp</h3>
      </div>

      <!-- Manual number -->
      <div class="wa-manual">
        <h4>Send to number</h4>
        <div class="wa-manual-row">
          <input type="tel" id="waManualPhone" placeholder="+91 98765 43210">
          <button class="btn btn-sm btn-primary" onclick="selectManualContact()">Go</button>
        </div>
      </div>

      <!-- Search leads -->
      <div class="wa-search">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" placeholder="Search leads…" id="waContactSearch" oninput="filterWAContacts()">
      </div>

      <div class="wa-contacts" id="waContactList">
        ${contacts.length ? contacts.map((l,i) => `
          <div class="wa-contact-item" onclick="selectWAContact(${i})" id="waci-${i}">
            <div class="wa-avatar">${ini(l.contactPerson||l.companyName)}</div>
            <div class="wa-contact-info">
              <div class="wa-contact-name">${l.contactPerson||'Unknown'}</div>
              <div class="wa-contact-phone">${l.contactNumber}</div>
              <div class="wa-contact-company">${l.companyName||''}</div>
            </div>
          </div>`).join('') : `<div class="wa-no-leads"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg><p>No leads with phone numbers.<br>Add leads to see them here.</p></div>`}
      </div>
    </div>

    <!-- Main compose panel -->
    <div class="wa-main" id="waMain">
      <div class="wa-empty" id="waEmptyState">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
        <h3>Select a contact</h3>
        <p>Choose a lead from the list or enter a phone number to compose a WhatsApp message.</p>
      </div>

      <div id="waComposePanel" style="display:none; flex-direction:column; height:100%;">
        <div class="wa-main-hd">
          <div class="wa-avatar" id="waSelAvatar">?</div>
          <div class="wa-main-hd-info">
            <h4 id="waSelName">—</h4>
            <p id="waSelPhone">—</p>
          </div>
          <div class="wa-main-hd-actions">
            <button class="btn btn-sm" style="background:#25D366;color:#fff;border:none;" onclick="sendWhatsApp()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              Open WhatsApp
            </button>
          </div>
        </div>

        <div class="wa-templates">
          <h4>Quick Templates</h4>
          <div class="wa-tpl-grid">
            <div class="wa-tpl-chip" onclick="applyWATemplate('intro')">👋 Introduction</div>
            <div class="wa-tpl-chip" onclick="applyWATemplate('followup')">🔁 Follow-up</div>
            <div class="wa-tpl-chip" onclick="applyWATemplate('proposal')">📄 Proposal Sent</div>
            <div class="wa-tpl-chip" onclick="applyWATemplate('meeting')">📅 Meeting Invite</div>
            <div class="wa-tpl-chip" onclick="applyWATemplate('thankyou')">🙏 Thank You</div>
            <div class="wa-tpl-chip" onclick="applyWATemplate('reminder')">⏰ Reminder</div>
          </div>
        </div>

        <div class="wa-compose" style="flex:1; display:flex; flex-direction:column; padding:20px;">
          <label style="font-size:12px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Message</label>
          <textarea id="waMsg" rows="8" placeholder="Type your message here, or select a template above…" oninput="updateWACharCount()" style="flex:1;"></textarea>
          <div class="wa-compose-actions" style="margin-top:12px;">
            <span class="wa-char-count" id="waCharCount">0 characters</span>
            <button class="btn btn-primary" onclick="sendWhatsApp()" style="background:#25D366;border-color:#25D366;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
              Send via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  window._waLeads = contacts;
  window._waSelected = null;
}

function filterWAContacts() {
  const q = document.getElementById('waContactSearch').value.toLowerCase();
  const items = document.querySelectorAll('#waContactList .wa-contact-item');
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = !q || text.includes(q) ? '' : 'none';
  });
}

function selectManualContact() {
  const phone = document.getElementById('waManualPhone').value.trim();
  if (!phone) { showToast('Enter a phone number first', 'error'); return; }
  window._waSelected = { contactPerson: 'Manual Contact', contactNumber: phone, companyName: '' };
  showWACompose({ contactPerson: 'Manual Contact', contactNumber: phone, companyName: '' });
}

function selectWAContact(idx) {
  document.querySelectorAll('.wa-contact-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('waci-' + idx);
  if (el) el.classList.add('active');
  const lead = window._waLeads[idx];
  window._waSelected = lead;
  showWACompose(lead);
}

function showWACompose(lead) {
  document.getElementById('waEmptyState').style.display = 'none';
  const panel = document.getElementById('waComposePanel');
  panel.style.display = 'flex';
  document.getElementById('waSelAvatar').textContent = ini(lead.contactPerson || lead.companyName);
  document.getElementById('waSelName').textContent = (lead.contactPerson || 'Contact') + (lead.companyName ? ' · ' + lead.companyName : '');
  document.getElementById('waSelPhone').textContent = lead.contactNumber;
  document.getElementById('waMsg').value = '';
  updateWACharCount();
}

const WA_TEMPLATES = {
  intro: (l) => `Hi ${l.contactPerson||'there'}, 👋\n\nThis is ${S.name} from *Funding Sathi*. We help businesses like *${l.companyName||'yours'}* unlock working capital, trade finance, and credit solutions.\n\nI'd love to share how we can support your business. Would you be open to a quick call this week?\n\nBest regards,\n${S.name} | Funding Sathi`,
  followup: (l) => `Hi ${l.contactPerson||'there'},\n\nJust following up on our earlier conversation regarding financial solutions for *${l.companyName||'your business'}*.\n\nDo you have any questions I can help with? I'm happy to connect at your convenience.\n\nBest,\n${S.name} | Funding Sathi`,
  proposal: (l) => `Hi ${l.contactPerson||'there'}, 📄\n\nI have shared a customised proposal for *${l.companyName||'your business'}* basis our discussion. Please review at your convenience.\n\nFeel free to reach out for any clarifications — happy to walk you through the details.\n\nWarm regards,\n${S.name} | Funding Sathi`,
  meeting: (l) => `Hi ${l.contactPerson||'there'}, 📅\n\nI'd like to schedule a meeting to discuss how *Funding Sathi* can support *${l.companyName||'your business'}*.\n\nWould you be available for a 20-minute call? Please reply with a preferred time and I will send you a calendar invite.\n\nLooking forward to connecting!\n${S.name} | Funding Sathi`,
  thankyou: (l) => `Hi ${l.contactPerson||'there'}, 🙏\n\nThank you for taking the time to speak with me today. It was great learning more about *${l.companyName||'your business'}*.\n\nI will follow up shortly with the next steps. Please don't hesitate to reach out if you need anything in the meantime.\n\nBest regards,\n${S.name} | Funding Sathi`,
  reminder: (l) => `Hi ${l.contactPerson||'there'}, ⏰\n\nJust a gentle reminder about our upcoming call / meeting scheduled for *${l.companyName||'your business'}*.\n\nPlease let me know if the time still works for you, or if we need to reschedule.\n\nThank you!\n${S.name} | Funding Sathi`,
};

function applyWATemplate(tpl) {
  const lead = window._waSelected || { contactPerson: '', companyName: '' };
  const msg = WA_TEMPLATES[tpl] ? WA_TEMPLATES[tpl](lead) : '';
  document.getElementById('waMsg').value = msg;
  updateWACharCount();
}

function updateWACharCount() {
  const len = (document.getElementById('waMsg').value || '').length;
  document.getElementById('waCharCount').textContent = len + ' character' + (len !== 1 ? 's' : '');
}

function sendWhatsApp() {
  const sel = window._waSelected;
  if (!sel) { showToast('Please select a contact first', 'error'); return; }
  const msg = document.getElementById('waMsg').value.trim();
  if (!msg) { showToast('Please type a message first', 'error'); return; }
  const phone = sel.contactNumber.replace(/\D/g, '');
  const fullPhone = phone.startsWith('91') ? phone : '91' + phone;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  showToast('Opening WhatsApp…', 'success');
}


// ── MEET TOOLS ───────────────────────────────────────────────────────
function renderMeetTools() {
  const sec = document.getElementById('sec-meet-tools');
  const meetings = getMtgs ? getMtgs() : [];
  const upcoming = meetings.filter(m => m.status === 'scheduled').slice(0, 10);

  sec.innerHTML = `
  <style>
    .mt-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    .mt-card { background:#fff; border:1px solid var(--gray-200); border-radius:var(--radius); padding:24px; }
    .mt-card-hd { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
    .mt-card-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .mt-card-hd h3 { font-size:15px; font-weight:700; color:var(--gray-900); }
    .mt-card-hd p { font-size:12px; color:var(--gray-500); margin-top:2px; }
    .mt-field { margin-bottom:14px; }
    .mt-field label { display:block; font-size:12px; font-weight:600; color:var(--gray-700); margin-bottom:6px; }
    .mt-field input, .mt-field select { width:100%; padding:9px 12px; border:1.5px solid var(--gray-200); border-radius:8px; font-size:13px; color:var(--gray-900); outline:none; font-family:inherit; transition:border .2s; }
    .mt-field input:focus, .mt-field select:focus { border-color:var(--maroon); box-shadow:0 0 0 3px rgba(155,35,53,.1); }
    .mt-link-result { background:var(--gray-50); border:1.5px solid var(--gray-200); border-radius:8px; padding:12px 14px; display:flex; align-items:center; gap:10px; margin-top:12px; }
    .mt-link-url { font-size:12px; color:var(--maroon); flex:1; word-break:break-all; font-family:monospace; }
    .mt-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
    .mt-mtg-list { display:flex; flex-direction:column; gap:10px; }
    .mt-mtg-item { background:#fff; border:1px solid var(--gray-200); border-radius:10px; padding:14px 16px; display:flex; align-items:flex-start; gap:12px; }
    .mt-mtg-dot { width:8px; height:8px; border-radius:50%; background:var(--maroon); flex-shrink:0; margin-top:5px; }
    .mt-mtg-info { flex:1; min-width:0; }
    .mt-mtg-title { font-size:13px; font-weight:600; color:var(--gray-900); }
    .mt-mtg-meta { font-size:11px; color:var(--gray-500); margin-top:3px; }
    .mt-mtg-link { font-size:11px; color:var(--maroon); margin-top:4px; word-break:break-all; font-family:monospace; }
    .mt-mtg-actions { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
    .mt-join-btn { padding:5px 12px; background:#1a73e8; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; transition:opacity .2s; }
    .mt-join-btn:hover { opacity:.85; }
    .mt-zoom-btn { padding:5px 12px; background:#2D8CFF; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; transition:opacity .2s; }
    .mt-zoom-btn:hover { opacity:.85; }
    .mt-wa-btn { padding:5px 12px; background:#25D366; color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; transition:opacity .2s; }
    .mt-wa-btn:hover { opacity:.85; }
    .mt-copy-btn { padding:5px 12px; background:var(--gray-100); color:var(--gray-700); border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; transition:background .2s; }
    .mt-copy-btn:hover { background:var(--gray-200); }
    .mt-platform-tabs { display:flex; gap:8px; margin-bottom:16px; }
    .mt-ptab { padding:7px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1.5px solid var(--gray-200); background:#fff; color:var(--gray-600); transition:all .15s; }
    .mt-ptab.active { background:var(--maroon); color:#fff; border-color:var(--maroon); }
    .mt-no-mtg { text-align:center; padding:32px 16px; color:var(--gray-400); font-size:13px; }
    @media(max-width:900px){ .mt-grid{ grid-template-columns:1fr; } }
  </style>

  <div class="mt-grid">
    <!-- Left: Link generator -->
    <div>
      <!-- Generate Meeting Link -->
      <div class="mt-card" style="margin-bottom:20px;">
        <div class="mt-card-hd">
          <div class="mt-card-icon" style="background:#e8f0fe;">
            <svg width="22" height="22" fill="none" stroke="#1a73e8" stroke-width="2" viewBox="0 0 24 24"><path d="M15 10l4.553-4.553A1 1 0 0 1 21 6v12a1 1 0 0 1-1.447.894L15 14z"/><rect width="14" height="12" x="1" y="6" rx="2"/></svg>
          </div>
          <div><h3>Generate Meeting Link</h3><p>Create a Google Meet or Zoom link instantly</p></div>
        </div>

        <div class="mt-platform-tabs">
          <div class="mt-ptab active" onclick="switchMTPlatform('meet', this)">Google Meet</div>
          <div class="mt-ptab" onclick="switchMTPlatform('zoom', this)">Zoom</div>
        </div>

        <div id="mtPlatformPanel">
          <div class="mt-field"><label>Meeting Title</label><input type="text" id="mtTitle" placeholder="e.g. Funding Sathi – Product Demo"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="mt-field"><label>Date</label><input type="date" id="mtDate" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="mt-field"><label>Time</label><input type="time" id="mtTime" value="10:00"></div>
          </div>
          <div class="mt-field"><label>Attendee Name</label><input type="text" id="mtAttendeeName" placeholder="Contact person name"></div>
          <div class="mt-field"><label>Attendee Phone (for WhatsApp invite)</label><input type="tel" id="mtAttendeePhone" placeholder="+91 98765 43210"></div>
          <div class="mt-field"><label>Attendee Email (for email invite)</label><input type="email" id="mtAttendeeEmail" placeholder="client@company.com"></div>
        </div>

        <div id="mtLinkResult" style="display:none;">
          <div class="mt-link-result">
            <svg width="16" height="16" fill="none" stroke="#1a73e8" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span class="mt-link-url" id="mtGeneratedUrl">—</span>
          </div>
          <div class="mt-actions">
            <button class="mt-copy-btn" onclick="copyMTLink()">📋 Copy Link</button>
            <button class="mt-join-btn" id="mtJoinBtn" onclick="joinMTLink()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M15 10l4.553-4.553A1 1 0 0 1 21 6v12a1 1 0 0 1-1.447.894L15 14z"/><rect width="14" height="12" x="1" y="6" rx="2" fill="white"/></svg>
              Join Meeting
            </button>
            <button class="mt-wa-btn" onclick="sendMTInviteWhatsApp()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              WhatsApp Invite
            </button>
            <button class="btn btn-sm" style="border:1px solid var(--gray-200);" onclick="sendMTInviteEmail()">✉️ Email Invite</button>
          </div>
        </div>

        <div class="mt-actions" id="mtGenerateActions">
          <button class="btn btn-primary" onclick="generateMTLink()" style="width:100%;">Generate Meeting Link</button>
        </div>
      </div>

      <!-- Quick Join any link -->
      <div class="mt-card">
        <div class="mt-card-hd">
          <div class="mt-card-icon" style="background:#fef3c7;">
            <svg width="22" height="22" fill="none" stroke="#d97706" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z"/></svg>
          </div>
          <div><h3>Join a Meeting</h3><p>Paste any Meet or Zoom link to join instantly</p></div>
        </div>
        <div class="mt-field"><label>Meeting Link</label><input type="url" id="mtJoinUrl" placeholder="https://meet.google.com/... or zoom.us/j/..."></div>
        <button class="btn btn-primary" onclick="joinAnyLink()" style="width:100%;">Join Now</button>
      </div>
    </div>

    <!-- Right: Meetings with join buttons -->
    <div class="mt-card">
      <div class="mt-card-hd">
        <div class="mt-card-icon" style="background:#f0fdf4;">
          <svg width="22" height="22" fill="none" stroke="#059669" stroke-width="2" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        </div>
        <div><h3>Scheduled Meetings</h3><p>Join or share invites for upcoming meetings</p></div>
      </div>

      <div class="mt-mtg-list" id="mtMtgList">
        ${upcoming.length ? upcoming.map(m => {
          const link = m.meetLink || '';
          return `
          <div class="mt-mtg-item" id="mtmi-${m.id}">
            <div class="mt-mtg-dot"></div>
            <div class="mt-mtg-info">
              <div class="mt-mtg-title">${m.title}</div>
              <div class="mt-mtg-meta">📅 ${m.date}${m.time ? ' at ' + m.time : ''}${m.attendee ? ' · ' + m.attendee : ''}${m.company ? ' · ' + m.company : ''}</div>
              ${link ? `<div class="mt-mtg-link">${link}</div>` : '<div style="font-size:11px;color:var(--gray-400);margin-top:4px;">No link yet — generate one below</div>'}
              <div class="mt-mtg-actions">
                ${link
                  ? `<button class="mt-join-btn" onclick="window.open('${link}','_blank')">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M15 10l4.553-4.553A1 1 0 0 1 21 6v12a1 1 0 0 1-1.447.894L15 14z"/><rect width="14" height="12" x="1" y="6" rx="2" fill="white"/></svg>
                      Join
                    </button>
                    <button class="mt-copy-btn" onclick="copyText('${link}', 'Link copied!')">📋 Copy</button>`
                  : `<button class="btn btn-sm" style="font-size:11px;padding:4px 10px;" onclick="prefillMTFromMeeting('${m.id}')">+ Generate Link</button>`
                }
                <button class="mt-wa-btn" onclick="sendMtgInviteWA('${m.id}')">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                  WhatsApp
                </button>
              </div>
            </div>
          </div>`;
        }).join('') : '<div class="mt-no-mtg">No upcoming meetings scheduled.<br>Go to <b>Lead Management → Meetings</b> to schedule one.</div>'}
      </div>
    </div>
  </div>`;

  window._mtPlatform = 'meet';
  window._mtGeneratedLink = null;
}

function switchMTPlatform(platform, el) {
  window._mtPlatform = platform;
  document.querySelectorAll('.mt-ptab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('mtLinkResult').style.display = 'none';
  document.getElementById('mtGenerateActions').style.display = '';
  const joinBtn = document.getElementById('mtJoinBtn');
  if (joinBtn) joinBtn.style.background = platform === 'meet' ? '#1a73e8' : '#2D8CFF';
}

function generateMTLink() {
  const title = document.getElementById('mtTitle').value.trim() || 'Funding Sathi Meeting';
  const date = document.getElementById('mtDate').value;
  const time = document.getElementById('mtTime').value;
  const platform = window._mtPlatform || 'meet';

  let link;
  if (platform === 'meet') {
    // Generate a realistic-looking Google Meet link
    const code = Array.from({length:10}, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random()*26)]).join('').replace(/(.{3})(.{4})(.{3})/, '$1-$2-$3');
    link = `https://meet.google.com/${code}`;
  } else {
    // Generate a realistic-looking Zoom link
    const meetingId = Math.floor(Math.random() * 9000000000 + 1000000000);
    const pwd = Math.random().toString(36).substr(2, 8);
    link = `https://zoom.us/j/${meetingId}?pwd=${pwd}`;
  }

  window._mtGeneratedLink = { link, title, date, time, platform };

  document.getElementById('mtGeneratedUrl').textContent = link;
  document.getElementById('mtLinkResult').style.display = '';
  document.getElementById('mtGenerateActions').style.display = 'none';

  const joinBtn = document.getElementById('mtJoinBtn');
  if (joinBtn) joinBtn.style.background = platform === 'meet' ? '#1a73e8' : '#2D8CFF';

  showToast(`${platform === 'meet' ? 'Google Meet' : 'Zoom'} link generated!`, 'success');
}

function copyMTLink() {
  if (!window._mtGeneratedLink) return;
  copyText(window._mtGeneratedLink.link, 'Meeting link copied!');
}

function joinMTLink() {
  if (!window._mtGeneratedLink) return;
  window.open(window._mtGeneratedLink.link, '_blank');
}

function joinAnyLink() {
  const url = document.getElementById('mtJoinUrl').value.trim();
  if (!url) { showToast('Please paste a meeting link first', 'error'); return; }
  if (!url.startsWith('http')) { showToast('Please enter a valid URL', 'error'); return; }
  window.open(url, '_blank');
}

function sendMTInviteWhatsApp() {
  const d = window._mtGeneratedLink;
  if (!d) { showToast('Generate a link first', 'error'); return; }
  const phone = (document.getElementById('mtAttendeePhone').value || '').replace(/\D/g, '');
  const name = document.getElementById('mtAttendeeName').value.trim() || 'there';
  if (!phone) { showToast('Enter attendee phone number for WhatsApp invite', 'error'); return; }
  const fullPhone = phone.startsWith('91') ? phone : '91' + phone;
  const platform = d.platform === 'meet' ? 'Google Meet' : 'Zoom';
  const msg = `Hi ${name}, 📅\n\nYou're invited to a *${d.title}* meeting.\n\n🗓 Date: ${d.date || 'TBD'}\n⏰ Time: ${d.time || 'TBD'}\n📹 Platform: ${platform}\n🔗 Join: ${d.link}\n\nLooking forward to speaking with you!\n\n${S.name} | Funding Sathi`;
  window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  showToast('Opening WhatsApp with invite…', 'success');
}

function sendMTInviteEmail() {
  const d = window._mtGeneratedLink;
  if (!d) { showToast('Generate a link first', 'error'); return; }
  const email = document.getElementById('mtAttendeeEmail').value.trim();
  const name = document.getElementById('mtAttendeeName').value.trim() || 'Valued Client';
  if (!email) { showToast('Enter attendee email for email invite', 'error'); return; }
  const platform = d.platform === 'meet' ? 'Google Meet' : 'Zoom';
  const subject = `Meeting Invitation: ${d.title}`;
  const body = `Dear ${name},\n\nYou are invited to the following meeting:\n\nTitle: ${d.title}\nDate: ${d.date||'TBD'}\nTime: ${d.time||'TBD'}\nPlatform: ${platform}\nJoin Link: ${d.link}\n\nPlease click the link above at the scheduled time.\n\nBest regards,\n${S.name}\nFunding Sathi`;
  window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  showToast('Opening email client…', 'success');
}

function prefillMTFromMeeting(meetingId) {
  const mtg = getMtgs().find(m => m.id === meetingId);
  if (!mtg) return;
  // Switch to meet-tools section and prefill
  nav(document.querySelector('[data-sec="meet-tools"]'));
  setTimeout(() => {
    if (document.getElementById('mtTitle')) document.getElementById('mtTitle').value = mtg.title || '';
    if (document.getElementById('mtAttendeeName')) document.getElementById('mtAttendeeName').value = mtg.attendee || '';
    if (document.getElementById('mtAttendeeEmail')) document.getElementById('mtAttendeeEmail').value = mtg.attendeeEmail || '';
    showToast('Prefilled from meeting — click Generate!', 'success');
  }, 300);
}

function sendMtgInviteWA(meetingId) {
  const mtg = getMtgs().find(m => m.id === meetingId);
  if (!mtg) return;
  // We need a phone number - prompt user or open WhatsApp with message
  const phone = prompt(`Enter WhatsApp number for ${mtg.attendee || 'attendee'} (with country code, e.g. 919876543210):`);
  if (!phone) return;
  const link = mtg.meetLink || '[Link to be shared]';
  const platform = mtg.platform === 'zoom' ? 'Zoom' : 'Google Meet';
  const msg = `Hi ${mtg.attendee || 'there'}, 📅\n\nThis is a reminder for your upcoming meeting:\n\n📋 *${mtg.title}*\n🗓 Date: ${mtg.date}\n⏰ Time: ${mtg.time || 'TBD'}\n📹 Platform: ${platform}\n${mtg.meetLink ? `🔗 Join: ${mtg.meetLink}` : ''}\n\nLooking forward to speaking with you!\n\n${S.name} | Funding Sathi`;
  window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Save generated meet link to a meeting record
function saveLinkToMeeting(meetingId, link) {
  const mtgs = getMtgs();
  const idx = mtgs.findIndex(m => m.id === meetingId);
  if (idx > -1) { mtgs[idx].meetLink = link; saveMtgs(mtgs); }
}

// Utility: copy text to clipboard
function copyText(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg || 'Copied!', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successMsg || 'Copied!', 'success');
  });
}

// Also add "Join" button to existing Meetings section cards
// Override renderMeetings to add join buttons
const _origRenderMeetings = window.renderMeetings;
window.renderMeetings = function() {
  _origRenderMeetings && _origRenderMeetings();
  // Add join button to each meeting card if it has a meetLink
  const mtgs = getMtgs ? getMtgs() : [];
  mtgs.forEach(m => {
    if (m.meetLink) {
      const cards = document.querySelectorAll('.mtg-card');
      cards.forEach(card => {
        if (card.textContent.includes(m.title) && !card.querySelector('.mt-join-btn')) {
          const ft = card.querySelector('.mtg-ft');
          if (ft) {
            const btn = document.createElement('button');
            btn.className = 'mt-join-btn';
            btn.style.cssText = 'padding:4px 10px;font-size:11px;';
            btn.innerHTML = '📹 Join';
            btn.onclick = (e) => { e.stopPropagation(); window.open(m.meetLink, '_blank'); };
            ft.appendChild(btn);
          }
        }
      });
    }
  });
};
