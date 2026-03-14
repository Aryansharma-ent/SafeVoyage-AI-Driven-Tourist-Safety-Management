import express from 'express'
import {getEmergency,postEmergency} from '../Controllers/emergencyController.js'
const route = express.Router()

route.get('/all',getEmergency)
route.post('/panic',postEmergency)

export default route