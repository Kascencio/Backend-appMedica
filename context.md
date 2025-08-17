# RecuerdaMed API (Fastify + Prisma) – Código completo

> Backend listo para VPS con PM2 o Docker. Incluye autenticación JWT, control de permisos Paciente/Cuidador, CRUD avanzado (paginación, filtros, ordenación), esquemas Prisma y endpoints para medicamentos, tratamientos, citas, cuidadores, eventos de adherencia y suscripciones push.

---

## 📁 Estructura

```
recuerdamed-api/
  prisma/
    schema.prisma
  src/
    index.ts
    env.ts
    plugins/
      prisma.ts
      cors.ts
      auth.ts
      errors.ts
    utils/
      hash.ts
      z.ts
      pagination.ts
      permissions.ts
    routes/
      auth.ts
      patients.ts
      caregivers.ts
      permissions.ts
      medications.ts
      appointments.ts
      treatments.ts
      intake-events.ts
      subscribe.ts
  .env.example
  package.json
  tsconfig.json
  ecosystem.config.cjs
  Dockerfile
  docker-compose.yml
  nginx-recuerdamed.conf
  README.md
```

---

## 📦 package.json

```json
{
  "name": "recuerdamed-api",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc -p .",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.1",
    "@prisma/client": "^5.18.0",
    "fastify": "^4.28.1",
    "zod": "^3.23.8",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/node": "^22.5.1",
    "eslint": "^9.8.0",
    "typescript": "^5.5.4",
    "prisma": "^5.18.0",
    "tsx": "^4.19.0"
  }
}
```

---

## 🔧 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

---

## 🔐 .env.example

```env
DATABASE_URL="postgresql://app:app_pass@localhost:5432/recuerdamed"
JWT_SECRET="cámbiame-por-un-secreto-largo-y-aleatorio"
PORT=3001
NODE_ENV=production
CORS_ORIGIN="https://app.tudominio.com,https://mobile.tudominio.com,http://localhost:19006"
```

---

## 🧱 prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  PATIENT
  CAREGIVER
}

enum PermissionLevel {
  READ
  WRITE
  ADMIN
}

enum PermissionStatus {
  PENDING
  ACCEPTED
  REJECTED
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}

enum IntakeKind {
  MED
  TRT
}

enum IntakeAction {
  TAKEN
  SNOOZE
  SKIPPED
}

model User {
  id            String          @id @default(cuid())
  email         String          @unique
  passwordHash  String
  role          Role
  createdAt     DateTime        @default(now())
  patientProfile PatientProfile?
  caregiverPermissions Permission[] @relation("CaregiverPermissions")
}

model PatientProfile {
  id            String        @id @default(cuid())
  userId        String        @unique
  user          User          @relation(fields: [userId], references: [id])
  name          String?
  age           Int?
  weight        Float?
  height        Float?
  allergies     String?
  reactions     String?
  doctorName    String?
  doctorContact String?
  photoUrl      String?

  medications   Medication[]
  medicationSchedules MedicationSchedule[]
  appointments  Appointment[]
  treatments    Treatment[]
  treatmentReminders TreatmentReminder[]
  permissions   Permission[]  @relation("PatientPermissions")
  intakeEvents  IntakeEvent[]

  @@index([userId])
}

model Permission {
  id               String            @id @default(cuid())
  patientProfileId String
  caregiverId      String
  level            PermissionLevel   @default(READ)
  status           PermissionStatus  @default(PENDING)

  patientProfile   PatientProfile    @relation("PatientPermissions", fields: [patientProfileId], references: [id])
  caregiver        User              @relation("CaregiverPermissions", fields: [caregiverId], references: [id])

  @@unique([patientProfileId, caregiverId])
}

model InviteCode {
  id               String   @id @default(cuid())
  patientProfileId String
  code             String   @unique
  expiresAt        DateTime
  used             Boolean  @default(false)
  createdAt        DateTime @default(now())
  patientProfile   PatientProfile @relation(fields: [patientProfileId], references: [id])
}

model Medication {
  id               String   @id @default(cuid())
  patientProfileId String
  patientProfile   PatientProfile @relation(fields: [patientProfileId], references: [id])
  name             String
  dosage           String?
  type             String?
  frequency        String   // "once"|"daily"|"weekly"|"custom"
  startDate        DateTime
  endDate          DateTime?
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([patientProfileId])
}

model MedicationSchedule {
  id            String   @id @default(cuid())
  patientProfileId String
  medicationId  String
  frequency     String
  times         Json     // ["HH:mm", ...]
  daysOfWeek    Json?    // [0..6]
  customRule    Json?
  timezone      String   // TZ para cálculos

  medication    Medication     @relation(fields: [medicationId], references: [id])
  patientProfile PatientProfile @relation(fields: [patientProfileId], references: [id])

  @@index([medicationId])
}

model Treatment {
  id               String   @id @default(cuid())
  patientProfileId String
  patientProfile   PatientProfile @relation(fields: [patientProfileId], references: [id])
  title            String
  description      String?
  startDate        DateTime
  endDate          DateTime?
  progress         String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model TreatmentReminder {
  id               String   @id @default(cuid())
  patientProfileId String
  treatmentId      String
  frequency        String
  times            Json
  daysOfWeek       Json?
  timezone         String

  treatment        Treatment      @relation(fields: [treatmentId], references: [id])
  patientProfile   PatientProfile @relation(fields: [patientProfileId], references: [id])
}

model Appointment {
  id               String   @id @default(cuid())
  patientProfileId String
  patientProfile   PatientProfile @relation(fields: [patientProfileId], references: [id])
  title            String
  description      String?
  dateTime         DateTime
  location         String?
  status           AppointmentStatus @default(SCHEDULED)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([patientProfileId, dateTime])
}

model IntakeEvent {
  id           String       @id @default(cuid())
  kind         IntakeKind
  refId        String       // medication.id o treatment.id
  patientProfileId String
  scheduledFor DateTime
  action       IntakeAction
  at           DateTime     @default(now())
  meta         Json?
  patientProfile PatientProfile @relation(fields: [patientProfileId], references: [id])

  @@index([patientProfileId, scheduledFor])
}

model PushSubscription {
  id           String   @id @default(cuid())
  userId       String
  endpoint     String   @unique
  p256dh       String
  auth         String
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}
```

---

## 🔐 src/env.ts (validación de env)

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(24),
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development','production','test']).default('production'),
  CORS_ORIGIN: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
```

---

## 🔌 src/plugins/prisma.ts

```ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query','error','warn'] : ['error']
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

---

## 🌐 src/plugins/cors.ts

```ts
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { env } from '../env';

export default fp(async (app) => {
  const origins = (env.CORS_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean);
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // apps nativas
      if (origins.length === 0) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      cb(new Error('CORS not allowed'));
    },
    credentials: true
  });
});
```

---

## 🔑 src/plugins/auth.ts

```ts
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { env } from '../env';

export default fp(async (app) => {
  app.register(fastifyJwt, { secret: env.JWT_SECRET });

  app.decorate('auth', async (req: any, _res: any) => {
    await req.jwtVerify();
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    auth: any;
  }
  interface FastifyRequest {
    user: { id: string; role: 'PATIENT'|'CAREGIVER' };
  }
}
```

---

## 🧯 src/plugins/errors.ts (handler global)

```ts
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

export default fp(async (app) => {
  app.setErrorHandler((err, _req, res) => {
    if (err instanceof ZodError) {
      return res.status(400).send({ error: 'VALIDATION', details: err.flatten() });
    }
    const status = (err as any).statusCode || 500;
    app.log.error(err);
    return res.status(status).send({ error: 'INTERNAL', message: err.message });
  });
});
```

---

## 🧰 src/utils/hash.ts

```ts
import bcrypt from 'bcrypt';
export const hash = (s: string) => bcrypt.hash(s, 10);
export const compare = (s: string, h: string) => bcrypt.compare(s, h);
```

---

## 🧰 src/utils/z.ts

```ts
import { ZodSchema } from 'zod';

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}
```

---

## 🧮 src/utils/pagination.ts

```ts
export function parsePagination(q: any) {
  const page = Math.max(1, Number(q.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize ?? 20)));
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  return { page, pageSize, skip, take };
}

export function buildMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  return { total, page, pageSize, totalPages };
}
```

---

## 🔐 src/utils/permissions.ts

```ts
import { prisma } from '../plugins/prisma';

export async function canAccessPatient(patientProfileId: string, user: { id: string; role: 'PATIENT'|'CAREGIVER' }, level: 'READ'|'WRITE'|'ADMIN' = 'READ') {
  if (user.role === 'PATIENT') {
    const patient = await prisma.patientProfile.findUnique({ where: { id: patientProfileId }, select: { userId: true } });
    return patient?.userId === user.id;
  }
  // CAREGIVER
  const perm = await prisma.permission.findUnique({
    where: { patientProfileId_caregiverId: { patientProfileId, caregiverId: user.id } },
    select: { status: true, level: true }
  });
  if (!perm || perm.status !== 'ACCEPTED') return false;
  if (level === 'READ') return true;
  if (level === 'WRITE') return perm.level === 'WRITE' || perm.level === 'ADMIN';
  if (level === 'ADMIN') return perm.level === 'ADMIN';
  return false;
}
```

---

## 🚀 src/index.ts (bootstrap)

```ts
import Fastify from 'fastify';
import { env } from './env';
import corsPlugin from './plugins/cors';
import authPlugin from './plugins/auth';
import errorsPlugin from './plugins/errors';

import authRoutes from './routes/auth.js';
import patientsRoutes from './routes/patients.js';
import caregiversRoutes from './routes/caregivers.js';
import permissionsRoutes from './routes/permissions.js';
import medicationsRoutes from './routes/medications.js';
import appointmentsRoutes from './routes/appointments.js';
import treatmentsRoutes from './routes/treatments.js';
import intakeRoutes from './routes/intake-events.js';
import subscribeRoutes from './routes/subscribe.js';

const app = Fastify({ logger: true });

await app.register(errorsPlugin);
await app.register(corsPlugin);
await app.register(authPlugin);

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

const port = Number(env.PORT);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
```

> **Nota**: En TypeScript con módulos ES, importa rutas con sufijo `.js` al compilar. Si prefieres, usa `tsconfig` con `moduleResolution: node16` y mantén imports sin extensión.

---

## 👤 src/routes/auth.ts

```ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import { hash, compare } from '../utils/hash.js';

const router: FastifyPluginAsync = async (app) => {
  app.post('/register', async (req, res) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['PATIENT','CAREGIVER'])
    }).parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return res.code(409).send({ error: 'EMAIL_TAKEN' });

    const user = await prisma.user.create({
      data: { email: body.email, passwordHash: await hash(body.password), role: body.role }
    });

    if (body.role === 'PATIENT') {
      await prisma.patientProfile.create({ data: { userId: user.id } });
    }

    const token = app.jwt.sign({ id: user.id, role: user.role });
    return res.send({ token });
  });

  app.post('/login', async (req, res) => {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.code(401).send({ error: 'INVALID_CREDENTIALS' });
    const ok = await compare(password, user.passwordHash);
    if (!ok) return res.code(401).send({ error: 'INVALID_CREDENTIALS' });
    const token = app.jwt.sign({ id: user.id, role: user.role });
    return { token };
  });

  app.get('/me', { onRequest: [app.auth] }, async (req: any) => {
    const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, role: true } });
    return me;
  });
};

export default router;
```

---

## 🧑‍⚕️ src/routes/patients.ts

```ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  // Obtiene el perfil del paciente del usuario autenticado (si es paciente)
  app.get('/me', async (req: any, res) => {
    if (req.user.role !== 'PATIENT') return res.code(403).send({ error: 'ONLY_PATIENT' });
    const profile = await prisma.patientProfile.findFirst({ where: { userId: req.user.id } });
    return profile;
  });

  // Upsert del perfil del paciente del usuario autenticado
  app.put('/me', async (req: any, res) => {
    if (req.user.role !== 'PATIENT') return res.code(403).send({ error: 'ONLY_PATIENT' });
    const body = z.object({
      name: z.string().nullish(),
      age: z.number().int().nullish(),
      weight: z.number().nullish(),
      height: z.number().nullish(),
      allergies: z.string().nullish(),
      reactions: z.string().nullish(),
      doctorName: z.string().nullish(),
      doctorContact: z.string().nullish(),
      photoUrl: z.string().url().nullish()
    }).parse(req.body);

    const existing = await prisma.patientProfile.findFirst({ where: { userId: req.user.id } });
    const updated = await prisma.patientProfile.upsert({
      where: { id: existing?.id ?? '' },
      create: { userId: req.user.id, ...body },
      update: { ...body }
    });
    return updated;
  });
};

export default router;
```

---

## 🧑‍🤝‍🧑 src/routes/permissions.ts (gestión)

```ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  // Paciente: listar permisos de sus cuidadores
  app.get('/by-patient/:patientProfileId', async (req: any, res) => {
    const { patientProfileId } = req.params as { patientProfileId: string };
    // Verifica que el user sea dueño de ese paciente
    const patient = await prisma.patientProfile.findUnique({ where: { id: patientProfileId } });
    if (!patient || patient.userId !== req.user.id) return res.code(403).send({ error: 'NO_ACCESS' });
    return prisma.permission.findMany({ where: { patientProfileId }, include: { caregiver: { select: { id: true, email: true, role: true } } } });
  });

  // Paciente: actualizar nivel/estado
  app.patch('/:id', async (req: any, res) => {
    const { id } = req.params as { id: string };
    const { level, status } = z.object({
      level: z.enum(['READ','WRITE','ADMIN']).optional(),
      status: z.enum(['PENDING','ACCEPTED','REJECTED']).optional()
    }).parse(req.body);

    const perm = await prisma.permission.findUnique({ where: { id }, include: { patientProfile: true } });
    if (!perm || perm.patientProfile.userId !== req.user.id) return res.code(403).send({ error: 'NO_ACCESS' });

    const updated = await prisma.permission.update({ where: { id }, data: { level, status } });
    return updated;
  });
};

export default router;
```

---

## 👥 src/routes/caregivers.ts (invitar/unirse)

```ts
import { FastifyPluginAsync } from 'fastify';
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
};

export default router;
```

---

## 💊 src/routes/medications.ts (CRUD avanzado)

```ts
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
```

---

## 📅 src/routes/appointments.ts

```ts
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
```

---

## 🧪 src/routes/treatments.ts

```ts
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
```

---

## 📊 src/routes/intake-events.ts

```ts
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
```

---

## 🔔 src/routes/subscribe.ts (suscripciones push – almacenamiento)

```ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';

const router: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', app.auth);

  app.post('/subscribe', async (req: any) => {
    const body = z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string()
    }).parse(req.body);

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { p256dh: body.p256dh, auth: body.auth, userId: req.user.id },
      create: { ...body, userId: req.user.id }
    });
    return sub;
  });

  app.delete('/subscribe', async (req: any, res) => {
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.query);
    await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => null);
    return res.code(204).send();
  });
};

export default router;
```

---



### Notas finales

* Los endpoints imponen permisos por paciente (propietario o cuidador con **ACCEPTED** y nivel adecuado).
* CRUDs incluyen paginación/orden/filtros.
* `MedicationSchedule` y `TreatmentReminder` permiten que el **mobile** programe notificaciones locales conforme a la configuración almacenada.
* Puedes ampliar con **web push** real en otro servicio; aquí sólo persistimos las suscripciones.
