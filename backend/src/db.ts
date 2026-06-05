import mongoose from 'mongoose';

/**
 * Connect to MongoDB. Called once at startup. Mongoose buffers commands until
 * the connection is ready, so models can be used immediately after this resolves.
 */
export async function connectToDatabase(uri: string): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    console.error('[mongo] connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected');
  });

  await mongoose.connect(uri, {
    // Fail fast if the server is unreachable instead of hanging requests.
    serverSelectionTimeoutMS: 8000,
  });

  console.log('[mongo] connected');
  return mongoose;
}
