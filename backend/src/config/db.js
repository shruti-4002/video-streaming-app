import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MONGODB_SIGNAL_LOCKED: Atlas Connected.");
    } catch (error) {
        console.error("MONGODB_CONNECTION_FAILURE:", error);
        process.exit(1);
    }
};

