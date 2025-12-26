const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que existen los directorios de uploads
const uploadDirs = [
  'uploads/avatars',
  'uploads/banners',
  'uploads/posts',
  'uploads/groups',
  'uploads/messages'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuración de almacenamiento para avatares (en memoria para R2)
const avatarStorage = multer.memoryStorage();

// Configuración de almacenamiento para banners
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/banners');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + req.userId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configuración de almacenamiento para posts
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/posts');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configuración de almacenamiento para grupos
const groupStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/groups');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'group-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configuración de almacenamiento para mensajes
const messageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/messages');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'message-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de archivos - solo imágenes
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif, webp)'));
  }
};

// Filtro de archivos - imágenes y videos
const mediaFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /image|video/.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen o video'));
  }
};

// Límites de tamaño
const limits = {
  fileSize: 10 * 1024 * 1024, // 10 MB
};

// Middleware de upload para avatares
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB para avatares
}).single('avatar');

// Middleware de upload para banners
const uploadBanner = multer({
  storage: bannerStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB para banners
}).single('banner');

// Middleware de upload para posts
const uploadPostImage = multer({
  storage: postStorage,
  fileFilter: mediaFileFilter,
  limits: limits
}).single('imagen');

// Middleware de upload para grupos (acepta 'imagen' o 'avatar')
const uploadGroupImage = multer({
  storage: groupStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB para grupos
}).single('avatar');

// Middleware de upload para mensajes
const uploadMessageFile = multer({
  storage: messageStorage,
  fileFilter: mediaFileFilter,
  limits: limits
}).single('archivo');

// Configuración de almacenamiento para archivos de grupos (chat)
const groupAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/group_attachments';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de archivos para grupos - acepta más tipos
const groupAttachmentFilter = (req, file, cb) => {
  const allowedMime = [
    // Imágenes, videos y audio
    'image/',
    'video/',
    'audio/',
    // PDF
    'application/pdf',
    // Texto
    'text/plain',
    'text/csv',
    // Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archivos comprimidos
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/x-7z-compressed',
    // JSON
    'application/json',
    // RTF
    'application/rtf',
    'text/rtf'
  ];
  const ok = allowedMime.some(a => file.mimetype.startsWith(a));
  if (ok) {
    return cb(null, true);
  }
  cb(new Error('Tipo de archivo no permitido'));
};

// Middleware de upload para archivos de grupo (múltiples)
const uploadGroupAttachments = multer({
  storage: groupAttachmentStorage,
  fileFilter: groupAttachmentFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
}).array('attachments', 20);

// Manejador de errores de multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Error al subir archivo: ' + err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = {
  uploadAvatar,
  uploadBanner,
  uploadPostImage,
  uploadGroupImage,
  uploadMessageFile,
  uploadGroupAttachments,
  handleUploadError
};
