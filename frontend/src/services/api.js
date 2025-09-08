import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const cvService = {
  // Upload CV file
  async uploadCV(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post('/api/cv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // List all CVs
  async listCVs() {
    const response = await api.get('/cv');
    return response.data;
  },

  // Get CV by ID
  async getCV(id) {
    const response = await api.get(`/cv/${id}`);
    return response.data;
  },

  // Update CV text
  async updateCV(id, content) {
    const response = await api.put(`/cv/${id}`, { content });
    return response.data;
  },

  // Delete CV
  async deleteCV(id) {
    const response = await api.delete(`/cv/${id}`);
    return response.data;
  },
};

export const jdService = {
  // Create job description
  async createJD(title, text) {
    const response = await api.post('/jd', { title, text });
    return response.data;
  },

  // List all job descriptions
  async listJDs() {
    const response = await api.get('/jd');
    return response.data;
  },

  // Get JD by ID
  async getJD(id) {
    const response = await api.get(`/jd/${id}`);
    return response.data;
  },

  // Update JD text
  async updateJD(id, title, text) {
    const response = await api.put(`/jd/${id}`, { title, text });
    return response.data;
  },

  // Delete JD
  async deleteJD(id) {
    const response = await api.delete(`/jd/${id}`);
    return response.data;
  },
};

export const reportService = {
  // Analyze CV against JD
  async analyzeCV(cvId, jdId, model) {
    const response = await api.post('/analyze', { cvId, jdId, model });
    return response.data;
  },

  // List all reports
  async listReports() {
    const response = await api.get('/report');
    return response.data;
  },

  // Get report by ID
  async getReport(id) {
    const response = await api.get(`/report/${id}`);
    return response.data;
  },

  // Reanalyze report
  async reanalyzeReport(id, model) {
    const response = await api.post(`/report/${id}/reanalyze`, { model });
    return response.data;
  },

  // Delete report
  async deleteReport(id) {
    const response = await api.delete(`/report/${id}`);
    return response.data;
  },
};

export const ollamaService = {
  // Get available models
  async getModels() {
    const response = await api.get('/ollama/tags');
    return response.data;
  },

  // Pull/install a model
  async pullModel(name) {
    const response = await api.post('/ollama/pull', { name });
    return response.data;
  },

  // Delete a model
  async deleteModel(name) {
    const response = await api.delete('/ollama/delete', { data: { name } });
    return response.data;
  },
};

export default api;
