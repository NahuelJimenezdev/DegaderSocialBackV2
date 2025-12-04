const UserV2 = require('../models/User.model');

/**
 * Servicio para resolver lógica de jerarquía institucional FHS&L
 */

/* -------------------------------------------------------------------------- */
/*      DATOS OFICIALES EXACTOS SEGÚN LA MEMORIA DEL PROYECTO FHS&L          */
/* -------------------------------------------------------------------------- */

// Áreas institucionales oficiales
const AREAS = [
  'Dirección Ejecutiva',
  'Junta Directiva',
  'Secretaría Ejecutiva',
  'Licitación y Adquisiciones',

  'Control Interno y Seguimiento',
  'Asuntos Éticos',

  'Salvación Mundial',
  'Misión Internacional de Paz',

  'Planeación Estratégica y Proyectos',
  'Asuntos Étnicos',
  'Infraestructura',
  'Sostenibilidad Ambiental',
  'Recursos Humanos y Seguridad Laboral',
  'Jurídica',
  'Salud',
  'Psicosocial',
  'Protección Animal',
  'Educación',
  'Financiera',
  'Imagen Corporativa y Comunicación',
  'Seguridad'
];

// Cargos institucionales oficiales
const CARGOS = [
  'Director Ejecutivo',
  'Directivo Nacional',
  'Secretaría Ejecutiva',
  'Equipo de Licitación y Adquisiciones',

  'Auditor de Control Interno',
  'Miembro Comité Ético',

  'Delegado Salvación Mundial',
  'Delegado Misión Internacional de Paz',

  'Director Nacional',
  'Director Regional',
  'Director Departamental',
  'Coordinador Municipal',

  'Profesional',
  'Encargado',
  'Asistente',
  'Voluntario'
];

// Niveles institucionales oficiales
const NIVELES = [
  'directivo_general',
  'organo_control',
  'organismo_internacional',
  'nacional',
  'regional',
  'departamental',
  'municipal'
];

/* -------------------------------------------------------------------------- */
/*                        RESOLVER DE USUARIOS POR JERARQUÍA                  */
/* -------------------------------------------------------------------------- */

const resolverUsuariosPorJerarquia = async ({ area, nivel, pais, provincia, ciudad }) => {
  try {

    const query = {
      'fundacion.area': area,
      'fundacion.estado': 'active'
    };

    // Filtros geográficos según nivel
    if (nivel === 'nacional') {
      if (pais) query['ubicacion.pais'] = pais;
    }

    if (nivel === 'regional') {
      if (pais) query['ubicacion.pais'] = pais;
    }

    if (nivel === 'departamental') {
      if (pais) query['ubicacion.pais'] = pais;
      if (provincia) query['ubicacion.subdivision'] = provincia;
    }

    if (nivel === 'municipal') {
      if (pais) query['ubicacion.pais'] = pais;
      if (provincia) query['ubicacion.subdivision'] = provincia;
      if (ciudad) query['ubicacion.ciudad'] = ciudad;
    }

    // Cargos por nivel basados en estructura real FHS&L
    let cargosObjetivo = [];

    switch (nivel) {
      case 'directivo_general':
        cargosObjetivo = ['Director Ejecutivo', 'Directivo Nacional'];
        break;

      case 'organo_control':
        cargosObjetivo = ['Auditor de Control Interno', 'Miembro Comité Ético'];
        break;

      case 'organismo_internacional':
        cargosObjetivo = ['Delegado Salvación Mundial', 'Delegado Misión Internacional de Paz'];
        break;

      case 'nacional':
        cargosObjetivo = ['Director Nacional'];
        break;

      case 'regional':
        cargosObjetivo = ['Director Regional'];
        break;

      case 'departamental':
        cargosObjetivo = ['Director Departamental'];
        break;

      case 'municipal':
        cargosObjetivo = ['Coordinador Municipal', 'Profesional', 'Encargado', 'Voluntario'];
        break;

      default:
        cargosObjetivo = CARGOS;
        break;
    }

    // Agregar filtro de cargos
    query['fundacion.cargo'] = { $in: cargosObjetivo };

    console.log('🔍 [JerarquiaResolver] Query:', JSON.stringify(query));

    const usuarios = await UserV2.find(query).select(
      '_id email nombreUsuario apellidoUsuario fundacion ubicacion'
    );

    console.log(`✅ [JerarquiaResolver] Encontrados ${usuarios.length} usuarios en ${area} - ${nivel}`);

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
    cargos: CARGOS,
    niveles: NIVELES
  };
};

module.exports = {
  resolverUsuariosPorJerarquia,
  obtenerEstructuraJerarquia,
  AREAS,
  CARGOS,
  NIVELES
};
