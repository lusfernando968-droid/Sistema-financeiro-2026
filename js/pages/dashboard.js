/* ============================================================
   pages/dashboard.js
   ============================================================ */
/* ============================================================
   pages/dashboard.js — Visão Geral (Redesign Mobile-first)
   ============================================================ */
const DashboardPage = {
  _chartState: { metric: 'saldo', time: 'month' },
  _chartInstance: null,
  _pieChartInstance: null,
  _annualBillingChartInstance: null,
  _selectedMonth: null,
  _selectedBillingYear: null,
  _selectedBillingMonth: null,
  _billingDetailsOpen: false,
  _annualViewMode: 'billing', // 'billing' | 'expenses' | 'compare'

  render(container) {
    const prevScroll = container ? container.scrollTop : 0;
    if (this._chartInstance) {
      this._chartInstance.destroy();
      this._chartInstance = null;
    }
    if (this._pieChartInstance) {
      this._pieChartInstance.destroy();
      this._pieChartInstance = null;
    }
    if (this._annualBillingChartInstance) {
      this._annualBillingChartInstance.destroy();
      this._annualBillingChartInstance = null;
    }

    const wallets = DB.getWallets();
    const transactions = DB.getTransactions();
    const credit = DB.getCreditSummary();
    const debts = DB.getDebtSummary();
    if (!this._selectedMonth) {
      this._selectedMonth = Utils.currentMonthKey();
    }
    if (!this._selectedBillingYear) {
      this._selectedBillingYear = new Date().getFullYear();
    }
    const annualBilling = this._getAnnualBillingData(this._selectedBillingYear, transactions);
    const annualExpenses = this._getAnnualExpensesData(this._selectedBillingYear, transactions);
    const annualMode = this._annualViewMode || 'billing';
    const activeAnnualData = annualMode === 'expenses' ? annualExpenses : annualBilling;
    const monthKey = this._selectedMonth;
    const mNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mParts = monthKey.split('-');
    const monthText = `${mNames[parseInt(mParts[1])-1]} de ${mParts[0]}`;

    const totalBalance = wallets.reduce((s, w) => s + DB.getWalletBalance(w.id), 0);
    const monthTxs = transactions.filter(t => t.date?.startsWith(monthKey));
    const monthIncome  = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthResult  = monthIncome - monthExpense;

    // Índice de Saúde Financeira (simples)
    const netWorth = totalBalance - debts.totalRemaining;
    const isHealthy = netWorth > 0 && credit.utilization < 70;

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:16px; display:flex; flex-direction:row; align-items:center; justify-content:space-between;">
        <div>
          <div class="page-header-title" style="font-size:24px; font-weight:700; letter-spacing:-0.6px; color:var(--text)">Olá, Luiz!</div>
          <div class="page-header-sub">Resumo das suas finanças</div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" style="width:auto; min-height:36px; padding:7px 16px; border-radius:999px; font-size:12.5px; box-shadow:0 4px 12px rgba(31,32,36,0.14);" onclick="TransactionsPage.openForm('expense')">
          + Registrar
        </button>
      </div>

      <!-- Patrimônio Principal (Inspirado no Card "Overall Information" — iDraft) -->
      <div class="card" style="margin-bottom:16px; background:#1f2024; color:#ffffff; padding:22px; border:none; border-radius:24px; box-shadow:0 12px 32px rgba(24,25,30,0.14)">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <span style="font-size:13px; font-weight:500; color:rgba(255,255,255,0.75); letter-spacing:-0.1px;">Visão Geral do Patrimônio</span>
          <a href="#/wallets" style="color:rgba(255,255,255,0.65); text-decoration:none; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
            Carteiras →
          </a>
        </div>

        <div style="display:flex; align-items:center; gap:18px; margin-bottom:18px; flex-wrap:wrap;">
          <div style="flex:1.2; min-width:160px;">
            <div style="font-size:28px; font-weight:700; letter-spacing:-1px; line-height:1.15;">${Utils.formatBRL(netWorth)}</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.55); margin-top:4px;">Patrimônio líquido acumulado</div>
          </div>
          <div style="width:1px; height:34px; background:rgba(255,255,255,0.12);"></div>
          <div style="flex:1; min-width:130px; cursor:pointer;" onclick="window.location.hash='#/credit'">
            <div style="font-size:18px; font-weight:700; letter-spacing:-0.5px; line-height:1.2;">${Utils.formatBRL(credit.totalUsed)}</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.55); margin-top:3px;">Crédito usado de ${Utils.formatBRL(credit.totalLimit)}</div>
          </div>
        </div>

        <!-- Mini-cards Claros Internos (Estilo iDraft: 3 cápsulas claras dentro do card escuro) -->
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div style="background:#e9eaee; color:#1f2024; border-radius:16px; padding:12px 8px; text-align:center;">
            <div style="width:24px; height:24px; border-radius:50%; border:1.5px solid rgba(31,32,36,0.35); display:inline-flex; align-items:center; justify-content:center; margin-bottom:6px;">
              <span style="width:6px; height:6px; border-radius:50%; background:#1f2024;"></span>
            </div>
            <div style="font-size:12.5px; font-weight:700; letter-spacing:-0.4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Utils.formatBRL(totalBalance)}</div>
            <div style="font-size:10px; font-weight:500; color:#686b73; margin-top:2px;">Saldo Contas</div>
          </div>

          <div style="background:#e9eaee; color:#1f2024; border-radius:16px; padding:12px 8px; text-align:center;">
            <div style="width:24px; height:24px; border-radius:50%; border:1.5px dashed rgba(31,32,36,0.45); display:inline-flex; align-items:center; justify-content:center; margin-bottom:6px; font-size:11px; font-weight:700;">
              ↗
            </div>
            <div style="font-size:12.5px; font-weight:700; letter-spacing:-0.4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Utils.formatBRL(monthIncome)}</div>
            <div style="font-size:10px; font-weight:500; color:#686b73; margin-top:2px;">Entradas (Mês)</div>
          </div>

          <div style="background:#e9eaee; color:#1f2024; border-radius:16px; padding:12px 8px; text-align:center; cursor:pointer;" onclick="window.location.hash='#/debts'">
            <div style="width:24px; height:24px; border-radius:50%; border:1.5px solid rgba(31,32,36,0.35); display:inline-flex; align-items:center; justify-content:center; margin-bottom:6px; font-size:11px; font-weight:700;">
              ↘
            </div>
            <div style="font-size:12.5px; font-weight:700; letter-spacing:-0.4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Utils.formatBRL(debts.totalRemaining)}</div>
            <div style="font-size:10px; font-weight:500; color:#686b73; margin-top:2px;">Total Dívidas</div>
          </div>
        </div>
      </div>

      <!-- Resumo Rápido de Saídas do Mês & Uso de Crédito -->
      <div class="stats-grid" style="grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px">
        <div class="stat-card" style="padding:14px 16px">
          <div class="stat-label" style="text-transform:none; font-size:11.5px; color:var(--text-secondary)">Saídas (Mês)</div>
          <div class="stat-value" style="font-size:16px; color:var(--text)">↘ ${Utils.formatBRL(monthExpense)}</div>
        </div>
        <div class="stat-card" style="padding:14px 16px; cursor:pointer" onclick="window.location.hash='#/credit'">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <div class="stat-label" style="text-transform:none; font-size:11.5px; color:var(--text-secondary); margin-bottom:2px">Limite Utilizado</div>
            <span style="font-size:11px; font-weight:600; color:var(--text)">${Math.round(credit.utilization)}%</span>
          </div>
          <div class="progress-bar" style="height:5px; margin-top:8px; background:var(--border-subtle); border-radius:999px">
            <div class="progress-fill" style="width:${Math.min(100, credit.utilization)}%; background:var(--text); border-radius:999px"></div>
          </div>
        </div>
      </div>

      <!-- Card Dedicado: Faturamento Anual & Despesas Anuais -->
      <div class="card" style="margin-bottom:14px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border:1px solid var(--border-subtle)">
        <div class="card-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div class="card-title" style="font-size:13px; color:var(--text-secondary)">
              ${annualMode === 'expenses' ? 'Despesas Anuais' : annualMode === 'compare' ? 'Faturamento vs. Despesas' : 'Faturamento Anual'}
            </div>
            <div style="font-size:11px; font-weight:500; color:var(--text-tertiary); margin-top:2px">
              ${annualMode === 'expenses' ? 'Evolução mensal e média de gastos do período' : annualMode === 'compare' ? 'Comparativo mensal e saldo líquido no ano' : 'Evolução mensal e média do período'}
            </div>
          </div>
          <div style="display:inline-flex; align-items:center; background:var(--bg); border-radius:8px; padding:2px; border:1px solid var(--border-subtle);">
            <button type="button" id="btn-billing-prev-year" title="Ano anterior" style="width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:var(--text-secondary); cursor:pointer; border-radius:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <span style="font-size:12px; font-weight:600; color:var(--text); padding:0 8px; min-width:44px; text-align:center;">${this._selectedBillingYear}</span>
            <button type="button" id="btn-billing-next-year" title="Próximo ano" style="width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:none; background:transparent; color:var(--text-secondary); cursor:pointer; border-radius:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>

        <div class="card-body" style="padding:16px;">
          <!-- Seletor de Modo Anual (Segmented Control estilo iOS) -->
          <div style="display:flex; background:var(--bg); border-radius:8px; padding:4px; gap:2px; margin-bottom:14px;">
            <button type="button" class="btn btn-ghost btn-sm annual-mode-btn ${annualMode === 'billing' ? 'active' : ''}" data-mode="billing" style="flex:1; font-size:11px; padding:6px 8px; white-space:nowrap; border-radius:6px; ${annualMode === 'billing' ? 'background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,0.06);color:var(--text);font-weight:600;' : 'color:var(--text-tertiary);'}">Faturamento</button>
            <button type="button" class="btn btn-ghost btn-sm annual-mode-btn ${annualMode === 'expenses' ? 'active' : ''}" data-mode="expenses" style="flex:1; font-size:11px; padding:6px 8px; white-space:nowrap; border-radius:6px; ${annualMode === 'expenses' ? 'background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,0.06);color:var(--text);font-weight:600;' : 'color:var(--text-tertiary);'}">Despesas Anuais</button>
            <button type="button" class="btn btn-ghost btn-sm annual-mode-btn ${annualMode === 'compare' ? 'active' : ''}" data-mode="compare" style="flex:1; font-size:11px; padding:6px 8px; white-space:nowrap; border-radius:6px; ${annualMode === 'compare' ? 'background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,0.06);color:var(--text);font-weight:600;' : 'color:var(--text-tertiary);'}">Comparativo</button>
          </div>

          <!-- Resumo Anual -->
          ${annualMode === 'compare' ? `
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; text-align:center;">
              <div style="background:var(--bg); padding:10px 6px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600;">Faturamento</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:3px">↗ ${Utils.formatBRL(annualBilling.totalAnnual)}</div>
              </div>
              <div style="background:var(--bg); padding:10px 6px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600;">Despesas</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:3px">↘ ${Utils.formatBRL(annualExpenses.totalAnnual)}</div>
              </div>
              <div style="background:var(--bg); padding:10px 6px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600;">Saldo no Ano</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:3px">${Utils.formatBRL(annualBilling.totalAnnual - annualExpenses.totalAnnual)}</div>
              </div>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; text-align:center;">
              <div style="background:var(--bg); padding:10px 6px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600;">Total no Ano</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:3px">${Utils.formatBRL(activeAnnualData.totalAnnual)}</div>
              </div>
              <div style="background:var(--bg); padding:10px 6px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600;">Média Mensal</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:3px">${Utils.formatBRL(activeAnnualData.avgMonthly)}</div>
              </div>
              <div style="background:var(--bg); padding:10px 6px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600;">${annualMode === 'expenses' ? 'Maior Gasto' : 'Melhor Mês'}</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:3px">${activeAnnualData.bestMonth ? `${activeAnnualData.bestMonth.label} · ${Utils.formatBRL(activeAnnualData.bestMonth.amount)}` : '—'}</div>
              </div>
            </div>
          `}

          <div class="chart-canvas-wrapper short" style="height:220px; position:relative;">
            <canvas id="annual-billing-chart" style="cursor:pointer;"></canvas>
          </div>

          <details id="annual-billing-details" class="details-animated" ${this._billingDetailsOpen ? 'open' : ''} style="margin-top:14px; text-align:center;">
            <summary class="btn btn-ghost btn-sm" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; list-style:none; color:var(--text-secondary); margin:0 auto;">
              <span id="annual-billing-summary-label">${
                this._billingDetailsOpen
                  ? (annualMode === 'expenses' ? 'Ocultar Categorias' : annualMode === 'compare' ? 'Ocultar Comparativo' : 'Ocultar Distribuição')
                  : (annualMode === 'expenses' ? 'Ver Categorias e Meses' : annualMode === 'compare' ? 'Ver Comparativo por Mês' : 'Ver Distribuição e Meses')
              }</span>
              <svg class="details-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>

            ${annualMode === 'compare' ? (() => {
              const activeCompareMonths = annualBilling.monthlyData.filter((m, idx) => m.amount > 0 || annualExpenses.monthlyData[idx].amount > 0);
              return `
                <div style="margin-top:12px; text-align:left; display:grid; grid-template-columns:1fr; gap:6px;">
                  ${activeCompareMonths.length === 0
                    ? `<div style="text-align:center; color:var(--text-tertiary); font-size:13px; padding:10px 0;">Nenhuma movimentação registrada em ${this._selectedBillingYear}.</div>`
                    : activeCompareMonths.map(m => {
                        const expAmt = annualExpenses.monthlyData[m.monthIndex]?.amount || 0;
                        const netAmt = m.amount - expAmt;
                        return `
                          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px; border-bottom:1px solid var(--border-subtle); padding:8px 10px;">
                            <span style="color:var(--text); font-weight:600; min-width:78px;">${m.fullName}</span>
                            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
                              <span style="color:var(--text-secondary);">↗ ${Utils.formatBRL(m.amount)}</span>
                              <span style="color:var(--text-tertiary);">↘ ${Utils.formatBRL(expAmt)}</span>
                              <span style="font-weight:700; color:var(--text); background:var(--bg); padding:2px 8px; border-radius:6px;">${Utils.formatBRL(netAmt)}</span>
                            </div>
                          </div>
                        `;
                      }).join('')
                  }
                </div>
              `;
            })() : (() => {
              const selIdx = this._selectedBillingMonth;
              const activeMonthsList = activeAnnualData.monthlyData.filter(m => m.amount > 0);
              const selectedMonthObj = selIdx !== null ? activeAnnualData.monthlyData[selIdx] : null;
              const currentBreakdown = selectedMonthObj ? selectedMonthObj.breakdown : activeAnnualData.annualBreakdown;
              const currentTotal = selectedMonthObj ? selectedMonthObj.amount : activeAnnualData.totalAnnual;
              const periodLabel = selectedMonthObj ? `${selectedMonthObj.fullName} de ${this._selectedBillingYear}` : `Ano ${this._selectedBillingYear} (Acumulado)`;
              const monoShades = ['#111111', '#555555', '#8e8e93', '#b5b5b8', '#d1d1d6'];
              const isExpMode = annualMode === 'expenses';

              return `
                <div style="margin-top:14px; text-align:left; background:var(--bg); border-radius:12px; padding:14px; border:1px solid var(--border-subtle);">
                  <!-- Seletor Rápido de Mês (Pílulas estilo iOS) -->
                  ${activeMonthsList.length > 0 ? `
                    <div style="display:flex; align-items:center; gap:6px; overflow-x:auto; padding-bottom:10px; margin-bottom:10px; border-bottom:1px solid var(--border-subtle);">
                      <button type="button" class="billing-month-pill" data-month-idx="" style="border:1px solid ${selIdx === null ? 'var(--text)' : 'var(--border)'}; background:${selIdx === null ? 'var(--text)' : 'var(--surface)'}; color:${selIdx === null ? 'var(--bg)' : 'var(--text-secondary)'}; font-size:11px; font-weight:600; padding:4px 10px; border-radius:999px; cursor:pointer; white-space:nowrap; transition:0.15s;">
                        Ano Todo
                      </button>
                      ${activeMonthsList.map(m => {
                        const isSel = selIdx === m.monthIndex;
                        return `
                          <button type="button" class="billing-month-pill" data-month-idx="${m.monthIndex}" style="border:1px solid ${isSel ? 'var(--text)' : 'var(--border)'}; background:${isSel ? 'var(--text)' : 'var(--surface)'}; color:${isSel ? 'var(--bg)' : 'var(--text-secondary)'}; font-size:11px; font-weight:600; padding:4px 10px; border-radius:999px; cursor:pointer; white-space:nowrap; transition:0.15s;">
                            ${m.label}
                          </button>
                        `;
                      }).join('')}
                    </div>
                  ` : ''}

                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div>
                      <div style="font-size:11px; font-weight:600; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.4px;">
                        ${isExpMode ? 'Despesas por Categoria' : 'Distribuição da Receita'}
                      </div>
                      <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:1px;">${periodLabel}</div>
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:10px; color:var(--text-tertiary);">${isExpMode ? 'Total Gasto' : 'Total Faturado'}</div>
                      <div style="font-size:13px; font-weight:700; color:var(--text);">${Utils.formatBRL(currentTotal)}</div>
                    </div>
                  </div>

                  ${currentBreakdown.length === 0
                    ? `<div style="font-size:12px; color:var(--text-tertiary); text-align:center; padding:8px 0;">${isExpMode ? 'Nenhuma despesa registrada neste período.' : 'Nenhuma distribuição registrada neste período.'}</div>`
                    : `
                      <!-- Barra de Proporção Segmentada -->
                      <div style="display:flex; height:8px; width:100%; border-radius:999px; overflow:hidden; background:var(--border-subtle); margin-bottom:12px; gap:2px;">
                        ${currentBreakdown.map((item, i) => `
                          <div style="width:${Math.max(2, item.percentage).toFixed(1)}%; background:${monoShades[i % monoShades.length]}; height:100%;" title="${Utils.escapeHtml(isExpMode ? item.categoryName : item.walletName)}: ${item.percentage.toFixed(1)}%"></div>
                        `).join('')}
                      </div>

                      <!-- Lista de Categorias ou Carteiras -->
                      <div style="display:flex; flex-direction:column; gap:8px;">
                        ${currentBreakdown.map((item, i) => `
                          <div style="background:var(--surface); border:1px solid var(--border-subtle); border-radius:8px; padding:10px 12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                              <div style="display:flex; align-items:center; gap:8px;">
                                <span style="width:10px; height:10px; border-radius:50%; background:${monoShades[i % monoShades.length]}; flex-shrink:0;"></span>
                                <span style="font-size:13px; font-weight:600; color:var(--text);">${Utils.escapeHtml(isExpMode ? item.categoryName : item.walletName)}</span>
                                <span style="font-size:11px; font-weight:700; color:var(--text); background:var(--bg); border:1px solid var(--border-subtle); padding:1px 7px; border-radius:999px;">${item.percentage.toFixed(1)}%</span>
                              </div>
                              <span style="font-size:13px; font-weight:700; color:var(--text);">${Utils.formatBRL(item.amount)}</span>
                            </div>
                            ${!isExpMode && item.boxes && item.boxes.length > 0 ? `
                              <div style="margin-top:6px; padding-top:6px; border-top:1px dashed var(--border-subtle); display:flex; flex-wrap:wrap; gap:6px;">
                                ${item.boxes.map(bx => `
                                  <span style="font-size:11px; color:var(--text-secondary); background:var(--bg); padding:2px 8px; border-radius:6px;">
                                    ↳ ${Utils.escapeHtml(bx.boxName)}: <strong>${bx.percentage}%</strong> (${Utils.formatBRL(bx.amount)})
                                  </span>
                                `).join('')}
                              </div>
                            ` : ''}
                            ${isExpMode && item.wallets && item.wallets.length > 0 ? `
                              <div style="margin-top:6px; padding-top:6px; border-top:1px dashed var(--border-subtle); display:flex; flex-wrap:wrap; gap:6px;">
                                ${item.wallets.map(w => `
                                  <span style="font-size:11px; color:var(--text-secondary); background:var(--bg); padding:2px 8px; border-radius:6px;">
                                    ↳ ${Utils.escapeHtml(w.walletName)}: <strong>${w.percentage}%</strong> (${Utils.formatBRL(w.amount)})
                                  </span>
                                `).join('')}
                              </div>
                            ` : ''}
                          </div>
                        `).join('')}
                      </div>
                    `
                  }
                </div>

                <div id="annual-billing-legend" style="margin-top:12px; text-align:left; display:grid; grid-template-columns:1fr; gap:6px;">
                  ${activeAnnualData.totalAnnual === 0
                    ? `<div style="text-align:center; color:var(--text-tertiary); font-size:13px; padding:10px 0;">${isExpMode ? 'Nenhuma despesa registrada em ' : 'Nenhum faturamento registrado em '}${this._selectedBillingYear}.</div>`
                    : activeAnnualData.monthlyData.filter(m => m.amount > 0).map(m => {
                        const pct = activeAnnualData.totalAnnual > 0 ? ((m.amount / activeAnnualData.totalAnnual) * 100).toFixed(1) : '0.0';
                        const isBest = activeAnnualData.bestMonth && activeAnnualData.bestMonth.monthIndex === m.monthIndex;
                        const isSelected = this._selectedBillingMonth === m.monthIndex;
                        return `
                          <div class="billing-month-row" data-month-idx="${m.monthIndex}" style="display:flex; justify-content:space-between; align-items:center; font-size:13px; border-bottom:1px solid var(--border-subtle); background:${isSelected ? 'var(--bg)' : 'transparent'}; border-radius:${isSelected ? '8px' : '0'}; padding:8px 10px; cursor:pointer; transition:0.15s;">
                            <div style="display:flex; align-items:center; gap:8px;">
                              <div style="width:10px; height:10px; border-radius:50%; background:${isBest || isSelected ? 'var(--text)' : 'var(--text-tertiary)'}"></div>
                              <span style="color:var(--text-secondary); font-weight:${isBest || isSelected ? '600' : '400'}">${m.fullName}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px;">
                              <span style="font-size:11px; color:var(--text-tertiary)">${pct}% do ano</span>
                              <span style="font-weight:600; color:var(--text)">${Utils.formatBRL(m.amount)}</span>
                            </div>
                          </div>
                        `;
                      }).join('')
                  }
                </div>
              `;
            })()}
          </details>
        </div>
      </div>

      <!-- Gráfico de Pizza: Despesas por Categoria -->
      <div class="card" style="margin-bottom:14px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border:1px solid var(--border-subtle)">
        <div class="card-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom:12px; display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div class="card-title" style="font-size:13px; color:var(--text-secondary)">Despesas por Categoria</div>
            <div style="font-size:11px; font-weight:500; color:var(--text-tertiary); margin-top:3px">${monthText}</div>
          </div>
          <div style="position:relative; width:22px; height:22px; color:var(--text-secondary); cursor:pointer;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <input type="month" id="dashboard-month-picker" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;" value="${monthKey}">
          </div>
        </div>
        <div class="card-body" style="padding:16px; text-align:center;">
          <div style="position:relative; width:100%; min-height:200px; max-height:250px; display:flex; justify-content:center;">
            <canvas id="expenses-pie-chart"></canvas>
          </div>
          <details class="details-animated" style="margin-top:16px;">
            <summary class="btn btn-ghost btn-sm" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; list-style:none; color:var(--text-secondary); margin:0 auto;">
              Ver Dados
              <svg class="details-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div id="pie-chart-legend" style="margin-top:16px; text-align:left; display:grid; grid-template-columns: 1fr; gap:10px;"></div>
          </details>
        </div>
      </div>

      <!-- Resumo Caixinhas no Dashboard -->
      ${(() => {
        const boxes = DB.getBoxes();
        if (boxes.length === 0) return '';
        const boxTxs = DB.getBoxTransactions();
        const monthBoxTxs = boxTxs.filter(bt => bt.createdAt && bt.createdAt.substring(0, 7) === monthKey);
        const monthBoxExpenses = monthTxs.filter(t => t.type === 'expense' && t.boxId);

        const totalAllocated = boxes.reduce((s, b) => s + DB.getBoxBalance(b.id), 0);
        const monthIn = monthBoxTxs.filter(bt => bt.type === 'in').reduce((s, bt) => s + Number(bt.amount), 0);
        const monthOut = monthBoxTxs.filter(bt => bt.type === 'out').reduce((s, bt) => s + Number(bt.amount), 0) +
                         monthBoxExpenses.reduce((s, t) => s + Number(t.amount), 0);

        return `
          <div class="card" style="margin-bottom:14px">
            <div class="card-header" style="padding-bottom:10px">
              <div style="display:flex; align-items:center; gap:8px">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
                <div>
                  <span class="card-title" style="font-size:14px">Arquitetura Financeira</span>
                  <div style="font-size:11px; color:var(--text-tertiary)">Resumo das Caixinhas no Mês</div>
                </div>
              </div>
              <a href="#/architecture" class="btn btn-ghost btn-sm" style="font-size:11px">Ver tudo →</a>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin:10px 0; text-align:center">
              <div style="background:var(--bg); padding:8px 6px; border-radius:8px">
                <div style="font-size:10px; color:var(--text-tertiary)">Total Alocado</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:2px">${Utils.formatBRL(totalAllocated)}</div>
              </div>
              <div style="background:var(--bg); padding:8px 6px; border-radius:8px">
                <div style="font-size:10px; color:var(--text-tertiary)">Aportes (Mês)</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:2px">↗ ${Utils.formatBRL(monthIn)}</div>
              </div>
              <div style="background:var(--bg); padding:8px 6px; border-radius:8px">
                <div style="font-size:10px; color:var(--text-tertiary)">Saídas (Mês)</div>
                <div style="font-size:13px; font-weight:600; color:var(--text); margin-top:2px">↘ ${Utils.formatBRL(monthOut)}</div>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px">
              ${boxes.map(b => {
                const wallet = wallets.find(w => w.id === b.walletId);
                const walletName = wallet ? wallet.name : '';
                const pct = Number(b.percentage) || 0;
                const bal = DB.getBoxBalance(b.id);
                const bIn = monthBoxTxs.filter(bt => bt.boxId === b.id && bt.type === 'in').reduce((s, bt) => s + Number(bt.amount), 0);
                const bOut = monthBoxTxs.filter(bt => bt.boxId === b.id && bt.type === 'out').reduce((s, bt) => s + Number(bt.amount), 0) +
                             monthBoxExpenses.filter(t => t.boxId === b.id).reduce((s, t) => s + Number(t.amount), 0);

                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--bg); border-radius:8px; font-size:12px; border-left: 2px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:8px; min-width:0; overflow:hidden">
                      <div style="min-width:0">
                        <div style="display:flex; align-items:center; gap:6px">
                          <span style="font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${Utils.escapeHtml(b.name)}</span>
                          ${pct > 0 ? `<span style="font-size:10px; font-weight:500; color:var(--text-secondary); background:var(--border-subtle); padding:1px 5px; border-radius:4px; flex-shrink:0">${pct}%</span>` : ''}
                        </div>
                        <div style="font-size:10.5px; color:var(--text-tertiary)">${Utils.escapeHtml(walletName)}</div>
                      </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:8px">
                      ${bIn > 0 ? `<span style="font-size:10.5px; color:var(--text-secondary)">↗ ${Utils.formatBRL(bIn)}</span>` : ''}
                      ${bOut > 0 ? `<span style="font-size:10.5px; color:var(--text-secondary)">↘ ${Utils.formatBRL(bOut)}</span>` : ''}
                      <span style="font-weight:600; font-size:12.5px; color:var(--text)">${Utils.formatBRL(bal)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      })()}

      ${wallets.length === 0
        ? `<div class="card" style="margin-bottom:14px">
             <div class="empty-state">
               <div class="empty-state-icon">◈</div>
               <div class="empty-state-text">Nenhuma carteira criada</div>
               <a href="#/wallets" class="btn btn-primary btn-sm" style="margin-top:8px">Criar carteira</a>
             </div>
           </div>`
        : `
          <div class="card" style="margin-bottom:14px">
            <div class="card-header" style="flex-direction:column; align-items:stretch; gap:12px; padding-bottom:12px">
              <div style="display:flex; justify-content:space-between; align-items:center">
                <span class="card-title">Análise Histórica</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px">
                <!-- Filtros Métrica -->
                <div style="display:flex; background:var(--bg); border-radius:8px; padding:4px; overflow-x:auto; gap:2px">
                  <button class="btn btn-ghost btn-sm chart-metric-btn ${this._chartState.metric === 'saldo' ? 'active' : ''}" data-metric="saldo" style="flex:1; font-size:11px; padding:6px; white-space:nowrap; ${this._chartState.metric === 'saldo' ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">Saldo Contas</button>
                  <button class="btn btn-ghost btn-sm chart-metric-btn ${this._chartState.metric === 'patrimonio' ? 'active' : ''}" data-metric="patrimonio" style="flex:1; font-size:11px; padding:6px; white-space:nowrap; ${this._chartState.metric === 'patrimonio' ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">Patrimônio</button>
                  <button class="btn btn-ghost btn-sm chart-metric-btn ${this._chartState.metric === 'despesas' ? 'active' : ''}" data-metric="despesas" style="flex:1; font-size:11px; padding:6px; white-space:nowrap; ${this._chartState.metric === 'despesas' ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">Despesas</button>
                  <button class="btn btn-ghost btn-sm chart-metric-btn ${this._chartState.metric === 'caixinhas' ? 'active' : ''}" data-metric="caixinhas" style="flex:1; font-size:11px; padding:6px; white-space:nowrap; ${this._chartState.metric === 'caixinhas' ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">Caixinhas</button>
                </div>
                <!-- Filtros Tempo -->
                <div style="display:flex; background:var(--bg); border-radius:8px; padding:4px">
                  <button class="btn btn-ghost btn-sm chart-time-btn ${this._chartState.time === 'day' ? 'active' : ''}" data-time="day" style="flex:1; font-size:11px; padding:6px; ${this._chartState.time === 'day' ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">30 Dias</button>
                  <button class="btn btn-ghost btn-sm chart-time-btn ${this._chartState.time === 'month' ? 'active' : ''}" data-time="month" style="flex:1; font-size:11px; padding:6px; ${this._chartState.time === 'month' ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">6 Meses</button>
                  <button class="btn btn-ghost btn-sm chart-time-btn ${this._chartState.time === 'year' ? 'active' : ''}" data-time="year" style="flex:1; font-size:11px; padding:6px; ${this._chartState.time === 'year' ? 'background:var(--card-bg);box-shadow:0 1px 2px rgba(0,0,0,0.05);color:var(--text)' : 'color:var(--text-tertiary)'}">5 Anos</button>
                </div>
              </div>
            </div>
            <div class="chart-canvas-wrapper short" style="height:220px; padding:12px"><canvas id="unified-chart"></canvas></div>
          </div>
        `
      }

      ${(() => {
        // Obter nomes exatos das categorias do usuário
        const allCats = DB.getCategories();
        const getId = (nameMatch, type) => {
          const c = allCats.find(c => c.type === type && c.name.toLowerCase().includes(nameMatch.toLowerCase()));
          return c ? c.id : null;
        };

        const idTransporte = getId('transporte', 'expense');
        const idAlimentacao = getId('alimentaç', 'expense') || getId('alimentac', 'expense');
        const idPessoas = getId('pessoa', 'expense') || getId('funcionári', 'expense');

        const now = new Date();
        const currentMonthKey = Utils.currentMonthKey();
        
        // Mês Passado
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthKey = lastMonthDate.toISOString().substring(0, 7);

        // Função auxiliar para soma de categoria num mês
        const sumCat = (catId, monthKey) => {
          if (!catId) return 0;
          return transactions.filter(t => t.type === 'expense' && t.categoryId === catId && t.date?.startsWith(monthKey))
                             .reduce((s, t) => s + t.amount, 0);
        };

        // 1. Transporte (Mês Passado)
        const transpLastMonth = sumCat(idTransporte, lastMonthKey);

        // 2. Média Alimentação (Últimos 3 meses - excluindo o atual que está rodando)
        let sumAlim = 0;
        let sumPes = 0;
        for (let i = 1; i <= 3; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const mk = d.toISOString().substring(0, 7);
          sumAlim += sumCat(idAlimentacao, mk);
          sumPes += sumCat(idPessoas, mk);
        }
        const avgAlimentacao = sumAlim / 3;
        const avgPessoas = sumPes / 3;

        // 4. Caixinha de destaque (maior saldo)
        const boxes = DB.getBoxes();
        let topBox = null;
        let topBoxBal = 0;
        boxes.forEach(b => {
          const bal = DB.getBoxBalance(b.id);
          if (bal >= topBoxBal) { topBoxBal = bal; topBox = b; }
        });

        return `
        <div class="card" style="margin-bottom:20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border:1px solid var(--border-subtle)">
          <div class="card-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom:12px">
            <span class="card-title" style="font-size:13px; color:var(--text-secondary)">Indicadores Pessoais</span>
          </div>
          <div class="card-body" style="padding:16px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              
              <!-- Transporte Mês Passado -->
              <div style="background:var(--bg); padding:12px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600; margin-bottom:4px">Transporte (Mês Anterior)</div>
                <div style="font-size:16px; font-weight:600; color:var(--text)">${Utils.formatBRL(transpLastMonth)}</div>
                <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px">Fechamento total</div>
              </div>

              <!-- Média Alimentação -->
              <div style="background:var(--bg); padding:12px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600; margin-bottom:4px">Alimentação (Média)</div>
                <div style="font-size:16px; font-weight:600; color:var(--text)">${Utils.formatBRL(avgAlimentacao)}</div>
                <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px">Média últimos 3 meses</div>
              </div>

              <!-- Média Funcionários/Pessoas -->
              <div style="background:var(--bg); padding:12px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600; margin-bottom:4px">Pessoas/Equipe (Média)</div>
                <div style="font-size:16px; font-weight:600; color:var(--text)">${Utils.formatBRL(avgPessoas)}</div>
                <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px">Média últimos 3 meses</div>
              </div>

              <!-- Caixinha Principal -->
              <div style="background:var(--bg); padding:12px; border-radius:8px;">
                <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; font-weight:600; margin-bottom:4px">Caixinha: ${topBox ? Utils.escapeHtml(topBox.name) : 'Nenhuma'}</div>
                <div style="font-size:16px; font-weight:600; color:var(--text)">${Utils.formatBRL(topBoxBal)}</div>
                <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px">Saldo acumulado</div>
              </div>

            </div>
          </div>
        </div>
        `;
      })()}
    `;

    if (wallets.length > 0) {
      this._renderUnifiedChart(transactions);
      this._renderExpensesPieChart(monthTxs);

      document.querySelectorAll('.chart-metric-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this._chartState.metric = e.currentTarget.dataset.metric;
          this.render(document.getElementById('content'));
        });
      });

      document.querySelectorAll('.chart-time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this._chartState.time = e.currentTarget.dataset.time;
          this.render(document.getElementById('content'));
        });
      });
    }

    this._renderAnnualBillingChart(annualBilling, annualExpenses);

    document.querySelectorAll('.annual-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        if (mode && this._annualViewMode !== mode) {
          this._annualViewMode = mode;
          this._selectedBillingMonth = null;
          this.render(document.getElementById('content'));
        }
      });
    });

    document.getElementById('btn-billing-prev-year')?.addEventListener('click', () => {
      this._selectedBillingYear -= 1;
      this._selectedBillingMonth = null;
      this.render(document.getElementById('content'));
    });

    document.getElementById('btn-billing-next-year')?.addEventListener('click', () => {
      this._selectedBillingYear += 1;
      this._selectedBillingMonth = null;
      this.render(document.getElementById('content'));
    });

    document.querySelectorAll('.billing-month-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const raw = e.currentTarget.dataset.monthIdx;
        const idx = raw === '' ? null : parseInt(raw, 10);
        this._selectedBillingMonth = idx;
        this.render(document.getElementById('content'));
      });
    });

    document.querySelectorAll('.billing-month-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.monthIdx, 10);
        this._selectedBillingMonth = (this._selectedBillingMonth === idx) ? null : idx;
        this._billingDetailsOpen = true;
        this.render(document.getElementById('content'));
      });
    });

    const billingDetailsEl = document.getElementById('annual-billing-details');
    if (billingDetailsEl) {
      billingDetailsEl.addEventListener('toggle', () => {
        this._billingDetailsOpen = billingDetailsEl.open;
        const lbl = document.getElementById('annual-billing-summary-label');
        if (lbl) {
          const m = this._annualViewMode || 'billing';
          lbl.textContent = billingDetailsEl.open
            ? (m === 'expenses' ? 'Ocultar Categorias' : m === 'compare' ? 'Ocultar Comparativo' : 'Ocultar Distribuição')
            : (m === 'expenses' ? 'Ver Categorias e Meses' : m === 'compare' ? 'Ver Comparativo por Mês' : 'Ver Distribuição e Meses');
        }
      });
    }
    
    const monthPicker = document.getElementById('dashboard-month-picker');
    if (monthPicker) {
      monthPicker.addEventListener('change', (e) => {
        this._selectedMonth = e.target.value;
        this.render(document.getElementById('content'));
      });
    }

    const gbr = document.getElementById('global-btn-report');
    if (gbr) gbr.onclick = () => this.openReportModal();

    if (container && prevScroll > 0) {
      container.scrollTop = prevScroll;
    }
  },

  openReportModal() {
    App.openModal('Gerar Relatório (PDF)', `
      <form id="report-form">
        <div class="form-group">
          <label class="form-label">Mês de Referência</label>
          <input type="month" class="form-control" id="report-month" value="${Utils.currentMonthKey()}" required>
        </div>
        <div class="form-actions" style="margin-top:20px">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Gerar PDF</button>
        </div>
      </form>
    `);

    document.getElementById('report-form').addEventListener('submit', e => {
      e.preventDefault();
      const month = document.getElementById('report-month').value;
      if (month) {
        this.generatePDF(month);
        App.closeModal();
      }
    });
  },

  generatePDF(monthKey) {
    if (typeof window.jspdf === 'undefined') {
      App.toast('Biblioteca PDF não carregada. Aguarde um momento e tente novamente.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setTextColor(34, 36, 40);
    doc.text('Relatório Financeiro Mensal', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    const [year, month] = monthKey.split('-');
    doc.text(`Usuário: Luiz | Período: ${month}/${year}`, 14, 28);
    
    // Resumo de Transações
    const allTxs = DB.getTransactions();
    const txs = allTxs.filter(t => t.date && t.date.startsWith(monthKey)).sort((a,b) => (a.date||'').localeCompare(b.date||''));
    const income = txs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    const net = income - expense;
    
    // Cálculos de Insights
    const pctSpent = income > 0 ? Math.round((expense / income) * 100) : 0;
    const vol = income + expense;
    
    const expTxs = txs.filter(t => t.type === 'expense');
    const catMap = {};
    expTxs.forEach(t => {
      const cId = t.categoryId || 'sem_categoria';
      catMap[cId] = (catMap[cId] || 0) + t.amount;
    });
    let topCatAmt = 0;
    let topCatId = null;
    Object.keys(catMap).forEach(k => {
      if(catMap[k] > topCatAmt) { topCatAmt = catMap[k]; topCatId = k; }
    });
    let topCatName = 'Outros';
    if(topCatId && topCatId !== 'sem_categoria') {
      const c = DB.getCategories().find(x => x.id === topCatId);
      if(c) topCatName = c.name;
    }

    doc.setFontSize(12);
    doc.setTextColor(34, 36, 40);
    doc.text(`Total de Entradas: ${Utils.formatBRL(income)}`, 14, 40);
    doc.text(`Total de Saídas: ${Utils.formatBRL(expense)}`, 14, 46);
    doc.text(`Resultado Líquido: ${Utils.formatBRL(net)}`, 14, 52);

    // Divisão do Faturamento (Entradas agrupadas por carteira)
    let faturamentoY = 58;
    const faturamentoTxs = txs.filter(t => t.type === 'income');
    if (faturamentoTxs.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Divisão das Entradas (Por Carteira):', 14, faturamentoY);
      faturamentoY += 5;
      
      const distMap = {};
      faturamentoTxs.forEach(t => {
        const wId = t.walletId;
        distMap[wId] = (distMap[wId] || 0) + t.amount;
      });
      
      Object.keys(distMap).forEach(wId => {
        const w = DB.getWallets().find(x => x.id === wId);
        const wName = w ? w.name : 'Outros';
        doc.text(`• ${wName}: ${Utils.formatBRL(distMap[wId])}`, 18, faturamentoY);
        faturamentoY += 5;
      });
    }
    
    let baseMentorY = faturamentoY + 6; // Ajusta a posição Y do mentor baseado no tamanho da lista

    // Mentor Feedback Logic
    const realPct = income > 0 ? Math.round((expense / income) * 100) : (expense > 0 ? 100 : 0);
    let mentorTitle = 'Análise do Mês (Mentor Financeiro)';
    let mentorImpact = '';
    let mentorMessage = '';

    if (income === 0 && expense === 0) {
      mentorImpact = 'Mês Parado: Nenhuma movimentação registrada.';
      mentorMessage = 'Comece a registrar suas entradas e saídas para analisar sua saúde financeira.';
    } else if (income === 0 && expense > 0) {
      mentorImpact = 'Atenção Máxima: Só saídas, nenhuma entrada!';
      mentorMessage = 'Você gastou sem registrar nenhuma receita este mês. Cuidado para não esvaziar suas reservas.';
    } else {
      if (realPct > 100) {
        mentorImpact = `Sinal Vermelho: Você gastou ${realPct}% da sua receita este mês!`;
        mentorMessage = 'Seu custo de vida ultrapassou seus ganhos. Se isso for uma emergência, tudo bem. Mas se for rotina, é hora de cortar gastos drasticamente ou buscar novas rendas.';
      } else if (realPct >= 80) {
        mentorImpact = `Sinal Amarelo: Você já consumiu ${realPct}% da sua receita.`;
        mentorMessage = 'Sua margem de segurança está bem apertada. Cuidado com imprevistos no fim do mês! Tente manter seus gastos abaixo de 70%.';
      } else if (realPct >= 50) {
        mentorImpact = `No Caminho Certo: Você consumiu ${realPct}% da sua receita.`;
        mentorMessage = 'Ótimo equilíbrio! Você está vivendo com margem e construindo seu patrimônio. Continue direcionando a sobra para suas caixinhas de investimento.';
      } else {
        mentorImpact = `Excelente: Você gastou apenas ${realPct}% da sua receita!`;
        mentorMessage = 'Poder de poupança incrível. Com essa capacidade de reter capital, seus investimentos vão crescer muito rápido. Parabéns!';
      }
    }

    doc.setFontSize(14);
    doc.setTextColor(34, 36, 40);
    doc.text(mentorTitle, 14, baseMentorY);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(mentorImpact, 14, baseMentorY + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const splitMsg = doc.splitTextToSize(mentorMessage, 180);
    doc.text(splitMsg, 14, baseMentorY + 14);
    let yPos = baseMentorY + 14 + (splitMsg.length * 5) + 6;

    if (topCatAmt > 0) {
      doc.text(`• Sua maior área de gasto foi com "${topCatName}", totalizando ${Utils.formatBRL(topCatAmt)}.`, 14, yPos); yPos += 6;
    }
    doc.text(`• Volume financeiro total movimentado (entradas + saídas) foi de ${Utils.formatBRL(vol)}.`, 14, yPos); yPos += 12;

    // Gerar Gráfico de Categorias em Base64
    if (typeof Chart !== 'undefined' && Object.keys(catMap).length > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        canvas.style.position = 'absolute';
        canvas.style.left = '-9999px';
        document.body.appendChild(canvas);
        
        const catLabels = [];
        const catData = [];
        const bgColors = ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf'];
        const sortedCats = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
        
        sortedCats.forEach(([cId, amt]) => {
          if (amt > 0) {
            const c = DB.getCategories().find(x => x.id === cId);
            catLabels.push(c ? c.name : 'Outros');
            catData.push(amt);
          }
        });

        const chart = new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels: catLabels,
            datasets: [{
              data: catData,
              backgroundColor: bgColors,
              borderWidth: 1
            }]
          },
          options: {
            animation: false, // Fundamental para toBase64Image funcionar síncrono
            responsive: false,
            plugins: {
              legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
            }
          }
        });

        const imgData = chart.toBase64Image();
        doc.setFontSize(14);
        doc.setTextColor(34, 36, 40);
        doc.text('Distribuição de Despesas', 14, yPos);
        yPos += 4;
        doc.addImage(imgData, 'PNG', 14, yPos, 120, 60);
        yPos += 68;

        chart.destroy();
        document.body.removeChild(canvas);
      } catch(err) {
        console.error('Erro ao gerar gráfico pro PDF', err);
      }
    }

    // Seção Arquitetura Financeira (Caixinhas)
    const boxes = DB.getBoxes();
    const boxTxs = DB.getBoxTransactions();
    const monthBoxTxs = boxTxs.filter(bt => bt.createdAt && bt.createdAt.substring(0, 7) === monthKey);
    // Também verificar despesas vinculadas a caixinhas no mês
    const monthBoxExpenses = txs.filter(t => t.type === 'expense' && t.boxId);

    doc.setFontSize(14);
    doc.setTextColor(34, 36, 40);
    doc.text('Arquitetura Financeira (Caixinhas)', 14, yPos);
    yPos += 7;

    if (boxes.length > 0) {
      const boxRows = boxes.map(b => {
        const wName = DB.getWallets().find(w => w.id === b.walletId)?.name || '—';
        // Aportes via box_transactions (type 'in')
        const inAmt = monthBoxTxs.filter(bt => bt.boxId === b.id && bt.type === 'in').reduce((s, bt) => s + Number(bt.amount), 0);
        // Resgates via box_transactions (type 'out')
        const outResgate = monthBoxTxs.filter(bt => bt.boxId === b.id && bt.type === 'out').reduce((s, bt) => s + Number(bt.amount), 0);
        // Baixas/Despesas diretas ligadas a essa caixinha
        const outExpense = monthBoxExpenses.filter(t => t.boxId === b.id).reduce((s, t) => s + Number(t.amount), 0);
        const totalOut = outResgate + outExpense;
        const currentBal = DB.getBoxBalance(b.id);

        return [
          b.name,
          wName,
          Utils.formatBRL(inAmt),
          Utils.formatBRL(totalOut),
          Utils.formatBRL(currentBal)
        ];
      });

      doc.autoTable({
        startY: yPos,
        head: [['Caixinha', 'Carteira', 'Aportes (Mês)', 'Baixas/Saídas (Mês)', 'Saldo Atual']],
        body: boxRows,
        theme: 'striped',
        headStyles: { fillColor: [142, 68, 173] },
        styles: { fontSize: 9 }
      });
      yPos = doc.lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhuma caixinha configurada.', 14, yPos);
      yPos += 10;
    }

    // Tabela de Transações
    doc.setFontSize(14);
    doc.setTextColor(34, 36, 40);
    doc.text('Extrato de Movimentações', 14, yPos);
    yPos += 7;

    if (txs.length > 0) {
      const bodyData = txs.map(t => {
        let typeStr = '';
        if (t.type === 'income') typeStr = 'Entrada';
        else if (t.type === 'expense') typeStr = 'Saída';
        else typeStr = 'Transferência';
        
        const box = t.boxId ? DB.getBoxes().find(b => b.id === t.boxId) : null;
        const boxLabel = box ? ` [Caixinha: ${box.name}]` : '';

        return [
          Utils.formatDate(t.date),
          (t.description || 'S/ Descrição') + boxLabel,
          typeStr,
          Utils.formatBRL(t.amount)
        ];
      });

      doc.autoTable({
        startY: yPos,
        head: [['Data', 'Descrição', 'Tipo', 'Valor']],
        body: bodyData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Nenhuma transação registrada neste mês.', 14, yPos);
    }

    doc.save(`Relatorio_Luiz_${monthKey}.pdf`);
    App.toast('Relatório gerado com sucesso!', 'success');
  },

  _getPeriods(time) {
    const periods = [];
    const now = new Date();
    if (time === 'day') {
      for (let i=29; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const dd = String(d.getDate()).padStart(2,'0');
        periods.push({ key: `${yyyy}-${mm}-${dd}`, label: `${dd}/${mm}` });
      }
    } else if (time === 'month') {
      for (let i=5; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        periods.push({ key: `${yyyy}-${mm}`, label: `${monthNames[d.getMonth()]}/${String(yyyy).slice(2)}`, maxDate: `${yyyy}-${mm}-31` });
      }
    } else if (time === 'year') {
      for (let i=4; i>=0; i--) {
        const yyyy = now.getFullYear() - i;
        periods.push({ key: `${yyyy}`, label: `${yyyy}`, maxDate: `${yyyy}-12-31` });
      }
    }
    return periods;
  },

  _renderUnifiedChart(transactions) {
    const ctx = document.getElementById('unified-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    const { metric, time } = this._chartState;
    const isExpense = metric === 'despesas';
    const periods = this._getPeriods(time);
    const debts = DB.getDebtSummary('payable').totalRemaining;
    const receivables = DB.getDebtSummary('receivable').totalRemaining;

    let chartDatasets = [];

    if (metric === 'caixinhas') {
      const boxes = DB.getBoxes();
      const wallets = DB.getWallets();
      const boxTxs = DB.getBoxTransactions();
      const allExpenses = transactions.filter(t => t.type === 'expense');

      const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c', '#34495e'];

      chartDatasets = boxes.map((box, i) => {
        const dataPoints = periods.map(p => {
          const maxDate = p.maxDate || p.key;
          const inSum = boxTxs.filter(t => t.boxId === box.id && t.type === 'in' && (t.createdAt || '2000').substring(0, 10) <= maxDate).reduce((s,t) => s + Number(t.amount), 0);
          const outSum = boxTxs.filter(t => t.boxId === box.id && t.type === 'out' && (t.createdAt || '2000').substring(0, 10) <= maxDate).reduce((s,t) => s + Number(t.amount), 0);
          const expSum = allExpenses.filter(t => t.boxId === box.id && t.date <= maxDate).reduce((s,t) => s + Number(t.amount), 0);
          return inSum - outSum - expSum;
        });
        
        const wallet = wallets.find(w => w.id === box.walletId);
        const walletName = wallet ? wallet.name : 'Sem carteira';
        const labelStr = `${box.name} (${walletName})`;
        
        const color = colors[i % colors.length];
        return {
          label: labelStr,
          data: dataPoints,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: color,
          pointRadius: 2,
          fill: false,
          tension: 0.3
        };
      });

    } else {
      const dataPoints = periods.map(p => {
        if (metric === 'despesas') {
          const txs = transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(p.key));
          return txs.reduce((s,t) => s + t.amount, 0);
        } else {
          const maxDate = p.maxDate || p.key;
          const txs = transactions.filter(t => t.date && t.date <= maxDate);
          const inc = txs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
          const exp = txs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
          let val = inc - exp;
          if (metric === 'patrimonio') {
            val = val - debts + receivables;
          }
          return val;
        }
      });

      const colorHex = metric === 'despesas' ? '#e74c3c' : (metric === 'patrimonio' ? '#3498db' : '#1abc9c');
      const colorRgb = metric === 'despesas' ? '231, 76, 60' : (metric === 'patrimonio' ? '52, 152, 219' : '26, 188, 156');
      const labelStr = isExpense ? 'Despesas' : (metric === 'patrimonio' ? 'Patrimônio Líquido' : 'Saldo Total');

      chartDatasets = [{
        label: labelStr,
        data: dataPoints,
        borderColor: colorHex,
        backgroundColor: `rgba(${colorRgb}, 0.1)`,
        borderWidth: 2,
        pointBackgroundColor: colorHex,
        pointRadius: 3,
        fill: true,
        tension: 0.3
      }];
    }

    this._chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: periods.map(p => p.label),
        datasets: chartDatasets,
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${Utils.formatBRL(c.raw)}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 }, color: '#999', maxRotation: 0 } },
          y: { 
            display: true, 
            position: 'left',
            grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
            beginAtZero: isExpense,
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#999',
              callback: function(value) {
                if (Math.abs(value) >= 1000) {
                  return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1).replace('.0', '') + 'k';
                }
                return value;
              }
            }
          },
        },
        animation: { duration: 400, easing: 'easeOutQuart' }
      },
    });
  },

  _renderExpensesPieChart(monthTxs) {
    const ctx = document.getElementById('expenses-pie-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    const expenses = monthTxs.filter(t => t.type === 'expense');
    if (expenses.length === 0) {
      this._pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Sem Despesas'],
          datasets: [{
            data: [1],
            backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || '#eee'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: () => ' Nenhuma despesa no período'
              }
            }
          },
          animation: { duration: 600, easing: 'easeOutQuart' }
        }
      });
      
      const legendContainer = document.getElementById('pie-chart-legend');
      if (legendContainer) {
        legendContainer.innerHTML = '<div style="text-align:center; color:var(--text-tertiary); font-size:13px; padding: 12px 0;">Nenhuma despesa registrada neste mês.</div>';
      }
      return;
    }

    const categoryTotals = {};
    const categories = DB.getCategories();
    
    expenses.forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const catName = cat ? cat.name : 'Outros';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(tx.amount);
    });

    // Sort by largest expense
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(i => i[0]);
    const data = sorted.map(i => i[1]);

    const bgColors = [
      '#111111', '#333333', '#555555', '#777777', 
      '#999999', '#aaaaaa', '#cccccc', '#eeeeee'
    ];

    const legendContainer = document.getElementById('pie-chart-legend');
    if (legendContainer) {
      legendContainer.innerHTML = sorted.map((item, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:12px; height:12px; border-radius:50%; background:${bgColors[index % bgColors.length]}"></div>
            <span style="color:var(--text-secondary)">${Utils.escapeHtml(item[0])}</span>
          </div>
          <span style="font-weight:600; color:var(--text)">${Utils.formatBRL(item[1])}</span>
        </div>
      `).join('');
    }

    this._pieChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.label}: ${Utils.formatBRL(c.raw)}`
            }
          }
        },
        animation: { duration: 600, easing: 'easeOutQuart' }
      }
    });
  },

  _getAnnualBillingData(year, transactions) {
    const billings = DB.getBillings();
    const wallets = DB.getAllWallets ? DB.getAllWallets() : DB.getWallets();
    const defaultRules = DB.getDistributions();
    const allBoxes = DB.getBoxes();
    const allBoxTxs = DB.getBoxTransactions();

    const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const fullMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const annualWalletMap = {};
    const annualBoxMap = {};

    const monthlyData = shortMonths.map((label, idx) => {
      const mm = String(idx + 1).padStart(2, '0');
      const mk = `${year}-${mm}`;

      const monthBillings = billings.filter(b => b.date && b.date.startsWith(mk));
      const billingIds = new Set(monthBillings.map(b => b.id));
      const billingSum = monthBillings.reduce((s, b) => s + Number(b.amount || 0), 0);

      const extraIncomeTxs = transactions
        .filter(t => t.type === 'income' && (!t.billingId || !billingIds.has(t.billingId)) && t.date && t.date.startsWith(mk));
      const extraIncome = extraIncomeTxs.reduce((s, t) => s + Number(t.amount || 0), 0);

      const totalMonthAmount = billingSum + extraIncome;
      const walletMap = {};
      const monthBoxMap = {};

      monthBillings.forEach(b => {
        const bDist = Array.isArray(b.distributions) ? b.distributions : [];
        if (bDist.length > 0) {
          bDist.forEach(d => {
            const wId = d.walletId || 'unassigned';
            const amt = Number(d.amount) || (Number(b.amount || 0) * Number(d.percentage || 0) / 100);
            walletMap[wId] = (walletMap[wId] || 0) + amt;
          });
        } else {
          const linkedTxs = transactions.filter(t => t.billingId === b.id && t.type === 'income');
          if (linkedTxs.length > 0) {
            linkedTxs.forEach(t => {
              const wId = t.walletId || 'unassigned';
              walletMap[wId] = (walletMap[wId] || 0) + Number(t.amount || 0);
            });
          } else if (defaultRules.length > 0) {
            defaultRules.forEach(r => {
              const wId = r.walletId || 'unassigned';
              const amt = Number(b.amount || 0) * Number(r.percentage || 0) / 100;
              walletMap[wId] = (walletMap[wId] || 0) + amt;
            });
          }
        }

        // Caixinhas vinculadas a este faturamento
        let bBoxTxs = allBoxTxs.filter(tx => tx.billingId === b.id && tx.type === 'in');
        if (bBoxTxs.length > 0) {
          bBoxTxs.forEach(tx => {
            monthBoxMap[tx.boxId] = (monthBoxMap[tx.boxId] || 0) + Number(tx.amount || 0);
          });
        } else if (bDist.length > 0) {
          bDist.forEach(d => {
            const wBoxes = allBoxes.filter(box => box.walletId === d.walletId && Number(box.percentage) > 0);
            wBoxes.forEach(box => {
              const bAmt = parseFloat((Number(d.amount || 0) * Number(box.percentage) / 100).toFixed(2));
              if (bAmt > 0) {
                monthBoxMap[box.id] = (monthBoxMap[box.id] || 0) + bAmt;
              }
            });
          });
        }
      });

      extraIncomeTxs.forEach(t => {
        const wId = t.walletId || 'unassigned';
        walletMap[wId] = (walletMap[wId] || 0) + Number(t.amount || 0);
      });

      Object.entries(walletMap).forEach(([wId, amt]) => {
        annualWalletMap[wId] = (annualWalletMap[wId] || 0) + amt;
      });
      Object.entries(monthBoxMap).forEach(([bId, amt]) => {
        annualBoxMap[bId] = (annualBoxMap[bId] || 0) + amt;
      });

      const breakdown = Object.entries(walletMap)
        .filter(([, amt]) => amt > 0.009)
        .map(([wId, amt]) => {
          const w = wallets.find(x => x.id === wId);
          const wBoxes = allBoxes
            .filter(box => box.walletId === wId && (monthBoxMap[box.id] || 0) > 0.009)
            .map(box => ({
              boxId: box.id,
              boxName: box.name,
              percentage: amt > 0 ? Math.round((monthBoxMap[box.id] / amt) * 100) : (Number(box.percentage) || 0),
              amount: monthBoxMap[box.id]
            }));

          return {
            walletId: wId,
            walletName: w ? w.name : 'Não alocado',
            amount: amt,
            percentage: totalMonthAmount > 0 ? (amt / totalMonthAmount) * 100 : 0,
            boxes: wBoxes
          };
        })
        .sort((a, b) => b.amount - a.amount);

      return {
        monthIndex: idx,
        monthKey: mk,
        label,
        fullName: fullMonths[idx],
        amount: totalMonthAmount,
        breakdown
      };
    });

    const totalAnnual = monthlyData.reduce((s, m) => s + m.amount, 0);
    const activeMonths = monthlyData.filter(m => m.amount > 0).length;
    const avgMonthly = activeMonths > 0 ? (totalAnnual / activeMonths) : 0;

    let bestMonth = null;
    monthlyData.forEach(m => {
      if (m.amount > 0 && (!bestMonth || m.amount > bestMonth.amount)) {
        bestMonth = m;
      }
    });

    const annualBreakdown = Object.entries(annualWalletMap)
      .filter(([, amt]) => amt > 0.009)
      .map(([wId, amt]) => {
        const w = wallets.find(x => x.id === wId);
        const wBoxes = allBoxes
          .filter(box => box.walletId === wId && (annualBoxMap[box.id] || 0) > 0.009)
          .map(box => ({
            boxId: box.id,
            boxName: box.name,
            percentage: amt > 0 ? Math.round((annualBoxMap[box.id] / amt) * 100) : (Number(box.percentage) || 0),
            amount: annualBoxMap[box.id]
          }));

        return {
          walletId: wId,
          walletName: w ? w.name : 'Não alocado',
          amount: amt,
          percentage: totalAnnual > 0 ? (amt / totalAnnual) * 100 : 0,
          boxes: wBoxes
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { monthlyData, totalAnnual, activeMonths, avgMonthly, bestMonth, annualBreakdown };
  },

  _getAnnualExpensesData(year, transactions) {
    const categories = DB.getCategories();
    const wallets = DB.getAllWallets ? DB.getAllWallets() : DB.getWallets();

    const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const fullMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const annualCatMap = {};
    const annualCatWalletMap = {};

    const monthlyData = shortMonths.map((label, idx) => {
      const mm = String(idx + 1).padStart(2, '0');
      const mk = `${year}-${mm}`;

      const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date && t.date.startsWith(mk));
      const totalMonthAmount = monthExpenses.reduce((s, t) => s + Number(t.amount || 0), 0);

      const catMap = {};
      const catWalletMap = {};

      monthExpenses.forEach(t => {
        const catObj = categories.find(x => x.id === t.categoryId);
        const cName = catObj ? catObj.name : 'Outros';
        const wId = t.walletId || 'unassigned';
        const amt = Number(t.amount || 0);
        catMap[cName] = (catMap[cName] || 0) + amt;
        if (!catWalletMap[cName]) catWalletMap[cName] = {};
        catWalletMap[cName][wId] = (catWalletMap[cName][wId] || 0) + amt;

        annualCatMap[cName] = (annualCatMap[cName] || 0) + amt;
        if (!annualCatWalletMap[cName]) annualCatWalletMap[cName] = {};
        annualCatWalletMap[cName][wId] = (annualCatWalletMap[cName][wId] || 0) + amt;
      });

      const breakdown = Object.entries(catMap)
        .filter(([, amt]) => amt > 0.009)
        .map(([cName, amt]) => {
          const wEntries = Object.entries(catWalletMap[cName] || {})
            .filter(([, wAmt]) => wAmt > 0.009)
            .map(([wId, wAmt]) => {
              const w = wallets.find(x => x.id === wId);
              return {
                walletId: wId,
                walletName: w ? w.name : 'Sem carteira',
                percentage: amt > 0 ? Math.round((wAmt / amt) * 100) : 0,
                amount: wAmt
              };
            })
            .sort((a, b) => b.amount - a.amount);

          return {
            categoryId: cName,
            categoryName: cName,
            amount: amt,
            percentage: totalMonthAmount > 0 ? (amt / totalMonthAmount) * 100 : 0,
            wallets: wEntries
          };
        })
        .sort((a, b) => b.amount - a.amount);

      return {
        monthIndex: idx,
        monthKey: mk,
        label,
        fullName: fullMonths[idx],
        amount: totalMonthAmount,
        breakdown
      };
    });

    const totalAnnual = monthlyData.reduce((s, m) => s + m.amount, 0);
    const activeMonths = monthlyData.filter(m => m.amount > 0).length;
    const avgMonthly = activeMonths > 0 ? (totalAnnual / activeMonths) : 0;

    let bestMonth = null;
    monthlyData.forEach(m => {
      if (m.amount > 0 && (!bestMonth || m.amount > bestMonth.amount)) {
        bestMonth = m;
      }
    });

    const annualBreakdown = Object.entries(annualCatMap)
      .filter(([, amt]) => amt > 0.009)
      .map(([cName, amt]) => {
        const wEntries = Object.entries(annualCatWalletMap[cName] || {})
          .filter(([, wAmt]) => wAmt > 0.009)
          .map(([wId, wAmt]) => {
            const w = wallets.find(x => x.id === wId);
            return {
              walletId: wId,
              walletName: w ? w.name : 'Sem carteira',
              percentage: amt > 0 ? Math.round((wAmt / amt) * 100) : 0,
              amount: wAmt
            };
          })
          .sort((a, b) => b.amount - a.amount);

        return {
          categoryId: cName,
          categoryName: cName,
          amount: amt,
          percentage: totalAnnual > 0 ? (amt / totalAnnual) * 100 : 0,
          wallets: wEntries
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { monthlyData, totalAnnual, activeMonths, avgMonthly, bestMonth, annualBreakdown };
  },

  _renderAnnualBillingChart(annualBilling, annualExpenses) {
    const ctx = document.getElementById('annual-billing-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    const mode = this._annualViewMode || 'billing';
    const activeData = mode === 'expenses' ? annualExpenses : annualBilling;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const primaryBarColor = isDark ? '#f2f3f5' : '#1f2024';
    const regularBarColor = isDark ? '#5a5d66' : '#9ca0a9';
    const dimmedBarColor  = isDark ? '#35373d' : '#d8dbe2';
    const hoverBarColor   = isDark ? '#ffffff' : '#141518';
    const avgLineColor    = isDark ? '#a6aab2' : '#686b73';
    const gridColor       = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

    const labels = annualBilling.monthlyData.map(m => m.label);
    let datasets = [];

    if (mode === 'compare') {
      datasets = [
        {
          type: 'bar',
          label: 'Faturamento',
          data: annualBilling.monthlyData.map(m => m.amount),
          backgroundColor: primaryBarColor,
          hoverBackgroundColor: hoverBarColor,
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 14,
          order: 2
        },
        {
          type: 'bar',
          label: 'Despesas',
          data: annualExpenses.monthlyData.map(m => m.amount),
          backgroundColor: isDark ? '#71717a' : '#b5b5b8',
          hoverBackgroundColor: isDark ? '#a1a1aa' : '#8e8e93',
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 14,
          order: 2
        }
      ];
    } else {
      const values = activeData.monthlyData.map(m => m.amount);
      const bestIdx = activeData.bestMonth ? activeData.bestMonth.monthIndex : -1;
      const selIdx = this._selectedBillingMonth;

      const barColors = activeData.monthlyData.map((m, idx) => {
        if (selIdx !== null) {
          return idx === selIdx ? primaryBarColor : dimmedBarColor;
        }
        return idx === bestIdx ? primaryBarColor : regularBarColor;
      });

      datasets = [
        {
          type: 'bar',
          label: mode === 'expenses' ? 'Despesas' : 'Faturamento',
          data: values,
          backgroundColor: barColors,
          hoverBackgroundColor: hoverBarColor,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 24,
          order: 2
        }
      ];

      if (activeData.avgMonthly > 0) {
        datasets.push({
          type: 'line',
          label: 'Média Mensal',
          data: Array(12).fill(activeData.avgMonthly),
          borderColor: avgLineColor,
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          order: 1
        });
      }
    }

    this._annualBillingChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt, elements) => {
          if (mode === 'compare') return;
          if (elements && elements.length > 0) {
            const clickedIdx = elements[0].index;
            if (activeData.monthlyData[clickedIdx]?.amount > 0) {
              this._selectedBillingMonth = (this._selectedBillingMonth === clickedIdx) ? null : clickedIdx;
              this._billingDetailsOpen = true;
              this.render(document.getElementById('content'));
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: mode === 'compare',
            position: 'top',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${Utils.formatBRL(c.raw)}`,
              afterBody: (items) => {
                if (!items || items.length === 0) return [];
                const idx = items[0].dataIndex;
                if (mode === 'compare') {
                  const inc = annualBilling.monthlyData[idx]?.amount || 0;
                  const exp = annualExpenses.monthlyData[idx]?.amount || 0;
                  return [`  Saldo do Mês: ${Utils.formatBRL(inc - exp)}`];
                }
                const mObj = activeData.monthlyData[idx];
                if (!mObj || !mObj.breakdown || mObj.breakdown.length === 0) return [];
                return mObj.breakdown.map(d => {
                  const itemName = mode === 'expenses' ? d.categoryName : d.walletName;
                  return `  • ${itemName}: ${d.percentage.toFixed(0)}% (${Utils.formatBRL(d.amount)})`;
                });
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#999',
              maxRotation: 0
            }
          },
          y: {
            display: true,
            position: 'left',
            beginAtZero: true,
            grid: { color: gridColor, drawBorder: false },
            ticks: {
              font: { family: 'Inter', size: 10 },
              color: '#999',
              callback: function(value) {
                if (Math.abs(value) >= 1000) {
                  return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1).replace('.0', '') + 'k';
                }
                return value;
              }
            }
          }
        },
        animation: { duration: 400, easing: 'easeOutQuart' }
      }
    });
  }
};
