import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
    console.log("Connected to DB:", mongoose.connection.name);
    
    // Drop the old index if it exists
    try {
      await mongoose.connection.collection('admins').dropIndex('staff.email_1');
      console.log("Dropped old staff.email index");
    } catch (err) {
      // Index doesn't exist, that's fine
    }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
