// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminStats } from "../reducers/adminStats/adminStatsActions";
import { useToast } from "../components/Toast";

const mockStats = [
  {
    id: "users",
    label: "Total Users",
    value: "0",
    delta: "0 new this week",
    trend: "neutral",
    icon: "👤",
  },
  {
    id: "courses",
    label: "Courses",
    value: "0",
    delta: "All live programs & lessons",
    trend: "neutral",
    icon: "🎓",
  },
  {
    id: "orders",
    label: "Orders",
    value: "0",
    delta: "E-books, courses & coaching sales",
    trend: "neutral",
    icon: "🧾",
  },
  {
    id: "revenue",
    label: "Monthly Revenue",
    value: "$0",
    delta: "Today: $0",
    trend: "neutral",
    icon: "💰",
  },
];

const quickActions = [
  { id: "dashboard", label: "Dashboard", hint: "Overview", icon: "🏠", path: "/admin/dashboard" },
  { id: "profile", label: "Profile", hint: "Admin account", icon: "👤", path: "/admin/profile" },
  { id: "users", label: "Users", hint: "Manage users", icon: "👥", path: "/admin/users" },
  { id: "orders", label: "Orders", hint: "Manage sales", icon: "🧾", path: "/admin/orders" },
  { id: "contacts", label: "Contacts", hint: "Messages", icon: "📬", path: "/admin/contacts" },
  { id: "newsletters", label: "Newsletters", hint: "Email list", icon: "📧", path: "/admin/newsletters" },
  { id: "courses", label: "Courses", hint: "Programs", icon: "🎓", path: "/admin/courses" },
  { id: "lessons", label: "Lessons", hint: "Course lessons", icon: "📚", path: "/admin/lessons" },
  { id: "blogs", label: "Blogs", hint: "Content", icon: "📝", path: "/admin/blogs" },
  { id: "products", label: "Products", hint: "Store items", icon: "🛍️", path: "/admin/products" },
  { id: "coaching", label: "Coaching", hint: "1-on-1 sessions", icon: "🧠", path: "/admin/coachings" },
  { id: "reviews", label: "Reviews", hint: "Ratings", icon: "⭐", path: "/admin/reviews" },
  { id: "testimonials", label: "Testimonials", hint: "Social proof", icon: "💬", path: "/admin/testimonials" },
  { id: "memberships", label: "Memberships", hint: "Plans", icon: "🥇", path: "/admin/memberships" },
  { id: "enrollments", label: "Enrollments", hint: "Students", icon: "🎟️", path: "/admin/enrollments" },
  { id: "subscriptions", label: "Subscriptions", hint: "Recurring plans", icon: "📈", path: "/admin/user-subscriptions" },
  { id: "campaigns", label: "Campaigns", hint: "Email campaigns", icon: "🚀", path: "/admin/email-campaigns" },
  { id: "segments", label: "Segments", hint: "Audience groups", icon: "🎯", path: "/admin/email-segments" },
  { id: "subscribers", label: "Subscribers", hint: "Email users", icon: "📨", path: "/admin/email-subscribers" },
  { id: "templates", label: "Templates", hint: "Email designs", icon: "🧩", path: "/admin/email-templates" },
  { id: "analytics", label: "Analytics", hint: "Email reports", icon: "📊", path: "/admin/email-analytics" },
  { id: "security", label: "Security", hint: "Events", icon: "🛡️", path: "/admin/security-events" },
  { id: "sessions", label: "Sessions", hint: "User sessions", icon: "🔐", path: "/admin/sessions" },
  { id: "system", label: "System", hint: "Cleanup", icon: "⚙️", path: "/admin/system-cleanup" },
];

const Page = styled.main`
  min-height: 100vh;
  background: radial-gradient(
    circle at top,
    ${({ theme }) => theme.colors.brown} 0%,
    ${({ theme }) => theme.colors.darkBrown} 38%,
    #050302 100%
  );
  color: ${({ theme }) => theme.colors.ivory};
  padding: 32px 18px 48px;
  display: flex;
  justify-content: center;
`;

const Shell = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const HeaderRow = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const HeadingBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Kicker = styled.span`
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Title = styled.h1`
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 700;
  letter-spacing: 0.04em;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: rgba(255, 249, 242, 0.72);
  max-width: 520px;
`;

const AdminBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    135deg,
    rgba(214, 182, 159, 0.08),
    rgba(255, 255, 255, 0.01)
  );
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const Avatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: radial-gradient(circle at 30% 0, #f6e2cf, #8d5d3b 38%, #2f1b12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`;

const AdminText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  span:first-child {
    font-size: 13px;
    font-weight: 600;
  }

  span:last-child {
    font-size: 11px;
    color: rgba(255, 249, 242, 0.65);
  }
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`;

const StatCard = styled(motion.article)`
  background: radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.12),
      transparent 60%
    ),
    ${({ theme }) => theme.colors.glass};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow.glow};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StatTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const StatIcon = styled.div`
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown}
  );
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatLabel = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 249, 242, 0.7);
`;

const StatValue = styled.div`
  font-size: 22px;
  font-weight: 700;
`;

const StatDelta = styled.div`
  font-size: 12px;
  color: ${({ $trend }) =>
    $trend === "up"
      ? "#7CFFB2"
      : $trend === "down"
      ? "#FF7C7C"
      : "rgba(255, 249, 242, 0.72)"};
`;

const MainGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1.1fr);
  gap: 18px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled(motion.section)`
  background: ${({ theme }) => theme.colors.glass};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  flex-wrap: wrap;
`;

const PanelTitle = styled.h2`
  font-size: 15px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const PanelSubtitle = styled.span`
  font-size: 12px;
  color: rgba(255, 249, 242, 0.65);
`;

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RevenueChart = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-end;
  height: 150px;
  width: 100%;
`;

const RevenueBar = styled.div`
  flex: 1;
  min-width: 18px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.cocoa}
  );
  box-shadow: ${({ theme }) => theme.shadow.soft};
  height: ${({ $height }) => `${$height}px`};
`;

const RevenueXAxis = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 10px;

  span {
    flex: 1;
    text-align: center;
    font-size: 12px;
    color: rgba(255, 249, 242, 0.75);
    white-space: nowrap;
  }
`;

const RevenueLegend = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: rgba(255, 249, 242, 0.75);
  flex-wrap: wrap;
`;

const EmptyTableState = styled.div`
  padding: 18px 14px;
  font-size: 13px;
  color: rgba(255, 249, 242, 0.72);
  text-align: center;
  background: rgba(0, 0, 0, 0.25);
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.div`
  min-width: 680px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  background: radial-gradient(
    circle at top,
    rgba(214, 182, 159, 0.08),
    rgba(0, 0, 0, 0.5)
  );
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols};
  padding: 8px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  background: rgba(0, 0, 0, 0.38);
  color: rgba(255, 249, 242, 0.7);
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols};
  padding: 9px 10px;
  font-size: 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  align-items: center;

  &:hover {
    background: rgba(214, 182, 159, 0.08);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  justify-content: center;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  border: 1px solid
    ${({ $variant }) =>
      $variant === "success"
        ? "rgba(124,255,178,0.8)"
        : $variant === "warning"
        ? "rgba(255,199,126,0.85)"
        : "rgba(255,255,255,0.35)"};
  color: ${({ $variant }) =>
    $variant === "success"
      ? "#7CFFB2"
      : $variant === "warning"
      ? "#FFCF7E"
      : "#F8E4D0"};
  background: rgba(0, 0, 0, 0.35);
`;

const StarRating = styled.span`
  font-size: 12px;
  color: #ffd27f;
`;

const QuickActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const QuickActionCard = styled(motion.button)`
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: ${({ theme }) => theme.colors.ivory};
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 58px;

  &:hover {
    background: rgba(214, 182, 159, 0.12);
  }
`;

const QAIcon = styled.span`
  width: 26px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const QAContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  span:first-child {
    font-weight: 600;
  }

  span:last-child {
    font-size: 11px;
    color: rgba(255, 249, 242, 0.8);
  }
`;

const ActivityList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

const ActivityItem = styled.li`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: rgba(255, 249, 242, 0.9);
`;

const ActivityTime = styled.span`
  font-size: 11px;
  color: rgba(255, 249, 242, 0.6);
  white-space: nowrap;
`;

const formatCurrency = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0";

  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

const formatNumber = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
};

const shortId = (id) => {
  if (!id) return "-";
  const str = String(id);
  return str.length <= 8 ? str : `${str.slice(0, 6)}...${str.slice(-4)}`;
};

const formatDateTime = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const normalizePaymentStatus = (status) => {
  const s = String(status || "").toLowerCase();

  if (["paid", "succeeded", "success"].includes(s)) return "Paid";
  if (["pending", "processing"].includes(s)) return "Pending";
  if (["failed", "canceled", "cancelled", "refunded"].includes(s)) return "Failed";

  return status ? String(status) : "Unknown";
};

const getStatusVariant = (statusLabel) => {
  const s = String(statusLabel || "").toLowerCase();
  if (s === "paid") return "success";
  if (s === "pending") return "warning";
  return "default";
};

const formatRating = (rating) => {
  if (rating === null || rating === undefined) return "★ 5.0";
  const num = Number(rating);
  if (Number.isNaN(num)) return "★ 5.0";
  return `★ ${num.toFixed(1)}`;
};

export default function AdminDashboard() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [topCourses, setTopCourses] = useState([]);
  const [realCourses, setRealCourses] = useState([]);

  const {
    stats,
    loading: statsLoading = false,
    error: statsError = null,
  } = useSelector((state) => state.adminStats || {});

  useEffect(() => {
    dispatch(fetchAdminStats());
  }, [dispatch]);

  useEffect(() => {
    if (statsError) {
      addToast?.({
        type: "error",
        message: statsError,
      });
    }
  }, [statsError, addToast]);

  useEffect(() => {
    const fetchTopCourses = async () => {
      try {
        const res = await axiosInstance.get("/enrollments/top-courses?limit=3", {
          withCredentials: true,
        });

        const payload = res.data;

        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        const mapped = list.map((course) => ({
          id: course.courseId || course._id || course.id,
          title: course.title || "Untitled Course",
          level:
            course.level ||
            course.courseLevel ||
            course.course?.level ||
            course.courseDetails?.level ||
            "-",
          enrollments:
            typeof course.enrollments === "number" ? course.enrollments : 0,
          rating:
            typeof course.avgRating === "number"
              ? course.avgRating
              : course.rating,
          revenue:
            typeof course.totalRevenue === "number"
              ? course.totalRevenue
              : course.revenue || 0,
        }));

        setTopCourses(mapped);
      } catch (error) {
        console.error("AdminDashboard top courses error:", error);
      }
    };

    fetchTopCourses();
  }, []);

  useEffect(() => {
    const fetchRealCourses = async () => {
      try {
        const res = await axiosInstance.get("/courses", {
          withCredentials: true,
        });

        const payload = res.data;

        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.courses)
          ? payload.courses
          : [];

        const mapped = list.slice(0, 3).map((course) => ({
          id: course._id || course.id,
          title: course.title || course.name || "Untitled Course",
          level: course.level || course.courseLevel || "-",
          enrollments: course.enrollmentsCount || course.totalEnrollments || 0,
          rating: course.averageRating || course.avgRating || course.rating,
          revenue: course.totalRevenue || course.revenue || 0,
        }));

        setRealCourses(mapped);
      } catch (error) {
        console.error("AdminDashboard real courses error:", error);
      }
    };

    fetchRealCourses();
  }, []);

  const isDashboardLoading = statsLoading && !stats;

  const cards = stats?.cards || {};
  const revenueRaw = stats?.revenue || null;
  const recent = stats?.recent || {};
  const top = stats?.top || {};

  const revenue = revenueRaw
    ? {
        month:
          typeof revenueRaw.monthRevenue === "number"
            ? revenueRaw.monthRevenue
            : revenueRaw.revenueThisMonth ?? 0,
        today:
          typeof revenueRaw.todayRevenue === "number"
            ? revenueRaw.todayRevenue
            : revenueRaw.revenueToday ?? 0,
        total:
          typeof revenueRaw.yearRevenue === "number"
            ? revenueRaw.yearRevenue
            : revenueRaw.totalRevenue ?? 0,
        changePct:
          typeof revenueRaw.revenueChangePct === "number"
            ? revenueRaw.revenueChangePct
            : null,
        revenueByMonth:
          revenueRaw.revenueByMonth || stats?.charts?.revenueByMonth || [],
      }
    : {
        month: 0,
        today: 0,
        total: 0,
        changePct: null,
        revenueByMonth: stats?.charts?.revenueByMonth || [],
      };

  const totalUsers = cards.totalUsers ?? 0;
  const newUsersLast7Days = cards.newUsersLast7Days ?? 0;
  const totalBookings = cards.totalBookings ?? 0;
  const upcomingBookings = cards.upcomingBookings ?? 0;
  const totalContacts = cards.totalContacts ?? 0;
  const unreadContacts = cards.unreadContacts ?? 0;
  const totalCourses = cards.totalCourses ?? 0;
  const totalOrders = cards.totalOrders ?? 0;
  const totalReviews = cards.totalReviews ?? 0;
  const totalSubscriptions = cards.totalSubscriptions ?? 0;
  const activeSubscriptions = cards.activeSubscriptions ?? 0;
  const totalTestimonials = cards.totalTestimonials ?? 0;
  const totalNewsletters = cards.totalNewsletters ?? 0;
  const totalBlogs = cards.totalBlogs ?? 0;
  const totalCoaching = cards.totalCoachingSessions ?? cards.totalCoachings ?? 0;
  const totalProducts = cards.totalProducts ?? 0;
  const activeProducts = cards.activeProducts ?? 0;
  const totalMemberships = cards.totalMemberships ?? 0;
  const activeMemberships = cards.activeMemberships ?? 0;
  const totalEnrollments = cards.totalEnrollments ?? 0;
  const activeEnrollments = cards.activeEnrollments ?? 0;
  const totalLessons = cards.totalLessons ?? 0;
  const publishedLessons = cards.publishedLessons ?? 0;
  const totalCampaigns = cards.totalCampaigns ?? 0;
  const sentCampaigns = cards.sentCampaigns ?? 0;
  const scheduledCampaigns = cards.scheduledCampaigns ?? 0;
  const draftCampaigns = cards.draftCampaigns ?? 0;
  const totalSegments = cards.totalSegments ?? 0;
  const totalSubscribers = cards.totalSubscribers ?? 0;
  const activeSubscribers = cards.activeSubscribers ?? 0;
  const totalTemplates = cards.totalTemplates ?? 0;
  const approvedReviews = cards.approvedReviews ?? 0;

  const statCards = stats
    ? [
        {
          id: "users",
          label: "Total Users",
          value: formatNumber(totalUsers),
          delta: `${formatNumber(newUsersLast7Days)} new this week`,
          trend: newUsersLast7Days > 0 ? "up" : "neutral",
          icon: "👤",
        },
        {
          id: "bookings",
          label: "Bookings",
          value: formatNumber(totalBookings),
          delta: `${formatNumber(upcomingBookings)} upcoming today`,
          trend: "neutral",
          icon: "📅",
        },
        {
          id: "messages",
          label: "Contacts & Inbox",
          value: formatNumber(totalContacts),
          delta: `${formatNumber(unreadContacts)} unread messages`,
          trend: unreadContacts > 0 ? "down" : "neutral",
          icon: "📨",
        },
        {
          id: "revenue",
          label: "Monthly Revenue",
          value: formatCurrency(revenue.month),
          delta: `Today: ${formatCurrency(revenue.today)}`,
          trend:
            typeof revenue.changePct === "number"
              ? revenue.changePct > 0
                ? "up"
                : revenue.changePct < 0
                ? "down"
                : "neutral"
              : "neutral",
          icon: "💰",
        },
        {
          id: "courses",
          label: "Courses",
          value: formatNumber(totalCourses),
          delta: "All live programs & lessons",
          trend: "neutral",
          icon: "🎓",
        },
        {
          id: "orders",
          label: "Orders",
          value: formatNumber(totalOrders),
          delta: "E-books, courses & coaching sales",
          trend: "neutral",
          icon: "🧾",
        },
        {
          id: "reviews-total",
          label: "Reviews",
          value: formatNumber(totalReviews),
          delta: "Total feedback & ratings",
          trend: "neutral",
          icon: "⭐",
        },
        {
          id: "subscriptions",
          label: "Subscriptions",
          value: formatNumber(totalSubscriptions),
          delta: `${formatNumber(activeSubscriptions)} active recurring members`,
          trend: activeSubscriptions > 0 ? "up" : "neutral",
          icon: "📈",
        },
        {
          id: "testimonials",
          label: "Testimonials",
          value: formatNumber(totalTestimonials),
          delta: "Social proof for your brand",
          trend: "neutral",
          icon: "💬",
        },
        {
          id: "newsletter",
          label: "Newsletter",
          value: formatNumber(totalNewsletters),
          delta: "Total email subscribers",
          trend: "neutral",
          icon: "📧",
        },
        {
          id: "blogs",
          label: "Blog Posts",
          value: formatNumber(totalBlogs),
          delta: "Published content pieces",
          trend: "neutral",
          icon: "📝",
        },
        {
          id: "coaching",
          label: "Coaching Clients",
          value: formatNumber(totalCoaching),
          delta: "1-on-1 & VIP sessions",
          trend: "neutral",
          icon: "🧠",
        },
        {
          id: "products",
          label: "Products",
          value: formatNumber(totalProducts),
          delta: `${formatNumber(activeProducts)} active`,
          trend: "neutral",
          icon: "🛍️",
        },
        {
          id: "reviews-approved",
          label: "Approved Reviews",
          value: formatNumber(approvedReviews),
          delta: `${formatNumber(cards.pendingReviews ?? 0)} pending approval`,
          trend: approvedReviews > 0 ? "up" : "neutral",
          icon: "⭐",
        },
        {
          id: "memberships",
          label: "Memberships",
          value: formatNumber(totalMemberships),
          delta: `${formatNumber(activeMemberships)} active plans`,
          trend: activeMemberships > 0 ? "up" : "neutral",
          icon: "🥇",
        },
        {
          id: "enrollments",
          label: "Enrollments",
          value: formatNumber(totalEnrollments),
          delta: `${formatNumber(activeEnrollments)} active students`,
          trend: activeEnrollments > 0 ? "up" : "neutral",
          icon: "🎟️",
        },
        {
          id: "lessons",
          label: "Lessons",
          value: formatNumber(totalLessons),
          delta: `${formatNumber(publishedLessons)} published lessons`,
          trend: publishedLessons > 0 ? "up" : "neutral",
          icon: "📚",
        },
        {
          id: "email-campaigns",
          label: "Campaigns",
          value: formatNumber(totalCampaigns),
          delta: `${formatNumber(sentCampaigns)} sent · ${formatNumber(
            scheduledCampaigns
          )} scheduled`,
          trend: sentCampaigns > 0 || scheduledCampaigns > 0 ? "up" : "neutral",
          icon: "🚀",
        },
        {
          id: "email-segments",
          label: "Segments",
          value: formatNumber(totalSegments),
          delta: "Audience targeting groups",
          trend: "neutral",
          icon: "🎯",
        },
        {
          id: "email-subscribers",
          label: "Subscribers",
          value: formatNumber(totalSubscribers),
          delta: `${formatNumber(activeSubscribers)} active subscribers`,
          trend: activeSubscribers > 0 ? "up" : "neutral",
          icon: "📬",
        },
        {
          id: "email-templates",
          label: "Templates",
          value: formatNumber(totalTemplates),
          delta: "Reusable campaign designs",
          trend: "neutral",
          icon: "🧩",
        },
        {
          id: "campaign-drafts",
          label: "Draft Campaigns",
          value: formatNumber(draftCampaigns),
          delta: "Campaigns waiting to launch",
          trend: "neutral",
          icon: "📝",
        },
      ]
    : mockStats;

  const revenueSeries =
    revenue.revenueByMonth?.map((item) => {
      const value = Number(
        item.totalRevenue ??
          item.revenue ??
          item.amount ??
          item.total ??
          item.value ??
          item.count ??
          0
      );

      return {
        label: item.label || item.month || item.name || "-",
        value: Number.isFinite(value) ? value : 0,
      };
    }) || [];

  const maxRevenue = revenueSeries.reduce(
    (max, point) => (point.value > max ? point.value : max),
    0
  );

  const safeMax = maxRevenue || 1;

  const coursesFromAdminStats =
    top?.courses?.map((course) => ({
      id: course.courseId || course._id || course.id,
      title: course.title || "Untitled Course",
      level:
        course.level ||
        course.courseLevel ||
        course.course?.level ||
        course.courseDetails?.level ||
        "-",
      enrollments: course.enrollments || 0,
      rating: course.rating,
      status: "Top",
      revenue: course.revenue || 0,
    })) || [];

  const courses =
    topCourses.length > 0
      ? topCourses
      : coursesFromAdminStats.length > 0
      ? coursesFromAdminStats
      : realCourses;

  const users =
    recent?.users?.map((user) => ({
      id: user._id || user.id,
      name: user.name || "Unknown User",
      email: user.email || "-",
      role: user.role || "User",
      status: "Active",
      lastLogin: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : "-",
    })) || [];

  const orders =
    recent?.orders?.map((order) => {
      const customerName = order.user?.name || "";
      const customerEmail = order.user?.email || "";

      const customer =
        customerName && customerEmail
          ? `${customerName} (${customerEmail})`
          : customerName || customerEmail || "Customer";

      const itemsSummary =
        Array.isArray(order.items) && order.items.length > 0
          ? order.items
              .slice(0, 2)
              .map((item) => {
                const title = item?.title || "Item";
                const qty = typeof item?.quantity === "number" ? item.quantity : 1;
                return `${title} ×${qty}`;
              })
              .join(", ")
          : "—";

      const moreItemsCount =
        Array.isArray(order.items) && order.items.length > 2
          ? order.items.length - 2
          : 0;

      const statusLabel = normalizePaymentStatus(order.paymentStatus);

      return {
        id: shortId(order._id),
        rawId: order._id,
        customer,
        product:
          moreItemsCount > 0
            ? `${itemsSummary} (+${moreItemsCount} more)`
            : itemsSummary,
        amount: formatCurrency(order.total),
        status: statusLabel,
        statusVariant: getStatusVariant(statusLabel),
        date: formatDateTime(order.createdAt),
      };
    }) || [];

  const activity = [];

  if (recent?.users) {
    recent.users.slice(0, 2).forEach((user) => {
      activity.push({
        id: `user-${user._id || user.id}`,
        text: `New user • ${user.email || "Unknown email"}`,
        time: user.createdAt
          ? new Date(user.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
      });
    });
  }

  if (recent?.orders) {
    recent.orders.slice(0, 2).forEach((order) => {
      activity.push({
        id: `order-${order._id || order.id}`,
        text: `Order • ${formatCurrency(order.total)} by ${
          order.user?.name || order.user?.email || "Customer"
        }`,
        time: order.createdAt
          ? new Date(order.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
      });
    });
  }

  if (recent?.contacts) {
    recent.contacts.slice(0, 2).forEach((contact) => {
      activity.push({
        id: `contact-${contact._id || contact.id}`,
        text: `New message • ${contact.subject || "Contact form"}`,
        time: contact.createdAt
          ? new Date(contact.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
      });
    });
  }

  const handleQuickActionClick = (action) => {
    if (action.path) {
      navigate(action.path);
      return;
    }

    addToast?.({
      type: "info",
      message: `${action.label} • backend hook coming next`,
    });
  };

  return (
    <Page>
      <Shell>
        {isDashboardLoading && (
          <Panel>
            <PanelTitle>Loading Command Center...</PanelTitle>
            <PanelSubtitle>
              Fetching real users, orders, revenue, subscriptions, reviews, and
              business activity.
            </PanelSubtitle>
          </Panel>
        )}

        <HeaderRow>
          <HeadingBlock>
            <Kicker>KnockoutCodes · Admin Control</Kicker>
            <Title>5-Star Knockout Command Center</Title>
            <Subtitle>
              One luxury dashboard to see every punch of your business — users,
              bookings, sales, and live activity in real time.
            </Subtitle>
          </HeadingBlock>

          <AdminBadge>
            <Avatar>🥊</Avatar>
            <AdminText>
              <span>Yakubu · Super Admin</span>
              <span>Running the whole boxing empire</span>
            </AdminText>
          </AdminBadge>
        </HeaderRow>

        <StatsGrid>
          {statCards.map((stat) => (
            <StatCard
              key={stat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              whileHover={{ y: -4, scale: 1.01 }}
            >
              <StatTopRow>
                <StatIcon>{stat.icon}</StatIcon>
                <StatLabel>{stat.label}</StatLabel>
              </StatTopRow>
              <StatValue>{stat.value}</StatValue>
              <StatDelta $trend={stat.trend}>{stat.delta}</StatDelta>
            </StatCard>
          ))}
        </StatsGrid>

        <MainGrid>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Panel
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <PanelHeader>
                <div>
                  <PanelTitle>Revenue & Activity</PanelTitle>
                  <PanelSubtitle>
                    Monthly revenue flow for KnockoutCodes
                  </PanelSubtitle>
                </div>
                <PanelSubtitle>
                  Total: {formatCurrency(revenue.total)}
                </PanelSubtitle>
              </PanelHeader>

              <PanelBody>
                {revenueSeries.length === 0 ? (
                  <EmptyTableState>
                    No real revenue chart data found yet.
                  </EmptyTableState>
                ) : (
                  <>
                    <RevenueChart>
                      {revenueSeries.map((point) => {
                        const normalized = point.value / safeMax;
                        const height = point.value > 0 ? 40 + normalized * 80 : 16;

                        return (
                          <RevenueBar
                            key={`${point.label}-${point.value}`}
                            $height={Math.max(height, 16)}
                            title={`${point.label}: ${formatCurrency(point.value)}`}
                          />
                        );
                      })}
                    </RevenueChart>

                    <RevenueXAxis>
                      {revenueSeries.map((point) => (
                        <span key={`${point.label}-label`}>{point.label}</span>
                      ))}
                    </RevenueXAxis>
                  </>
                )}

                <RevenueLegend>
                  <span>Each bar = monthly revenue</span>
                  <span>This month: {formatCurrency(revenue.month)}</span>
                </RevenueLegend>
              </PanelBody>
            </Panel>

            <Panel
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <PanelHeader>
                <div>
                  <PanelTitle>Top Performing Courses</PanelTitle>
                  <PanelSubtitle>
                    Knockout programs ranked by enrollments & earnings
                  </PanelSubtitle>
                </div>
                <PanelSubtitle>View all courses</PanelSubtitle>
              </PanelHeader>

              <PanelBody>
                <TableWrapper>
                  <Table>
                    <TableHeader $cols="2fr 1fr 1fr 0.9fr 1.1fr">
                      <span>Course</span>
                      <span>Level</span>
                      <span>Enrollments</span>
                      <span>Rating</span>
                      <span>Revenue</span>
                    </TableHeader>

                    {courses.length === 0 ? (
                      <EmptyTableState>
                        No enrollment-ranked courses yet. Real courses exist,
                        but no students have enrolled yet.
                      </EmptyTableState>
                    ) : (
                      courses.map((course) => (
                        <TableRow
                          key={course.id || course.title}
                          $cols="2fr 1fr 1fr 0.9fr 1.1fr"
                        >
                          <span>{course.title}</span>
                          <span>{course.level || "-"}</span>
                          <span>{formatNumber(course.enrollments)}</span>
                          <StarRating>{formatRating(course.rating)}</StarRating>
                          <span>{formatCurrency(course.revenue)}</span>
                        </TableRow>
                      ))
                    )}
                  </Table>
                </TableWrapper>
              </PanelBody>
            </Panel>

            <Panel
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <PanelHeader>
                <div>
                  <PanelTitle>Newest Users</PanelTitle>
                  <PanelSubtitle>
                    Fresh signups stepping into KnockoutCodes
                  </PanelSubtitle>
                </div>
                <PanelSubtitle>View all users</PanelSubtitle>
              </PanelHeader>

              <PanelBody>
                <TableWrapper>
                  <Table>
                    <TableHeader $cols="1.4fr 1.8fr 0.9fr 0.9fr 0.9fr">
                      <span>Name</span>
                      <span>Email</span>
                      <span>Role</span>
                      <span>Status</span>
                      <span>Joined</span>
                    </TableHeader>

                    {users.length === 0 ? (
                      <EmptyTableState>No real users found yet.</EmptyTableState>
                    ) : (
                      users.map((user) => (
                        <TableRow
                          key={user.id || user.email}
                          $cols="1.4fr 1.8fr 0.9fr 0.9fr 0.9fr"
                        >
                          <span>{user.name}</span>
                          <span>{user.email}</span>
                          <span>{user.role}</span>
                          <Badge $variant="success">{user.status}</Badge>
                          <span>{user.lastLogin}</span>
                        </TableRow>
                      ))
                    )}
                  </Table>
                </TableWrapper>
              </PanelBody>
            </Panel>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Panel
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <PanelHeader>
                <div>
                  <PanelTitle>Admin Shortcuts</PanelTitle>
                  <PanelSubtitle>
                    Jump to any admin management page instantly
                  </PanelSubtitle>
                </div>
              </PanelHeader>

              <PanelBody>
                <QuickActionGrid>
                  {quickActions.map((qa) => (
                    <QuickActionCard
                      key={qa.id}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleQuickActionClick(qa)}
                    >
                      <QAIcon>{qa.icon}</QAIcon>
                      <QAContent>
                        <span>{qa.label}</span>
                        <span>{qa.hint}</span>
                      </QAContent>
                    </QuickActionCard>
                  ))}
                </QuickActionGrid>
              </PanelBody>
            </Panel>

            <Panel
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <PanelHeader>
                <div>
                  <PanelTitle>Recent Orders</PanelTitle>
                  <PanelSubtitle>
                    Latest e-book, course & coaching payments
                  </PanelSubtitle>
                </div>
                <PanelSubtitle>View all orders</PanelSubtitle>
              </PanelHeader>

              <PanelBody>
                <TableWrapper>
                  <Table>
                    <TableHeader $cols="1.1fr 1.3fr 1.4fr 0.8fr 0.7fr">
                      <span>ID</span>
                      <span>Customer</span>
                      <span>Product</span>
                      <span>Amount</span>
                      <span>Status</span>
                    </TableHeader>

                    {orders.length === 0 ? (
                      <EmptyTableState>No real orders found yet.</EmptyTableState>
                    ) : (
                      orders.map((order) => (
                        <TableRow
                          key={order.rawId || order.id}
                          $cols="1.1fr 1.3fr 1.4fr 0.8fr 0.7fr"
                        >
                          <span>{order.id}</span>
                          <span>{order.customer}</span>
                          <span>{order.product}</span>
                          <span>{order.amount}</span>
                          <Badge $variant={order.statusVariant || "default"}>
                            {order.status}
                          </Badge>
                        </TableRow>
                      ))
                    )}
                  </Table>
                </TableWrapper>
              </PanelBody>
            </Panel>

            <Panel
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <PanelHeader>
                <div>
                  <PanelTitle>Live Activity</PanelTitle>
                  <PanelSubtitle>
                    Real-time pulse of everything happening
                  </PanelSubtitle>
                </div>
              </PanelHeader>

              <PanelBody>
                <ActivityList>
                  {activity.length === 0 ? (
                    <ActivityItem>
                      <span>No real activity found yet.</span>
                      <ActivityTime>-</ActivityTime>
                    </ActivityItem>
                  ) : (
                    activity.map((item) => (
                      <ActivityItem key={item.id}>
                        <span>{item.text}</span>
                        <ActivityTime>{item.time}</ActivityTime>
                      </ActivityItem>
                    ))
                  )}
                </ActivityList>
              </PanelBody>
            </Panel>
          </div>
        </MainGrid>
      </Shell>
    </Page>
  );
}