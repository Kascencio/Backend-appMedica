import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  // Paciente: listar permisos de sus cuidadores
  app.get('/by-patient/:patientProfileId', async (req: any, res) => {
    const { patientProfileId } = req.params as { patientProfileId: string };
    const patient = await prisma.patientProfile.findUnique({ where: { id: patientProfileId } });
    if (!patient || patient.userId !== req.user.id) return res.code(403).send({ error: 'NO_ACCESS' });
    return prisma.permission.findMany({ where: { patientProfileId }, include: { caregiver: { select: { id: true, email: true, role: true } } } });
  });

  // Paciente: actualizar nivel/estado
  app.patch('/:id', async (req: any, res) => {
    const { id } = req.params as { id: string };
    const { level, status } = z.object({
      level: z.enum(['READ','WRITE','ADMIN']).optional(),
      status: z.enum(['PENDING','ACCEPTED','REJECTED']).optional()
    }).parse(req.body);

    const perm = await prisma.permission.findUnique({ where: { id }, include: { patientProfile: true } });
    if (!perm || perm.patientProfile.userId !== req.user.id) return res.code(403).send({ error: 'NO_ACCESS' });

    const updated = await prisma.permission.update({ where: { id }, data: { level, status } });
    return updated;
  });
};

export default router;
