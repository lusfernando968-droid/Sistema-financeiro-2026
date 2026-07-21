/* ============================================================
   pages/billing.js — Faturamento e Distribuição automática
   ============================================================ */
const BillingPage = {

  render(container) {
    const wallets       = DB.getWallets();
    const distributions = DB.getDistributions();
    const billings      = DB.getBillings().sort((a, b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    const totalPct      = distributions.reduce((s, d) => s + (d.percentage || 0), 0);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Faturamento</div>
          <div class="page-header-sub">Registre faturamentos e configure a distribuição automática entre carteiras</div>
        </div>
        <button class="btn btn-primary" id="btn-new-billing">+ Registrar Faturamento</button>
      </div>

      <div class="billing-layout">
        <!-- Regras de distribuição -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Regras de Distribuição</span>
            <button class="btn btn-ghost btn-sm" id="btn-edit-dist">Editar</button>
          </div>
          <div class="card-body">
            ${wallets.length === 0
              ? `<p style="font-size:13px;color:var(--text-tertiary)">Crie carteiras primeiro para configurar a distribuição.</p>`
              : distributions.length === 0
                ? `<p style="font-size:13px;color:var(--text-tertiary)">Nenhuma regra configurada.<br>Clique em <strong>Editar</strong> para definir os percentuais.</p>`
                : `
                  ${distributions.map(d => {
                    const w = wallets.find(x => x.id === d.walletId);
                    return `<div class="dist-rule">
                      <span class="color-dot" style="background:${w?.color || '#ccc'}"></span>
                      <span class="dist-rule-wallet">${Utils.escapeHtml(w?.name || '—')}</span>
                      <span class="dist-rule-pct">${d.percentage}%</span>
                    </div>`;
                  }).join('')}
                  <div class="dist-total ${totalPct === 100 ? 'valid' : totalPct > 100 ? 'invalid' : 'partial'}">
                    <span>Total distribuído</span>
                    <span>${parseFloat(totalPct.toFixed(2))}%</span>
                  </div>
                  ${totalPct < 100
                    ? `<p class="form-hint" style="margin-top:8px">${parseFloat((100 - totalPct).toFixed(2))}% do faturamento ficará sem destino.</p>`
                    : ''}
                `
            }
          </div>
        </div>

        <!-- Histórico de faturamentos -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Histórico de Faturamentos</span>
          </div>
          <div class="card-body">
            ${billings.length === 0
              ? `<div class="empty-state" style="padding:28px 0">
                   <div class="empty-state-text">Nenhum faturamento registrado</div>
                   <div class="empty-state-sub">Use o botão acima para registrar seu primeiro faturamento</div>
                 </div>`
              : billings.map(b => this._billingItem(b, wallets)).join('')
            }
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-new-billing')?.addEventListener('click', () => this.openBillingForm());
    document.getElementById('btn-edit-dist')?.addEventListener('click',   () => this.openDistConfig());
  },

  _billingItem(b, wallets) {
    const dists = (b.distributions || []);
    return `
      <div class="billing-item">
        <div style="flex:1;min-width:0">
          <div class="billing-amount">${Utils.formatBRL(b.amount)}</div>
          <div class="billing-meta">${Utils.escapeHtml(b.description || 'Faturamento')} · ${Utils.formatDate(b.date)}</div>
          <div class="billing-dist-list">
            ${dists.map(d => {
              const w = wallets.find(x => x.id === d.walletId);
              return `<span class="billing-dist-tag">${Utils.escapeHtml(w?.name || '?')}: ${Utils.formatBRL(d.amount)}</span>`;
            }).join('')}
          </div>
        </div>
        <button class="btn-icon" title="Excluir faturamento" onclick="BillingPage.confirmDelete('${b.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;
  },

  /* ----- Modal: Configurar distribuição ----- */
  openDistConfig() {
    const wallets = DB.getWallets();
    if (wallets.length === 0) { App.toast('Crie carteiras primeiro.', 'error'); return; }

    const existing = DB.getDistributions();

    App.openModal('Configurar Distribuição', `
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6">
        Defina qual percentual de cada faturamento vai para cada carteira.
        A soma pode ser menor que 100%; o restante não será distribuído automaticamente.
      </p>
      <form id="dist-form">
        ${wallets.map(w => {
          const ex = existing.find(d => d.walletId === w.id);
          return `<div class="dist-rule" style="margin-bottom:8px">
            <span class="color-dot" style="background:${w.color||'#ccc'}"></span>
            <span class="dist-rule-wallet">${Utils.escapeHtml(w.name)}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <input type="number" class="form-control dist-pct"
                data-wallet="${w.id}"
                value="${ex?.percentage || 0}"
                min="0" max="100" step="0.01"
                style="width:80px;text-align:right">
              <span style="font-size:13px;color:var(--text-secondary)">%</span>
            </div>
          </div>`;
        }).join('')}

        <div id="dist-total-row" class="dist-total partial" style="margin:12px 0">
          <span>Total</span>
          <span id="dist-total-val">0%</span>
        </div>
        <p class="form-hint">Valores em branco ou zero serão ignorados.</p>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar regras</button>
        </div>
      </form>
    `);

    const recalc = () => {
      const inputs = document.querySelectorAll('.dist-pct');
      const total  = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
      const fmt    = parseFloat(total.toFixed(2));
      const el     = document.getElementById('dist-total-val');
      const row    = document.getElementById('dist-total-row');
      if (el) el.textContent = `${fmt}%`;
      if (row) row.className = `dist-total ${total > 100 ? 'invalid' : total === 100 ? 'valid' : 'partial'}`;
    };

    document.querySelectorAll('.dist-pct').forEach(i => i.addEventListener('input', recalc));
    recalc();

    document.getElementById('dist-form').addEventListener('submit', e => {
      e.preventDefault();
      const inputs = document.querySelectorAll('.dist-pct');
      const total  = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
      if (parseFloat(total.toFixed(2)) > 100) {
        App.toast('A soma das porcentagens não pode ultrapassar 100%.', 'error');
        return;
      }
      const rules = Array.from(inputs)
        .map(i => ({ walletId: i.dataset.wallet, percentage: parseFloat(parseFloat(i.value || 0).toFixed(2)) }))
        .filter(r => r.percentage > 0);

      DB.saveDistributions(rules);
      App.toast('Regras de distribuição salvas!', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  /* ----- Modal: Registrar faturamento ----- */
  openBillingForm() {
    const wallets       = DB.getWallets();
    const distributions = DB.getDistributions();

    if (wallets.length === 0) {
      App.toast('Crie pelo menos uma carteira primeiro.', 'error');
      return;
    }

    App.openModal('Registrar Faturamento', `
      <form id="billing-form">
        <div class="form-group">
          <label class="form-label">Valor total (R$) *</label>
          <input type="number" class="form-control" id="b-amount"
            min="0.01" step="0.01" placeholder="0,00" required autofocus>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data *</label>
            <input type="date" class="form-control" id="b-date" value="${Utils.today()}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <input type="text" class="form-control" id="b-desc" placeholder="Opcional" maxlength="100">
          </div>
        </div>

        <div id="b-preview" style="margin-top:4px"></div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar e Distribuir</button>
        </div>
      </form>
    `);

    const updatePreview = () => {
      const amount  = parseFloat(document.getElementById('b-amount')?.value || 0);
      const preview = document.getElementById('b-preview');
      if (!preview) return;
      if (!amount || amount <= 0 || distributions.length === 0) {
        preview.innerHTML = distributions.length === 0
          ? `<p class="form-hint" style="margin-bottom:12px">Sem regras de distribuição configuradas. Configure primeiro em <strong>Faturamento → Editar</strong>.<br>O valor será lançado como receita em nenhuma carteira se não houver regras.</p>`
          : '';
        return;
      }
      let distributed = 0;
      const allBoxes = DB.getBoxes();
      const items = distributions.map(d => {
        const w = wallets.find(x => x.id === d.walletId);
        const a = parseFloat((amount * d.percentage / 100).toFixed(2));
        distributed += a;
        
        let html = `<div class="dist-rule" style="margin-bottom:4px">
          <span class="color-dot" style="background:${w?.color||'#ccc'}"></span>
          <span class="dist-rule-wallet">${Utils.escapeHtml(w?.name||'?')}</span>
          <span class="dist-rule-pct">${Utils.formatBRL(a)}</span>
        </div>`;

        // Cascading to boxes
        const wBoxes = allBoxes.filter(b => b.walletId === d.walletId && b.percentage > 0);
        if (wBoxes.length > 0) {
          html += `<div style="padding-left:24px;margin-bottom:8px">`;
          wBoxes.forEach(b => {
            const bAmount = (a * b.percentage / 100).toFixed(2);
            html += `<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-secondary);padding:2px 0">
              <span>↳ 📦 ${Utils.escapeHtml(b.name)} (${b.percentage}%)</span>
              <span style="font-weight:600">${Utils.formatBRL(parseFloat(bAmount))}</span>
            </div>`;
          });
          html += `</div>`;
        }
        return html;
      });
      const remainder = parseFloat((amount - distributed).toFixed(2));
      preview.innerHTML = `
        <p style="font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">
          Preview de Distribuição
        </p>
        ${items.join('')}
        ${remainder > 0.01
          ? `<div class="dist-rule" style="background:var(--warning-light);border-color:#e8dcb2">
               <span style="flex:1;color:var(--warning-text);font-weight:500">Não distribuído</span>
               <span style="color:var(--warning-text);font-weight:600">${Utils.formatBRL(remainder)}</span>
             </div>`
          : ''}
      `;
    };

    document.getElementById('b-amount')?.addEventListener('input', updatePreview);
    updatePreview();

    document.getElementById('billing-form').addEventListener('submit', e => {
      e.preventDefault();
      const amount      = parseFloat(document.getElementById('b-amount').value);
      const date        = document.getElementById('b-date').value || Utils.today();
      const description = document.getElementById('b-desc').value.trim();

      if (!amount || amount <= 0) return;

      const distResults = distributions.map(d => ({
        walletId:   d.walletId,
        percentage: d.percentage,
        amount:     parseFloat((amount * d.percentage / 100).toFixed(2)),
      })).filter(d => d.amount > 0);

      const billing = DB.addBilling({ amount, date, description, distributions: distResults });

      // Lançar as transações de entrada para cada carteira e repassar para as caixinhas
      const allBoxes = DB.getBoxes();
      distResults.forEach(d => {
        DB.addTransaction({
          type:        'income',
          amount:      d.amount,
          walletId:    d.walletId,
          date,
          description: description ? `Faturamento: ${description}` : 'Faturamento',
          categoryId:  'c_faturamento',
          billingId:   billing.id,
        });

        const wBoxes = allBoxes.filter(b => b.walletId === d.walletId && b.percentage > 0);
        wBoxes.forEach(b => {
          const boxAmt = parseFloat((d.amount * b.percentage / 100).toFixed(2));
          if (boxAmt > 0) {
            DB.addBoxTransaction({ boxId: b.id, type: 'in', amount: boxAmt, billingId: billing.id });
          }
        });
      });

      App.toast(`Faturamento de ${Utils.formatBRL(amount)} registrado!`, 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  confirmDelete(id) {
    App.confirm(
      'Excluir faturamento?',
      'Isso irá remover o registro e TODAS as transações geradas por este faturamento.',
      () => {
        DB.deleteBilling(id);
        App.toast('Faturamento excluído.', 'success');
        this.render(document.getElementById('content'));
      }
    );
  },
};
