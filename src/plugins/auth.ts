import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../env';

export default fp(async (app) => {
  app.register(fastifyJwt, { secret: env.JWT_SECRET });

  app.decorate('auth', async (req: any, _res: any) => {
    await req.jwtVerify();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    auth: any;
  }
  interface FastifyRequest {
    user: { id: string; role: 'PATIENT'|'CAREGIVER' };
  }
}
