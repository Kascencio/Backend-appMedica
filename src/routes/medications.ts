import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { canAccessPatient } from '../utils/permissions.js';

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  // Listado con paginación, filtros por texto, rango de fechas y ordenación
  app.get('/', async (req: any, res) => {
    const q = z.object({
      patientProfileId: z.string(),
      search: z.string().optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      sort: z.enum(['createdAt','startDate','name']).default('createdAt'),
      order: z.enum(['asc','desc']).default('desc'),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional()
    }).parse(req.query);

    if (!(await canAccessPatient(q.patientProfileId, req.user, 'READ'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const { skip, take, page, pageSize } = parsePagination(q);

    const where: any = { patientProfileId: q.patientProfileId };
    if (q.search) where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { notes: { contains: q.search, mode: 'insensitive' } }
    ];
    if (q.from || q.to) where.startDate = {};
    if (q.from) where.startDate.gte = new Date(q.from);
    if (q.to) where.startDate.lte = new Date(q.to);

    const [total, items] = await Promise.all([
      prisma.medication.count({ where }),
      prisma.medication.findMany({ where, orderBy: { [q.sort]: q.order }, skip, take })
    ]);

    return { items, meta: buildMeta(total, page, pageSize) };
  });

  // Crear medicamento + schedule opcional
  app.post('/', async (req: any, res) => {
    const body = z.object({
      patientProfileId: z.string(),
      name: z.string().min(1),
      dosage: z.string().optional(),
      type: z.string().optional(),
      frequency: z.string().min(1),
      startDate: z.string().datetime(),
      endDate: z.string().datetime().nullable().optional(),
      notes: z.string().optional(),
      schedule: z.object({
        frequency: z.string(),
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
        customRule: z.any().optional(),
        timezone: z.string()
      }).optional()
    }).parse(req.body);

    if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const created = await prisma.$transaction(async (tx) => {
      const med = await tx.medication.create({
        data: {
          patientProfileId: body.patientProfileId,
          name: body.name,
          dosage: body.dosage,
          type: body.type,
          frequency: body.frequency,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
          notes: body.notes
        }
      });
      if (body.schedule) {
        await tx.medicationSchedule.create({
          data: {
            patientProfileId: body.patientProfileId,
            medicationId: med.id,
            frequency: body.schedule.frequency,
            times: body.schedule.times,
            daysOfWeek: body.schedule.daysOfWeek ?? null,
            customRule: body.schedule.customRule ?? null,
            timezone: body.schedule.timezone
          }
        });
      }
      return med;
    });

    return res.code(201).send(created);
  });

  // Actualizar medicamento y/o schedule
  app.patch('/:id', async (req: any, res) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      patientProfileId: z.string(),
      name: z.string().optional(),
      dosage: z.string().optional(),
      type: z.string().optional(),
      frequency: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().nullable().optional(),
      notes: z.string().optional(),
      schedule: z.object({
        frequency: z.string().optional(),
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
        customRule: z.any().optional(),
        timezone: z.string().optional()
      }).optional()
    }).parse(req.body);

    if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const updated = await prisma.$transaction(async (tx) => {
      const med = await tx.medication.update({
        where: { id },
        data: {
          ...('name' in body ? { name: body.name } : {}),
          ...('dosage' in body ? { dosage: body.dosage } : {}),
          ...('type' in body ? { type: body.type } : {}),
          ...('frequency' in body ? { frequency: body.frequency } : {}),
          ...('startDate' in body ? { startDate: body.startDate ? new Date(body.startDate) : undefined } : {}),
          ...('endDate' in body ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
          ...('notes' in body ? { notes: body.notes } : {})
        }
      });
      if (body.schedule) {
        const existing = await tx.medicationSchedule.findFirst({ where: { medicationId: id } });
        if (existing) {
          await tx.medicationSchedule.update({
            where: { id: existing.id },
            data: {
              ...('frequency' in body.schedule ? { frequency: body.schedule.frequency } : {}),
              ...('times' in body.schedule ? { times: body.schedule.times } : {}),
              ...('daysOfWeek' in body.schedule ? { daysOfWeek: body.schedule.daysOfWeek ?? null } : {}),
              ...('customRule' in body.schedule ? { customRule: body.schedule.customRule ?? null } : {}),
              ...('timezone' in body.schedule ? { timezone: body.schedule.timezone! } : {})
            }
          });
        } else {
          await tx.medicationSchedule.create({
            data: {
              patientProfileId: body.patientProfileId,
              medicationId: id,
              frequency: body.schedule.frequency ?? 'daily',
              times: body.schedule.times ?? [],
              daysOfWeek: body.schedule.daysOfWeek ?? null,
              customRule: body.schedule.customRule ?? null,
              timezone: body.schedule.timezone ?? 'UTC'
            }
          });
        }
      }
      return med;
    });

    return updated;
  });

  // Borrar
  app.delete('/:id', async (req: any, res) => {
    const { id } = req.params as { id: string };
    const { patientProfileId } = z.object({ patientProfileId: z.string() }).parse(req.query);
    if (!(await canAccessPatient(patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });

    await prisma.$transaction([
      prisma.medicationSchedule.deleteMany({ where: { medicationId: id } }),
      prisma.medication.delete({ where: { id } })
    ]);
    return res.code(204).send();
  });
};

export default router;
