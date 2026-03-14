import AsyncHandler from "express-async-handler";
import Emergency from "../Models/Emergency.js";

//GET get all the emergency reports
export const getEmergency = AsyncHandler(async(req,res)=>{
    const emergency = await Emergency.find()
    if(!emergency){
        res.status(400)
        throw new Error("Emergency doen't exist")
    } 

    res.status(200).json(emergency);
})

export const postEmergency = AsyncHandler(async(req,res)=>{
    const {deviceId,location,emergencyType,message} = req.body

    if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
     res.status(400);
     throw new Error('location.lat and location.lon are required');
}
    if(!emergencyType || !message ){
      res.status(400)
      throw new Error("Eneter the valid credentials")
    }

    const newPost = await Emergency.create({
        deviceId,
        location,
        emergencyType,
        message,
    })

    res.status(201).json(newPost);
})