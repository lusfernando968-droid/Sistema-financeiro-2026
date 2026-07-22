/* ============================================================
   pages/dashboard.js
   ============================================================ */
/* ============================================================
   pages/dashboard.js — Visão Geral (Redesign Mobile-first)
   ============================================================ */
const DashboardPage = {
  _charts: {},

  render(container) {
    Object.values(this._charts).forEach(c => c?.destroy?.());
    this._charts = {};

    const wallets = DB.getWallets();
    const transactions = DB.getTransactions();
    const credit = DB.getCreditSummary();
    const debts = DB.getDebtSummary();
    const monthKey = Utils.currentMonthKey();

    const totalBalance = wallets.reduce((s, w) => s + DB.getWalletBalance(w.id), 0);
    const monthTxs = transactions.filter(t => t.date?.startsWith(monthKey));
    const monthIncome  = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthResult  = monthIncome - monthExpense;

    // Índice de Saúde Financeira (simples)
    const netWorth = totalBalance - debts.totalRemaining;
    const isHealthy = netWorth > 0 && credit.utilization < 70;

    container.innerHTML = `
      <div class="page-header" style="margin-bottom:14px">
        <div>
          <div class="page-header-title" style="font-size:22px;letter-spacing:-0.5px">Olá, Luiz!</div>
          <div class="page-header-sub">Veja o resumo das suas finanças</div>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-report" title="Gerar Relatório em PDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Relatório
        </button>
      </div>

      <!-- Patrimônio Principal -->
      <div class="card" style="margin-bottom:14px; background:#222428; color:white; padding:20px; border:none; box-shadow:0 8px 24px rgba(0,0,0,0.15)">
        <div style="font-size:12px; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Patrimônio Líquido</div>
        <div style="font-size:28px; font-weight:600; letter-spacing:-1px">${Utils.formatBRL(netWorth)}</div>
        <div style="display:flex; gap:12px; margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1)">
          <div style="flex:1">
            <div style="font-size:11px; color:rgba(255,255,255,0.6)">Saldo Contas</div>
            <div style="font-size:14px; font-weight:500">${Utils.formatBRL(totalBalance)}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px; color:rgba(255,255,255,0.6)">Total Dívidas</div>
            <div style="font-size:14px; font-weight:500; color:#ff8a80">${Utils.formatBRL(debts.totalRemaining)}</div>
          </div>
        </div>
      </div>

      <!-- Resumo do Mês & Crédito -->
      <div class="stats-grid" style="grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px">
        <div class="stat-card" style="padding:14px">
          <div class="stat-label">Entradas (Mês)</div>
          <div class="stat-value" style="font-size:16px; color:var(--success)">${Utils.formatBRL(monthIncome)}</div>
        </div>
        <div class="stat-card" style="padding:14px">
          <div class="stat-label">Saídas (Mês)</div>
          <div class="stat-value" style="font-size:16px; color:var(--danger)">${Utils.formatBRL(monthExpense)}</div>
        </div>
        
        <div class="stat-card" style="padding:14px; grid-column:span 2; display:flex; align-items:center; gap:14px" onclick="window.location.hash='#/credit'">
          <div style="flex:1">
            <div class="stat-label" style="margin-bottom:2px">Uso de Crédito</div>
            <div style="font-size:12px; color:var(--text-secondary)">${Utils.formatBRL(credit.totalUsed)} de ${Utils.formatBRL(credit.totalLimit)}</div>
            <div class="progress-bar" style="height:4px; margin-top:8px">
              <div class="progress-fill" style="width:${Math.min(100, credit.utilization)}%; background:${credit.utilization > 70 ? 'var(--danger)' : credit.utilization > 30 ? 'var(--warning-text)' : 'var(--success)'}"></div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" style="width:16px;height:16px"><polyline points="9 18 15 12 9 6"/></svg>
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
          <div class="card" style="margin-bottom:14px; background:linear-gradient(135deg, rgba(142, 68, 173, 0.04), rgba(41, 128, 185, 0.04)); border:1px solid rgba(142, 68, 173, 0.15)">
            <div class="card-header" style="border-bottom:1px solid rgba(142, 68, 173, 0.1); padding-bottom:10px">
              <div style="display:flex; align-items:center; gap:8px">
                <span style="font-size:16px">📦</span>
                <div>
                  <span class="card-title" style="font-size:14px">Arquitetura Financeira (Caixinhas)</span>
                  <div style="font-size:11px; color:var(--text-tertiary)">Movimentações do Mês</div>
                </div>
              </div>
              <a href="#/architecture" class="btn btn-ghost btn-sm" style="font-size:11px; color:var(--primary)">Ver Caixinhas →</a>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin:12px 0; text-align:center">
              <div style="background:var(--card-bg); padding:8px 6px; border-radius:8px; border:1px solid var(--border-subtle)">
                <div style="font-size:10px; color:var(--text-tertiary)">Total Alocado</div>
                <div style="font-size:13px; font-weight:600; color:var(--primary); margin-top:2px">${Utils.formatBRL(totalAllocated)}</div>
              </div>
              <div style="background:var(--card-bg); padding:8px 6px; border-radius:8px; border:1px solid var(--border-subtle)">
                <div style="font-size:10px; color:var(--text-tertiary)">Aportado (Mês)</div>
                <div style="font-size:13px; font-weight:600; color:var(--success); margin-top:2px">+ ${Utils.formatBRL(monthIn)}</div>
              </div>
              <div style="background:var(--card-bg); padding:8px 6px; border-radius:8px; border:1px solid var(--border-subtle)">
                <div style="font-size:10px; color:var(--text-tertiary)">Baixas/Saídas</div>
                <div style="font-size:13px; font-weight:600; color:var(--danger); margin-top:2px">- ${Utils.formatBRL(monthOut)}</div>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px">
              ${boxes.map(b => {
                const bal = DB.getBoxBalance(b.id);
                const bIn = monthBoxTxs.filter(bt => bt.boxId === b.id && bt.type === 'in').reduce((s, bt) => s + Number(bt.amount), 0);
                const bOut = monthBoxTxs.filter(bt => bt.boxId === b.id && bt.type === 'out').reduce((s, bt) => s + Number(bt.amount), 0) +
                             monthBoxExpenses.filter(t => t.boxId === b.id).reduce((s, t) => s + Number(t.amount), 0);

                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:var(--card-bg); border-radius:6px; font-size:12px">
                    <span style="font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${Utils.escapeHtml(b.name)}</span>
                    <div style="display:flex; align-items:center; gap:8px; flex-shrink:0">
                      ${bIn > 0 ? `<span style="font-size:10.5px; color:var(--success)">+${Utils.formatBRL(bIn)}</span>` : ''}
                      ${bOut > 0 ? `<span style="font-size:10.5px; color:var(--danger)">-${Utils.formatBRL(bOut)}</span>` : ''}
                      <span style="font-weight:600; font-size:12px">${Utils.formatBRL(bal)}</span>
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
          <div class="charts-grid" style="grid-template-columns:1fr; gap:14px; margin-bottom:14px">
            <div class="card">
              <div class="card-header">
                <span class="card-title">Evolução do Patrimônio (6 meses)</span>
              </div>
              <div class="chart-canvas-wrapper short" style="height:180px; padding:12px"><canvas id="chart-networth"></canvas></div>
            </div>
            <div class="card">
              <div class="card-header">
                <span class="card-title">Despesas dos últimos 6 meses</span>
              </div>
              <div class="chart-canvas-wrapper short" style="height:180px; padding:12px"><canvas id="chart-monthly"></canvas></div>
            </div>
          </div>
        `
      }

      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <span class="card-title">Últimas Transações</span>
          <a href="#/transactions" class="btn btn-ghost btn-sm" style="font-size:11px">Ver tudo</a>
        </div>
        <div class="table-wrapper">${this._recentTable(transactions, wallets)}</div>
      </div>
    `;

    if (wallets.length > 0) {
      this._chartMonthly(transactions);
      this._chartNetWorth(transactions);
    }
    
    document.getElementById('btn-report')?.addEventListener('click', () => this.openReportModal());
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

    // Seção de Insights
    doc.setFontSize(14);
    doc.text('Insights do Mês', 14, 64);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    
    let yPos = 71;
    if (income > 0) {
      doc.text(`• Você consumiu ${pctSpent}% da sua receita neste mês.`, 14, yPos); yPos += 6;
      if (pctSpent < 100) {
        doc.text(`• Você conseguiu reter / poupar ${Utils.formatBRL(net)} (${100 - pctSpent}% da receita).`, 14, yPos); yPos += 6;
      } else {
        doc.text(`• Atenção: Seus gastos ultrapassaram sua receita neste mês.`, 14, yPos); yPos += 6;
      }
    }
    if (topCatAmt > 0) {
      doc.text(`• Sua maior área de gasto foi com "${topCatName}", totalizando ${Utils.formatBRL(topCatAmt)}.`, 14, yPos); yPos += 6;
    }
    doc.text(`• Volume financeiro total movimentado (entradas + saídas) foi de ${Utils.formatBRL(vol)}.`, 14, yPos); yPos += 8;

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

  _recentTable(transactions, wallets) {
    const recent = [...transactions].sort((a, b) => (b.date||'').localeCompare(a.date||'') || (b.createdAt||'').localeCompare(a.createdAt||'')).slice(0, 5);
    if (recent.length === 0) return `<div class="empty-state" style="padding:24px"><div class="empty-state-text">Nenhuma transação ainda</div></div>`;

    const rows = recent.map(t => {
      const w  = wallets.find(x => x.id === t.walletId);
      const sign  = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '⇄';
      const cls   = `amount-${t.type}`;
      return `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid var(--border-subtle)">
        <div style="display:flex; align-items:center; gap:10px; overflow:hidden">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text-tertiary)">
            ${t.type === 'income' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' 
            : t.type === 'expense' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>' 
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 21l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>'}
          </div>
          <div style="min-width:0">
            <div style="font-weight:500; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${Utils.escapeHtml(t.description || 'Transação')}</div>
            <div style="font-size:11px; color:var(--text-tertiary)">${Utils.formatDate(t.date)} · ${Utils.escapeHtml(w?.name || '—')}</div>
          </div>
        </div>
        <div class="${cls}" style="font-weight:600; font-size:13.5px; flex-shrink:0; margin-left:8px">${sign} ${Utils.formatBRL(t.amount)}</div>
      </div>`;
    }).join('');

    return `<div>${rows}</div>`;
  },

  _chartMonthly(transactions) {
    const ctx = document.getElementById('chart-monthly');
    if (!ctx || typeof Chart === 'undefined') return;
    const months = Utils.getLast6Months();
    const expense = months.map(m => transactions.filter(t => t.type === 'expense' && t.date?.startsWith(m.key)).reduce((s, t) => s + t.amount, 0));
    
    this._charts.monthly = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months.map(m => m.label.substring(0,3)),
        datasets: [{
          label: 'Saídas',
          data: expense,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#e74c3c',
          pointRadius: 3,
          fill: true,
          tension: 0.3
        }],
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

  _chartNetWorth(transactions) {
    const ctx = document.getElementById('chart-networth');
    if (!ctx || typeof Chart === 'undefined') return;
    const months = Utils.getLast6Months();
    
    // Calculates the cumulative sum of (Income - Expense) up to the end of each month
    const netWorthData = months.map(m => {
      const txsUpToMonth = transactions.filter(t => t.date && t.date.substring(0, 7) <= m.key);
      const inc = txsUpToMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txsUpToMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return inc - exp;
    });
    
    this._charts.networth = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months.map(m => m.label.substring(0,3)),
        datasets: [{
          label: 'Patrimônio',
          data: netWorthData,
          borderColor: '#1abc9c',
          backgroundColor: 'rgba(26, 188, 156, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#1abc9c',
          pointRadius: 3,
          fill: true,
          tension: 0.3
        }],
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
  }
};
