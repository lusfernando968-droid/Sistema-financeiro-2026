/* ============================================================
   pages/categories.js
   ============================================================ */
const CategoriesPage = {
  currentTab: 'expense', // default tab

  render(container) {
    const categories = DB.getCategories();
    
    // Filter by current tab
    const filteredCats = categories.filter(c => c.type === this.currentTab);

    // Segmented Control HTML
    const segmentedControl = `
      <div class="segmented-control" style="display:flex; background:var(--bg-secondary, #f2f2f7); border-radius:8px; padding:2px; margin-bottom:20px;">
        <button class="seg-btn ${this.currentTab === 'expense' ? 'active' : ''}" 
                onclick="CategoriesPage.setTab('expense')" 
                style="flex:1; border:none; background:${this.currentTab === 'expense' ? '#fff' : 'transparent'}; 
                       border-radius:6px; padding:8px; font-weight:${this.currentTab === 'expense' ? '600' : '400'}; 
                       box-shadow:${this.currentTab === 'expense' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; 
                       color:var(--text-primary); cursor:pointer; transition:all 0.2s;">
          Saídas
        </button>
        <button class="seg-btn ${this.currentTab === 'income' ? 'active' : ''}" 
                onclick="CategoriesPage.setTab('income')" 
                style="flex:1; border:none; background:${this.currentTab === 'income' ? '#fff' : 'transparent'}; 
                       border-radius:6px; padding:8px; font-weight:${this.currentTab === 'income' ? '600' : '400'}; 
                       box-shadow:${this.currentTab === 'income' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; 
                       color:var(--text-primary); cursor:pointer; transition:all 0.2s;">
          Entradas
        </button>
      </div>
    `;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Categorias</div>
          <div class="page-header-sub">Organize seus lançamentos por categoria</div>
        </div>
        <button class="btn btn-primary" style="background:#000; color:#fff; border:none;" id="btn-new-cat">+ Nova Categoria</button>
      </div>

      ${segmentedControl}

      <div class="card" style="border-radius:12px; border:1px solid #e5e5ea; box-shadow:none;">
        <div class="card-header" style="border-bottom: 1px solid #e5e5ea;">
          <span class="card-title">${this.currentTab === 'expense' ? 'Despesas' : 'Receitas'}</span>
        </div>
        ${filteredCats.length === 0
          ? `<div class="empty-state" style="padding:24px"><div class="empty-state-text">Nenhuma categoria encontrada</div></div>`
          : filteredCats.map(c => this._row(c)).join('')}
      </div>
    `;

    document.getElementById('btn-new-cat')?.addEventListener('click', () => this.openForm());
  },

  setTab(tab) {
    this.currentTab = tab;
    this.render(document.getElementById('content'));
  },

  _row(c) {
    return `
      <div class="category-item" style="padding:12px 16px; border-bottom:1px solid #f2f2f7; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="color-dot" style="background:${c.color || '#ccc'}; width:10px; height:10px; border-radius:50%; display:inline-block;"></span>
          <span class="category-name" style="font-weight:500;">${Utils.escapeHtml(c.name)}</span>
        </div>
        ${c.isDefault
          ? `<span class="badge" style="background:#f2f2f7; color:#8e8e93; font-size:10.5px; padding:4px 8px; border-radius:12px; font-weight:600;">Padrão</span>`
          : `<button class="btn-icon" title="Excluir" onclick="CategoriesPage._confirmDelete('${c.id}')" style="color:#8e8e93;">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20">
                 <polyline points="3 6 5 6 21 6"/>
                 <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                 <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
               </svg>
             </button>`
        }
      </div>
    `;
  },

  openForm() {
    App.openModal('Nova Categoria', `
      <form id="cat-form">
        <div class="form-group">
          <label class="form-label">Nome *</label>
          <input type="text" class="form-control" id="cat-name"
            placeholder="Ex: Assinaturas, Streaming..." maxlength="40" required autofocus>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select class="form-control" id="cat-type" required>
            <option value="expense" ${this.currentTab === 'expense' ? 'selected' : ''}>Saída</option>
            <option value="income" ${this.currentTab === 'income' ? 'selected' : ''}>Entrada</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Cor</label>
          <input type="color" class="form-control" id="cat-color" value="#7f8c8d"
            style="height:38px;cursor:pointer;padding:3px 6px">
        </div>
        <div class="form-actions" style="margin-top:24px;">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary" style="background:#000; color:#fff; border:none;">Criar</button>
        </div>
      </form>
    `);

    document.getElementById('cat-form').addEventListener('submit', e => {
      e.preventDefault();
      const name  = document.getElementById('cat-name').value.trim();
      const type  = document.getElementById('cat-type').value;
      const color = document.getElementById('cat-color').value;
      
      if (!name) return;

      DB.addCategory({ name, type, color });
      App.toast('Categoria criada!', 'success');
      App.closeModal();
      // change tab if we created a category on a different tab
      if (this.currentTab !== type) {
          this.currentTab = type;
      }
      this.render(document.getElementById('content'));
    });
  },

  _confirmDelete(id) {
    const cat = DB.getCategories().find(c => c.id === id);
    App.confirm(
      `Excluir "${Utils.escapeHtml(cat?.name || '')}"?`,
      'As transações com esta categoria não serão afetadas.',
      () => {
        try {
          DB.deleteCategory(id);
          App.toast('Categoria excluída.', 'success');
          this.render(document.getElementById('content'));
        } catch (err) {
          App.toast(err.message, 'error');
        }
      }
    );
  },
};

