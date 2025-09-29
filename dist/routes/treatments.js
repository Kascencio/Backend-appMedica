import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { canAccessPatient } from '../utils/permissions.js';
// Esquemas de validación para medicamentos
const medicationSchema = z.object({
    name: z.string(),
    dosage: z.string().optional(),
    type: z.string().optional(),
    frequency: z.string().optional(),
    notes: z.string().optional(),
});
const router = async (app) => {
    app.addHook('onRequest', app.auth);
    app.get('/', async (req, res) => {
        const q = z.object({
            patientProfileId: z.string(),
            active: z.coerce.boolean().optional(),
            search: z.string().optional(),
            page: z.coerce.number().optional(),
            pageSize: z.coerce.number().optional(),
            sort: z.enum(['createdAt', 'title']).default('createdAt'),
            order: z.enum(['asc', 'desc']).default('desc')
        }).parse(req.query);
        if (!(await canAccessPatient(q.patientProfileId, req.user, 'READ')))
            return res.code(403).send({ error: 'NO_ACCESS' });
        const { skip, take, page, pageSize } = parsePagination(q);
        const where = { patientProfileId: q.patientProfileId };
        if (q.active !== undefined)
            where.endDate = q.active ? null : { not: null };
        if (q.search)
            where.title = { contains: q.search, mode: 'insensitive' };
        const [total, items] = await Promise.all([
            prisma.treatment.count({ where }),
            prisma.treatment.findMany({ where, orderBy: { [q.sort]: q.order }, skip, take })
        ]);
        return { items, meta: buildMeta(total, page, pageSize) };
    });
    app.post('/', async (req, res) => {
        const body = z.object({
            patientProfileId: z.string(),
            title: z.string(),
            description: z.string().optional(),
            startDate: z.string().datetime(),
            endDate: z.string().datetime().nullable().optional(),
            progress: z.string().optional(),
            medications: z.array(medicationSchema).optional(),
            reminders: z.array(z.object({
                frequency: z.string(),
                times: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
                daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
                timezone: z.string()
            })).optional()
        }).parse(req.body);
        if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE')))
            return res.code(403).send({ error: 'NO_ACCESS' });
        const created = await prisma.$transaction(async (tx) => {
            const createData = {
                patientProfileId: body.patientProfileId,
                title: body.title,
                description: body.description ?? null,
                startDate: new Date(body.startDate),
                endDate: body.endDate ? new Date(body.endDate) : null,
                progress: body.progress ?? null
            };
            if (body.medications && body.medications.length) {
                createData.medications = {
                    create: body.medications.map((med) => ({
                        name: med.name,
                        dosage: med.dosage ?? null,
                        type: med.type ?? null,
                        frequency: med.frequency ?? null,
                        notes: med.notes ?? null
                    }))
                };
            }
            const trt = await tx.treatment.create({ data: createData });
            if (body.reminders) {
                for (const r of body.reminders) {
                    await tx.treatmentReminder.create({
                        data: {
                            patientProfileId: body.patientProfileId,
                            treatmentId: trt.id,
                            frequency: r.frequency,
                            times: r.times,
                            ...(r.daysOfWeek !== undefined ? { daysOfWeek: r.daysOfWeek } : {}),
                            timezone: r.timezone
                        }
                    });
                }
            }
            return trt;
        });
        return res.code(201).send(created);
    });
    // Obtener medicamentos de un tratamiento
    app.get('/:id/medications', async (req, res) => {
        const { id } = req.params;
        const { patientProfileId } = z.object({ patientProfileId: z.string() }).parse(req.query);
        if (!(await canAccessPatient(patientProfileId, req.user, 'READ')))
            return res.code(403).send({ error: 'NO_ACCESS' });
        const medications = await prisma.treatmentMedication.findMany({
            where: { treatmentId: id }
        });
        return medications;
    });
    // Agregar medicamento a un tratamiento
    app.post('/:id/medications', async (req, res) => {
        const { id } = req.params;
        const { patientProfileId } = z.object({ patientProfileId: z.string() }).parse(req.query);
        const body = medicationSchema.parse(req.body);
        if (!(await canAccessPatient(patientProfileId, req.user, 'WRITE')))
            return res.code(403).send({ error: 'NO_ACCESS' });
        const medication = await prisma.treatmentMedication.create({
            data: {
                treatmentId: id,
                name: body.name,
                dosage: body.dosage ?? null,
                type: body.type ?? null,
                frequency: body.frequency ?? null,
                notes: body.notes ?? null
            }
        });
        return res.code(201).send(medication);
    });
    // Actualizar medicamento
    app.patch('/:treatmentId/medications/:medicationId', async (req, res) => {
        const { treatmentId, medicationId } = req.params;
        const { patientProfileId } = z.object({ patientProfileId: z.string() }).parse(req.query);
        const body = medicationSchema.partial().parse(req.body);
        if (!(await canAccessPatient(patientProfileId, req.user, 'WRITE')))
            return res.code(403).send({ error: 'NO_ACCESS' });
        const medUpdateData = {};
        if (body.name !== undefined)
            medUpdateData.name = body.name;
        if (body.dosage !== undefined)
            medUpdateData.dosage = body.dosage ?? null;
        if (body.type !== undefined)
            medUpdateData.type = body.type ?? null;
        if (body.frequency !== undefined)
            medUpdateData.frequency = body.frequency ?? null;
        if (body.notes !== undefined)
            medUpdateData.notes = body.notes ?? null;
        const medication = await prisma.treatmentMedication.update({
            where: { id: medicationId },
            data: medUpdateData
        });
        return medication;
    });
    // Eliminar medicamento
    app.delete('/:treatmentId/medications/:medicationId', async (req, res) => {
        const { treatmentId, medicationId } = req.params;
        const { patientProfileId } = z.object({ patientProfileId: z.string() }).parse(req.query);
        if (!(await canAccessPatient(patientProfileId, req.user, 'WRITE')))
            return res.code(403).send({ error: 'NO_ACCESS' });
        await prisma.treatmentMedication.delete({
            where: { id: medicationId }
        });
        return res.code(204).send();
    });
    app.patch('/:id', async (req, res) => {
        const { id } = req.params;
        const body = z.object({
            patientProfileId: z.string(),
            title: z.string().optional(),
            description: z.string().optional(),
            startDate: z.string().datetime().optional(),
            endDate: z.string().datetime().nullable().optional(),
            progress: z.string().optional()
        }).parse(req.body);
        if (!(await canAccessPatient(body.patientProfileId, req.user, 'WRITE')))
            return res.code(403).send({ error: 'NO_ACCESS' });
        const data = {};
        if (body.title !== undefined)
            data.title = body.title;
        if (body.description !== undefined)
            data.description = body.description ?? null;
        if (body.progress !== undefined)
            data.progress = body.progress ?? null;
        if (body.startDate !== undefined)
            data.startDate = body.startDate ? new Date(body.startDate) : undefined;
        if (body.endDate !== undefined)
            data.endDate = body.endDate ? new Date(body.endDate) : null;
        const updated = await prisma.treatment.update({
            where: { id },
            data
        });
        return updated;
    });
    app.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const { patientProfileId } = z.object({ patientProfileId: z.string() }).parse(req.query);
        if (!(await canAccessPatient(patientProfileId, req.user, 'WRITE')))
            return res.code(403).send({ error: 'NO_ACCESS' });
        await prisma.$transaction([
            prisma.treatmentReminder.deleteMany({ where: { treatmentId: id } }),
            prisma.treatment.delete({ where: { id } })
        ]);
        return res.code(204).send();
    });
};
export default router;
//# sourceMappingURL=treatments.js.map