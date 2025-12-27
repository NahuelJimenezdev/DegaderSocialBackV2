# 🚀 Comandos de Despliegue Final - Migración R2 Completa

## ✅ **TODOS LOS CONTROLADORES ACTUALIZADOS**

---

## 📦 **PASO 1: Desplegar Backend**

```bash
# Ya estás conectado al servidor SSH
cd /var/www/degader-backend

# Actualizar código
git pull origin main

# Instalar dependencias (por si acaso)
npm install

# Reiniciar servidor
pm2 restart degader-backend

# Ver logs
pm2 logs degader-backend --lines 50
```

---

## 🌐 **PASO 2: Desplegar Frontend**

```bash
# Ir al directorio del frontend
cd /var/www/degader-frontend

# Actualizar código
git pull origin main

# Instalar dependencias
npm install

# Construir para producción
npm run build

# Verificar estado
pm2 status
```

---

## 🧪 **PASO 3: Verificar Funcionalidad**

### Desde el navegador:

1. **Crear publicación con imagen**
   - Ir a la aplicación
   - Crear nueva publicación
   - Adjuntar imagen
   - Publicar

2. **Enviar mensaje con archivo**
   - Abrir chat privado
   - Adjuntar documento/imagen
   - Enviar

3. **Subir archivo a carpeta**
   - Ir a carpetas
   - Seleccionar carpeta
   - Subir documento

### Verificar en logs del servidor:

```bash
pm2 logs degader-backend -f
```

Deberías ver:
```
📝 [CREATE POST] Request received
📤 [CREATE POST] Uploading 1 files to R2...
✅ [CREATE POST] File uploaded to R2: https://pub-90ad1cf48a9c47f4a5a5dc3d492f1797.r2.dev/posts/...
```

---

## 📊 **Resumen de Actualización**

| Controlador | Estado |
|-------------|--------|
| `postController.js` | ✅ ACTUALIZADO |
| `conversationController.js` | ✅ ACTUALIZADO |
| `folderController.js` | ✅ ACTUALIZADO |
| `iglesiaController.js` | ✅ ACTUALIZADO |
| `userController.js` | ✅ YA TENÍA R2 |
| `groupController.js` | ✅ YA TENÍA R2 |

**Total: 6/6 controladores con R2** 🎉

---

## 🎯 **Checklist de Despliegue**

```
[ ] Backend actualizado (git pull)
[ ] Dependencias instaladas (npm install)
[ ] Servidor reiniciado (pm2 restart)
[ ] Logs sin errores
[ ] Frontend actualizado (git pull)
[ ] Frontend construido (npm run build)
[ ] Prueba: Publicación con imagen
[ ] Prueba: Mensaje con archivo
[ ] Prueba: Archivo en carpeta
[ ] Todo funcionando correctamente
```

---

**¿Listo para desplegar?** 🚀
