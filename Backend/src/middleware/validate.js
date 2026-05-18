const { validationResult } = require("express-validator");
const { ValidationError } = require("../utils/errors");

/**
 * Runs an array of express-validator chains, then short-circuits with a
 * ValidationError if any rule fails.
 *
 * Usage:
 *   const { body } = require('express-validator');
 *
 *   router.post(
 *     '/login',
 *     validate([
 *       body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
 *       body('password').isLength({ min: 8 }).withMessage('Min 8 characters'),
 *     ]),
 *     loginController,
 *   );
 */
const validate = (validators) => async (req, res, next) => {
  try {
    for (const validator of validators) {
      await validator.run(req);
    }

    const result = validationResult(req);
    if (!result.isEmpty()) {
      const errors = result.array().map(({ path, msg }) => ({
        field: path,
        message: msg,
      }));
      return next(new ValidationError("Request validation failed", errors));
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validate };
