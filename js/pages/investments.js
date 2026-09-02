/* ============================================================
   pages/investments.js
   ============================================================ */
const InvestmentsPage = {
  render(container) {
    const boxes = DB.getBoxes();
    const wallets = DB.getWallets();

    const totalInvested = boxes.reduce((sum, b) => sum + DB.getBoxBalance(b.id), 0);

    let html = `
      <div class="page-header" style="margin-bottom:20px">
        <div>
          <div class="page-header-title">Investimentos</div>
          <div class="page-header-sub">Gerencie suas caixinhas e rendimentos</div>
        </div>
      </div>
      
      <!-- Resumo Total -->
      <div class="card" style="margin-bottom:24px; background:linear-gradient(135deg, #f39c12, #e67e22); color:white; padding:24px; border:none; box-shadow:0 8px 24px rgba(243, 156, 18, 0.2)">
        <div style="font-size:13px; color:rgba(255,255,255,0.9); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">Patrimônio em Investimentos</div>
        <div style="font-size:32px; font-weight:700; letter-spacing:-1px">${Utils.formatBRL(totalInvested)}</div>
      </div>
    `;

    if (boxes.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon" style="color:#f39c12">📈</div>
          <div class="empty-state-text">Nenhum investimento encontrado</div>
          <div class="empty-state-sub">Crie Caixinhas na tela de <a href="#/architecture" style="color:var(--primary);text-decoration:none">Arquitetura</a> para começar a investir.</div>
        </div>
      `;
      container.innerHTML = html;
      return;
    }

    html += `<div class="wallets-grid">`;
    boxes.forEach(box => {
      const wallet = wallets.find(w => w.id === box.walletId);
      const balance = DB.getBoxBalance(box.id);
      const wColor = wallet?.color || '#f39c12';

      html += `
        <div class="wallet-card" style="cursor:default">
          <div class="wallet-card-bar" style="background:${wColor}"></div>
          <div style="font-size:11px; color:var(--text-tertiary); text-transform:uppercase; margin-bottom:4px">${wallet?.name || 'Carteira Desconhecida'}</div>
          <div class="wallet-name" style="font-size:18px">${Utils.escapeHtml(box.name)}</div>
          <div class="wallet-balance" style="color:var(--text); margin-top:8px; font-size:20px">${Utils.formatBRL(balance)}</div>
          
          <div class="wallet-actions" style="margin-top:20px; border-top:1px solid var(--border-subtle); padding-top:12px; display:flex; flex-wrap:wrap; gap:8px">
            <button class="btn btn-ghost btn-sm" style="color:var(--text); border:1px solid var(--border-subtle)" onclick="InvestmentsPage.openYieldForm('${box.id}', true)">↗ Lucro</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--text); border:1px solid var(--border-subtle)" onclick="InvestmentsPage.openYieldForm('${box.id}', false)">↘ Prejuízo</button>
            <div style="width:100%"></div>
            <button class="btn btn-ghost btn-sm" onclick="InvestmentsPage.openAporteForm('${box.id}')">Aportar</button>
            <button class="btn btn-ghost btn-sm" onclick="InvestmentsPage.openResgateForm('${box.id}')">Resgatar</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    
    container.innerHTML = html;
  },

  openYieldForm(boxId, isProfit) {
    const box = DB.getBoxes().find(b => b.id === boxId);
    if (!box) return;

    App.openModal(`Registrar ${isProfit ? 'Lucro' : 'Prejuízo'}`, `
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5">
        O valor será ${isProfit ? 'adicionado ao' : 'descontado do'} saldo da caixinha <strong>${Utils.escapeHtml(box.name)}</strong> 
        sem afetar o saldo livre da sua carteira.
      </p>
      <form id="yield-form">
        <div class="form-group">
          <label class="form-label">Valor (R$) *</label>
          <input type="number" class="form-control" id="y-amount" min="0.01" step="0.01" placeholder="0,00" required autofocus>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-${isProfit ? 'primary' : 'danger'}">Confirmar</button>
        </div>
      </form>
    `);

    document.getElementById('yield-form').addEventListener('submit', e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('y-amount').value);
      if (!amount || amount <= 0) return;
      
      try {
        DB.registerInvestmentYield(boxId, amount, isProfit);
        App.toast(`${isProfit ? 'Lucro' : 'Prejuízo'} registrado com sucesso!`, 'success');
        App.closeModal();
        this.render(document.getElementById('content'));
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  },

  openAporteForm(boxId) {
    const box = DB.getBoxes().find(b => b.id === boxId);
    if (!box) return;
    const summary = DB.getWalletSummary(box.walletId);
    
    App.openModal(`Aportar em ${Utils.escapeHtml(box.name)}`, `
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
        Saldo Livre disponível na carteira: <strong style="color:var(--text)">${Utils.formatBRL(summary.free)}</strong>
      </p>
      <form id="aporte-form">
        <div class="form-group">
          <label class="form-label">Valor a aportar (R$) *</label>
          <input type="number" class="form-control" id="a-amount" min="0.01" max="${summary.free > 0 ? summary.free : 0.01}" step="0.01" placeholder="0,00" required autofocus>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary" ${summary.free <= 0 ? 'disabled' : ''}>Aportar</button>
        </div>
      </form>
    `);

    document.getElementById('aporte-form').addEventListener('submit', e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('a-amount').value);
      if (!amount || amount <= 0 || amount > summary.free) return;
      
      try {
        DB.addBoxTransaction({ boxId, type: 'in', amount });
        App.toast('Aporte realizado com sucesso!', 'success');
        App.closeModal();
        this.render(document.getElementById('content'));
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  },

  openResgateForm(boxId) {
    const box = DB.getBoxes().find(b => b.id === boxId);
    if (!box) return;
    const balance = DB.getBoxBalance(boxId);
    
    App.openModal(`Resgatar de ${Utils.escapeHtml(box.name)}`, `
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
        Saldo disponível para resgate: <strong style="color:var(--text)">${Utils.formatBRL(balance)}</strong>
      </p>
      <form id="resgatar-form">
        <div class="form-group">
          <label class="form-label">Valor a resgatar (R$) *</label>
          <input type="number" class="form-control" id="r-amount" min="0.01" max="${balance > 0 ? balance : 0.01}" step="0.01" placeholder="0,00" required autofocus>
          <div class="form-hint">Este valor voltará para o Saldo Livre da carteira.</div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary" ${balance <= 0 ? 'disabled' : ''}>Resgatar</button>
        </div>
      </form>
    `);

    document.getElementById('resgatar-form').addEventListener('submit', e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('r-amount').value);
      if (!amount || amount <= 0 || amount > balance) return;
      
      try {
        DB.addBoxTransaction({ boxId, type: 'out', amount });
        App.toast('Resgate realizado com sucesso!', 'success');
        App.closeModal();
        this.render(document.getElementById('content'));
      } catch (err) {
        App.toast(err.message, 'error');
      }
    });
  }
};
