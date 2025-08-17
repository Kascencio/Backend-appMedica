import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../env';

export default fp(async (app) => {
  const origins = (env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean);
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // apps nativas
      if (origins.length === 0) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      cb(new Error('CORS not allowed'));
    },
    credentials: true
  });
});
