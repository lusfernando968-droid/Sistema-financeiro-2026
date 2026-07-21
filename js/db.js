/* ============================================================
   db.js — Camada de dados (Supabase Cloud + In-Memory Cache)
   ============================================================ */

const SUPABASE_URL = 'https://wrwjsqizpiutfoheriuv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyd2pzcWl6cGl1dGZvaGVyaXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzE5MjIsImV4cCI6MjEwMDEwNzkyMn0.b2K2v1IK5nE9aDW7bj5tIsQIPklVqIvBCdo2quxDGtU';

// _sb is the Supabase client instance (named to avoid collision with the CDN global 'supabase')
let _sb = null;

const DB = {
  state: {
    wallets: [],
    transactions: [],
    categories: [],
    distributions: [],
    billings: [],
    banks: [],
    credit_lines: [],
    debts: [],
    boxes: [],
    box_transactions: []
  },

  DEFAULT_CATEGORIES: [
    { id: 'c_alimentacao', name: 'Alimentação',  type: 'expense', color: '#e67e22', is_default: true },
    { id: 'c_transporte',  name: 'Transporte',   type: 'expense', color: '#e74c3c', is_default: true },
    { id: 'c_moradia',     name: 'Moradia',      type: 'expense', color: '#8e44ad', is_default: true },
    { id: 'c_saude',       name: 'Saúde',        type: 'expense', color: '#27ae60', is_default: true },
    { id: 'c_educacao',    name: 'Educação',     type: 'expense', color: '#2980b9', is_default: true },
    { id: 'c_lazer',       name: 'Lazer',        type: 'expense', color: '#16a085', is_default: true },
    { id: 'c_vestuario',   name: 'Vestuário',    type: 'expense', color: '#d35400', is_default: true },
    { id: 'c_tecnologia',  name: 'Tecnologia',   type: 'expense', color: '#2c3e50', is_default: true },
    { id: 'c_assinaturas', name: 'Assinaturas',  type: 'expense', color: '#7f8c8d', is_default: true },
    { id: 'c_outros_exp',  name: 'Outros',       type: 'expense', color: '#95a5a6', is_default: true },
    { id: 'c_salario',     name: 'Salário',      type: 'income',  color: '#27ae60', is_default: true },
    { id: 'c_freelance',   name: 'Freelance',    type: 'income',  color: '#2ecc71', is_default: true },
    { id: 'c_rendimento',  name: 'Rendimento',   type: 'income',  color: '#1abc9c', is_default: true },
    { id: 'c_faturamento', name: 'Faturamento',  type: 'income',  color: '#3498db', is_default: true },
    { id: 'c_outros_inc',  name: 'Outros',       type: 'income',  color: '#bdc3c7', is_default: true },
  ],

  async init() {
    try {
      // The CDN exports 'supabase' as a global with createClient on it
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      } else {
        console.error('Supabase CDN not loaded correctly');
        return;
      }

      // Fetch all data in parallel
      const responses = await Promise.all([
        _sb.from('wallets').select('*'),
        _sb.from('transactions').select('*'),
        _sb.from('categories').select('*'),
        _sb.from('distributions').select('*'),
        _sb.from('billings').select('*'),
        _sb.from('banks').select('*'),
        _sb.from('credit_lines').select('*'),
        _sb.from('debts').select('*'),
        _sb.from('boxes').select('*'),
        _sb.from('box_transactions').select('*')
      ]);

      responses.forEach((r, i) => {
        if (r.error) console.error('Supabase fetch error for table index ' + i + ':', r.error);
      });

      const wallets = responses[0].data || [];
      const transactions = responses[1].data || [];
      const categories = responses[2].data || [];
      const distributions = responses[3].data || [];
      const billings = responses[4].data || [];
      const banks = responses[5].data || [];
      const credit_lines = responses[6].data || [];
      const debts = responses[7].data || [];
      const boxes = responses[8].data || [];
      const box_txs = responses[9].data || [];

      this.state.wallets = this._camelizeArray(wallets);
      this.state.transactions = this._camelizeArray(transactions);
      this.state.categories = this._camelizeArray(categories);
      this.state.distributions = this._camelizeArray(distributions);
      this.state.billings = this._camelizeArray(billings);
      this.state.banks = this._camelizeArray(banks);
      this.state.credit_lines = this._camelizeArray(credit_lines);
      this.state.debts = this._camelizeArray(debts);
      this.state.boxes = this._camelizeArray(boxes);
      this.state.box_transactions = this._camelizeArray(box_txs);

      // Initialize default categories if table is empty
      if (this.state.categories.length === 0) {
        for (const cat of this.DEFAULT_CATEGORIES) {
          await _sb.from('categories').insert([cat]);
        }
        const { data: newCats } = await _sb.from('categories').select('*');
        this.state.categories = this._camelizeArray(newCats || []);
      }
    } catch (err) {
      console.error('Critical error in DB.init():', err);
      if (window.App) App.toast('Erro ao conectar ao banco de dados', 'error');
    }
  },

  _uuid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

  // Helpers to convert snake_case to camelCase for the app logic
  _camelize(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this._camelize(item));
    const newObj = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      const val = obj[key];
      // Recursively camelize nested arrays/objects
      newObj[camelKey] = Array.isArray(val)
        ? val.map(v => (v && typeof v === 'object') ? this._camelize(v) : v)
        : (val && typeof val === 'object') ? this._camelize(val) : val;
    }
    return newObj;
  },
  _camelizeArray(arr) { return arr.map(item => this._camelize(item)); },

  _snakify(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this._snakify(item));
    const newObj = {};
    for (const key in obj) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      const val = obj[key];
      // Recursively snakify nested arrays/objects
      newObj[snakeKey] = Array.isArray(val)
        ? val.map(v => (v && typeof v === 'object') ? this._snakify(v) : v)
        : (val && typeof val === 'object') ? this._snakify(val) : val;
    }
    return newObj;
  },

  async _insert(table, item) {
    const dbItem = this._snakify(item);
    const { error } = await _sb.from(table).insert([dbItem]);
    if (error) console.error(`Error inserting into ${table}:`, error);
  },

  async _update(table, id, data) {
    const dbData = this._snakify(data);
    const { error } = await _sb.from(table).update(dbData).eq('id', id);
    if (error) console.error(`Error updating ${table}:`, error);
  },

  async _delete(table, id) {
    const { error } = await _sb.from(table).delete().eq('id', id);
    if (error) console.error(`Error deleting from ${table}:`, error);
  },

  /* ============================================================
     CARTEIRAS
     ============================================================ */
  getWallets()   { return this.state.wallets.filter(w => !w.archived); },
  getAllWallets() { return this.state.wallets; },

  addWallet(data) {
    const item = { id: this._uuid(), archived: false, ...data };
    this.state.wallets.push(item);
    this._insert('wallets', item);
    return item;
  },

  updateWallet(id, data) {
    const idx = this.state.wallets.findIndex(w => w.id === id);
    if (idx > -1) {
      this.state.wallets[idx] = { ...this.state.wallets[idx], ...data };
      this._update('wallets', id, data);
    }
  },

  deleteWallet(id) {
    const txs  = this.getTransactions();
    const used = txs.some(t => t.walletId === id || t.toWalletId === id);
    if (used) throw new Error('Esta carteira possui transações e não pode ser excluída.');
    
    this.state.distributions = this.state.distributions.filter(d => d.walletId !== id);
    this.state.wallets = this.state.wallets.filter(w => w.id !== id);
    
    _sb.from('distributions').delete().eq('wallet_id', id).then();
    this._delete('wallets', id);
  },

  getWalletBalance(walletId) {
    return this.getTransactions().reduce((bal, t) => {
      if (t.type === 'income'   && t.walletId   === walletId) return bal + Number(t.amount);
      if (t.type === 'expense'  && t.walletId   === walletId) return bal - Number(t.amount);
      if (t.type === 'transfer') {
        if (t.walletId   === walletId) return bal - Number(t.amount);
        if (t.toWalletId === walletId) return bal + Number(t.amount);
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
  getBoxes() { return this.state.boxes; },

  addBox(data) {
    const item = { id: this._uuid(), ...data };
    this.state.boxes.push(item);
    this._insert('boxes', item);
    return item;
  },

  updateBox(id, data) {
    const idx = this.state.boxes.findIndex(b => b.id === id);
    if (idx > -1) {
      this.state.boxes[idx] = { ...this.state.boxes[idx], ...data };
      this._update('boxes', id, data);
    }
  },

  deleteBox(id) {
    if (this.getBoxBalance(id) > 0) throw new Error('Não é possível excluir uma caixinha com saldo.');
    this.state.boxes = this.state.boxes.filter(b => b.id !== id);
    this.state.box_transactions = this.state.box_transactions.filter(t => t.boxId !== id);
    this._delete('boxes', id);
  },

  getBoxTransactions() { return this.state.box_transactions; },

  getBoxBalance(boxId) {
    const boxBal = this.getBoxTransactions().reduce((bal, t) => {
      if (t.boxId === boxId) {
        return bal + (t.type === 'in' ? Number(t.amount) : -Number(t.amount));
      }
      return bal;
    }, 0);
    
    const expBal = this.getTransactions().reduce((bal, t) => {
      if (t.type === 'expense' && t.boxId === boxId) {
        return bal + Number(t.amount);
      }
      return bal;
    }, 0);

    return boxBal - expBal;
  },

  addBoxTransaction(data) {
    const item = { id: this._uuid(), ...data };
    this.state.box_transactions.push(item);
    this._insert('box_transactions', item);
    return item;
  },

  /* ============================================================
     TRANSAÇÕES
     ============================================================ */
  getTransactions() { return this.state.transactions; },

  addTransaction(data) {
    const item = { id: this._uuid(), ...data };
    this.state.transactions.push(item);
    this._insert('transactions', item);
    return item;
  },

  updateTransaction(id, data) {
    const idx = this.state.transactions.findIndex(t => t.id === id);
    if (idx > -1) {
      this.state.transactions[idx] = { ...this.state.transactions[idx], ...data };
      this._update('transactions', id, data);
    }
  },

  deleteTransaction(id) {
    const tx = this.getTransactions().find(t => t.id === id);
    if (tx && tx.billingId) {
      this.state.transactions = this.state.transactions.filter(t => t.billingId !== tx.billingId);
      this.state.billings = this.state.billings.filter(b => b.id !== tx.billingId);
      _sb.from('transactions').delete().eq('billing_id', tx.billingId).then();
      _sb.from('billings').delete().eq('id', tx.billingId).then();
    } else {
      this.state.transactions = this.state.transactions.filter(t => t.id !== id);
      this._delete('transactions', id);
    }
  },

  /* ============================================================
     CATEGORIAS
     ============================================================ */
  getCategories() { return this.state.categories; },

  addCategory(data) {
    const item = { id: this._uuid(), isDefault: false, ...data };
    this.state.categories.push(item);
    this._insert('categories', item);
    return item;
  },

  deleteCategory(id) {
    const cat = this.getCategories().find(c => c.id === id);
    if (!cat) throw new Error('Categoria não encontrada.');
    if (cat.isDefault) throw new Error('Categorias padrão não podem ser removidas.');
    this.state.categories = this.state.categories.filter(c => c.id !== id);
    this._delete('categories', id);
  },

  /* ============================================================
     DISTRIBUIÇÕES
     ============================================================ */
  getDistributions() { return this.state.distributions; },
  
  saveDistributions(list) {
    this.state.distributions = list.map(item => ({ id: this._uuid(), ...item }));
    _sb.from('distributions').delete().neq('id', '00000000').then(() => {
      if (this.state.distributions.length > 0) {
        _sb.from('distributions').insert(this.state.distributions.map(d => this._snakify(d))).then();
      }
    });
  },

  /* ============================================================
     FATURAMENTOS
     ============================================================ */
  getBillings() { return this.state.billings; },

  addBilling(data) {
    const item = { id: this._uuid(), ...data };
    this.state.billings.push(item);
    this._insert('billings', item);
    return item;
  },

  deleteBilling(id) {
    this.state.billings = this.state.billings.filter(b => b.id !== id);
    this.state.transactions = this.state.transactions.filter(t => t.billingId !== id);
    this._delete('billings', id);
  },

  /* ============================================================
     BANCOS
     ============================================================ */
  getBanks() { return this.state.banks; },

  addBank(data) {
    const item = { id: this._uuid(), ...data };
    this.state.banks.push(item);
    this._insert('banks', item);
    return item;
  },

  updateBank(id, data) {
    const idx = this.state.banks.findIndex(b => b.id === id);
    if (idx > -1) {
      this.state.banks[idx] = { ...this.state.banks[idx], ...data };
      this._update('banks', id, data);
    }
  },

  deleteBank(id) {
    const lines = this.getCreditLines().filter(l => l.bankId === id);
    if (lines.length > 0) throw new Error('Remova as linhas de crédito deste banco primeiro.');
    const debts = this.getDebts().filter(d => d.bankId === id);
    if (debts.length > 0) throw new Error('Remova as dívidas vinculadas a este banco primeiro.');
    
    this.state.banks = this.state.banks.filter(b => b.id !== id);
    this._delete('banks', id);
  },

  /* ============================================================
     LINHAS DE CRÉDITO
     ============================================================ */
  getCreditLines() { return this.state.credit_lines; },

  addCreditLine(data) {
    const item = { id: this._uuid(), ...data };
    this.state.credit_lines.push(item);
    this._insert('credit_lines', item);
    return item;
  },

  updateCreditLine(id, data) {
    const idx = this.state.credit_lines.findIndex(l => l.id === id);
    if (idx > -1) {
      this.state.credit_lines[idx] = { ...this.state.credit_lines[idx], ...data };
      this._update('credit_lines', id, data);
    }
  },

  deleteCreditLine(id) {
    this.state.credit_lines = this.state.credit_lines.filter(l => l.id !== id);
    this._delete('credit_lines', id);
  },

  getCreditSummary() {
    const lines = this.getCreditLines();
    const totalLimit     = lines.reduce((s, l) => s + (Number(l.limit) || 0), 0);
    const totalUsed      = lines.reduce((s, l) => s + (Number(l.used)  || 0), 0);
    const totalAvailable = totalLimit - totalUsed;
    const utilization    = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
    return { totalLimit, totalUsed, totalAvailable, utilization };
  },

  /* ============================================================
     DÍVIDAS
     ============================================================ */
  getDebts() { return this.state.debts; },

  addDebt(data) {
    const item = { id: this._uuid(), status: 'active', ...data };
    this.state.debts.push(item);
    this._insert('debts', item);
    return item;
  },

  updateDebt(id, data) {
    const idx = this.state.debts.findIndex(d => d.id === id);
    if (idx > -1) {
      this.state.debts[idx] = { ...this.state.debts[idx], ...data };
      this._update('debts', id, data);
    }
  },

  deleteDebt(id) {
    this.state.debts = this.state.debts.filter(d => d.id !== id);
    this._delete('debts', id);
  },

  payDebtInstallment(debtId, walletId, date) {
    const debt = this.getDebts().find(d => d.id === debtId);
    if (!debt) throw new Error('Dívida não encontrada.');
    const payment = Number(debt.monthlyPayment) || 0;

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

    const newRemaining     = Math.max(0, (Number(debt.remainingAmount) || 0) - payment);
    const newPaid          = (Number(debt.paidInstallments) || 0) + 1;
    const isFullyPaid      = newRemaining <= 0;
    
    this.updateDebt(debtId, {
      remainingAmount:   newRemaining,
      paidInstallments:  newPaid,
      status:            isFullyPaid ? 'paid' : 'active',
    });
    return payment;
  },

  getDebtSummary() {
    const debts          = this.getDebts().filter(d => d.status !== 'paid');
    const totalRemaining = debts.reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0);
    const totalMonthly   = debts.reduce((s, d) => s + (Number(d.monthlyPayment)  || 0), 0);
    const avgInterest    = debts.length > 0
      ? debts.reduce((s, d) => s + (Number(d.interestRate) || 0), 0) / debts.length
      : 0;
    return { totalRemaining, totalMonthly, avgInterest, count: debts.length };
  },

  getDebtAllocation(strategy = 'avalanche') {
    const debts = this.getDebts()
      .filter(d => d.status !== 'paid' && (Number(d.remainingAmount) || 0) > 0);

    if (debts.length === 0) return [];

    const sorted = [...debts].sort((a, b) => {
      if (strategy === 'avalanche') return (Number(b.interestRate) || 0) - (Number(a.interestRate) || 0);
      return (Number(a.remainingAmount) || 0) - (Number(b.remainingAmount) || 0);
    });

    return sorted.map((d, i) => ({
      ...d,
      priority: i + 1,
      isPrimary: i === 0,
      monthsToPayoff: d.monthlyPayment > 0
        ? Math.ceil((Number(d.remainingAmount) || 0) / Number(d.monthlyPayment))
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
