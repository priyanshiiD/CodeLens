import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000',
});

// Request interceptor to add Authorization header
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

// Auth functions
export async function login(email, password) {
  const response = await client.post('/api/auth/login', { email, password });
  return response.data;
}

export async function register(name, email, password) {
  const response = await client.post('/api/auth/register', { name, email, password });
  return response.data;
}

// Repo functions
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

// Chat functions
export async function askQuestion(repo_url, question) {
  const response = await client.post('/api/chat', { repo_url, question });
  return response.data;
}

export async function getChatHistory(repo_url) {
  const response = await client.get('/api/chat/history', { params: { repo_url } });
  return response.data;
}
