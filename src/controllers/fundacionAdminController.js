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
    
    // Si no es Founder ni nivel global, solo ve niveles inferiores
    const nivelesVisibles = esFounder 
      ? nivelesOrdenados 
      : nivelesOrdenados.slice(0, indexNivelDirector);

    const query = {
      esMiembroFundacion: true,
      'fundacion.estadoAprobacion': 'aprobado'
    };

    // Aplicar restricción de niveles
    if (!esFounder) {
      query['fundacion.nivel'] = { $in: nivelesVisibles };
    }

    // --- RESTRICCIONES TERRITORIALES ---
    if (!esFounder) {
      // Regla de oro: Mismo país siempre (a menos que sea nivel global sin territorio)
      if (territorio?.pais) {
        query['fundacion.territorio.pais'] = territorio.pais;
      }

      // Restricción por nivel del director
      if (nivelDirector === 'regional' && territorio?.region) {
        query['fundacion.territorio.region'] = territorio.region;
      } else if (nivelDirector === 'departamental' && territorio?.departamento) {
        query['fundacion.territorio.departamento'] = territorio.departamento;
      } else if (nivelDirector === 'municipal' && territorio?.municipio) {
        query['fundacion.territorio.municipio'] = territorio.municipio;
      }
    }

    // --- FILTROS OPCIONALES DEL FRONTEND ---
    if (nivel) query['fundacion.nivel'] = nivel;
    if (area) query['fundacion.area'] = area;
    if (pais) query['fundacion.territorio.pais'] = pais;
    if (region) query['fundacion.territorio.region'] = region;
    if (departamento) query['fundacion.territorio.departamento'] = departamento;
    if (municipio) query['fundacion.territorio.municipio'] = municipio;

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
