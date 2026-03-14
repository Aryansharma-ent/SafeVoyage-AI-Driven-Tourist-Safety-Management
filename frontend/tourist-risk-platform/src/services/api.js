import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api"
});

// Add token to requests if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Risk Zone endpoints
export const getRiskZones = () => API.get("/risk/all");
export const checkGeofence = (data) => API.post("/risk/geofence/check", data);
export const predictRisk = (data) => API.post("/risk/predict", data);

// Incident endpoints
export const reportIncident = (data) =>
  API.post("/incidents/report", data);

export const getIncidents = () =>
  API.get("/incidents/all");

export const verifyIncidentChain = () =>
  API.get("/incidents/verify-chain");

// Emergency endpoints
export const triggerEmergency = (data) =>
  API.post("/emergency/panic", data);

export const getEmergencies = () =>
  API.get("/emergency/all");

// Admin endpoints
export const adminLogin = (email, password) =>
  API.post("/admin/login", { email, password });

export default API;
