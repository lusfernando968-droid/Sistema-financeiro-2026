/* ============================================================
   pages/categories.js
   ============================================================ */
const CategoriesPage = {

  render(container) {
    const categories = DB.getCategories();
    const incCats    = categories.filter(c => c.type === 'income');
    const expCats    = categories.filter(c => c.type === 'expense');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">Categorias</div>
          <div class="page-header-sub">Organize seus lançamentos por categoria</div>
        </div>
        <button class="btn btn-primary" id="btn-new-cat">+ Nova Categoria</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div class="card">
          <div class="card-header"><span class="card-title">Entradas</span></div>
          ${incCats.length === 0
            ? `<div class="empty-state" style="padding:24px"><div class="empty-state-text">Nenhuma categoria de entrada</div></div>`
            : incCats.map(c => this._row(c)).join('')}
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Saídas</span></div>
          ${expCats.length === 0
            ? `<div class="empty-state" style="padding:24px"><div class="empty-state-text">Nenhuma categoria de saída</div></div>`
            : expCats.map(c => this._row(c)).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-new-cat')?.addEventListener('click', () => this.openForm());
  },

  _row(c) {
    return `
      <div class="category-item">
        <span class="color-dot" style="background:${c.color || '#ccc'}"></span>
        <span class="category-name">${Utils.escapeHtml(c.name)}</span>
        ${c.isDefault
          ? `<span class="badge" style="background:var(--border);color:var(--text-tertiary);font-size:10.5px">Padrão</span>`
          : `<button class="btn-icon" title="Excluir" onclick="CategoriesPage._confirmDelete('${c.id}')">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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
            <option value="expense">Saída</option>
            <option value="income">Entrada</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Cor</label>
          <input type="color" class="form-control" id="cat-color" value="#7f8c8d"
            style="height:38px;cursor:pointer;padding:3px 6px">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Criar categoria</button>
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
