import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import multer from 'fastify-multer';
import path from 'path';

const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  // Obtener perfil del paciente autenticado
  app.get('/me', async (req: any, res) => {
    if (req.user.role !== 'PATIENT') return res.code(403).send({ error: 'ONLY_PATIENT' });
    const profile = await prisma.patientProfile.findFirst({ where: { userId: req.user.id } });
    if (!profile) return res.code(404).send({ error: 'NO_PROFILE' });
    return { ...profile, role: 'PATIENT' };
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

  // Subir foto de perfil del paciente autenticado
  app.post('/me/photo', { preHandler: upload.single('photo') }, async (req: any, res) => {
    if (req.user.role !== 'PATIENT') return res.code(403).send({ error: 'ONLY_PATIENT' });
    const file = req.file;
    if (!file) return res.code(400).send({ error: 'NO_FILE' });

    // Guardar la ruta en la base de datos
    const updated = await prisma.patientProfile.update({
      where: { userId: req.user.id },
      data: { photoUrl: `/uploads/${file.filename}` }
    });

    return { url: `/uploads/${file.filename}` };
  });
};

export default router;
