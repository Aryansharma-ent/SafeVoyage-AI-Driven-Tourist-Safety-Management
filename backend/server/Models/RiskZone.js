import mongoose from 'mongoose';

const riskZoneSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    location: {
        lat: {
            type: Number,
            required: true,
            min: -90,
            max: 90,
        },
        lon: {
            type: Number,
            required: true,
            min: -180,
            max: 180,
        },

    },
    crimeRate : {
        type : Number,
        required : true,
        min: 0,
        max: 1,
    },
    weatherScore :  {
        type : Number,
        required : true,
        min: 0,
        max: 1,
    },
    terrainScore : {
        type : Number,
        required : true,
        min: 0,
        max: 1,
    },
    timeScore : {
       type : Number,
       required: true,
       min: 0,
       max: 1,
    },
    tourist_density : {
      type : Number,
      required : true
    },
    state: {
        type: String,
        default: "unknown",
    },
    description: {
        type: String,
        default: "city tourism",
    },
        geofenceRadius: {
                type: Number,
                default: 500,
                min: 50,
        },
    riskScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    riskLevel : {
        type : String,
        enum : ["safe","low","moderate","high"],
        default : "safe"
    }
},{
    timestamps : true
});

riskZoneSchema.index({ "location.lat": 1, "location.lon": 1 });

const RiskZone = mongoose.model('RiskZone', riskZoneSchema);
export default RiskZone