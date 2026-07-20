/* ============================================================
   utils.js — Funções utilitárias
   ============================================================ */
const Utils = {

  formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  },

  today() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  typeLabel(type) {
    return { income: 'Entrada', expense: 'Saída', transfer: 'Transferência' }[type] || type;
  },

  typeBadge(type) {
    const classes = { income: 'badge-income', expense: 'badge-expense', transfer: 'badge-transfer' };
    return `<span class="badge ${classes[type] || ''}">${this.typeLabel(type)}</span>`;
  },

  getLast6Months() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      });
    }
    return months;
  },

  endOfMonth(monthKey) {
    // retorna string YYYY-MM-31 (conservador — data de corte para filtros)
    return monthKey + '-31';
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};
