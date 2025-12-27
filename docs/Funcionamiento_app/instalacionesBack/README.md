# 📚 Documentación de Instalación y Despliegue Backend

Esta carpeta contiene toda la documentación relacionada con la instalación, configuración y despliegue del backend de DegaderSocial en servidores SSH/VPS y servicios cloud.

---

## 📋 Índice de Documentos

### 🚀 **Despliegue y Configuración**

1. **[Deployment_Guide_Aws.md](./Deployment_Guide_Aws.md)**
   - Guía completa de despliegue en AWS EC2
   - Configuración de servidor VPS
   - Instalación de dependencias
   - Configuración de PM2 y Nginx

2. **[DEPLOY-QUICK.md](./DEPLOY-QUICK.md)**
   - Comandos rápidos de despliegue
   - Actualización rápida del servidor
   - Verificación de estado

3. **[DEPLOY-FINAL.md](./DEPLOY-FINAL.md)**
   - Guía de despliegue final para migración R2
   - Checklist de verificación
   - Comandos de despliegue completo

4. **[DEPLOY-R2-VPS.md](./DEPLOY-R2-VPS.md)**
   - Guía detallada de despliegue con R2
   - Configuración de variables de entorno
   - Solución de problemas

---

### ☁️ **Cloudflare R2**

5. **[Cloudflare_R2_Setup.md](./Cloudflare_R2_Setup.md)**
   - Configuración inicial de Cloudflare R2
   - Creación de bucket y credenciales
   - Integración con el backend
   - Migración de archivos existentes

6. **[R2-MIGRATION-COMPLETE.md](./R2-MIGRATION-COMPLETE.md)**
   - Resumen completo de la migración a R2
   - Estado de todos los controladores
   - Beneficios y comparativas
   - Estructura de carpetas en R2

---

## 🗂️ Organización de Documentos

```
instalacionesBack/
├── Deployment_Guide_Aws.md          # Despliegue en AWS/VPS
├── DEPLOY-QUICK.md                  # Comandos rápidos
├── DEPLOY-FINAL.md                  # Despliegue final R2
├── DEPLOY-R2-VPS.md                 # Guía detallada R2
├── Cloudflare_R2_Setup.md           # Setup inicial R2
├── R2-MIGRATION-COMPLETE.md         # Resumen migración
└── README.md                        # Este archivo
```

---

## 🎯 Flujo de Trabajo Recomendado

### Para Despliegue Inicial:

1. Leer **Deployment_Guide_Aws.md**
2. Configurar **Cloudflare_R2_Setup.md**
3. Seguir **DEPLOY-R2-VPS.md**

### Para Actualizaciones Rápidas:

1. Usar **DEPLOY-QUICK.md**
2. Verificar logs y estado

### Para Migración a R2:

1. Revisar **R2-MIGRATION-COMPLETE.md**
2. Seguir **DEPLOY-FINAL.md**

---

## 🔧 Comandos Rápidos

### Conectar al Servidor:
```bash
ssh -i "degader-social-key.pem" ubuntu@3.144.132.207
```

### Actualizar Backend:
```bash
cd /var/www/degader-backend
git pull origin main
npm install
pm2 restart degader-backend
```

### Ver Logs:
```bash
pm2 logs degader-backend --lines 50
```

---

## 📊 Estado Actual

- ✅ **Servidor:** AWS EC2 (3.144.132.207)
- ✅ **Backend:** Node.js + Express + MongoDB
- ✅ **Almacenamiento:** Cloudflare R2
- ✅ **Process Manager:** PM2
- ✅ **Proxy:** Nginx

---

## 🆘 Soporte

Para problemas o dudas:
1. Revisar sección de troubleshooting en cada documento
2. Verificar logs del servidor
3. Consultar documentación de Cloudflare R2

---

**Última actualización:** 2025-12-27  
**Versión:** 2.1.0 (Migración R2 completa)
