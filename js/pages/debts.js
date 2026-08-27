/* ============================================================
   pages/debts.js — Gestão de Dívidas, Recebíveis e Alocação
   ============================================================ */
const DebtsPage = {
  _strategy: 'avalanche', // ou 'snowball'
  _direction: 'payable', // 'payable' ou 'receivable'

  render(container) {
    const isReceivable = this._direction === 'receivable';
    const summary = DB.getDebtSummary(this._direction);
    const allocation = DB.getDebtAllocation(this._strategy, this._direction);
    const banks = DB.getBanks();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Dívidas & Empréstimos</div>
          <div class="page-header-sub">Gerencie o que você deve ou o que devem a você</div>
        </div>
        <button class="btn btn-primary" id="btn-new-debt">+ Novo Registro</button>
      </div>

      <!-- Abas de Direção -->
      <div style="display:flex; background:var(--bg); border-radius:8px; padding:4px; margin-bottom:20px">
        <button class="btn btn-ghost btn-sm debt-dir-btn ${!isReceivable ? 'active' : ''}" data-dir="payable" style="flex:1; padding:8px; font-weight:600; ${!isReceivable ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">
          A Pagar (Eu Devo)
        </button>
        <button class="btn btn-ghost btn-sm debt-dir-btn ${isReceivable ? 'active' : ''}" data-dir="receivable" style="flex:1; padding:8px; font-weight:600; ${isReceivable ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">
          A Receber (Me Devem)
        </button>
      </div>

      <!-- Resumo -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Restante</div>
          <div class="stat-value" style="color:var(--${isReceivable ? 'success' : 'danger'})">${Utils.formatBRL(summary.totalRemaining)}</div>
          <div class="stat-sub">${summary.count} registro(s) ativo(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${isReceivable ? 'Receita Mensal' : 'Custo Mensal'}</div>
          <div class="stat-value" style="color:var(--${isReceivable ? 'success' : 'warning-text'})">${Utils.formatBRL(summary.totalMonthly)}</div>
          <div class="stat-sub">${isReceivable ? 'Entrada prevista' : 'Comprometimento de renda'}</div>
        </div>
        <div class="stat-card" style="grid-column: span 2">
          <div class="stat-label">Juros Médio</div>
          <div class="stat-value">${summary.avgInterest.toFixed(2)}% a.m.</div>
          <div class="stat-sub">Taxa média ponderada</div>
        </div>
      </div>

      <!-- Alocação Inteligente (Collapsible) -->
      ${allocation.length > 0 ? `
        <details class="card" style="margin-bottom:20px; padding:0; box-shadow:none; border:1px solid var(--border-subtle); background:var(--card-bg)">
          <summary style="padding:16px; cursor:pointer; font-weight:600; color:var(--text); list-style:none; display:flex; justify-content:space-between; align-items:center; user-select:none">
            <span style="display:flex; align-items:center; gap:8px">
              <span style="font-size:16px">🎯</span>
              Estratégia de ${isReceivable ? 'Cobrança' : 'Pagamento'}
            </span>
            <span style="font-size:12px; color:var(--text-tertiary)">Mostrar ▼</span>
          </summary>
          <div style="padding:16px; border-top:1px solid var(--border-subtle); background:var(--bg)">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
              <span style="font-size:13px; font-weight:500; color:var(--text-secondary)">Escolha a estratégia:</span>
              <select id="strategy-select" style="font-size:13px; padding:6px 10px; border-radius:6px; border:1px solid var(--border-subtle); background:var(--card-bg); font-weight:600; color:var(--primary)">
                <option value="avalanche" ${this._strategy === 'avalanche' ? 'selected' : ''}>Avalanche (Maior Juros)</option>
                <option value="snowball" ${this._strategy === 'snowball' ? 'selected' : ''}>Bola de Neve (Menor Saldo)</option>
              </select>
            </div>
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px; line-height:1.5">
              Foque ${isReceivable ? 'seus esforços de cobrança na' : 'pagamentos extras na'} <strong>Prioridade #1</strong>.
              ${this._strategy === 'avalanche' 
                ? (isReceivable ? 'Isso maximiza seu retorno em juros.' : 'Isso economiza mais dinheiro em juros a longo prazo.') 
                : 'Isso gera vitórias rápidas eliminando os menores saldos primeiro.'}
            </p>
            <div style="background:var(--card-bg); padding:16px; border-radius:8px; border:1px solid var(--border-subtle); box-shadow:0 2px 4px rgba(0,0,0,0.02)">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px">
                <span class="badge" style="background:var(--primary-light);color:var(--primary);font-size:10px;padding:4px 8px;font-weight:700">#1 PRIORIDADE</span>
                <strong style="color:var(--text);font-size:16px">${Utils.escapeHtml(allocation[0].name)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--text-secondary)">
                <span>Restante: <strong style="color:var(--text)">${Utils.formatBRL(allocation[0].remainingAmount)}</strong></span>
                <span>Juros: <strong style="color:var(--${isReceivable ? 'success' : 'danger'})">${allocation[0].interestRate}% a.m.</strong></span>
              </div>
            </div>
          </div>
        </details>
      ` : ''}

      <!-- Lista de Dívidas -->
      ${allocation.length === 0
        ? `<div class="card">
             <div class="empty-state">
               <div class="empty-state-icon">${isReceivable ? '💸' : '🎉'}</div>
               <div class="empty-state-text">Nenhum registro ativo</div>
               <div class="empty-state-sub">${isReceivable ? 'Ninguém está devendo dinheiro a você no momento.' : 'Parabéns! Sua saúde financeira está excelente.'}</div>
             </div>
           </div>`
        : `<div class="debts-list">
             ${allocation.map(d => this._debtCard(d, banks)).join('')}
           </div>`
      }
    `;

    document.getElementById('btn-new-debt')?.addEventListener('click', () => this.openDebtForm());
    
    document.querySelectorAll('.debt-dir-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this._direction = e.currentTarget.dataset.dir;
        this.render(document.getElementById('content'));
      });
    });

    document.getElementById('strategy-select')?.addEventListener('change', (e) => {
      this._strategy = e.target.value;
      this.render(document.getElementById('content'));
    });
  },

  _debtCard(debt, banks) {
    const bank = banks.find(b => b.id === debt.bankId);
    const isReceivable = debt.type && debt.type.startsWith('receivable_');
    const progress = debt.originalAmount > 0 
      ? Math.min(100, ((debt.originalAmount - debt.remainingAmount) / debt.originalAmount) * 100)
      : 0;

    return `
      <div class="card" style="margin-bottom:16px; padding:20px; border-radius:12px; border:1px solid var(--border-subtle); box-shadow:0 2px 8px rgba(0,0,0,0.04); position:relative">
        
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px">
          <div>
            ${debt.isPrimary ? `<span class="badge" style="background:var(--primary-light); color:var(--primary); margin-bottom:8px; font-size:10px; padding:4px 8px; font-weight:700">ALTA PRIORIDADE</span>` : ''}
            <div style="font-weight:700; font-size:16px; color:var(--text)">${Utils.escapeHtml(debt.name)}</div>
            <div style="font-size:12px; color:var(--text-tertiary); margin-top:4px; display:flex; align-items:center; gap:6px">
              ${bank ? `<span class="color-dot" style="background:${bank.color || '#ccc'}"></span> ${Utils.escapeHtml(bank.name)}` : 'Sem vínculo bancário'}
            </div>
          </div>
          <div style="display:flex; gap:8px">
            <button class="btn btn-primary btn-sm" style="background:var(--${isReceivable ? 'success' : 'primary'}); font-weight:600; padding:6px 12px" onclick="DebtsPage.openPaymentModal('${debt.id}')">${isReceivable ? 'Receber' : 'Pagar'}</button>
            <button class="btn-icon" onclick="DebtsPage.openDebtForm('${debt.id}')" style="background:var(--bg); border:1px solid var(--border-subtle); width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; background:var(--bg); padding:12px 16px; border-radius:8px">
          <div>
            <div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Saldo Restante</div>
            <div style="font-size:20px; font-weight:700; color:var(--${isReceivable ? 'success' : 'danger'})">${Utils.formatBRL(debt.remainingAmount)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Parcela Mensal</div>
            <div style="font-size:16px; font-weight:600; color:var(--text)">${Utils.formatBRL(debt.monthlyPayment)}</div>
            ${debt.dueDate ? `<div style="font-size:11px; color:var(--primary); font-weight:600; margin-top:2px">Vence dia ${debt.dueDate}</div>` : ''}
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:6px">
            <span>Progresso (${progress.toFixed(0)}%)</span>
            <span>Original: ${Utils.formatBRL(debt.originalAmount)}</span>
          </div>
          <div class="progress-bar" style="height:6px; border-radius:3px">
            <div class="progress-fill" style="width:${progress}%; background:var(--${isReceivable ? 'success' : 'primary'}); border-radius:3px"></div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); padding-top:16px; border-top:1px dashed var(--border-subtle)">
          <div style="display:flex; gap:16px">
            <div>Juros: <strong style="color:var(--text)">${debt.interestRate}% a.m.</strong></div>
            <div>Parcelas: <strong style="color:var(--text)">${debt.paidInstallments || 0} / ${debt.installments || '?'}</strong></div>
          </div>
          ${debt.monthsToPayoff ? `<div>Quitação: <strong style="color:var(--text)">~${debt.monthsToPayoff} meses</strong></div>` : ''}
        </div>
      </div>
    `;
  },

  /* ---------- CRUD Dívida ---------- */
  openDebtForm(id) {
    const debt = id ? DB.getDebts().find(d => d.id === id) : null;
    const banks = DB.getBanks();
    
    // Identificar a direção e o tipo real
    let debtDir = this._direction; // default para a aba atual
    let realType = 'loan';
    
    if (debt) {
      if (debt.type && debt.type.startsWith('receivable_')) {
        debtDir = 'receivable';
        realType = debt.type.replace('receivable_', '');
      } else {
        debtDir = 'payable';
        realType = debt.type || 'loan';
      }
    }

    App.openModal(debt ? 'Editar Registro' : 'Novo Registro', `
      <form id="debt-form">
        <div class="form-group">
          <label class="form-label">Natureza do Registro *</label>
          <div style="display:flex; gap:10px; background:var(--bg); padding:6px; border-radius:6px">
            <label style="flex:1; display:flex; align-items:center; gap:6px; font-size:14px; cursor:pointer">
              <input type="radio" name="db-dir" value="payable" ${debtDir === 'payable' ? 'checked' : ''}> A Pagar (Eu devo)
            </label>
            <label style="flex:1; display:flex; align-items:center; gap:6px; font-size:14px; cursor:pointer">
              <input type="radio" name="db-dir" value="receivable" ${debtDir === 'receivable' ? 'checked' : ''}> A Receber (Me devem)
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Nome / Descrição *</label>
          <input type="text" class="form-control" id="db-name" value="${Utils.escapeHtml(debt?.name || '')}" placeholder="Ex: Financiamento Carro, Empréstimo para João..." required autofocus>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Banco Vínculo (Opcional)</label>
            <select class="form-control" id="db-bank">
              <option value="">Nenhum</option>
              ${banks.map(b => `<option value="${b.id}" ${debt?.bankId === b.id ? 'selected' : ''}>${Utils.escapeHtml(b.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-control" id="db-type">
              <option value="loan" ${realType === 'loan' ? 'selected' : ''}>Empréstimo / Dinheiro</option>
              <option value="financing" ${realType === 'financing' ? 'selected' : ''}>Financiamento / Venda Parcelada</option>
              <option value="credit_card" ${realType === 'credit_card' ? 'selected' : ''}>Cartão de Crédito</option>
              <option value="other" ${realType === 'other' ? 'selected' : ''}>Outro</option>
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
            <label class="form-label">Parcelas Feitas</label>
            <input type="number" class="form-control" id="db-paid" value="${debt?.paidInstallments || 0}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Dia do Vencimento (1 a 31) - Opcional</label>
          <input type="number" class="form-control" id="db-duedate" value="${debt?.dueDate || ''}" min="1" max="31" placeholder="Ex: 5, 10, 20">
        </div>
        
        <div class="form-actions">
          ${debt ? `<button type="button" class="btn btn-ghost" style="color:var(--danger)" onclick="DebtsPage.deleteDebt('${debt.id}')">Excluir</button>` : ''}
          <div style="flex:1"></div>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
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
      const dir = document.querySelector('input[name="db-dir"]:checked').value;
      const baseType = document.getElementById('db-type').value;
      
      const finalType = dir === 'receivable' ? `receivable_${baseType}` : baseType;

      const data = {
        name: document.getElementById('db-name').value.trim(),
        bankId: document.getElementById('db-bank').value || null,
        type: finalType,
        originalAmount: parseFloat(document.getElementById('db-original').value),
        remainingAmount: parseFloat(document.getElementById('db-remaining').value),
        monthlyPayment: parseFloat(document.getElementById('db-payment').value),
        interestRate: parseFloat(document.getElementById('db-interest').value || 0),
        installments: parseInt(document.getElementById('db-installments').value || 0),
        paidInstallments: parseInt(document.getElementById('db-paid').value || 0),
        dueDate: parseInt(document.getElementById('db-duedate').value) || null,
      };

      if (debt) DB.updateDebt(debt.id, data);
      else DB.addDebt(data);

      App.toast('Registro salvo com sucesso!', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  deleteDebt(id) {
    App.confirm('Excluir registro?', 'Esta ação não exluirá as transações de pagamento já realizadas na carteira.', () => {
      DB.deleteDebt(id);
      App.toast('Registro excluído.', 'success');
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
      App.toast('Você precisa de uma carteira para registrar o pagamento/recebimento.', 'error');
      return;
    }
    
    const isReceivable = debt.type && debt.type.startsWith('receivable_');

    App.openModal(`${isReceivable ? 'Receber' : 'Pagar'} parcela: ${Utils.escapeHtml(debt.name)}`, `
      <form id="pay-form">
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px">
          Ao confirmar, o valor da parcela (<strong>${Utils.formatBRL(debt.monthlyPayment)}</strong>) 
          será ${isReceivable ? 'depositado na' : 'descontado da'} carteira selecionada e o saldo restante será reduzido.
        </p>

        <div class="form-group">
          <label class="form-label">Carteira / Origem *</label>
          <select class="form-control" id="pay-wallet" required>
            ${wallets.map(w => `<option value="${w.id}">${Utils.escapeHtml(w.name)} (${Utils.formatBRL(DB.getWalletBalance(w.id))})</option>`).join('')}
            <option value="none">⚠️ Baixa manual (sem gerar transação)</option>
          </select>
          <div class="form-hint" style="margin-top:6px">Se você já registrou a saída/entrada manualmente em outro lugar, escolha "Baixa manual".</div>
        </div>
        <div class="form-group">
          <label class="form-label">Data *</label>
          <input type="date" class="form-control" id="pay-date" value="${Utils.today()}" required>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary" style="background:var(--${isReceivable ? 'success' : 'primary'})">${isReceivable ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}</button>
        </div>
      </form>
    `);

    document.getElementById('pay-form').addEventListener('submit', e => {
      e.preventDefault();
      const walletId = document.getElementById('pay-wallet').value;
      const date = document.getElementById('pay-date').value;

      try {
        const paid = DB.payDebtInstallment(debt.id, walletId, date);
        App.toast(`${isReceivable ? 'Recebimento' : 'Pagamento'} de ${Utils.formatBRL(paid)} registrado!`, 'success');
        App.closeModal();
        this.render(document.getElementById('content'));
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  }
};
