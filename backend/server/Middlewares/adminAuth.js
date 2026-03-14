import jwt from 'jsonwebtoken';
import AsyncHandler from 'express-async-handler';
import Admin from '../Models/Admin.js';

const protectAdmin = AsyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401);
        throw new Error('Not authorized, token missing');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_admin_secret');
        const admin = await Admin.findById(decoded.id).select('-password');

        if (!admin) {
            res.status(401);
            throw new Error('Not authorized, admin not found');
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(401);
        throw new Error('Not authorized, invalid token');
    }
});

export default protectAdmin;
