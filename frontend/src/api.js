// Real API Integration for V2 Backend
const API_URL = 'https://period-tracker-api.ben-8b4.workers.dev';

class API {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      this.clearToken();
      window.location.href = '/';
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
  async register(email, password, name) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data;
  }

  async onboarding(data) {
    return this.request('/onboarding', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // User
  async getUser() {
    return this.request('/users/me');
  }

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard');
  }

  // Logs
  async createLog(logData) {
    return this.request('/logs', {
      method: 'POST',
      body: JSON.stringify(logData)
    });
  }

  async getLogs(startDate, endDate, limit = 100) {
    let url = `/logs?limit=${limit}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return this.request(url);
  }

  // Predictions
  async predictNextPeriod() {
    return this.request('/predictions/next-period');
  }

  // Streaks
  async getStreaks() {
    return this.request('/streaks');
  }

  // Patterns
  async getPatterns() {
    return this.request('/patterns');
  }

  // Remedies
  async getRemedySuggestions(symptom) {
    return this.request(`/remedies/suggestions?symptom=${symptom}`);
  }

  async trackRemedyEffectiveness(data) {
    return this.request('/remedies/track', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Analytics
  async getAnalytics() {
    return this.request('/analytics');
  }

  // Chat
  async sendChatMessage(message) {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  // Daily Questions (Context-Aware)
  async getDailyQuestions(date) {
    return this.request(`/daily/questions?date=${date}`);
  }

  // Export
  async exportData() {
    return this.request('/export');
  }
}

export default new API();
