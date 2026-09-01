import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = () => api.get('/health');
export const getEvents = () => api.get('/api/events');
export const getIncidents = () => api.get('/api/incidents');
export const getIncident = (id: string) => api.get(`/api/incidents/${id}`);
export const updateIncident = (id: string, data: any) => api.patch(`/api/incidents/${id}`, data);
export const startSimulation = (scenario: string) => api.post(`/api/simulation/start/${scenario}`);
export const stopSimulation = () => api.post('/api/simulation/stop');
export const getSimulationStatus = () => api.get('/api/simulation/status');
export const getDashboardStats = () => api.get('/api/dashboard/stats');
export const queryAssistant = (message: string, incidentId?: string) => api.post('/api/assistant/query', { message, incidentId });
export const getIncidentReport = (id: string) => api.get(`/api/incidents/${id}/report`);

export default api;
