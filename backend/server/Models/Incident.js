import mongoose from "mongoose"

const IncidentSchema = mongoose.Schema({
    deviceId : {
        type : String,
        required : true,
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
            required : true,
            min: -180,
            max: 180,
        }
    },
    description : {
        type : String,
        required : true,
    },
    incidentType : {
        type : String,
        enum : ["theft","accident","lost","suspicious","other"],
        default : "other",
        required: true
    },
    previousHash: {
        type: String,
        required: true,
    },
    incidentHash: {
        type: String,
        required: true,
        unique: true,
    }
},{
    timestamps : true
})

IncidentSchema.index({ "location.lat": 1, "location.lon": 1 });

const Incident = mongoose.model('Incident',IncidentSchema);
export default Incident