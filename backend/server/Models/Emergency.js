import mongoose from "mongoose"

const EmergencySchema = mongoose.Schema({
    deviceId : {
      type : String,
      required : true
    },
    location : {
        lat : {
            type : Number,
            required : true,
            min: -90,
            max: 90,
        },
        lon : {
            type : Number,
            required: true,
            min: -180,
            max: 180,
        }
    },
    status : {
        type : String,
        enum : ["active","resolved"],
        default : "active"
    },
    emergencyType : {
        type : String,
        enum : ["danger","medical","lost","other"],
        default : "danger"
    },
    message : {
        type : String,
    }

},{
    timestamps : true
})

EmergencySchema.index({ "location.lat": 1, "location.lon": 1 });

const Emergency = mongoose.model('Emergency',EmergencySchema)
export default Emergency