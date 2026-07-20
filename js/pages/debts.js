/* ============================================================
   pages/debts.js — Gestão de Dívidas e Alocação Inteligente
   ============================================================ */
const DebtsPage = {
  _strategy: 'avalanche', // ou 'snowball'

  render(container) {
    const summary = DB.getDebtSummary();
    const allocation = DB.getDebtAllocation(this._strategy);
    const banks = DB.getBanks();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Dívidas</div>
          <div class="page-header-sub">Gerencie empréstimos, financiamentos e parcele pagamentos</div>
        </div>
        <button class="btn btn-primary" id="btn-new-debt">+ Nova Dívida</button>
      </div>

      <!-- Resumo -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Restante</div>
          <div class="stat-value" style="color:var(--danger)">${Utils.formatBRL(summary.totalRemaining)}</div>
          <div class="stat-sub">${summary.count} dívida(s) ativa(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Custo Mensal</div>
          <div class="stat-value" style="color:var(--warning-text)">${Utils.formatBRL(summary.totalMonthly)}</div>
          <div class="stat-sub">Comprometimento de renda</div>
        </div>
        <div class="stat-card" style="grid-column: span 2">
          <div class="stat-label">Juros Médio</div>
          <div class="stat-value">${summary.avgInterest.toFixed(2)}% a.m.</div>
          <div class="stat-sub">Taxa média ponderada</div>
        </div>
      </div>

      <!-- Alocação Inteligente -->
      ${allocation.length > 0 ? `
        <div class="card" style="margin-bottom:20px; border-color:var(--primary); box-shadow:0 4px 12px rgba(26,115,232,0.1)">
          <div class="card-header" style="background:var(--primary-light)">
            <span class="card-title" style="color:var(--primary)">🎯 Estratégia de Pagamento</span>
            <select id="strategy-select" style="font-size:12px; padding:4px 8px; border-radius:4px; border:1px solid rgba(26,115,232,0.3); background:white; color:var(--primary); font-weight:600">
              <option value="avalanche" ${this._strategy === 'avalanche' ? 'selected' : ''}>Avalanche (Maior Juros)</option>
              <option value="snowball" ${this._strategy === 'snowball' ? 'selected' : ''}>Bola de Neve (Menor Saldo)</option>
            </select>
          </div>
          <div class="card-body" style="font-size:13px; color:var(--text-secondary)">
            <p style="margin-bottom:12px">
              Foque pagamentos extras na <strong>Prioridade #1</strong> enquanto paga apenas o mínimo das outras.
              ${this._strategy === 'avalanche' 
                ? 'Isso economiza mais dinheiro em juros a longo prazo.' 
                : 'Isso gera vitórias rápidas e motivação ao eliminar dívidas pequenas primeiro.'}
            </p>
            <div style="background:white; padding:12px; border-radius:6px; border:1px solid var(--border-subtle)">
              <div style="display:flex; align-items:center; gap:10px">
                <span class="badge" style="background:var(--primary);color:white;font-size:12px;padding:4px 8px">#1 Prioridade</span>
                <strong style="color:var(--text);font-size:15px">${Utils.escapeHtml(allocation[0].name)}</strong>
              </div>
              <div style="margin-top:8px; display:flex; justify-content:space-between">
                <span>Restante: <strong>${Utils.formatBRL(allocation[0].remainingAmount)}</strong></span>
                <span style="color:var(--danger)">Juros: <strong>${allocation[0].interestRate}%</strong></span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Lista de Dívidas -->
      ${allocation.length === 0
        ? `<div class="card">
             <div class="empty-state">
               <div class="empty-state-icon">🎉</div>
               <div class="empty-state-text">Nenhuma dívida ativa</div>
               <div class="empty-state-sub">Parabéns! Sua saúde financeira está excelente.</div>
             </div>
           </div>`
        : `<div class="debts-list">
             ${allocation.map(d => this._debtCard(d, banks)).join('')}
           </div>`
      }
    `;

    document.getElementById('btn-new-debt')?.addEventListener('click', () => this.openDebtForm());
    
    document.getElementById('strategy-select')?.addEventListener('change', (e) => {
      this._strategy = e.target.value;
      this.render(document.getElementById('content'));
    });
  },

  _debtCard(debt, banks) {
    const bank = banks.find(b => b.id === debt.bankId);
    const progress = debt.originalAmount > 0 
      ? Math.min(100, ((debt.originalAmount - debt.remainingAmount) / debt.originalAmount) * 100)
      : 0;

    return `
      <div class="card" style="margin-bottom:14px; position:relative; overflow:hidden">
        ${debt.isPrimary ? `<div style="position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--primary)"></div>` : ''}
        
        <div class="card-header" style="padding-left:${debt.isPrimary ? '22px' : '18px'}">
          <div>
            <div style="font-weight:600; font-size:14px; color:var(--text)">${Utils.escapeHtml(debt.name)}</div>
            <div style="font-size:12px; color:var(--text-tertiary); margin-top:2px">
              ${bank ? `<span class="color-dot" style="background:${bank.color || '#ccc'}"></span> ${Utils.escapeHtml(bank.name)}` : 'Sem vínculo'}
            </div>
          </div>
          <div>
            <button class="btn btn-primary btn-sm" onclick="DebtsPage.openPaymentModal('${debt.id}')">Pagar</button>
            <button class="btn-icon" style="margin-left:4px" onclick="DebtsPage.openDebtForm('${debt.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
        </div>

        <div class="card-body" style="padding-left:${debt.isPrimary ? '22px' : '18px'}; padding-top:14px">
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px">
            <div>
              <span style="color:var(--text-tertiary)">Restante</span><br>
              <strong style="font-size:18px; color:var(--danger)">${Utils.formatBRL(debt.remainingAmount)}</strong>
            </div>
            <div style="text-align:right">
              <span style="color:var(--text-tertiary)">Parcela Mensal</span><br>
              <strong>${Utils.formatBRL(debt.monthlyPayment)}</strong>
            </div>
          </div>

          <div style="margin-top:12px">
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary); margin-bottom:4px">
              <span>Progresso: ${progress.toFixed(0)}%</span>
              <span>Original: ${Utils.formatBRL(debt.originalAmount)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${progress}%; background:var(--success)"></div>
            </div>
          </div>

          <div style="display:flex; gap:12px; margin-top:14px; font-size:12px; color:var(--text-secondary); border-top:1px solid var(--border-subtle); padding-top:12px">
            <div>Juros: <strong style="color:var(--danger)">${debt.interestRate}% a.m.</strong></div>
            <div>Parcelas pagas: <strong>${debt.paidInstallments || 0} / ${debt.installments || '?'}</strong></div>
            ${debt.monthsToPayoff ? `<div>Est. Quitação: <strong>${debt.monthsToPayoff} meses</strong></div>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  /* ---------- CRUD Dívida ---------- */
  openDebtForm(id) {
    const debt = id ? DB.getDebts().find(d => d.id === id) : null;
    const banks = DB.getBanks();
    const wallets = DB.getWallets();

    App.openModal(debt ? 'Editar Dívida' : 'Nova Dívida', `
      <form id="debt-form">
        <div class="form-group">
          <label class="form-label">Nome / Descrição *</label>
          <input type="text" class="form-control" id="db-name" value="${Utils.escapeHtml(debt?.name || '')}" placeholder="Ex: Financiamento Carro, Empréstimo..." required autofocus>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Banco Vínculo</label>
            <select class="form-control" id="db-bank">
              <option value="">Nenhum</option>
              ${banks.map(b => `<option value="${b.id}" ${debt?.bankId === b.id ? 'selected' : ''}>${Utils.escapeHtml(b.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-control" id="db-type">
              <option value="loan" ${debt?.type === 'loan' ? 'selected' : ''}>Empréstimo</option>
              <option value="financing" ${debt?.type === 'financing' ? 'selected' : ''}>Financiamento</option>
              <option value="credit_card" ${debt?.type === 'credit_card' ? 'selected' : ''}>Cartão de Crédito Parcelado</option>
              <option value="other" ${debt?.type === 'other' ? 'selected' : ''}>Outro</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Valor Original (R$) *</label>
            <input type="number" class="form-control" id="db-original" value="${debt?.originalAmount || ''}" min="0.01" step="0.01" required>
          </div>
          <div class="form-group">
            <label class="form-label">Valor Restante (R$) *</label>
            <input type="number" class="form-control" id="db-remaining" value="${debt?.remainingAmount ?? debt?.originalAmount ?? ''}" min="0" step="0.01" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Parcela Mensal (R$) *</label>
            <input type="number" class="form-control" id="db-payment" value="${debt?.monthlyPayment || ''}" min="0.01" step="0.01" required>
          </div>
          <div class="form-group">
            <label class="form-label">Juros (% a.m.)</label>
            <input type="number" class="form-control" id="db-interest" value="${debt?.interestRate || 0}" min="0" step="0.01">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Total de Parcelas</label>
            <input type="number" class="form-control" id="db-installments" value="${debt?.installments || ''}" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">Parcelas Pagas</label>
            <input type="number" class="form-control" id="db-paid" value="${debt?.paidInstallments || 0}" min="0">
          </div>
        </div>
        
        <div class="form-actions">
          ${debt ? `<button type="button" class="btn btn-ghost" style="color:var(--danger)" onclick="DebtsPage.deleteDebt('${debt.id}')">Excluir</button>` : ''}
          <div style="flex:1"></div>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Dívida</button>
        </div>
      </form>
    `);

    // Autopreencher restante quando original mudar apenas em nova dívida
    if (!debt) {
      document.getElementById('db-original').addEventListener('input', e => {
        const rem = document.getElementById('db-remaining');
        if (!rem.value || rem.dataset.auto) {
          rem.value = e.target.value;
          rem.dataset.auto = 'true';
        }
      });
      document.getElementById('db-remaining').addEventListener('input', e => {
        e.target.dataset.auto = '';
      });
    }

    document.getElementById('debt-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = {
        name: document.getElementById('db-name').value.trim(),
        bankId: document.getElementById('db-bank').value || null,
        type: document.getElementById('db-type').value,
        originalAmount: parseFloat(document.getElementById('db-original').value),
        remainingAmount: parseFloat(document.getElementById('db-remaining').value),
        monthlyPayment: parseFloat(document.getElementById('db-payment').value),
        interestRate: parseFloat(document.getElementById('db-interest').value || 0),
        installments: parseInt(document.getElementById('db-installments').value || 0),
        paidInstallments: parseInt(document.getElementById('db-paid').value || 0),
      };

      if (debt) DB.updateDebt(debt.id, data);
      else DB.addDebt(data);

      App.toast('Dívida salva com sucesso!', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  deleteDebt(id) {
    App.confirm('Excluir dívida?', 'Esta ação não exluirá as transações de pagamento já realizadas na carteira.', () => {
      DB.deleteDebt(id);
      App.toast('Dívida excluída.', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  /* ---------- Pagamento ---------- */
  openPaymentModal(id) {
    const debt = DB.getDebts().find(d => d.id === id);
    if (!debt) return;
    const wallets = DB.getWallets();

    if (wallets.length === 0) {
      App.toast('Você precisa de uma carteira para registrar o pagamento.', 'error');
      return;
    }

    App.openModal(`Pagar parcela: ${Utils.escapeHtml(debt.name)}`, `
      <form id="pay-form">
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px">
          Ao confirmar, o valor da parcela (<strong>${Utils.formatBRL(debt.monthlyPayment)}</strong>) 
          será descontado da carteira selecionada e o saldo da dívida será reduzido.
        </p>

        <div class="form-group">
          <label class="form-label">Carteira de Pagamento *</label>
          <select class="form-control" id="pay-wallet" required>
            ${wallets.map(w => `<option value="${w.id}">${Utils.escapeHtml(w.name)} (${Utils.formatBRL(DB.getWalletBalance(w.id))})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Data do Pagamento *</label>
          <input type="date" class="form-control" id="pay-date" value="${Utils.today()}" required>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Confirmar Pagamento</button>
        </div>
      </form>
    `);

    document.getElementById('pay-form').addEventListener('submit', e => {
      e.preventDefault();
      const walletId = document.getElementById('pay-wallet').value;
      const date = document.getElementById('pay-date').value;

      try {
        const paid = DB.payDebtInstallment(debt.id, walletId, date);
        App.toast(`Pagamento de ${Utils.formatBRL(paid)} registrado!`, 'success');
        App.closeModal();
        this.render(document.getElementById('content'));
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  }
};
