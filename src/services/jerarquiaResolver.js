const UserV2 = require('../models/User.model');

/**
 * Servicio para resolver lógica de jerarquía institucional FHS&L
 */

/* -------------------------------------------------------------------------- */
/*      DATOS OFICIALES EXACTOS SEGÚN LA MEMORIA DEL PROYECTO FHS&L          */
/* -------------------------------------------------------------------------- */

// Áreas institucionales oficiales (Sincronizado con User.model.js)
const {
  AREAS_FUNDACION: AREAS,
  SUBAREAS_FUNDACION: SUBAREAS,
  PROGRAMAS_FUNDACION: PROGRAMAS,
  CARGOS_FUNDACION: CARGOS,
  NIVELES_FUNDACION: NIVELES
} = require('../constants/fundacionConstants');

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
