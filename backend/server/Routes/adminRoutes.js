import express from 'express';
import protectAdmin from '../Middlewares/adminAuth.js';
import {
	loginAdmin,
	updateEmergencyByAdmin,
	updateRiskZoneByAdmin,
} from '../Controllers/adminController.js';

const route = express.Router();

route.post('/login', loginAdmin);

route.patch('/emergency/:id', protectAdmin, updateEmergencyByAdmin);
route.patch('/risk/:id', protectAdmin, updateRiskZoneByAdmin);

export default route;
