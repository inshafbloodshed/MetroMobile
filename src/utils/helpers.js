export const padId = (arr, prefix, len = 6) =>
  prefix + String((arr.length) + 1).padStart(len, '0');

export const formatCurrency = (amount) => {
  return `LKR ${(amount || 0).toFixed(2)}`;
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

export const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

export const getMonthPrefix = (date) => {
  return date.slice(0, 7);
};

export const calculateTotal = (items, key = 'total') => {
  return items.reduce((sum, item) => sum + (item[key] || 0), 0);
};

export const calculateQuantity = (items) => {
  return items.reduce((sum, item) => sum + (item.qty || 0), 0);
};

export const generateId = (prefix = '', length = 6) => {
  const num = Math.floor(Math.random() * 1000000);
  return prefix + String(num).padStart(length, '0');
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const copyToClipboard = (text) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

export const downloadFile = (content, filename, type = 'text/plain') => {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};