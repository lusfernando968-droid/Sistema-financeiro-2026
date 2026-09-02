/* ============================================================
   pages/forecast.js — Previsão de Custo Mensal (Simulador)
   ============================================================ */
const ForecastPage = {
  _items: JSON.parse(localStorage.getItem('finances_forecast_items') || '[]'),
  _cutIndices: new Set(),
  _chartInstance: null,
  _chartYears: 10,

  _save() {
    localStorage.setItem('finances_forecast_items', JSON.stringify(this._items));
    this._cutIndices.clear(); // Reset cuts when modifying items to prevent index drift
    this.render(document.getElementById('content'));
  },

  toggleCut(idx) {
    if (this._cutIndices.has(idx)) this._cutIndices.delete(idx);
    else this._cutIndices.add(idx);
    this.render(document.getElementById('content'));
  },

  setChartYears(y) {
    this._chartYears = y;
    this.render(document.getElementById('content'));
  },

  render(container) {
    const totalOriginal = this._items.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalSimulated = this._items.reduce((sum, item, idx) => sum + (this._cutIndices.has(idx) ? 0 : Number(item.amount)), 0);
    const savings = totalOriginal - totalSimulated;

    const expectedIncome = parseFloat(localStorage.getItem('finances_forecast_income') || '0');
    const balance = expectedIncome - totalSimulated;
    const isPositive = balance >= 0;
    const wallets = DB.getWallets();

    // Calcula total por carteira (baseado no simulado)
    const walletTotals = {};
    this._items.forEach((item, idx) => {
      if (this._cutIndices.has(idx)) return;
      const wid = item.walletId || 'geral';
      walletTotals[wid] = (walletTotals[wid] || 0) + Number(item.amount);
    });

    let html = `
      <div class="page-header" style="flex-direction:row; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <div class="page-header-sub" style="margin:0;">Simulador de contas fixas e orçamento base</div>
        <button class="btn btn-primary btn-sm" onclick="ForecastPage.openItemForm()">+ Nova Conta</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card" style="cursor:pointer;" onclick="ForecastPage.editIncome()">
          <div class="stat-label">Renda Base Esperada ✏️</div>
          <div class="stat-value" style="color:var(--text)">${Utils.formatBRL(expectedIncome)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Custo Fixo Mensal</div>
          <div class="stat-value" style="color:var(--text)">${Utils.formatBRL(totalSimulated)}</div>
          ${savings > 0 ? `<div class="stat-sub" style="color:var(--text-secondary)">↘ Economizando ${Utils.formatBRL(savings)}/mês</div>` : ''}
        </div>
        <div class="stat-card" style="grid-column: span 2">
          <div class="stat-label">Saldo Previsto (Renda - Custo Fixo)</div>
          <div class="stat-value" style="color:var(--${isPositive ? 'text' : 'danger'})">${Utils.formatBRL(balance)}</div>
        </div>
      </div>
    `;

    if (this._items.length > 0) {
      // Projeção Longo Prazo
      const totalSavedInPeriod = savings * 12 * this._chartYears;
      
      html += `
        <div class="card" style="margin-bottom: 20px; padding: 16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div>
              <h3 style="font-size:12px; margin-bottom: 4px; color: var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Projeção de Longo Prazo</h3>
              <p style="font-size:12px; color:var(--text-secondary); margin:0;">Acúmulo total em ${this._chartYears} ${this._chartYears === 1 ? 'ano' : 'anos'}.</p>
            </div>
            
            <div style="display:flex; background:var(--bg); border-radius:6px; padding:2px; border:1px solid var(--border-subtle);">
              <button onclick="ForecastPage.setChartYears(1)" style="border:none; background:${this._chartYears===1?'var(--primary)':'transparent'}; color:${this._chartYears===1?'#fff':'var(--text-secondary)'}; font-size:11px; padding:4px 8px; border-radius:4px; font-weight:600;">1 Ano</button>
              <button onclick="ForecastPage.setChartYears(5)" style="border:none; background:${this._chartYears===5?'var(--primary)':'transparent'}; color:${this._chartYears===5?'#fff':'var(--text-secondary)'}; font-size:11px; padding:4px 8px; border-radius:4px; font-weight:600;">5 Anos</button>
              <button onclick="ForecastPage.setChartYears(10)" style="border:none; background:${this._chartYears===10?'var(--primary)':'transparent'}; color:${this._chartYears===10?'#fff':'var(--text-secondary)'}; font-size:11px; padding:4px 8px; border-radius:4px; font-weight:600;">10 Anos</button>
            </div>
          </div>

          ${savings > 0 ? `
            <div style="background:var(--bg); border:1px dashed var(--border); border-radius:8px; padding:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:600; color:var(--text-secondary);">Economia projetada em ${this._chartYears} ${this._chartYears === 1 ? 'ano' : 'anos'}:</span>
              <span style="font-size:16px; font-weight:700; color:var(--text);">↘ ${Utils.formatBRL(totalSavedInPeriod)}</span>
            </div>
          ` : ''}

          <div class="chart-canvas-wrapper short" style="height:220px;">
            <canvas id="forecast-chart"></canvas>
          </div>
        </div>
      `;

      // Breakdown by Wallet
      if (totalSimulated > 0) {
        html += `
          <div class="card" style="margin-bottom: 20px; padding: 16px;">
            <h3 style="font-size:12px; margin-bottom: 12px; color: var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Resumo por Carteira</h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${Object.entries(walletTotals).map(([wid, amount]) => {
                const w = wallets.find(x => x.id === wid);
                const name = w ? w.name : 'Geral';
                const color = w ? (w.color || 'var(--text-tertiary)') : 'var(--text-tertiary)';
                const pct = totalSimulated > 0 ? ((amount / totalSimulated) * 100).toFixed(1) : 0;
                return `
                  <div>
                    <div style="display:flex; align-items:center; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="width:8px; height:8px; border-radius:50%; background:${color};"></span>
                        <span style="font-weight:500; color:var(--text);">${Utils.escapeHtml(name)}</span>
                      </div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:600; color:var(--text);">${Utils.formatBRL(amount)}</span>
                        <span style="width:40px; text-align:right; color:var(--text-tertiary); font-size:11px;">${pct}%</span>
                      </div>
                    </div>
                    <div class="progress-bar" style="height:3px; margin:0;"><div class="progress-fill" style="width:${pct}%; background:var(--text-tertiary); opacity:0.5;"></div></div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    }

    html += `
      <div style="margin-bottom: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <h3 style="font-size:14px; margin:0; color: var(--text-secondary); font-weight:600;">Minhas Contas Fixas</h3>
          <span style="font-size:11px; color:var(--text-tertiary);">Simular Cortes</span>
        </div>
    `;

    if (this._items.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">Nenhuma conta cadastrada</div>
          <div class="empty-state-sub">Adicione despesas para simular seu custo de vida.</div>
        </div>
      `;
    } else {
      html += `
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${this._items.map((item, idx) => {
            const w = wallets.find(x => x.id === item.walletId);
            const walletName = w ? Utils.escapeHtml(w.name) : 'Geral';
            const isCut = this._cutIndices.has(idx);
            
            return `
            <div class="card" style="padding:12px 16px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 2px rgba(0,0,0,0.02); border:1px solid var(--border-subtle); ${isCut ? 'opacity: 0.5; background: var(--bg);' : ''}">
              
              <div style="display:flex; align-items:center; gap:12px; flex:1;">
                <!-- Simular Corte Checkbox -->
                <div style="display:flex; align-items:center; justify-content:center; width:24px; height:24px; border: 2px solid ${isCut ? 'var(--text-tertiary)' : 'var(--primary)'}; border-radius:6px; cursor:pointer; background: ${isCut ? 'transparent' : 'var(--primary)'};" onclick="ForecastPage.toggleCut(${idx})">
                   ${isCut ? '' : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`}
                </div>

                <div style="display:flex; flex-direction:column; gap:4px; ${isCut ? 'text-decoration: line-through;' : ''}">
                  <span style="font-weight:600; font-size:14px; color:var(--text)">${Utils.escapeHtml(item.name)}</span>
                  <span style="font-size:11px; color:var(--text-tertiary); font-weight:500; text-transform:uppercase;">${walletName}</span>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-weight:600; font-size:14px; color:var(--text); ${isCut ? 'text-decoration: line-through;' : ''}">${Utils.formatBRL(item.amount)}</span>
                <button class="btn-icon" onclick="ForecastPage.deleteItem(${idx})" style="color:var(--text-tertiary); background:transparent; width:28px; height:28px;" title="Remover">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>

            </div>
          `}).join('')}
        </div>
      `;
    }

    html += `</div>`;
    
    // Insight Section
    if (this._items.length > 0 && expectedIncome > 0) {
        const pct = ((totalSimulated / expectedIncome) * 100).toFixed(1);
        let msg = '';
        if (pct <= 50) msg = 'Seus custos simulados estão em uma proporção ideal (<= 50%) da renda.';
        else if (pct <= 70) msg = 'Seus custos simulados estão altos, reduzindo sua capacidade de poupar.';
        else msg = 'Seus custos simulados estão asfixiando seu orçamento. Continue cortando despesas!';
        
        html += `
            <div class="card" style="padding: 16px; background: var(--bg); border: 1px dashed var(--border-subtle);">
                <div style="font-size:12px; font-weight:600; margin-bottom:6px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Insight de Custo</div>
                <div style="font-size:13px; color:var(--text); line-height: 1.5;">
                    Custo simulado representa <strong>${pct}%</strong> da renda esperada. <br>
                    <span style="color:var(--text-secondary)">${msg}</span>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;

    if (this._items.length > 0) {
      this._renderChart(totalOriginal, totalSimulated);
    }
  },

  _renderChart(totalOriginal, totalSimulated) {
    const ctx = document.getElementById('forecast-chart');
    if (!ctx) return;

    const labels = [];
    const dataOriginal = [];
    const dataSimulated = [];

    if (this._chartYears === 1) {
      for (let m = 1; m <= 12; m++) {
        labels.push(`Mês ${m}`);
        dataOriginal.push(totalOriginal * m);
        dataSimulated.push(totalSimulated * m);
      }
    } else {
      for (let year = 1; year <= this._chartYears; year++) {
        labels.push(`Ano ${year}`);
        const n = year * 12;
        dataOriginal.push(totalOriginal * n);
        dataSimulated.push(totalSimulated * n);
      }
    }

    if (this._chartInstance) {
      this._chartInstance.destroy();
    }

    this._chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Custo Original',
            data: dataOriginal,
            borderColor: '#e74c3c', // Red
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Custo Simulado',
            data: dataSimulated,
            borderColor: '#3498db', // Blue
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            fill: true,
            tension: 0.4,
            hidden: totalOriginal === totalSimulated // hide if no cuts are made
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ' ' + Utils.formatBRL(ctx.raw)
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { 
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { size: 10 },
              callback: (val) => 'R$ ' + (val/1000).toFixed(0) + 'k'
            }
          }
        }
      }
    });
  },

  editIncome() {
    const current = localStorage.getItem('finances_forecast_income') || '';
    App.openModal('Renda Base Esperada', `
      <form id="income-form">
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px">
          Digite uma estimativa de quanto você costuma ganhar por mês para compararmos com seus custos.
        </p>
        <div class="form-group">
          <label class="form-label">Valor Esperado (R$)</label>
          <input type="number" class="form-control" id="fc-income" value="${current}" step="0.01" min="0" required autofocus>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);

    document.getElementById('income-form').addEventListener('submit', e => {
      e.preventDefault();
      const val = parseFloat(document.getElementById('fc-income').value || 0);
      localStorage.setItem('finances_forecast_income', val);
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  openItemForm() {
    const wallets = DB.getWallets();
    App.openModal('Nova Conta Fixa', `
      <form id="fc-item-form">
        <div class="form-group">
          <label class="form-label">Descrição da Conta *</label>
          <input type="text" class="form-control" id="fc-name" placeholder="Ex: Aluguel, Internet, Luz..." required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Carteira (Categoria) *</label>
          <select class="form-control" id="fc-wallet" required>
            ${wallets.map(w => `<option value="${w.id}">${Utils.escapeHtml(w.name)}</option>`).join('')}
            <option value="geral">Geral (Sem carteira específica)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Valor Estimado / Médio (R$) *</label>
          <input type="number" class="form-control" id="fc-amount" step="0.01" min="0.01" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Adicionar</button>
        </div>
      </form>
    `);

    document.getElementById('fc-item-form').addEventListener('submit', e => {
      e.preventDefault();
      this._items.push({
        name: document.getElementById('fc-name').value.trim(),
        walletId: document.getElementById('fc-wallet').value,
        amount: parseFloat(document.getElementById('fc-amount').value)
      });
      App.closeModal();
      this._save();
    });
  },

  deleteItem(idx) {
    App.confirm('Remover conta?', 'Esta ação removerá a conta da sua simulação.', () => {
      this._items.splice(idx, 1);
      this._save();
    });
  }
};
