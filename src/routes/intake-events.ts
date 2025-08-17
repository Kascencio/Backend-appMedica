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
      kind: z.enum(['MED','TRT']).optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional()
    }).parse(req.query);

    if (!(await canAccessPatient(q.patientProfileId, req.user, 'READ'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const { skip, take, page, pageSize } = parsePagination(q);
    const where: any = { patientProfileId: q.patientProfileId };
    if (q.kind) where.kind = q.kind;
    if (q.from || q.to) where.at = {};
    if (q.from) where.at.gte = new Date(q.from);
    if (q.to) where.at.lte = new Date(q.to);

    const [total, items] = await Promise.all([
      prisma.intakeEvent.count({ where }),
      prisma.intakeEvent.findMany({ where, orderBy: { at: 'desc' }, skip, take })
    ]);

    return { items, meta: buildMeta(total, page, pageSize) };
  });

  app.post('/', async (req: any, res) => {
    const body = z.object({
      patientProfileId: z.string(),
      kind: z.enum(['MED','TRT']),
      refId: z.string(),
      scheduledFor: z.string().datetime(),
      action: z.enum(['TAKEN','SNOOZE','SKIPPED']),
      at: z.string().datetime().optional(),
      meta: z.any().optional()
    }).parse(req.body);

    if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE'))) return res.code(403).send({ error: 'NO_ACCESS' });

    const ev = await prisma.intakeEvent.create({
      data: {
        patientProfileId: body.patientProfileId,
        kind: body.kind,
        refId: body.refId,
        scheduledFor: new Date(body.scheduledFor),
        action: body.action,
        at: body.at ? new Date(body.at) : undefined,
        meta: body.meta ?? undefined
      }
    });
    return res.code(201).send(ev);
  });
};

export default router;
