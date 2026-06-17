// middleware/validateObjectId.js
import mongoose from "mongoose";

/**
 * validateObjectId("id")
 * - Blocks invalid ObjectId params before they hit Mongoose queries
 * - Prevents CastError -> 500 crashes
 */
export default function validateObjectId(paramName = "id") {
  return (req, res, next) => {
    const value = req.params?.[paramName];

    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}.`,
      });
    }

    next();
  };
}
