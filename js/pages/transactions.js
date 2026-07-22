/* ============================================================
   pages/transactions.js
   ============================================================ */
const TransactionsPage = {
  _page: 1,
  _perPage: 15,
  _filters: { walletId: '', type: '', categoryId: '', month: '' },

  render(container, resetFilters) {
    if (resetFilters) this._filters = { walletId: '', type: '', categoryId: '', month: '' };
    this._page = 1;

    const wallets    = DB.getWallets();
    const categories = DB.getCategories();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Transações</div>
          <div class="page-header-sub">Histórico de todas as movimentações</div>
        </div>
        <button class="btn btn-primary" id="btn-new-tx">+ Nova Transação</button>
      </div>

      <div class="filter-bar">
        <select class="form-control" id="f-wallet" title="Carteira">
          <option value="">Todas as carteiras</option>
          ${wallets.map(w => `<option value="${w.id}" ${this._filters.walletId === w.id ? 'selected' : ''}>${Utils.escapeHtml(w.name)}</option>`).join('')}
        </select>
        <select class="form-control" id="f-type" title="Tipo">
          <option value="">Todos os tipos</option>
          <option value="income"   ${this._filters.type === 'income'   ? 'selected' : ''}>Entrada</option>
          <option value="expense"  ${this._filters.type === 'expense'  ? 'selected' : ''}>Saída</option>
          <option value="transfer" ${this._filters.type === 'transfer' ? 'selected' : ''}>Transferência</option>
        </select>
        <select class="form-control" id="f-category" title="Categoria">
          <option value="">Todas as categorias</option>
          ${categories.map(c => `<option value="${c.id}" ${this._filters.categoryId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>`).join('')}
        </select>
        <input type="month" class="form-control" id="f-month" value="${this._filters.month}" title="Filtrar por mês" style="max-width:160px">
        <button class="btn btn-ghost btn-sm" id="btn-clear-f">Limpar filtros</button>
      </div>

      <div class="card">
        <div id="tx-area"></div>
        <div id="tx-pag"></div>
      </div>

      <!-- Histórico de Atividades -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <span class="card-title">📋 Registro de Atividades</span>
          <span style="font-size:11px;color:var(--text-tertiary)">Últimas 200 ações (adições e exclusões)</span>
        </div>
        <div id="activity-log-area"></div>
      </div>
    `;

    this._bindFilters();
    this._renderTable();
    this._renderActivityLog();

    document.getElementById('btn-new-tx')?.addEventListener('click', () => this.openForm());
  },

  _renderActivityLog() {
    const area = document.getElementById('activity-log-area');
    if (!area) return;
    const logs = DB.getActivityLog();
    if (logs.length === 0) {
      area.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-state-text">Nenhuma atividade registrada ainda</div></div>`;
      return;
    }
    const iconMap = {
      add_transaction: { icon: '↑', color: 'var(--success)', label: 'Adicionado' },
      delete_transaction: { icon: '✕', color: 'var(--danger)', label: 'Excluído' },
      add_billing: { icon: '◈', color: 'var(--primary)', label: 'Faturamento' },
      delete_billing: { icon: '✕', color: 'var(--danger)', label: 'Fat. excluído' },
      box_transaction: { icon: '📦', color: '#8e44ad', label: 'Caixinha' },
    };
    area.innerHTML = logs.map(entry => {
      const meta = iconMap[entry.action] || { icon: '•', color: 'var(--text-tertiary)', label: entry.action };
      const dateStr = entry.createdAt
        ? new Date(entry.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';
      const amtStr = entry.amount ? Utils.formatBRL(Number(entry.amount)) : '';
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border-subtle)">
          <div style="width:28px;height:28px;border-radius:50%;background:${meta.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:700;color:${meta.color}">${meta.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escapeHtml(entry.description || entry.action)}</div>
            <div style="font-size:11px;color:var(--text-tertiary)">${dateStr}</div>
          </div>
          ${amtStr ? `<div style="font-size:13px;font-weight:600;color:${meta.color};flex-shrink:0">${amtStr}</div>` : ''}
        </div>`;
    }).join('');
  },

  _bindFilters() {
    const map = { 'f-wallet': 'walletId', 'f-type': 'type', 'f-category': 'categoryId', 'f-month': 'month' };
    Object.entries(map).forEach(([elId, key]) => {
      document.getElementById(elId)?.addEventListener('change', e => {
        this._filters[key] = e.target.value;
        this._page = 1;
        this._renderTable();
      });
    });
    document.getElementById('btn-clear-f')?.addEventListener('click', () => {
      this._filters = { walletId: '', type: '', categoryId: '', month: '' };
      ['f-wallet','f-type','f-category','f-month'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      this._page = 1;
      this._renderTable();
    });
  },

  _getFiltered() {
    let txs = DB.getTransactions();
    const { walletId, type, categoryId, month } = this._filters;
    if (walletId)    txs = txs.filter(t => t.walletId === walletId || t.toWalletId === walletId);
    if (type)        txs = txs.filter(t => t.type === type);
    if (categoryId)  txs = txs.filter(t => t.categoryId === categoryId);
    if (month)       txs = txs.filter(t => t.date?.startsWith(month));
    return txs.sort((a, b) => (b.date||'').localeCompare(a.date||'') || (b.createdAt||'').localeCompare(a.createdAt||''));
  },

  _renderTable() {
    const wallets    = DB.getAllWallets();
    const categories = DB.getCategories();
    const all        = this._getFiltered();
    const total      = all.length;
    const pages      = Math.max(1, Math.ceil(total / this._perPage));
    const txs        = all.slice((this._page - 1) * this._perPage, this._page * this._perPage);

    const area = document.getElementById('tx-area');
    const pag  = document.getElementById('tx-pag');
    if (!area) return;

    if (txs.length === 0) {
      area.innerHTML = `<div class="empty-state"><div class="empty-state-text">Nenhuma transação encontrada</div><div class="empty-state-sub">Tente ajustar os filtros</div></div>`;
      if (pag) pag.innerHTML = '';
      return;
    }

    const rows = txs.map(t => {
      const w   = wallets.find(x => x.id === t.walletId);
      const tw  = wallets.find(x => x.id === t.toWalletId);
      const cat = categories.find(x => x.id === t.categoryId);
      const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '⇄';
      const cls  = `amount-${t.type}`;
      const wDisplay = t.type === 'transfer'
        ? `<span class="color-dot" style="background:${w?.color||'#ccc'}"></span> ${Utils.escapeHtml(w?.name||'?')} → <span class="color-dot" style="background:${tw?.color||'#ccc'}"></span> ${Utils.escapeHtml(tw?.name||'?')}`
        : `<span class="color-dot" style="background:${w?.color||'#ccc'}"></span> ${Utils.escapeHtml(w?.name||'—')}`;
      
      let boxDisplay = '';
      if (t.boxId) {
        const boxes = DB.getBoxes();
        const b = boxes.find(x => x.id === t.boxId);
        if (b) boxDisplay = `<br><span class="badge" style="background:#e8f4fd;color:#2980b9;margin-top:4px">📦 ${Utils.escapeHtml(b.name)}</span>`;
      }

      return `<tr>
        <td style="white-space:nowrap">${Utils.formatDate(t.date)}</td>
        <td>${Utils.escapeHtml(t.description || '—')}${boxDisplay}</td>
        <td>${Utils.typeBadge(t.type)}</td>
        <td style="color:var(--text-secondary)">${cat ? `<span class="color-dot" style="background:${cat.color||'#ccc'}"></span> ${Utils.escapeHtml(cat.name)}` : '—'}</td>
        <td>${wDisplay}</td>
        <td style="text-align:right;font-weight:600;white-space:nowrap" class="${cls}">${sign} ${Utils.formatBRL(t.amount)}</td>
        <td style="white-space:nowrap">
          <button class="btn-icon" title="Editar" onclick="TransactionsPage.openForm('${t.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
          <button class="btn-icon" title="Excluir" onclick="TransactionsPage._confirmDelete('${t.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </td>
      </tr>`;
    }).join('');

    area.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Carteira</th>
            <th style="text-align:right">Valor</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    // paginação
    if (pag) {
      if (pages <= 1) { pag.innerHTML = ''; return; }
      const btns = [];
      for (let p = 1; p <= Math.min(pages, 9); p++) {
        btns.push(`<button class="page-btn ${p === this._page ? 'active' : ''}" onclick="TransactionsPage._goPage(${p})">${p}</button>`);
      }
      pag.innerHTML = `<div class="pagination">
        <button class="page-btn" ${this._page === 1 ? 'disabled' : ''} onclick="TransactionsPage._goPage(${this._page - 1})">‹</button>
        ${btns.join('')}
        <button class="page-btn" ${this._page === pages ? 'disabled' : ''} onclick="TransactionsPage._goPage(${this._page + 1})">›</button>
        <span style="font-size:12px;color:var(--text-tertiary);margin-left:8px">${total} transações</span>
      </div>`;
    }
  },

  _goPage(p) {
    this._page = p;
    this._renderTable();
  },

  openForm(id = null) {
    const wallets    = DB.getWallets();
    const categories = DB.getCategories();
    const tx         = id ? DB.getTransactions().find(t => t.id === id) : null;

    if (wallets.length === 0) {
      App.toast('Crie pelo menos uma carteira antes de lançar transações.', 'error');
      return;
    }

    if (tx && tx.billingId) {
      App.toast('Esta transação faz parte de um faturamento. Edite o faturamento na aba correspondente.', 'warning');
      return;
    }

    const incCats = categories.filter(c => c.type === 'income');
    const expCats = categories.filter(c => c.type === 'expense');

    App.openModal(tx ? 'Editar Transação' : 'Nova Transação', `
      <form id="tx-form">
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select class="form-control" id="tx-type" required>
            <option value="income"   ${tx?.type === 'income'   ? 'selected' : ''}>Entrada</option>
            <option value="expense"  ${tx?.type === 'expense'  ? 'selected' : ''}>Saída</option>
            <option value="transfer" ${tx?.type === 'transfer' ? 'selected' : ''}>Transferência (Aporte)</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Valor (R$) *</label>
            <input type="number" class="form-control" id="tx-amount"
              min="0.01" step="0.01" placeholder="0,00" value="${tx?.amount || ''}" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Data *</label>
            <input type="date" class="form-control" id="tx-date" value="${tx?.date || Utils.today()}" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Carteira *</label>
          <select class="form-control" id="tx-wallet" required>
            <option value="">Selecione...</option>
            ${wallets.map(w => `<option value="${w.id}" ${tx?.walletId === w.id ? 'selected' : ''}>${Utils.escapeHtml(w.name)}</option>`).join('')}
          </select>
        </div>
        <div id="tx-to-group" style="display:none" class="form-group">
          <label class="form-label">Carteira destino *</label>
          <select class="form-control" id="tx-to-wallet">
            <option value="">Selecione...</option>
            ${wallets.map(w => `<option value="${w.id}" ${tx?.toWalletId === w.id ? 'selected' : ''}>${Utils.escapeHtml(w.name)}</option>`).join('')}
          </select>
        </div>
        <div id="tx-box-group" style="display:none" class="form-group">
          <label class="form-label">Descontar da Caixinha (Opcional)</label>
          <select class="form-control" id="tx-box">
            <option value="">Nenhuma caixinha</option>
          </select>
        </div>
        <div id="tx-cat-group" class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-control" id="tx-category">
            <option value="">Sem categoria</option>
            <optgroup label="— Entradas">
              ${incCats.map(c => `<option value="${c.id}" ${tx?.categoryId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>`).join('')}
            </optgroup>
            <optgroup label="— Saídas">
              ${expCats.map(c => `<option value="${c.id}" ${tx?.categoryId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.name)}</option>`).join('')}
            </optgroup>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição</label>
          <input type="text" class="form-control" id="tx-desc" placeholder="Opcional" value="${Utils.escapeHtml(tx?.description || '')}" maxlength="100">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);

    const typeEl   = document.getElementById('tx-type');
    const walletEl = document.getElementById('tx-wallet');
    const toGroup  = document.getElementById('tx-to-group');
    const catGroup = document.getElementById('tx-cat-group');
    const boxGroup = document.getElementById('tx-box-group');
    const boxEl    = document.getElementById('tx-box');

    const toggleType = () => {
      const isTransfer = typeEl.value === 'transfer';
      const isExpense  = typeEl.value === 'expense';
      toGroup.style.display  = isTransfer ? '' : 'none';
      catGroup.style.display = isTransfer ? 'none' : '';
      boxGroup.style.display = isExpense ? '' : 'none';
      if (isExpense) updateBoxes();
    };

    const updateBoxes = () => {
      const wId = walletEl.value;
      boxEl.innerHTML = '<option value="">Nenhuma caixinha</option>';
      if (!wId) return;
      const wBoxes = DB.getBoxes().filter(b => b.walletId === wId);
      wBoxes.forEach(b => {
        const isSel = (tx?.boxId === b.id) ? 'selected' : '';
        boxEl.innerHTML += `<option value="${b.id}" ${isSel}>${Utils.escapeHtml(b.name)}</option>`;
      });
    };

    typeEl.addEventListener('change', toggleType);
    walletEl.addEventListener('change', updateBoxes);
    toggleType();
    if (tx?.walletId) updateBoxes();

    document.getElementById('tx-form').addEventListener('submit', e => {
      e.preventDefault();
      const type        = typeEl.value;
      const amount      = parseFloat(document.getElementById('tx-amount').value);
      const date        = document.getElementById('tx-date').value || Utils.today();
      const walletId    = document.getElementById('tx-wallet').value;
      const toWalletId  = document.getElementById('tx-to-wallet')?.value || null;
      const categoryId  = document.getElementById('tx-category')?.value || null;
      const boxId       = document.getElementById('tx-box')?.value || null;
      const description = document.getElementById('tx-desc').value.trim();

      if (!amount || amount <= 0 || !walletId) return;
      if (type === 'transfer' && !toWalletId) { App.toast('Selecione a carteira destino.', 'error'); return; }
      if (type === 'transfer' && walletId === toWalletId) { App.toast('As carteiras devem ser diferentes.', 'error'); return; }
      if (type === 'expense' && boxId) {
        const bBalance = DB.getBoxBalance(boxId);
        if (amount > bBalance) {
          App.toast('O valor da despesa excede o saldo da caixinha!', 'error');
          return;
        }
      }

      const data = {
        type,
        amount,
        date,
        walletId,
        toWalletId: type === 'transfer' ? toWalletId : null,
        categoryId: categoryId || null,
        boxId:      type === 'expense' ? boxId : null,
        description,
      };

      if (tx) {
        DB.updateTransaction(tx.id, data);
      } else {
        DB.addTransaction(data);
      }

      App.toast('Transação salva!', 'success');
      App.closeModal();
      this._renderTable();
    });
  },

  _confirmDelete(id) {
    const tx  = DB.getTransactions().find(t => t.id === id);
    const msg = tx?.billingId
      ? 'Esta transação faz parte de um faturamento. Excluir irá remover TODAS as transações deste faturamento. Deseja continuar?'
      : 'Excluir esta transação? A ação não pode ser desfeita.';
    App.confirm('Excluir transação', msg, () => {
      DB.deleteTransaction(id);
      App.toast('Transação excluída.', 'success');
      this._renderTable();
    });
  },
};
