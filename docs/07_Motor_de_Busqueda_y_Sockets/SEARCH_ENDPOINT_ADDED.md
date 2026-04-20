# 🔍 Endpoint de Búsqueda Agregado

**Fecha: 6 de Noviembre, 2025**
**Versión: 1.0.0**

**Fecha:** 20 de Abril, 2026
**Versión: 2.1.0** (Actualización de Seguridad y Query)
**Estado:** ✅ COMPLETADO Y DOCUMENTADO

---

> [!TIP]
> ### 💡 RECOMENDACIONES TÉCNICAS (API DESIGN)
> * **Proyección de campos:** Nunca uses `Usuario.find({})` sin un `.select()`. En búsquedas masivas, optimiza la respuesta devolviendo solo lo necesario para el dropdown del frontend.
> * **Manejo de Bloqueos:** El endpoint ahora es "consciente de la privacidad". Antes de ejecutar el `find`, realiza una consulta a la colección `Friendship`. Si un Junior añade un filtro nuevo, debe recordar incluirlo en el objeto `$and` final para no romper la lógica de exclusión.
> * **Validación de query:** Se mantiene la regla de mínimo 2 caracteres para evitar colapsar el hilo de Node.js con búsquedas demasiado pesadas.

---

## 🚀 Endpoint Disponible (V2.1)

### **GET /api/buscar?q={query}**

**Autenticación:** Requiere token Bearer (Middleware `authenticate`)

**Características Técnicas:**
- **Límite:** 10 resultados (Hardcoded por ahora).
- **Lógica de Privacidad:** Excluye al usuario logueado (`$ne`) y a todos los usuarios con los que exista un vínculo de `estado: 'bloqueada'` (`$nin`).

---

## 📊 Estructura de Respuesta Actualizada

La respuesta ha cambiado para adaptarse al **Modelo de Usuario V2** (Campos anidados):

```json
{
  "exito": true,
  "resultados": {
    "usuarios": [
      {
        "_id": "64abc123...",
        "nombres": {
          "primero": "Juan",
          "segundo": "Carlos"
        },
        "apellidos": {
          "primero": "Pérez",
          "segundo": ""
        },
        "email": "juan@example.com",
        "social": {
          "fotoPerfil": "/uploads/avatars/..."
        },
        "seguridad": {
          "rolSistema": "Miembro"
        },
        "personal": {
          "ubicacion": { "ciudad": "Cúcuta" }
        }
      }
    ]
  }
}
```

---

## 📁 Archivos Relacionados
1.  `src/routes/search.routes.js`: Contiene la lógica del controlador y la integración con el modelo de amistades.
2.  `src/models/User.model.js`: Esquema de datos donde se definen los campos anidados.
3.  `src/models/Friendship.model.js`: Usado para filtrar usuarios bloqueados.

---

## 🧪 Pruebas de Integración (Postman/Insomnia)
Para probar este endpoint, asegúrate de incluir el Header de autorización:

```http
GET /api/buscar?q=perez
Authorization: Bearer <TU_TOKEN_JWT>
```

**Resultado esperado:** Una lista de usuarios cuyas propiedades `nombres` o `apellidos` (primeros o segundos) contengan "perez", excluyéndote a ti y a tus bloqueados.

---

**Actualizado por:** Antigravity AI
**Referencia de Código:** `src/routes/search.routes.js`
