import Fastify from 'fastify';
import { env } from './env';
import corsPlugin from './plugins/cors';
import authPlugin from './plugins/auth';
import errorsPlugin from './plugins/errors';
const app = Fastify({ logger: true });
await app.register(errorsPlugin);
await app.register(corsPlugin);
await app.register(authPlugin);
app.get('/health', async () => ({ ok: true }));
const port = Number(env.PORT);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map