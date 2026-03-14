import express from 'express';
import protectAdmin from '../Middlewares/adminAuth.js';
import { checkGeofence, createRisk, getRisk, predictRisk } from '../Controllers/riskController.js';

const route = express.Router();

route.get('/all', getRisk);
route.post('/create', protectAdmin, createRisk);
route.post('/geofence/check', checkGeofence);
route.post('/predict', predictRisk);

export default route;