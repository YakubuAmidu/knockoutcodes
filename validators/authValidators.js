// validators/authValidator.js
import { body } from "express-validator";

function cleanSpaces(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export const registerValidator = [
  body("name")
    .customSanitizer(cleanSpaces)
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters")
    .matches(/^[a-zA-ZÀ-ÿ0-9.'\- ]+$/)
    .withMessage("Name contains invalid characters"),

  body("email")
    .customSanitizer((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .isLength({ max: 120 })
    .withMessage("Email is too long")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be 8-72 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must include at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must include at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must include at least one number"),
];

export const loginValidator = [
  body("email")
    .customSanitizer((value) =>
      String(value || "")
        .trim()
        .toLowerCase(),
    )
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .isLength({ max: 120 })
    .withMessage("Email is too long")
    .normalizeEmail(),

  body("password")
    .customSanitizer((value) => String(value || ""))
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Password is invalid"),
];
