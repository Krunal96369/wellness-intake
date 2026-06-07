// import 'dotenv/config';
// import express from 'express';
// import cors from 'cors';
// import { connectToDatabase } from './db';
// import { configsRouter } from './routes/configs';
// import { submissionsRouter } from './routes/submissions';
// import { ApiError, errorHandler } from './http';

// const PORT = Number(process.env.PORT ?? 4000);
// const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/wellness-intake';

// // Allow one or more comma-separated origins; default to the Vite dev server.
// const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
//   .split(',')
//   .map((o) => o.trim())
//   .filter(Boolean);

// export function createApp() {
//   const app = express();

//   app.use(
//     cors({
//       origin(origin, callback) {
//         // Allow tools/curl (no Origin) and any explicitly allowed origin.
//         if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
//           return callback(null, true);
//         }
//         return callback(new Error(`Origin ${origin} not allowed by CORS`));
//       },
//     }),
//   );
//   app.use(express.json({ limit: '256kb' }));

//   app.get('/api/health', (_req, res) => res.json({ ok: true }));

//   app.use('/api/configs', configsRouter);
//   app.use('/api/submissions', submissionsRouter);

//   // Unknown API route -> 404 JSON.
//   app.use('/api', (_req, _res, next) => next(new ApiError(404, 'Not found')));

//   app.use(errorHandler);
//   return app;
// }

// async function start() {
//   try {
//     await connectToDatabase(MONGODB_URI);
//   } catch (err) {
//     console.error('[startup] could not connect to MongoDB:', (err as Error).message);
//     process.exit(1);
//   }

//   const app = createApp();
//   app.listen(PORT, () => {
//     console.log(`[api] listening on http://localhost:${PORT}`);
//     console.log(`[api] CORS origins: ${allowedOrigins.join(', ')}`);
//   });
// }

// start();


import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectToDatabase } from './db';
import { configsRouter } from './routes/configs';
import { submissionsRouter } from './routes/submissions';
import { ApiError, errorHandler } from './http';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/wellness-intake';
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);

export function createApp() {
  const app = express();

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  }));
  app.use(express.json({ limit: '256kb' }));

  // Ensure Mongo is connected before any handler runs. Cached, so this is a
  // no-op once warm; a failed connect becomes a clean 500 via errorHandler.
  app.use(async (_req, _res, next) => {
    try {
      await connectToDatabase(MONGODB_URI);
      next();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/configs', configsRouter);
  app.use('/api/submissions', submissionsRouter);
  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'Not found')));
  app.use(errorHandler);
  return app;
}

const app = createApp();

// Local dev still listens on a port; on Vercel the default export is used.
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT ?? 4000);
  app.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
}

export default app;
