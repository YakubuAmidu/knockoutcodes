// middleware/validate.js
export function validate(rules) {
  return async (req, res, next) => {
    for (const rule of rules) {
      // each rule is a validation chain from express-validator
      // eslint-disable-next-line no-await-in-loop
      await rule.run(req);
    }

    const { validationResult } = await import("express-validator");
    const result = validationResult(req);

    if (result.isEmpty()) return next();

    const errors = result.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  };
}
