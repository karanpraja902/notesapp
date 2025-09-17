import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI||'mongodb://localhost:27017/multitenantnotesapp';

interface GlobalWithMongoose {
  mongoose: {
    conn: unknown | null;
    promise: Promise<unknown> | null;
  };
}

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached: { conn: unknown; promise: Promise<unknown> | null } | null = (global as unknown as GlobalWithMongoose).mongoose;

if (!cached) {
  cached = (global as unknown as GlobalWithMongoose).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached && cached.conn) {
    return cached.conn;
  }

  if (!cached || !cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI!, opts);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectDB;
