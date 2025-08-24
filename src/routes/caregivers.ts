import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';

function genCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  // Paciente: generar código de invitación
  app.post('/invite', async (req: any, res) => {
    if (req.user.role !== 'PATIENT') return res.code(403).send({ error: 'ONLY_PATIENT' });
    const patient = await prisma.patientProfile.findFirst({ where: { userId: req.user.id } });
    if (!patient) return res.code(404).send({ error: 'NO_PROFILE' });

    const code = genCode(8);
    const invite = await prisma.inviteCode.create({
      data: { patientProfileId: patient.id, code, expiresAt: new Date(Date.now() + 1000*60*60*24) }
    });
    return { code: invite.code, expiresAt: invite.expiresAt };
  });

  // Cuidador: unirse con código
  app.post('/join', async (req: any, res) => {
    if (req.user.role !== 'CAREGIVER') return res.code(403).send({ error: 'ONLY_CAREGIVER' });
    const { code } = z.object({ code: z.string().min(6) }).parse(req.body);
    const invite = await prisma.inviteCode.findUnique({ where: { code } });
    if (!invite || invite.used || invite.expiresAt < new Date()) return res.code(400).send({ error: 'INVALID_CODE' });

    await prisma.permission.upsert({
      where: { patientProfileId_caregiverId: { patientProfileId: invite.patientProfileId, caregiverId: req.user.id } },
      update: { status: 'PENDING' },
      create: { patientProfileId: invite.patientProfileId, caregiverId: req.user.id, status: 'PENDING', level: 'READ' }
    });

    await prisma.inviteCode.update({ where: { id: invite.id }, data: { used: true } });
    return { ok: true };
  });

  // Cuidador: listar pacientes asignados (ACCEPTED)
  app.get('/patients', async (req: any) => {
    if (req.user.role !== 'CAREGIVER') return [];
    const perms = await prisma.permission.findMany({
      where: { caregiverId: req.user.id, status: 'ACCEPTED' },
      include: { patientProfile: true }
    });
    return perms.map(p => p.patientProfile);
  });

  // Cuidador: obtener su información personal
  app.get('/me', async (req: any, res) => {
    if (req.user.role !== 'CAREGIVER') return res.code(403).send({ error: 'ONLY_CAREGIVER' });
    const caregiver = await prisma.caregiverProfile.findFirst({ where: { userId: req.user.id } });
    if (!caregiver) return res.code(404).send({ error: 'NO_PROFILE' });
    
    // Obtener el nombre del usuario
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true }
    });
    
    return { ...caregiver, name: user?.name };
  });

  // Cuidador: actualizar o crear su información personal
  app.put('/me', async (req: any, res) => {
    if (req.user.role !== 'CAREGIVER') return res.code(403).send({ error: 'ONLY_CAREGIVER' });
    const body = z.object({
      name: z.string().nullish(),
      birthDate: z.string().datetime().nullish(),
      gender: z.string().nullish(),
      bloodType: z.string().nullish(),
      phone: z.string().nullish(),
      emergencyContactName: z.string().nullish(),
      emergencyContactRelation: z.string().nullish(),
      emergencyContactPhone: z.string().nullish(),
      relationship: z.string().nullish(),
      photoUrl: z.string().url().nullish()
    }).parse(req.body);

    const existing = await prisma.caregiverProfile.findFirst({ where: { userId: req.user.id } });
    
    // Si se proporciona un nombre, actualizar también el User
    if (body.name !== undefined) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { name: body.name }
      });
    }
    
    const data = {
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      gender: body.gender ?? null,
      bloodType: body.bloodType ?? null,
      phone: body.phone ?? null,
      emergencyContactName: body.emergencyContactName ?? null,
      emergencyContactRelation: body.emergencyContactRelation ?? null,
      emergencyContactPhone: body.emergencyContactPhone ?? null,
      relationship: body.relationship ?? null,
      photoUrl: body.photoUrl ?? null,
      userId: req.user.id
    };
    
    const updated = await prisma.caregiverProfile.upsert({
      where: { id: existing?.id ?? '' },
      create: data,
      update: data
    });
    
    // Obtener el usuario actualizado para incluir el nombre
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true }
    });
    
    return { ...updated, name: user?.name };
  });
};

export default router;
