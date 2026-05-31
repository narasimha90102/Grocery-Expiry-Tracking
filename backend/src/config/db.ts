import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const srvUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  const localUrl = 'mongodb://127.0.0.1:27017/grocery_db';
  
  if (!srvUrl) {
    console.warn('No MONGO_URL specified, falling back to local MongoDB.');
  }

  // Attempt 1: Connect to MongoDB Atlas (if specified)
  if (srvUrl) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      await mongoose.connect(srvUrl, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB Atlas connected successfully');
      return;
    } catch (error) {
      console.error('MongoDB Atlas connection failed:', error);
    }
  }

  // Attempt 2: Connect to local MongoDB
  try {
    console.log('Attempting local MongoDB connection...');
    await mongoose.connect(localUrl, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB Local connected successfully');
  } catch (localError) {
    console.error('MongoDB Local connection failed:', localError);
    console.warn('Backend server running without database connection (Offline Mock Mode active).');
  }
};
