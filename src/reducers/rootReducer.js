// src/reducers/rootReducer.js

import { combineReducers } from "@reduxjs/toolkit";

/* =========================================================
   AUTH / ACCOUNT
========================================================= */
import { authReducer } from "./auth/authReducer";
import { authInitialState } from "./auth/authInitialState";

import registerReducer from "./register/registerReducer";
import { registerInitialState } from "./register/registerInitialState";

import { forgotPasswordReducer } from "./forgotPassword/forgotPasswordReducer";
import { forgotPasswordInitialState } from "./forgotPassword/forgotPasswordInitialState";

import { resetPasswordReducer } from "./resetPassword/resetPasswordReducer";
import { resetPasswordInitialState } from "./resetPassword/resetPasswordInitialState";

/* =========================================================
   USERS / DASHBOARD
========================================================= */
import { userReducer } from "./user/userReducer";
import { userInitialState } from "./user/userInitialState";

import { manageUserReducer } from "./manageUsers/manageUserReducer";
import { manageUserInitialState } from "./manageUsers/manageUserInitialState";

import { userDashboardReducer } from "./userDashboard/userDashboardReducer";
import { userDashboardInitialState } from "./userDashboard/userDashboardInitialState";

/* =========================================================
   PRODUCTS / CART / ORDERS / CHECKOUT
========================================================= */
import { productReducer } from "./products/productReducer";
import { productInitialState } from "./products/productInitialState";

import { cartReducer } from "./cart/cartReducer";
import { cartInitialState } from "./cart/cartInitialState";

import { checkoutReducer } from "./checkout/checkoutReducer";
import { checkoutInitialState } from "./checkout/checkoutInitialState";

import { manageProductReducer } from "./manageProducts/manageProductReducer";
import { manageProductInitialState } from "./manageProducts/manageProductInitialState";

import { myProductReducer } from "./myProducts/myProductReducer";
import { myProductInitialState } from "./myProducts/myProductInitialState";

import { manageOrderReducer } from "./manageOrders/manageOrderReducer";
import { manageOrderInitialState } from "./manageOrders/manageOrderInitialState";

import { myOrderReducer } from "./myOrders/myOrderReducer";
import { myOrderInitialState } from "./myOrders/myOrderInitialState";

/* =========================================================
   COURSES / LESSONS / ENROLLMENTS / MEMBERSHIPS
========================================================= */
import { courseReducer } from "./courses/courseReducer";
import { courseInitialState } from "./courses/courseInitialState";

import { courseDetailReducer } from "./courseDetail/courseDetailReducer";
import { courseDetailInitialState } from "./courseDetail/courseDetailInitialState";

import { myCoursesReducer } from "./myCourses/myCoursesReducer";
import { myCoursesInitialState } from "./myCourses/myCoursesInitialState";

import { myCourseDetailReducer } from "./myCourseDetail/myCourseDetailReducer";
import { myCourseDetailInitialState } from "./myCourseDetail/myCourseDetailInitialState";

import { manageCoursesReducer } from "./manageCourses/manageCoursesReducer";
import { manageCoursesInitialState } from "./manageCourses/manageCoursesInitialState";

import { manageLessonReducer } from "./manageLesson/manageLessonReducer";
import { manageLessonInitialState } from "./manageLesson/manageLessonInitialState";

import { enrollmentReducer } from "./enrollment/enrollmentReducer";
import { enrollmentInitialState } from "./enrollment/enrollmentInitialState";

import { membershipReducer } from "./memberships/membershipReducer";
import { membershipInitialState } from "./memberships/membershipInitialState";

/* =========================================================
   CONTACT / COACHING / NEWSLETTER / MESSAGES
========================================================= */
import { contactReducer } from "./contact/contactReducer";
import { contactInitialState } from "./contact/contactInitialState";

import { coachingReducer } from "./coaching/coachingReducer";
import { coachingInitialState } from "./coaching/coachingInitialState";

import { adminCoachingsReducer } from "./adminCoaching/adminCoachingReducer";
import { adminCoachingsInitialState } from "./adminCoaching/adminCoachingInitialState";

import newsletterReducer from "./newsletter/newsletterReducer";
import { newsletterInitialState } from "./newsletter/newsletterInitialState";

import manageNewsletterReducer from "./manageNewsletter/manageNewsletterReducer";
import { manageNewsletterInitialState } from "./manageNewsletter/manageNewsletterInitialState";

import manageContactReducer from "./manageContact/manageContactReducer";
import { manageContactInitialState } from "./manageContact/manageContactInitialState";

import { myMessagesReducer } from "./myMessages/myMessagesReducer";
import { myMessagesInitialState } from "./myMessages/myMessagesInitialState";

/* =========================================================
   REVIEWS / TESTIMONIALS
========================================================= */
import { reviewReducer } from "./review/reviewReducer";
import { reviewInitialState } from "./review/reviewInitialState";

import { manageReviewReducer } from "./manageReview/manageReviewReducer";
import { manageReviewInitialState } from "./manageReview/manageReviewInitialState";

import { testimonialReducer } from "./testimonial/testimonialReducer";
import { testimonialInitialState } from "./testimonial/testimonialInitialState";

import { manageTestimonialReducer } from "./manageTestimonials/manageTestimonialReducer";
import { manageTestimonialInitialState } from "./manageTestimonials/manageTestimonialInitialState";

/* =========================================================
   SECURITY / SYSTEM SETTINGS
========================================================= */
import { securityEventReducer } from "./securityEvents/securityEventReducer";
import { securityEventInitialState } from "./securityEvents/securityEventInitialState";

import { systemSettingReducer } from "./systemSettings/systemSettingReducer";
import { systemSettingInitialState } from "./systemSettings/systemSettingInitialState";

/* =========================================================
   EMAIL SYSTEM
========================================================= */
import { emailDashboardReducer } from "./emailDashboard/emailDashboardReducer";
import { emailDashboardInitialState } from "./emailDashboard/emailDashboardInitialState";

import { emailCampaignReducer } from "./emailCampaign/emailCampaignReducer";
import { emailCampaignInitialState } from "./emailCampaign/emailCampaignInitialState";

import { emailSegmentReducer } from "./emailSegment/emailSegmentReducer";
import { emailSegmentInitialState } from "./emailSegment/emailSegmentInitialState";

import { emailSubscriberReducer } from "./emailSubscriber/emailSubscriberReducer";
import { emailSubscriberInitialState } from "./emailSubscriber/emailSubscriberInitialState";

import { emailTemplateReducer } from "./emailTemplate/emailTemplateReducer";
import { emailTemplateInitialState } from "./emailTemplate/emailTemplateInitialState";

import { emailAnalyticsReducer } from "./emailAnalytics/emailAnalyticsReducer";
import { emailAnalyticsInitialState } from "./emailAnalytics/emailAnalyticsInitialState";

import { manageMembershipsReducer } from "./manageMembership/manageMembershipReducer";
import { manageMembershipsInitialState } from "./manageMembership/manageMembershipInitialState";

import { adminStatsReducer } from "./adminStats/adminStatsReducer";
import { adminStatsInitialState } from "./adminStats/adminStatsInitialState";

/* =========================================================
   SAFE REDUCER WRAPPER
   Keeps each reducer connected to its own initial state.
========================================================= */
const withInitialState = (reducer, initialState) => {
  return function wrappedReducer(state = initialState, action) {
    return reducer(state, action);
  };
};

/* =========================================================
   ROOT REDUCER
========================================================= */
export const rootReducer = combineReducers({
  // Auth / Account
  auth: withInitialState(authReducer, authInitialState),
  register: withInitialState(registerReducer, registerInitialState),
  forgotPassword: withInitialState(
    forgotPasswordReducer,
    forgotPasswordInitialState
  ),
  resetPassword: withInitialState(resetPasswordReducer, resetPasswordInitialState),

  // Users / Dashboard
  users: withInitialState(userReducer, userInitialState),
  manageUsers: withInitialState(manageUserReducer, manageUserInitialState),
  userDashboard: withInitialState(
    userDashboardReducer,
    userDashboardInitialState
  ),

  // Products / Orders
  products: withInitialState(productReducer, productInitialState),
  cart: withInitialState(cartReducer, cartInitialState),
  checkout: withInitialState(checkoutReducer, checkoutInitialState),
  manageProducts: withInitialState(
    manageProductReducer,
    manageProductInitialState
  ),
  myProducts: withInitialState(myProductReducer, myProductInitialState),
  manageOrders: withInitialState(manageOrderReducer, manageOrderInitialState),
  myOrders: withInitialState(myOrderReducer, myOrderInitialState),

  // Courses / Memberships
  courses: withInitialState(courseReducer, courseInitialState),
  courseDetail: withInitialState(courseDetailReducer, courseDetailInitialState),
  myCourses: withInitialState(myCoursesReducer, myCoursesInitialState),
  myCourseDetail: withInitialState(
    myCourseDetailReducer,
    myCourseDetailInitialState
  ),
  manageCourses: withInitialState(manageCoursesReducer, manageCoursesInitialState),
  manageLessons: withInitialState(manageLessonReducer, manageLessonInitialState),
  enrollment: withInitialState(enrollmentReducer, enrollmentInitialState),
  membership: withInitialState(membershipReducer, membershipInitialState),

  // Contact / Coaching / Newsletter / Messages
  contact: withInitialState(contactReducer, contactInitialState),
  coaching: withInitialState(coachingReducer, coachingInitialState),
  adminCoachings: withInitialState(
    adminCoachingsReducer,
    adminCoachingsInitialState
  ),
  newsletter: withInitialState(newsletterReducer, newsletterInitialState),
  manageNewsletter: withInitialState(
    manageNewsletterReducer,
    manageNewsletterInitialState
  ),
  manageContacts: withInitialState(
    manageContactReducer,
    manageContactInitialState
  ),
  myMessages: withInitialState(myMessagesReducer, myMessagesInitialState),

  // Reviews / Testimonials
  review: withInitialState(reviewReducer, reviewInitialState),
  manageReview: withInitialState(manageReviewReducer, manageReviewInitialState),
  testimonials: withInitialState(testimonialReducer, testimonialInitialState),
  manageTestimonials: withInitialState(
    manageTestimonialReducer,
    manageTestimonialInitialState
  ),

  // Security / Settings
  securityEvent: withInitialState(
    securityEventReducer,
    securityEventInitialState
  ),
  systemSettings: withInitialState(
    systemSettingReducer,
    systemSettingInitialState
  ),

  // Email System
  emailDashboard: withInitialState(
    emailDashboardReducer,
    emailDashboardInitialState
  ),
  emailCampaign: withInitialState(
    emailCampaignReducer,
    emailCampaignInitialState
  ),
  emailSegment: withInitialState(emailSegmentReducer, emailSegmentInitialState),
  emailSubscribers: withInitialState(
    emailSubscriberReducer,
    emailSubscriberInitialState
  ),

  emailTemplate: withInitialState(
    emailTemplateReducer,
    emailTemplateInitialState
  ),

  emailAnalytics: withInitialState(
    emailAnalyticsReducer,
    emailAnalyticsInitialState
  ),

  manageMemberships: withInitialState(
  manageMembershipsReducer,
  manageMembershipsInitialState
  ),
  
  adminStats: withInitialState(
  adminStatsReducer,
  adminStatsInitialState
),
});