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
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      status: z.enum(['SCHEDULED','COMPLETED','CANCELLED']).optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
      sort: z.enum(['dateTime','createdAt']).default('dateTime'),
      order: z.enum(['asc','desc']).default('asc')
    }).parse(req.query);

    if (!(await canAccessPatient(q.patientProfileId, req.user, 'READ'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const where: any = { patientProfileId: q.patientProfileId };
    if (q.status) where.status = q.status;
    if (q.from || q.to) where.dateTime = {};
    if (q.from) where.dateTime.gte = new Date(q.from);
    if (q.to) where.dateTime.lte = new Date(q.to);

    const { skip, take, page, pageSize } = parsePagination(q);
    const [total, items] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({ where, orderBy: { [q.sort]: q.order }, skip, take })
    ]);

    return { items, meta: buildMeta(total, page, pageSize) };
  });

  app.post('/', async (req: any, res) => {
    const body = z.object({
      patientProfileId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      dateTime: z.string().datetime(),
      location: z.string().optional(),
      status: z.enum(['SCHEDULED','COMPLETED','CANCELLED']).optional()
    }).parse(req.body);

    if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const created = await prisma.appointment.create({
      data: { ...body, dateTime: new Date(body.dateTime) }
    });
    return res.code(201).send(created);
  });

  app.patch('/:id', async (req: any, res) => {
    const { id } = req.params as { id: string };
    const body = z.object({
      patientProfileId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      dateTime: z.string().datetime().optional(),
      location: z.string().optional(),
      status: z.enum(['SCHEDULED','COMPLETED','CANCELLED']).optional()
    }).parse(req.body);

    if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...('title' in body ? { title: body.title } : {}),
        ...('description' in body ? { description: body.description } : {}),
        ...('location' in body ? { location: body.location } : {}),
        ...('status' in body ? { status: body.status } : {}),
        ...('dateTime' in body ? { dateTime: body.dateTime ? new Date(body.dateTime) : undefined } : {})
      }
    });
    return updated;
  });

  app.delete('/:id', async (req: any, res) => {
    const { id } = req.params as { id: string };
    const { patientProfileId } = z.object({ patientProfileId: z.string() }).parse(req.query);
    if (!(await canAccessPatient(patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });
    await prisma.appointment.delete({ where: { id } });
    return res.code(204).send();
  });
};

export default router;
