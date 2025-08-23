import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
const router = async (app) => {
    app.addHook('onRequest', app.auth);
    // Obtener notificaciones del usuario autenticado
    app.get('/', async (req, res) => {
        const q = z.object({
            status: z.enum(['UNREAD', 'READ', 'ARCHIVED']).optional(),
            type: z.enum(['MEDICATION_REMINDER', 'APPOINTMENT_REMINDER', 'TREATMENT_UPDATE', 'EMERGENCY_ALERT', 'SYSTEM_MESSAGE', 'CAREGIVER_REQUEST', 'PERMISSION_UPDATE', 'GENERAL_INFO']).optional(),
            priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
            page: z.coerce.number().optional(),
            pageSize: z.coerce.number().optional()
        }).parse(req.query);
        const { skip, take, page, pageSize } = parsePagination(q);
        const where = { userId: req.user.id };
        if (q.status)
            where.status = q.status;
        if (q.type)
            where.type = q.type;
        if (q.priority)
            where.priority = q.priority;
        const [total, items] = await Promise.all([
            prisma.notification.count({ where }),
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take
            })
        ]);
        return { items, meta: buildMeta(total, page, pageSize) };
    });
    // Crear nueva notificación
    app.post('/', async (req, res) => {
        const body = z.object({
            userId: z.string(), // ID del usuario que recibe la notificación
            type: z.enum(['MEDICATION_REMINDER', 'APPOINTMENT_REMINDER', 'TREATMENT_UPDATE', 'EMERGENCY_ALERT', 'SYSTEM_MESSAGE', 'CAREGIVER_REQUEST', 'PERMISSION_UPDATE', 'GENERAL_INFO']),
            title: z.string(),
            message: z.string(),
            priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
            metadata: z.any().optional(),
            scheduledFor: z.string().datetime().optional()
        }).parse(req.body);
        // Verificar que el usuario autenticado pueda crear notificaciones para otros usuarios
        // (solo cuidadores pueden crear notificaciones para sus pacientes)
        if (req.user.id !== body.userId) {
            // Verificar si es cuidador con permiso sobre el paciente
            const permission = await prisma.permission.findUnique({
                where: {
                    patientProfileId_caregiverId: {
                        patientProfileId: body.userId,
                        caregiverId: req.user.id
                    }
                }
            });
            if (!permission || permission.status !== 'ACCEPTED') {
                return res.code(403).send({ error: 'NO_PERMISSION' });
            }
        }
        const notification = await prisma.notification.create({
            data: {
                userId: body.userId,
                type: body.type,
                title: body.title,
                message: body.message,
                priority: body.priority || 'MEDIUM',
                metadata: body.metadata || null,
                scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null
            }
        });
        return res.code(201).send(notification);
    });
    // Marcar notificación como leída
    app.patch('/:id/read', async (req, res) => {
        const { id } = req.params;
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification)
            return res.code(404).send({ error: 'NOTIFICATION_NOT_FOUND' });
        // Verificar que el usuario solo pueda marcar sus propias notificaciones como leídas
        if (notification.userId !== req.user.id) {
            return res.code(403).send({ error: 'NO_PERMISSION' });
        }
        const updated = await prisma.notification.update({
            where: { id },
            data: {
                status: 'READ',
                readAt: new Date()
            }
        });
        return updated;
    });
    // Archivar notificación
    app.patch('/:id/archive', async (req, res) => {
        const { id } = req.params;
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification)
            return res.code(404).send({ error: 'NOTIFICATION_NOT_FOUND' });
        if (notification.userId !== req.user.id) {
            return res.code(403).send({ error: 'NO_PERMISSION' });
        }
        const updated = await prisma.notification.update({
            where: { id },
            data: { status: 'ARCHIVED' }
        });
        return updated;
    });
    // Eliminar notificación
    app.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification)
            return res.code(404).send({ error: 'NOTIFICATION_NOT_FOUND' });
        if (notification.userId !== req.user.id) {
            return res.code(403).send({ error: 'NO_PERMISSION' });
        }
        await prisma.notification.delete({ where: { id } });
        return res.code(204).send();
    });
    // Obtener estadísticas de notificaciones
    app.get('/stats', async (req) => {
        const [total, unread, read, archived] = await Promise.all([
            prisma.notification.count({ where: { userId: req.user.id } }),
            prisma.notification.count({ where: { userId: req.user.id, status: 'UNREAD' } }),
            prisma.notification.count({ where: { userId: req.user.id, status: 'READ' } }),
            prisma.notification.count({ where: { userId: req.user.id, status: 'ARCHIVED' } })
        ]);
        return {
            total,
            unread,
            read,
            archived
        };
    });
};
export default router;
//# sourceMappingURL=notifications.js.map