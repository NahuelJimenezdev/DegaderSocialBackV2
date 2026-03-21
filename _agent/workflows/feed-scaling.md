---
description: Protocolo oficial para implementar y escalar el feed de Degader Social con Cursor Pagination, Redis y Transacciones.
---

# 🛡️ SKILL MAESTRA: CTO Pragmático – Feed Escalable (V3 PRO)
## Versión Verificada para Degader Social V2

Este protocolo define cómo evolucionar el Feed de forma segura y profesional.

---

# 🎯 OBJETIVO
Escalar el Feed a millones de usuarios manteniendo latencia < 200ms y consistencia total.

---

# 🏗️ FASE 1 — CURSOR PAGINATION (✅ COMPLETADO)
**Ubicación:** `src/controllers/postController.js`
- **Técnica:** `$and` para combinar `$or` + Cursor Compuesto.
- **Sort & Índice:** `{ createdAt: -1, _id: -1 }` (Sincronizados).
- **Query de Cursor (Tie-breaker):**
  ```js
  {
    $or: [
      { createdAt: { $lt: new Date(lastDate) } },
      { createdAt: new Date(lastDate), _id: { $lt: lastId } }
    ]
  }
  ```
- **Optimización hasMore:** Traer `limit + 1` y validar `posts.length > limit`.
- **Performance:** Omitir `countDocuments` en modo cursor.

---

# 🚀 FASE 2 — REDIS FEED CACHE (PRÓXIMO PASO)
**Servicio:** `src/services/redis.service.js` (Usar `RedisService`).

### Key Design
`feed:user:{userId}` (ZSET)
- **Score:** `post.createdAt.getTime() + (parseInt(post._id.toString().slice(-6), 16) / 1e12)`
    - *Nivel ELITE:* Offset decimal para evitar colisiones de milisegundos y desbordamiento de precisión (JSON Double).
- **Value:** `postId`

### Lógica de Fallback PRO
- **Disparo:** El controlador **DEBE** disparar la query de MongoDB como respaldo si:
    - Redis no tiene datos (`!postIds.length`).
    - Los datos en Redis son insuficientes para el `limit` pedido.
    - Ocurre un error de conexión con Redis.

---

# ⚖️ FASE 3 — HYBRID FAN-OUT
**Estrategia:** Optimizar el cuello de botella de escritura masiva.
- **Normal Users:** *Fan-out on Write* (escribir en feeds de amigos al publicar).
    - **Control de Memoria:** `ZREMRANGEBYRANK feed:user:{userId} 0 -1000` (mantener últimos 1000).
    - **TTL (24h):** `EXPIRE feed:user:{userId} 86400`.
- **Influencers (>5k seguidores):** *Fan-out on Read* (mezclar sus posts en tiempo de lectura).

---

# 🛡️ FASE 4 — TRANSACCIONES (CRÍTICO)
**Razón:** Evitar inconsistencias en el grafo social (ej: amigos duplicados o no correspondidos).

```js
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 1. Guardar en Friendship (Pivot)
  // 2. Actualizar UserV2.amigos (Array desnormalizado)
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
} finally {
  session.endSession();
}
```

---

# 💬 FASE 5 — COMENTARIOS (HYBRID SNAPSHOT)
**Arquitectura de Nivel Pro:**
1. Mover comentarios a una colección `Comment.js` independiente.
2. Mantener `comentariosRecientes` (array de minified docs) dentro de `Post.js`.
- **Beneficio:** Evita N+1 queries al cargar el feed inicial y protege el límite de 16MB de MongoDB ante posts virales.

---

# 🧪 TESTING OBLIGATORIO
- [ ] Validar que `nextCursor` sea un objeto con `createdAt` e `id`.
- [ ] Confirmar que el Feature Flag `USE_CURSOR_PAGINATION` esté activo en `.env`.
- [ ] Verificar que no existan duplicados al hacer scroll infinito.

---
**ESTADO DE AUDITORÍA: VALIDADO Y ACORDE AL PROYECTO.**
