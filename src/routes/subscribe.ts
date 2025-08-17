import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  app.post('/subscribe', async (req: any) => {
    const body = z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string()
    }).parse(req.body);

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { p256dh: body.p256dh, auth: body.auth, userId: req.user.id },
      create: { ...body, userId: req.user.id }
    });
    return sub;
  });

  app.delete('/subscribe', async (req: any, res) => {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.query);
    await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => null);
    return res.code(204).send();
  });
};

export default router;
