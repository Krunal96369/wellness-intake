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
