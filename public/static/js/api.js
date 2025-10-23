// ============================================
// API Communication Library
// ============================================

const API_BASE = '/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('auth_token');

// Get current user from localStorage
const getCurrentUser = () => {
  const userStr = localStorage.getItem('current_user');
  return userStr ? JSON.parse(userStr) : null;
};

// Save auth data
const saveAuth = (token, user) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('current_user', JSON.stringify(user));
};

// Clear auth data
const clearAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
};

// API request wrapper
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token && !options.noAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(API_BASE + endpoint, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
const authAPI = {
  login: (email) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
      noAuth: true
    }),

  verify: (email, code, name, role) => 
    apiRequest('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code, name, role }),
      noAuth: true
    }),

  logout: () => apiRequest('/auth/logout', { method: 'POST' }),

  me: () => apiRequest('/auth/me')
};

// Instructors API
const instructorsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/instructors${query ? '?' + query : ''}`);
  },

  get: (id) => apiRequest(`/instructors/${id}`),

  create: (data) => 
    apiRequest('/instructors', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  apply: (id, jobId, coverLetter) => 
    apiRequest(`/instructors/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, cover_letter: coverLetter })
    }),

  recommendedJobs: (id) => apiRequest(`/instructors/${id}/recommended-jobs`)
};

// Jobs API
const jobsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/jobs${query ? '?' + query : ''}`);
  },

  get: (id) => apiRequest(`/jobs/${id}`),

  create: (data) => 
    apiRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  close: (id) => 
    apiRequest(`/jobs/${id}/close`, { method: 'POST' }),

  candidates: (id) => apiRequest(`/jobs/${id}/candidates`),

  recommended: (id) => apiRequest(`/jobs/${id}/recommended`),

  acceptCandidate: (jobId, applicationId) => 
    apiRequest(`/jobs/${jobId}/candidates/${applicationId}/accept`, {
      method: 'POST'
    })
};

// Events API
const eventsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/events${query ? '?' + query : ''}`);
  },

  get: (id) => apiRequest(`/events/${id}`),

  create: (data) => 
    apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id, data) => 
    apiRequest(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  checkout: (id, paymentMethod) => 
    apiRequest(`/events/${id}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: paymentMethod })
    })
};

// Organizations API
const organizationsAPI = {
  me: () => apiRequest('/organizations/me'),

  create: (data) => 
    apiRequest('/organizations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id, data) => 
    apiRequest(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
};

// Reviews API
const reviewsAPI = {
  list: (subjectType, subjectId) => 
    apiRequest(`/reviews?subject_type=${subjectType}&subject_id=${subjectId}`),

  create: (data) => 
    apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// Tags API
const tagsAPI = {
  list: (kind) => {
    const query = kind ? `?kind=${kind}` : '';
    return apiRequest(`/tags${query}`);
  }
};

// Notifications API
const notificationsAPI = {
  list: (unreadOnly = false) => {
    const query = unreadOnly ? '?unread_only=true' : '';
    return apiRequest(`/notifications${query}`);
  },

  markRead: (id) => 
    apiRequest(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => 
    apiRequest('/notifications/read-all', { method: 'POST' })
};

// Admin API
const adminAPI = {
  pendingInstructors: () => apiRequest('/admin/instructors/pending'),

  verifyInstructor: (id, status, notes) => 
    apiRequest(`/admin/instructors/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status, notes })
    }),

  reports: (status) => {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`/admin/reports${query}`);
  },

  actionReport: (id, status, adminNotes) => 
    apiRequest(`/admin/reports/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ status, admin_notes: adminNotes })
    }),

  refundTicket: (id, reason) => 
    apiRequest(`/admin/tickets/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),

  stats: () => apiRequest('/admin/stats'),

  createTag: (kind, name, slug) => 
    apiRequest('/admin/tags', {
      method: 'POST',
      body: JSON.stringify({ kind, name, slug })
    }),

  deleteTag: (id) => 
    apiRequest(`/admin/tags/${id}`, { method: 'DELETE' })
};
