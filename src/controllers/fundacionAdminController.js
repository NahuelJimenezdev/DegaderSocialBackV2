const User = require('../models/User.model');
const { formatErrorResponse, formatSuccessResponse } = require('../utils/validators');

/**
 * Obtener usuarios bajo la jurisdicción del director actual
 * GET /api/fundacion/admin/usuarios-jurisdiccion
 */
const getUsuariosBajoJurisdiccion = async (req, res) => {
  try {
    const directorId = req.userId;
    const { 
      pais, 
      region, 
      departamento, 
      municipio, 
      area, 
      nivel,
      page = 1,
      limit = 20
    } = req.query;

    const director = await User.findById(directorId);
    if (!director || !director.esMiembroFundacion || director.fundacion?.estadoAprobacion !== 'aprobado') {
      return res.status(403).json(formatErrorResponse('No tienes permisos de acceso al panel administrativo'));
    }

    const { nivel: nivelDirector, territorio, area: areaDirector, seguridad } = director;
    const esFounder = seguridad?.rolSistema === 'Founder';

    // Jerarquía ordenada
    const nivelesOrdenados = [
      "local", "barrial", "municipal",
      "departamental", "regional", "nacional",
      "organismo_internacional", "organo_control", "directivo_general"
    ];

    const indexNivelDirector = nivelesOrdenados.indexOf(nivelDirector?.toLowerCase());
    
    // Si no es Founder ni nivel global, puede ver SU MISMO NIVEL y los niveles inferiores
    const nivelesVisibles = esFounder 
      ? nivelesOrdenados 
      : indexNivelDirector !== -1 
        ? nivelesOrdenados.slice(0, indexNivelDirector + 1)
        : [];

    const query = {
      esMiembroFundacion: true,
      'fundacion.estadoAprobacion': 'aprobado'
    };

    // --- FILTROS OPCIONALES SOLICITADOS DEL FRONTEND ---
    // (Iniciamos con todos, pero la jerarquía sobreescribirá lo que no tengan permiso de saltarse)
    if (nivel) query['fundacion.nivel'] = nivel;
    if (area) query['fundacion.area'] = area;
    if (pais) query['fundacion.territorio.pais'] = pais;
    if (region) query['fundacion.territorio.region'] = region;
    if (departamento) query['fundacion.territorio.departamento'] = departamento;
    if (municipio) query['fundacion.territorio.municipio'] = municipio;

    // --- RESTRICCIONES DURAS (INQUEBRANTABLES) ---
    if (!esFounder) {
      // 1. RESTRICCIÓN DE JERARQUÍA (NIVEL)
      if (nivel) {
        // Validar que el nivel que se busca esté en su rango visible
        if (!nivelesVisibles.includes(nivel.toLowerCase())) {
          query['fundacion.nivel'] = 'BLOQUEADO'; // Fuerza que la DB regrese vacío
        }
      } else {
        query['fundacion.nivel'] = { $in: nivelesVisibles };
      }

      // 2. RESTRICCIÓN DE TERRITORIO
      // El país es inamovible
      if (territorio?.pais) {
        query['fundacion.territorio.pais'] = territorio.pais;
      }

      // Escalera jerárquica territorial
      if (nivelDirector === 'regional' && territorio?.region) {
        query['fundacion.territorio.region'] = territorio.region;
      } else if (nivelDirector === 'departamental' && territorio?.departamento) {
        query['fundacion.territorio.departamento'] = territorio.departamento;
      } else if (nivelDirector === 'municipal' && territorio?.municipio) {
        query['fundacion.territorio.municipio'] = territorio.municipio;
      }

      // 3. RESTRICCIÓN DE ÁREA / SECCIÓN
      // Los Directores Generales y Globales no tienen límite de área. Los demás (incluyendo Secretarios)
      // solo pueden observar usuarios de SU MISMA área.
      const nivelesGlobales = ['directivo_general', 'organo_control', 'organismo_internacional'];
      const esGlobal = nivelesGlobales.includes(nivelDirector);
      
      const cargoDirector = director.fundacion?.cargo ? director.fundacion.cargo.trim() : '';
      const esDirectorGeneral = ['Director General (Pastor)', 'Director General', 'Sub-Director General', 'secretario Director General', 'secretario Sub-Director General'].includes(cargoDirector);

      if (!esGlobal && !esDirectorGeneral && areaDirector) {
        query['fundacion.area'] = areaDirector;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const usuarios = await User.find(query)
      .select('nombres apellidos email social.fotoPerfil fundacion createdAt')
      .sort({ 'nombres.primero': 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json(formatSuccessResponse('Usuarios obtenidos exitosamente', {
      usuarios,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }));

  } catch (error) {
    console.error('Error al obtener usuarios bajo jurisdicción:', error);
    res.status(500).json(formatErrorResponse('Error al obtener usuarios', [error.message]));
  }
};

module.exports = {
  getUsuariosBajoJurisdiccion
};
