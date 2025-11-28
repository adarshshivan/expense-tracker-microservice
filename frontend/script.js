// script.js
// Defensive front-end: uses API_BASE_URL from config.js

(() => {
  // DOM
  const statusLine = document.getElementById('statusLine');
  const cardsContainer = document.getElementById('cardsContainer');
  const openAddBtn = document.getElementById('openAddBtn');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const expenseForm = document.getElementById('expenseForm');
  const submitBtn = document.getElementById('submitBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  const searchBox = document.getElementById('searchBox');
  const fromDate = document.getElementById('fromDate');
  const toDate = document.getElementById('toDate');
  const categoryFilter = document.getElementById('categoryFilter');

  let expenses = [];
  let useDemo = typeof USE_DEMO_MODE !== 'undefined' ? !!USE_DEMO_MODE : true;
  let editingId = null;

  const safeBase = () => {
    if (typeof API_BASE_URL !== 'string' || API_BASE_URL.trim() === '') {
      console.error('API_BASE_URL missing or invalid in config.js');
      return null;
    }
    // Remove trailing slash if any
    return API_BASE_URL.replace(/\/+$/, '');
  };

  // Build a full API url for a path (path must start with /)
  function buildUrl(path) {
    const base = safeBase();
    if (!base) return null;
    if (!path.startsWith('/')) path = '/' + path;
    return base + path;
  }

  // Generic API request
  async function apiRequest(method, path, body) {
    const url = buildUrl(path);
    if (!url) throw new Error('Invalid API base URL');
    statusLine.textContent = `Calling ${method} ${url}`;
    console.log(`API request -> ${method} ${url}`);
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    // If status 2xx -> return json, else throw
    if (!res.ok) {
      const text = await res.text().catch(()=>null);
      const msg = `API error ${res.status} ${res.statusText}: ${text || ''}`;
      throw new Error(msg);
    }
    return res.status === 204 ? null : res.json();
  }

  // Probe API availability by attempting to GET /expenses
  async function probeAwsAvailability() {
    // If the developer forced demo mode, respect it
    if (useDemo && USE_DEMO_MODE) {
      statusLine.textContent = 'Demo mode (forced)';
      return false;
    }
    const url = buildUrl('/expenses');
    if (!url) {
      statusLine.textContent = 'API base is invalid — using demo mode';
      return false;
    }

    try {
      // Try a HEAD or GET - API Gateway may not accept HEAD, so use GET but only check status
      statusLine.textContent = `Checking API: ${url}`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        statusLine.textContent = 'Connected to AWS (real mode)';
        return true;
      } else {
        console.warn('probe failed', res.status, res.statusText);
        return false;
      }
    } catch (err) {
      console.warn('probe error', err);
      return false;
    }
  }

  // Start: fetch expenses
  async function fetchExpenses() {
    // First detect API availability (unless user forced demo)
    const baseIsOk = await probeAwsAvailability();
    if (!baseIsOk || (typeof USE_DEMO_MODE !== 'undefined' && USE_DEMO_MODE === true)) {
      // Switch to demo
      useDemo = true;
      expenses = (typeof DEMO_DATA !== 'undefined' && Array.isArray(DEMO_DATA)) ? DEMO_DATA.slice() : [];
      statusLine.textContent = 'AWS not reachable, switching to DEMO mode';
      renderExpenses();
      return;
    }

    // Real mode
    useDemo = false;
    try {
      const data = await apiRequest('GET', '/expenses');
      // Expect an array
      if (Array.isArray(data)) {
        expenses = data;
      } else if (data && Array.isArray(data.items)) {
        // possible paginated shape
        expenses = data.items;
      } else {
        console.warn('unexpected payload shape, using demo fallback', data);
        useDemo = true;
        expenses = (typeof DEMO_DATA !== 'undefined') ? DEMO_DATA.slice() : [];
        statusLine.textContent = 'Unexpected payload; switched to demo';
      }
      statusLine.textContent = 'Loaded expenses (AWS)';
      renderExpenses();
    } catch (err) {
      console.error('Failed to load expenses:', err);
      useDemo = true;
      expenses = (typeof DEMO_DATA !== 'undefined') ? DEMO_DATA.slice() : [];
      statusLine.textContent = 'Error loading AWS data; switched to demo';
      renderExpenses();
    }
  }

  // Render cards after filtering
  function renderExpenses() {
    cardsContainer.innerHTML = '';
    if (!Array.isArray(expenses) || expenses.length === 0) {
      cardsContainer.innerHTML = '<div class="status">No expenses found</div>';
      return;
    }

    const q = (searchBox.value || '').toLowerCase();
    const from = fromDate.value ? new Date(fromDate.value) : null;
    const to = toDate.value ? new Date(toDate.value) : null;
    const cat = categoryFilter.value || '';

    const filtered = expenses.filter(e => {
      if (cat && e.category !== cat) return false;
      if (q) {
        const notes = (e.notes || '').toLowerCase();
        const category = (e.category || '').toLowerCase();
        if (!notes.includes(q) && !category.includes(q)) return false;
      }
      if (from || to) {
        const d = e.date ? new Date(e.date) : null;
        if (d) {
          if (from && d < from) return false;
          if (to && d > to) return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      cardsContainer.innerHTML = '<div class="status">No expenses found (filtered)</div>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      const dateStr = item.date ? new Date(item.date).toLocaleString() : '-';
      card.innerHTML = `
        <div class="title">${escapeHtml(item.category || '—')} <span style="float:right">₹${escapeHtml(item.amount || 0)}</span></div>
        <div class="notes">${escapeHtml(item.notes || '')}</div>
        <div class="meta">${escapeHtml(dateStr)}</div>
        <div class="actions">
          <button class="small" data-action="edit" data-id="${escapeHtml(item.expense_id)}">Edit</button>
          <button class="small" data-action="delete" data-id="${escapeHtml(item.expense_id)}">Delete</button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  }

  // escape for safety
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  // Open modal for add/edit
  function openModal(edit = false, data = {}) {
    modal.classList.remove('hidden');
    modalTitle.textContent = edit ? 'Edit Expense' : 'Add Expense';
    document.getElementById('amount').value = data.amount || '';
    document.getElementById('category').value = data.category || '';
    document.getElementById('notes').value = data.notes || '';
    // convert ISO to local datetime-local format
    if (data.date) {
      const dt = new Date(data.date);
      const local = dt.toISOString().slice(0,16); // UTC iso -> local representation is OK for input
      document.getElementById('date').value = local;
    } else {
      document.getElementById('date').value = '';
    }
    editingId = edit ? data.expense_id : null;
  }

  function closeModal() {
    modal.classList.add('hidden');
    expenseForm.reset();
    editingId = null;
  }

  // Add new expense (calls API or updates demo)
  async function createExpense(payload) {
    if (useDemo) {
      // local demo add
      payload.expense_id = 'demo-' + Math.random().toString(36).slice(2,9);
      expenses.unshift(payload);
      renderExpenses();
      alert('Added (demo)');
      return;
    }
    // Real API
    try {
      await apiRequest('POST', '/expenses', payload);
      alert('Added (AWS)');
      await fetchExpenses();
    } catch (err) {
      console.error('Create failed', err);
      alert('Create failed: switching to demo');
      useDemo = true;
      expenses.unshift({ ...payload, expense_id: 'demo-'+Math.random().toString(36).slice(2,8) });
      renderExpenses();
    }
  }

  // Update
  async function updateExpense(id, payload) {
    if (useDemo) {
      const idx = expenses.findIndex(e => e.expense_id === id);
      if (idx >= 0) {
        expenses[idx] = { ...expenses[idx], ...payload };
        renderExpenses();
        alert('Updated (demo)');
      }
      return;
    }
    try {
      await apiRequest('PUT', `/expenses/${encodeURIComponent(id)}`, payload);
      alert('Updated (AWS)');
      await fetchExpenses();
    } catch (err) {
      console.error('Update failed', err);
      alert('Update failed: switching to demo');
      useDemo = true;
      const idx = expenses.findIndex(e => e.expense_id === id);
      if (idx>=0) {
        expenses[idx] = { ...expenses[idx], ...payload };
        renderExpenses();
      }
    }
  }

  // Delete
  async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    if (useDemo) {
      expenses = expenses.filter(e => e.expense_id !== id);
      renderExpenses();
      alert('Deleted (demo)');
      return;
    }
    try {
      await apiRequest('DELETE', `/expenses/${encodeURIComponent(id)}`);
      alert('Deleted (AWS)');
      await fetchExpenses();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Delete failed: switching to demo');
      useDemo = true;
      expenses = expenses.filter(e => e.expense_id !== id);
      renderExpenses();
    }
  }

  // Hook events
  openAddBtn.addEventListener('click', () => openModal(false, {}));
  cancelBtn.addEventListener('click', closeModal);

  expenseForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const payload = {
      amount: Number(document.getElementById('amount').value) || 0,
      category: document.getElementById('category').value || '',
      notes: document.getElementById('notes').value || '',
      date: document.getElementById('date').value ? new Date(document.getElementById('date').value).toISOString() : new Date().toISOString()
    };
    if (editingId) {
      updateExpense(editingId, payload);
    } else {
      createExpense(payload);
    }
    closeModal();
  });

  // card actions (edit/delete)
  cardsContainer.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (action === 'edit') {
      const item = expenses.find(e => e.expense_id === id);
      if (item) openModal(true, item);
    } else if (action === 'delete') {
      deleteExpense(id);
    }
  });

  // filters
  [searchBox, fromDate, toDate, categoryFilter].forEach(el => {
    el.addEventListener('input', () => renderExpenses());
  });

  // Initialization
  document.addEventListener('DOMContentLoaded', async () => {
    // Safety check of API_BASE_URL presence and shape - the script will handle fallback
    if (typeof API_BASE_URL === 'undefined' || !API_BASE_URL) {
      console.warn('API_BASE_URL not set. Using demo mode.');
      useDemo = true;
    } else {
      // If the developer set USE_DEMO_MODE true in config, respect it
      if (typeof USE_DEMO_MODE !== 'undefined' && !!USE_DEMO_MODE) {
        useDemo = true;
        statusLine.textContent = 'Demo mode forced by config';
      } else {
        // otherwise attempt to load from real API
        useDemo = false;
      }
    }
    await fetchExpenses();
  });
})();
