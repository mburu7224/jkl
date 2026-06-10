/* ════════════════════════════════════════════
   dashboard.js — Main dashboard
   Tabs: Meter Entry | Results & Payment
   ════════════════════════════════════════════ */

const Dashboard = {
  appData: null,
  readings: {},       // { unitName: { prev, curr } }
  mainMeter: { prev: '', curr: '' },
  results: null,
  payments: {},
  activeTab: 'entry',
  currentCategory: 'dashboard',

  // ── Entry point ──────────────────────────────
  render(container, appData, category = 'dashboard') {
    this.appData  = appData;
    this.readings = {};
    this.mainMeter = { prev: '', curr: '' };
    this.results  = null;
    this.payments = appData.payments || {};
    this.activeTab = 'entry';
    this.currentCategory = category || 'dashboard';

    // container is the main-workspace area
    container.innerHTML = `<div class="page-wrap" id="dashWrap"></div>`;
    this.updateTopbar();

    // Dispatch by category
    if (this.currentCategory === 'dashboard') this.renderDash();
    else if (this.currentCategory === 'readings') { this.activeTab = 'entry'; this.renderDash(); }
    else if (this.currentCategory === 'tenants') this.renderTenants();
    else if (this.currentCategory === 'statements') this.renderStatements();
    else if (this.currentCategory === 'requests') this.renderRequests();
    else if (this.currentCategory === 'settings') this.renderSettings();
    else this.renderDash();
  },

  updateTopbar() {
    const el = document.getElementById('topbarRight');
    el.innerHTML = `
      <span class="prop-name-tag">${this.appData.settings.propertyName}</span>
      <a href="public/index.html" id="btn-public-portal" class="topbar-link-btn">Public Portal ↗</a>
      <button class="btn btn-ghost" id="resetBtn" style="font-size:12px;padding:6px 14px">Reset Setup</button>
    `;
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('Reset all setup data and start over?')) {
        Storage.clear();
        App.init();
      }
    });
  },

  renderDash() {
    const wrap = document.getElementById('dashWrap');
    const sym  = this.appData.settings.currency;
    const units = this.appData.units;

    // Stats (show only if results exist)
    let statsHtml = '';
    if (this.results) {
      const billed = Calc.totalBilled(this.results);
      const paid   = Calc.totalPaid(this.results, this.payments);
      const usage  = Calc.totalUsage(this.results);
      statsHtml = `
        <div class="stat-grid">
          <div class="stat-card blue">
            <div class="stat-label">Total Billed</div>
            <div class="stat-value blue">${Calc.formatCurrency(sym, billed)}</div>
            <div class="stat-sub">${this.results.length} units</div>
          </div>
          <div class="stat-card green">
            <div class="stat-label">Total Paid</div>
            <div class="stat-value green">${Calc.formatCurrency(sym, paid)}</div>
            <div class="stat-sub">${this.results.filter(r => this.payments[r.unitName] === 'paid').length} units cleared</div>
          </div>
          <div class="stat-card amber">
            <div class="stat-label">Total Usage</div>
            <div class="stat-value amber">${parseFloat(usage.toFixed(1)).toLocaleString()}</div>
            <div class="stat-sub">cubic metres (m³)</div>
          </div>
        </div>
      `;
    }

    // Nav tabs
    const tabsHtml = `
      <div class="nav-tabs">
        <button class="nav-tab ${this.activeTab === 'entry' ? 'active' : ''}" id="tabEntry">Meter Entry</button>
        ${this.results ? `<button class="nav-tab ${this.activeTab === 'results' ? 'active' : ''}" id="tabResults">Results & Payment</button>` : ''}
      </div>
    `;

    wrap.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:1rem">
        <div>
          <h1 class="page-title">${this.appData.settings.propertyName}</h1>
          <p class="page-subtitle">${units.length} units &middot; ${units.filter(u=>u.hasMeter).length} metered &middot; ${this.appData.settings.currency}</p>
        </div>
      </div>
      ${statsHtml}
      ${tabsHtml}
      <div id="tabContent"></div>
    `;

    // Tab events
    document.getElementById('tabEntry')?.addEventListener('click', () => {
      this.activeTab = 'entry';
      this.renderDash();
    });
    document.getElementById('tabResults')?.addEventListener('click', () => {
      this.activeTab = 'results';
      this.renderDash();
    });

    // Tab content
    if (this.activeTab === 'entry') this.renderMeterEntry();
    if (this.activeTab === 'results' && this.results) this.renderResults();
  },

  // ══════════════════════════════════════════════
  // METER ENTRY TAB
  // ══════════════════════════════════════════════
  renderMeterEntry() {
    const content = document.getElementById('tabContent');
    const { settings, units } = this.appData;

    let mainMeterHtml = '';
    if (settings.hasMainMeter) {
      const prevVal = this.mainMeter.prev;
      const currVal = this.mainMeter.curr;
      const diff = (prevVal !== '' && currVal !== '') ? (parseFloat(currVal) - parseFloat(prevVal)) : null;
      mainMeterHtml = `
        <div class="main-meter-panel">
          <div class="main-meter-header">
            <div class="main-meter-icon">🔵</div>
            Main / Master Meter
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="field-label">Previous Reading (m³)</label>
              <input type="number" id="mainPrev" value="${prevVal}" placeholder="e.g. 1200" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label class="field-label">Current Reading (m³)</label>
              <input type="number" id="mainCurr" value="${currVal}" placeholder="e.g. 1350" min="0" step="0.01" />
            </div>
          </div>
          ${diff !== null && diff >= 0 ? `<div class="main-meter-total">↳ Total consumption this period: <strong>${diff.toFixed(1)} m³</strong></div>` : ''}
        </div>
      `;
    }

    // Unit meter cards
    const cardsHtml = units.map(u => {
      const r = this.readings[u.unitName] || { prev: '', curr: '' };
      const usagePrev = parseFloat(r.prev);
      const usageCurr = parseFloat(r.curr);
      const hasPreview = !isNaN(usagePrev) && !isNaN(usageCurr) && r.prev !== '' && r.curr !== '';
      const usageVal = hasPreview ? (usageCurr - usagePrev).toFixed(1) : null;

      return `
        <div class="meter-card">
          <div class="meter-card-header">
            <div>
              <div class="meter-unit-name">${u.unitName}</div>
              <div class="meter-tenant">${u.tenantName}</div>
            </div>
            <span class="badge ${u.hasMeter ? 'badge-blue' : 'badge-amber'}">${u.hasMeter ? '📡 Metered' : '⚠ No Meter'}</span>
          </div>
          ${u.hasMeter && u.meterNumber && u.meterNumber !== 'MISSING_METER' ? `<div class="meter-number">Meter #: ${u.meterNumber}</div>` : ''}
          ${u.hasMeter ? `
            <div class="form-group">
              <label class="field-label">Previous Reading (m³)</label>
              <input type="number" class="reading-inp" data-unit="${u.unitName}" data-field="prev" value="${r.prev}" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div class="form-group">
              <label class="field-label">Current Reading (m³)</label>
              <input type="number" class="reading-inp" data-unit="${u.unitName}" data-field="curr" value="${r.curr}" placeholder="0.00" min="0" step="0.01" />
            </div>
            ${usageVal !== null ? `<div class="usage-preview">Usage: ${usageVal} m³</div>` : ''}
          ` : `
            <div class="auto-calculated">
              <span class="auto-calculated-label">AUTO CALCULATED</span>
              <span class="auto-calculated-sub">Usage derived from main meter</span>
            </div>
          `}
        </div>
      `;
    }).join('');

    content.innerHTML = `
      ${mainMeterHtml}
      <div class="meter-grid" id="meterGrid">
        ${cardsHtml}
      </div>
      <div id="calcError"></div>
      <div class="calc-action">
        <button class="btn btn-primary btn-lg" id="calcBtn">⚡ Calculate Bills</button>
      </div>
    `;

    // Main meter live update
    if (settings.hasMainMeter) {
      const update = () => {
        this.mainMeter.prev = document.getElementById('mainPrev').value;
        this.mainMeter.curr = document.getElementById('mainCurr').value;
        // Live diff display
        const prev = parseFloat(this.mainMeter.prev);
        const curr = parseFloat(this.mainMeter.curr);
        let totalEl = content.querySelector('.main-meter-total');
        if (!totalEl) {
          const panel = content.querySelector('.main-meter-panel');
          totalEl = document.createElement('div');
          totalEl.className = 'main-meter-total';
          panel.appendChild(totalEl);
        }
        if (!isNaN(prev) && !isNaN(curr) && curr >= prev) {
          totalEl.textContent = `↳ Total consumption this period: ${(curr - prev).toFixed(1)} m³`;
        } else {
          totalEl.textContent = '';
        }
      };
      document.getElementById('mainPrev').addEventListener('input', update);
      document.getElementById('mainCurr').addEventListener('input', update);
    }

    // Reading inputs
    content.querySelectorAll('.reading-inp').forEach(inp => {
      inp.addEventListener('input', e => {
        const unit  = e.target.dataset.unit;
        const field = e.target.dataset.field;
        if (!this.readings[unit]) this.readings[unit] = { prev: '', curr: '' };
        this.readings[unit][field] = e.target.value;

        // Live usage preview
        const r = this.readings[unit];
        const prev = parseFloat(r.prev);
        const curr = parseFloat(r.curr);
        const card = e.target.closest('.meter-card');
        let prevEl = card.querySelector('.usage-preview');
        if (!isNaN(prev) && !isNaN(curr) && r.prev !== '' && r.curr !== '') {
          if (!prevEl) {
            prevEl = document.createElement('div');
            prevEl.className = 'usage-preview';
            e.target.closest('.form-group').after(prevEl);
          }
          prevEl.textContent = `Usage: ${(curr - prev).toFixed(1)} m³`;
        } else if (prevEl) {
          prevEl.textContent = '';
        }
      });
    });

    // Calculate button
    document.getElementById('calcBtn').addEventListener('click', () => this.doCalculate());
  },

  // ══════════════════════════════════════════════
  // CALCULATION
  // ══════════════════════════════════════════════
  doCalculate() {
    const errEl = document.getElementById('calcError');
    errEl.innerHTML = '';

    const mainMeter = this.appData.settings.hasMainMeter ? this.mainMeter : null;
    const { results, error } = Calc.calculate(
      this.appData.units,
      this.readings,
      mainMeter,
      this.appData.settings
    );

    if (error) {
      errEl.innerHTML = `<div class="info-box error" style="margin-bottom:1rem"><span>⚠️</span><span>${error.replace(/\n/g,'<br>')}</span></div>`;
      return;
    }

    this.results = results;
    this.payments = {};
    this.appData.payments = {};
    Storage.save({ ...this.appData, payments: {} });

    Toast.show('Bills calculated successfully!', 'success');
    this.activeTab = 'results';
    this.renderDash();
  },

  // ══════════════════════════════════════════════
  // RESULTS TAB
  // ══════════════════════════════════════════════
  renderResults() {
    const content = document.getElementById('tabContent');
    const { settings } = this.appData;
    const sym = settings.currency;

    const rows = this.results.map(r => {
      const status = this.payments[r.unitName];
      const isPaid  = status === 'paid';
      const isProc  = status === 'processing';

      let actionBtn;
      if (isPaid) {
        actionBtn = `<span class="btn-paid">✓ Paid</span>`;
      } else if (isProc) {
        actionBtn = `<span class="btn-processing"><span class="spinner"></span> Processing</span>`;
      } else {
        actionBtn = `<button class="btn btn-success btn-pay" data-unit="${r.unitName}">PAY</button>`;
      }

      let statusBadge;
      if (isPaid)  statusBadge = `<span class="badge badge-green">✓ PAID</span>`;
      else if (isProc) statusBadge = `<span class="badge badge-amber">PROCESSING</span>`;
      else statusBadge = `<span class="badge badge-red">UNPAID</span>`;

      return `
        <tr class="${isPaid ? 'paid-row' : ''}">
          <td>
            <span class="td-unit-name">${r.unitName}</span>
            ${!r.hasMeter ? `<span class="badge badge-amber" style="margin-left:6px">auto</span>` : ''}
          </td>
          <td>${r.tenantName}</td>
          <td style="font-variant-numeric:tabular-nums">${r.usage.toFixed(1)}</td>
          <td><span class="td-amount">${Calc.formatCurrency(sym, r.bill)}</span></td>
          <td>${statusBadge}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join('');

    const billed = Calc.totalBilled(this.results);
    const paid   = Calc.totalPaid(this.results, this.payments);
    const outstanding = billed - paid;

    content.innerHTML = `
      <div class="results-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Tenant</th>
                <th>Usage (m³)</th>
                <th>Bill (${sym})</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="resultsBody">
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
      <div class="results-footer">
        <div class="outstanding-box">
          <div class="outstanding-label">Outstanding Balance</div>
          <div class="outstanding-val">${Calc.formatCurrency(sym, outstanding)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-primary" id="publishBills">Publish Bills</button>
          <button class="btn btn-ghost" id="backToEntry">← New Readings</button>
        </div>
      </div>
    `;

    // Pay buttons
    content.querySelectorAll('.btn-pay').forEach(btn => {
      btn.addEventListener('click', e => this.simulatePay(e.target.dataset.unit));
    });

    document.getElementById('backToEntry').addEventListener('click', () => {
      this.activeTab = 'entry';
      this.renderDash();
    });

    // Publish bills to Firestore (nested under properties/{property}/tenants/{unit}/statement_history/{YYYY-MM})
    document.getElementById('publishBills').addEventListener('click', async () => {
      if (!window || !window.firestore) {
        return alert('Firestore not available. Ensure js/firebase.js is loaded in admin HTML.');
      }
      try {
        await this.publishResults();
        Toast.show('Bills published to Firestore.', 'success');
      } catch (err) {
        console.error(err);
        Toast.show('Failed to publish bills. See console.', 'error');
      }
    });
  },

  // ── Placeholder: Tenants view ─────────────────
  renderTenants() {
    const wrap = document.getElementById('dashWrap');
    const units = this.appData.units || [];
    const rows = units.map(u => `
      <div class="unit-card">
        <div class="unit-card-header">
          <div>
            <div class="unit-card-title">${u.unitName}</div>
            <div style="font-size:13px;color:var(--text-secondary)">${u.tenantName || '—'}</div>
          </div>
          <div class="badge ${u.hasMeter ? 'badge-blue' : 'badge-amber'}">${u.hasMeter ? 'Metered' : 'No Meter'}</div>
        </div>
        <div style="font-size:13px;color:var(--text-muted)">Meter #: ${u.meterNumber || '—'}</div>
      </div>
    `).join('');

    wrap.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Tenants & Units</h1>
        <p class="page-subtitle">${units.length} units</p>
      </div>
      <div>${rows}</div>
    `;
  },

  // ── Placeholder: Statements view ──────────────
  renderStatements() {
    const wrap = document.getElementById('dashWrap');
    wrap.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Statements</h1>
        <p class="page-subtitle">Historical billing statements</p>
      </div>
      <div class="info-box">Use the 'Publish Bills' action from 'Log Readings' to create statements per tenant.</div>
    `;
  },

  // ── Access Requests (basic Firestore listing if available) ──
  async renderRequests() {
    const wrap = document.getElementById('dashWrap');
    wrap.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Access Requests</h1>
        <p class="page-subtitle">Pending tenant access applications</p>
      </div>
      <div id="requestsList">Loading…</div>
    `;

    const listEl = document.getElementById('requestsList');
    if (!window || !window.firestore) {
      listEl.innerHTML = `<div class="info-box">Firestore not available in this environment.</div>`;
      return;
    }

    try {
      const prop = this.appData.settings.propertyName;
      const col = window.firestore.collection(`properties/${prop}/access_requests`);
      const snap = await col.get();
      if (snap.empty) return listEl.innerHTML = `<div class="info-box">No requests found.</div>`;
      const items = [];
      snap.forEach(d => items.push({ id: d.id, data: d.data() }));
      listEl.innerHTML = items.map(it => `
        <div class="wizard-step">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div><strong>${it.data.requesterUid || it.data.requesterEmail}</strong></div>
            <div><span class="badge badge-amber">${it.data.approvalStatus || 'pending'}</span></div>
          </div>
          <div style="color:var(--text-secondary);margin-bottom:8px">${it.data.message || ''}</div>
          <div style="display:flex;gap:8px"><button class="btn btn-success" data-id="${it.id}" data-unit="${it.id}">Approve</button></div>
        </div>
      `).join('');

      // wire approve buttons
      listEl.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          try {
            await this.approveAccessRequest(this.appData.settings.propertyName, id);
            Toast.show('Request approved', 'success');
            this.renderRequests();
          } catch (err) {
            console.error(err);
            Toast.show('Approve failed', 'error');
          }
        });
      });
    } catch (err) {
      console.error(err);
      listEl.innerHTML = `<div class="info-box error">Failed to load requests.</div>`;
    }
  },

  renderSettings() {
    const wrap = document.getElementById('dashWrap');
    wrap.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Pricing, currency and property configuration</p>
      </div>
      <div class="wizard-step">Settings controls go here.</div>
    `;
  },

  // Publish results to Firestore under the property's tenant statement_history
  async publishResults(){
    const propertyName = this.appData.settings.propertyName;
    if(!propertyName) throw new Error('Property name not set');
    const now = new Date();
    const statementMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

    const writes = [];
    for(const r of this.results){
      const unit = r.unitName;
      // previous/current readings from collected inputs, fallback to undefined
      const readings = this.readings[unit] || { prev: null, curr: null };
      const docPath = `properties/${propertyName}/tenants/${unit}/statement_history/${statementMonth}`;
      const data = {
        previousReading: readings.prev ?? null,
        currentReading: readings.curr ?? null,
        calculatedUsage: Number(r.usage ?? 0),
        totalBill: Number(r.bill ?? 0),
        paymentStatus: (this.payments[unit] === 'paid') ? 'paid' : 'outstanding',
        createdAt: window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : new Date()
      };
      // use compat API exposed as window.firestore
      writes.push(window.firestore.doc(docPath).set(data));
    }

    return Promise.all(writes);
  },

  // Approve a nested access request and create tenant approval receipt
  async approveAccessRequest(propertyName, unitName){
    if(!window || !window.firestore) throw new Error('Firestore not available');
    const sanitized = String(unitName).replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const reqPath = `properties/${propertyName}/access_requests/${sanitized}`;
    const reqDoc = window.firestore.doc(reqPath);
    // set status to approved and timestamp
    await reqDoc.set({ status: 'approved', approvedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    // create tenant verification doc
    const tenantPath = `properties/${propertyName}/tenants/${unitName}`;
    await window.firestore.doc(tenantPath).set({ approvalStatus: 'approved', approvedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return true;
  },

  // ══════════════════════════════════════════════
  // PAYMENT SIMULATION
  // ══════════════════════════════════════════════
  simulatePay(unitName) {
    this.payments[unitName] = 'processing';
    this.renderResults();

    setTimeout(() => {
      this.payments[unitName] = 'paid';
      this.appData.payments = { ...this.appData.payments, [unitName]: 'paid' };
      Storage.save(this.appData);
      Toast.show(`Payment successful for ${unitName}! ✓`, 'success');
      this.renderDash(); // refresh stats + table
    }, 1200);
  }
};
