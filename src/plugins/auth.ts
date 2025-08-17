import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../env';

export default fp(async (app) => {
  app.register(fastifyJwt, { secret: env.JWT_SECRET });

  app.decorate('auth', async (req: any, _res: any) => {
    await req.jwtVerify();
  });
});

// Extiende solo FastifyInstance
import type { FastifyRequest } from 'fastify';
declare module 'fastify' {
  interface FastifyInstance {
    auth: any;
  }
}
