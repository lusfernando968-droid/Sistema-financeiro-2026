/* ============================================================
   pages/credit.js — Gestão de Bancos e Linhas de Crédito
   ============================================================ */
const CreditPage = {

  render(container) {
    const summary = DB.getCreditSummary();
    const banks   = DB.getBanks();
    const lines   = DB.getCreditLines();

    // Semáforo de saúde do crédito
    let healthStatus = 'Saudável';
    let healthColor  = 'var(--text)';
    if (summary.utilization > 70) {
      healthStatus = 'Alerta';
      healthColor  = 'var(--text)';
    } else if (summary.utilization > 30) {
      healthStatus = 'Atenção';
      healthColor  = 'var(--text-secondary)';
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Crédito</div>
          <div class="page-header-sub">Gerencie seus limites, cartões e bancos</div>
        </div>
        <button class="btn btn-primary" id="btn-new-bank">+ Novo Banco</button>
      </div>

      <!-- Resumo -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Limite Total</div>
          <div class="stat-value">${Utils.formatBRL(summary.totalLimit)}</div>
          <div class="stat-sub">Soma de todas as linhas</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Utilizado</div>
          <div class="stat-value" style="color:var(--text)">↘ ${Utils.formatBRL(summary.totalUsed)}</div>
          <div class="stat-sub">Faturas e gastos pendentes</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Disponível</div>
          <div class="stat-value" style="color:var(--text)">↗ ${Utils.formatBRL(summary.totalAvailable)}</div>
          <div class="stat-sub">Pronto para uso</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Utilização</div>
          <div class="stat-value" style="color:${healthColor}">${summary.utilization.toFixed(1)}%</div>
          <div class="stat-sub">Status: ${healthStatus}</div>
        </div>
      </div>

      ${banks.length === 0
        ? `<div class="card" style="margin-top:20px">
             <div class="empty-state">
               <div class="empty-state-icon">🏦</div>
               <div class="empty-state-text">Nenhum banco cadastrado</div>
               <div class="empty-state-sub">Cadastre um banco para começar a gerenciar suas linhas de crédito</div>
             </div>
           </div>`
        : banks.map(b => this._bankSection(b, lines.filter(l => l.bankId === b.id))).join('')
      }
    `;

    document.getElementById('btn-new-bank')?.addEventListener('click', () => this.openBankForm());
  },

  _bankSection(bank, bankLines) {
    return `
      <div class="card" style="margin-bottom:14px">
        <div class="card-header" style="background:var(--surface-hover)">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="color-dot" style="background:${bank.color || '#ccc'};width:12px;height:12px"></span>
            <span class="card-title" style="font-size:13px;color:var(--text)">${Utils.escapeHtml(bank.name)}</span>
          </div>
          <div>
            <button class="btn btn-ghost btn-sm" onclick="CreditPage.openLineForm('${bank.id}')">+ Nova Linha</button>
            <button class="btn-icon" title="Editar Banco" onclick="CreditPage.openBankForm('${bank.id}')" style="margin-left:4px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
        </div>
        <div class="card-body">
          ${bankLines.length === 0
            ? `<div style="font-size:13px;color:var(--text-tertiary);text-align:center;padding:10px">Nenhuma linha de crédito neste banco.</div>`
            : bankLines.map(l => {
                const available = l.limit - l.used;
                const pct = l.limit > 0 ? (l.used / l.limit) * 100 : 0;
                const barColor = 'var(--text)';
                return `
                  <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-subtle)">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                      <div style="font-weight:600">${Utils.escapeHtml(l.name)} <span style="font-size:11px;color:var(--text-tertiary);font-weight:400;margin-left:4px">${this._translateType(l.type)}</span></div>
                      <button class="btn-icon" style="width:24px;height:24px" onclick="CreditPage.openLineForm('${bank.id}', '${l.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:12px">
                      <span style="color:var(--text-secondary)">Usado: <strong style="color:var(--text)">${Utils.formatBRL(l.used)}</strong></span>
                      <span style="color:var(--text-secondary)">Disponível: <strong style="color:var(--text)">${Utils.formatBRL(available)}</strong></span>
                    </div>
                    <div class="progress-bar" style="background:var(--border)">
                      <div class="progress-fill" style="width:${Math.min(100, pct)}%;background:${barColor}"></div>
                    </div>
                    <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;text-align:right">Limite total: ${Utils.formatBRL(l.limit)} | Juros: ${l.interestRate}% a.m.</div>
                  </div>
                `;
              }).join('')
          }
        </div>
      </div>
    `;
  },

  _translateType(type) {
    const t = { credit_card: 'Cartão de Crédito', overdraft: 'Cheque Especial', personal_loan: 'Empréstimo Pessoal', other: 'Outro' };
    return t[type] || type;
  },

  /* ---------- Banco CRUD ---------- */
  openBankForm(id) {
    const bank = id ? DB.getBanks().find(b => b.id === id) : null;
    const colors = ['#8e44ad', '#c0392b', '#f39c12', '#2e7d4f', '#1a73e8', '#34495e'];
    const selectedColor = bank?.color || colors[0];

    App.openModal(bank ? 'Editar Banco' : 'Novo Banco', `
      <form id="bank-form">
        <div class="form-group">
          <label class="form-label">Nome da Instituição *</label>
          <input type="text" class="form-control" id="bk-name" value="${Utils.escapeHtml(bank?.name || '')}" placeholder="Ex: Nubank, Itaú..." required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Cor</label>
          <div class="color-swatches">
            ${colors.map(c => `
              <div class="color-swatch ${c === selectedColor ? 'selected' : ''}"
                   style="background:${c};${c === selectedColor ? 'border-color:#111;transform:scale(1.15)' : 'border-color:transparent'}"
                   onclick="CreditPage._selectColor(this, '${c}')">
              </div>
            `).join('')}
          </div>
          <input type="hidden" id="bk-color" value="${selectedColor}">
        </div>
        <div class="form-actions">
          ${bank ? `<button type="button" class="btn btn-ghost" style="color:var(--danger)" onclick="CreditPage.deleteBank('${bank.id}')">Excluir</button>` : ''}
          <div style="flex:1"></div>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);

    document.getElementById('bank-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('bk-name').value.trim();
      const color = document.getElementById('bk-color').value;
      if (!name) return;

      if (bank) DB.updateBank(bank.id, { name, color });
      else DB.addBank({ name, color });

      App.toast('Banco salvo!', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  _selectColor(el, color) {
    document.querySelectorAll('.color-swatch').forEach(s => { s.style.borderColor = 'transparent'; s.style.transform = ''; s.classList.remove('selected'); });
    el.style.borderColor = '#111'; el.style.transform = 'scale(1.15)'; el.classList.add('selected');
    document.getElementById('bk-color').value = color;
  },

  deleteBank(id) {
    App.confirm('Excluir banco?', 'Esta ação é permanente.', () => {
      try {
        DB.deleteBank(id);
        App.toast('Banco excluído.', 'success');
        App.closeModal();
        this.render(document.getElementById('content'));
      } catch (e) { App.toast(e.message, 'error'); }
    });
  },

  /* ---------- Linha de Crédito CRUD ---------- */
  openLineForm(bankId, lineId) {
    const line = lineId ? DB.getCreditLines().find(l => l.id === lineId) : null;
    
    App.openModal(line ? 'Editar Linha' : 'Nova Linha de Crédito', `
      <form id="line-form">
        <div class="form-group">
          <label class="form-label">Nome *</label>
          <input type="text" class="form-control" id="cl-name" value="${Utils.escapeHtml(line?.name || '')}" placeholder="Ex: Cartão Platinum, Cheque Especial..." required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select class="form-control" id="cl-type" required>
            <option value="credit_card" ${line?.type === 'credit_card' ? 'selected' : ''}>Cartão de Crédito</option>
            <option value="overdraft" ${line?.type === 'overdraft' ? 'selected' : ''}>Cheque Especial / Limite de Conta</option>
            <option value="personal_loan" ${line?.type === 'personal_loan' ? 'selected' : ''}>Empréstimo Pré-aprovado</option>
            <option value="other" ${line?.type === 'other' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Limite Total (R$) *</label>
            <input type="number" class="form-control" id="cl-limit" value="${line?.limit || ''}" min="0" step="0.01" required>
          </div>
          <div class="form-group">
            <label class="form-label">Utilizado (R$) *</label>
            <input type="number" class="form-control" id="cl-used" value="${line?.used || 0}" min="0" step="0.01" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Juros (% ao mês)</label>
            <input type="number" class="form-control" id="cl-rate" value="${line?.interestRate || 0}" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Dia Vencimento</label>
            <input type="number" class="form-control" id="cl-due" value="${line?.dueDay || 10}" min="1" max="31">
          </div>
        </div>
        <div class="form-actions">
          ${line ? `<button type="button" class="btn btn-ghost" style="color:var(--danger)" onclick="CreditPage.deleteLine('${line.id}')">Excluir</button>` : ''}
          <div style="flex:1"></div>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);

    document.getElementById('line-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = {
        bankId,
        name: document.getElementById('cl-name').value.trim(),
        type: document.getElementById('cl-type').value,
        limit: parseFloat(document.getElementById('cl-limit').value),
        used: parseFloat(document.getElementById('cl-used').value),
        interestRate: parseFloat(document.getElementById('cl-rate').value || 0),
        dueDay: parseInt(document.getElementById('cl-due').value || 10),
      };

      if (line) DB.updateCreditLine(line.id, data);
      else DB.addCreditLine(data);

      App.toast('Linha de crédito salva!', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  deleteLine(id) {
    App.confirm('Excluir linha de crédito?', 'Esta ação não afetará suas transações.', () => {
      DB.deleteCreditLine(id);
      App.toast('Linha excluída.', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },
};
