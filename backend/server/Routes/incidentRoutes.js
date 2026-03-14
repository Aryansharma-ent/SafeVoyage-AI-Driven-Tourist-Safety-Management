import express from 'express';
import { getIncidents, reportIncident, verifyIncidentChain } from '../Controllers/incidentController.js';

const route = express.Router();

route.get('/all', getIncidents);
route.post('/report', reportIncident);
route.get('/verify-chain', verifyIncidentChain);

export default route;