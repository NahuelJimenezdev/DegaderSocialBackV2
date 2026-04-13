const UserV2 = require('../models/User.model');

/**
 * Servicio para resolver lógica de jerarquía institucional FHS&L
 */

/* -------------------------------------------------------------------------- */
/*      DATOS OFICIALES EXACTOS SEGÚN LA MEMORIA DEL PROYECTO FHS&L          */
/* -------------------------------------------------------------------------- */

// Áreas institucionales oficiales (Sincronizado con User.model.js)
const AREAS = [
  "Dirección Ejecutiva", "Secretaría Ejecutiva", "Junta Directiva", "Equipo de Licitación y Adquisiciones",
  "Director General FHIS&L", "Secretario General FHIS&L",
  "Dirección de Control Interno y Seguimiento", "Dirección de Asuntos Éticos", "Dirección Asuntos Ético",
  "Control Interno", "Seguimiento de Proyectos", "FHISYL", "Nacional",
  "Salvación Mundial", "Misión Internacional de Paz",
  "Salvación Latinoamérica", "Embajadores",
  "Despacho del Director", "Despacho del Subdirector",
  "Dirección de Planeación Estratégica y Proyectos", "Dirección de Asuntos Étnicos", "Dirección de Infraestructura", "Dirección de Sostenibilidad Ambiental", "Dirección de Recursos Humanos y Seguridad Laboral", "Dirección Jurídica", "Dirección de Salud", "Dirección de Educación", "Dirección Financiera", "Dirección de Imagen Corporativa y Comunicación", "Dirección de Seguridad",
  "Coordinación de Planeación Estratégica y Proyectos", "Coordinación de Asuntos Étnicos", "Coordinación de Infraestructura", "Coordinación de Sostenibilidad Ambiental", "Coordinación de Recursos Humanos y Seguridad Laboral", "Coordinación Jurídica", "Coordinación de Salud", "Coordinación de Educación", "Coordinación Financiera", "Coordinación de Imagen Corporativa y Comunicación", "Coordinación de Seguridad",
  // Afiliados
  "Afiliado"
];

// Subáreas
const SUBAREAS = [
  "Dirección Psicosocial", "Dirección de Protección Animal", "Gerencia Clínica", "Gerencia Clínica Veterinaria", "Interventoría Interna", "Interventoría Externo"
];

// Programas
const PROGRAMAS = [
  "Banco de Proyectos", "Programa de Conexión y Desarrollo Informático", "Programa de Estrategias Comerciales de Desarrollo Productivo",
  "Programas de Asuntos y Competencia Laboral", "Programas de Bienestar y Seguridad Laboral", "Programa de Gestión Documental y Almacén",
  "Contratación", "Banco de Oferentes", "Programa de Jueces de Paz",
  "Programas de Salud", "Programas de Salud Mental", "Programas de Salud Sexual y Reproductiva", "Programas de Acompañamiento Productivo",
  "Programas de Promoción y Prevención en la Salud Animal",
  "Programas de Educación", "Programas de Cultura y Turismo", "Gerencias Universitarias",
  "Programas de Tesorería", "Programas de Contabilidad",
  "Comunicaciones de Prensa", "Programas de Radio y Televisión"
];

// Cargos institucionales oficiales
const CARGOS = [
  "Director Ejecutivo", "Secretario Ejecutivo", "Miembro de Junta Directiva", "Equipo de Licitación y Adquisiciones",
  "Dirección de Control Interno y Seguimiento", "Dirección Asuntos Ético",
  "Salvación Mundial", "Secretario Salvación Mundial", "Misión Internacional de Paz", "Secretario Misión Internacional de Paz",
  "Director de Áreas", "Secretario/a Director de Áreas", "Sub-Director de Áreas", "Secretario/a Sub-Director de Áreas", "Director General", "Sub-Director General", "secretario Director General", "secretario Sub-Director General",
  "Director", "Subdirector", "Director Nacional", "Director Regional", "Director Departamental", "Coordinador Municipal", "Coordinador", "Director General (Pastor)", "Auditor", "Secretario/a", "Miembro Comité Ético", "Delegado Internacional",
  // Afiliados
  "Afiliado"
];

// Niveles institucionales oficiales
const NIVELES = [
  "directivo_general", "organo_control", "organismo_internacional", "nacional", "regional", "departamental", "municipal", "local", "barrial", "afiliado"
];

/* -------------------------------------------------------------------------- */
/*                        RESOLVER DE USUARIOS POR JERARQUÍA                  */
/* -------------------------------------------------------------------------- */

const resolverUsuariosPorJerarquia = async ({ nivel, cargo, area, subArea, programa, pais, provincia, ciudad }) => {
  try {
    const query = {
      esMiembroFundacion: true,
      'fundacion.estadoAprobacion': 'aprobado'
    };

    // 1. Filtro de Nivel (si no es "Todas")
    if (nivel && nivel !== 'Todas') {
      query['fundacion.nivel'] = nivel;
    }

    // 2. Filtro de Cargo (si no es "Todos")
    if (cargo && cargo !== 'Todos') {
      query['fundacion.cargo'] = cargo;
    }

    // 3. Filtro de Área (si no es "Todas")
    if (area && area !== 'Todas') {
      query['fundacion.area'] = area;
    }

    // 4. Filtro de SubÁrea (si no es "Todas")
    if (subArea && subArea !== 'Todas') {
      query['fundacion.subArea'] = subArea;
    }

    // 5. Filtro de Programa (si no es "Todos")
    if (programa && programa !== 'Todos') {
      query['fundacion.programa'] = programa;
    }

    // 6. Filtros geográficos según nivel
    if (pais) query['fundacion.territorio.pais'] = pais;
    
    // Solo aplicar subdivisiones si el nivel lo requiere (o si se proporcionan explícitamente)
    if (provincia && ['regional', 'departamental', 'municipal', 'local', 'barrial'].includes(nivel)) {
      query['fundacion.territorio.departamento'] = provincia;
    }

    if (ciudad && ['municipal', 'local', 'barrial'].includes(nivel)) {
      query['fundacion.territorio.municipio'] = ciudad;
    }

    console.log('🔍 [JerarquiaResolver] Query Dinámica:', JSON.stringify(query));

    const usuarios = await UserV2.find(query).select(
      '_id email nombres apellidos fundacion'
    );

    console.log(`✅ [JerarquiaResolver] Encontrados ${usuarios.length} usuarios que coinciden con los criterios`);

    return usuarios;

  } catch (error) {
    console.error('❌ [JerarquiaResolver] Error:', error);
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/*              ESTRUCTURA PARA EL FRONTEND (AREAS, CARGOS, NIVELES)          */
/* -------------------------------------------------------------------------- */

const obtenerEstructuraJerarquia = () => {
  return {
    areas: AREAS,
    subAreas: SUBAREAS,
    programas: PROGRAMAS,
    cargos: CARGOS,
    niveles: NIVELES
  };
};

module.exports = {
  resolverUsuariosPorJerarquia,
  obtenerEstructuraJerarquia
};
