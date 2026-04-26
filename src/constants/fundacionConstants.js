// ==========================================
// 🔹 ENUMS Y CONSTANTES (Fuente de Verdad)
// ==========================================

// Niveles jerárquicos Fundación (Eje Y: de arriba → abajo)
const NIVELES_FUNDACION = [
  "directivo_general",         // Gobierno Estratégico Global (Presidente, Junta)
  "organo_control",            // Control Interno, Comité Ético
  "organismo_internacional",   // Salvación Mundial, Misión Internacional de Paz
  "internacional",             // Direcciones Programáticas Internacionales
  "continental",               // Macroregiones (auto-derivado del país)
  "nacional",
  "regional",
  "departamental",
  "municipal",
  "local",                     // Solo referencia territorial (sin jerarquía)
  "barrial",                   // Solo referencia territorial (sin jerarquía)
  "afiliado"                   // Sin poder jerárquico, participante económico
];

// Mapeo numérico para comparaciones de jerarquía (menor = menos poder)
const NIVELES_MAP = {
  "afiliado": 0, "barrial": 1, "local": 2,
  "municipal": 3, "departamental": 4, "regional": 5,
  "nacional": 6, "continental": 7, "internacional": 8,
  "organismo_internacional": 9, "organo_control": 10,
  "directivo_general": 11
};

// Orden ascendente (para escalada y comparación jerárquica)
const NIVELES_ORDENADOS_ASC = [
  "afiliado", "local", "barrial", "municipal",
  "departamental", "regional", "nacional",
  "continental", "internacional",
  "organismo_internacional", "organo_control", "directivo_general"
];

// Mapeo de País a Continente
const PAIS_A_CONTINENTE = {
  // Sudamérica
  "Colombia": "Sudamérica", "Argentina": "Sudamérica", "Brasil": "Sudamérica",
  "Chile": "Sudamérica", "Perú": "Sudamérica", "Venezuela": "Sudamérica",
  "Ecuador": "Sudamérica", "Bolivia": "Sudamérica", "Paraguay": "Sudamérica",
  "Uruguay": "Sudamérica", "Guyana": "Sudamérica", "Surinam": "Sudamérica",
  // Centroamérica y Caribe
  "Panamá": "Centroamérica", "Costa Rica": "Centroamérica", "Guatemala": "Centroamérica",
  "Honduras": "Centroamérica", "Nicaragua": "Centroamérica", "El Salvador": "Centroamérica",
  "Belice": "Centroamérica", "Cuba": "Centroamérica", "República Dominicana": "Centroamérica",
  "Puerto Rico": "Centroamérica", "Haití": "Centroamérica", "Jamaica": "Centroamérica",
  // Norteamérica
  "México": "Norteamérica", "Estados Unidos": "Norteamérica", "Canadá": "Norteamérica",
  // Europa
  "España": "Europa", "Francia": "Europa", "Italia": "Europa",
  "Alemania": "Europa", "Portugal": "Europa", "Reino Unido": "Europa",
  "Países Bajos": "Europa", "Suiza": "Europa", "Rusia": "Europa"
  // ... (se puede expandir según sea necesario)
};

const getContinente = (pais) => {
  if (!pais) return "Otros";
  return PAIS_A_CONTINENTE[pais] || "Otros";
};


const AREAS_FUNDACION = [
  // Eje X: 11 Áreas oficiales
  "Dirección de Planeación Estratégica y Proyectos", 
  "Dirección de Asuntos Étnicos", 
  "Dirección de Infraestructura", 
  "Dirección de Sostenibilidad Ambiental", 
  "Dirección de Recursos Humanos y Seguridad Laboral", 
  "Dirección Jurídica", 
  "Dirección de Salud", 
  "Dirección de Educación", 
  "Dirección Financiera", 
  "Dirección de Imagen Corporativa y Comunicación", 
  "Dirección de Seguridad",
  // Áreas de Coordinación (Nivel Departamental/Municipal) correspondientes
  "Coordinación de Planeación Estratégica y Proyectos", 
  "Coordinación de Asuntos Étnicos", 
  "Coordinación de Infraestructura", 
  "Coordinación de Sostenibilidad Ambiental", 
  "Coordinación de Recursos Humanos y Seguridad Laboral", 
  "Coordinación Jurídica", 
  "Coordinación de Salud", 
  "Coordinación de Educación", 
  "Coordinación Financiera", 
  "Coordinación de Imagen Corporativa y Comunicación", 
  "Coordinación de Seguridad",
  
  // Áreas legacy / históricas / específicas
  "Dirección y organismo Ejecutivo",
  "Dirección Ejecutiva", 
  "Secretaría Ejecutiva", 
  "Junta Directiva", 
  "Equipo de Licitación y Adquisiciones",
  "Director General FHIS&L", 
  "Secretario General FHIS&L",
  "Dirección de Control Interno y Seguimiento", 
  "Dirección de Asuntos Éticos", 
  "Dirección Asuntos Ético",
  "Control Interno", 
  "Seguimiento de Proyectos", 
  "FHISYL", 
  "Nacional",
  "Salvación Mundial", 
  "Misión Internacional de Paz",
  "Salvación Latinoamérica", 
  "Embajadores",
  "Despacho del Director", 
  "Despacho del Subdirector",
  "Afiliado"
];

// Subdirecciones / Unidades internas
const SUBAREAS_FUNDACION = [
  "Dirección Psicosocial", "Dirección de Protección Animal", "Gerencia Clínica", "Gerencia Clínica Veterinaria", "Interventoría Interna", "Interventoría Externa", "Interventoría Externo"
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
  // ═══ Máxima Autoridad (ÚNICO) ═══
  "Presidente-Representante Legal", 
  
  // ═══ Directivo General ═══
  "Director Ejecutivo",
  "Secretario Ejecutivo",  
  "Miembro de Junta Directiva",
  "Equipo de Licitación y Adquisiciones",
  
  // ═══ Órganos de Control ═══
  "Auditor",
  "Miembro Comité Ético",
  "Dirección de Control Interno y Seguimiento", // legacy
  "Dirección Asuntos Ético", // legacy
  
  // ═══ Organismos Internacionales ═══
  "Delegado",
  "Director",
  "Secretario/a",
  
  // ═══ Cargos Territoriales (Director General del territorio) ═══
  "Director General",                
  "Subdirector General",             
  "Secretario Director General",     
  "Secretario Subdirector General",  
  
  // Cargos legacy para mantener compatibilidad pre-migración:
  "Director General (Pastor)",
  "Sub-Director General",
  "secretario Director General",
  "secretario Sub-Director General",
  
  // ═══ Cargos por Nivel Territorial Específico ═══
  "Director Nacional",
  "Subdirector Nacional",            
  "Director Regional",
  "Subdirector Regional",            
  "Director Departamental",
  "Subdirector Departamental",       
  "Coordinador Municipal",           
  "Subdirector Municipal",           
  
  // ═══ Cargos de Áreas/Programas ═══
  "Director de Áreas",
  "Subdirector de Áreas",            
  "Secretario/a Director de Áreas",
  "Secretario/a Subdirector de Áreas", 
  
  // Cargos legacy:
  "Sub-Director de Áreas",
  "Secretario/a Sub-Director de Áreas",
  "Director",
  "Subdirector",
  
  // ═══ Cargos Funcionales / Extras ═══  
  "Coordinador",
  "Secretario/a",
  
  // ═══ Afiliados ═══
  "Afiliado"
];

// Roles funcionales (qué hace)
const ROLES_FUNCIONALES = [
  "profesional",     
  "técnico",         
  "asistente",       
  "secretario/a",    
  "voluntario",      
  "pastor",
  "encargado"        // Mantener por legacy   
];

// Array helper de cargos directivos
const CARGOS_DIRECTIVOS = [
  'Presidente-Representante Legal',
  'Director General (Pastor)',
  'Director General',
  'Sub-Director General',
  'Subdirector General',
  'secretario Director General',
  'Secretario Director General',
  'secretario Sub-Director General',
  'Secretario Subdirector General',
  'Director Nacional',
  'Subdirector Nacional',
  'Director Regional',
  'Subdirector Regional',
  'Director Departamental',
  'Subdirector Departamental',
  'Coordinador Municipal',
  'Subdirector Municipal'
];

module.exports = {
  NIVELES_FUNDACION,
  NIVELES_MAP,
  NIVELES_ORDENADOS_ASC,
  PAIS_A_CONTINENTE,
  getContinente,
  AREAS_FUNDACION,
  SUBAREAS_FUNDACION,
  PROGRAMAS_FUNDACION,
  CARGOS_FUNDACION,
  ROLES_FUNCIONALES,
  CARGOS_DIRECTIVOS
};
