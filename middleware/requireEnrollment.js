import Enrollment from "../models/EnrollmentModel.js";

/**
 * Ensures the authenticated user is enrolled in the course.
 * - Looks for courseId in req.params.courseId OR req.params.id OR req.body.courseId
 * - Blocks cancelled / unpaid enrollments
 */
export const requireEnrollment = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    const courseId =
      req.params.courseId || req.params.id || req.body.courseId || req.query.courseId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required for enrollment check.",
      });
    }

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
      status: { $ne: "cancelled" },
      paymentStatus: "paid", // ✅ pro: must be paid to access player
    }).select("_id status paymentStatus progressPercent");

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You must purchase/enroll in this course.",
      });
    }

    // attach for downstream usage if needed
    req.enrollment = enrollment;
    next();
  } catch (error) {
    console.error("requireEnrollment error:", error);
    return res.status(500).json({
      success: false,
      message: "Enrollment check failed.",
      error: error.message,
    });
  }
};
