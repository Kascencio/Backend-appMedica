import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  // Obtener perfil del paciente autenticado
  app.get('/me', async (req: any, res) => {
    if (req.user.role !== 'PATIENT') return res.code(403).send({ error: 'ONLY_PATIENT' });
    const profile = await prisma.patientProfile.findFirst({ where: { userId: req.user.id } });
    return profile;
  });

  // Upsert del perfil del paciente autenticado
  app.put('/me', async (req: any, res) => {
    if (req.user.role !== 'PATIENT') return res.code(403).send({ error: 'ONLY_PATIENT' });
    const body = z.object({
      name: z.string().nullish(),
      age: z.number().int().nullish(),
      weight: z.number().nullish(),
      height: z.number().nullish(),
      allergies: z.string().nullish(),
      reactions: z.string().nullish(),
      doctorName: z.string().nullish(),
      doctorContact: z.string().nullish(),
      photoUrl: z.string().url().nullish()
    }).parse(req.body);

    const existing = await prisma.patientProfile.findFirst({ where: { userId: req.user.id } });
    const data = {
      name: body.name ?? null,
      age: body.age ?? null,
      weight: body.weight ?? null,
      height: body.height ?? null,
      allergies: body.allergies ?? null,
      reactions: body.reactions ?? null,
      doctorName: body.doctorName ?? null,
      doctorContact: body.doctorContact ?? null,
      photoUrl: body.photoUrl ?? null,
      userId: req.user.id
    };
    const updated = await prisma.patientProfile.upsert({
      where: { id: existing?.id ?? '' },
      create: data,
      update: data
    });
    return updated;
  });
};

export default router;
