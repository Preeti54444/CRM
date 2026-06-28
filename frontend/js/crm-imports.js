// crm-imports.js
// Renders imported Excel datasets saved in localStorage (populated by crm-api-sync.js)

function getImportedDataset(key) {
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch(e) { return null; }
  }
  return null;
}

function buildTableFromArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '<div style="padding:20px;color:var(--gray-500)">No rows found</div>';

  // get union of keys in order of first row then others
  const keys = Array.from(arr.reduce((set, row) => {
    Object.keys(row || {}).forEach(k => set.add(k));
    return set;
  }, new Set()));

  const header = '<thead><tr>' + keys.map(k => `<th style="padding:8px 12px;border-bottom:1px solid #eee;text-align:left;">${escapeHtml(k)}</th>`).join('') + '</tr></thead>';
  const body = '<tbody>' + arr.map(r => '<tr>' + keys.map(k => `<td style="padding:8px 12px;border-bottom:1px solid #f6f6f6;">${escapeHtml(renderCell(r[k]))}</td>`).join('') + '</tr>').join('') + '</tbody>';
  return `<table style="width:100%;border-collapse:collapse;min-width:800px;">${header}${body}</table>`;
}

function renderCell(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function exportToCSV(arr, filename = 'export.csv') {
  if (!Array.isArray(arr) || arr.length === 0) return;
  const keys = Array.from(arr.reduce((set, row) => { Object.keys(row || {}).forEach(k => set.add(k)); return set; }, new Set()));
  const rows = [keys.join(',')].concat(arr.map(r => keys.map(k => `"${String((r[k]===undefined||r[k]===null)?'':r[k]).replace(/"/g,'""')}"`).join(',')));
  const csv = rows.join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function showImportedDataset(key) {
  const container = document.getElementById('importTableContainer');
  if (!container) return;
  let data = getImportedDataset(key);
  if (!data || data.length === 0) {
    const API_BASE = (typeof getCRMApiBase === 'function'
      ? getCRMApiBase()
      : (window.API_BASE && String(window.API_BASE).replace(/\/$/, '')) || null);
    if (!API_BASE) {
      container.innerHTML = '<div style="padding:20px;color:var(--gray-500)">No rows found</div>';
      return;
    }

    // Check for authentication before attempting backend fetch
    const session = (() => {
      try { return JSON.parse(localStorage.getItem('crm_session') || '{}') } catch (e) { return {} }
    })();
    const token = session?.access_token || session?.token || null;
    
    if (!token) {
      console.log('[crm-imports] No auth token, skipping backend fetch for', key);
      container.innerHTML = '<div style="padding:20px;color:var(--gray-500)">No rows found</div>';
      return;
    }

    const route = key === 'crm_report_history' ? 'report-history' : key.replace(/^crm_/, '');
    const endpoint = API_BASE + '/' + route.replace(/^\/+/, '');
    
    const headers = { 'Accept': 'application/json' };
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    console.log('[crm-imports] Fetching from backend:', {
      endpoint,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      userEmail: session?.email || 'none'
    });
    
    fetch(endpoint, { cache: 'no-cache', headers, credentials: 'include' })
      .then(r => {
        if (!r.ok) {
          console.error('[crm-imports] Fetch failed:', {
            endpoint,
            status: r.status,
            hasToken: !!token,
            userEmail: session?.email || 'none'
          });
          throw new Error('HTTP ' + r.status);
        }
        return r.json();
      })
      .then(json => {
        if (Array.isArray(json)) {
          localStorage.setItem(key, JSON.stringify(json));
          container.innerHTML = buildTableFromArray(json);
        } else if (json && typeof json === 'object') {
          const arr = Array.isArray(json.data) ? json.data : Object.values(json);
          localStorage.setItem(key, JSON.stringify(arr));
          container.innerHTML = buildTableFromArray(arr);
        } else {
          container.innerHTML = '<div style="padding:20px;color:var(--gray-500)">No rows found</div>';
        }
      }).catch(err => {
        console.error('[crm-imports] Import fetch error:', {
          endpoint,
          error: err.message,
          hasToken: !!token,
          userEmail: session?.email || 'none'
        });
        container.innerHTML = '<div style="padding:20px;color:var(--gray-500)">No rows found</div>';
      });
    return;
  }
  container.innerHTML = buildTableFromArray(data);
}

function parseCSVText(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  const pattern = /(?!\s*$)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))(?:,|$)/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const row = [];
    line.replace(pattern, (_, quotedValue, plainValue) => {
      const value = quotedValue !== undefined ? quotedValue.replace(/""/g, '"') : plainValue;
      row.push(value);
      return '';
    });
    rows.push(row);
  }
  return rows;
}

function csvToObjects(text) {
  const rows = parseCSVText(text);
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h || '').trim());
  return rows.slice(1).map(cols => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = cols[index] !== undefined ? cols[index] : '';
    });
    return obj;
  });
}

function saveImportedDataset(key, data) {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(Array.isArray(data) ? data : []));
}

function appendImportedDataset(key, rows) {
  if (!key || !Array.isArray(rows)) return rows;
  const existing = getImportedDataset(key) || [];
  return existing.concat(rows);
}

function getBackendImportConfig(key) {
  switch (key) {
    case 'crm_eod': return { path: 'eod', label: 'EOD report' };
    case 'crm_wod': return { path: 'wod', label: 'WOD report' };
    case 'crm_leads':
    case 'crm_leads_journey':
      return { path: 'leads', label: 'Lead' };
    default:
      return null;
  }
}

function normalizeImportedRowForBackend(key, row) {
  if (!row || typeof row !== 'object') return {};
  const pick = keys => {
    for (const name of keys) {
      if (row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== '') {
        return row[name];
      }
    }
    return undefined;
  };

  if (key === 'crm_eod') {
    const normalized = {};
    normalized.timestamp = pick(['timestamp', 'Timestamp', 'createdAt', 'created_at']) || new Date().toISOString();
    const email = pick(['email', 'Email', 'createdBy', 'createdByEmail', 'created_by', 'created_by_email']);
    if (email !== undefined) normalized.email = email;
    const dateValue = pick(['date_col', 'date', 'Date', 'DATE', 'eod_date', 'dateCol']);
    if (dateValue !== undefined) normalized.date_col = dateValue;
    const salesName = pick(['sales_executive_name', 'salesExecutive', 'Sales Executive', 'sales_executive', 'executive', 'employeeName', 'createdByName']);
    if (salesName !== undefined) normalized.sales_executive_name = salesName;
    const calls = pick(['calls_made', 'callsMade', 'Calls', 'calls', 'callCount']);
    if (calls !== undefined) normalized.calls_made = calls;
    const meetings = pick(['meetings_held', 'meetingsHeld', 'Meetings', 'meetings']);
    if (meetings !== undefined) normalized.meetings_held = meetings;
    const keyClients = pick(['key_clients', 'keyClients', 'Key Clients', 'clients']);
    if (keyClients !== undefined) normalized.key_clients = keyClients;
    const deals = pick(['deals_moved', 'dealsMoved', 'Deals Moved', 'deals', 'Deals']);
    if (deals !== undefined) normalized.deals_moved = deals;
    const challenges = pick(['challenges_faced', 'challengesFaced', 'Challenges', 'challenges']);
    if (challenges !== undefined) normalized.challenges_faced = challenges;
    const learnings = pick(['learnings', 'learning', 'Learnings', 'learnings_today']);
    if (learnings !== undefined) normalized.learnings = learnings;
    const remarks = pick(['remarks', 'Remarks', 'comment', 'description']);
    if (remarks !== undefined) normalized.remarks = remarks;
    const aiScore = pick(['ai_score', 'aiScore', 'Score']);
    if (aiScore !== undefined) normalized.ai_score = aiScore;
    return normalized;
  }

  if (key === 'crm_wod') {
    const normalized = {};
    normalized.timestamp = pick(['timestamp', 'Timestamp', 'createdAt', 'created_at']) || new Date().toISOString();
    const dataFields = Object.keys(row).reduce((acc, header) => {
      acc[header] = row[header];
      return acc;
    }, {});
    normalized.data = JSON.stringify(dataFields);
    return normalized;
  }

  if (key === 'crm_leads' || key === 'crm_leads_journey') {
    const normalized = {};
    normalized.id = pick(['id', 'ID', 'leadId', 'LeadID', 'lead_id', 'leadID', 'uid', 'customerId']) || `lead_${Date.now()}`;
    normalized.name = pick(['name', 'Name', 'company', 'Company', 'companyName']) || 'Imported Lead';
    const email = pick(['email', 'Email', 'email_id', 'email_address', 'emailId']);
    if (email !== undefined) normalized.email = email;
    normalized.data = JSON.stringify(row);
    return normalized;
  }

  return {};
}

async function syncImportedDatasetToBackend(key, rows) {
  const config = getBackendImportConfig(key);
  if (!config || !Array.isArray(rows) || rows.length === 0) return { synced: 0, failed: 0 };
  if (typeof checkBackendHealth !== 'function' || typeof postToCRMBackend !== 'function') return { synced: 0, failed: 0 };

  const online = await checkBackendHealth(true).catch(() => false);
  if (!online) return { synced: 0, failed: 0 };

  const results = await Promise.allSettled(rows.map(row => {
    const payload = normalizeImportedRowForBackend(key, row);
    if (!payload || Object.keys(payload).length === 0) return Promise.resolve({ skipped: true });
    return postToCRMBackend(config.path, payload)
      .then(() => ({ success: true }))
      .catch(() => ({ error: true }));
  }));

  return results.reduce((stats, result) => {
    if (result.status === 'fulfilled') {
      if (result.value && result.value.skipped) {
        return stats;
      }
      if (result.value && result.value.success) {
        stats.synced += 1;
      } else {
        stats.failed += 1;
      }
    } else {
      stats.failed += 1;
    }
    return stats;
  }, { synced: 0, failed: 0 });
}

function getGoogleSheetCsvUrl(sheetUrl) {
  if (!sheetUrl) return null;
  const match = sheetUrl.match(/docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)(?:\/[^#?]*)?(?:[?#].*?gid=(\d+))?/);
  if (!match) return null;
  const sheetId = match[1];
  const gid = match[2] || '0';
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function importGoogleSheetUrl(sheetUrl, key) {
  const url = (sheetUrl || '').trim();
  if (!url) {
    showToast('Paste a Google Sheets URL before importing.', 'error');
    return;
  }

  const exportUrl = getGoogleSheetCsvUrl(url);
  if (!exportUrl) {
    showToast('Google Sheets URL is not valid. Use the sheet URL from your browser.', 'error');
    return;
  }

  if (!key) {
    showToast('Please select a dataset to import into.', 'error');
    return;
  }

  const targetKeysToAppend = new Set(['crm_leads', 'crm_eod', 'crm_wod', 'crm_leads_journey', 'crm_report_history']);
  fetch(exportUrl, { cache: 'no-cache', credentials: 'include', mode: 'cors' })
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(text => {
      const imported = csvToObjects(text);
      if (!Array.isArray(imported) || imported.length === 0) {
        showToast('Imported sheet contains no rows.', 'warning');
        return;
      }
      const rowsToSave = targetKeysToAppend.has(key) ? appendImportedDataset(key, imported) : imported;
      saveImportedDataset(key, rowsToSave);
      if (typeof renderEODHistory === 'function' && key === 'crm_eod') renderEODHistory();
      if (typeof renderWODHistory === 'function' && key === 'crm_wod') renderWODHistory();
      if (typeof renderSODHistory === 'function' && key === 'crm_leads') renderSODHistory();
      if (typeof renderDashboard === 'function') renderDashboard();
      showImportedDataset(key);
      window.importTargetDataset = null;
      showToast(`Imported ${imported.length} rows into ${key}.`, 'success');
      const backendConfig = getBackendImportConfig(key);
      if (backendConfig) {
        syncImportedDatasetToBackend(key, imported)
          .then(stats => {
            if (stats.failed > 0) {
              showToast(`Imported locally; ${stats.synced} rows synced to backend and ${stats.failed} failed.`, 'warning');
            }
          })
          .catch(err => console.warn('Backend import sync failed', err));
      }
    })
    .catch(err => {
      console.warn('Google Sheets import failed', err);
      showToast('Failed to fetch Google Sheet. Ensure the sheet is shared publicly and the URL is correct.', 'error');
    });
}

function triggerImportFor(targetKey) {
  window.importTargetDataset = targetKey;
  const select = document.getElementById('importDatasetSelect');
  if (select) {
    select.value = targetKey;
  }
  const fileInput = document.getElementById('importFileInput');
  if (fileInput) {
    fileInput.click();
  } else {
    showToast('Import picker not available on this page.', 'error');
  }
}

function getImportDatasetKeys() {
  const select = document.getElementById('importDatasetSelect');
  if (!select) return [];
  return Array.from(select.options).map(opt => opt.value).filter(Boolean);
}

function deleteImportedDataset(key) {
  if (!key) return;
  localStorage.removeItem(key);
  const container = document.getElementById('importTableContainer');
  if (container) container.innerHTML = '<div style="padding:20px;color:var(--gray-500)">No rows found</div>';
}

function deleteAllImportedDatasets(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return;
  keys.forEach(key => localStorage.removeItem(key));
  const container = document.getElementById('importTableContainer');
  if (container) container.innerHTML = '<div style="padding:20px;color:var(--gray-500)">No rows found</div>';
}

function initImportsView() {
  const select = document.getElementById('importDatasetSelect');
  const search = document.getElementById('importSearch');
  const exportBtn = document.getElementById('importExportBtn');
  const container = document.getElementById('importTableContainer');
  if (!select || !container) return;

  function update() {
    const key = select.value;
    showImportedDataset(key);
  }

  select.addEventListener('change', update);
  search.addEventListener('input', () => {
    const key = select.value;
    const raw = getImportedDataset(key) || [];
    const q = (document.getElementById('importSearch')?.value || '').toLowerCase().trim();
    if (!q) { container.innerHTML = buildTableFromArray(raw); return; }
    const filtered = raw.filter(row => Object.values(row || {}).some(v => String(v||'').toLowerCase().includes(q)));
    container.innerHTML = buildTableFromArray(filtered);
  });

  const fileBtn = document.getElementById('importFileBtn');
  const fileInput = document.getElementById('importFileInput');
  const sheetBtn = document.getElementById('importSheetBtn');
  const sheetUrlInput = document.getElementById('importSheetUrl');
  const deleteBtn = document.getElementById('importDeleteBtn');
  const deleteAllBtn = document.getElementById('importDeleteAllBtn');

  if (sheetBtn && sheetUrlInput) {
    sheetBtn.addEventListener('click', () => {
      const targetKey = window.importTargetDataset || select.value;
      const key = targetKey || select.value;
      importGoogleSheetUrl(sheetUrlInput.value || '', key);
    });
  }

  exportBtn.addEventListener('click', () => {
    const key = select.value;
    const arr = getImportedDataset(key) || [];
    exportToCSV(arr, key + '-' + (new Date().toISOString().slice(0,10)) + '.csv');
  });

  if (fileBtn && fileInput) {
    fileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const targetKey = window.importTargetDataset || select.value;
      const key = targetKey || select.value;
      const fileName = file.name.toLowerCase();
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target.result;
        let imported = [];

        if (fileName.endsWith('.json')) {
          try {
            const parsed = JSON.parse(fileData);
            imported = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? Object.values(parsed) : []);
          } catch (err) {
            showToast('Unable to parse JSON file.', 'error');
            return;
          }
        } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
          if (typeof XLSX === 'undefined') {
            showToast('Excel import library is not loaded.', 'error');
            return;
          }
          try {
            const workbook = XLSX.read(fileData, { type: 'array' });
            const sheets = workbook.SheetNames;
            if (!sheets || sheets.length === 0) {
              showToast('Excel file contains no sheets.', 'warning');
              return;
            }
            imported = XLSX.utils.sheet_to_json(workbook.Sheets[sheets[0]]);
          } catch (err) {
            showToast('Unable to parse Excel file.', 'error');
            return;
          }
        } else {
          imported = csvToObjects(String(fileData || ''));
        }

        if (!Array.isArray(imported) || imported.length === 0) {
          showToast('Imported file contains no rows.', 'warning');
          return;
        }

        const targetKeysToAppend = new Set(['crm_leads', 'crm_eod', 'crm_wod', 'crm_leads_journey', 'crm_report_history']);
        const rowsToSave = targetKeysToAppend.has(key) ? appendImportedDataset(key, imported) : imported;

        saveImportedDataset(key, rowsToSave);
        if (select && targetKey) {
          select.value = targetKey;
        }
        showImportedDataset(key);

        if (key === 'crm_leads' && typeof renderSODHistory === 'function') renderSODHistory();
        if (key === 'crm_eod' && typeof renderEODHistory === 'function') renderEODHistory();
        if (key === 'crm_wod' && typeof renderWODHistory === 'function') renderWODHistory();
        if (typeof renderDashboard === 'function') renderDashboard();

        showToast(`Imported ${imported.length} rows into ${key}.`, 'success');
        window.importTargetDataset = null;
        const backendConfig = getBackendImportConfig(key);
        if (backendConfig) {
          syncImportedDatasetToBackend(key, imported)
            .then(stats => {
              if (stats.failed > 0) {
                showToast(`Imported locally; ${stats.synced} rows synced to backend and ${stats.failed} failed.`, 'warning');
              }
            })
            .catch(err => console.warn('Backend import sync failed', err));
        }
      };
      reader.onerror = () => {
        showToast('File read failed. Please try again.', 'error');
      };
      if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
      fileInput.value = '';
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const key = select.value;
      if (!key) return;
      if (!confirm('Delete imported data for "' + key + '"? This cannot be undone.')) return;
      deleteImportedDataset(key);
      showImportedDataset(key);
      showToast('Imported dataset deleted from this browser.', 'info');
    });
  }

  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', () => {
      const keys = getImportDatasetKeys();
      if (!keys.length) return;
      if (!confirm('Delete all imported datasets? This cannot be undone.')) return;
      deleteAllImportedDatasets(keys);
      showImportedDataset(select.value);
      showToast('All imported datasets deleted from this browser.', 'info');
    });
  }

  // show default
  showImportedDataset(select.value);
}

// Initialize when navigation selects the section
window.addEventListener('load', () => {
  function initOnce() {
    if (typeof initImportsView === 'function') {
      try { initImportsView(); } catch (e) { console.warn('initImportsView failed', e); }
    }
  }

  // ensure nav() will be available; poll briefly
  const interval = setInterval(() => {
    if (typeof nav === 'function') {
      clearInterval(interval);
      initOnce();
      // attach a hook: when nav is called and sets active section, if it's our section, init
      const origNav = nav;
      nav = function(btn) {
        origNav(btn);
        try {
          if ((btn && btn.getAttribute && btn.getAttribute('data-sec') === 'imported-data') || (typeof btn === 'string' && btn === 'imported-data')) {
            setTimeout(initImportsView, 50);
          }
        } catch(e) {
          console.warn('nav override failed', e);
        }
      };
    }
  }, 80);
});
