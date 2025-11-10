# 🔍 Endpoint de Búsqueda Agregado

## ✅ Cambios Realizados

Se ha agregado el endpoint de búsqueda de usuarios al backend V2.

---

## 📁 Archivos Creados/Modificados

### **Creado:**
1. `src/routes/search.routes.js` - Nueva ruta de búsqueda

### **Modificado:**
1. `src/index.js` - Ruta agregada al servidor

---

## 🚀 Endpoint Disponible

### **GET /api/buscar?q={query}**

**Autenticación:** Requiere token Bearer

**Query Parameters:**
- `q` (string, required) - Término de búsqueda (mínimo 2 caracteres)

**Respuesta Exitosa (200):**
```json
{
  "exito": true,
  "resultados": {
    "usuarios": [
      {
        "_id": "64abc123...",
        "nombre": "Juan",
        "apellido": "Pérez",
        "email": "juan@example.com",
        "avatar": "/uploads/avatars/...",
        "rol": "usuario",
        "ciudad": "Buenos Aires"
      }
    ]
  }
}
```

**Búsqueda Vacía (200):**
```json
{
  "exito": true,
  "resultados": {
    "usuarios": []
  }
}
```

**Error (500):**
```json
{
  "exito": false,
  "mensaje": "Error en la búsqueda",
  "error": "Mensaje de error..."
}
```

---

## 🔍 Características

- ✅ Busca por nombre (case-insensitive)
- ✅ Busca por apellido (case-insensitive)
- ✅ Busca por email (case-insensitive)
- ✅ Límite de 10 resultados
- ✅ Solo devuelve campos necesarios (no contraseña)
- ✅ Requiere mínimo 2 caracteres
- ✅ Protegido con verifyToken middleware

---

## 🧪 Probar el Endpoint

### **Con cURL:**
```bash
curl -X GET "http://localhost:3001/api/buscar?q=juan" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### **Con Postman:**
1. Method: GET
2. URL: `http://localhost:3001/api/buscar?q=juan`
3. Headers:
   - Authorization: `Bearer YOUR_TOKEN_HERE`

### **Desde el Frontend:**
El SearchBar ya está configurado para usar este endpoint automáticamente.

---

## ⚠️ Importante

**DEBES REINICIAR EL SERVIDOR BACKEND** para que los cambios surtan efecto:

```bash
# Detener el servidor (Ctrl+C si está corriendo)
# Luego reiniciarlo
npm run dev
# o
node src/index.js
```

---

## 📊 Campos del Modelo Usuario

El endpoint devuelve estos campos del modelo Usuario:
- `_id` - ID del usuario
- `nombre` - Primer nombre
- `apellido` - Primer apellido
- `email` - Correo electrónico
- `avatar` - URL del avatar
- `rol` - Rol del usuario (usuario, admin, etc.)
- `ciudad` - Ciudad del usuario (opcional)

**NO devuelve:**
- `password` (por seguridad)
- Otros campos sensibles

---

## 🔐 Seguridad

- ✅ Requiere autenticación con JWT token
- ✅ No expone información sensible
- ✅ Validación de entrada (mínimo 2 caracteres)
- ✅ Límite de resultados (10 máximo)
- ✅ Regex con flag 'i' (case-insensitive pero seguro)

---

**Fecha:** 6 de Noviembre, 2025
**Versión:** 2.1.0
**Estado:** ✅ Completado
