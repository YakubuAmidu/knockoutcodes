// src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { useToast } from "../components/Toast";

// =======================
// Mock Data (fallbacks when backend is empty / unavailable)
// =======================
const mockStats = [
  {
    id: "users",
    label: "Total Users",
    value: "3,248",
    delta: "+12% vs last week",
    trend: "up",
    icon: "👤",
  },
  {
    id: "activeMembers",
    label: "Active Members",
    value: "1,487",
    delta: "+6% this month",
    trend: "up",
    icon: "🥊",
  },
  {
    id: "courses",
    label: "Courses & Programs",
    value: "18",
    delta: "14 published · 4 draft",
    trend: "neutral",
    icon: "🎓",
  },
  {
    id: "revenue",
    label: "Monthly Revenue",
    value: "$12,940",
    delta: "+23% vs last month",
    trend: "up",
    icon: "💰",
  },
];

const mockRevenueSeries = [
  { label: "Mon", value: 30 },
  { label: "Tue", value: 55 },
  { label: "Wed", value: 40 },
  { label: "Thu", value: 65 },
  { label: "Fri", value: 90 },
  { label: "Sat", value: 75 },
  { label: "Sun", value: 50 },
];

const mockCourses = [
  {
    id: "snap-jab-mastery",
    title: "Snap Jab Mastery",
    level: "Intermediate",
    enrollments: 842,
    rating: 4.9,
    status: "Published",
    revenue: 12940,
  },
  {
    id: "footwork-blueprint",
    title: "Footwork Blueprint",
    level: "Beginner",
    enrollments: 623,
    rating: 4.8,
    status: "Published",
    revenue: 8900,
  },
  {
    id: "power-punching-lab",
    title: "Power Punching Lab",
    level: "Advanced",
    enrollments: 311,
    rating: 4.7,
    status: "Draft",
    revenue: 5400,
  },
];

const mockUsers = [
  {
    id: "u1",
    name: "John Carter",
    email: "john.carter@example.com",
    role: "User",
    status: "Active",
    lastLogin: "2h ago",
  },
  {
    id: "u2",
    name: "Sara Kim",
    email: "sara.kim@example.com",
    role: "User",
    status: "Trial",
    lastLogin: "5h ago",
  },
  {
    id: "u3",
    name: "Coach Malik",
    email: "coach.malik@example.com",
    role: "Coach",
    status: "Active",
    lastLogin: "15m ago",
  },
];

const mockOrders = [
  {
    id: "ORD-2043",
    customer: "Emily Stone",
    product: "KnockoutCodes Elite Course",
    amount: "$149",
    status: "Paid",
    date: "Today",
  },
  {
    id: "ORD-2042",
    customer: "David Lee",
    product: "Snap Jab eBook",
    amount: "$29",
    status: "Paid",
    date: "Today",
  },
  {
    id: "ORD-2039",
    customer: "Maria Lopez",
    product: "1-on-1 Coaching (60min)",
    amount: "$199",
    status: "Pending",
    date: "Yesterday",
  },
];

const mockActivity = [
  {
    id: "a1",
    text: "New review • 5★ on “Snap Jab Mastery”",
    time: "5m ago",
  },
  {
    id: "a2",
    text: "New user registered • michael.boxing@example.com",
    time: "27m ago",
  },
  {
    id: "a3",
    text: "Order ORD-2043 completed • $149",
    time: "1h ago",
  },
  {
    id: "a4",
    text: "New message • “Need help with footwork drill 3”",
    time: "3h ago",
  },
];

// =======================
// UPDATED Quick Actions: all link to details pages
// =======================
const quickActions = [
  { id: "qa1", label: "View All Users", hint: "Manage every registered member", icon: "👤", path: "/admin-users" },
  { id: "qa2", label: "View All Courses", hint: "Track every program & lesson", icon: "🎓", path: "/admin-courses" },
  { id: "qa3", label: "View All Orders", hint: "See every sale & invoice", icon: "🧾", path: "/admin-orders" },
  { id: "qa4", label: "Support Inbox", hint: "Reply to contacts & questions", icon: "📬", path: "/admin-contacts" },
];

// =======================
// Styled Components
// =======================

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
  opacity: 0.9;
`;

const Title = styled.h1`
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.ivory};
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
  background: radial-gradient(
    circle at 30% 0,
    #f6e2cf 0%,
    #8d5d3b 38%,
    #2f1b12 100%
  );
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
    color: ${({ theme }) => theme.colors.ivory};
  }

  span:last-child {
    font-size: 11px;
    color: rgba(255, 249, 242, 0.65);
  }
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
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
  padding: 16px 16px 14px;
  box-shadow: ${({ theme }) => theme.shadow.glow};
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
`;

const StatTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
  font-size: 18px;
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
  color: ${({ theme }) => theme.colors.ivory};
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
  align-items: flex-start;
  margin-top: 4px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled(motion.section)`
  background: ${({ theme }) => theme.colors.glass};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
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
`;

// UPDATED: no ::after label here; labels will be rendered under the graph
const RevenueBar = styled.div`
  flex: 1;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.cocoa}
  );
  box-shadow: ${({ theme }) => theme.shadow.soft};
  height: ${({ $height }) => $height}px;
  position: relative;
`;

// NEW: explicit x-axis labels under the graph
const RevenueXAxis = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 249, 242, 0.75);

  span {
    flex: 1;
    text-align: center;
  }
`;

const RevenueLegend = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 249, 242, 0.75);
  margin-top: 4px;
`;

const Table = styled.div`
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
  align-items: center;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const QuickActionCard = styled(motion.button)`
  border: none;
  outline: none;
  cursor: pointer;
  text-align: left;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      rgba(0, 0, 0, 0.6)
    );
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
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

// =======================
// Helpers
// =======================
const formatCurrency = (n) => {
  if (typeof n !== "number") return "-";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

const formatNumber = (n) => {
  if (typeof n !== "number") return "0";
  return n.toLocaleString();
};

// ✅ Shortens Mongo _id for nicer display
const shortId = (id) => {
  if (!id) return "-";
  const str = String(id);
  return str.length <= 8 ? str : `${str.slice(0, 6)}...${str.slice(-4)}`;
};

// ✅ Formats date into readable "Feb 7, 2026 • 3:45 PM"
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

// ✅ Normalizes payment status for consistent UI badges
const normalizePaymentStatus = (status) => {
  const s = String(status || "").toLowerCase();

  if (["paid", "succeeded", "success"].includes(s)) return "Paid";
  if (["pending", "processing"].includes(s)) return "Pending";
  if (["failed", "canceled", "cancelled", "refunded"].includes(s)) return "Failed";

  return status ? String(status) : "Unknown";
};

// ✅ Maps status → badge variant (matches your Badge component)
const getStatusVariant = (statusLabel) => {
  const s = String(statusLabel || "").toLowerCase();
  if (s === "paid") return "success";
  if (s === "pending") return "warning";
  if (s === "failed") return "default";
  return "default";
};

// UPDATED: rating formatter – default to 5★ when missing (5-star enrollment)
const formatRating = (rating) => {
  if (rating === null || rating === undefined) return "★ 5.0";
  const num = Number(rating);
  if (Number.isNaN(num)) return "★ 5.0";
  return `★ ${num.toFixed(1)}`;
};

// =======================
// Component
// =======================

export default function AdminDashboard() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [revenueStats] = useState(null);
  const [topCourses, setTopCourses] = useState([]); // REAL top courses from backend

  // ---- Fetch core admin stats ----
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axiosInstance.get("/admin/stats");

        if (!res.data?.success) {
          throw new Error(res.data?.message || "Failed to fetch admin stats");
        }

        setStats(res.data.data);
      } catch (error) {
        console.error("AdminDashboard stats error:", error);
        addToast?.({
          type: "error",
          message:
            error.response?.data?.message ||
            "Failed to load dashboard stats. Showing demo data.",
        });
      }
    };

    fetchStats();
  }, [addToast]);

  // ---- Fetch top performing courses from /api/v1/enrollments/top-courses ----
  useEffect(() => {
    const fetchTopCourses = async () => {
      try {
        const res = await axiosInstance.get(
          "/enrollments/top-courses?limit=3",
          {
            withCredentials: true,
          }
        );

        const payload = res.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        if (!list.length) {
          return; // fallback to admin stats or mock data
        }

        const mapped = list.map((course) => ({
          id: course.courseId || course._id || course.id,
          title: course.title || "Untitled Course",
          // UPDATED: make sure we pick up level from multiple possible fields
          level:
            course.level ||
            course.courseLevel ||
            course.course?.level ||
            course.courseDetails?.level ||
            "-",
          enrollments:
            typeof course.enrollments === "number"
              ? course.enrollments
              : 0,
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
        addToast?.({
          type: "error",
          message:
            error.response?.data?.message ||
            "Failed to load top courses. Showing demo courses.",
        });
      }
    };

    fetchTopCourses();
  }, [addToast]);

  const cards = stats?.cards;

  // Safely read all totals (fallback to 0 so we don't create errors)
  const totalUsers = cards?.totalUsers ?? 0;
  const newUsersLast7Days = cards?.newUsersLast7Days ?? 0;

  const totalBookings = cards?.totalBookings ?? 0;
  const upcomingBookings = cards?.upcomingBookings ?? 0;

  const totalContacts = cards?.totalContacts ?? 0;
  const unreadContacts = cards?.unreadContacts ?? 0;

  const totalCourses = cards?.totalCourses ?? 0;
  const totalOrders = cards?.totalOrders ?? 0;
  const totalReviews = cards?.totalReviews ?? 0;
  const totalSubscriptions = cards?.totalSubscriptions ?? 0;
  const totalTestimonials = cards?.totalTestimonials ?? 0;
  const totalNewsletters = cards?.totalNewsletters ?? 0;
  const totalBlogs = cards?.totalBlogs ?? 0;
  const totalCoaching =
    cards?.totalCoachingSessions ?? cards?.totalCoachings ?? 0;
  // ✅ Products
const totalProducts = cards?.totalProducts ?? 0;
const activeProducts = cards?.activeProducts ?? 0;

// ✅ Reviews
const approvedReviews = cards?.approvedReviews ?? 0;

  // Normalize revenue so UI code is simple
  const rawRevenue = revenueStats || stats?.revenue || null;
  const revenue = rawRevenue
    ? {
        month:
          typeof rawRevenue.monthRevenue === "number"
            ? rawRevenue.monthRevenue
            : rawRevenue.revenueThisMonth ?? 0,
        today:
          typeof rawRevenue.todayRevenue === "number"
            ? rawRevenue.todayRevenue
            : rawRevenue.revenueToday ?? 0,
        total:
          typeof rawRevenue.yearRevenue === "number"
            ? rawRevenue.yearRevenue
            : rawRevenue.totalRevenue ?? 0,
        changePct:
          typeof rawRevenue.revenueChangePct === "number"
            ? rawRevenue.revenueChangePct
            : null,
        revenueByMonth: rawRevenue.revenueByMonth || [],
      }
    : null;

  const recent = stats?.recent;
  const top = stats?.top;

  // ===== Top Stat Cards (merge backend + design) =====
  const statCards = cards
    ? [
        // Existing key cards
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
          value: formatCurrency(revenue?.month || 0),
          delta:
            revenue && typeof revenue.today === "number"
              ? `Today: ${formatCurrency(revenue.today)}`
              : "Today: -",
          trend:
            revenue && typeof revenue.changePct === "number"
              ? revenue.changePct > 0
                ? "up"
                : revenue.changePct < 0
                ? "down"
                : "neutral"
              : "neutral",
          icon: "💰",
        },

        // New cards
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
          delta: "Active recurring members",
          trend: "neutral",
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
  value: formatNumber(totalReviews),
  delta: `${formatNumber(approvedReviews)} approved`,
  trend: approvedReviews > 0 ? "up" : "neutral",
  icon: "⭐",
},
      ]
    : mockStats;

  // ===== Revenue Series (scale bars nicely) =====
  const backendRevenueSeries =
    revenue?.revenueByMonth?.map((item) => ({
      label: item.label,
      value: item.totalRevenue || 0,
    })) || [];

  const revenueSeries =
    backendRevenueSeries.length > 0 ? backendRevenueSeries : mockRevenueSeries;

  const maxRevenue = revenueSeries.reduce(
    (max, p) => (p.value > max ? p.value : max),
    0
  );
  const safeMax = maxRevenue || 1;

  // ===== Courses Table Data (UPDATED to prefer real data from enrollments backend) =====
  const coursesFromAdminStats =
    top?.courses?.map((c) => ({
      id: c.courseId,
      title: c.title,
      // UPDATED: pull level from multiple possible fields for admin stats too
      level:
        c.level ||
        c.courseLevel ||
        c.course?.level ||
        c.courseDetails?.level ||
        "-",
      enrollments: c.enrollments || 0,
      rating: c.rating,
      status: "Top",
      revenue: c.revenue || 0,
    })) || [];

  const courses =
    topCourses.length > 0
      ? topCourses
      : coursesFromAdminStats.length > 0
      ? coursesFromAdminStats
      : mockCourses;

  // ===== Users Table Data =====
  const usersFromBackend =
    recent?.users?.map((u) => ({
      id: u._id,
      name: u.name || "Unknown User",
      email: u.email || "-",
      role: u.role || "User",
      status: "Active",
      lastLogin: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString()
        : "-",
    })) || [];

  const users = usersFromBackend.length > 0 ? usersFromBackend : mockUsers;

  // ===== Orders Table Data =====
const ordersFromBackend =
  recent?.orders?.map((o) => {
    const customerName = o.user?.name || "";
    const customerEmail = o.user?.email || "";
    const customer =
      customerName && customerEmail
        ? `${customerName} (${customerEmail})`
        : customerName || customerEmail || "Customer";

    const itemsSummary =
      Array.isArray(o.items) && o.items.length > 0
        ? o.items
            .slice(0, 2) // show first 2 items for readability
            .map((it) => {
              const title = it?.title || "Item";
              const qty = typeof it?.quantity === "number" ? it.quantity : 1;
              return `${title} ×${qty}`;
            })
            .join(", ")
        : "—";

    const moreItemsCount =
      Array.isArray(o.items) && o.items.length > 2 ? o.items.length - 2 : 0;

    const statusLabel = normalizePaymentStatus(o.paymentStatus);

    return {
      // display ID is shortened (better UX)
      id: shortId(o._id),

      // keep raw id if you want later (optional)
      rawId: o._id,

      customer,
      product: moreItemsCount > 0 ? `${itemsSummary} (+${moreItemsCount} more)` : itemsSummary,
      amount: formatCurrency(o.total),
      status: statusLabel,
      statusVariant: getStatusVariant(statusLabel),
      date: formatDateTime(o.createdAt),
    };
  }) || [];

const orders = ordersFromBackend.length > 0 ? ordersFromBackend : mockOrders;

  // ===== Activity Feed (simple combined stream) =====
  const activityFromBackend = [];

  if (recent?.users) {
    recent.users.slice(0, 2).forEach((u) => {
      activityFromBackend.push({
        id: `user-${u._id}`,
        text: `New user • ${u.email}`,
        time: u.createdAt
          ? new Date(u.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      });
    });
  }

  if (recent?.orders) {
    recent.orders.slice(0, 2).forEach((o) => {
      activityFromBackend.push({
        id: `order-${o._id}`,
        text: `Order • ${formatCurrency(o.total)} by ${
          o.user?.name || o.user?.email || "Customer"
        }`,
        time: o.createdAt
          ? new Date(o.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      });
    });
  }

  if (recent?.contacts) {
    recent.contacts.slice(0, 2).forEach((c) => {
      activityFromBackend.push({
        id: `contact-${c._id}`,
        text: `New message • ${c.subject || "Contact form"}`,
        time: c.createdAt
          ? new Date(c.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      });
    });
  }

  const activity =
    activityFromBackend.length > 0 ? activityFromBackend : mockActivity;

  // ===== UPDATED Quick Actions handler: navigate to details pages =====
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
    <>
      <Page>
        <Shell>
          <HeaderRow>
            <HeadingBlock>
              <Kicker>KnockoutCodes · Admin Control</Kicker>
              <Title>5-Star Knockout Command Center</Title>
              <Subtitle>
                One luxury dashboard to see every punch of your business —
                users, bookings, sales, and live activity in real time.
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

          {/* Top Stats */}
          <StatsGrid>
            {statCards.map((stat) => (
              <StatCard
                key={stat.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
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

          {/* Main Content */}
          <MainGrid>
            {/* Left column: charts + tables */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Revenue / Analytics Panel */}
              <Panel
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
              >
                <PanelHeader>
                  <div>
                    <PanelTitle>Revenue & Activity</PanelTitle>
                    <PanelSubtitle>
                      Monthly revenue flow for KnockoutCodes
                    </PanelSubtitle>
                  </div>
                  <PanelSubtitle>
                    Total: {formatCurrency(revenue?.total || 0)}
                  </PanelSubtitle>
                </PanelHeader>
                <PanelBody>
                  <RevenueChart>
                    {revenueSeries.map((point) => {
                      const normalized =
                        safeMax === 0 ? 0 : point.value / safeMax;
                      const height = 40 + normalized * 80;

                      return (
                        <RevenueBar key={point.label} $height={height} />
                      );
                    })}
                  </RevenueChart>

                  {/* NEW: all labels under the graph */}
                  <RevenueXAxis>
                    {revenueSeries.map((point) => (
                      <span key={point.label}>{point.label}</span>
                    ))}
                  </RevenueXAxis>

                  <RevenueLegend>
                    <span>Each bar = monthly revenue</span>
                    <span>
                      This month: {formatCurrency(revenue?.month || 0)}
                    </span>
                  </RevenueLegend>
                </PanelBody>
              </Panel>

              {/* Courses Table (UPDATED to use real top courses) */}
              <Panel
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
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
                  <Table>
                    <TableHeader $cols="2fr 1fr 1fr 0.9fr 1.1fr">
                      <span>Course</span>
                      <span>Level</span>
                      <span>Enrollments</span>
                      <span>Rating</span>
                      <span>Revenue</span>
                    </TableHeader>
                    {courses.map((course) => (
                      <TableRow
                        key={course.id}
                        $cols="2fr 1fr 1fr 0.9fr 1.1fr"
                      >
                        <span>{course.title}</span>
                        <span>{course.level || "-"}</span>
                        <span>{formatNumber(course.enrollments)}</span>
                        <StarRating>{formatRating(course.rating)}</StarRating>
                        <span>{formatCurrency(course.revenue)}</span>
                      </TableRow>
                    ))}
                  </Table>
                </PanelBody>
              </Panel>

              {/* Users Table */}
              <Panel
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 }}
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
                  <Table>
                    <TableHeader $cols="1.4fr 1.8fr 0.9fr 0.9fr 0.9fr">
                      <span>Name</span>
                      <span>Email</span>
                      <span>Role</span>
                      <span>Status</span>
                      <span>Joined</span>
                    </TableHeader>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        $cols="1.4fr 1.8fr 0.9fr 0.9fr 0.9fr"
                      >
                        <span>{user.name}</span>
                        <span>{user.email}</span>
                        <span>{user.role}</span>
                        <Badge
                          $variant={
                            user.status === "Active"
                              ? "success"
                              : user.status === "Trial"
                              ? "warning"
                              : "default"
                          }
                        >
                          {user.status}
                        </Badge>
                        <span>{user.lastLogin}</span>
                      </TableRow>
                    ))}
                  </Table>
                </PanelBody>
              </Panel>
            </div>

            {/* Right column: quick actions, orders, activity */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Quick Actions */}
              <Panel
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <PanelHeader>
                  <div>
                    <PanelTitle>Quick Actions</PanelTitle>
                    <PanelSubtitle>
                      One-tap shortcuts to move the brand faster
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

              {/* Recent Orders */}
              <Panel
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.14 }}
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
                  <Table>
                    <TableHeader $cols="1.1fr 1.3fr 1.4fr 0.8fr 0.7fr">
                      <span>ID</span>
                      <span>Customer</span>
                      <span>Product</span>
                      <span>Amount</span>
                      <span>Status</span>
                    </TableHeader>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        $cols="1.1fr 1.3fr 1.4fr 0.8fr 0.7fr"
                      >
                        <span>{order.id}</span>
                        <span>{order.customer}</span>
                        <span>{order.product}</span>
                        <span>{order.amount}</span>
                        <Badge
                          $variant={order.statusVariant || "default" }
                        >
                          {order.status}
                        </Badge>
                      </TableRow>
                    ))}
                  </Table>
                </PanelBody>
              </Panel>

              {/* Activity Feed */}
              <Panel
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
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
                    {activity.map((item) => (
                      <ActivityItem key={item.id}>
                        <span>{item.text}</span>
                        <ActivityTime>{item.time}</ActivityTime>
                      </ActivityItem>
                    ))}
                  </ActivityList>
                </PanelBody>
              </Panel>
            </div>
          </MainGrid>
        </Shell>
      </Page>

      <Footer />
    </>
  );
}
