/* ============================================================
   app.js — Inicialização, roteador, modal e toast
   ============================================================ */
const App = {
  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  },

  async init() {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

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
        this.checkDebtDueAlerts(false);
      });
      // Renderiza instantaneamente com os dados do Cache Local (Offline-first)
      this._route();
      this.checkDebtDueAlerts(false);
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
      forecast:     'Previsão de Custo',
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[page] || page;

    // Mostra o botão de relatório global apenas no dashboard
    const reportBtn = document.getElementById('global-btn-report');
    if (reportBtn) {
      reportBtn.style.display = (page === 'dashboard') ? 'inline-flex' : 'none';
    }

    // Renderiza página
    const content = document.getElementById('content');
    if (!content) return;

    // Fecha menu FAB se estiver aberto ao navegar
    const fabOverlay = document.getElementById('fab-overlay');
    if (fabOverlay) fabOverlay.style.display = 'none';
    document.body.classList.remove('sidebar-mobile-open');

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
        case 'forecast':     ForecastPage.render(content);          break;
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

  /* ---------- Alerta / Balãozinho de Vencimento de Dívidas ---------- */
  _debtPopupDismissed: false,
  _debtPopupIndex: 0,

  getDebtDueInfo(debt) {
    if (!debt || debt.status === 'paid' || (Number(debt.remainingAmount) || 0) < 0.10) {
      return null;
    }
    const isReceivable = Boolean(debt.type && debt.type.startsWith('receivable_'));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const txs = (typeof DB !== 'undefined' && DB.getTransactions) ? DB.getTransactions() : [];
    const paidThisMonth = txs.some(t =>
      t.date &&
      t.date.startsWith(currentMonthKey) &&
      (t.debtId === debt.id || (t.description && t.description === `Parcela: ${debt.name}`))
    );

    const dueDay = Number(debt.dueDay) || 0;
    if (dueDay < 1 || dueDay > 31) {
      return {
        debt,
        isReceivable,
        paidThisMonth,
        dueDay: null,
        daysDiff: null,
        status: 'no_due_day',
        isUrgent: !paidThisMonth,
        badgeText: 'Sem dia de vencimento',
        headline: 'Seu vencimento está próximo?',
        message: `${debt.name} (${Utils.formatBRL(debt.monthlyPayment)}/mês) está ativa. Defina o dia de vencimento para receber o aviso exato.`
      };
    }

    const maxDaysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dueThisMonth = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, maxDaysThisMonth));
    const diffThisMonth = Math.round((dueThisMonth - today) / 86400000);

    const maxDaysNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    const dueNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(dueDay, maxDaysNextMonth));
    const diffNextMonth = Math.round((dueNextMonth - today) / 86400000);

    if (!paidThisMonth) {
      if (diffThisMonth === 0) {
        return {
          debt,
          isReceivable,
          paidThisMonth,
          dueDay,
          daysDiff: 0,
          status: 'today',
          isUrgent: true,
          badgeText: `Vence hoje (Dia ${dueDay})`,
          headline: 'Seu vencimento é hoje!',
          message: `A parcela de "${debt.name}" (${Utils.formatBRL(debt.monthlyPayment)}) vence hoje, dia ${dueDay}.`
        };
      }
      if (diffThisMonth > 0 && diffThisMonth <= 7) {
        return {
          debt,
          isReceivable,
          paidThisMonth,
          dueDay,
          daysDiff: diffThisMonth,
          status: 'upcoming',
          isUrgent: true,
          badgeText: `Vence em ${diffThisMonth} ${diffThisMonth === 1 ? 'dia' : 'dias'} (Dia ${dueDay})`,
          headline: 'Seu vencimento está próximo!',
          message: `A parcela de "${debt.name}" (${Utils.formatBRL(debt.monthlyPayment)}) vence em ${diffThisMonth} ${diffThisMonth === 1 ? 'dia' : 'dias'} (dia ${dueDay}).`
        };
      }
      if (diffThisMonth < 0) {
        const daysAgo = Math.abs(diffThisMonth);
        return {
          debt,
          isReceivable,
          paidThisMonth,
          dueDay,
          daysDiff: diffThisMonth,
          status: 'overdue',
          isUrgent: true,
          badgeText: `Venceu dia ${dueDay} (pendente no mês)`,
          headline: 'Seu vencimento está próximo / pendente!',
          message: `A parcela deste mês de "${debt.name}" (${Utils.formatBRL(debt.monthlyPayment)}) tinha vencimento no dia ${dueDay} (${daysAgo} ${daysAgo === 1 ? 'dia' : 'dias'} atrás).`
        };
      }
    }

    const effectiveDiff = (!paidThisMonth && diffThisMonth > 0) ? diffThisMonth : diffNextMonth;
    const isNearNext = effectiveDiff <= 7;

    return {
      debt,
      isReceivable,
      paidThisMonth,
      dueDay,
      daysDiff: effectiveDiff,
      status: isNearNext ? 'upcoming' : 'scheduled',
      isUrgent: isNearNext,
      badgeText: `Vence dia ${dueDay} (em ${effectiveDiff} ${effectiveDiff === 1 ? 'dia' : 'dias'})`,
      headline: isNearNext ? 'Seu vencimento está próximo!' : 'Próximo vencimento',
      message: `A parcela de "${debt.name}" (${Utils.formatBRL(debt.monthlyPayment)}) vence em ${effectiveDiff} ${effectiveDiff === 1 ? 'dia' : 'dias'} (dia ${dueDay}).`
    };
  },

  getDebtDueAlerts() {
    if (typeof DB === 'undefined' || !DB.getDebts) return [];
    const activeDebts = DB.getDebts().filter(d =>
      d.status !== 'paid' &&
      (Number(d.remainingAmount) || 0) >= 0.10 &&
      (!d.type || !d.type.startsWith('receivable_'))
    );

    const infos = activeDebts.map(d => this.getDebtDueInfo(d)).filter(Boolean);
    const priorityOrder = { today: 1, upcoming: 2, overdue: 3, scheduled: 4, no_due_day: 5 };

    infos.sort((a, b) => {
      const pa = priorityOrder[a.status] || 99;
      const pb = priorityOrder[b.status] || 99;
      if (pa !== pb) return pa - pb;
      return (a.daysDiff ?? 999) - (b.daysDiff ?? 999);
    });

    return infos;
  },

  checkDebtDueAlerts(forceShow = false) {
    const allAlerts = this.getDebtDueAlerts();
    const urgentWithDue = allAlerts.filter(a => a.status === 'today' || a.status === 'upcoming' || a.status === 'overdue');
    const badgeAlerts = urgentWithDue.length > 0 ? urgentWithDue : allAlerts.filter(a => a.isUrgent);

    const badgeEl = document.getElementById('debt-alert-badge');
    if (badgeEl) {
      if (badgeAlerts.length > 0) {
        badgeEl.textContent = String(badgeAlerts.length);
        badgeEl.style.display = 'inline-flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    if (forceShow || (!this._debtPopupDismissed && badgeAlerts.length > 0)) {
      this.showDebtDuePopup(forceShow);
    }
  },

  _whiteClockSvg(size = 18) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
  },

  showDebtDuePopup(forceShow = false) {
    const popupEl = document.getElementById('debt-due-popup');
    if (!popupEl) return;

    const allAlerts = this.getDebtDueAlerts();
    const urgentWithDue = allAlerts.filter(a => a.status === 'today' || a.status === 'upcoming' || a.status === 'overdue');
    const list = urgentWithDue.length > 0 ? urgentWithDue : allAlerts;

    if (list.length === 0) {
      if (!forceShow) {
        this.closeDebtDuePopup(false);
        return;
      }
      popupEl.innerHTML = `
        <div class="debt-due-popup-header">
          <div class="debt-due-popup-icon" style="color:#ffffff">${this._whiteClockSvg(18)}</div>
          <div class="debt-due-popup-body">
            <div class="debt-due-popup-title">Nenhum vencimento pendente</div>
            <div class="debt-due-popup-text">Você não possui dívidas ativas próximas do vencimento no momento.</div>
          </div>
          <button type="button" class="debt-due-popup-close" onclick="App.closeDebtDuePopup(true)" title="Fechar">✕</button>
        </div>
      `;
      popupEl.style.display = 'block';
      requestAnimationFrame(() => requestAnimationFrame(() => popupEl.classList.add('show')));
      return;
    }

    if (this._debtPopupIndex >= list.length || this._debtPopupIndex < 0) {
      this._debtPopupIndex = 0;
    }

    const current = list[this._debtPopupIndex];
    const hasMultiple = list.length > 1;
    const hasDueDay = current.dueDay !== null;

    popupEl.innerHTML = `
      <div class="debt-due-popup-header">
        <div class="debt-due-popup-icon" style="color:#ffffff">${this._whiteClockSvg(18)}</div>
        <div class="debt-due-popup-body">
          <div class="debt-due-popup-title">
            <span>${Utils.escapeHtml(current.headline)}</span>
            ${hasMultiple ? `<span style="font-size:10.5px; font-weight:600; background:rgba(255,255,255,0.16); padding:1px 7px; border-radius:999px;">${this._debtPopupIndex + 1}/${list.length}</span>` : ''}
          </div>
          <div class="debt-due-popup-text">${Utils.escapeHtml(current.message)}</div>
        </div>
        <button type="button" class="debt-due-popup-close" onclick="App.closeDebtDuePopup(true)" title="Fechar aviso">✕</button>
      </div>
      <div class="debt-due-popup-actions">
        ${hasMultiple ? `
          <button type="button" class="debt-due-btn-secondary" onclick="App.nextDebtDuePopup()" style="margin-right:auto">
            Próxima (${this._debtPopupIndex + 1}/${list.length}) →
          </button>
        ` : ''}
        <button type="button" class="debt-due-btn-secondary" onclick="App.openNotificationsModal()">
          Ver Todas (${list.length})
        </button>
        <button type="button" class="debt-due-btn-primary" onclick="App.handleDebtPopupAction('${current.debt.id}', ${hasDueDay})">
          ${hasDueDay ? 'Dar Baixa' : 'Definir Vencimento'}
        </button>
      </div>
    `;

    popupEl.style.display = 'block';
    requestAnimationFrame(() => requestAnimationFrame(() => popupEl.classList.add('show')));
  },

  openNotificationsModal() {
    this.closeDebtDuePopup(true);
    const allAlerts = this.getDebtDueAlerts();
    const urgentList = allAlerts.filter(a => a.status === 'today' || a.status === 'upcoming' || a.status === 'overdue');
    const otherList = allAlerts.filter(a => a.status !== 'today' && a.status !== 'upcoming' && a.status !== 'overdue');

    const totalPendingMonthly = urgentList.reduce((sum, a) => sum + (Number(a.debt.monthlyPayment) || 0), 0);
    const banks = (typeof DB !== 'undefined' && DB.getBanks) ? DB.getBanks() : [];

    const renderAlertItem = (item, isUrgentItem) => {
      const bank = banks.find(b => b.id === item.debt.bankId);
      const hasDueDay = item.dueDay !== null;
      return `
        <div style="background:var(--bg); border:1px solid var(--border-subtle); border-radius:18px; padding:14px 16px; display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
            <div style="display:flex; align-items:flex-start; gap:10px; min-width:0;">
              <div style="width:36px; height:36px; border-radius:12px; background:var(--surface); color:var(--text); border:1px solid var(--border-subtle); box-shadow:0 2px 6px rgba(0,0,0,0.03); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${this._whiteClockSvg(16)}
              </div>
              <div style="min-width:0;">
                <div style="font-size:13.5px; font-weight:600; color:var(--text); line-height:1.3;">${Utils.escapeHtml(item.debt.name)}</div>
                <div style="font-size:11.5px; color:var(--text-tertiary); margin-top:2px;">
                  ${bank ? Utils.escapeHtml(bank.name) + ' · ' : ''}Restante: ${Utils.formatBRL(item.debt.remainingAmount)}
                </div>
              </div>
            </div>
            <div style="text-align:right; flex-shrink:0;">
              <div style="font-size:14px; font-weight:700; color:var(--text);">${Utils.formatBRL(item.debt.monthlyPayment)}</div>
              <div style="font-size:10.5px; color:var(--text-tertiary);">Parcela mensal</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:10px; border-top:1px solid var(--border-subtle); flex-wrap:wrap;">
            <span style="display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:500; padding:4px 10px; border-radius:999px; background:var(--surface); color:var(--text-secondary); border:1px solid var(--border);">
              <span style="width:6px; height:6px; border-radius:50%; background:${isUrgentItem ? 'var(--text)' : 'var(--text-tertiary)'}; flex-shrink:0;"></span>
              ${Utils.escapeHtml(item.badgeText)}
            </span>
            <div style="display:flex; align-items:center; gap:6px; margin-left:auto;">
              <button type="button" class="btn btn-ghost btn-sm" style="font-size:11.5px; padding:5px 12px; border-radius:999px;" onclick="App.closeModal(); App.handleDebtPopupAction('${item.debt.id}', false)">
                Editar
              </button>
              <button type="button" class="btn btn-primary btn-sm" style="background:var(--text); color:var(--surface); border:none; font-size:11.5px; font-weight:600; padding:5px 14px; border-radius:12px;" onclick="App.closeModal(); App.handleDebtPopupAction('${item.debt.id}', ${hasDueDay})">
                ${hasDueDay ? 'Dar Baixa' : 'Definir Dia'}
              </button>
            </div>
          </div>
        </div>
      `;
    };

    const bodyHTML = allAlerts.length === 0 ? `
      <div style="text-align:center; padding:28px 16px; color:var(--text-tertiary);">
        <div style="width:44px; height:44px; border-radius:50%; background:var(--bg); color:var(--text); display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
          ${this._whiteClockSvg(22)}
        </div>
        <div style="font-size:14px; font-weight:600; color:var(--text); margin-bottom:4px;">Tudo em dia!</div>
        <div style="font-size:12.5px;">Você não possui dívidas ativas ou vencimentos pendentes no momento.</div>
      </div>
    ` : `
      <div style="display:flex; flex-direction:column; gap:14px; max-height:68vh; overflow-y:auto; padding-right:2px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#1f2024; color:#ffffff; padding:16px; border-radius:18px;">
          <div>
            <div style="font-size:10.5px; font-weight:500; color:rgba(255,255,255,0.65); text-transform:uppercase; letter-spacing:0.4px;">Alertas no Mês</div>
            <div style="font-size:17px; font-weight:700; color:#ffffff; margin-top:3px;">${urgentList.length} ${urgentList.length === 1 ? 'vencimento' : 'vencimentos'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10.5px; font-weight:500; color:rgba(255,255,255,0.65); text-transform:uppercase; letter-spacing:0.4px;">Total das Parcelas</div>
            <div style="font-size:17px; font-weight:700; color:#ffffff; margin-top:3px;">${Utils.formatBRL(totalPendingMonthly)}</div>
          </div>
        </div>

        ${urgentList.length > 0 ? `
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:8px;">
              Vencimentos Próximos ou Pendentes (${urgentList.length})
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${urgentList.map(item => renderAlertItem(item, true)).join('')}
            </div>
          </div>
        ` : ''}

        ${otherList.length > 0 ? `
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:8px;">
              Outros Vencimentos Ativos (${otherList.length})
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${otherList.map(item => renderAlertItem(item, false)).join('')}
            </div>
          </div>
        ` : ''}

        <div class="form-actions" style="margin-top:4px; padding-top:10px; border-top:1px solid var(--border-subtle);">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Fechar</button>
          <button type="button" class="btn btn-primary" style="background:var(--text); color:var(--surface); border:none;" onclick="App.closeModal(); window.location.hash='#/debts';">
            Ir para Dívidas
          </button>
        </div>
      </div>
    `;

    this.openModal('Notificações de Vencimento', bodyHTML);
  },

  nextDebtDuePopup() {
    this._debtPopupIndex += 1;
    this.showDebtDuePopup(true);
  },

  handleDebtPopupAction(debtId, hasDueDay) {
    this.closeDebtDuePopup(true);
    window.location.hash = '#/debts';
    setTimeout(() => {
      if (typeof DebtsPage !== 'undefined') {
        if (hasDueDay) {
          DebtsPage.openPaymentModal(debtId);
        } else {
          DebtsPage.openDebtForm(debtId);
        }
      }
    }, 120);
  },

  closeDebtDuePopup(markDismissed = true) {
    if (markDismissed) this._debtPopupDismissed = true;
    const popupEl = document.getElementById('debt-due-popup');
    if (!popupEl) return;
    popupEl.classList.remove('show');
    setTimeout(() => {
      if (!popupEl.classList.contains('show')) {
        popupEl.style.display = 'none';
      }
    }, 260);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
