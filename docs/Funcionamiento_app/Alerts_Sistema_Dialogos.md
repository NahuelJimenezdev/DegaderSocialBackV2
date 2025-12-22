# Documentación de Alerts Migrados - Sistema de Diálogos Personalizados

## 📋 Resumen General

Este documento detalla todos los **77 alerts** que fueron migrados de `window.alert()` y `window.confirm()` nativos a componentes personalizados `AlertDialog` y `ConfirmDialog` en la aplicación Degader Social.

**Fecha de migración:** Diciembre 2024  
**Total de alerts migrados:** 77 (70 AlertDialog + 7 ConfirmDialog)  
**Archivos modificados:** 18  
**Módulos afectados:** 8

---

## 🎨 Componentes Utilizados

### AlertDialog
**Ubicación:** `src/shared/components/AlertDialog/AlertDialog.jsx`

**Variantes disponibles:**
- `success` (verde) - Operaciones exitosas
- `error` (rojo) - Errores y fallos
- `warning` (naranja) - Advertencias
- `info` (azul) - Información general

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: function,
  variant: 'success' | 'error' | 'warning' | 'info',
  message: string,
  title?: string,
  buttonText?: string
}
```

### ConfirmDialog
**Ubicación:** `src/shared/components/ConfirmDialog/ConfirmDialog.jsx`

**Variantes disponibles:**
- `danger` (rojo) - Acciones destructivas
- `warning` (naranja) - Acciones de precaución
- `info` (azul) - Confirmaciones informativas

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: function,
  onConfirm: function,
  variant: 'danger' | 'warning' | 'info',
  title: string,
  message: string,
  confirmText?: string,
  cancelText?: string
}
```

---

## 📦 Módulo 1: GRUPOS (27 alerts)

### 1.1 GroupMembers.jsx (9 alerts)
**Ubicación:** `src/features/grupos/components/GroupMembers.jsx`

#### Alert 1: Error al aprobar solicitud
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al aprobar solicitud de ingreso al grupo
- **Mensaje:** "Error al aprobar la solicitud"
- **Cuándo aparece:** Cuando falla la petición API para aprobar una solicitud

#### Alert 2: Error al rechazar solicitud
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al rechazar solicitud de ingreso
- **Mensaje:** "Error al rechazar la solicitud"
- **Cuándo aparece:** Cuando falla la petición API para rechazar

#### Alert 3: Solicitud aprobada
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Solicitud aprobada exitosamente
- **Mensaje:** "Solicitud aprobada exitosamente"
- **Cuándo aparece:** Después de aprobar una solicitud correctamente

#### Alert 4: Solicitud rechazada
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Solicitud rechazada exitosamente
- **Mensaje:** "Solicitud rechazada"
- **Cuándo aparece:** Después de rechazar una solicitud correctamente

#### Alert 5: Error al cambiar rol
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al cambiar el rol de un miembro
- **Mensaje:** "Error al cambiar el rol del miembro"
- **Cuándo aparece:** Cuando falla la petición para cambiar rol

#### Alert 6: Rol actualizado
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Rol cambiado exitosamente
- **Mensaje:** "Rol actualizado exitosamente"
- **Cuándo aparece:** Después de cambiar el rol correctamente

#### Alert 7: Error al eliminar miembro
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al eliminar un miembro del grupo
- **Mensaje:** "Error al eliminar el miembro"
- **Cuándo aparece:** Cuando falla la petición para eliminar

#### Confirm 1: Transferir propiedad
- **Tipo:** ConfirmDialog
- **Variante:** warning
- **Trigger:** Usuario intenta transferir la propiedad del grupo
- **Título:** "Transferir Propiedad"
- **Mensaje:** "¿Estás seguro de transferir la propiedad a [nombre]? Perderás todos los privilegios de administrador."
- **Cuándo aparece:** Al hacer clic en "Transferir propiedad" en el menú de miembro

#### Confirm 2: Eliminar miembro
- **Tipo:** ConfirmDialog
- **Variante:** danger
- **Trigger:** Usuario intenta eliminar un miembro
- **Título:** "Eliminar Miembro"
- **Mensaje:** "¿Estás seguro de eliminar a [nombre] del grupo?"
- **Cuándo aparece:** Al hacer clic en "Eliminar" en el menú de miembro

### 1.2 GroupSettings.jsx (10 alerts)
**Ubicación:** `src/features/grupos/components/GroupSettings.jsx`

#### Alert 1: Cambios guardados
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Configuración del grupo guardada
- **Mensaje:** "Cambios guardados exitosamente"
- **Cuándo aparece:** Después de guardar configuración del grupo

#### Alert 2: Error al guardar
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al guardar configuración
- **Mensaje:** "Error al guardar los cambios"
- **Cuándo aparece:** Cuando falla la petición de actualización

#### Alert 3: Imagen actualizada
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Imagen del grupo actualizada
- **Mensaje:** "Imagen actualizada exitosamente"
- **Cuándo aparece:** Después de subir nueva imagen

#### Alert 4: Error al subir imagen
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al subir imagen
- **Mensaje:** "Error al actualizar la imagen"
- **Cuándo aparece:** Cuando falla la subida de imagen

#### Alert 5: Imagen eliminada
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Imagen del grupo eliminada
- **Mensaje:** "Imagen eliminada exitosamente"
- **Cuándo aparece:** Después de eliminar la imagen

#### Alert 6: Error al eliminar imagen
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al eliminar imagen
- **Mensaje:** "Error al eliminar la imagen"
- **Cuándo aparece:** Cuando falla la eliminación

#### Alert 7: Permisos actualizados
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Permisos del grupo actualizados
- **Mensaje:** "Permisos actualizados exitosamente"
- **Cuándo aparece:** Después de cambiar permisos

#### Alert 8: Error al actualizar permisos
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al actualizar permisos
- **Mensaje:** "Error al actualizar los permisos"
- **Cuándo aparece:** Cuando falla la actualización de permisos

#### Alert 9: Has salido del grupo
- **Tipo:** AlertDialog
- **Variante:** info
- **Trigger:** Usuario sale del grupo
- **Mensaje:** "Has salido del grupo exitosamente"
- **Cuándo aparece:** Después de salir del grupo

#### Alert 10: Error al salir
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al salir del grupo
- **Mensaje:** "Error al salir del grupo"
- **Cuándo aparece:** Cuando falla la petición para salir

### 1.3 useGroupChat.js (3 alerts)
**Ubicación:** `src/features/grupos/hooks/useGroupChat.js`

#### Alert 1: Error al enviar mensaje
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al enviar mensaje en el chat
- **Mensaje:** "Error al enviar el mensaje"
- **Cuándo aparece:** Cuando falla el envío de mensaje

#### Alert 2: Error al subir archivo
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al subir archivo en el chat
- **Mensaje:** "Error al subir el archivo"
- **Cuándo aparece:** Cuando falla la subida de archivo

#### Alert 3: Archivo demasiado grande
- **Tipo:** AlertDialog
- **Variante:** warning
- **Trigger:** Usuario intenta subir archivo >10MB
- **Mensaje:** "El archivo es demasiado grande. Máximo 10MB"
- **Cuándo aparece:** Al seleccionar un archivo que excede el límite

### 1.4 GruposPages.jsx (5 alerts)
**Ubicación:** `src/features/grupos/pages/GruposPages.jsx`

#### Alert 1: Solicitud enviada
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Solicitud para unirse al grupo enviada
- **Mensaje:** "Solicitud enviada exitosamente"
- **Cuándo aparece:** Después de enviar solicitud de ingreso

#### Alert 2: Error al enviar solicitud
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al enviar solicitud
- **Mensaje:** "Error al enviar la solicitud"
- **Cuándo aparece:** Cuando falla el envío de solicitud

#### Alert 3: Ya tienes solicitud pendiente
- **Tipo:** AlertDialog
- **Variante:** info
- **Trigger:** Usuario intenta unirse a grupo con solicitud pendiente
- **Mensaje:** "Ya tienes una solicitud pendiente para este grupo"
- **Cuándo aparece:** Al intentar unirse nuevamente

#### Alert 4: Grupo creado
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Grupo creado exitosamente
- **Mensaje:** "Grupo creado exitosamente"
- **Cuándo aparece:** Después de crear un nuevo grupo

#### Alert 5: Error al crear grupo
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al crear grupo
- **Mensaje:** "Error al crear el grupo"
- **Cuándo aparece:** Cuando falla la creación del grupo

---

## 📦 Módulo 2: MENSAJES (9 alerts)

### 2.1 useChatController.js (9 alerts)
**Ubicación:** `src/features/mensajes/hooks/useChatController.js`

#### Alert 1: Error al cargar mensajes
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al cargar mensajes del chat
- **Mensaje:** "Error al cargar los mensajes"
- **Cuándo aparece:** Cuando falla la carga inicial de mensajes

#### Alert 2: Error al enviar mensaje
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al enviar mensaje
- **Mensaje:** "Error al enviar el mensaje"
- **Cuándo aparece:** Cuando falla el envío

#### Alert 3: Error al eliminar mensaje
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al eliminar mensaje
- **Mensaje:** "Error al eliminar el mensaje"
- **Cuándo aparece:** Cuando falla la eliminación

#### Alert 4: Error al editar mensaje
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al editar mensaje
- **Mensaje:** "Error al editar el mensaje"
- **Cuándo aparece:** Cuando falla la edición

#### Alert 5: Archivo demasiado grande
- **Tipo:** AlertDialog
- **Variante:** warning
- **Trigger:** Usuario intenta subir archivo >10MB
- **Mensaje:** "El archivo es demasiado grande. Máximo 10MB"
- **Cuándo aparece:** Al seleccionar archivo que excede límite

#### Alert 6: Error al subir archivo
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al subir archivo
- **Mensaje:** "Error al subir el archivo"
- **Cuándo aparece:** Cuando falla la subida

#### Alert 7: Error al eliminar chat
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al eliminar conversación
- **Mensaje:** "Error al eliminar el chat"
- **Cuándo aparece:** Cuando falla la eliminación del chat

#### Alert 8: Error al bloquear usuario
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al bloquear usuario
- **Mensaje:** "Error al bloquear el usuario"
- **Cuándo aparece:** Cuando falla el bloqueo

#### Alert 9: Error al silenciar chat
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al silenciar conversación
- **Mensaje:** "Error al silenciar el chat"
- **Cuándo aparece:** Cuando falla la acción de silenciar

---

## 📦 Módulo 3: CARPETAS (11 alerts)

### 3.1 useCarpetas.js (3 alerts)
**Ubicación:** `src/features/carpetas/hooks/useCarpetas.js`

#### Alert 1: Archivo demasiado grande
- **Tipo:** AlertDialog
- **Variante:** warning
- **Trigger:** Usuario intenta subir archivo >20MB
- **Mensaje:** "El archivo es demasiado grande. Máximo 20MB"
- **Cuándo aparece:** Al seleccionar archivo que excede límite

#### Confirm 1: Eliminar carpeta
- **Tipo:** ConfirmDialog
- **Variante:** danger
- **Trigger:** Usuario intenta eliminar carpeta
- **Título:** "Eliminar Carpeta"
- **Mensaje:** "¿Estás seguro de eliminar esta carpeta? Se eliminarán todos los archivos contenidos."
- **Cuándo aparece:** Al hacer clic en eliminar carpeta

#### Confirm 2: Eliminar archivo
- **Tipo:** ConfirmDialog
- **Variante:** danger
- **Trigger:** Usuario intenta eliminar archivo
- **Título:** "Eliminar Archivo"
- **Mensaje:** "¿Estás seguro de eliminar este archivo?"
- **Cuándo aparece:** Al hacer clic en eliminar archivo

### 3.2 FolderDetailAdvanced.jsx (4 alerts)
**Ubicación:** `src/features/carpetas/pages/FolderDetailAdvanced.jsx`

#### Alert 1: Error al subir archivo
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al subir archivo a carpeta
- **Mensaje:** "Error al subir el archivo"
- **Cuándo aparece:** Cuando falla la subida

#### Alert 2: Archivo demasiado grande
- **Tipo:** AlertDialog
- **Variante:** warning
- **Trigger:** Archivo excede 20MB
- **Mensaje:** "El archivo es demasiado grande. Máximo 20MB"
- **Cuándo aparece:** Al seleccionar archivo grande

#### Alert 3: Error al eliminar archivo
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al eliminar archivo
- **Mensaje:** "Error al eliminar el archivo"
- **Cuándo aparece:** Cuando falla la eliminación

#### Confirm 1: Eliminar archivo
- **Tipo:** ConfirmDialog
- **Variante:** danger
- **Trigger:** Usuario intenta eliminar archivo
- **Título:** "Eliminar Archivo"
- **Mensaje:** "¿Estás seguro de eliminar este archivo?"
- **Cuándo aparece:** Al hacer clic en eliminar

### 3.3 CarpetaDetalle.jsx (4 alerts)
**Ubicación:** `src/features/carpetas/pages/CarpetaDetalle.jsx`

#### Alert 1: Error al subir archivo
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al subir archivo
- **Mensaje:** "Error al subir el archivo"
- **Cuándo aparece:** Cuando falla la subida

#### Alert 2: Archivo demasiado grande
- **Tipo:** AlertDialog
- **Variante:** warning
- **Trigger:** Archivo excede 20MB
- **Mensaje:** "El archivo es demasiado grande. Máximo 20MB"
- **Cuándo aparece:** Al seleccionar archivo grande

#### Alert 3: Error al eliminar archivo
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al eliminar archivo
- **Mensaje:** "Error al eliminar el archivo"
- **Cuándo aparece:** Cuando falla la eliminación

#### Confirm 1: Eliminar archivo
- **Tipo:** ConfirmDialog
- **Variante:** danger
- **Trigger:** Usuario intenta eliminar archivo
- **Título:** "Eliminar Archivo"
- **Mensaje:** "¿Estás seguro de eliminar este archivo?"
- **Cuándo aparece:** Al hacer clic en eliminar

---

## 📦 Módulo 4: IGLESIAS (7 alerts)

### 4.1 IglesiaPage.jsx (2 alerts)
**Ubicación:** `src/features/iglesias/pages/IglesiaPage.jsx`

#### Alert 1: Solicitud enviada
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Solicitud para unirse a iglesia enviada
- **Mensaje:** "Solicitud enviada al pastor exitosamente"
- **Cuándo aparece:** Después de enviar solicitud

#### Alert 2: Error al unirse
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al enviar solicitud
- **Mensaje:** "Error al unirse a la iglesia"
- **Cuándo aparece:** Cuando falla el envío

### 4.2 IglesiaSettings.jsx (2 alerts)
**Ubicación:** `src/features/iglesias/components/IglesiaSettings.jsx`

#### Alert 1: Cambios guardados
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Configuración guardada
- **Mensaje:** "Cambios guardados exitosamente"
- **Cuándo aparece:** Después de guardar configuración

#### Alert 2: Error al guardar
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al guardar
- **Mensaje:** "Error al guardar los cambios"
- **Cuándo aparece:** Cuando falla la actualización

### 4.3 IglesiaMembers.jsx (2 alerts)
**Ubicación:** `src/features/iglesias/components/IglesiaMembers.jsx`

#### Alert 1: Error al aprobar solicitud
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al aprobar solicitud
- **Mensaje:** "Error al aprobar la solicitud"
- **Cuándo aparece:** Cuando falla la aprobación

#### Alert 2: Error al rechazar solicitud
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al rechazar solicitud
- **Mensaje:** "Error al rechazar la solicitud"
- **Cuándo aparece:** Cuando falla el rechazo

### 4.4 IglesiaChat.jsx (1 alert)
**Ubicación:** `src/features/iglesias/components/IglesiaChat.jsx`

#### Alert 1: Error al enviar mensaje
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al enviar mensaje
- **Mensaje:** "Error al enviar el mensaje"
- **Cuándo aparece:** Cuando falla el envío

---

## 📦 Módulo 5: FEED (5 alerts)

### 5.1 ShareModal.jsx (5 alerts)
**Ubicación:** `src/features/feed/components/ShareModal.jsx`

#### Alert 1: Enlace copiado (usuario)
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Enlace copiado para enviar a usuario
- **Mensaje:** "¡Enlace copiado al portapapeles!\n\nAhora puedes enviarlo a tu amigo por mensaje privado."
- **Cuándo aparece:** Al compartir con usuario

#### Alert 2: Error al copiar
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al copiar enlace
- **Mensaje:** "Error al copiar enlace. Por favor intenta de nuevo."
- **Cuándo aparece:** Cuando falla la copia

#### Alert 3: Compartido en grupo
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Publicación compartida en grupo
- **Mensaje:** "¡Publicación compartida en el grupo!"
- **Cuándo aparece:** Después de compartir exitosamente

#### Alert 4: Error al compartir
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al compartir en grupo
- **Mensaje:** "Error al compartir. Intenta de nuevo."
- **Cuándo aparece:** Cuando falla el compartir

#### Alert 5: Enlace copiado (directo)
- **Tipo:** AlertDialog
- **Variante:** success
- **Trigger:** Enlace copiado directamente
- **Mensaje:** "¡Enlace copiado al portapapeles!"
- **Cuándo aparece:** Al copiar enlace directo

---

## 📦 Módulo 6: NOTIFICACIONES (3 alerts)

### 6.1 NotificationsDropdown.jsx (3 alerts)
**Ubicación:** `src/features/notificaciones/components/NotificationsDropdown.jsx`

#### Alert 1: Notificación no procesable
- **Tipo:** AlertDialog
- **Variante:** warning
- **Trigger:** Notificación no se puede procesar como solicitud
- **Mensaje:** "Esta notificación no se puede procesar como solicitud entrante."
- **Cuándo aparece:** Al intentar aceptar notificación incorrecta

#### Alert 2: Error al aceptar
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al aceptar solicitud
- **Mensaje:** "Error al aceptar la solicitud"
- **Cuándo aparece:** Cuando falla la aceptación

#### Alert 3: Error al rechazar
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al rechazar solicitud
- **Mensaje:** "Error al rechazar la solicitud"
- **Cuándo aparece:** Cuando falla el rechazo

---

## 📦 Módulo 7: AMISTADES/AMIGOS (6 alerts)

### 7.1 useAmistad.js (2 alerts)
**Ubicación:** `src/features/amistades/hooks/useAmistad.js`

#### Alert 1: No puedes enviarte solicitud
- **Tipo:** AlertDialog
- **Variante:** warning
- **Trigger:** Usuario intenta enviarse solicitud a sí mismo
- **Mensaje:** "No puedes enviarte una solicitud a ti mismo."
- **Cuándo aparece:** Al intentar agregar tu propio perfil

#### Alert 2: Error al enviar solicitud
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al enviar solicitud de amistad
- **Mensaje:** "Error al enviar solicitud"
- **Cuándo aparece:** Cuando falla el envío

### 7.2 FriendCard.jsx (4 alerts)
**Ubicación:** `src/features/amigos/components/FriendCard.jsx`

#### Alert 1: Error al actualizar favorito
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al marcar/desmarcar favorito
- **Mensaje:** "Error al actualizar favorito"
- **Cuándo aparece:** Cuando falla la actualización

#### Alert 2: Error al actualizar fijado
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al fijar/desfijar amigo
- **Mensaje:** "Error al actualizar fijado"
- **Cuándo aparece:** Cuando falla la actualización

#### Alert 3: Error al actualizar silenciado
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al silenciar/activar notificaciones
- **Mensaje:** "Error al actualizar silenciado"
- **Cuándo aparece:** Cuando falla la actualización

#### Alert 4: Error al realizar acción
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al eliminar amigo o bloquear
- **Mensaje:** "Error al realizar la acción"
- **Cuándo aparece:** Cuando falla eliminar/bloquear

---

## 📦 Módulo 8: ADS (9 alerts)

### 8.1 ClientAdsDashboard.jsx (5 alerts)
**Ubicación:** `src/features/ads/ClientAdsDashboard.jsx`

#### Alert 1: Error al cambiar estado
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al pausar/reanudar campaña
- **Mensaje:** "Error al cambiar estado de la campaña"
- **Cuándo aparece:** Cuando falla el cambio de estado

#### Alert 2: Error al eliminar
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al eliminar campaña
- **Mensaje:** "Error al eliminar la campaña"
- **Cuándo aparece:** Cuando falla la eliminación

#### Alert 3: Comprar créditos
- **Tipo:** AlertDialog
- **Variante:** info
- **Trigger:** Usuario hace clic en "Comprar Créditos"
- **Mensaje:** "Función de compra en desarrollo"
- **Cuándo aparece:** Al intentar comprar créditos

#### Alert 4: Ver estadísticas
- **Tipo:** AlertDialog
- **Variante:** info
- **Trigger:** Usuario hace clic en ver estadísticas
- **Mensaje:** "Función de estadísticas en desarrollo"
- **Cuándo aparece:** Al intentar ver estadísticas

#### Confirm 1: Eliminar campaña
- **Tipo:** ConfirmDialog
- **Variante:** danger
- **Trigger:** Usuario intenta eliminar campaña
- **Título:** "Eliminar Campaña"
- **Mensaje:** "¿Estás seguro de eliminar esta campaña?"
- **Cuándo aparece:** Al hacer clic en eliminar

### 8.2 CampaignReviewModal.jsx (3 alerts)
**Ubicación:** `src/features/ads/CampaignReviewModal.jsx`

#### Alert 1: Error al aprobar
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al aprobar campaña
- **Mensaje:** "Error al aprobar la campaña"
- **Cuándo aparece:** Cuando falla la aprobación

#### Alert 2: Motivo requerido
- **Tipo:** AlertDialog
- **Variante:** warning
- **Trigger:** Usuario intenta rechazar sin motivo
- **Mensaje:** "Por favor ingresa un motivo de rechazo"
- **Cuándo aparece:** Al intentar rechazar sin escribir motivo

#### Alert 3: Error al rechazar
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al rechazar campaña
- **Mensaje:** "Error al rechazar la campaña"
- **Cuándo aparece:** Cuando falla el rechazo

### 8.3 CampaignAnalyticsPage.jsx (1 alert)
**Ubicación:** `src/features/ads/CampaignAnalyticsPage.jsx`

#### Alert 1: Error al cargar estadísticas
- **Tipo:** AlertDialog
- **Variante:** error
- **Trigger:** Error al cargar datos de analytics
- **Mensaje:** "Error al cargar estadísticas"
- **Cuándo aparece:** Cuando falla la carga de datos

---

## 🔧 Implementación Técnica

### Patrón para Componentes
```javascript
import { AlertDialog } from '../../../shared/components/AlertDialog';

const [alertConfig, setAlertConfig] = useState({ 
  isOpen: false, 
  variant: 'info', 
  message: '' 
});

// Trigger
setAlertConfig({ 
  isOpen: true, 
  variant: 'error', 
  message: 'Error al guardar' 
});

// Render
<AlertDialog
  isOpen={alertConfig.isOpen}
  onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
  variant={alertConfig.variant}
  message={alertConfig.message}
/>
```

### Patrón para Hooks
```javascript
// En el hook
const [alertConfig, setAlertConfig] = useState({ 
  isOpen: false, 
  variant: 'info', 
  message: '' 
});

return {
  // ... otros valores
  alertConfig,
  setAlertConfig
};

// En el componente
const { alertConfig, setAlertConfig } = useCustomHook();

<AlertDialog
  isOpen={alertConfig.isOpen}
  onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
  variant={alertConfig.variant}
  message={alertConfig.message}
/>
```

---

## 📊 Estadísticas Finales

- **Total de alerts:** 77
- **AlertDialog:** 70
- **ConfirmDialog:** 7
- **Archivos modificados:** 18
- **Módulos:** 8
- **Variantes usadas:** 4 (success, error, warning, info)
- **Fecha de migración:** Diciembre 2024

---

## ✅ Estado de Migración

**100% COMPLETADO** ✅

Todos los alerts nativos han sido reemplazados por componentes personalizados que ofrecen:
- Mejor experiencia de usuario
- Consistencia visual
- Mayor control y personalización
- Compatibilidad cross-browser
- Mejor accesibilidad

---

**Documento generado:** Diciembre 2024  
**Versión:** 1.0  
**Autor:** Sistema de Migración de Alerts
