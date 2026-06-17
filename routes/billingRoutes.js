// // routes/billingRoutes.js
// import express from "express";
// import { authRequired } from "../middleware/authMiddleware.js";
// import {
//   createSubscriptionCheckoutSession,
//   getMySubscription,
// } from "../controllers/billingController.js";

// const router = express.Router();

// // User starts checkout (normal JSON)
// router.post("/create-checkout-session", authRequired, createSubscriptionCheckoutSession);

// // ✅ Frontend uses this to gate CoursePlayer access
// router.get("/me", authRequired, getMySubscription);

// export default router;
