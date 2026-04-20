# Estado de Funcionalidad de Búsqueda - Backend V2

**Fecha: 6 de Noviembre, 2025**
**Versión: 1.0.0**

**Fecha:** 20 de Abril, 2026
**Versión:** 2.1.0 (Actualización de Privacidad y Seguridad)
**Estado:** ✅ COMPLETADO Y OPTIMIZADO

---

> [!TIP]
> ### 💡 RECOMENDACIONES PARA JUNIORS
> * **Privacidad ante todo:** Siempre que busques usuarios, debes excluir los IDs de quienes han bloqueado al solicitante. Esto se hace consultando la colección `Friendship` antes de la búsqueda.
> * **Regex 'i':** Usamos `$options: 'i'` para que la búsqueda ignore mayúsculas y minúsculas (ej: "Juan" encontrará a "juan").
> * **Campos Anidados:** El modelo actual usa `nombres.primero` en lugar de un solo campo `nombre`. Asegúrate de usar la notación de punto (`'nombres.primero'`) en tus consultas de MongoDB.
> * **Performance:** Siempre usa `.select()` para traer solo los campos necesarios (Nombre, Avatar, Rol). Nunca traigas el objeto de usuario completo por seguridad y rapidez.

---

## ✅ Cambios Implementados (Realidad Técnica)

### 1. Endpoint Inteligente `/api/buscar`
* **Ruta:** `GET /api/buscar?q={query}`
* **Seguridad:** Protegida por el middleware `authenticate`.
* **Lógica de Privacidad (NUEVO):** 
    1. El sistema busca primero en la colección de amistades.
    2. Identifica si hay bloqueos mutuos entre el buscador y otros usuarios.
    3. Excluye automáticamente a esos usuarios de los resultados.
* **Exclusión de Perfil Propio:** Ya no apareces en tus propios resultados de búsqueda.

### 2. Estructura de Búsqueda Multiparámetro
Ahora el buscador es mucho más "inteligente" y busca coincidencias en:
* `nombres.primero`
* `nombres.segundo`
* `apellidos.primero`
* `apellidos.segundo`
* `email`

---

## 📊 Estructura de Respuesta (JSON)
El frontend recibirá un objeto con esta estructura:

```json
{
  "exito": true,
  "resultados": {
    "usuarios": [
      {
        "_id": "65432...",
        "nombres": { "primero": "Juan", "segundo": "Carlos" },
        "apellidos": { "primero": "Pérez", "segundo": "" },
        "social": { "fotoPerfil": "url_imagen..." },
        "seguridad": { "rolSistema": "Miembro" }
      }
    ]
  }
}
```

---

## 🔐 Seguridad y Socket.IO
* **Confirmación:** Socket.IO está **plenamente configurado**. Ya no se utiliza polling para las notificaciones globales, lo cual optimiza la carga del servidor.
* **Validación de Datos:** Se requiere un mínimo de **2 caracteres** para iniciar la búsqueda, evitando sobrecargar la base de datos con consultas demasiado amplias (ej: buscar solo por la letra "a").

---

## 🚀 Próximas Mejoras (Roadmap)
1. **Total Count:** Implementar el campo `total` en la respuesta para que el frontend pueda mostrar "Se encontraron 15 resultados".
2. **Paginación:** Si la comunidad crece, deberemos añadir `page` y `limit` dinámicos (actualmente fijos en 10).
3. **Búsqueda por Cargo:** Permitir filtrar usuarios por su nivel en la fundación (ej: buscar solo "Pastores" o "Secretarios").

---

## 🧪 Cómo Probar (Para desarrolladores)
1. Asegúrate de tener al menos dos usuarios en tu DB local.
2. Crea una "amistad" entre ellos con `estado: 'bloqueada'`.
3. Intenta buscar al usuario bloqueado desde la cuenta del otro; **no debería aparecer**.
4. Borra el bloqueo y repite la búsqueda; **ahora sí debería aparecer**.

---

**Actualizado por:** Antigravity AI
**Referencia de Código:** `src/routes/search.routes.js`
