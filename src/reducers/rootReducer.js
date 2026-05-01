// CombineReducers
import { combineReducers } from "@reduxjs/toolkit";

// ✅ Auth
import { authReducer } from "./auth/authReducer";
import { authInitialState } from "./auth/authInitialState";

// ✅ Register
import registerReducer from "./register/registerReducer";
import { registerInitialState } from "./register/registerInitialState";

// Cart
import { cartReducer } from "./cart/cartReducer";
import { cartInitialState } from "./cart/cartInitialState";

// Product
import { productReducer } from "./products/productReducer";
import { productInitialState } from "./products/productInitialState";

// Checkout
import { checkoutReducer } from "./checkout/checkoutReducer";
import { checkoutInitialState } from "./checkout/checkoutInitialState";

// Membership
import { membershipReducer } from "./memberships/membershipReducer";
import { membershipInitialState } from "./memberships/membershipInitialState";

// Coaching (user form)
import { coachingReducer } from "./coaching/coachingReducer";
import { coachingInitialState } from "./coaching/coachingInitialState";

// ✅ Admin Coachings
import { adminCoachingsReducer } from "./adminCoaching/adminCoachingReducer";
import { adminCoachingsInitialState } from "./adminCoaching/adminCoachingInitialState";

// Contact (user form)
import { contactReducer } from "./contact/contactReducer";
import { contactInitialState } from "./contact/contactInitialState";

// Newsletter (user)
import newsletterReducer from "./newsletter/newsletterReducer";
import { newsletterInitialState } from "./newsletter/newsletterInitialState";

// Manage Newsletter (admin)
import manageNewsletterReducer from "./manageNewsletter/manageNewsletterReducer";
import { manageNewsletterInitialState } from "./manageNewsletter/manageNewsletterInitialState";

// Manage Contacts (admin)
import manageContactReducer from "./manageContact/manageContactReducer";
import { manageContactInitialState } from "./manageContact/manageContactInitialState";

// ✅ Manage MyMessages
import { myMessagesReducer } from "./myMessages/myMessagesReducer";
import { myMessagesInitialState } from "./myMessages/myMessagesInitialState";

// ✅ User Dashboard
import { userDashboardReducer } from "./userDashboard/userDashboardReducer";
import { userDashboardInitialState } from "./userDashboard/userDashboardInitialState";

// ✅ Users
import { userReducer } from "./user/userReducer";
import { userInitialState } from "./user/userInitialState";

// ✅ Courses
import { courseReducer } from "./courses/courseReducer";
import { courseInitialState } from "./courses/courseInitialState";

// ✅ Enrollment
import { enrollmentReducer } from "./enrollment/enrollmentReducer";
import { enrollmentInitialState } from "./enrollment/enrollmentInitialState";

// ✅ Email Dashboard
import { emailDashboardReducer } from "./emailDashboard/emailDashboardReducer";
import { emailDashboardInitialState } from "./emailDashboard/emailDashboardInitialState";

// ✅ Email Campaign
import { emailCampaignReducer } from "./emailCampaign/emailCampaignReducer";
import { emailCampaignInitialState } from "./emailCampaign/emailCampaignInitialState";

// ✅ Email Segment
import { emailSegmentReducer } from "./emailSegment/emailSegmentReducer";
import { emailSegmentInitialState } from "./emailSegment/emailSegmentInitialState";

// ✅ Email Subscriber
import { emailSubscriberReducer } from "./emailSubscriber/emailSubscriberReducer";
import { emailSubscriberInitialState } from "./emailSubscriber/emailSubscriberInitialState";

// ✅ Email Template
import { emailTemplateReducer } from "./emailTemplate/emailTemplateReducer";
import { emailTemplateInitialState } from "./emailTemplate/emailTemplateInitialState";

// ✅ Email Analytics
import { emailAnalyticsReducer } from "./emailAnalytics/emailAnalyticsReducer";
import { emailAnalyticsInitialState } from "./emailAnalytics/emailAnalyticsInitialState";

// ✅ Auth
function auth(state = authInitialState, action) {
  return authReducer(state, action);
};

function register(state = registerInitialState, action) {
  return registerReducer(state, action);
}

// Product
function products(state = productInitialState, action) {
  return productReducer(state, action);
}

// Cart
function cart(state = cartInitialState, action) {
  return cartReducer(state, action);
}

// Checkout
function checkout(state = checkoutInitialState, action) {
  return checkoutReducer(state, action);
}

// Membership
function membership(state = membershipInitialState, action) {
  return membershipReducer(state, action);
}

// Coaching
function coaching(state = coachingInitialState, action) {
  return coachingReducer(state, action);
}

// AdminCoaching
function adminCoachings(state = adminCoachingsInitialState, action) {
  return adminCoachingsReducer(state, action);
}

// Contact
function contact(state = contactInitialState, action) {
  return contactReducer(state, action);
}

// Newsletter
function newsletter(state = newsletterInitialState, action) {
  return newsletterReducer(state, action);
}

// ManageNewsletter
function manageNewsletter(state = manageNewsletterInitialState, action) {
  return manageNewsletterReducer(state, action);
}

// ManageContacts
function manageContacts(state = manageContactInitialState, action) {
  return manageContactReducer(state, action);
}

// MyMessages
function myMessages(state = myMessagesInitialState, action) {
  return myMessagesReducer(state, action);
}

// Users
function users(state = userInitialState, action) {
  return userReducer(state, action);
}

// UserDashboard
function userDashboard(state = userDashboardInitialState, action) {
  return userDashboardReducer(state, action);
}

// Courses
function courses(state = courseInitialState, action) {
  return courseReducer(state, action);
}

// Enrollment
function enrollment(state = enrollmentInitialState, action) {
  return enrollmentReducer(state, action);
}

// ✅ Email Dashboard
function emailDashboard(state = emailDashboardInitialState, action) {
  return emailDashboardReducer(state, action);
}

function emailCampaign(state = emailCampaignInitialState, action) {
  return emailCampaignReducer(state, action);
}

function emailSegment(state = emailSegmentInitialState, action) {
  return emailSegmentReducer(state, action);
}

function emailSubscribers(state = emailSubscriberInitialState, action) {
  return emailSubscriberReducer(state, action);
}

function emailTemplate(state = emailTemplateInitialState, action) {
  return emailTemplateReducer(state, action);
}

function emailAnalytics(state = emailAnalyticsInitialState, action) {
  return emailAnalyticsReducer(state, action);
}

export const rootReducer = combineReducers({
  auth,
  register,
  products,
  cart,
  checkout,
  membership,
  coaching,
  adminCoachings,
  contact,
  newsletter,
  manageNewsletter,
  manageContacts,
  myMessages,
  users,
  userDashboard,
  courses,
  enrollment,

  // ✅ Email system
  emailDashboard,
  emailCampaign,
  emailSegment,
  emailSubscribers,
  emailTemplate,
  emailAnalytics,
});