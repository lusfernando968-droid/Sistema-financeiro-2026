/* ============================================================
   pages/wallets.js
   ============================================================ */
const WalletsPage = {
  COLORS: ['#1a73e8','#2e7d4f','#c0392b','#d35400','#8e44ad','#16a085','#2c3e50','#7f8c8d','#f39c12','#1abc9c'],
  _currentWalletId: null,
  _chart: null,

  render(container) {
    if (this._chart) { this._chart.destroy(); this._chart = null; }

    if (this._currentWalletId) {
      this._renderWalletDashboard(container);
    } else {
      this._renderList(container);
    }
  },

  _renderList(container) {
    const wallets = DB.getWallets();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Carteiras</div>
          <div class="page-header-sub">Gerencie suas carteiras financeiras</div>
        </div>
        <button class="btn btn-primary" id="btn-new-wallet">+ Nova Carteira</button>
      </div>

      ${wallets.length === 0
        ? `<div class="card">
             <div class="empty-state">
               <div class="empty-state-icon">◈</div>
               <div class="empty-state-text">Nenhuma carteira criada ainda</div>
               <div class="empty-state-sub">Crie sua primeira carteira para começar a controlar suas finanças</div>
             </div>
           </div>`
        : `<div class="wallets-grid">${wallets.map(w => this._card(w)).join('')}</div>`
      }
    `;

    document.getElementById('btn-new-wallet')?.addEventListener('click', () => this.openForm());
  },

  _card(w) {
    const balance = DB.getWalletBalance(w.id);
    return `
      <div class="wallet-card" onclick="WalletsPage.openDashboard('${w.id}')" style="cursor:pointer">
        <div class="wallet-card-bar" style="background:${w.color || '#888'}"></div>
        <div class="wallet-name">${Utils.escapeHtml(w.name)}</div>
        <div class="wallet-balance ${balance < 0 ? 'negative' : ''}">${Utils.formatBRL(balance)}</div>
        <div class="wallet-actions" onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-sm" onclick="WalletsPage.openTransfer('${w.id}')">Aporte</button>
          <button class="btn btn-ghost btn-sm" onclick="WalletsPage.openForm('${w.id}')">Editar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger);border-color:transparent"
                  onclick="WalletsPage.confirmDelete('${w.id}')">Excluir</button>
        </div>
      </div>
    `;
  },

  openDashboard(id) {
    this._currentWalletId = id;
    this.render(document.getElementById('content'));
  },

  backToList() {
    this._currentWalletId = null;
    this.render(document.getElementById('content'));
  },

  _renderWalletDashboard(container) {
    const w = DB.getWallets().find(x => x.id === this._currentWalletId);
    if (!w) return this.backToList();

    const balance = DB.getWalletBalance(w.id);
    const transactions = DB.getTransactions().filter(t => t.walletId === w.id || t.toWalletId === w.id);
    
    // Filtros de mês atual
    const monthKey = Utils.currentMonthKey();
    const monthTxs = transactions.filter(t => t.date?.startsWith(monthKey));
    
    // Income: income direto OU transferência recebida (t.toWalletId === w.id)
    const monthIncome = monthTxs.reduce((s, t) => {
      if (t.type === 'income') return s + t.amount;
      if (t.type === 'transfer' && t.toWalletId === w.id) return s + t.amount;
      return s;
    }, 0);

    // Expense: expense direto OU transferência enviada (t.type === 'transfer' e t.walletId === w.id)
    const monthExpense = monthTxs.reduce((s, t) => {
      if (t.type === 'expense') return s + t.amount;
      if (t.type === 'transfer' && t.walletId === w.id) return s + t.amount;
      return s;
    }, 0);

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:14px">
        <div>
          <button class="btn btn-ghost btn-sm" onclick="WalletsPage.backToList()" style="margin-bottom:8px; padding-left:0; color:var(--text-secondary)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:4px"><polyline points="15 18 9 12 15 6"/></svg> Voltar
          </button>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="color-dot" style="background:${w.color};width:16px;height:16px"></span>
            <div class="page-header-title">${Utils.escapeHtml(w.name)}</div>
          </div>
        </div>
      </div>

      <!-- Resumo da Carteira -->
      <div class="card" style="margin-bottom:14px; background:${w.color}; color:white; padding:20px; border:none; box-shadow:0 8px 24px rgba(0,0,0,0.15)">
        <div style="font-size:12px; color:rgba(255,255,255,0.8); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Saldo Atual</div>
        <div style="font-size:28px; font-weight:600; letter-spacing:-1px">${Utils.formatBRL(balance)}</div>
      </div>

      <div class="stats-grid" style="grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px">
        <div class="stat-card" style="padding:14px">
          <div class="stat-label">Entradas (Mês)</div>
          <div class="stat-value" style="font-size:16px; color:var(--success)">${Utils.formatBRL(monthIncome)}</div>
        </div>
        <div class="stat-card" style="padding:14px">
          <div class="stat-label">Saídas (Mês)</div>
          <div class="stat-value" style="font-size:16px; color:var(--danger)">${Utils.formatBRL(monthExpense)}</div>
        </div>
      </div>

      <!-- Gráfico da Carteira -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">Movimentação nos últimos 6 meses</span></div>
        <div class="chart-canvas-wrapper short" style="height:180px; padding:12px"><canvas id="chart-wallet-monthly"></canvas></div>
      </div>

      <!-- Últimas Transações -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <span class="card-title">Histórico</span>
        </div>
        <div class="table-wrapper">${this._recentTable(transactions, w)}</div>
      </div>
    `;

    this._chartWalletMonthly(transactions, w);
  },

  _recentTable(transactions, currentWallet) {
    const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
    if (recent.length === 0) return `<div class="empty-state" style="padding:24px"><div class="empty-state-text">Nenhuma movimentação</div></div>`;

    const allWallets = DB.getWallets();

    const rows = recent.map(t => {
      // Definir se nesta carteira foi entrada ou saída
      let sign, typeClass, displayType;
      
      if (t.type === 'income') {
        sign = '+'; typeClass = 'amount-income'; displayType = 'Receita';
      } else if (t.type === 'expense') {
        sign = '−'; typeClass = 'amount-expense'; displayType = 'Despesa';
      } else {
        // Transfer
        if (t.toWalletId === currentWallet.id) {
          sign = '+'; typeClass = 'amount-income'; displayType = 'Aporte recebido';
        } else {
          sign = '−'; typeClass = 'amount-expense'; displayType = 'Aporte enviado';
        }
      }

      return `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid var(--border-subtle)">
        <div style="display:flex; align-items:center; gap:10px; overflow:hidden">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-tertiary)">
            ${sign === '+' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' 
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>'}
          </div>
          <div style="min-width:0">
            <div style="font-weight:500; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${Utils.escapeHtml(t.description || displayType)}</div>
            <div style="font-size:11px; color:var(--text-tertiary)">${Utils.formatDate(t.date)}</div>
          </div>
        </div>
        <div class="${typeClass}" style="font-weight:600; font-size:13.5px; flex-shrink:0; margin-left:8px">${sign} ${Utils.formatBRL(t.amount)}</div>
      </div>`;
    }).join('');

    return `<div>${rows}</div>`;
  },

  _chartWalletMonthly(transactions, currentWallet) {
    const ctx = document.getElementById('chart-wallet-monthly');
    if (!ctx || typeof Chart === 'undefined') return;
    const months = Utils.getLast6Months();
    
    const incomeData = months.map(m => transactions.reduce((s, t) => {
      if (!t.date?.startsWith(m.key)) return s;
      if (t.type === 'income') return s + t.amount;
      if (t.type === 'transfer' && t.toWalletId === currentWallet.id) return s + t.amount;
      return s;
    }, 0));

    const expenseData = months.map(m => transactions.reduce((s, t) => {
      if (!t.date?.startsWith(m.key)) return s;
      if (t.type === 'expense') return s + t.amount;
      if (t.type === 'transfer' && t.walletId === currentWallet.id) return s + t.amount;
      return s;
    }, 0));
    
    this._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label.substring(0,3)),
        datasets: [
          { label: 'Entradas', data: incomeData, backgroundColor: '#2e7d4f', borderRadius: 4, barThickness: 'flex', maxBarThickness: 12 },
          { label: 'Saídas', data: expenseData, backgroundColor: '#c0392b', borderRadius: 4, barThickness: 'flex', maxBarThickness: 12 }
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${Utils.formatBRL(c.parsed.y)}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 }, color: '#999' } },
          y: { display: false, grid: { display: false } },
        },
      },
    });
  },

  /* ---------- CRUD Modal ---------- */
  openForm(id) {
    const w = id ? DB.getAllWallets().find(x => x.id === id) : null;
    const selectedColor = w?.color || this.COLORS[0];

    App.openModal(w ? 'Editar Carteira' : 'Nova Carteira', `
      <form id="wallet-form">
        <div class="form-group">
          <label class="form-label">Nome da carteira *</label>
          <input type="text" class="form-control" id="w-name"
            value="${Utils.escapeHtml(w?.name || '')}"
            placeholder="Ex: Pessoal, Estúdio, Investimento..."
            maxlength="40" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Cor de identificação</label>
          <div class="color-swatches" id="color-swatches">
            ${this.COLORS.map(c => `
              <div class="color-swatch ${c === selectedColor ? 'selected' : ''}"
                   style="background:${c};${c === selectedColor ? 'border-color:#111;transform:scale(1.15)' : 'border-color:transparent'}"
                   data-color="${c}"
                   onclick="WalletsPage._selectColor(this, '${c}')">
              </div>
            `).join('')}
          </div>
          <input type="hidden" id="w-color" value="${selectedColor}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">${w ? 'Salvar alterações' : 'Criar carteira'}</button>
        </div>
      </form>
    `);

    document.getElementById('wallet-form').addEventListener('submit', e => {
      e.preventDefault();
      const name  = document.getElementById('w-name').value.trim();
      const color = document.getElementById('w-color').value;
      if (!name) return;
      try {
        if (w) {
          DB.updateWallet(w.id, { name, color });
          App.toast('Carteira atualizada!', 'success');
        } else {
          DB.addWallet({ name, color });
          App.toast('Carteira criada!', 'success');
        }
        App.closeModal();
        this.render(document.getElementById('content'));
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  },

  _selectColor(el, color) {
    document.querySelectorAll('.color-swatch').forEach(s => {
      s.style.borderColor = 'transparent';
      s.style.transform   = '';
      s.classList.remove('selected');
    });
    el.style.borderColor = '#111';
    el.style.transform   = 'scale(1.15)';
    el.classList.add('selected');
    document.getElementById('w-color').value = color;
  },

  openTransfer(fromId) {
    const all = DB.getWallets();
    const from = all.find(w => w.id === fromId);
    const targets = all.filter(w => w.id !== fromId);

    if (targets.length === 0) {
      App.toast('Você precisa de pelo menos 2 carteiras para fazer um aporte.', 'error');
      return;
    }

    const fromBalance = DB.getWalletBalance(fromId);

    App.openModal(`Aporte — ${Utils.escapeHtml(from?.name || '')}`, `
      <p style="font-size:12.5px;color:var(--text-tertiary);margin-bottom:14px">
        Saldo disponível: <strong style="color:var(--text)">${Utils.formatBRL(fromBalance)}</strong>
      </p>
      <form id="transfer-form">
        <div class="form-group">
          <label class="form-label">Carteira destino *</label>
          <select class="form-control" id="t-to" required>
            <option value="">Selecione...</option>
            ${targets.map(w => `<option value="${w.id}">${Utils.escapeHtml(w.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Valor (R$) *</label>
            <input type="number" class="form-control" id="t-amount" min="0.01" step="0.01" placeholder="0,00" required>
          </div>
          <div class="form-group">
            <label class="form-label">Data</label>
            <input type="date" class="form-control" id="t-date" value="${Utils.today()}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input type="text" class="form-control" id="t-desc" placeholder="Opcional" maxlength="100">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Transferir</button>
        </div>
      </form>
    `);

    document.getElementById('transfer-form').addEventListener('submit', e => {
      e.preventDefault();
      const toId       = document.getElementById('t-to').value;
      const amount     = parseFloat(document.getElementById('t-amount').value);
      const date       = document.getElementById('t-date').value || Utils.today();
      const description = document.getElementById('t-desc').value.trim();
      if (!toId || !amount || amount <= 0) return;
      DB.addTransaction({ type: 'transfer', walletId: fromId, toWalletId: toId, amount, date, description });
      App.toast('Aporte realizado!', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  confirmDelete(id) {
    const w = DB.getWallets().find(x => x.id === id);
    App.confirm(
      `Excluir "${Utils.escapeHtml(w?.name || '')}"?`,
      'Esta ação é permanente. Carteiras com transações não podem ser excluídas.',
      () => {
        try {
          DB.deleteWallet(id);
          App.toast('Carteira excluída.', 'success');
          this.render(document.getElementById('content'));
        } catch (err) {
          App.toast(err.message, 'error');
        }
      }
    );
  },
};
