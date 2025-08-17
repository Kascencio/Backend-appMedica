import fp from 'fastify-plugin';
import { ZodError } from 'zod';

export default fp(async (app) => {
  app.setErrorHandler((err, _req, res) => {
    if (err instanceof ZodError) {
      return res.status(400).send({ error: 'VALIDATION', details: err.flatten() });
    }
    const status = (err as any).statusCode || 500;
    app.log.error(err);
    return res.status(status).send({ error: 'INTERNAL', message: err.message });
  });
});
