const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const argon2 = require('argon2');

// ==========================================
// 🔹 ENUMS Y CONSTANTES
// ==========================================

const ROLES_SISTEMA = ["Founder", "admin", "moderador", "usuario", "soporte"];

// Niveles jerárquicos Fundación
const NIVELES_FUNDACION = [
  "directivo_general", "organo_control", "organismo_internacional", "nacional", "regional", "departamental", "municipal"
];

const AREAS_FUNDACION = [
  // Directivo General
  "Dirección Ejecutiva", "Secretaría Ejecutiva", "Junta Directiva", "Equipo de Licitación y Adquisiciones",
  // Órganos de Control
  "Dirección de Control Interno y Seguimiento", "Dirección de Asuntos Éticos",
  // Organismos Internacionales
  "Salvación Mundial", "Misión Internacional de Paz",
  // Áreas por nivel nacional/regional/departamental/municipal
  "Dirección de Planeación Estratégica y Proyectos", "Dirección de Infraestructura", "Dirección de Sostenibilidad Ambiental", "Dirección de Recursos Humanos y Seguridad Laboral", "Dirección Jurídica", "Dirección de Salud", "Dirección de Educación", "Dirección Financiera", "Dirección de Imagen Corporativa y Comunicación", "Dirección de Seguridad"
];

// Subdirecciones / Unidades internas
const SUBAREAS_FUNDACION = [
  "Dirección Psicosocial", "Dirección de Protección Animal", "Gerencia Clínica", "Gerencia Clínica Veterinaria", "Interventoría Interna", "Interventoría Externa"
];



// Programas
const PROGRAMAS_FUNDACION = [
  "Banco de Proyectos",
  "Programa de Conexión y Desarrollo Informático",
  "Programa de Estrategias Comerciales de Desarrollo Productivo",

  "Programas de Asuntos y Competencia Laboral",
  "Programas de Bienestar y Seguridad Laboral",
  "Programa de Gestión Documental y Almacén",

  "Contratación",
  "Banco de Oferentes",
  "Programa de Jueces de Paz",

  "Programas de Salud",
  "Programas de Salud Mental",
  "Programas de Salud Sexual y Reproductiva",
  "Programas de Acompañamiento Productivo",

  "Programas de Promoción y Prevención en la Salud Animal",

  "Programas de Educación",
  "Programas de Cultura y Turismo",
  "Gerencias Universitarias",

  "Programas de Tesorería",
  "Programas de Contabilidad",

  "Comunicaciones de Prensa",
  "Programas de Radio y Televisión"
];

const CARGOS_FUNDACION = [
  // Directivo General
  "Director Ejecutivo",
  "Secretario Ejecutivo",
  "Miembro de Junta Directiva",

  // Direcciones por nivel
  "Director", // Agregado para compatibilidad con select de nivel nacional
  "Director Nacional",
  "Director Regional",
  "Director Departamental",
  "Coordinador Municipal",

  // Director General (Pastor) - Rol territorial
  "Director General (Pastor)",

  // Órganos de Control
  "Auditor",
  "Miembro Comité Ético",
  "Delegado Internacional"
];
// Roles funcionales (qué hace)
const ROLES_FUNCIONALES = [
  "profesional",
  "encargado",
  "asistente",
  "voluntario",
  "pastor"
];

// Jerarquía Eclesiástica
const MINISTERIOS = [
  "musica", "caballeros", "damas", "escuela_dominical", "evangelismo",
  "limpieza", "cocina", "medios", "juventud", "intercesion",
  "consejeria", "visitacion", "seguridad", "protocolo"
];

const ROLES_MINISTERIALES = [
  "pastor_principal", "pastor_asociado", "anciano", "diacono",
  "lider", "director", "maestro", "coordinador", "miembro", "servidor"
];

// ==========================================
// 🔹 SUB-SCHEMAS (MÓDULOS)
// ==========================================

// 1. Información Personal y Contacto
const InfoPersonalSchema = new Schema({
  fechaNacimiento: { type: Date },
  genero: { type: String, enum: ['M', 'F', 'Otro'], default: 'Otro' },
  celular: { type: String, trim: true },
  telefonoFijo: { type: String, trim: true },
  direccion: { type: String, trim: true },

  // Ubicación Geográfica de Residencia
  ubicacion: {
    pais: { type: String, trim: true }, // Ej: Colombia
    estado: { type: String, trim: true }, // Depto/Provincia
    ciudad: { type: String, trim: true }, // Municipio
    barrio: { type: String, trim: true },
    codigoPostal: { type: String, trim: true },
    coordenadas: {
      lat: Number,
      lng: Number
    }
  }
}, { _id: false });

// 2. Perfil Fundación Sol y Luna (FHS&L)
const PerfilFundacionSchema = new Schema({
  activo: { type: Boolean, default: true },
  fechaIngreso: { type: Date, default: Date.now },
  codigoEmpleado: { type: String, trim: true }, // Legajo o ID interno

  // Estructura Organizacional
  nivel: {
    type: String,
    enum: NIVELES_FUNDACION,
    required: function () { return this.activo; }
  },

  area: {
    type: String,
    enum: AREAS_FUNDACION,
    required: function () {
      // Área es opcional para Director General (Pastor) - pastores territoriales
      return this.activo && this.cargo !== 'Director General (Pastor)';
    }
  },

  cargo: {
    type: String,
    enum: CARGOS_FUNDACION,
    required: function () { return this.activo; }
  },

  // Estructura Territorial (Dónde ejerce su cargo)
  territorio: {
    pais: { type: String, trim: true }, // Aplica para todos
    region: { type: String, trim: true }, // Aplica para Regional
    departamento: { type: String, trim: true }, // Aplica para Departamental/Provincial
    municipio: { type: String, trim: true }, // Aplica para Municipal
    barrio: { type: String, trim: true }, // Aplica para Barrial
    zona: { type: String, trim: true } // Opcional para subdivisiones locales
  },

  // Sistema de Aprobación Jerárquica
  estadoAprobacion: {
    type: String,
    enum: ['pendiente', 'aprobado', 'rechazado'],
    default: 'pendiente'
  },
  aprobadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'UserV2'
  },
  fechaAprobacion: {
    type: Date
  },
  motivoRechazo: {
    type: String,
    trim: true
  },

  // Organismos Internacionales (Si aplica)
  organismoInternacional: {
    pertenece: { type: Boolean, default: false },
    nombre: { type: String, enum: ["Salvación Mundial", "Misión Internacional de Paz"] },
    cargo: { type: String }
  }
}, { _id: false });

// 3. Perfil Eclesiástico
const PerfilEclesiasticoSchema = new Schema({
  activo: { type: Boolean, default: false },
  iglesia: { type: Schema.Types.ObjectId, ref: 'Iglesia' }, // Referencia al modelo Iglesias
  fechaBautismo: { type: Date },

  // Rol principal en la iglesia
  rolPrincipal: {
    type: String,
    enum: ROLES_MINISTERIALES,
    default: "miembro"
  },

  // Ministerios en los que sirve
  ministerios: [{
    nombre: { type: String, enum: MINISTERIOS },
    cargo: { type: String, enum: ["lider", "sublider", "miembro"] },
    fechaInicio: { type: Date, default: Date.now },
    activo: { type: Boolean, default: true }
  }]
}, { _id: false });

// 4. Perfil Social (Red Social)
const PerfilSocialSchema = new Schema({
  username: { type: String, unique: true, sparse: true, trim: true }, // @usuario
  fotoPerfil: { type: String, default: "" },
  fotoBanner: { type: String, default: "" },
  biografia: { type: String, maxlength: 500 },
  sitioWeb: { type: String, trim: true },

  // Estadísticas cacheadas (para rendimiento)
  stats: {
    amigos: { type: Number, default: 0 },
    seguidores: { type: Number, default: 0 },
    siguiendo: { type: Number, default: 0 },
    posts: { type: Number, default: 0 }
  },

  // Configuración de Privacidad
  privacidad: {
    perfilPublico: { type: Boolean, default: true },
    mostrarEmail: { type: Boolean, default: false },
    mostrarTelefono: { type: Boolean, default: false },
    permitirMensajes: { type: Boolean, default: true },
    permitirEtiquetas: { type: Boolean, default: true }
  }
}, { _id: false });

// 5. Seguridad y Sistema
const SeguridadSchema = new Schema({
  rolSistema: {
    type: String,
    enum: ROLES_SISTEMA,
    default: "usuario"
  },
  estadoCuenta: {
    type: String,
    enum: ["activo", "inactivo", "suspendido", "pendiente_validacion", "eliminado"],
    default: "pendiente_validacion"
  },
  fechaSuspension: { type: Date }, // Fecha de inicio
  suspensionFin: { type: Date }, // Fecha fin de suspensión temporal
  motivoSuspension: { type: String },
  verificado: { type: Boolean, default: false }, // Check azul

  // Permisos Granulares (ACL)
  permisos: {
    crearEventos: { type: Boolean, default: false },
    gestionarUsuarios: { type: Boolean, default: false },
    gestionarFinanzas: { type: Boolean, default: false },
    publicarNoticias: { type: Boolean, default: false },
    accesoPanelAdmin: { type: Boolean, default: false },
    moderarContenido: { type: Boolean, default: false }
  },

  // Auditoría
  ultimoLogin: { type: Date },
  ultimaConexion: { type: Date }, // Para estado online/offline en tiempo real
  ipUltimoLogin: { type: String },
  intentosFallidos: { type: Number, default: 0 },
  cambioPassword: { type: Date },
  versionTerminos: { type: Number, default: 1 }
}, { _id: false });

// 6. Perfil Publicitario (Para Sistema de Anuncios Segmentados)
const PerfilPublicitarioSchema = new Schema({
  // Intereses inferidos automáticamente basados en actividad
  intereses: [{ type: String, trim: true }], // ['religión', 'deportes', 'tecnología', 'música']

  // Ubicación para anuncios locales (con consentimiento)
  ubicacion: {
    ciudad: { type: String, trim: true },
    pais: { type: String, trim: true },
    coordenadas: {
      type: { type: String, default: 'Point' },
      coordinates: [Number] // [lng, lat] - Orden importante para MongoDB geoespacial
    },
    consentimientoUbicacion: { type: Boolean, default: false }
  },

  // Preferencias de publicidad (GDPR/CCPA compliance)
  consentimientoPublicidad: { type: Boolean, default: true }, // Acepta ver anuncios
  publicidadPersonalizada: { type: Boolean, default: true }, // Acepta segmentación

  // Historial de interacciones con anuncios (para evitar repetición)
  anunciosVistos: [{
    anuncioId: { type: Schema.Types.ObjectId, ref: 'Ad' },
    vecesVisto: { type: Number, default: 0 },
    ultimaVista: { type: Date, default: Date.now }
  }],

  // Metadata
  ultimaActualizacionIntereses: { type: Date, default: Date.now }
}, { _id: false });

// ==========================================
// 🔹 SCHEMA PRINCIPAL
// ==========================================

const UserV2Schema = new Schema({
  // Identidad Core
  nombres: {
    primero: { type: String, required: true, trim: true },
    segundo: { type: String, trim: true }
  },
  apellidos: {
    primero: { type: String, required: true, trim: true },
    segundo: { type: String, trim: true }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Email inválido']
  },
  password: { type: String, required: true, select: false }, // Hash argon2

  // Username único para URLs amigables
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'El username debe tener al menos 3 caracteres'],
    maxlength: [30, 'El username no puede exceder 30 caracteres'],
    match: [/^[a-z0-9._]+$/, 'El username solo puede contener letras minúsculas, números, puntos y guiones bajos']
  },

  // Flags de Tipo de Usuario (Discriminadores Lógicos)
  esMiembroFundacion: { type: Boolean, default: false, index: true },
  esMiembroIglesia: { type: Boolean, default: false, index: true },

  // Integración de Módulos
  personal: { type: InfoPersonalSchema, default: () => ({}) },
  fundacion: { type: PerfilFundacionSchema }, // Opcional, solo si esMiembroFundacion
  eclesiastico: { type: PerfilEclesiasticoSchema }, // Opcional, solo si esMiembroIglesia
  social: { type: PerfilSocialSchema, default: () => ({}) },
  seguridad: { type: SeguridadSchema, default: () => ({}) },
  perfilPublicitario: { type: PerfilPublicitarioSchema, default: () => ({}) }, // Para sistema de anuncios

  // Relaciones Sociales (Arrays de IDs)
  // Se mantienen como arrays de IDs por compatibilidad, aunque se recomienda mover a colecciones pivote para escalabilidad masiva
  amigos: [{ type: Schema.Types.ObjectId, ref: 'UserV2' }],
  solicitudesAmistad: [{
    usuario: { type: Schema.Types.ObjectId, ref: 'UserV2' },
    estado: { type: String, enum: ['enviada', 'recibida'] },
    fecha: { type: Date, default: Date.now }
  }],
  grupos: [{ type: Schema.Types.ObjectId, ref: 'Group' }],

  // Posts guardados
  savedPosts: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'Post'
    }],
    default: []
  },

  // Usuarios favoritos
  usuariosFavoritos: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'UserV2'
    }],
    default: []
  },

  // RollingCode / E-commerce (Legacy support)
  carrito: { type: Schema.Types.ObjectId, ref: 'Cart' },
  favoritos: [{ type: Schema.Types.ObjectId, ref: 'Product' }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// 🔹 VIRTUALS Y MÉTODOS
// ==========================================

// Nombre completo virtual
UserV2Schema.virtual('nombreCompleto').get(function () {
  return `${this.nombres.primero} ${this.apellidos.primero}`;
});

// Método para limpiar respuesta JSON
UserV2Schema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Middleware para hashear la contraseña antes de guardar
UserV2Schema.pre('save', async function (next) {
  // Solo hashear si la contraseña fue modificada o es nueva
  if (!this.isModified('password')) return next();

  try {
    this.password = await argon2.hash(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
UserV2Schema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    return false;
  }
};

// ==========================================
// 🔹 ÍNDICES (OPTIMIZACIÓN)
// ==========================================

// Búsquedas básicas
UserV2Schema.index({ "nombres.primero": 1, "apellidos.primero": 1 });
// UserV2Schema.index({ "social.username": 1 }); // Comentado por duplicidad con unique: true en schema

// Búsquedas Geográficas y Organizacionales (Fundación)
// Permite: "Buscar directores regionales en Colombia"
UserV2Schema.index({
  "esMiembroFundacion": 1,
  "fundacion.territorio.pais": 1,
  "fundacion.nivel": 1,
  "fundacion.area": 1
});

// Búsquedas Eclesiásticas
// Permite: "Buscar pastores de la iglesia X"
UserV2Schema.index({
  "esMiembroIglesia": 1,
  "eclesiastico.iglesia": 1,
  "eclesiastico.rolPrincipal": 1
});

const UserV2 = model('UserV2', UserV2Schema);

// Registrar alias 'User' apuntando a la misma colección para compatibilidad con notificaciones antiguas
try {
  model('User');
} catch (error) {
  model('User', UserV2Schema, UserV2.collection.name);
}

module.exports = UserV2;
