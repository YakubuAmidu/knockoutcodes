// src/App.jsx
import { Suspense, lazy } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import AdminNavbar from "./components/AdminNavbar.jsx";
import UserNavbar from "./components/UserNavbar.jsx";
import Footer from "./components/Footer.jsx";

import useAutoLogout from "./hooks/useAutoLogout.js";

import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";
import PublicRoute from "./routes/PublicRoutes.jsx";

import { useAuth } from "./context/AuthContext.jsx";

/* =========================
   Lazy-loaded public pages
========================= */
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
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess.jsx"));
const SubscriptionFailed = lazy(() => import("./pages/SubscriptionFailed.jsx"));
const MembershipDetails = lazy(() => import("./pages/MembershipDetails.jsx"));
const RefundPolicy = lazy(() => import("./pages/refundPolicy.jsx"));

/* =========================
   Lazy-loaded user pages
========================= */
const UserProfile = lazy(() => import("./pages/User-profile.jsx"));
const MyCourses = lazy(() => import("./pages/MyCourses.jsx"));
const MyOrders = lazy(() => import("./pages/MyOrders.jsx"));
const MyMessages = lazy(() => import("./pages/MyMessages.jsx"));
const UserDashboard = lazy(() => import("./pages/User-dashboard.jsx"));
const CoursePlayer = lazy(() => import("./pages/CoursePlayer.jsx"));
const ManageDevices = lazy(() => import("./pages/ManageDevice.jsx"));

/* =========================
   Lazy-loaded admin pages
========================= */
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
const AdminEmailCampaign = lazy(() => import("./pages/AdminEmailCampaign.jsx"));
const AdminEmailSubscribers = lazy(() =>
  import("./pages/AdminEmailSubscribers.jsx")
);
const AdminEmailTemplates = lazy(() =>
  import("./pages/AdminEmailTemplates.jsx")
);
const AdminEmailAnalytics = lazy(() =>
  import("./pages/AdminEmailAnalytics.jsx")
);
const AdminEmailAnalyticsDetail = lazy(() =>
  import("./pages/AdminEmailAnalyticsDetail.jsx")
);
const AdminEmailSegment = lazy(() => import("./pages/AdminEmailSegments.jsx"));

function PageLoader() {
  return (
    <div style={{ color: "#fff", textAlign: "center", padding: "2rem" }}>
      Loading...
    </div>
  );
}

/* =========================
   Root redirect
   - If user is logged in and admin: admin dashboard
   - If user is logged in and normal user: user dashboard
   - If not logged in: home page
========================= */
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
  const location = useLocation();

  /* =========================
     Auto logout
     - Logs user out after 30 minutes of inactivity
  ========================= */
  useAutoLogout({
    isAuthenticated,
    logout,
    timeout: 30 * 60 * 1000,
  });

  /* =========================
     Admin section checker
     - Used to hide Footer on admin pages
  ========================= */
  const inAdminSection = location.pathname.startsWith("/admin");

  return (
    <>
      {/* =========================
         Navbar switch
         - Admin gets AdminNavbar
         - User gets UserNavbar
         - Visitor gets normal Navbar
      ========================= */}
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
          {/* =========================
             Root
          ========================= */}
          <Route path="/" element={<RootRedirect />} />

          {/* =========================
             Public routes
             - No login required
          ========================= */}
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

          {/* =========================
             Auth-only public routes
             - Login/Register pages
             - PublicRoute redirects logged-in users away
          ========================= */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* =========================
             Protected user routes
             - Requires logged-in user session
          ========================= */}
          <Route element={<ProtectedRoute />}>
            <Route path="/user-profile" element={<UserProfile />} />
            <Route path="/course-player/:courseId" element={<CoursePlayer />} />
            <Route path="/dashboard/orders" element={<MyOrders />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/my-messages" element={<MyMessages />} />
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/manage-devices" element={<ManageDevices />} />
          </Route>

          {/* =========================
             Protected admin routes
             - Requires logged-in session
             - Requires admin role
             - Admin session is enforced by AdminRoute
          ========================= */}
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
            <Route
              path="/admin/email-campaigns"
              element={<AdminEmailCampaign />}
            />
            <Route
              path="/admin/email-subscribers"
              element={<AdminEmailSubscribers />}
            />
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
            <Route path="/admin/email-segments" element={<AdminEmailSegment />} />
          </Route>

          {/* =========================
             Fallback
          ========================= */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>

      {/* Hide Footer on admin pages */}
      {!inAdminSection && <Footer />}
    </>
  );
}

export default function App() {
  return <AppShell />;
}