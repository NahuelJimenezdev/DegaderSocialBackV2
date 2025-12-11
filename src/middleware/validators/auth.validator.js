const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const registerValidation = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),

  body('apellido')
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .isLength({ min: 2 }).withMessage('El apellido debe tener al menos 2 caracteres'),

  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

  validate
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('La contraseña es requerida'),

  validate
];

module.exports = {
  registerValidation,
  loginValidation
};
