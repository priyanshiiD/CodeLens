import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('codelens_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // Prevent 401 redirects if the request was to login/register endpoints
    const isAuthRoute = url.includes('/login') || url.includes('/register') || url.includes('auth');
    
    if (error.response?.status === 401 && onUnauthorized && !isAuthRoute) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export async function login(email, password) {
  const response = await client.post('/api/auth/login', { email, password });
  return response.data;
}

export async function register(name, email, password) {
  const response = await client.post('/api/auth/register', { name, email, password });
  return response.data;
}

export async function getRepos() {
  const response = await client.get('/api/repos');
  return response.data;
}

export async function addRepo(repo_url) {
  const response = await client.post('/api/repos', { repo_url });
  return response.data;
}

export async function getRepoStatus(repo_url) {
  const response = await client.get('/api/repos/status', { params: { repo_url } });
  return response.data;
}

export async function askQuestion(repo_url, question) {
  const response = await client.post('/api/chat', { repo_url, question });
  return response.data;
}

export async function getChatHistory(repo_url) {
  const response = await client.get('/api/chat/history', { params: { repo_url } });
  return response.data;
}

export async function deleteRepo(repo_url) {
  const response = await client.delete('/api/repos', { params: { repo_url } });
  return response.data;
}
