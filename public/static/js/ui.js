// ============================================
// UI Helper Functions
// ============================================

// Show toast notification
const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' :
    type === 'warning' ? 'bg-yellow-500' :
    'bg-blue-500'
  } text-white`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// Show loading spinner
const showLoading = (text = '読み込み中...') => {
  const existing = document.getElementById('loading-overlay');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  overlay.innerHTML = `
    <div class="bg-white rounded-lg p-8 flex flex-col items-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p class="text-gray-700">${text}</p>
    </div>
  `;
  document.body.appendChild(overlay);
};

// Hide loading spinner
const hideLoading = () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
};

// Create modal
const createModal = (title, content, buttons = []) => {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b">
        <div class="flex justify-between items-center">
          <h3 class="text-2xl font-bold text-gray-900">${title}</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      <div class="p-6">
        ${content}
      </div>
      ${buttons.length > 0 ? `
        <div class="p-6 border-t flex justify-end space-x-4">
          ${buttons.map(btn => `
            <button 
              onclick="${btn.onclick}" 
              class="px-6 py-2 rounded-lg ${btn.className || 'bg-gray-200 hover:bg-gray-300'}"
            >
              ${btn.text}
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  document.body.appendChild(modal);
  return modal;
};

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY'
  }).format(amount);
};

// Truncate text
const truncate = (text, length = 100) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

// Render tags
const renderTags = (tags, colorClass = 'bg-blue-100 text-blue-800') => {
  if (!tags || tags.length === 0) return '';
  return tags.map(tag => `
    <span class="px-2 py-1 rounded text-xs ${colorClass}">
      ${tag}
    </span>
  `).join(' ');
};

// Render rating stars
const renderStars = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let html = '';
  for (let i = 0; i < fullStars; i++) {
    html += '<i class="fas fa-star text-yellow-400"></i>';
  }
  if (hasHalfStar) {
    html += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
  }
  for (let i = 0; i < emptyStars; i++) {
    html += '<i class="far fa-star text-yellow-400"></i>';
  }
  return html;
};

// Confirm dialog
const confirmDialog = (message, onConfirm) => {
  const modal = createModal(
    '確認',
    `<p class="text-gray-700">${message}</p>`,
    [
      {
        text: 'キャンセル',
        className: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
        onclick: `this.closest('.fixed').remove()`
      },
      {
        text: '確認',
        className: 'bg-blue-600 hover:bg-blue-700 text-white',
        onclick: `(${onConfirm.toString()})(); this.closest('.fixed').remove()`
      }
    ]
  );
};

// Check authentication
const checkAuth = () => {
  const user = getCurrentUser();
  if (!user) {
    showToast('ログインが必要です', 'warning');
    setTimeout(() => showLoginModal(), 500);
    return false;
  }
  return true;
};

// Check role
const checkRole = (allowedRoles) => {
  const user = getCurrentUser();
  if (!user) return false;
  return allowedRoles.includes(user.role);
};

// Redirect to dashboard based on role
const redirectToDashboard = (role) => {
  const dashboards = {
    'admin': '/admin',
    'org': '/org',
    'instructor': '/instructor',
    'learner': '/learner'
  };
  
  window.location.href = dashboards[role] || '/';
};

// Render empty state
const renderEmptyState = (icon, title, description) => {
  return `
    <div class="text-center py-12">
      <i class="${icon} text-6xl text-gray-300 mb-4"></i>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">${title}</h3>
      <p class="text-gray-500">${description}</p>
    </div>
  `;
};

// Pagination helper
const renderPagination = (currentPage, totalPages, onPageChange) => {
  if (totalPages <= 1) return '';
  
  let html = '<div class="flex justify-center space-x-2 mt-6">';
  
  // Previous button
  html += `
    <button 
      ${currentPage === 1 ? 'disabled' : ''} 
      onclick="${onPageChange}(${currentPage - 1})"
      class="px-4 py-2 rounded border ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}"
    >
      前へ
    </button>
  `;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `
        <button 
          onclick="${onPageChange}(${i})"
          class="px-4 py-2 rounded ${i === currentPage ? 'bg-blue-600 text-white' : 'border hover:bg-gray-100'}"
        >
          ${i}
        </button>
      `;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += '<span class="px-2 py-2">...</span>';
    }
  }
  
  // Next button
  html += `
    <button 
      ${currentPage === totalPages ? 'disabled' : ''} 
      onclick="${onPageChange}(${currentPage + 1})"
      class="px-4 py-2 rounded border ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}"
    >
      次へ
    </button>
  `;
  
  html += '</div>';
  return html;
};
