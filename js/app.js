/* ============================================================
   app.js — Inicialização, roteador, modal e toast
   ============================================================ */
const App = {

  async init() {
    const loader = document.getElementById('app-loading');
    
    // Configura eventos base IMEDIATAMENTE para a UI não ficar morta
    this._updateDate();
    this._setupModal();
    this._setupConfirm();
    this._setupFAB();

    window.addEventListener('hashchange', () => this._route());

    // Força re-render ao clicar num item de nav
    document.querySelectorAll('.nav-item, .bnav-item:not(#fab-menu-toggle)').forEach(el => {
      el.addEventListener('click', () => {
        setTimeout(() => this._route(), 0);
      });
    });

    // Rota inicial (renderiza a UI vazia imediatamente enquanto o DB carrega)
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#/dashboard';
    } else {
      this._route();
    }

    // Fail-safe timeout aumentado para conexões móveis lentas
    const failsafe = setTimeout(() => {
      if (loader) loader.style.display = 'none';
      console.warn('Loader hidden by fail-safe timeout');
    }, 15000);

    try {
      await DB.init(() => {
        // Callback acionado quando a sincronização em background finalizar
        this._route();
      });
      // Renderiza instantaneamente com os dados do Cache Local (Offline-first)
      this._route();
    } catch (e) {
      console.error(e);
    } finally {
      clearTimeout(failsafe);
      if (loader) loader.style.display = 'none';
    }
  },

  /* ---------- Roteador ---------- */
  _route() {
    const raw  = window.location.hash.replace(/^#\/?/, '') || 'dashboard';
    const page = raw.split('?')[0] || 'dashboard';

    // Atualiza sidebar nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Atualiza bottom nav (mobile)
    document.querySelectorAll('.bnav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Atualiza título
    const titles = {
      dashboard:    'Dashboard',
      wallets:      'Carteiras',
      credit:       'Crédito',
      debts:        'Dívidas',
      transactions: 'Transações',
      billing:      'Faturamento',
      architecture: 'Arquitetura',
      investments:  'Investimentos',
      categories:   'Categorias',
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[page] || page;

    // Renderiza página
    const content = document.getElementById('content');
    if (!content) return;

    // Fecha menu FAB se estiver aberto ao navegar
    const fabOverlay = document.getElementById('fab-overlay');
    if (fabOverlay) fabOverlay.style.display = 'none';

    // Limpa o conteúdo antes de renderizar para garantir que não fique conteúdo antigo
    // em caso de erro no render da nova página
    try {
      switch (page) {
        case 'dashboard':    DashboardPage.render(content);         break;
        case 'wallets':      WalletsPage.render(content);           break;
        case 'credit':       CreditPage.render(content);            break;
        case 'debts':        DebtsPage.render(content);             break;
        case 'transactions': TransactionsPage.render(content, true); break;
        case 'billing':      BillingPage.render(content);           break;
        case 'architecture': ArchitecturePage.render(content);      break;
        case 'investments':  InvestmentsPage.render(content);       break;
        case 'categories':   CategoriesPage.render(content);        break;
        default:             DashboardPage.render(content);
      }
    } catch (err) {
      console.error('[Router] Erro ao renderizar página "' + page + '":', err);
      content.innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--text-tertiary)">
          <div style="font-size:32px;margin-bottom:12px">⚠️</div>
          <div style="font-weight:500;margin-bottom:8px">Erro ao carregar esta página</div>
          <div style="font-size:13px">${err.message || 'Tente navegar para outra página e voltar.'}</div>
        </div>`;
    }
  },

  /* ---------- FAB Menu (Mobile) ---------- */
  _setupFAB() {
    const toggle = document.getElementById('fab-menu-toggle');
    const overlay = document.getElementById('fab-overlay');
    
    toggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.style.display = 'flex';
      setTimeout(() => overlay.classList.add('show'), 10);
    });

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.style.display = 'none', 200);
      }
    });

    // Clica em um item do menu
    document.querySelectorAll('.fab-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.style.display = 'none', 200);
      });
    });
  },

  /* ---------- Data ---------- */
  _updateDate() {
    const el = document.getElementById('current-date');
    if (el) {
      el.textContent = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    }
  },

  /* ---------- Modal ---------- */
  _setupModal() {
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });
  },

  openModal(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML    = bodyHTML;
    document.getElementById('modal-overlay').style.display = 'flex';
    // Foca o primeiro input
    setTimeout(() => {
      const first = document.querySelector('#modal-body input, #modal-body select, #modal-body textarea');
      first?.focus();
    }, 50);
  },

  closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('modal-body').innerHTML = '';
  },

  /* ---------- Confirm dialog ---------- */
  _setupConfirm() {
    document.getElementById('confirm-cancel')?.addEventListener('click', () => {
      document.getElementById('confirm-overlay').style.display = 'none';
    });
    document.getElementById('confirm-overlay')?.addEventListener('click', e => {
      if (e.target === document.getElementById('confirm-overlay')) {
        document.getElementById('confirm-overlay').style.display = 'none';
      }
    });
  },

  confirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent   = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-overlay').style.display = 'flex';

    // Remove listener anterior
    const btn    = document.getElementById('confirm-ok');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
      document.getElementById('confirm-overlay').style.display = 'none';
      onConfirm();
    });
  },

  /* ---------- Toast ---------- */
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 320);
    }, 3500);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
