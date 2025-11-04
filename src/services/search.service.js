const User = require('../models/User');
const Post = require('../models/Post');
const Grupo = require('../models/Grupo');
const Evento = require('../models/Evento');

class SearchService {
  /**
   * Búsqueda global
   */
  async globalSearch(query, tipo = 'all', page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const results = {};

    if (tipo === 'all' || tipo === 'usuarios') {
      results.usuarios = await User.find({
        $or: [
          { nombre: { $regex: query, $options: 'i' } },
          { apellido: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ],
        activo: true
      })
        .select('-password')
        .limit(limit)
        .skip(skip);
    }

    if (tipo === 'all' || tipo === 'publicaciones') {
      results.publicaciones = await Post.find({
        contenido: { $regex: query, $options: 'i' },
        activo: true
      })
        .populate('autor', 'nombre apellido avatar')
        .limit(limit)
        .skip(skip);
    }

    if (tipo === 'all' || tipo === 'grupos') {
      results.grupos = await Grupo.find({
        $or: [
          { nombre: { $regex: query, $options: 'i' } },
          { descripcion: { $regex: query, $options: 'i' } }
        ],
        activo: true,
        tipo: { $ne: 'secreto' }
      })
        .populate('creador', 'nombre apellido avatar')
        .limit(limit)
        .skip(skip);
    }

    if (tipo === 'all' || tipo === 'eventos') {
      results.eventos = await Evento.find({
        $or: [
          { titulo: { $regex: query, $options: 'i' } },
          { descripcion: { $regex: query, $options: 'i' } }
        ],
        activo: true
      })
        .populate('creador', 'nombre apellido avatar')
        .limit(limit)
        .skip(skip);
    }

    return results;
  }
}

module.exports = new SearchService();
