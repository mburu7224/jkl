/* ════════════════════════════════════════════
   app.js — Entry point & Toast utility
   ════════════════════════════════════════════ */

// ── Toast Notifications ──────────────────────
const Toast = {
  _timer: null,
  show(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast${type ? ' toast-' + type : ''} show`;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      el.classList.remove('show');
    }, 3200);
  }
};

// ── App Controller ───────────────────────────
const App = {
  init() {
    const data = Storage.load();
    const appEl = document.getElementById('app');

    if (!data || !data.isSetupComplete) {
      // Show setup wizard
      document.getElementById('topbarRight').innerHTML = '';
      Wizard.render(appEl, (completedData) => {
        App.showDashboard(completedData);
      });
    } else {
      App.showDashboard(data);
    }
  },

  showDashboard(data) {
    const appEl = document.getElementById('app');

    // Inject the app layout: sidebar + main workspace
    appEl.innerHTML = `
      <div class="app-layout">
        <aside id="sidebar-navigation" aria-label="Main navigation">
          <div class="sidebar-brand">
            <div class="logo-drop">💧</div>
            <div style="font-family:var(--font-display);font-weight:800;color:var(--accent-light)">AquaBill Admin</div>
            <button class="hamburger" id="sidebarClose" aria-label="Close menu">✕</button>
          </div>
          <nav class="sidebar-nav">
            <div class="sidebar-item active" data-cat="dashboard"><span class="label">📊 Dashboard</span></div>
            <div class="sidebar-item" data-cat="tenants"><span class="label">👥 Tenants</span></div>
            <div class="sidebar-item" data-cat="readings"><span class="label">📥 Log Readings</span></div>
            <div class="sidebar-item" data-cat="statements"><span class="label">📜 Statements</span></div>
            <div class="sidebar-item" data-cat="requests"><span class="label">🔔 Access Requests <span id="reqBadge" style="margin-left:8px;color:var(--accent)"></span></span></div>
            <div class="sidebar-item" data-cat="settings"><span class="label">⚙️ Settings</span></div>
          </nav>
          <div class="sidebar-footer">👤 Landlord — <strong>${data.settings.propertyName}</strong></div>
        </aside>
        <section id="main-workspace"></section>
      </div>
    `;

    // Mobile hamburger toggle wiring
    const topbar = document.querySelector('.topbar');
    const ham = document.createElement('button');
    ham.className = 'hamburger';
    ham.id = 'hamburgerToggle';
    ham.setAttribute('aria-label','Open menu');
    ham.textContent = '☰';
    topbar.querySelector('.topbar-logo').prepend(ham);

    const sidebar = document.getElementById('sidebar-navigation');
    document.getElementById('hamburgerToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
    document.getElementById('sidebarClose').addEventListener('click', () => sidebar.classList.remove('open'));

    // Sidebar navigation wiring
    const main = document.getElementById('main-workspace');
    const items = Array.from(document.querySelectorAll('#sidebar-navigation .sidebar-item'));
    items.forEach(it => it.addEventListener('click', (e) => {
      items.forEach(x => x.classList.remove('active'));
      it.classList.add('active');
      const cat = it.dataset.cat;
      Dashboard.render(main, data, cat);
      // close on mobile
      sidebar.classList.remove('open');
    }));

    // Initial mount
    Dashboard.render(document.getElementById('main-workspace'), data, 'dashboard');
  }
};

// ── Boot ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
