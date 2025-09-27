# 🔧 Pasos para Solucionar el Proxy de Next.js

## 📋 Resumen del Problema

El proxy de Next.js está duplicando el prefijo `/api` en las URLs, causando errores 400 en las peticiones a medicamentos, tratamientos y citas.

## 🎯 Problema Identificado

### **Código Problemático:**
```typescript
const targetUrl = `${BACKEND_CONFIG.BASE_URL}/api/${apiPath}`;
```

### **Resultado:**
- Si `BACKEND_CONFIG.BASE_URL` = `https://www.recuerdamed.org/api`
- Y `apiPath` = `medications`
- Entonces `targetUrl` = `https://www.recuerdamed.org/api/api/medications` ← **Duplicado**

## 🔧 Soluciones

### **Paso 1: Verificar la Configuración**

Primero, verifica cómo está definido `BACKEND_CONFIG.BASE_URL` en tu archivo `@/lib/config`:

```typescript
// Busca en tu archivo de configuración:
export const BACKEND_CONFIG = {
  BASE_URL: 'https://www.recuerdamed.org/api' // ← ¿Ya incluye /api?
  // O
  BASE_URL: 'https://www.recuerdamed.org'      // ← ¿No incluye /api?
};
```

### **Paso 2: Aplicar la Solución Correcta**

#### **Opción A: Si BASE_URL ya incluye `/api`**
```typescript
// Cambia esta línea en tu proxy:
const targetUrl = `${BACKEND_CONFIG.BASE_URL}/api/${apiPath}`;

// Por esta:
const targetUrl = `${BACKEND_CONFIG.BASE_URL}/${apiPath}`;
```

#### **Opción B: Si BASE_URL NO incluye `/api`**
```typescript
// Mantén la línea actual:
const targetUrl = `${BACKEND_CONFIG.BASE_URL}/api/${apiPath}`;
```

#### **Opción C: Detección Automática (Recomendado)**
```typescript
// Reemplaza la línea problemática por:
const baseUrl = BACKEND_CONFIG.BASE_URL.endsWith('/api') 
  ? BACKEND_CONFIG.BASE_URL 
  : `${BACKEND_CONFIG.BASE_URL}/api`;
const targetUrl = `${baseUrl}/${apiPath}`;
```

### **Paso 3: Código Completo Corregido**

```typescript
async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const apiPath = pathSegments.join('/');
    
    // ✅ SOLUCIÓN: Detección automática del prefijo
    const baseUrl = BACKEND_CONFIG.BASE_URL.endsWith('/api') 
      ? BACKEND_CONFIG.BASE_URL 
      : `${BACKEND_CONFIG.BASE_URL}/api`;
    const targetUrl = `${baseUrl}/${apiPath}`;
    
    console.log(`[PROXY] ${method} ${apiPath} -> ${targetUrl}`);
    
    // ... resto del código sin cambios
  } catch (error) {
    // ... manejo de errores sin cambios
  }
}
```

## 🧪 Verificación

### **Antes del Fix:**
```
LOG [PROXY] GET medications -> https://www.recuerdamed.org/api/api/medications
LOG [PROXY] Response status: 400 Bad Request
```

### **Después del Fix:**
```
LOG [PROXY] GET medications -> https://www.recuerdamed.org/api/medications
LOG [PROXY] Response status: 200 OK
```

## 🚀 Pasos de Implementación

### **1. Abrir el archivo del proxy**
- Ubica tu archivo de proxy de Next.js (probablemente en `app/api/[...path]/route.ts`)

### **2. Localizar la línea problemática**
- Busca: `const targetUrl = \`${BACKEND_CONFIG.BASE_URL}/api/${apiPath}\`;`

### **3. Aplicar la solución**
- Reemplaza por la **Opción C** (detección automática)

### **4. Guardar y probar**
- Guarda el archivo
- Reinicia tu aplicación Next.js
- Prueba crear/obtener medicamentos

### **5. Verificar logs**
- Revisa los logs del proxy para confirmar que las URLs son correctas

## 📝 Checklist de Verificación

- [ ] Verificar configuración de `BACKEND_CONFIG.BASE_URL`
- [ ] Aplicar la solución correcta según la configuración
- [ ] Guardar el archivo del proxy
- [ ] Reiniciar la aplicación Next.js
- [ ] Probar endpoint de medicamentos
- [ ] Verificar logs del proxy
- [ ] Confirmar que las URLs no tienen `/api` duplicado
- [ ] Probar otros endpoints (tratamientos, citas)

## 🎯 Resultado Esperado

Una vez aplicado el fix, deberías ver:

```
LOG [useMedications] ✅ Medicamentos obtenidos exitosamente: 2 items
LOG [useMedications] ✅ Medicamento creado exitosamente
LOG [useTreatments] ✅ Tratamientos obtenidos exitosamente
LOG [useAppointments] ✅ Citas obtenidas exitosamente
```

## 🔍 Troubleshooting

### **Si sigues viendo errores 400:**
1. Verifica que `BACKEND_CONFIG.BASE_URL` esté correctamente configurado
2. Revisa los logs del proxy para confirmar la URL construida
3. Prueba directamente con el backend: `curl -X GET "http://72.60.30.129:3001/api/medications?patientProfileId=cmff28z53000bjxvg0z4smal1"`

### **Si ves errores 500:**
1. Verifica que el backend esté funcionando
2. Revisa los logs del backend en el VPS
3. Confirma que el `patientProfileId` sea correcto

### **Si el proxy transforma patientProfileId a número:**
1. Revisa los logs del proxy para ver el body original
2. Verifica que no haya middleware que transforme los datos
3. Usa backend directo temporalmente: `http://72.60.30.129:3001/api`
4. Agrega logs de debug en el proxy para identificar la transformación

## 📞 Soporte

Si tienes problemas con la implementación:
1. Comparte los logs del proxy
2. Muestra la configuración de `BACKEND_CONFIG.BASE_URL`
3. Verifica que el backend funcione directamente

---

**Fecha de creación:** 11 de Septiembre, 2025  
**Estado:** Listo para implementación
