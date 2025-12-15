# Documentación del Módulo de Iglesias

Este documento detalla el funcionamiento técnico del módulo de Iglesias, enfocándose en el flujo de miembros, solicitudes y notificaciones en tiempo real.

## 1. Gestión de Solicitudes de Unión

El flujo para unirse a una iglesia involucra Socket.IO para notificaciones en tiempo real tanto para el pastor (al recibir la solicitud) como para el usuario (al ser aceptado/rechazado).

### Flujo de Solicitud (Usuario -> Pastor)

1.  **Endpoint:** `POST /api/iglesias/unirse`
2.  **Acción:** El usuario solicita unirse.
3.  **Notificación creada:**
    *   **Tipo:** `solicitud_iglesia`
    *   **Receptor:** Pastor Principal
    *   **Metadata:** `{ iglesiaNombre, solicitanteId }`
4.  **Eventos Socket.IO emitidos:**
    *   `nuevaSolicitudIglesia`: Enviado al pastor a la sala `user:{pastorId}`. Usado por la vista `IglesiaMembers.jsx`.
    *   `newNotification`: Enviado al pastor a la sala `notifications:{pastorId}`. Usado por `NotificationsDropdown.jsx` para la campanita.

### Flujo de Respuesta (Pastor -> Usuario)

1.  **Endpoint:** `POST /api/iglesias/:id/solicitudes/:userId`
2.  **Acción:** El pastor aprueba o rechaza (`accion: 'aprobar' | 'rechazar'`).
3.  **Notificación creada:**
    *   **Tipo:** `solicitud_iglesia_aprobada` o `solicitud_iglesia_rechazada`
    *   **Receptor:** Usuario Solicitante
    *   **Metadata:** `{ iglesiaNombre, iglesiaLogo, accion }` (Incluye `iglesiaLogo` para mostrar en la notificación).
4.  **Eventos Socket.IO emitidos:**
    *   `solicitudIglesiaAprobada`, `solicitudIglesiaRechazada`: Enviado al usuario (`user:{userId}`).
    *   `solicitudIglesiaProcesada`: Enviado al pastor (`user:{pastorId}`).
    *   `newNotification`: Enviado al usuario (`notifications:{userId}`). Permite ver la respuesta en la campanita en tiempo real.

## 2. Configuración de Salas (Socket Rooms)

Es vital que el backend emita a las salas correctas:
*   **Eventos de Datos (Miembros, Chats, etc):** Sala `user:{userId}`. El socket se une a esta sala automáticamente en `socketService.js` -> `handleAuthenticate`.
*   **Eventos de Notificación (Campanita):** Sala `notifications:{userId}`. El frontend (`NotificationsDropdown.jsx`) se suscribe explícitamente a esta sala.

Las notificaciones de iglesia requieren campos específicos en `metadata` para funcionar correctamente en el frontend (`IglesiaNotificationCard.jsx`).

```javascript
// Ejemplo de Notificación de Respuesta
{
  tipo: "solicitud_iglesia_aprobada", // o solicitur_iglesia_rechazada
  referencia: {
    tipo: "Iglesia",
    id: "ID_IGLESIA"
  },
  metadata: {
    iglesiaNombre: "Nombre Iglesia",
    iglesiaLogo: "/uploads/iglesias/logo.jpg", // ✅ CRÍTICO: Necesario para mostrar el logo en vez del avatar del pastor
    accion: "aprobar"
  },
  contenido: "¡Felicidades! Has sido aceptado..." // ✅ Mensaje amigable generado por backend
}
```

## 3. Componentes Frontend Clave

### `IglesiaMembers.jsx`
*   Escucha `nuevaSolicitudIglesia` para agregar solicitudes entrantes sin recargar.
*   Escucha `solicitudIglesiaProcesada` para quitar solicitudes que ya fueron aceptadas/rechazadas desde otro lugar (ej. notificaciones).
*   **Nota:** Compara siempre los IDs como String (`String(data.iglesiaId) === String(iglesiaData._id)`) para evitar errores de tipo.

### `IglesiaNotificationCard.jsx`
*   Renderiza las notificaciones de iglesia.
*   Usa `metadata.iglesiaLogo` si es una respuesta (Aprobada/Rechazada), o el avatar del solicitante si es una solicitud.
*   Muestra el mensaje `contenido` enviado por el backend si existe, para evitar textos hardcodeados incorrectos.

### `NotificationsDropdown.jsx`
*   Maneja la navegación al hacer click.
*   **Borrado Automático:** Las notificaciones de tipo informativo (`solicitud_iglesia_aprobada`, `rechazada`) se **ELIMINAN** de la base de datos al hacer click (`handleProfileClick`), redirigiendo al usuario a la iglesia y limpiando la lista.

## 4. Solución de Problemas Comunes (Troubleshooting)

### Error 1: "No veo la notificación en tiempo real en la campanita"
*   **Causa:** El backend no estaba emitiendo el evento `newNotification` al crear la solicitud, solo `nuevaSolicitudIglesia` (que solo escucha `IglesiaMembers`).
*   **Solución:** Asegurar que `iglesiaController.js` emita `newNotification` después de `Notification.create`.

### Error 2: "El usuario ve 'Usuario desea unirse' en lugar de 'Fuiste rechazado'"
*   **Causa:** El componente `IglesiaNotificationCard.jsx` ignoraba el campo `contenido` y construía el mensaje manualmente hardcodeado.
*   **Solución:** Actualizar `IglesiaNotificationCard.jsx` para priorizar `notification.contenido`.

### Error 3: "Al hacer click la notificación no desaparece"
*   **Causa:** Solo se marcaba como leída.
*   **Solución:** Modificar `handleProfileClick` en `NotificationsDropdown.jsx` para llamar a `deleteNotification` para tipos de notificación desechables.

### Error 4: "La imagen de la notificación de rechazo es la del pastor, no la de la iglesia"
*   **Causa:** Se usaba `emisor` (el pastor) para el avatar.
*   **Solución:** Agregar `iglesiaLogo` al metadata en el backend y usarlo condicionalmente en el frontend.

## 5. Nota sobre Sincronización de Estados
Para evitar conflictos de estado (ej. aceptar una solicitud que ya fue aceptada), el sistema implementa:
1.  **Frontend:** `NotificationsDropdown` escucha `solicitudIglesiaProcesada` y elimina visualmente la notificación si coincide con la iglesia y usuario procesado.
2.  **Backend:** Al procesar una solicitud (`accion: aprobar/rechazar`), se **elimina** la notificación original (`solicitud_iglesia`) de la base de datos para que no vuelva a aparecer al recargar.
