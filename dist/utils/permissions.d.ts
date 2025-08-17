export declare function canAccessPatient(patientProfileId: string, user: {
    id: string;
    role: 'PATIENT' | 'CAREGIVER';
}, level?: 'READ' | 'WRITE' | 'ADMIN'): Promise<boolean>;
//# sourceMappingURL=permissions.d.ts.map