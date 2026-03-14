import AsyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../Models/Admin.js';
import Emergency from '../Models/Emergency.js';
import RiskZone from '../Models/RiskZone.js';

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'dev_admin_secret', { expiresIn: '7d' });

export const loginAdmin = AsyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
        res.status(401);
        throw new Error('Invalid admin credentials');
    }

    res.status(200).json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        token: createToken(admin._id),
    });
});



export const updateEmergencyByAdmin = AsyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const emergency = await Emergency.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!emergency) {
        res.status(404);
        throw new Error('Emergency not found');
    }

    res.status(200).json(emergency);
});

export const updateRiskZoneByAdmin = AsyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };

    if ('riskScore' in updates && typeof updates.riskScore !== 'number') {
        res.status(400);
        throw new Error('riskScore must be a number');
    }

    if ('riskLevel' in updates && !['safe', 'low', 'moderate', 'high'].includes(updates.riskLevel)) {
        res.status(400);
        throw new Error('riskLevel must be one of safe, low, moderate, high');
    }

    const riskZone = await RiskZone.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    if (!riskZone) {
        res.status(404);
        throw new Error('Risk zone not found');
    }

    res.status(200).json(riskZone);
});
