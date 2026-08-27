/* ============================================================
   pages/dashboard.js
   ============================================================ */
/* ============================================================
   pages/dashboard.js — Visão Geral (Redesign Mobile-first)
   ============================================================ */
const DashboardPage = {
  _chartState: { metric: 'saldo', time: 'month' },
  _chartInstance: null,

  render(container) {
    if (this._chartInstance) {
      this._chartInstance.destroy();
      this._chartInstance = null;
    }

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
        <button class="btn btn-primary btn-sm" id="btn-report" title="Gerar Relatório Inteligente">
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
                <div style="font-size:13px; font-weight:600; color:var(--success); margin-top:2px">+${Utils.formatBRL(monthIn)}</div>
              </div>
              <div style="background:var(--bg); padding:8px 6px; border-radius:8px">
                <div style="font-size:10px; color:var(--text-tertiary)">Saídas (Mês)</div>
                <div style="font-size:13px; font-weight:600; color:var(--danger); margin-top:2px">-${Utils.formatBRL(monthOut)}</div>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px">
              ${boxes.map(b => {
                const wallet = wallets.find(w => w.id === b.walletId);
                const walletName = wallet ? wallet.name : '';
                const walletColor = wallet?.color || 'var(--primary)';
                const pct = Number(b.percentage) || 0;
                const bal = DB.getBoxBalance(b.id);
                const bIn = monthBoxTxs.filter(bt => bt.boxId === b.id && bt.type === 'in').reduce((s, bt) => s + Number(bt.amount), 0);
                const bOut = monthBoxTxs.filter(bt => bt.boxId === b.id && bt.type === 'out').reduce((s, bt) => s + Number(bt.amount), 0) +
                             monthBoxExpenses.filter(t => t.boxId === b.id).reduce((s, t) => s + Number(t.amount), 0);

                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--bg); border-radius:8px; font-size:12px">
                    <div style="display:flex; align-items:center; gap:8px; min-width:0; overflow:hidden">
                      <div style="width:3px; height:24px; background:${walletColor}; border-radius:2px; flex-shrink:0"></div>
                      <div style="min-width:0">
                        <div style="display:flex; align-items:center; gap:6px">
                          <span style="font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${Utils.escapeHtml(b.name)}</span>
                          ${pct > 0 ? `<span style="font-size:10px; font-weight:600; color:${walletColor}; background:${walletColor}15; padding:1px 5px; border-radius:4px; flex-shrink:0">${pct}%</span>` : ''}
                        </div>
                        <div style="font-size:10.5px; color:var(--text-tertiary)">${Utils.escapeHtml(walletName)}</div>
                      </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:8px">
                      ${bIn > 0 ? `<span style="font-size:10.5px; color:var(--success)">+${Utils.formatBRL(bIn)}</span>` : ''}
                      ${bOut > 0 ? `<span style="font-size:10.5px; color:var(--danger)">-${Utils.formatBRL(bOut)}</span>` : ''}
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

      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <span class="card-title">Últimas Transações</span>
          <a href="#/transactions" class="btn btn-ghost btn-sm" style="font-size:11px">Ver tudo</a>
        </div>
        <div class="table-wrapper">${this._recentTable(transactions, wallets)}</div>
      </div>
    `;

    if (wallets.length > 0) {
      this._renderUnifiedChart(transactions);

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
    doc.text(mentorTitle, 14, 64);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(mentorImpact, 14, 72);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const splitMsg = doc.splitTextToSize(mentorMessage, 180);
    doc.text(splitMsg, 14, 78);
    let yPos = 78 + (splitMsg.length * 5) + 6;

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
  }
};
