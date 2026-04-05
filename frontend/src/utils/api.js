const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8080'
  : 'https://fitnessapp-5ogv.onrender.com';

export async function authenticatedFetch(endpoint, options = {}) {
  const token = localStorage.getItem('fp_token');
  if (!token) {
    window.location.href = '/';
    throw new Error('No token found');
  }

  const res = await fetch(BASE_URL + endpoint, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    localStorage.removeItem('fp_token');
    localStorage.removeItem('fp_user');
    window.location.href = '/';
    throw new Error('Session vypršala');
  }

  return res;
}
