const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorios si no existen
const createUploadDirs = () => {
  const dirs = [
    'uploads/avatars',
    'uploads/posts',
    'uploads/documents',
    'uploads/events',
    'uploads/groups'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';

    // Determinar carpeta según el tipo de archivo
    if (req.baseUrl.includes('usuarios')) {
      uploadPath += 'avatars/';
    } else if (req.baseUrl.includes('publicaciones')) {
      uploadPath += 'posts/';
    } else if (req.baseUrl.includes('eventos')) {
      uploadPath += 'events/';
    } else if (req.baseUrl.includes('grupos')) {
      uploadPath += 'groups/';
    } else {
      uploadPath += 'documents/';
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, '').replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Tipos de archivos permitidos
  const allowedImages = /jpeg|jpg|png|gif|webp/;
  const allowedDocs = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;

  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  const mimetype = file.mimetype;

  if (allowedImages.test(ext) || allowedDocs.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes y documentos.'));
  }
};

// Configuración de multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

module.exports = {
  uploadSingle: upload.single('file'),
  uploadMultiple: upload.array('files', 5),
  uploadAvatar: upload.single('avatar'),
  uploadPostImages: upload.array('imagenes', 5)
};
