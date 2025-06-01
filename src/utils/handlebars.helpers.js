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