/* ============================================================
   pages/architecture.js
   ============================================================ */
const ArchitecturePage = {
  render(container) {
    const wallets = DB.getWallets();
    const distributions = DB.getDistributions();
    const boxes = DB.getBoxes();

    let html = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Arquitetura Financeira</div>
          <div class="page-header-sub">Mapa de distribuição e caixinhas</div>
        </div>
      </div>
    `;

    if (wallets.length === 0) {
      html += `<div class="empty-state">
        <div class="empty-state-text">Nenhuma carteira encontrada</div>
        <div class="empty-state-sub">Crie carteiras e regras de faturamento primeiro.</div>
      </div>`;
      container.innerHTML = html;
      return;
    }

    html += `<div class="arch-container">`;
    
    html += `
      <div class="arch-node revenue">
        <div class="arch-node-title">Faturamento</div>
        <div class="arch-node-value">100%</div>
      </div>
      <!-- Linha vertical do nó raiz para os filhos - mais visível -->
      <div style="width:3px;height:28px;background:var(--text-tertiary);margin:0 auto;opacity:0.5;border-radius:2px"></div>
    `;

    if (distributions.length > 0) {
      html += `<div class="arch-branch-container">`;
      distributions.forEach(d => {
        const w = wallets.find(x => x.id === d.walletId);
        if (!w) return;
        const summary = DB.getWalletSummary(w.id);
        const wBoxes = boxes.filter(b => b.walletId === w.id);

        html += `
          <div class="arch-column">
            <div class="arch-tag">${d.percentage}%</div>
            <div class="arch-node wallet" style="border-top-color: ${w.color || 'var(--primary)'}">
              <div class="arch-node-title">${Utils.escapeHtml(w.name)}</div>
              <div class="arch-node-value">${Utils.formatBRL(summary.total)}</div>
              <div style="font-size:11.5px;color:var(--text-tertiary);margin-top:4px">Livre: <strong style="color:var(--text)">${Utils.formatBRL(summary.free)}</strong></div>
              <div style="margin-top:12px;display:flex;gap:4px;justify-content:center">
                <button class="btn btn-ghost btn-sm" onclick="ArchitecturePage.openNewBoxForm('${w.id}')" title="Nova Caixinha">+ Caixinha</button>
                <button class="btn btn-primary btn-sm" onclick="ArchitecturePage.openFechamentoForm('${w.id}')" title="Distribuir saldo livre">Alocar Capital</button>
              </div>
            </div>
            ${wBoxes.length > 0 ? `
              <!-- Linha vertical conectando carteira às caixinhas -->
              <div style="width:3px;height:20px;background:var(--text-tertiary);margin:0 auto;opacity:0.45;border-radius:2px"></div>
              <div class="arch-boxes">
                ${wBoxes.map(b => {
                  const bal = DB.getBoxBalance(b.id);
                  const walletTotal = summary.total;
                  const pctOfWallet = walletTotal > 0 ? ((bal / walletTotal) * 100).toFixed(1) : '0.0';
                  return `
                  <div class="box-card" style="position:relative">
                    <div style="position:absolute;top:8px;right:42px;font-size:10px;font-weight:600;color:${w.color||'var(--primary)'};background:${w.color||'var(--primary)'}18;padding:2px 6px;border-radius:10px">${b.percentage > 0 ? b.percentage+'%' : pctOfWallet+'%'}</div>
                    <div class="box-info" style="padding-right:8px">
                      <span class="box-name">${Utils.escapeHtml(b.name)}</span>
                      <span class="box-balance">${Utils.formatBRL(bal)}</span>
                    </div>
                    <button class="btn-icon" onclick="ArchitecturePage.openResgateForm('${b.id}')" title="Gerenciar Caixinha">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    </button>
                  </div>
                `}).join('')}
              </div>
            ` : ''}
          </div>
        `;
      });
      html += `</div>`;
    } else {
      html += `<p style="color:var(--text-tertiary);margin-top:20px;font-size:13px;">Configure a distribuição do <a href="#/billing" style="color:var(--primary)">Faturamento</a> para visualizar a árvore completa.</p>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  },


  openNewBoxForm(walletId) {
    App.openModal('Nova Caixinha', `
      <form id="box-form">
        <div class="form-group">
          <label class="form-label">Nome da Caixinha *</label>
          <input type="text" class="form-control" id="box-name" placeholder="Ex: Fundo de Emergência" required autofocus maxlength="40">
        </div>
        <div class="form-group">
          <label class="form-label">Alocação Automática (%)</label>
          <input type="number" class="form-control" id="box-pct" min="0" max="100" step="0.01" placeholder="Ex: 20">
          <div class="form-hint">Na hora de alocar capital, calcularemos essa % do saldo livre automaticamente.</div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Criar</button>
        </div>
      </form>
    `);

    document.getElementById('box-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('box-name').value.trim();
      const pct = parseFloat(document.getElementById('box-pct').value) || 0;
      if (!name) return;
      DB.addBox({ walletId, name, percentage: pct });
      App.toast('Caixinha criada!', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  openFechamentoForm(walletId) {
    const summary = DB.getWalletSummary(walletId);
    const boxes = DB.getBoxes().filter(b => b.walletId === walletId);

    if (boxes.length === 0) {
      App.toast('Crie pelo menos uma caixinha nesta carteira primeiro.', 'warning');
      return;
    }

    App.openModal('Alocação de Capital', `
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5">
        Saldo Livre disponível: <strong style="color:var(--text)">${Utils.formatBRL(summary.free)}</strong>.<br>
        O sistema já preencheu os valores baseados na sua configuração de porcentagem, mas você pode ajustar livremente.
      </p>
      <form id="fechamento-form">
        ${boxes.map(b => {
          const autoVal = (b.percentage > 0) ? (summary.free * (b.percentage / 100)).toFixed(2) : '';
          return `
            <div class="form-group">
              <label class="form-label" style="display:flex;justify-content:space-between">
                <span>${Utils.escapeHtml(b.name)}</span>
                ${b.percentage > 0 ? `<span style="color:var(--primary)">(${b.percentage}%)</span>` : ''}
              </label>
              <input type="number" class="form-control box-alloc" data-id="${b.id}" min="0" step="0.01" value="${autoVal}" placeholder="0,00">
            </div>
          `;
        }).join('')}
        
        <div class="dist-total" id="alloc-total-row" style="margin-bottom:16px">
          <span>Total Alocado</span>
          <span id="alloc-total-val">R$ 0,00</span>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Distribuir</button>
        </div>
      </form>
    `);

    const recalc = () => {
      const inputs = document.querySelectorAll('.box-alloc');
      const total = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
      document.getElementById('alloc-total-val').textContent = Utils.formatBRL(total);
      
      const row = document.getElementById('alloc-total-row');
      if (total > summary.free) {
        row.className = 'dist-total invalid';
      } else if (total > 0) {
        row.className = 'dist-total valid';
      } else {
        row.className = 'dist-total partial';
      }
    };

    document.querySelectorAll('.box-alloc').forEach(i => i.addEventListener('input', recalc));
    recalc();
    
    document.getElementById('fechamento-form').addEventListener('submit', e => {
      e.preventDefault();
      const inputs = document.querySelectorAll('.box-alloc');
      const total = Array.from(inputs).reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
      
      if (total <= 0) {
        App.toast('Insira algum valor para alocar.', 'warning');
        return;
      }
      if (total > summary.free) {
        App.toast('O total alocado excede o saldo livre!', 'error');
        return;
      }

      inputs.forEach(i => {
        const val = parseFloat(i.value);
        if (val > 0) {
          DB.addBoxTransaction({ boxId: i.dataset.id, type: 'in', amount: val });
        }
      });

      App.toast('Fechamento realizado com sucesso!', 'success');
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  openResgateForm(boxId) {
    const box = DB.getBoxes().find(b => b.id === boxId);
    if (!box) return;
    const balance = DB.getBoxBalance(boxId);

    App.openModal(`Gerenciar: ${Utils.escapeHtml(box.name)}`, `
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
        Saldo atual na caixinha: <strong style="color:var(--text)">${Utils.formatBRL(balance)}</strong>
      </p>
      <form id="resgate-form">
        <div class="form-group">
          <label class="form-label">Alocação Automática (%)</label>
          <input type="number" class="form-control" id="resgate-pct" min="0" max="100" step="0.01" value="${box.percentage || ''}" placeholder="Ex: 20">
          <div class="form-hint" style="margin-bottom:14px">Altere a porcentagem automática na alocação de capital.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Resgatar para Saldo Livre (R$)</label>
          <input type="number" class="form-control" id="resgate-amount" min="0.01" step="0.01" max="${balance}" placeholder="0,00">
        </div>
        <div class="form-actions" style="margin-top:24px">
          <button type="button" class="btn btn-danger" onclick="ArchitecturePage.deleteBox('${boxId}')">Excluir Caixinha</button>
          <div style="flex:1"></div>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar / Resgatar</button>
        </div>
      </form>
    `);

    document.getElementById('resgate-form').addEventListener('submit', e => {
      e.preventDefault();
      
      const pct = parseFloat(document.getElementById('resgate-pct').value) || 0;
      DB.updateBox(boxId, { percentage: pct });

      const amount = parseFloat(document.getElementById('resgate-amount').value);
      if (amount && amount > 0 && amount <= balance) {
        DB.addBoxTransaction({ boxId, type: 'out', amount });
        App.toast('Resgate realizado e configurações salvas!', 'success');
      } else {
        App.toast('Configurações da caixinha atualizadas!', 'success');
      }
      
      App.closeModal();
      this.render(document.getElementById('content'));
    });
  },

  deleteBox(boxId) {
    try {
      App.confirm('Excluir Caixinha', 'Tem certeza? A caixinha precisa estar com saldo zero.', () => {
        try {
          DB.deleteBox(boxId);
          App.toast('Caixinha excluída.', 'success');
          App.closeModal();
          this.render(document.getElementById('content'));
        } catch(err) {
          App.toast(err.message, 'error');
        }
      });
    } catch(e) {
      App.toast(e.message, 'error');
    }
  }
};
