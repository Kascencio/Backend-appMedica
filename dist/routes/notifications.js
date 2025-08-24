import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
// Schemas de validación mejorados
const NotificationTypeEnum = z.enum([
    'MEDICATION_REMINDER',
    'APPOINTMENT_REMINDER',
    'TREATMENT_UPDATE',
    'EMERGENCY_ALERT',
    'SYSTEM_MESSAGE',
    'CAREGIVER_REQUEST',
    'PERMISSION_UPDATE',
    'GENERAL_INFO'
]);
const NotificationPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const NotificationStatusEnum = z.enum(['UNREAD', 'READ', 'ARCHIVED']);
// Schema para crear notificación
const CreateNotificationSchema = z.object({
    userId: z.string().min(1, 'userId es requerido'),
    type: NotificationTypeEnum,
    title: z.string().min(1, 'Título es requerido').max(200, 'Título muy largo'),
    message: z.string().min(1, 'Mensaje es requerido').max(1000, 'Mensaje muy largo'),
    priority: NotificationPriorityEnum.optional().default('MEDIUM'),
    metadata: z.record(z.string(), z.any()).optional(),
    scheduledFor: z.string().datetime().optional()
});
// Schema para actualizar notificación
const UpdateNotificationSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    message: z.string().min(1).max(1000).optional(),
    priority: NotificationPriorityEnum.optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    scheduledFor: z.string().datetime().optional()
});
// Schema para filtros de búsqueda
const NotificationFiltersSchema = z.object({
    status: NotificationStatusEnum.optional(),
    type: NotificationTypeEnum.optional(),
    priority: NotificationPriorityEnum.optional(),
    search: z.string().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    page: z.coerce.number().min(1).optional(),
    pageSize: z.coerce.number().min(1).max(100).optional()
});
const router = async (app) => {
    app.addHook('onRequest', app.auth);
    // Health check del sistema de notificaciones
    app.get('/health', async () => {
        try {
            const count = await prisma.notification.count();
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                totalNotifications: count,
                message: 'Sistema de notificaciones funcionando correctamente'
            };
        }
        catch (error) {
            app.log.error('Error en health check');
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'Error conectando con la base de datos'
            };
        }
    });
    // Endpoint de prueba simple
    app.get('/ping', async () => {
        return {
            message: "Sistema de notificaciones funcionando correctamente",
            timestamp: new Date().toISOString(),
            status: "success",
            version: "1.0.0"
        };
    });
    // Obtener notificaciones del usuario autenticado con filtros avanzados
    app.get('/', async (req, res) => {
        try {
            const q = NotificationFiltersSchema.parse(req.query);
            const { skip, take, page, pageSize } = parsePagination(q);
            const where = { userId: req.user.id };
            // Aplicar filtros
            if (q.status)
                where.status = q.status;
            if (q.type)
                where.type = q.type;
            if (q.priority)
                where.priority = q.priority;
            // Búsqueda por texto en título y mensaje
            if (q.search) {
                where.OR = [
                    { title: { contains: q.search, mode: 'insensitive' } },
                    { message: { contains: q.search, mode: 'insensitive' } }
                ];
            }
            // Filtro por fecha
            if (q.fromDate || q.toDate) {
                where.createdAt = {};
                if (q.fromDate)
                    where.createdAt.gte = new Date(q.fromDate);
                if (q.toDate)
                    where.createdAt.lte = new Date(q.toDate);
            }
            const [total, items] = await Promise.all([
                prisma.notification.count({ where }),
                prisma.notification.findMany({
                    where,
                    orderBy: [
                        { priority: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    skip,
                    take,
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        message: true,
                        priority: true,
                        status: true,
                        metadata: true,
                        scheduledFor: true,
                        readAt: true,
                        createdAt: true,
                        updatedAt: true
                    }
                })
            ]);
            app.log.info(`Usuario ${req.user.id} consultó ${items.length} notificaciones`);
            return {
                items,
                meta: buildMeta(total, page, pageSize),
                filters: q
            };
        }
        catch (error) {
            app.log.error('Error obteniendo notificaciones');
            return res.code(400).send({
                error: 'INVALID_FILTERS',
                message: 'Filtros de búsqueda inválidos',
                details: error instanceof z.ZodError ? error.issues : 'Error de validación'
            });
        }
    });
    // Crear nueva notificación con validaciones mejoradas
    app.post('/', async (req, res) => {
        try {
            const body = CreateNotificationSchema.parse(req.body);
            // Verificar que el usuario existe
            const targetUser = await prisma.user.findUnique({
                where: { id: body.userId },
                select: { id: true, role: true }
            });
            if (!targetUser) {
                return res.code(404).send({
                    error: 'USER_NOT_FOUND',
                    message: 'Usuario destinatario no encontrado'
                });
            }
            // Verificar permisos para crear notificaciones
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
                    return res.code(403).send({
                        error: 'NO_PERMISSION',
                        message: 'No tienes permiso para crear notificaciones para este usuario'
                    });
                }
            }
            // Crear la notificación
            const notificationData = {
                userId: body.userId,
                type: body.type,
                title: body.title,
                message: body.message,
                priority: body.priority,
                scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null
            };
            // Solo agregar metadata si existe
            if (body.metadata) {
                notificationData.metadata = body.metadata;
            }
            const notification = await prisma.notification.create({
                data: notificationData
            });
            app.log.info(`Notificación creada: ${notification.id} para usuario ${body.userId} por ${req.user.id}`);
            return res.code(201).send({
                ...notification,
                message: 'Notificación creada exitosamente'
            });
        }
        catch (error) {
            app.log.error('Error creando notificación');
            if (error instanceof z.ZodError) {
                return res.code(400).send({
                    error: 'VALIDATION_ERROR',
                    message: 'Datos de notificación inválidos',
                    details: error.issues
                });
            }
            return res.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Error interno del servidor'
            });
        }
    });
    // Obtener notificación específica
    app.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const notification = await prisma.notification.findUnique({
                where: { id },
                select: {
                    id: true,
                    userId: true,
                    type: true,
                    title: true,
                    message: true,
                    priority: true,
                    status: true,
                    metadata: true,
                    scheduledFor: true,
                    readAt: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            if (!notification) {
                return res.code(404).send({
                    error: 'NOTIFICATION_NOT_FOUND',
                    message: 'Notificación no encontrada'
                });
            }
            // Verificar que el usuario solo pueda ver sus propias notificaciones
            if (notification.userId !== req.user.id) {
                return res.code(403).send({
                    error: 'NO_PERMISSION',
                    message: 'No tienes permiso para ver esta notificación'
                });
            }
            return notification;
        }
        catch (error) {
            app.log.error('Error obteniendo notificación');
            return res.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Error interno del servidor'
            });
        }
    });
    // Marcar notificación como leída
    app.patch('/:id/read', async (req, res) => {
        try {
            const { id } = req.params;
            const notification = await prisma.notification.findUnique({
                where: { id },
                select: { id: true, userId: true, status: true }
            });
            if (!notification) {
                return res.code(404).send({
                    error: 'NOTIFICATION_NOT_FOUND',
                    message: 'Notificación no encontrada'
                });
            }
            if (notification.userId !== req.user.id) {
                return res.code(403).send({
                    error: 'NO_PERMISSION',
                    message: 'No tienes permiso para modificar esta notificación'
                });
            }
            if (notification.status === 'READ') {
                return res.code(200).send({
                    message: 'Notificación ya está marcada como leída',
                    notification
                });
            }
            const updated = await prisma.notification.update({
                where: { id },
                data: {
                    status: 'READ',
                    readAt: new Date()
                }
            });
            app.log.info(`Notificación ${id} marcada como leída por usuario ${req.user.id}`);
            return {
                ...updated,
                message: 'Notificación marcada como leída exitosamente'
            };
        }
        catch (error) {
            app.log.error('Error marcando notificación como leída');
            return res.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Error interno del servidor'
            });
        }
    });
    // Archivar notificación
    app.patch('/:id/archive', async (req, res) => {
        try {
            const { id } = req.params;
            const notification = await prisma.notification.findUnique({
                where: { id },
                select: { id: true, userId: true, status: true }
            });
            if (!notification) {
                return res.code(404).send({
                    error: 'NOTIFICATION_NOT_FOUND',
                    message: 'Notificación no encontrada'
                });
            }
            if (notification.userId !== req.user.id) {
                return res.code(403).send({
                    error: 'NO_PERMISSION',
                    message: 'No tienes permiso para modificar esta notificación'
                });
            }
            if (notification.status === 'ARCHIVED') {
                return res.code(200).send({
                    message: 'Notificación ya está archivada',
                    notification
                });
            }
            const updated = await prisma.notification.update({
                where: { id },
                data: { status: 'ARCHIVED' }
            });
            app.log.info(`Notificación ${id} archivada por usuario ${req.user.id}`);
            return {
                ...updated,
                message: 'Notificación archivada exitosamente'
            };
        }
        catch (error) {
            app.log.error('Error archivando notificación');
            return res.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Error interno del servidor'
            });
        }
    });
    // Actualizar notificación
    app.patch('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const body = UpdateNotificationSchema.parse(req.body);
            const notification = await prisma.notification.findUnique({
                where: { id },
                select: { id: true, userId: true, status: true }
            });
            if (!notification) {
                return res.code(404).send({
                    error: 'NOTIFICATION_NOT_FOUND',
                    message: 'Notificación no encontrada'
                });
            }
            if (notification.userId !== req.user.id) {
                return res.code(403).send({
                    error: 'NO_PERMISSION',
                    message: 'No tienes permiso para modificar esta notificación'
                });
            }
            if (notification.status === 'ARCHIVED') {
                return res.code(400).send({
                    error: 'CANNOT_UPDATE_ARCHIVED',
                    message: 'No se puede modificar una notificación archivada'
                });
            }
            const updateData = {};
            if (body.title !== undefined)
                updateData.title = body.title;
            if (body.message !== undefined)
                updateData.message = body.message;
            if (body.priority !== undefined)
                updateData.priority = body.priority;
            if (body.metadata !== undefined)
                updateData.metadata = body.metadata;
            if (body.scheduledFor !== undefined) {
                updateData.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
            }
            const updated = await prisma.notification.update({
                where: { id },
                data: updateData
            });
            app.log.info(`Notificación ${id} actualizada por usuario ${req.user.id}`);
            return {
                ...updated,
                message: 'Notificación actualizada exitosamente'
            };
        }
        catch (error) {
            app.log.error('Error actualizando notificación');
            if (error instanceof z.ZodError) {
                return res.code(400).send({
                    error: 'VALIDATION_ERROR',
                    message: 'Datos de actualización inválidos',
                    details: error.issues
                });
            }
            return res.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Error interno del servidor'
            });
        }
    });
    // Eliminar notificación
    app.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const notification = await prisma.notification.findUnique({
                where: { id },
                select: { id: true, userId: true }
            });
            if (!notification) {
                return res.code(404).send({
                    error: 'NOTIFICATION_NOT_FOUND',
                    message: 'Notificación no encontrada'
                });
            }
            if (notification.userId !== req.user.id) {
                return res.code(403).send({
                    error: 'NO_PERMISSION',
                    message: 'No tienes permiso para eliminar esta notificación'
                });
            }
            await prisma.notification.delete({ where: { id } });
            app.log.info(`Notificación ${id} eliminada por usuario ${req.user.id}`);
            return res.code(204).send();
        }
        catch (error) {
            app.log.error('Error eliminando notificación');
            return res.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Error interno del servidor'
            });
        }
    });
    // Obtener estadísticas detalladas de notificaciones
    app.get('/stats', async (req) => {
        try {
            const userId = req.user.id;
            const [total, unread, read, archived, byType, byPriority] = await Promise.all([
                prisma.notification.count({ where: { userId } }),
                prisma.notification.count({ where: { userId, status: 'UNREAD' } }),
                prisma.notification.count({ where: { userId, status: 'READ' } }),
                prisma.notification.count({ where: { userId, status: 'ARCHIVED' } }),
                prisma.notification.groupBy({
                    by: ['type'],
                    where: { userId },
                    _count: { type: true }
                }),
                prisma.notification.groupBy({
                    by: ['priority'],
                    where: { userId },
                    _count: { priority: true }
                })
            ]);
            // Calcular porcentajes
            const totalCount = total || 1; // Evitar división por cero
            const stats = {
                total,
                unread,
                read,
                archived,
                percentages: {
                    unread: Math.round((unread / totalCount) * 100),
                    read: Math.round((read / totalCount) * 100),
                    archived: Math.round((archived / totalCount) * 100)
                },
                byType: byType.reduce((acc, item) => {
                    acc[item.type] = item._count.type;
                    return acc;
                }, {}),
                byPriority: byPriority.reduce((acc, item) => {
                    acc[item.priority] = item._count.priority;
                    return acc;
                }, {}),
                lastUpdated: new Date().toISOString()
            };
            app.log.info(`Estadísticas consultadas por usuario ${userId}`);
            return stats;
        }
        catch (error) {
            app.log.error('Error obteniendo estadísticas');
            return {
                error: 'INTERNAL_ERROR',
                message: 'Error obteniendo estadísticas'
            };
        }
    });
    // Marcar múltiples notificaciones como leídas
    app.patch('/bulk/read', async (req, res) => {
        try {
            const body = z.object({
                ids: z.array(z.string()).min(1, 'Se requiere al menos un ID')
            }).parse(req.body);
            const notifications = await prisma.notification.findMany({
                where: {
                    id: { in: body.ids },
                    userId: req.user.id
                },
                select: { id: true, status: true }
            });
            if (notifications.length === 0) {
                return res.code(404).send({
                    error: 'NO_NOTIFICATIONS_FOUND',
                    message: 'No se encontraron notificaciones para marcar como leídas'
                });
            }
            const unreadNotifications = notifications.filter(n => n.status === 'UNREAD');
            if (unreadNotifications.length === 0) {
                return res.code(200).send({
                    message: 'Todas las notificaciones ya están marcadas como leídas',
                    processed: 0
                });
            }
            await prisma.notification.updateMany({
                where: {
                    id: { in: unreadNotifications.map(n => n.id) },
                    userId: req.user.id
                },
                data: {
                    status: 'READ',
                    readAt: new Date()
                }
            });
            app.log.info(`Usuario ${req.user.id} marcó ${unreadNotifications.length} notificaciones como leídas`);
            return {
                message: 'Notificaciones marcadas como leídas exitosamente',
                processed: unreadNotifications.length,
                total: notifications.length
            };
        }
        catch (error) {
            app.log.error('Error en bulk read');
            if (error instanceof z.ZodError) {
                return res.code(400).send({
                    error: 'VALIDATION_ERROR',
                    message: 'Datos inválidos',
                    details: error.issues
                });
            }
            return res.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Error interno del servidor'
            });
        }
    });
    // Limpiar notificaciones antiguas (solo para administradores)
    app.delete('/cleanup/old', async (req, res) => {
        try {
            // Solo permitir a usuarios con rol específico o después de cierta fecha
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 días atrás
            const deletedCount = await prisma.notification.deleteMany({
                where: {
                    userId: req.user.id,
                    status: 'ARCHIVED',
                    updatedAt: { lt: cutoffDate }
                }
            });
            app.log.info(`Usuario ${req.user.id} limpió ${deletedCount.count} notificaciones antiguas`);
            return {
                message: 'Limpieza completada exitosamente',
                deletedCount: deletedCount.count,
                cutoffDate: cutoffDate.toISOString()
            };
        }
        catch (error) {
            app.log.error('Error en cleanup');
            return res.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'Error durante la limpieza'
            });
        }
    });
};
export default router;
//# sourceMappingURL=notifications.js.map