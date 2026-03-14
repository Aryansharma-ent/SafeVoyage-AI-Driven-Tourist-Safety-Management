import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
dotenv.config()
const app = express();
import connectDB from './config/db.js';
import ErrorHandler from './Middlewares/Errorhandler.js'
import IncidentRoutes from './Routes/incidentRoutes.js'
import EmergencyRoutes from './Routes/emergencyRoutes.js'
import RiskRoutes from './Routes/riskRoutes.js'
import AdminRoutes from './Routes/adminRoutes.js'

connectDB();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended : false}));
app.use('/api/risk',RiskRoutes)
app.use('/api/incidents',IncidentRoutes)
app.use('/api/emergency',EmergencyRoutes)
app.use('/api/admin',AdminRoutes)
app.use(ErrorHandler)


app.listen(8000,()=>{
   console.log("Server is listening on 8000....")
})