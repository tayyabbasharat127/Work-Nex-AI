// Helper functions for the application

/**
 * Format date to readable string
 */
export function formatDate(dateString, options = {}) {
  if (!dateString) return '---';
  
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  
  return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format time to readable string
 */
export function formatTime(timeString, options = {}) {
  if (!timeString) return '---';
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return new Date(timeString).toLocaleTimeString('en-US', defaultOptions);
}

/**
 * Format date and time together
 */
export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '---';
  
  return new Date(dateTimeString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate hours between two timestamps
 */
export function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return '---';
  
  const diff = new Date(endTime) - new Date(startTime);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

/**
 * Calculate duration in minutes
 */
export function calculateMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  
  const diff = new Date(endTime) - new Date(startTime);
  return Math.floor(diff / (1000 * 60));
}

/**
 * Get role display name
 */
export function getRoleName(roleId) {
  // tier 0 is WorkNex's own platform-operator account, not a role that
  // belongs to any customer org — labeled distinctly if it ever surfaces in
  // an org's own user list, rather than "Super Admin" reading like a normal tier.
  const roles = {
    0: 'WorkNex Platform Team',
    1: 'Admin',
    2: 'Manager',
    3: 'Employee'
  };
  return roles[roleId] || 'Unknown';
}

/**
 * Get role path for routing
 */
export function getRolePath(roleId) {
  const paths = {
    0: 'admin',
    1: 'admin',
    2: 'manager',
    3: 'employee'
  };
  return paths[roleId] || 'employee';
}

/**
 * Get status badge color
 */
export function getStatusColor(status) {
  const colors = {
    'Present': 'bg-success/20 text-success',
    'Absent': 'bg-destructive/20 text-destructive',
    'Late': 'bg-warning/20 text-warning',
    'Holiday': 'bg-primary/20 text-primary',
    'Leave': 'bg-accent/20 text-accent',
    'Active': 'bg-success/20 text-success',
    'Inactive': 'bg-muted text-muted-foreground',
    'Pending': 'bg-warning/20 text-warning',
    'Approved': 'bg-success/20 text-success',
    'Rejected': 'bg-destructive/20 text-destructive'
  };
  return colors[status] || 'bg-muted text-muted-foreground';
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const isValid = Object.values(requirements).every(req => req);
  
  return { isValid, requirements };
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text
 */
export function truncate(text, length = 50) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Get greeting based on time
 */
export function getGreeting() {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Check if date is today
 */
export function isToday(dateString) {
  const today = new Date();
  const date = new Date(dateString);
  
  return today.toDateString() === date.toDateString();
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(dateString);
}

/**
 * Parse query string to object
 */
export function parseQueryString(queryString) {
  const params = new URLSearchParams(queryString);
  const result = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
}

/**
 * Build query string from object
 */
export function buildQueryString(params) {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  return filtered ? `?${filtered}` : '';
}

/**
 * Download file from blob
 */
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Generate random color
 */
export function generateColor(seed) {
  const colors = [
    'bg-destructive',
    'bg-info',
    'bg-success',
    'bg-warning',
    'bg-chart-4',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];
  
  const index = seed ? seed.length % colors.length : Math.floor(Math.random() * colors.length);
  return colors[index];
}

/**
 * Sleep/delay function
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
