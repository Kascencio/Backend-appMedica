import { prisma } from '../plugins/prisma.js';
export async function canAccessPatient(patientProfileId, user, level = 'READ') {
    if (user.role === 'PATIENT') {
        const patient = await prisma.patientProfile.findUnique({ where: { id: patientProfileId }, select: { userId: true } });
        return patient?.userId === user.id;
    }
    // CAREGIVER
    const perm = await prisma.permission.findUnique({
        where: { patientProfileId_caregiverId: { patientProfileId, caregiverId: user.id } },
        select: { status: true, level: true }
    });
    if (!perm || perm.status !== 'ACCEPTED')
        return false;
    if (level === 'READ')
        return true;
    if (level === 'WRITE')
        return perm.level === 'WRITE' || perm.level === 'ADMIN';
    if (level === 'ADMIN')
        return perm.level === 'ADMIN';
    return false;
}
//# sourceMappingURL=permissions.js.map