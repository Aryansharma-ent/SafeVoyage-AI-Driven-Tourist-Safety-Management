import mongoose from "mongoose";

const connectDB = async () =>{
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        console.warn("⚠️  Server running without database. Database features will be unavailable.");
        // Removed process.exit(1) to allow server to continue running
    }
}

export default connectDB;