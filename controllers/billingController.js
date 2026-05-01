// import Stripe from "stripe";
// import Membership from "../models/MembershipModel.js";
// import UserSubscription from "../models/UserSubscriptionModel.js";

// // eslint-disable-next-line no-undef
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// // Helper: map Stripe subscription status to our allowed enum (safe pass-through)
// function normalizeStatus(status) {
//   const allowed = new Set([
//     "active",
//     "trialing",
//     "past_due",
//     "canceled",
//     "incomplete",
//     "unpaid",
//   ]);
//   return allowed.has(status) ? status : "incomplete";
// }

// const isActiveStatus = (status) => status === "active" || status === "trialing";

// /**
//  * GET /api/v1/billing/me
//  * returns the user's current subscription (source of truth = your DB updated by webhook)
//  */
// export const getMySubscription = async (req, res) => {
//   try {
//     const sub = await UserSubscription.findOne({ user: req.user._id }).populate(
//       "membership",
//       "membershipId title stripePriceId"
//     );

//     if (!sub) {
//       return res.status(200).json({
//         success: true,
//         data: {
//           hasSubscription: false,
//           isActive: false,
//           status: "none",
//           membershipId: null,
//           currentPeriodStart: null,
//           currentPeriodEnd: null,
//           cancelAtPeriodEnd: false,
//         },
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: {
//         hasSubscription: true,
//         isActive: isActiveStatus(sub.status),
//         status: sub.status,
//         membershipId: sub.membershipId || sub.membership?.membershipId || null,
//         stripeSubscriptionId: sub.stripeSubscriptionId || null,
//         currentPeriodStart: sub.currentPeriodStart || null,
//         currentPeriodEnd: sub.currentPeriodEnd || null,
//         cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
//       },
//     });
//   } catch (error) {
//     console.error("getMySubscription error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch subscription",
//       error: error.message,
//     });
//   }
// };

// /**
//  * POST /api/v1/billing/create-checkout-session
//  * body: { membershipId: "kc-beginner" }
//  */
// export const createSubscriptionCheckoutSession = async (req, res) => {
//   try {
//     const { membershipId } = req.body;

//     if (!membershipId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "membershipId is required" });
//     }

//     const plan = await Membership.findOne({ membershipId });

//     if (!plan) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Membership plan not found" });
//     }

//     if (!plan.stripePriceId) {
//       return res.status(400).json({
//         success: false,
//         message: "This membership is missing stripePriceId in the database",
//       });
//     }

//     // eslint-disable-next-line no-undef
//     const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

//     // We don’t mark active here — webhook is source of truth.
//     await UserSubscription.findOneAndUpdate(
//       { user: req.user._id },
//       {
//         $set: {
//           membership: plan._id,
//           membershipId: plan.membershipId,
//           stripePriceId: plan.stripePriceId,
//           status: "incomplete",
//         },
//       },
//       { upsert: true, new: true }
//     );

//     const session = await stripe.checkout.sessions.create({
//       mode: "subscription",
//       payment_method_types: ["card"], // Apple Pay / Google Pay can appear automatically if enabled in Stripe
//       line_items: [{ price: plan.stripePriceId, quantity: 1 }],

//       client_reference_id: String(req.user._id),

//       metadata: {
//         userId: String(req.user._id),
//         membershipId: plan.membershipId,
//       },

//       success_url: `${clientUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${clientUrl}/memberships?canceled=true`,
//     });

//     return res.status(200).json({
//       success: true,
//       url: session.url,
//     });
//   } catch (error) {
//     console.error("createSubscriptionCheckoutSession error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to create Stripe checkout session",
//       error: error.message,
//     });
//   }
// };

// /**
//  * Stripe webhook
//  * POST /api/v1/billing/webhook
//  */
// export const stripeWebhook = async (req, res) => {
//   let event;

//   try {
//     const sig = req.headers["stripe-signature"];
//     event = stripe.webhooks.constructEvent(
//       req.body, // raw body required
//       sig,
//       // eslint-disable-next-line no-undef
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     console.error("Webhook signature verification failed:", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   try {
//     // 1) Checkout completed (subscription created)
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;

//       if (session.mode === "subscription" && session.subscription) {
//         const userId = session.metadata?.userId || session.client_reference_id;
//         const membershipId = session.metadata?.membershipId;

//         const subscription = await stripe.subscriptions.retrieve(
//           session.subscription
//         );

//         const plan = membershipId
//           ? await Membership.findOne({ membershipId })
//           : null;

//         if (userId && plan) {
//           await UserSubscription.findOneAndUpdate(
//             { user: userId },
//             {
//               $set: {
//                 membership: plan._id,
//                 membershipId: plan.membershipId,
//                 stripeCustomerId: session.customer || "",
//                 stripeSubscriptionId: subscription.id,
//                 stripePriceId: plan.stripePriceId,
//                 status: normalizeStatus(subscription.status),
//                 currentPeriodStart: subscription.current_period_start
//                   ? new Date(subscription.current_period_start * 1000)
//                   : null,
//                 currentPeriodEnd: subscription.current_period_end
//                   ? new Date(subscription.current_period_end * 1000)
//                   : null,
//                 cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
//               },
//             },
//             { upsert: true, new: true }
//           );
//         }
//       }
//     }

//     // 2) Subscription updated (upgrade, cancel_at_period_end, etc)
//     if (event.type === "customer.subscription.updated") {
//       const sub = event.data.object;

//       await UserSubscription.findOneAndUpdate(
//         { stripeSubscriptionId: sub.id },
//         {
//           $set: {
//             status: normalizeStatus(sub.status),
//             currentPeriodStart: sub.current_period_start
//               ? new Date(sub.current_period_start * 1000)
//               : null,
//             currentPeriodEnd: sub.current_period_end
//               ? new Date(sub.current_period_end * 1000)
//               : null,
//             cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
//           },
//         },
//         { new: true }
//       );
//     }

//     // 3) Subscription deleted (canceled)
//     if (event.type === "customer.subscription.deleted") {
//       const sub = event.data.object;

//       await UserSubscription.findOneAndUpdate(
//         { stripeSubscriptionId: sub.id },
//         {
//           $set: {
//             status: "canceled",
//             cancelAtPeriodEnd: false,
//           },
//         },
//         { new: true }
//       );
//     }

//     return res.json({ received: true });
//   } catch (error) {
//     console.error("stripeWebhook handler error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Webhook handler failed" });
//   }
// };
