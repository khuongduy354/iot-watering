import SoilMoisture from '@/models/SoilMoisture';
import mongoose from 'mongoose';

if (!process.env.NEXT_PUBLIC_MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env');
}

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}



export default connectDB;