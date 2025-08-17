import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { canAccessPatient } from '../utils/permissions.js';

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  app.get('/', async (req: any, res) => {
    const q = z.object({
      patientProfileId: z.string(),
      active: z.coerce.boolean().optional(),
      search: z.string().optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
      sort: z.enum(['createdAt','title']).default('createdAt'),
      order: z.enum(['asc','desc']).default('desc')
    }).parse(req.query);

    if (!(await canAccessPatient(q.patientProfileId, req.user, 'READ'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const { skip, take, page, pageSize } = parsePagination(q);
    const where: any = { patientProfileId: q.patientProfileId };
    if (q.active !== undefined) where.endDate = q.active ? null : { not: null };
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };

    const [total, items] = await Promise.all([
      prisma.treatment.count({ where }),
      prisma.treatment.findMany({ where, orderBy: { [q.sort]: q.order }, skip, take })
    ]);

    return { items, meta: buildMeta(total, page, pageSize) };
  });

  app.post('/', async (req: any, res) => {
    const body = z.object({
      patientProfileId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime().nullable().optional(),
      progress: z.string().optional(),
      reminders: z.array(z.object({
        frequency: z.string(),
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
        timezone: z.string()
      })).optional()
    }).parse(req.body);

    if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const created = await prisma.$transaction(async (tx) => {
      const trt = await tx.treatment.create({
        data: {
          patientProfileId: body.patientProfileId,
          title: body.title,
          description: body.description,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
          progress: body.progress
        }
      });
      if (body.reminders) {
        for (const r of body.reminders) {
          await tx.treatmentReminder.create({
            data: {
              patientProfileId: body.patientProfileId,
              treatmentId: trt.id,
              frequency: r.frequency,
              times: r.times,
              daysOfWeek: r.daysOfWeek ?? null,
              timezone: r.timezone
            }
          });
        }
      }
      return trt;
    });

    return res.code(201).send(created);
  });

  app.patch('/:id', async (req: any, res) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      patientProfileId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().nullable().optional(),
      progress: z.string().optional()
    }).parse(req.body);

    if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const updated = await prisma.treatment.update({
      where: { id },
      data: {
        ...('title' in body ? { title: body.title } : {}),
        ...('description' in body ? { description: body.description } : {}),
        ...('progress' in body ? { progress: body.progress } : {}),
        ...('startDate' in body ? { startDate: body.startDate ? new Date(body.startDate) : undefined } : {}),
        ...('endDate' in body ? { endDate: body.endDate ? new Date(body.endDate) : null } : {})
      }
    });
    return updated;
  });

  app.delete('/:id', async (req: any, res) => {
    const { id } = req.params as { id: string };
    const { patientProfileId } = z.object({ patientProfileId: z.string() }).parse(req.query);
    if (!(await canAccessPatient(patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });
    await prisma.$transaction([
      prisma.treatmentReminder.deleteMany({ where: { treatmentId: id } }),
      prisma.treatment.delete({ where: { id } })
    ]);
    return res.code(204).send();
  });
};

export default router;
