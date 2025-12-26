# 🚀 Guía de Configuración e Integración de Cloudflare R2

**Almacenamiento de imágenes y archivos para DegaderSocial**

---

## 📋 ¿Por qué Cloudflare R2?

### **Ventajas sobre AWS S3:**

| Característica | Cloudflare R2 | AWS S3 |
|----------------|---------------|--------|
| **Storage gratis** | 10 GB | 5 GB |
| **Egress (salida)** | ✅ **ILIMITADO GRATIS** | ❌ Solo 100 GB/mes |
| **Operaciones gratis** | 1M writes, 10M reads | 2K writes, 20K reads |
| **Costo después** | $0.015/GB | $0.023/GB |
| **Egress después** | $0 | $0.09/GB |

### **Ahorro Estimado:**

Para 100 usuarios activos con 20 GB de storage y 50 GB de transferencia/mes:

```
Cloudflare R2: $0.30/mes
AWS S3: $5.06/mes
Ahorro: 94% ($4.76/mes)
```

---

## 🎯 PARTE 1: Crear Cuenta y Configurar R2

### **Paso 1.1: Crear Cuenta en Cloudflare**

1. Ve a [cloudflare.com](https://cloudflare.com)
2. Haz clic en "Sign Up"
3. Completa el formulario:
   - Email
   - Contraseña
4. Verifica tu email

### **Paso 1.2: Acceder a R2**

1. Inicia sesión en Cloudflare Dashboard
2. En el menú lateral, haz clic en **"R2"**
3. Haz clic en **"Purchase R2"** (es gratis, solo activa el servicio)
4. Acepta los términos

### **Paso 1.3: Crear Bucket**

1. Haz clic en **"Create bucket"**
2. Configura:
   - **Bucket name:** `degader-social-uploads`
   - **Location:** Automatic (recomendado)
3. Haz clic en **"Create bucket"**

### **Paso 1.4: Obtener Credenciales**

1. En el dashboard de R2, haz clic en **"Manage R2 API Tokens"**
2. Haz clic en **"Create API Token"**
3. Configura:
   - **Token name:** `degader-backend-token`
   - **Permissions:** 
     - ✅ Object Read & Write
   - **TTL:** Never expire (o el tiempo que prefieras)
   - **Bucket:** `degader-social-uploads`
4. Haz clic en **"Create API Token"**
5. **IMPORTANTE:** Copia y guarda:
   - `Access Key ID`
   - `Secret Access Key`
   - `Endpoint URL` (ejemplo: `https://abc123.r2.cloudflarestorage.com`)

⚠️ **ADVERTENCIA:** Guarda estas credenciales en un lugar seguro. No las podrás ver de nuevo.

---

## 📦 PARTE 2: Integrar R2 en el Backend

### **Paso 2.1: Instalar Dependencias**

```bash
cd /ruta/a/DegaderSocialBackV2
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### **Paso 2.2: Configurar Variables de Entorno**

Edita tu archivo `.env`:

```bash
nano .env
```

Agrega estas variables:

```env
# Cloudflare R2
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key_id
R2_SECRET_ACCESS_KEY=tu_secret_access_key
R2_BUCKET_NAME=degader-social-uploads
R2_PUBLIC_URL=https://pub-abc123.r2.dev
```

**Cómo obtener `R2_ACCOUNT_ID`:**
- En el dashboard de Cloudflare, ve a R2
- El Account ID aparece en la URL: `https://dash.cloudflare.com/[ACCOUNT_ID]/r2`

**Cómo obtener `R2_PUBLIC_URL`:**
- En tu bucket, haz clic en **"Settings"**
- Habilita **"Public Access"** (opcional, para URLs públicas)
- Copia el **"Public Bucket URL"**

### **Paso 2.3: Crear Configuración de R2**

Crea el archivo `src/config/r2.js`:

```javascript
import { S3Client } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default r2Client;
```

### **Paso 2.4: Crear Servicio de Upload**

Crea el archivo `src/services/r2Service.js`:

```javascript
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import r2Client from '../config/r2.js';
import crypto from 'crypto';
import path from 'path';

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * Sube un archivo a Cloudflare R2
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} folder - Carpeta destino (posts, profiles, groups, iglesias)
 * @returns {Promise<string>} URL pública del archivo
 */
export const uploadToR2 = async (fileBuffer, originalName, folder = 'uploads') => {
  try {
    // Generar nombre único
    const fileExtension = path.extname(originalName);
    const fileName = `${folder}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;

    // Determinar Content-Type
    const contentType = getContentType(fileExtension);

    // Comando de subida
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Retornar URL pública
    return `${PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error('Error al subir archivo a R2:', error);
    throw new Error('Error al subir archivo');
  }
};

/**
 * Elimina un archivo de R2
 * @param {string} fileUrl - URL del archivo a eliminar
 */
export const deleteFromR2 = async (fileUrl) => {
  try {
    // Extraer el key del URL
    const key = fileUrl.replace(`${PUBLIC_URL}/`, '');

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('Error al eliminar archivo de R2:', error);
    throw new Error('Error al eliminar archivo');
  }
};

/**
 * Genera una URL firmada temporal para acceso privado
 * @param {string} key - Key del archivo en R2
 * @param {number} expiresIn - Tiempo de expiración en segundos (default: 1 hora)
 * @returns {Promise<string>} URL firmada
 */
export const getSignedUrlFromR2 = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error al generar URL firmada:', error);
    throw new Error('Error al generar URL firmada');
  }
};

/**
 * Determina el Content-Type según la extensión del archivo
 */
function getContentType(extension) {
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };

  return types[extension.toLowerCase()] || 'application/octet-stream';
}
```

### **Paso 2.5: Actualizar Middleware de Upload**

Modifica tu middleware de multer para usar R2. Crea `src/middleware/uploadR2.js`:

```javascript
import multer from 'multer';

// Usar memoria temporal (no guardar en disco)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|mp4|webm/;
  const extname = allowedTypes.test(file.originalname.toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'));
  }
};

export const uploadR2 = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter,
});
```

### **Paso 2.6: Actualizar Controladores**

Ejemplo para subir foto de perfil:

```javascript
import { uploadToR2, deleteFromR2 } from '../services/r2Service.js';

export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No se proporcionó archivo' });
    }

    // Subir a R2
    const imageUrl = await uploadToR2(file.buffer, file.originalname, 'profiles');

    // Eliminar imagen anterior si existe
    const user = await User.findById(userId);
    if (user.profilePicture && user.profilePicture.includes('r2.dev')) {
      await deleteFromR2(user.profilePicture);
    }

    // Actualizar usuario
    user.profilePicture = imageUrl;
    await user.save();

    res.json({
      message: 'Foto de perfil actualizada',
      imageUrl,
    });
  } catch (error) {
    console.error('Error al subir foto de perfil:', error);
    res.status(500).json({ message: 'Error al subir foto de perfil' });
  }
};
```

### **Paso 2.7: Actualizar Rutas**

```javascript
import { uploadR2 } from '../middleware/uploadR2.js';
import { uploadProfilePicture } from '../controllers/userController.js';

router.post(
  '/upload-profile-picture',
  authMiddleware,
  uploadR2.single('image'),
  uploadProfilePicture
);
```

---

## 🔄 PARTE 3: Migración de Archivos Existentes

Si ya tienes archivos en local o S3, puedes migrarlos a R2:

### **Script de Migración:**

Crea `scripts/migrateToR2.js`:

```javascript
import fs from 'fs';
import path from 'path';
import { uploadToR2 } from '../src/services/r2Service.js';

const UPLOADS_DIR = './uploads';

async function migrateFiles() {
  const folders = ['posts', 'profiles', 'groups', 'iglesias'];

  for (const folder of folders) {
    const folderPath = path.join(UPLOADS_DIR, folder);
    
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const fileBuffer = fs.readFileSync(filePath);

      try {
        const url = await uploadToR2(fileBuffer, file, folder);
        console.log(`✅ Migrado: ${file} -> ${url}`);
      } catch (error) {
        console.error(`❌ Error al migrar ${file}:`, error.message);
      }
    }
  }

  console.log('🎉 Migración completada');
}

migrateFiles();
```

Ejecutar:

```bash
node scripts/migrateToR2.js
```

---

## 🌐 PARTE 4: Configurar Dominio Personalizado (Opcional)

Para usar tu propio dominio en lugar de `r2.dev`:

### **Paso 4.1: Conectar Dominio**

1. En Cloudflare R2, ve a tu bucket
2. Haz clic en **"Settings"** → **"Custom Domains"**
3. Haz clic en **"Connect Domain"**
4. Ingresa tu dominio: `cdn.tu-dominio.com`
5. Cloudflare creará automáticamente el registro DNS

### **Paso 4.2: Actualizar Variables de Entorno**

```env
R2_PUBLIC_URL=https://cdn.tu-dominio.com
```

---

## 📊 PARTE 5: Monitoreo y Límites

### **Ver Uso Actual:**

1. Dashboard de Cloudflare → R2
2. Verás:
   - Storage usado
   - Operaciones del mes
   - Egress del mes

### **Límites del Free Tier:**

```
✅ 10 GB storage
✅ 1,000,000 Class A operations (writes)
✅ 10,000,000 Class B operations (reads)
✅ Egress ilimitado gratis
```

### **Alertas:**

Configura alertas cuando llegues al 80% del free tier:

1. Dashboard → Notifications
2. Create Notification
3. Selecciona "R2 Usage"

---

## 🔒 PARTE 6: Seguridad

### **Mejores Prácticas:**

1. **Nunca expongas las credenciales:**
   ```bash
   # .gitignore
   .env
   .env.local
   ```

2. **Usa tokens con permisos mínimos:**
   - Solo lectura/escritura en el bucket específico
   - No uses tokens de administrador

3. **Valida archivos en el backend:**
   - Tipo de archivo
   - Tamaño máximo
   - Escaneo de malware (opcional)

4. **Usa CORS si es necesario:**
   ```javascript
   // En R2 bucket settings
   {
     "AllowedOrigins": ["https://tu-dominio.com"],
     "AllowedMethods": ["GET", "PUT"],
     "AllowedHeaders": ["*"],
     "MaxAgeSeconds": 3600
   }
   ```

---

## 🐛 Solución de Problemas

### **Error: "Access Denied"**

```bash
# Verificar credenciales
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY

# Verificar permisos del token en Cloudflare Dashboard
```

### **Error: "Bucket not found"**

```bash
# Verificar nombre del bucket
echo $R2_BUCKET_NAME

# Asegúrate que el bucket existe en Cloudflare
```

### **Imágenes no se cargan**

```bash
# Verificar que Public Access está habilitado
# Dashboard → R2 → Bucket → Settings → Public Access
```

---

## ✅ Checklist de Implementación

- [ ] Cuenta de Cloudflare creada
- [ ] R2 activado
- [ ] Bucket creado
- [ ] API Token generado y guardado
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas (`@aws-sdk/client-s3`)
- [ ] `src/config/r2.js` creado
- [ ] `src/services/r2Service.js` creado
- [ ] Middleware `uploadR2.js` creado
- [ ] Controladores actualizados
- [ ] Rutas actualizadas
- [ ] Archivos existentes migrados (opcional)
- [ ] Dominio personalizado configurado (opcional)
- [ ] Pruebas realizadas

---

## 🚀 Próximos Pasos

1. **Implementar caché con Cloudflare CDN**
2. **Configurar transformación de imágenes**
3. **Implementar compresión automática**
4. **Configurar backup automático**

---

¡Tu integración con Cloudflare R2 está completa! 🎉
