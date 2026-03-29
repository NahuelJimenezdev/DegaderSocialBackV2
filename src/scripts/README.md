# Scripts de Utilidad - Sistema de Reportes

## Asignar Roles de Moderación

Estos scripts te permiten asignar roles de moderador o Founder a usuarios existentes en la base de datos.

### 📋 Requisitos

- Node.js instalado
- Variables de entorno configuradas (`.env`)
- Usuario ya registrado en la base de datos

---

## 🔧 Asignar Rol de Moderador

### Uso

```bash
node src/scripts/setModeratorRole.js <email_del_usuario>
```

### Ejemplo

```bash
node src/scripts/setModeratorRole.js juan@ejemplo.com
```

### Qué hace este script

1. Busca el usuario por email
2. Cambia su rol a `moderador`
3. Activa el permiso `moderarContenido`
4. Muestra confirmación con los datos del usuario

### Permisos otorgados

- ✅ Acceso al dashboard de moderación (`/moderacion`)
- ✅ Ver lista de reportes
- ✅ Filtrar y ordenar reportes
- ✅ Asignarse reportes
- ✅ Cambiar estado de reportes
- ✅ Aplicar acciones de moderación
- ✅ Ver estadísticas

---

## 👑 Asignar Rol de Founder

### Uso

```bash
node src/scripts/setFounderRole.js <email_del_usuario>
```

### Ejemplo

```bash
node src/scripts/setFounderRole.js fundador@ejemplo.com
```

### Qué hace este script

1. Busca el usuario por email
2. Cambia su rol a `Founder`
3. Activa todos los permisos (moderación, admin, gestión de usuarios)
4. Muestra confirmación con los datos del usuario

### Permisos otorgados

- ✅ Todos los permisos de moderador
- ✅ Acceso al dashboard de auditoría
- ✅ Ver estadísticas globales
- ✅ Auditar decisiones de moderadores
- ✅ Escalar y revertir casos
- ✅ Acceso completo al sistema

---

## 🚀 Inicio Rápido

### 1. Identifica tu email de usuario

Inicia sesión en la aplicación y verifica qué email usaste para registrarte.

### 2. Ejecuta el script

Desde la raíz del proyecto backend:

```bash
# Para moderador
node src/scripts/setModeratorRole.js tu-email@ejemplo.com

# Para Founder
node src/scripts/setFounderRole.js tu-email@ejemplo.com
```

### 3. Verifica el cambio

Deberías ver un mensaje como:

```
✅ Conectado a MongoDB

📋 Usuario encontrado:
   Nombre: Juan Pérez
   Email: juan@ejemplo.com
   Username: juanperez
   Rol actual: usuario

✅ Rol actualizado exitosamente:
   Nuevo rol: moderador
   Permisos de moderación: ✓

🎯 El usuario ahora puede acceder a:
   - Dashboard de moderación (/moderacion)
   - Gestión de reportes
   - Estadísticas de moderación

👋 Conexión cerrada
```

### 4. Recarga la aplicación

1. Cierra sesión
2. Vuelve a iniciar sesión
3. Navega a `/moderacion`
4. ¡Deberías poder acceder sin problemas!

---

---

## ⚡ Mantenimiento de Rendimiento y Base de Datos

### Creación de Índices (Recomendado para Producción)

Si notas lentitud en el carrusel de recomendaciones o en la carga de sugerencias de usuarios, es probable que falten los índices optimizados en MongoDB.

#### Uso (Desde el contenedor backend)
```bash
docker compose exec backend node src/scripts/createIndexes.js
```

#### Qué hace este script
1. **Índice de Jerarquías:** Optimiza las búsquedas por nivel fundacional y territorio.
2. **Índice de Estado:** Agiliza el filtrado de usuarios activos y miembros de la fundación.

---

## ❓ Solución de Problemas

### Error: "Usuario no encontrado"

- ✅ Verifica que el email sea correcto
- ✅ Asegúrate de que el usuario esté registrado
- ✅ Verifica las mayúsculas/minúsculas (el email se convierte a minúsculas)

### Error: "Error de conexión a MongoDB"

- ✅ Verifica que el archivo `.env` tenga las credenciales correctas
- ✅ Asegúrate de que MongoDB Atlas esté accesible
- ✅ Verifica tu conexión a internet

### El dashboard sigue mostrando 403

- ✅ Cierra sesión completamente
- ✅ Limpia el localStorage del navegador
- ✅ Vuelve a iniciar sesión
- ✅ El token se regenerará con los nuevos permisos

---

## 📝 Notas Importantes

1. **Seguridad**: Estos scripts deben usarse solo en desarrollo o por administradores autorizados
2. **Permisos**: El rol de Founder tiene acceso completo al sistema
3. **Tokens**: Después de cambiar el rol, el usuario debe cerrar sesión y volver a iniciar
4. **Base de datos**: Los cambios son permanentes y se guardan directamente en MongoDB

---

## 🔍 Verificar Roles Manualmente

Si prefieres verificar o cambiar roles manualmente en MongoDB Compass:

1. Abre MongoDB Compass
2. Conecta a tu cluster
3. Ve a la base de datos `DegaderSocialDB`
4. Abre la colección `userv2s`
5. Busca tu usuario por email
6. Edita el campo `seguridad.rolSistema` a:
   - `"moderador"` para moderador
   - `"Founder"` para founder
7. Edita el campo `seguridad.permisos.moderarContenido` a `true`
8. Guarda los cambios

---

## 🎯 Próximos Pasos

Una vez que tengas acceso al dashboard:

1. **Probar el flujo de reportes**:
   - Reporta una publicación desde otra cuenta
   - Ve al dashboard de moderación
   - Verifica que aparezca el reporte

2. **Explorar funcionalidades**:
   - Filtrar reportes por estado
   - Ordenar por prioridad
   - Ver estadísticas

3. **Crear reportes de prueba**:
   - Diferentes categorías
   - Diferentes prioridades
   - Con y sin comentarios

---

¿Preguntas? Revisa el walkthrough completo en `walkthrough.md`
