import Fastify from 'fastify';
import { env } from './env.js';
import corsPlugin from './plugins/cors.js';
import authPlugin from './plugins/auth.js';
import errorsPlugin from './plugins/errors.js';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from './routes/auth.js';
import patientsRoutes from './routes/patients.js';
import caregiversRoutes from './routes/caregivers.js';
import permissionsRoutes from './routes/permissions.js';
import medicationsRoutes from './routes/medications.js';
import appointmentsRoutes from './routes/appointments.js';
import treatmentsRoutes from './routes/treatments.js';
import intakeRoutes from './routes/intake-events.js';
import subscribeRoutes from './routes/subscribe.js';
import notificationsRoutes from './routes/notifications.js';
const app = Fastify({ logger: true });
await app.register(errorsPlugin);
await app.register(corsPlugin);
await app.register(authPlugin);
await app.register(fastifyStatic, {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads/',
});
app.get('/health', async () => ({ ok: true }));
app.register(authRoutes, { prefix: '/api/auth' });
app.register(patientsRoutes, { prefix: '/api/patients' });
app.register(caregiversRoutes, { prefix: '/api/caregivers' });
app.register(permissionsRoutes, { prefix: '/api/permissions' });
app.register(medicationsRoutes, { prefix: '/api/medications' });
app.register(appointmentsRoutes, { prefix: '/api/appointments' });
app.register(treatmentsRoutes, { prefix: '/api/treatments' });
app.register(intakeRoutes, { prefix: '/api/intake-events' });
app.register(subscribeRoutes, { prefix: '/api' });
app.register(notificationsRoutes, { prefix: '/api/notifications' });
const port = Number(env.PORT);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map