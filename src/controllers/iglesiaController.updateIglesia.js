const Iglesia = require('../models/Iglesia');
const { formatErrorResponse, formatSuccessResponse, isValidObjectId } = require('../utils/validators');

/**
 * Actualizar datos de iglesia
 * PUT /api/iglesias/:id
 */
const updateIglesia = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!isValidObjectId(id)) return res.status(400).json(formatErrorResponse('ID inválido'));

    const iglesia = await Iglesia.findById(id);
    if (!iglesia) return res.status(404).json(formatErrorResponse('Iglesia no encontrada'));

    // Verificar que el usuario sea el pastor principal
    if (iglesia.pastorPrincipal.toString() !== req.userId.toString()) {
      return res.status(403).json(formatErrorResponse('Solo el pastor principal puede editar la iglesia'));
    }

    // Actualizar campos permitidos
    const allowedFields = ['nombre', 'descripcion', 'mision', 'vision', 'valores', 'ubicacion', 'contacto', 'horarios'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        iglesia[field] = updateData[field];
      }
    });

    await iglesia.save();

    res.json(formatSuccessResponse('Iglesia actualizada exitosamente', iglesia));
  } catch (error) {
    console.error('Error al actualizar iglesia:', error);
    res.status(500).json(formatErrorResponse('Error al actualizar iglesia', [error.message]));
  }
};

module.exports = { updateIglesia };
