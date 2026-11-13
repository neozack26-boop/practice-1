import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

/**
 * Universal fetch wrapper that attaches the Supabase Bearer token
 */
export async function apiRequest(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set JSON content type
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

export const api = {
  // Health
  checkHealth: () => apiRequest('/health'),

  // Profile
  getProfile: () => apiRequest('/profile'),
  updateProfile: (profileData) => apiRequest('/profile', { method: 'PATCH', body: profileData }),

  // Loops
  getLoops: (params = {}) => {
    const query = new URLSearchParams();
    if (params.domain && params.domain !== 'all') query.set('domain', params.domain);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const qs = query.toString();
    return apiRequest(`/loops${qs ? `?${qs}` : ''}`);
  },
  getLoopById: (id) => apiRequest(`/loops/${id}`),
  deleteLoop: (id) => apiRequest(`/loops/${id}`, { method: 'DELETE' }),
  createLoop: (formData) => apiRequest('/loops', { method: 'POST', body: formData }),
  simplifyStep: (loopId, stepNumber) => apiRequest(`/loops/${loopId}/simplify-step`, { method: 'POST', body: { stepNumber } }),
  generatePractice: (loopId) => apiRequest(`/loops/${loopId}/practice`, { method: 'POST' }),
  submitPracticeAnswer: (loopId, attemptId, userAnswer) => apiRequest(`/loops/${loopId}/practice/${attemptId}/answer`, { method: 'POST', body: { userAnswer } }),
  submitTeachBack: (loopId, userExplanation) => apiRequest(`/loops/${loopId}/teach-back`, { method: 'POST', body: { userExplanation } })
};
