# 🔧 Cambios Necesarios en la App RecuerdaMed

## 📋 Resumen de Cambios

Tu app necesita actualizarse para usar los endpoints correctos del backend. Aquí están todos los cambios necesarios:

## 🚨 **PROBLEMA CRÍTICO IDENTIFICADO:**

### **Backend VPS No Tiene PUT/PATCH Implementado**
- **Problema**: El backend VPS no tiene `PUT` ni `PATCH` para `/api/patients/me`
- **Endpoint**: `/api/patients/me`
- **Estado**: 
  - ✅ `GET /api/patients/me` - Funciona (solo lectura)
  - ❌ `PUT /api/patients/me` - No implementado en VPS
  - ❌ `PATCH /api/patients/me` - No implementado en VPS

**Soluciones:**
1. **Desplegar código actualizado** al VPS (recomendado)
2. **Implementar PATCH** en el backend VPS
3. **Usar solo GET** temporalmente (solo lectura)

---

## 🌐 1. Configuración Base

### **ANTES (Incorrecto):**
```typescript
const API_BASE_URL = 'https://www.recuerdamed.org';
```

### **DESPUÉS (Correcto):**
```typescript
const API_BASE_URL = 'https://www.recuerdamed.org/api';
```

---

## 🔐 2. Autenticación - ✅ YA ESTÁ CORRECTO

### **Endpoints (Sin cambios):**
```typescript
const authEndpoints = {
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  me: `${API_BASE_URL}/auth/me`
};
```

### **Datos que envía (Sin cambios):**
```json
// Login
{
  "email": "usuario@demo.com",
  "password": "123456"
}

// Registro
{
  "email": "usuario@demo.com",
  "password": "123456",
  "role": "PATIENT", // o "CAREGIVER"
  "inviteCode": "ABC123" // opcional para cuidadores
}
```

### **Datos que recibe (Sin cambios):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 💊 3. Medicamentos - ⚠️ CAMBIOS NECESARIOS

### **ANTES (Incorrecto):**
```typescript
const medicationEndpoints = {
  list: `${API_BASE_URL}/medications`,
  create: `${API_BASE_URL}/medications`,
  update: `${API_BASE_URL}/medications/:id`,
  delete: `${API_BASE_URL}/medications/:id`
};
```

### **DESPUÉS (Correcto):**
```typescript
const medicationEndpoints = {
  list: `${API_BASE_URL}/medications`,
  create: `${API_BASE_URL}/medications`,
  update: `${API_BASE_URL}/medications/:id`,
  delete: `${API_BASE_URL}/medications/:id`
};
```

### **Datos que envía (Sin cambios):**
```json
// Crear medicamento
{
  "patientProfileId": "patient-123",
  "name": "Ibuprofeno",
  "dosage": "400mg",
  "frequency": "twice daily",
  "instructions": "Tomar con agua",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z"
}

// Actualizar medicamento
{
  "patientProfileId": "patient-123",
  "name": "Ibuprofeno Actualizado",
  "dosage": "600mg"
}
```

### **Datos que recibe - ⚠️ CAMBIO IMPORTANTE:**

#### **ANTES (Tu app esperaba):**
```json
{
  "data": [
    {
      "id": "med-123",
      "patientProfileId": "patient-123",
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "daily",
      "instructions": "Tomar con comida",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### **DESPUÉS (Backend real devuelve):**
```json
{
  "items": [
    {
      "id": "med-123",
      "patientProfileId": "patient-123",
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "daily",
      "instructions": "Tomar con comida",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

### **Cambios en el código:**
```typescript
// ANTES
const medications = response.data;
const pagination = response.pagination;

// DESPUÉS
const medications = response.items;
const pagination = response.meta;
```

---

## 📅 4. Citas Médicas - ⚠️ CAMBIOS NECESARIOS

### **Endpoints (Sin cambios en la estructura):**
```typescript
const appointmentEndpoints = {
  list: `${API_BASE_URL}/appointments`,
  create: `${API_BASE_URL}/appointments`,
  update: `${API_BASE_URL}/appointments/:id`,
  delete: `${API_BASE_URL}/appointments/:id`
};
```

### **Datos que envía (Sin cambios):**
```json
// Crear cita
{
  "patientProfileId": "patient-123",
  "title": "Consulta de Cardiología",
  "description": "Revisión cardiológica",
  "dateTime": "2024-02-20T14:30:00.000Z",
  "location": "Hospital Central",
  "doctorName": "Dr. Martínez"
}
```

### **Datos que recibe - ⚠️ CAMBIO IMPORTANTE:**

#### **ANTES (Tu app esperaba):**
```json
{
  "data": [
    {
      "id": "appt-123",
      "patientProfileId": "patient-123",
      "title": "Consulta General",
      "description": "Revisión de rutina",
      "dateTime": "2024-02-15T10:00:00.000Z",
      "location": "Clínica San José",
      "doctorName": "Dr. García",
      "status": "SCHEDULED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### **DESPUÉS (Backend real devuelve):**
```json
{
  "items": [
    {
      "id": "appt-123",
      "patientProfileId": "patient-123",
      "title": "Consulta General",
      "description": "Revisión de rutina",
      "dateTime": "2024-02-15T10:00:00.000Z",
      "location": "Clínica San José",
      "doctorName": "Dr. García",
      "status": "SCHEDULED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

## 🏥 5. Tratamientos - ⚠️ CAMBIOS NECESARIOS

### **Endpoints (Sin cambios en la estructura):**
```typescript
const treatmentEndpoints = {
  list: `${API_BASE_URL}/treatments`,
  create: `${API_BASE_URL}/treatments`,
  update: `${API_BASE_URL}/treatments/:id`,
  delete: `${API_BASE_URL}/treatments/:id`
};
```

### **Datos que envía (Sin cambios):**
```json
// Crear tratamiento
{
  "patientProfileId": "patient-123",
  "name": "Terapia Respiratoria",
  "description": "Ejercicios de respiración",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-03-31T23:59:59.000Z",
  "frequency": "Diario",
  "notes": "Realizar por la mañana"
}
```

### **Datos que recibe - ⚠️ CAMBIO IMPORTANTE:**

#### **ANTES (Tu app esperaba):**
```json
{
  "data": [
    {
      "id": "treat-123",
      "patientProfileId": "patient-123",
      "name": "Fisioterapia",
      "description": "Rehabilitación de rodilla",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-06-30T23:59:59.000Z",
      "frequency": "3 veces por semana",
      "notes": "Ejercicios de fortalecimiento",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### **DESPUÉS (Backend real devuelve):**
```json
{
  "items": [
    {
      "id": "treat-123",
      "patientProfileId": "patient-123",
      "name": "Fisioterapia",
      "description": "Rehabilitación de rodilla",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-06-30T23:59:59.000Z",
      "frequency": "3 veces por semana",
      "notes": "Ejercicios de fortalecimiento",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

## 📝 6. Eventos de Adherencia - ⚠️ CAMBIOS NECESARIOS

### **Endpoints (Sin cambios en la estructura):**
```typescript
const intakeEventEndpoints = {
  list: `${API_BASE_URL}/intake-events`,
  create: `${API_BASE_URL}/intake-events`
};
```

### **Datos que envía (Sin cambios):**
```json
// Registrar evento
{
  "patientProfileId": "patient-123",
  "kind": "MED",
  "refId": "med-456",
  "scheduledFor": "2024-01-15T08:00:00.000Z",
  "action": "TAKEN",
  "notes": "Tomado con agua",
  "at": "2024-01-15T08:05:00.000Z"
}
```

### **Datos que recibe - ⚠️ CAMBIO IMPORTANTE:**

#### **ANTES (Tu app esperaba):**
```json
{
  "data": [
    {
      "id": "intake-123",
      "patientProfileId": "patient-123",
      "kind": "MED",
      "refId": "med-456",
      "scheduledFor": "2024-01-15T08:00:00.000Z",
      "action": "TAKEN",
      "notes": "Tomado con desayuno",
      "createdAt": "2024-01-15T08:05:00.000Z",
      "updatedAt": "2024-01-15T08:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### **DESPUÉS (Backend real devuelve):**
```json
{
  "items": [
    {
      "id": "intake-123",
      "patientProfileId": "patient-123",
      "kind": "MED",
      "refId": "med-456",
      "scheduledFor": "2024-01-15T08:00:00.000Z",
      "action": "TAKEN",
      "notes": "Tomado con desayuno",
      "createdAt": "2024-01-15T08:05:00.000Z",
      "updatedAt": "2024-01-15T08:05:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

## 🔔 7. Notificaciones - ⚠️ CAMBIOS NECESARIOS

### **Endpoints (Sin cambios en la estructura):**
```typescript
const notificationEndpoints = {
  list: `${API_BASE_URL}/notifications`,
  stats: `${API_BASE_URL}/notifications/stats`,
  markRead: `${API_BASE_URL}/notifications/:id/read`,
  archive: `${API_BASE_URL}/notifications/:id/archive`
};
```

### **Datos que envía (Sin cambios):**
```json
// Crear notificación
{
  "userId": "user-123",
  "type": "MEDICATION_REMINDER",
  "title": "Hora de tomar medicamento",
  "message": "Es hora de tomar Paracetamol 500mg",
  "priority": "MEDIUM",
  "metadata": {
    "medicationId": "med-456",
    "scheduledTime": "2024-01-15T08:00:00.000Z"
  }
}
```

### **Datos que recibe - ⚠️ CAMBIO IMPORTANTE:**

#### **ANTES (Tu app esperaba):**
```json
{
  "data": [
    {
      "id": "notif-123",
      "userId": "user-456",
      "type": "MEDICATION_REMINDER",
      "title": "Hora de tomar medicamento",
      "message": "Es hora de tomar Paracetamol 500mg",
      "priority": "MEDIUM",
      "status": "UNREAD",
      "metadata": {
        "medicationId": "med-456",
        "scheduledTime": "2024-01-15T08:00:00.000Z"
      },
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-15T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### **DESPUÉS (Backend real devuelve):**
```json
{
  "items": [
    {
      "id": "notif-123",
      "userId": "user-456",
      "type": "MEDICATION_REMINDER",
      "title": "Hora de tomar medicamento",
      "message": "Es hora de tomar Paracetamol 500mg",
      "priority": "MEDIUM",
      "status": "UNREAD",
      "metadata": {
        "medicationId": "med-456",
        "scheduledTime": "2024-01-15T08:00:00.000Z"
      },
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-15T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "filters": {}
}
```

### **Estadísticas de Notificaciones - ⚠️ CAMBIO IMPORTANTE:**

#### **ANTES (Tu app esperaba):**
```json
{
  "total": 25,
  "unread": 5,
  "read": 18,
  "archived": 2,
  "byPriority": {
    "low": 10,
    "medium": 12,
    "high": 3,
    "urgent": 0
  },
  "byType": {
    "MEDICATION_REMINDER": 15,
    "APPOINTMENT_REMINDER": 8,
    "SYSTEM": 2
  }
}
```

#### **DESPUÉS (Backend real devuelve):**
```json
{
  "total": 25,
  "unread": 5,
  "read": 18,
  "archived": 2,
  "percentages": {
    "unread": 20,
    "read": 72,
    "archived": 8
  },
  "byType": {
    "MEDICATION_REMINDER": 15,
    "APPOINTMENT_REMINDER": 8,
    "SYSTEM": 2
  },
  "byPriority": {
    "LOW": 10,
    "MEDIUM": 12,
    "HIGH": 3,
    "URGENT": 0
  },
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

---

## 👥 8. Cuidadores y Permisos - ⚠️ CAMBIOS NECESARIOS

### **Endpoints (Sin cambios en la estructura):**
```typescript
const caregiverEndpoints = {
  patients: `${API_BASE_URL}/caregivers/patients`,
  invite: `${API_BASE_URL}/caregivers/invite`
};
```

### **Datos que recibe - ⚠️ CAMBIO IMPORTANTE:**

#### **ANTES (Tu app esperaba):**
```json
{
  "data": [
    {
      "id": "patient-123",
      "name": "María García",
      "relationship": "Madre",
      "photoUrl": "https://...",
      "lastActivity": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### **DESPUÉS (Backend real devuelve):**
```json
{
  "items": [
    {
      "id": "patient-123",
      "name": "María García",
      "relationship": "Madre",
      "photoUrl": "https://...",
      "lastActivity": "2024-01-15T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

## 🔧 9. Código de Ejemplo para los Cambios

### **Función genérica para manejar respuestas:**

```typescript
// ANTES
function handleApiResponse(response: any) {
  return {
    data: response.data,
    pagination: response.pagination
  };
}

// DESPUÉS
function handleApiResponse(response: any) {
  return {
    data: response.items,        // Cambio: items en lugar de data
    pagination: response.meta    // Cambio: meta en lugar de pagination
  };
}
```

### **Configuración completa de endpoints:**

```typescript
const API_CONFIG = {
  baseUrl: 'https://www.recuerdamed.org/api',
  
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      me: '/auth/me'
    },
    medications: {
      list: '/medications',
      create: '/medications',
      update: '/medications/:id',
      delete: '/medications/:id'
    },
    appointments: {
      list: '/appointments',
      create: '/appointments',
      update: '/appointments/:id',
      delete: '/appointments/:id'
    },
    treatments: {
      list: '/treatments',
      create: '/treatments',
      update: '/treatments/:id',
      delete: '/treatments/:id'
    },
    intakeEvents: {
      list: '/intake-events',
      create: '/intake-events'
    },
    notifications: {
      list: '/notifications',
      stats: '/notifications/stats',
      markRead: '/notifications/:id/read',
      archive: '/notifications/:id/archive'
    },
    caregivers: {
      patients: '/caregivers/patients',
      invite: '/caregivers/invite'
    }
  }
};
```

---

## 📋 10. Checklist de Cambios

### **Cambios Críticos:**
- [ ] Cambiar `API_BASE_URL` de `https://www.recuerdamed.org` a `https://www.recuerdamed.org/api`
- [ ] Cambiar `response.data` por `response.items` en todas las respuestas de listas
- [ ] Cambiar `response.pagination` por `response.meta` en todas las respuestas de listas
- [ ] Actualizar manejo de estadísticas de notificaciones (agregar `percentages` y `lastUpdated`)

### **Cambios de Validación:**
- [ ] Verificar que todos los endpoints usen el prefijo `/api`
- [ ] Probar todas las funcionalidades después de los cambios
- [ ] Verificar que la paginación funcione correctamente
- [ ] Probar el manejo de errores

### **Cambios de Testing:**
- [ ] Actualizar tests unitarios para usar las nuevas estructuras de respuesta
- [ ] Probar en modo offline y online
- [ ] Verificar sincronización de datos

---

## 🚀 11. Orden de Implementación Recomendado

1. **Cambiar configuración base** (`API_BASE_URL`)
2. **Actualizar manejo de respuestas** (`data` → `items`, `pagination` → `meta`)
3. **Probar autenticación** (debería seguir funcionando)
4. **Probar medicamentos** (verificar que funcione con los cambios)
5. **Probar citas** (verificar que funcione con los cambios)
6. **Probar tratamientos** (verificar que funcione con los cambios)
7. **Probar notificaciones** (verificar estadísticas)
8. **Probar eventos de adherencia** (verificar que funcione con los cambios)
9. **Probar cuidadores** (verificar que funcione con los cambios)
10. **Testing completo** (todas las funcionalidades)

---

## ⚠️ 12. Notas Importantes

- **Autenticación**: No requiere cambios, ya está correcta
- **Headers**: No requieren cambios, ya están correctos
- **Métodos HTTP**: No requieren cambios, ya están correctos
- **Parámetros de consulta**: No requieren cambios, ya están correctos
- **Estructura de datos enviados**: No requiere cambios, ya está correcta

---

## 🎯 13. Resultado Esperado

Después de implementar estos cambios, tu app debería:
- ✅ Conectarse correctamente con el backend
- ✅ Recibir datos en el formato correcto
- ✅ Manejar paginación correctamente
- ✅ Mostrar estadísticas de notificaciones correctamente
- ✅ Funcionar en modo online y offline
- ✅ Sincronizar datos correctamente

---

**¡Con estos cambios tu app funcionará perfectamente con el backend!** 🚀

