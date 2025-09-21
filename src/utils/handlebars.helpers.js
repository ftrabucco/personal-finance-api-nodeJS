export const helpers = {
  formatDate: function(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  },
  
  eq: function(a, b) {
    return a === b;
  },
  
  // Helpers de comparación
  gte: function(a, b) {
    return a >= b;
  },
  
  gt: function(a, b) {
    return a > b;
  },
  
  lte: function(a, b) {
    return a <= b;
  },
  
  lt: function(a, b) {
    return a < b;
  },
  
  // Helper para verificar si string contiene otro string
  contains: function(str, search) {
    if (!str || !search) return false;
    return str.toLowerCase().includes(search.toLowerCase());
  },
  
  // Helper para dividir
  div: function(a, b) {
    return parseFloat(a) / parseFloat(b);
  },
  
  // Helper para JSON
  JSON: function(obj) {
    return JSON.stringify(obj);
  },
  
  formatMoney: function(amount) {
    if (!amount) return '$0,00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount);
  },

  selected: function(option, value) {
    return option === value ? 'selected' : '';
  },

  checked: function(option, value) {
    return option === value ? 'checked' : '';
  },

  formatDayOfMonth: function(day) {
    if (!day) return '';
    return `${day}º día`;
  }
}; 