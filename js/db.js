/* ============================================================
   db.js — Camada de dados (localStorage) — v2 com Crédito e Dívidas
   ============================================================ */
const DB = {
  KEYS: {
    WALLETS:       'fin_wallets',
    TRANSACTIONS:  'fin_transactions',
    CATEGORIES:    'fin_categories',
    DISTRIBUTIONS: 'fin_distributions',
    BILLINGS:      'fin_billings',
    BANKS:         'fin_banks',
    CREDIT_LINES:  'fin_credit_lines',
    DEBTS:         'fin_debts',
    BOXES:         'fin_boxes',
    BOX_TRANSACTIONS: 'fin_box_txs',
  },

  DEFAULT_CATEGORIES: [
    { id: 'c_alimentacao', name: 'Alimentação',  type: 'expense', color: '#e67e22', isDefault: true },
    { id: 'c_transporte',  name: 'Transporte',   type: 'expense', color: '#e74c3c', isDefault: true },
    { id: 'c_moradia',     name: 'Moradia',      type: 'expense', color: '#8e44ad', isDefault: true },
    { id: 'c_saude',       name: 'Saúde',        type: 'expense', color: '#27ae60', isDefault: true },
    { id: 'c_educacao',    name: 'Educação',     type: 'expense', color: '#2980b9', isDefault: true },
    { id: 'c_lazer',       name: 'Lazer',        type: 'expense', color: '#16a085', isDefault: true },
    { id: 'c_vestuario',   name: 'Vestuário',    type: 'expense', color: '#d35400', isDefault: true },
    { id: 'c_tecnologia',  name: 'Tecnologia',   type: 'expense', color: '#2c3e50', isDefault: true },
    { id: 'c_assinaturas', name: 'Assinaturas',  type: 'expense', color: '#7f8c8d', isDefault: true },
    { id: 'c_outros_exp',  name: 'Outros',       type: 'expense', color: '#95a5a6', isDefault: true },
    { id: 'c_salario',     name: 'Salário',      type: 'income',  color: '#27ae60', isDefault: true },
    { id: 'c_freelance',   name: 'Freelance',    type: 'income',  color: '#2ecc71', isDefault: true },
    { id: 'c_rendimento',  name: 'Rendimento',   type: 'income',  color: '#1abc9c', isDefault: true },
    { id: 'c_faturamento', name: 'Faturamento',  type: 'income',  color: '#3498db', isDefault: true },
    { id: 'c_outros_inc',  name: 'Outros',       type: 'income',  color: '#bdc3c7', isDefault: true },
  ],

  /* ---------- init ---------- */
  init() {
    const k = this.KEYS;
    if (!localStorage.getItem(k.WALLETS))       this._set(k.WALLETS, []);
    if (!localStorage.getItem(k.TRANSACTIONS))  this._set(k.TRANSACTIONS, []);
    if (!localStorage.getItem(k.DISTRIBUTIONS)) this._set(k.DISTRIBUTIONS, []);
    if (!localStorage.getItem(k.BILLINGS))      this._set(k.BILLINGS, []);
    if (!localStorage.getItem(k.CATEGORIES))    this._set(k.CATEGORIES, this.DEFAULT_CATEGORIES);
    if (!localStorage.getItem(k.BANKS))         this._set(k.BANKS, []);
    if (!localStorage.getItem(k.CREDIT_LINES))  this._set(k.CREDIT_LINES, []);
    if (!localStorage.getItem(k.DEBTS))         this._set(k.DEBTS, []);
    if (!localStorage.getItem(k.BOXES))         this._set(k.BOXES, []);
    if (!localStorage.getItem(k.BOX_TRANSACTIONS)) this._set(k.BOX_TRANSACTIONS, []);
  },

  _get(key)      { return JSON.parse(localStorage.getItem(key) || '[]'); },
  _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  _uuid()        { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

  /* ============================================================
     CARTEIRAS
     ============================================================ */
  getWallets()   { return this._get(this.KEYS.WALLETS).filter(w => !w.archived); },
  getAllWallets() { return this._get(this.KEYS.WALLETS); },

  addWallet(data) {
    const list = this._get(this.KEYS.WALLETS);
    const item = { id: this._uuid(), archived: false, createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this._set(this.KEYS.WALLETS, list);
    return item;
  },

  updateWallet(id, data) {
    this._set(this.KEYS.WALLETS, this._get(this.KEYS.WALLETS).map(w => w.id === id ? { ...w, ...data } : w));
  },

  deleteWallet(id) {
    const txs  = this.getTransactions();
    const used = txs.some(t => t.walletId === id || t.toWalletId === id);
    if (used) throw new Error('Esta carteira possui transações e não pode ser excluída.\nRemova as transações primeiro.');
    this._set(this.KEYS.DISTRIBUTIONS, this._get(this.KEYS.DISTRIBUTIONS).filter(d => d.walletId !== id));
    this._set(this.KEYS.WALLETS, this._get(this.KEYS.WALLETS).filter(w => w.id !== id));
  },

  getWalletBalance(walletId) {
    return this.getTransactions().reduce((bal, t) => {
      if (t.type === 'income'   && t.walletId   === walletId) return bal + t.amount;
      if (t.type === 'expense'  && t.walletId   === walletId) return bal - t.amount;
      if (t.type === 'transfer') {
        if (t.walletId   === walletId) return bal - t.amount;
        if (t.toWalletId === walletId) return bal + t.amount;
      }
      return bal;
    }, 0);
  },

  getWalletSummary(walletId) {
    const total = this.getWalletBalance(walletId);
    const boxes = this.getBoxes().filter(b => b.walletId === walletId);
    const reserved = boxes.reduce((sum, b) => sum + this.getBoxBalance(b.id), 0);
    return {
      total,
      reserved,
      free: total - reserved
    };
  },

  /* ============================================================
     CAIXINHAS (BOXES) E ALOCAÇÕES
     ============================================================ */
  getBoxes() { return this._get(this.KEYS.BOXES); },

  addBox(data) {
    const list = this._get(this.KEYS.BOXES);
    const item = { id: this._uuid(), createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this._set(this.KEYS.BOXES, list);
    return item;
  },

  updateBox(id, data) {
    this._set(this.KEYS.BOXES, this._get(this.KEYS.BOXES).map(b => b.id === id ? { ...b, ...data } : b));
  },

  deleteBox(id) {
    if (this.getBoxBalance(id) > 0) throw new Error('Não é possível excluir uma caixinha com saldo.');
    this._set(this.KEYS.BOXES, this._get(this.KEYS.BOXES).filter(b => b.id !== id));
    this._set(this.KEYS.BOX_TRANSACTIONS, this._get(this.KEYS.BOX_TRANSACTIONS).filter(t => t.boxId !== id));
  },

  getBoxTransactions() { return this._get(this.KEYS.BOX_TRANSACTIONS); },

  getBoxBalance(boxId) {
    const boxBal = this.getBoxTransactions().reduce((bal, t) => {
      if (t.boxId === boxId) {
        return bal + (t.type === 'in' ? t.amount : -t.amount);
      }
      return bal;
    }, 0);
    
    const expBal = this.getTransactions().reduce((bal, t) => {
      if (t.type === 'expense' && t.boxId === boxId) {
        return bal + t.amount;
      }
      return bal;
    }, 0);

    return boxBal - expBal;
  },

  addBoxTransaction(data) {
    const list = this._get(this.KEYS.BOX_TRANSACTIONS);
    const item = { id: this._uuid(), createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this._set(this.KEYS.BOX_TRANSACTIONS, list);
    return item;
  },

  /* ============================================================
     TRANSAÇÕES
     ============================================================ */
  getTransactions() { return this._get(this.KEYS.TRANSACTIONS); },

  addTransaction(data) {
    const list = this._get(this.KEYS.TRANSACTIONS);
    const item = { id: this._uuid(), createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this._set(this.KEYS.TRANSACTIONS, list);
    return item;
  },

  updateTransaction(id, data) {
    this._set(this.KEYS.TRANSACTIONS, this._get(this.KEYS.TRANSACTIONS).map(t => t.id === id ? { ...t, ...data } : t));
  },

  deleteTransaction(id) {
    const tx = this.getTransactions().find(t => t.id === id);
    if (tx && tx.billingId) {
      this._set(this.KEYS.TRANSACTIONS, this.getTransactions().filter(t => t.billingId !== tx.billingId));
      this._set(this.KEYS.BILLINGS, this._get(this.KEYS.BILLINGS).filter(b => b.id !== tx.billingId));
    } else {
      this._set(this.KEYS.TRANSACTIONS, this.getTransactions().filter(t => t.id !== id));
    }
  },

  /* ============================================================
     CATEGORIAS
     ============================================================ */
  getCategories() { return this._get(this.KEYS.CATEGORIES); },

  addCategory(data) {
    const list = this._get(this.KEYS.CATEGORIES);
    const item = { id: this._uuid(), isDefault: false, ...data };
    list.push(item);
    this._set(this.KEYS.CATEGORIES, list);
    return item;
  },

  deleteCategory(id) {
    const cat = this.getCategories().find(c => c.id === id);
    if (!cat)          throw new Error('Categoria não encontrada.');
    if (cat.isDefault) throw new Error('Categorias padrão não podem ser removidas.');
    this._set(this.KEYS.CATEGORIES, this.getCategories().filter(c => c.id !== id));
  },

  /* ============================================================
     DISTRIBUIÇÕES
     ============================================================ */
  getDistributions()      { return this._get(this.KEYS.DISTRIBUTIONS); },
  saveDistributions(list) { this._set(this.KEYS.DISTRIBUTIONS, list); },

  /* ============================================================
     FATURAMENTOS
     ============================================================ */
  getBillings() { return this._get(this.KEYS.BILLINGS); },

  addBilling(data) {
    const list = this._get(this.KEYS.BILLINGS);
    const item = { id: this._uuid(), createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this._set(this.KEYS.BILLINGS, list);
    return item;
  },

  deleteBilling(id) {
    this._set(this.KEYS.BILLINGS, this.getBillings().filter(b => b.id !== id));
    this._set(this.KEYS.TRANSACTIONS, this.getTransactions().filter(t => t.billingId !== id));
  },

  /* ============================================================
     BANCOS
     ============================================================ */
  getBanks()   { return this._get(this.KEYS.BANKS); },

  addBank(data) {
    const list = this._get(this.KEYS.BANKS);
    const item = { id: this._uuid(), createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this._set(this.KEYS.BANKS, list);
    return item;
  },

  updateBank(id, data) {
    this._set(this.KEYS.BANKS, this._get(this.KEYS.BANKS).map(b => b.id === id ? { ...b, ...data } : b));
  },

  deleteBank(id) {
    const lines = this.getCreditLines().filter(l => l.bankId === id);
    if (lines.length > 0) throw new Error('Remova as linhas de crédito deste banco primeiro.');
    const debts = this.getDebts().filter(d => d.bankId === id);
    if (debts.length > 0) throw new Error('Remova as dívidas vinculadas a este banco primeiro.');
    this._set(this.KEYS.BANKS, this._get(this.KEYS.BANKS).filter(b => b.id !== id));
  },

  /* ============================================================
     LINHAS DE CRÉDITO
     ============================================================ */
  getCreditLines() { return this._get(this.KEYS.CREDIT_LINES); },

  addCreditLine(data) {
    const list = this._get(this.KEYS.CREDIT_LINES);
    const item = { id: this._uuid(), createdAt: new Date().toISOString(), ...data };
    list.push(item);
    this._set(this.KEYS.CREDIT_LINES, list);
    return item;
  },

  updateCreditLine(id, data) {
    this._set(this.KEYS.CREDIT_LINES, this._get(this.KEYS.CREDIT_LINES).map(l => l.id === id ? { ...l, ...data } : l));
  },

  deleteCreditLine(id) {
    this._set(this.KEYS.CREDIT_LINES, this._get(this.KEYS.CREDIT_LINES).filter(l => l.id !== id));
  },

  /* Totais de crédito */
  getCreditSummary() {
    const lines = this.getCreditLines();
    const totalLimit     = lines.reduce((s, l) => s + (l.limit || 0), 0);
    const totalUsed      = lines.reduce((s, l) => s + (l.used  || 0), 0);
    const totalAvailable = totalLimit - totalUsed;
    const utilization    = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
    return { totalLimit, totalUsed, totalAvailable, utilization };
  },

  /* ============================================================
     DÍVIDAS
     ============================================================ */
  getDebts() { return this._get(this.KEYS.DEBTS); },

  addDebt(data) {
    const list = this._get(this.KEYS.DEBTS);
    const item = { id: this._uuid(), createdAt: new Date().toISOString(), status: 'active', ...data };
    list.push(item);
    this._set(this.KEYS.DEBTS, list);
    return item;
  },

  updateDebt(id, data) {
    this._set(this.KEYS.DEBTS, this._get(this.KEYS.DEBTS).map(d => d.id === id ? { ...d, ...data } : d));
  },

  deleteDebt(id) {
    this._set(this.KEYS.DEBTS, this._get(this.KEYS.DEBTS).filter(d => d.id !== id));
  },

  /* Pagar uma parcela da dívida */
  payDebtInstallment(debtId, walletId, date) {
    const debt = this.getDebts().find(d => d.id === debtId);
    if (!debt) throw new Error('Dívida não encontrada.');
    const payment = debt.monthlyPayment || 0;

    // Lança transação de saída na carteira escolhida
    if (walletId) {
      this.addTransaction({
        type:        'expense',
        amount:      payment,
        walletId,
        date:        date || Utils.today(),
        description: `Parcela: ${debt.name}`,
        categoryId:  null,
        debtId,
      });
    }

    // Atualiza dívida
    const newRemaining     = Math.max(0, (debt.remainingAmount || 0) - payment);
    const newPaid          = (debt.paidInstallments || 0) + 1;
    const isFullyPaid      = newRemaining <= 0;
    this.updateDebt(debtId, {
      remainingAmount:   newRemaining,
      paidInstallments:  newPaid,
      status:            isFullyPaid ? 'paid' : 'active',
    });
    return payment;
  },

  /* Totais de dívidas */
  getDebtSummary() {
    const debts          = this.getDebts().filter(d => d.status !== 'paid');
    const totalRemaining = debts.reduce((s, d) => s + (d.remainingAmount || 0), 0);
    const totalMonthly   = debts.reduce((s, d) => s + (d.monthlyPayment  || 0), 0);
    const avgInterest    = debts.length > 0
      ? debts.reduce((s, d) => s + (d.interestRate || 0), 0) / debts.length
      : 0;
    return { totalRemaining, totalMonthly, avgInterest, count: debts.length };
  },

  /* Cálculo de alocação inteligente */
  getDebtAllocation(strategy = 'avalanche') {
    const debts = this.getDebts()
      .filter(d => d.status !== 'paid' && (d.remainingAmount || 0) > 0);

    if (debts.length === 0) return [];

    // Avalanche: maior juros primeiro | Snowball: menor saldo primeiro
    const sorted = [...debts].sort((a, b) => {
      if (strategy === 'avalanche') return (b.interestRate || 0) - (a.interestRate || 0);
      return (a.remainingAmount || 0) - (b.remainingAmount || 0);
    });

    return sorted.map((d, i) => ({
      ...d,
      priority: i + 1,
      isPrimary: i === 0,
      monthsToPayoff: d.monthlyPayment > 0
        ? Math.ceil((d.remainingAmount || 0) / d.monthlyPayment)
        : null,
    }));
  },

  /* ============================================================
     EXPORTAÇÃO EXCEL
     ============================================================ */
  exportToExcel() {
    if (typeof XLSX === 'undefined') { alert('Biblioteca XLSX não carregada.'); return; }

    const wb      = XLSX.utils.book_new();
    const wallets = this.getAllWallets();
    const cats    = this.getCategories();
    const banks   = this.getBanks();
    const txs     = this.getTransactions().sort((a, b) => b.date.localeCompare(a.date));

    // Transações
    const txData = txs.map(t => {
      const w   = wallets.find(x => x.id === t.walletId);
      const tw  = wallets.find(x => x.id === t.toWalletId);
      const cat = cats.find(x => x.id === t.categoryId);
      return {
        'Data': t.date, 'Tipo': { income: 'Entrada', expense: 'Saída', transfer: 'Transferência' }[t.type] || t.type,
        'Descrição': t.description || '', 'Categoria': cat?.name || '',
        'Carteira': w?.name || '', 'Carteira Destino': tw?.name || '',
        'Valor (R$)': t.amount,
      };
    });
    if (txData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txData), 'Transações');

    // Carteiras
    const wData = wallets.map(w => ({
      'Carteira': w.name,
      'Saldo (R$)': parseFloat(this.getWalletBalance(w.id).toFixed(2)),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wData), 'Carteiras');

    // Crédito
    const clData = this.getCreditLines().map(l => {
      const bank = banks.find(b => b.id === l.bankId);
      return {
        'Banco': bank?.name || '', 'Nome': l.name,
        'Tipo': l.type, 'Limite (R$)': l.limit,
        'Utilizado (R$)': l.used, 'Disponível (R$)': l.limit - l.used,
        'Juros % a.m.': l.interestRate,
      };
    });
    if (clData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clData), 'Crédito');

    // Dívidas
    const dData = this.getDebts().map(d => {
      const bank = banks.find(b => b.id === d.bankId);
      return {
        'Nome': d.name, 'Banco': bank?.name || '', 'Tipo': d.type,
        'Original (R$)': d.originalAmount, 'Restante (R$)': d.remainingAmount,
        'Parcela (R$)': d.monthlyPayment, 'Juros % a.m.': d.interestRate,
        'Parcelas Pagas': d.paidInstallments || 0, 'Total Parcelas': d.installments || '',
        'Status': d.status,
      };
    });
    if (dData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dData), 'Dívidas');

    const filename = `financas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    if (window.App) App.toast(`"${filename}" exportado!`, 'success');
  },
};
