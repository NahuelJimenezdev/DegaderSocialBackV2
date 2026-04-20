# Guía de Despliegue - Degader Social en VPS

**Fecha: 2025**
**Versión: 1.0.0 — Despliegue manual con PM2 + Nginx (AWS de prueba)**

**Fecha:** 20 de Abril, 2026
**Versión:** 2.0.0 — Despliegue con Docker Compose en VPS Hostinger
**Estado:** ✅ EN PRODUCCIÓN — https://degadersocial.com
**Infraestructura Actual:** VPS Hostinger (Ubuntu) + Docker Compose + Nginx + Let's Encrypt

---

> [!IMPORTANT]
> ### 📌 HISTORIAL DE INFRAESTRUCTURA
> * **Fase 1 (2025):** Se usó una instancia AWS EC2 como entorno de prueba. El despliegue era manual con PM2 + Nginx directo en el servidor. **Ya no se utiliza AWS.**
> * **Fase 2 (2026 - Actual):** Se migró a un **VPS en Hostinger** con dominio propio `degadersocial.com`. Ahora el despliegue se realiza con **Docker Compose**, que levanta 3 contenedores: Backend, Frontend y Redis.

> [!TIP]
> ### 💡 RECOMENDACIONES DE DESPLIEGUE
> * **Nunca** hagas `docker-compose up --build` sin verificar que el `.env` tiene todas las claves (Firebase, R2, MongoDB, Redis).
> * Después de cada deploy, verifica que Socket.IO funcione abriendo `https://degadersocial.com` en dos pestañas y probando el chat.
> * Si necesitas revisar logs del backend en producción: `docker logs degadersocialbackv2-backend-1 --tail 100 -f`

---

## 🚀 Método Actual: Docker Compose (Hostinger VPS)

### Arquitectura de Contenedores
```
┌─────────────────────────────────────────────┐
│  VPS Hostinger (Ubuntu)                     │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Backend  │  │ Frontend │  │   Redis   │ │
│  │ Node 20  │  │  Nginx   │  │  Alpine   │ │
│  │ :3001    │  │  :8080   │  │  :6379    │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │
│       └──────────────┴──────────────┘       │
│              degader-network                │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Nginx Host (Reverse Proxy + SSL)   │   │
│  │  degadersocial.com → :8080 / :3001  │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Paso 1: Conectarse al VPS
```bash
ssh root@degadersocial.com
# o con la IP del VPS Hostinger
```

### Paso 2: Clonar/Actualizar el Código
```bash
cd /root/DegaderSocialBackV2
git pull origin main
```

### Paso 3: Rebuild y Levantar
```bash
# Reconstruir y levantar los 3 contenedores
docker-compose up --build -d

# Verificar que todo esté corriendo
docker ps
```

### Paso 4: Verificar Salud
```bash
# Desde dentro del servidor
curl http://localhost:3001/health

# Desde el exterior
curl https://degadersocial.com/api/health
```

---

## 📦 Servicios del Docker Compose

| Servicio | Imagen | Puerto | Función |
| :--- | :--- | :--- | :--- |
| `backend` | Node 20 (build local) | 3001 | API REST + Socket.IO |
| `redis` | redis:alpine | 6379 | Caché, Idempotencia, Rate Limiting |
| `frontend` | Nginx (build FrontV2) | 8080 | SPA React compilada |

### Volúmenes Persistentes
- `uploads_data`: Archivos subidos por usuarios (montado en `/usr/src/app/uploads`)
- `redis_data`: Datos de Redis persistidos

### Variables de Entorno Críticas
El archivo `.env` en el VPS debe contener:
- `MONGODB_URI` — Conexión a MongoDB Atlas
- `JWT_SECRET` — Clave de cifrado de tokens
- `REDIS_PASSWORD` — Contraseña del contenedor Redis
- `R2_BUCKET_NAME`, `R2_PUBLIC_URL` — Cloudflare R2
- `VITE_FIREBASE_*` — Claves de Firebase para Push Notifications

---

## 🌐 Nginx del Host (Reverse Proxy + SSL)

El Nginx del host (fuera de Docker) redirige el tráfico:

```nginx
server {
    listen 443 ssl;
    server_name degadersocial.com;

    ssl_certificate /etc/letsencrypt/live/degadersocial.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/degadersocial.com/privkey.pem;

    client_max_body_size 50M;

    # Frontend (SPA)
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts para Socket.IO
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL con Let's Encrypt
```bash
sudo certbot --nginx -d degadersocial.com
sudo certbot renew --dry-run
```

---

## 🔥 Firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 🐛 Troubleshooting en Producción

### Problema: 502 Bad Gateway
```bash
# 1. Verificar que los contenedores estén activos
docker ps

# 2. Si el backend se cayó, revisar logs
docker logs degadersocialbackv2-backend-1 --tail 200

# 3. Reiniciar todo
docker-compose down && docker-compose up --build -d
```

### Problema: Socket.IO no conecta
```bash
# Verificar que Nginx esté pasando los headers de WebSocket
sudo nginx -t
sudo systemctl restart nginx
```

### Problema: Redis no arranca
```bash
# Verificar que REDIS_PASSWORD esté en el .env
docker logs degadersocialbackv2-redis-1

# Reiniciar solo Redis
docker-compose restart redis
```

### Problema: Espacio en disco lleno
```bash
# Limpiar imágenes Docker huérfanas
docker system prune -af

# Verificar espacio
df -h
```

---

## 📝 Checklist de Despliegue

- [ ] SSH al VPS de Hostinger
- [ ] `git pull origin main` en el backend
- [ ] Verificar que `.env` tiene las claves actualizadas
- [ ] `docker-compose up --build -d`
- [ ] `docker ps` — Los 3 contenedores deben estar `Up`
- [ ] `curl https://degadersocial.com/api/health` → `status: OK`
- [ ] Probar login desde el navegador
- [ ] Probar envío de mensaje (Socket.IO)
- [ ] Verificar que las imágenes suben a R2

---

## 📜 Método Legacy: PM2 + Nginx Directo (Referencia AWS)

> [!NOTE]
> Este método fue usado durante la **Fase 1 con AWS EC2** y ya no está activo. Se conserva como referencia en caso de necesitar un despliegue sin Docker.

### Instalación rápida (solo referencia)
```bash
# Instalar Node, PM2 y Nginx (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2

# Iniciar con PM2
pm2 start src/index.js --name degader-backend
pm2 startup && pm2 save

# Comandos útiles
pm2 logs degader-backend    # Ver logs
pm2 restart degader-backend # Reiniciar
pm2 monit                   # Monitor en tiempo real
```

---

**Actualizado por:** Antigravity AI
**Dominio de Producción:** https://degadersocial.com
