// src/App.jsx
import { Suspense, lazy, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Navbar from "./components/Navbar.jsx";
import AdminNavbar from "./components/AdminNavbar.jsx";
import UserNavbar from "./components/UserNavbar.jsx";
import Footer from "./components/Footer.jsx";

import useAutoLogout from "./hooks/useAutoLogout.js";

import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";
import PublicRoute from "./routes/PublicRoutes.jsx";

import { useAuth } from "./context/AuthContext.jsx";

import {
  fetchSystemStatus,
  receiveMaintenanceSocketUpdate,
} from "./reducers/systemSettings/systemSettingActions";

import {
  socket,
  joinSystemSocketRoom,
  leaveSystemSocketRoom,
} from "../utils/socket.js";

/* Public pages */
const Home = lazy(() => import("./pages/Home.jsx"));
const Coaching = lazy(() => import("./pages/Coaching.jsx"));
const Courses = lazy(() => import("./pages/Courses.jsx"));
const Faq = lazy(() => import("./pages/Faq.jsx"));
const Ebook = lazy(() => import("./pages/Ebook.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const BlogDetail = lazy(() => import("./pages/BlogDetail.jsx"));
const CourseDetail = lazy(() => import("./pages/CourseDetail.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const Terms = lazy(() => import("./pages/Terms.jsx"));
const Product = lazy(() => import("./pages/Product.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Curriculum = lazy(() => import("./pages/Curriculum.jsx"));
const Memberships = lazy(() => import("./components/Membership.jsx"));
const SubscriptionSuccess = lazy(() =>
  import("./pages/SubscriptionSuccess.jsx")
);
const SubscriptionFailed = lazy(() =>
  import("./pages/SubscriptionFailed.jsx")
);
const MembershipDetails = lazy(() => import("./pages/MembershipDetails.jsx"));
const RefundPolicy = lazy(() => import("./pages/refundPolicy.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));
const ProductSuccess = lazy(() => import("./pages/ProductSusccess.jsx"));
const Session = lazy(() => import("./pages/Session.jsx"));
const FightCamp = lazy(() => import("./pages/FightCamp.jsx"));
const MyProducts = lazy(() => import("./pages/MyProduct.jsx"));
const AccountAccessNotice = lazy(() =>
  import("./pages/AccountAccessNotice.jsx")
);
const ProductFailed = lazy(() => import("./pages/ProductFailed.jsx"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess.jsx"));
const OrderFailed = lazy(() => import("./pages/OrderFailed.jsx"));
const MembershipSuccess = lazy(() => import("./pages/MembershipSuccess.jsx"));
const MembershipFailed = lazy(() => import("./pages/MembershipFailed.jsx"));
const Maintenance = lazy(() => import("./pages/Maintenance.jsx"));

/* User pages */
const UserProfile = lazy(() => import("./pages/User-profile.jsx"));
const MyCourses = lazy(() => import("./pages/MyCourses.jsx"));
const MyCourseDetail = lazy(() => import("./pages/MyCourseDetail.jsx"));
const MyOrders = lazy(() => import("./pages/MyOrders.jsx"));
const MyMessages = lazy(() => import("./pages/MyMessages.jsx"));
const UserDashboard = lazy(() => import("./pages/User-dashboard.jsx"));
const CoursePlayer = lazy(() => import("./pages/CoursePlayer.jsx"));
const ManageDevices = lazy(() => import("./pages/ManageDevice.jsx"));
const Enrollment = lazy(() => import("./pages/Enrollment.jsx"));

/* Admin pages */
const AdminDashboard = lazy(() => import("./pages/Admin-dashboard.jsx"));
const AdminProfile = lazy(() => import("./pages/Admin-profile.jsx"));
const ManageBlogs = lazy(() => import("./pages/ManageBlogs.jsx"));
const ManageContacts = lazy(() => import("./pages/ManageContacts.jsx"));
const ManageCourses = lazy(() => import("./pages/ManageCourses.jsx"));
const ManageNewsletters = lazy(() => import("./pages/ManageNewsletter.jsx"));
const ManageOrders = lazy(() => import("./pages/ManageOrders.jsx"));
const ManageRevenues = lazy(() => import("./pages/ManageRevenues.jsx"));
const ManageUsers = lazy(() => import("./pages/ManageUsers.jsx"));
const ManageCoaching = lazy(() => import("./pages/ManageCoaching.jsx"));
const ManageProducts = lazy(() => import("./pages/ManageProducts.jsx"));
const ManageReviews = lazy(() => import("./pages/ManageReviews.jsx"));
const AdminEmailCampaign = lazy(() => import("./pages/AdminEmailCampaign.jsx"));
const AdminEmailSubscribers = lazy(() => import("./pages/AdminEmailSubscribers.jsx"));
const AdminEmailTemplates = lazy(() => import("./pages/AdminEmailTemplates.jsx"));
const AdminEmailAnalytics = lazy(() => import("./pages/AdminEmailAnalytics.jsx"));
const AdminEmailAnalyticsDetail = lazy(() => import("./pages/AdminEmailAnalyticsDetail.jsx"));
const AdminEmailSegment = lazy(() => import("./pages/AdminEmailSegments.jsx"));
const ManageLesson = lazy(() => import("./pages/ManageLesson.jsx"));
const AdminSecurityEvents = lazy(() => import("./pages/AdminSecurityEvents.jsx"));
const ManageTestimonial = lazy(() => import("./pages/ManageTestimonials.jsx"));
const AdminSystemCleanup = lazy(() => import("./pages/AdminSystemCleanup.jsx"));
const ManageMembership = lazy(() => import("./pages/ManageMembership.jsx"));
const ManageEnrollment = lazy(() => import("./pages/ManageEnrollment.jsx"));
const ManageUserSubscription = lazy(() => import("./pages/ManageUserSubscription.jsx"));

function PageLoader() {
  return (
    <div style={{ color: "#fff", textAlign: "center", padding: "2rem" }}>
      Loading...
    </div>
  );
}

function RootRedirect() {
  const { initializing, isAuthenticated, isAdmin } = useAuth();

  if (initializing) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={isAdmin ? "/admin/dashboard" : "/user-dashboard"}
        replace
      />
    );
  }

  return <Navigate to="/home" replace />;
}

function AppShell() {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    maintenanceMode,
    maintenanceTitle,
    maintenanceMessage,
    allowAdminAccess,
  } = useSelector((state) => state.systemSettings || {});

  useAutoLogout({
    isAuthenticated,
    logout,
    timeout: 30 * 60 * 1000,
  });

  useEffect(() => {
    dispatch(fetchSystemStatus({ force: true }));

    joinSystemSocketRoom();

    const handleMaintenanceUpdate = (payload) => {
      dispatch(receiveMaintenanceSocketUpdate(payload));
    };

    socket.on("system:maintenance-updated", handleMaintenanceUpdate);

    return () => {
      socket.off("system:maintenance-updated", handleMaintenanceUpdate);
      leaveSystemSocketRoom();
    };
  }, [dispatch]);

  useEffect(() => {
    const path = location.pathname;
    const isMaintenancePage = path === "/maintenance";
    const isAdminPage = path.startsWith("/admin");
    const isAuthPage =
      path === "/login" ||
      path === "/register" ||
      path.startsWith("/forgot-password") ||
      path.startsWith("/reset-password") ||
      path.startsWith("/verify-email");

    const adminCanBypass = Boolean(
      isAuthenticated && isAdmin && allowAdminAccess
    );

    if (
      maintenanceMode &&
      !adminCanBypass &&
      !isMaintenancePage &&
      !isAuthPage
    ) {
      navigate("/maintenance", {
        replace: true,
        state: {
          from: path,
          maintenanceTitle,
          maintenanceMessage,
        },
      });
      return;
    }

    if (maintenanceMode && !adminCanBypass && isAdminPage) {
      navigate("/maintenance", { replace: true });
      return;
    }

    if (!maintenanceMode && isMaintenancePage) {
      navigate("/", { replace: true });
    }
  }, [
    maintenanceMode,
    maintenanceTitle,
    maintenanceMessage,
    allowAdminAccess,
    isAuthenticated,
    isAdmin,
    location.pathname,
    navigate,
  ]);

  const hideFooter = location.pathname.startsWith("/admin");

  return (
    <>
      {isAuthenticated ? (
        isAdmin ? (
          <AdminNavbar currentUser={user} onLogout={logout} />
        ) : (
          <UserNavbar currentUser={user} onLogout={logout} />
        )
      ) : (
        <Navbar />
      )}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route path="/maintenance" element={<Maintenance />} />

          <Route path="/home" element={<Home />} />
          <Route path="/coachings" element={<Coaching />} />
          <Route path="/ebooks" element={<Ebook />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/blog/:idOrSlug" element={<BlogDetail />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/products" element={<Product />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/curriculum" element={<Curriculum />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/subscription/failed" element={<SubscriptionFailed />} />
          <Route path="/memberships/:id" element={<MembershipDetails />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/fight-camp" element={<FightCamp />} />
          <Route
            path="/account-access-notice"
            element={<AccountAccessNotice />}
          />
          <Route path="/product/failed" element={<ProductFailed />} />

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/product/success" element={<ProductSuccess />} />
            <Route path="/user-profile" element={<UserProfile />} />
            <Route path="/course-player/:courseId" element={<CoursePlayer />} />
            <Route path="/dashboard/my-orders" element={<MyOrders />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/my-courses/:courseId" element={<MyCourseDetail />} />
            <Route path="/my-messages" element={<MyMessages />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/manage-devices" element={<ManageDevices />} />
            <Route path="/enrollment" element={<Enrollment />} />
            <Route path="/dashboard/products" element={<MyProducts />} />
            <Route path="/order/success" element={<OrderSuccess />} />
            <Route path="/order/failed" element={<OrderFailed />} />
            <Route path="/membership-success" element={<MembershipSuccess />} />
            <Route path="/membership-failed" element={<MembershipFailed />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/blogs" element={<ManageBlogs />} />
            <Route path="/admin/contacts" element={<ManageContacts />} />
            <Route path="/admin/courses" element={<ManageCourses />} />
            <Route path="/admin/newsletters" element={<ManageNewsletters />} />
            <Route path="/admin/orders" element={<ManageOrders />} />
            <Route path="/admin/revenues" element={<ManageRevenues />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/coachings" element={<ManageCoaching />} />
            <Route path="/admin/products" element={<ManageProducts />} />
            <Route path="/admin/email-campaigns" element={<AdminEmailCampaign />} />
            <Route
              path="/admin/email-campaigns/create"
              element={<AdminEmailCampaign />}
            />
            <Route
              path="/admin/email-subscribers"
              element={<AdminEmailSubscribers />}
            />
            <Route path="/admin/reviews" element={<ManageReviews />} />
            <Route
              path="/admin/email-templates"
              element={<AdminEmailTemplates />}
            />
            <Route
              path="/admin/email-analytics"
              element={<AdminEmailAnalytics />}
            />
            <Route
              path="/admin/email-analytics/:id"
              element={<AdminEmailAnalyticsDetail />}
            />
            <Route path="/admin/testimonials" element={<ManageTestimonial />} />
            <Route path="/admin/email-segments" element={<AdminEmailSegment />} />
            <Route path="/admin/lessons" element={<ManageLesson />} />
            <Route
              path="/admin/security-events"
              element={<AdminSecurityEvents />}
            />
            <Route path="/admin/sessions" element={<Session />} />
            <Route
              path="/admin/system-cleanup"
              element={<AdminSystemCleanup />}
            />
            <Route path="admin/memberships" element={<ManageMembership />} />

            <Route path="admin/enrollments" element={<ManageEnrollment />} />

            <Route path="admin/user-subscriptions" element={<ManageUserSubscription />} />
          </Route>

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>

      {!hideFooter ? <Footer /> : null}
    </>
  );
}

export default function App() {
  return <AppShell />;
}