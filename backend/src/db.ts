// import mongoose from 'mongoose';

// /**
//  * Connect to MongoDB. Called once at startup. Mongoose buffers commands until
//  * the connection is ready, so models can be used immediately after this resolves.
//  */
// export async function connectToDatabase(uri: string): Promise<typeof mongoose> {
//   mongoose.set('strictQuery', true);

//   mongoose.connection.on('error', (err) => {
//     console.error('[mongo] connection error:', err.message);
//   });
//   mongoose.connection.on('disconnected', () => {
//     console.warn('[mongo] disconnected');
//   });

//   await mongoose.connect(uri, {
//     // Fail fast if the server is unreachable instead of hanging requests.
//     serverSelectionTimeoutMS: 8000,
//   });

//   console.log('[mongo] connected');
//   return mongoose;
// }


import mongoose from 'mongoose';

let conn: Promise<typeof mongoose> | null = null;

export function connectToDatabase(uri: string): Promise<typeof mongoose> {
  if (conn) return conn;
  mongoose.set('strictQuery', true);
  conn = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 8000 })
    .then((m) => {
      console.log('[mongo] connected');
      return m;
    })
    .catch((err) => {
      conn = null; // let the next request try again
      throw err;
    });
  return conn;
}
