import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import { hash, compare } from '../utils/hash.js';

const router: FastifyPluginAsync = async (app) => {
  app.post('/register', async (req, res) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['PATIENT','CAREGIVER'])
    }).parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return res.code(409).send({ error: 'EMAIL_TAKEN' });

    const user = await prisma.user.create({
      data: { email: body.email, passwordHash: await hash(body.password), role: body.role }
    });

    if (body.role === 'PATIENT') {
      await prisma.patientProfile.create({ data: { userId: user.id } });
    }

    const token = app.jwt.sign({ id: user.id, role: user.role });
    return res.send({ token });
  });

  app.post('/login', async (req, res) => {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.code(401).send({ error: 'INVALID_CREDENTIALS' });
    const ok = await compare(password, user.passwordHash);
    if (!ok) return res.code(401).send({ error: 'INVALID_CREDENTIALS' });
    const token = app.jwt.sign({ id: user.id, role: user.role });
    return { token };
  });

  app.get('/me', { onRequest: [app.auth] }, async (req: any) => {
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, role: true } });
    return me;
  });

  app.get('/caregiver/me', { onRequest: [app.auth] }, async (req: any, res) => {
    if (req.user.role !== 'CAREGIVER') return res.code(403).send({ error: 'ONLY_CAREGIVER' });
    const caregiver = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true } });
    if (!caregiver) return res.code(404).send({ error: 'NO_PROFILE' });
    return { ...caregiver, role: 'CAREGIVER' };
  });
};

export default router;
