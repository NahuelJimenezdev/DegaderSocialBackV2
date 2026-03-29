const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const argon2 = require('argon2');

// ==========================================
// 🔹 ENUMS Y CONSTANTES
// ==========================================

const ROLES_SISTEMA = ["Founder", "admin", "moderador", "usuario", "soporte"];

// Niveles jerárquicos Fundación
const NIVELES_FUNDACION = [
  "directivo_general", "organo_control", "organismo_internacional", "nacional", "regional", "departamental", "municipal", "local", "barrial"
];

const AREAS_FUNDACION = [
  "Ejecutivo/a",
  // Directivo General
  "Dirección Ejecutiva", "Secretaría Ejecutiva", "Junta Directiva", "Equipo de Licitación y Adquisiciones",
  // Nuevas Áreas Directivo General
  "Director General FHIS&L", "Secretario General FHIS&L",
  // Órganos de Control
  "Dirección de Control Interno y Seguimiento", "Dirección de Asuntos Éticos", "Dirección Asuntos Ético",
  // Nuevas Áreas Órganos de Control
  "Control Interno", "Seguimiento de Proyectos", "FHISYL", "Nacional",
  // Organismos Internacionales
  "Salvación Mundial", "Misión Internacional de Paz",
  // Nuevas Áreas Organismos Internacionales
  "Salvación Latinoamérica", "Embajadores",
  // Áreas Ejecuivas Transversales
  "Despacho del Director", "Despacho del Subdirector",
  // Áreas por nivel nacional/regional/departamental/municipal
  "Dirección de Planeación Estratégica y Proyectos", "Dirección de Asuntos Étnicos", "Dirección de Infraestructura", "Dirección de Sostenibilidad Ambiental", "Dirección de Recursos Humanos y Seguridad Laboral", "Dirección Jurídica", "Dirección de Salud", "Dirección de Educación", "Dirección Financiera", "Dirección de Imagen Corporativa y Comunicación", "Dirección de Seguridad",
  // Áreas de Coordinación (Nivel Departamental/Municipal)
  "Coordinación de Planeación Estratégica y Proyectos", "Coordinación de Asuntos Étnicos", "Coordinación de Infraestructura", "Coordinación de Sostenibilidad Ambiental", "Coordinación de Recursos Humanos y Seguridad Laboral", "Coordinación Jurídica", "Coordinación de Salud", "Coordinación de Educación", "Coordinación Financiera", "Coordinación de Imagen Corporativa y Comunicación", "Coordinación de Seguridad"
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
  // Directivo General (Nuevos)
  "Director Ejecutivo",
  "Secretario Ejecutivo",
  "Miembro de Junta Directiva",
  "Equipo de Licitación y Adquisiciones",

  // Órganos de Control (Nuevos)
  "Dirección de Control Interno y Seguimiento",
  "Dirección Asuntos Ético",
  
  // Organismos Internacionales (Nuevos)
  "Salvación Mundial",
  "Misión Internacional de Paz",

  // Territoriales (Nuevos)
  "Director de Áreas",
  "Secretario/a Director de Áreas",
  "Sub-Director de Áreas",
  "Secretario/a Sub-Director de Áreas",
  "Director General",
  "Sub-Director General",
  "secretario Director General",
  "secretario Sub-Director General",

  // Direcciones por nivel (Antiguos/Mantenidos por compatibilidad)
  "Director", 
  "Subdirector",
  "Director Nacional",
  "Director Regional",
  "Director Departamental",
  "Coordinador Municipal",
  "Coordinador",
  "Director General (Pastor)",
  "Auditor",
  "Secretario/a",
  "Miembro Comité Ético",
  "Delegado Internacional"
];
// Roles funcionales (qué hace)
const ROLES_FUNCIONALES = [
  "profesional",
  "encargado",
  "asistente",
  "secretario/a",
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
  "lider", "director", "maestro", "coordinador", "miembro", "servidor", "adminIglesia"
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
  fechaIngreso: { type: Date }, // Fecha oficial de ingreso (se setea en la primera aprobación)
  fechaSolicitud: { type: Date, default: Date.now }, // Fecha de la última solicitud enviada
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
      return this.activo;
    }
  },

  subArea: { type: String, trim: true }, // Opcional
  programa: { type: String, trim: true }, // Opcional

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

  // Historial de Cargos y Movimientos
  historialCargos: [{
    nivel: String,
    area: String,
    cargo: String,
    territorio: Schema.Types.Mixed,
    fechaCambio: { type: Date, default: Date.now },
    aprobadoPor: { type: Schema.Types.ObjectId, ref: 'UserV2' }
  }],

  // Organismos Internacionales (Si aplica)
  organismoInternacional: {
    pertenece: { type: Boolean, default: false },
    nombre: { type: String, enum: ["Salvación Mundial", "Misión Internacional de Paz"] },
    cargo: { type: String }
  },

  // Documentacion Especifica FHSYL (Aplicativo Republica Argentina)
  documentacionFHSYL: {
    upz: { type: String, trim: true },
    ocupacion: { type: String, trim: true },
    estadoCivil: { type: String, trim: true },
    nombreConyuge: { type: String, trim: true },
    hijos: [{
      nombre: { type: String, trim: true },
      edad: { type: Number }
    }],
    deseaSerCoordinadorLocalidad: { type: Boolean },
    localidadCoordinar: { type: String, trim: true },
    testimonioConversion: { type: String, trim: true },
    llamadoPastoral: { type: String, trim: true },
    virtudes: [{ type: String, trim: true }],
    areasMejora: [{ type: String, trim: true }],
    eventosExito: [{ type: String, trim: true }],
    nombreCongregacionPastorea: { type: String, trim: true },
    alianzaPastores: { type: String, trim: true },
    referencias: [{
      nombre: { type: String, trim: true },
      relacion: { type: String, trim: true },
      contacto: { type: String, trim: true }
    }],
    pastorQueInvito: { type: String, trim: true },
    tieneCasaPropia: { type: Boolean },
    iglesiaTienePropiedad: { type: Boolean },
    necesidadesFamiliaPastoral: [{ type: String, trim: true }],
    necesidadesCongregacion: [{ type: String, trim: true }],
    profesionalesIglesia: { type: String, trim: true },
    proyectoPsicosocial: { type: String, trim: true },
    ultimaActualizacion: { type: Date, default: Date.now }
  },

  // Nueva documentación: Entrevista
  entrevista: {
    completado: { type: Boolean, default: false },
    respuestas: { type: Map, of: String },
    fechaCompletado: { type: Date }
  },

  // Nueva documentación: Hoja de Vida
  hojaDeVida: {
    completado: { type: Boolean, default: false },
    datos: { type: Map, of: Schema.Types.Mixed },
    fechaCompletado: { type: Date }
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

  // Fecha de unión a la iglesia actual
  fechaUnion: { type: Date, default: Date.now },

  // Historial de roles en la iglesia actual (antes de salir)
  historialRoles: [{
    rol: String,
    fechaInicio: { type: Date, default: Date.now },
    fechaFin: Date
  }],

  // Ministerios en los que sirve
  ministerios: [{
    nombre: { type: String, enum: MINISTERIOS },
    cargo: { type: String, enum: ["lider", "sublider", "miembro"] },
    fechaInicio: { type: Date, default: Date.now },
    activo: { type: Boolean, default: true }
  }]
});  // ✅ Removido { _id: false } para permitir _id en ministerios

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
    permitirEtiquetas: { type: Boolean, default: true },
    // Nuevas configuraciones proyectadas
    amigosVisible: { type: String, enum: ['todos', 'amigos', 'solo_yo'], default: 'todos' },
    iglesiaVisible: { type: Boolean, default: true },
    arenaIncognito: { type: Boolean, default: false },
    quienPuedeMensajear: { type: String, enum: ['todos', 'amigos', 'nadie'], default: 'todos' }
  }
}, { _id: false });

// 4.5 Preferencias de Usuario (Tema, Alertas)
const PreferenciasSchema = new Schema({
  tema: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  sonidoAlertas: { type: Boolean, default: true },
  notificaciones: {
    mensajes: { type: Boolean, default: true },
    solicitudes: { type: Boolean, default: true },
    iglesia: { type: Boolean, default: true },
    arena: { type: Boolean, default: true }
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
  preferencias: { type: PreferenciasSchema, default: () => ({}) },
  seguridad: { type: SeguridadSchema, default: () => ({}) },
  perfilPublicitario: { type: PerfilPublicitarioSchema, default: () => ({}) }, // Para sistema de anuncios

  // User Onboarding (Tour Guiado)
  onboarding: {
    hasCompleted: { type: Boolean, default: false },
    currentStep: { type: Number, default: null },
    lastUpdated: { type: Date, default: null }
  },

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
  favoritos: [{ type: Schema.Types.ObjectId, ref: 'Product' }],

  // ==========================================
  // 🏟️ ARENA Y GAMIFICACIÓN (La Senda del Reino)
  // ==========================================
  arena: {
    level: { type: String, enum: ['facil', 'medio', 'dificil', 'experto'], default: 'facil' },
    xp: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    rankPoints: { type: Number, default: 0 }, // Puntos de Gloria (PG)
    league: { type: String, enum: ['discipulo', 'creyente', 'guerrero_luz', 'guardian', 'emisario_reino', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'], default: 'discipulo' },
    streak: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 },
    lastGameAt: { type: Date },
    country: { type: String }, // Cacheado para ranking por país
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    statsByMode: {
      tower: { wins: { type: Number, default: 0 }, gamesPlayed: { type: Number, default: 0 } },
      arena: { wins: { type: Number, default: 0 }, gamesPlayed: { type: Number, default: 0 } },
      territory: { wins: { type: Number, default: 0 }, gamesPlayed: { type: Number, default: 0 } }
    },
    achievements: [{ type: String }],
    completedChallenges: [{ type: Schema.Types.ObjectId, ref: 'Challenge' }], // Anti-farming
    antiCheatFlags: {
      suspiciousAttempts: { type: Number, default: 0 },
      lastIp: { type: String },
      lockedUntil: { type: Date },
      shadowBanned: { type: Boolean, default: false }
    }
  },

  // ==========================================
  // 💎 SUSCRIPCIÓN Y SAAS
  // ==========================================
  subscription: {
    plan: { type: String, enum: ['free', 'pro', 'elite'], default: 'free' },
    expiresAt: { type: Date }
  },

  // ==========================================
  // 💰 ECONOMÍA Y RECOMPENSAS
  // ==========================================
  economy: {
    coins: { type: Number, default: 0 },
    gems: { type: Number, default: 0 },
    xpBoostActiveUntil: { type: Date },
    cosmeticItems: [{ type: String }] // IDs de cosméticos desbloqueados
  }

}, {
  collection: 'userv2',
  timestamps: true,
  toJSON: { virtuals: true, flattenMaps: true },
  toObject: { virtuals: true, flattenMaps: true }
});

// ==========================================
// 🔹 VIRTUALS Y MÉTODOS
// ==========================================

// Nombre completo virtual
UserV2Schema.virtual('nombreCompleto').get(function () {
  return `${this.nombres.primero} ${this.apellidos.primero}`;
});

// Virtual para compatibilidad con el frontend (mapea seguridad.rolSistema a rol)
UserV2Schema.virtual('rol').get(function () {
  return this.seguridad?.rolSistema || 'usuario';
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

// Arena e Índices de Ranking
UserV2Schema.index({ "arena.rankPoints": -1 });
UserV2Schema.index({ "arena.country": 1, "arena.rankPoints": -1 });
UserV2Schema.index({ "arena.level": 1 });

// Índices para Dashboard Founder y Filtros
UserV2Schema.index({ "esMiembroFundacion": 1, "fundacion.estadoAprobacion": 1, "createdAt": -1 });
UserV2Schema.index({ "seguridad.rolSistema": 1 });
UserV2Schema.index({ "seguridad.estadoCuenta": 1 });
UserV2Schema.index({ "fundacion.nivel": 1, "fundacion.territorio.pais": 1 });
UserV2Schema.index({ "esMiembroFundacion": 1, "seguridad.estadoCuenta": 1 });
UserV2Schema.index({ "createdAt": -1 });

const UserV2 = model('UserV2', UserV2Schema);

// Registrar alias 'User' apuntando a la misma colección para compatibilidad con notificaciones antiguas
try {
  model('User');
} catch (error) {
  model('User', UserV2Schema, UserV2.collection.name);
}

module.exports = UserV2;
