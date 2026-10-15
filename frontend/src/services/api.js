// Centralized API client for communicating with Spring Boot REST API
const rawBase = import.meta.env.VITE_API_URL || '/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

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
            // Never expose raw HTML response strings or static server error pages
            data = null;
          }
        }
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      let errorMsg = data?.message;

      // When the server response is not JSON or lacks a clean message, produce an informative error
      if (!errorMsg || typeof errorMsg !== 'string' || errorMsg.trim().startsWith('<')) {
        const isGithubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');

        if (response.status === 405) {
          errorMsg = isGithubPages
            ? 'Backend API Unavailable: GitHub Pages is a static file host and does not process backend API requests (HTTP 405). The Java Spring Boot backend and MySQL database must be hosted on an online server for live authentication.'
            : 'HTTP 405 Method Not Allowed: The requested endpoint does not support this HTTP method.';
        } else if (response.status === 404) {
          errorMsg = isGithubPages
            ? 'Backend API Endpoint Not Found (404): The frontend is running on static GitHub Pages without an active backend connection.'
            : 'The requested API endpoint was not found on the server (404).';
        } else if (response.status === 502 || response.status === 503 || response.status === 504) {
          errorMsg = 'Backend server is offline or unreachable. Please verify that the Spring Boot application is running.';
        } else if (response.status === 401) {
          errorMsg = 'Invalid email or password. Please verify your credentials.';
        } else if (response.status === 403) {
          errorMsg = 'Access denied. You do not have permission to perform this action.';
        } else {
          errorMsg = `Request failed with status ${response.status}. Please check your connection.`;
        }
      }

      const err = new Error(errorMsg);
      err.status = response.status;
      err.fieldErrors = data?.fieldErrors || null;
      throw err;
    }

    return { success: true, data: data || {} };
  } catch (error) {
    const msg = error.message || '';
    const isGithubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');

    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Unexpected end of JSON')) {
      const netMsg = isGithubPages
        ? 'Cannot connect to backend server: GitHub Pages is hosting the static frontend only. A publicly accessible Spring Boot backend is required for live registration and login.'
        : 'Backend server is offline or unreachable. Please ensure the Spring Boot server is running on port 5000.';
      return {
        success: false,
        status: 503,
        error: netMsg
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
