// Centralized API client for communicating with Spring Boot REST API
// Uses session cookies (credentials: 'include') and CSRF protection (X-XSRF-TOKEN)

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Extract CSRF token from document.cookie if present
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * Universal fetch wrapper with automatic credentials and CSRF handling
 */
async function request(endpoint, options = {}) {
  const xsrfToken = getCookie('XSRF-TOKEN');

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {})
  };

  if (xsrfToken && options.method && options.method !== 'GET') {
    headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include', // Send and receive session cookies (AUTH_SESSION_ID)
      headers
    });

    let data = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { message: text };
          }
        }
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const errorMsg = data?.message || (
        (response.status === 504 || response.status === 502 || response.status === 503)
          ? 'Backend server is offline or unreachable at port 5000. Please start the Spring Boot application.'
          : `Request failed with status ${response.status}`
      );
      const err = new Error(errorMsg);
      err.status = response.status;
      err.fieldErrors = data?.fieldErrors || null;
      throw err;
    }

    return { success: true, data: data || {} };
  } catch (error) {
    const msg = error.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('Unexpected end of JSON')) {
      return {
        success: false,
        status: 503,
        error: 'Backend server is offline or unreachable at port 5000. Please ensure the Spring Boot server is running.'
      };
    }
    return {
      success: false,
      status: error.status || 500,
      fieldErrors: error.fieldErrors || null,
      error: msg || 'Unable to reach the server. Please verify your connection.'
    };
  }
}

export const api = {
  // Register user into MySQL
  register: (userData) => {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // Authenticate user & establish Spring Security session
  login: (credentials) => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  // Retrieve authenticated profile from MySQL
  getCurrentUser: () => {
    return request('/users/me', {
      method: 'GET'
    });
  },

  // Terminate Spring Security session and clear cookie
  logout: () => {
    return request('/auth/logout', {
      method: 'POST'
    });
  },

  // Fetch CSRF token
  getCsrf: () => {
    return request('/auth/csrf', {
      method: 'GET'
    });
  },

  // Request password reset email
  forgotPassword: (email) => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Complete password reset with secure token
  resetPassword: (payload) => {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

export default api;
