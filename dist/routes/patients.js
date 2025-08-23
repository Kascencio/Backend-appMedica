import { z } from 'zod';
import { prisma } from '../plugins/prisma.js';
import multer from 'fastify-multer';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });
const router = async (app) => {
    app.addHook('onRequest', app.auth);
    // Obtener perfil del paciente autenticado
    app.get('/me', async (req, res) => {
        if (req.user.role !== 'PATIENT')
            return res.code(403).send({ error: 'ONLY_PATIENT' });
        const profile = await prisma.patientProfile.findFirst({ where: { userId: req.user.id } });
        if (!profile)
            return res.code(404).send({ error: 'NO_PROFILE' });
        return { ...profile, role: 'PATIENT' };
    });
    // Upsert del perfil del paciente autenticado
    app.put('/me', async (req, res) => {
        if (req.user.role !== 'PATIENT')
            return res.code(403).send({ error: 'ONLY_PATIENT' });
        const body = z.object({
            name: z.string().nullish(),
            birthDate: z.string().datetime().nullish(),
            gender: z.string().nullish(),
            weight: z.number().nullish(),
            height: z.number().nullish(),
            bloodType: z.string().nullish(),
            // Contacto de emergencia
            emergencyContactName: z.string().nullish(),
            emergencyContactRelation: z.string().nullish(),
            emergencyContactPhone: z.string().nullish(),
            // Información médica
            allergies: z.string().nullish(),
            chronicDiseases: z.string().nullish(),
            currentConditions: z.string().nullish(),
            reactions: z.string().nullish(),
            // Información médica profesional
            doctorName: z.string().nullish(),
            doctorContact: z.string().nullish(),
            hospitalReference: z.string().nullish(),
            photoUrl: z.string().url().nullish()
        }).parse(req.body);
        const existing = await prisma.patientProfile.findFirst({ where: { userId: req.user.id } });
        const data = {
            name: body.name ?? null,
            birthDate: body.birthDate ? new Date(body.birthDate) : null,
            gender: body.gender ?? null,
            weight: body.weight ?? null,
            height: body.height ?? null,
            bloodType: body.bloodType ?? null,
            // Contacto de emergencia
            emergencyContactName: body.emergencyContactName ?? null,
            emergencyContactRelation: body.emergencyContactRelation ?? null,
            emergencyContactPhone: body.emergencyContactPhone ?? null,
            // Información médica
            allergies: body.allergies ?? null,
            chronicDiseases: body.chronicDiseases ?? null,
            currentConditions: body.currentConditions ?? null,
            reactions: body.reactions ?? null,
            // Información médica profesional
            doctorName: body.doctorName ?? null,
            doctorContact: body.doctorContact ?? null,
            hospitalReference: body.hospitalReference ?? null,
            photoUrl: body.photoUrl ?? null,
            userId: req.user.id
        };
        const updated = await prisma.patientProfile.upsert({
            where: { id: existing?.id ?? '' },
            create: data,
            update: data
        });
        return updated;
    });
    // Subir foto de perfil del paciente autenticado
    app.post('/me/photo', { preHandler: upload.single('photo') }, async (req, res) => {
        if (req.user.role !== 'PATIENT')
            return res.code(403).send({ error: 'ONLY_PATIENT' });
        const file = req.file;
        if (!file)
            return res.code(400).send({ error: 'NO_FILE' });
        // Guardar la ruta en la base de datos
        const updated = await prisma.patientProfile.update({
            where: { userId: req.user.id },
            data: { photoUrl: `/uploads/${file.filename}` }
        });
        return { url: `/uploads/${file.filename}` };
    });
    // Endpoint de prueba para verificar campos médicos
    app.get('/test-fields', async (req, res) => {
        return {
            message: "Campos médicos disponibles",
            fields: {
                personal: ["name", "birthDate", "gender", "weight", "height", "bloodType"],
                emergency: ["emergencyContactName", "emergencyContactRelation", "emergencyContactPhone"],
                medical: ["allergies", "chronicDiseases", "currentConditions", "reactions"],
                professional: ["doctorName", "doctorContact", "hospitalReference"],
                media: ["photoUrl"]
            },
            example: {
                name: "Juan Pérez",
                birthDate: "1958-03-15T00:00:00.000Z",
                gender: "Masculino",
                weight: 70.5,
                height: 170,
                bloodType: "O+",
                emergencyContactName: "María Pérez",
                emergencyContactRelation: "Esposa",
                emergencyContactPhone: "555-1234",
                allergies: "Penicilina, Mariscos",
                chronicDiseases: "Hipertensión, Diabetes tipo 2",
                currentConditions: "Control de presión arterial",
                reactions: "Erupción cutánea con penicilina",
                doctorName: "Dra. Ana López",
                doctorContact: "555-5678",
                hospitalReference: "Hospital General de la Ciudad"
            }
        };
    });
};
export default router;
//# sourceMappingURL=patients.js.map