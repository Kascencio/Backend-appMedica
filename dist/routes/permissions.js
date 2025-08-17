import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
const router = async (app) => {
    app.addHook('onRequest', app.auth);
    // Paciente: listar permisos de sus cuidadores
    app.get('/by-patient/:patientProfileId', async (req, res) => {
        const { patientProfileId } = req.params;
        const patient = await prisma.patientProfile.findUnique({ where: { id: patientProfileId } });
        if (!patient || patient.userId !== req.user.id)
            return res.code(403).send({ error: 'NO_ACCESS' });
        return prisma.permission.findMany({ where: { patientProfileId }, include: { caregiver: { select: { id: true, email: true, role: true } } } });
    });
    // Paciente: actualizar nivel/estado
    app.patch('/:id', async (req, res) => {
        const { id } = req.params;
        const { level, status } = z.object({
            level: z.enum(['READ', 'WRITE', 'ADMIN']).optional(),
            status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional()
        }).parse(req.body);
        const perm = await prisma.permission.findUnique({ where: { id }, include: { patientProfile: true } });
        if (!perm || perm.patientProfile.userId !== req.user.id)
            return res.code(403).send({ error: 'NO_ACCESS' });
        const data = {};
        if (level !== undefined)
            data.level = level;
        if (status !== undefined)
            data.status = status;
        const updated = await prisma.permission.update({ where: { id }, data });
        return updated;
    });
};
export default router;
//# sourceMappingURL=permissions.js.map