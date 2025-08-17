import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../env';
export default fp(async (app) => {
    app.register(fastifyJwt, { secret: env.JWT_SECRET });
    app.decorate('auth', async (req, _res) => {
        await req.jwtVerify();
    });
});
//# sourceMappingURL=auth.js.map