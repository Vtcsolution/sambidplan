

import dns from 'dns';
import mongoose from "mongoose";

dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  const uri = process.env.MONGO_URI_API;
  if (!uri) {
    console.error('❌ MONGO_URI_API is not set in .env');
    process.exit(1);
  }

  const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log(`🔌 Connecting to MongoDB: ${masked}`);

  // Log async connection errors (e.g. dropped connections after initial success)
  mongoose.connection.on('error', err => console.error('❌ MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed');
    console.error('   Reason:', error.message);
    console.error('   Code  :', error.code || 'n/a');
    process.exit(1);
  }
};

export default connectDB;
