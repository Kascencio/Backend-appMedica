import { prisma } from '../plugins/prisma.js';

export async function canAccessPatient(patientProfileId: string, user: { id: string; role: 'PATIENT'|'CAREGIVER' }, level: 'READ'|'WRITE'|'ADMIN' = 'READ') {
  console.log('[canAccessPatient] patientProfileId:', patientProfileId, 'user:', user, 'level:', level);
  if (user.role === 'PATIENT') {
    const patient = await prisma.patientProfile.findUnique({ where: { id: patientProfileId }, select: { userId: true } });
    console.log('[canAccessPatient] patient:', patient);
    return patient?.userId === user.id;
  }
  // CAREGIVER
  const perm = await prisma.permission.findUnique({
    where: { patientProfileId_caregiverId: { patientProfileId, caregiverId: user.id } },
    select: { status: true, level: true }
  });
  console.log('[canAccessPatient] permission:', perm);
  if (!perm || perm.status !== 'ACCEPTED') {
    console.log('[canAccessPatient] No permission or not ACCEPTED');
    return false;
  }
  if (level === 'READ') return true;
  if (level === 'WRITE') return perm.level === 'WRITE' || perm.level === 'ADMIN';
  if (level === 'ADMIN') return perm.level === 'ADMIN';
  return false;
}
