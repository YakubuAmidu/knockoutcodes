// controllers/adminStatsController.js
import User from "../models/UserModel.js";
import Course from "../models/CourseModel.js";
import Subscription from "../models/UserSubscriptionModel.js";
import Booking from "../models/CoachingModel.js";
import Contact from "../models/ContactModel.js";
import Newsletter from "../models/NewsletterModel.js";
import Testimonial from "../models/Testimonial.js";
import Blog from "../models/BlogModel.js";
import Order from "../models/OrderModel.js";
import Product from "../models/ProductModel.js";
import Review from "../models/ReviewModel.js";

// @desc    Get overall admin stats for dashboard
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req, res) => {
  try {
    const now = new Date();

    // Dates
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // ===== Basic Totals (run in parallel) =====
    const [
      totalUsers,
      newUsersLast7Days,
      totalCourses,

      totalSubscriptions,
      activeSubscriptions,

      totalBookings,
      upcomingBookings,

      totalContacts,
      unreadContacts,

      totalNewsletters,
      totalTestimonials,

      totalBlogs,
      publishedBlogs,

      totalOrders,
      paidOrders,

      // ✅ Products
      totalProducts,
      activeProducts,

      // ✅ Reviews
      totalReviews,
      approvedReviews,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Course.countDocuments({}),

      Subscription.countDocuments({}),
      Subscription.countDocuments({ status: "active" }),

      Booking.countDocuments({}),
      Booking.countDocuments({
        date: { $gte: startOfToday },
        status: { $ne: "cancelled" },
      }),

      Contact.countDocuments({}),
      Contact.countDocuments({ status: "unread" }),

      Newsletter.countDocuments({}),
      Testimonial.countDocuments({}),

      Blog.countDocuments({}),
      Blog.countDocuments({ isPublished: true }),

      Order.countDocuments({}),
      Order.countDocuments({ paymentStatus: "paid" }),

      // ✅ Products
      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),

      // ✅ Reviews
      Review.countDocuments({}),
      Review.countDocuments({ isApproved: true }),
    ]);

    // ===== Revenue Stats (all in one endpoint; no /admin/revenue needed) =====
    const [
      totalRevenueAgg,
      monthRevenueAgg,
      yearRevenueAgg,
      todayRevenueAgg,
      lastMonthRevenueAgg,
    ] = await Promise.all([
      // total revenue (all time)
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
      // month revenue
      Order.aggregate([
        { $match: { paymentStatus: "paid", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
      // year revenue
      Order.aggregate([
        { $match: { paymentStatus: "paid", createdAt: { $gte: startOfYear } } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
      // today revenue
      Order.aggregate([
        { $match: { paymentStatus: "paid", createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
      // last month revenue (for MoM %)
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
    ]);

    const totalRevenue = totalRevenueAgg?.[0]?.totalRevenue || 0;
    const monthRevenue = monthRevenueAgg?.[0]?.totalRevenue || 0;
    const yearRevenue = yearRevenueAgg?.[0]?.totalRevenue || 0;
    const todayRevenue = todayRevenueAgg?.[0]?.totalRevenue || 0;
    const revenueLastMonth = lastMonthRevenueAgg?.[0]?.totalRevenue || 0;

    // Month-over-month change (%)
    let revenueChangePct = 0;
    if (revenueLastMonth > 0) {
      revenueChangePct = ((monthRevenue - revenueLastMonth) / revenueLastMonth) * 100;
    }

    // ===== Charts: Revenue Last 6 Months =====
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const revenueByMonthAgg = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalRevenue: { $sum: "$total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const revenueByMonth = revenueByMonthAgg.map((item) => {
      const { year, month } = item._id;
      return {
        year,
        month,
        label: `${month.toString().padStart(2, "0")}/${year}`,
        totalRevenue: item.totalRevenue,
      };
    });

    // ===== Charts: New Users Last 6 Months =====
    const newUsersByMonthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const newUsersByMonth = newUsersByMonthAgg.map((item) => {
      const { year, month } = item._id;
      return {
        year,
        month,
        label: `${month.toString().padStart(2, "0")}/${year}`,
        count: item.count,
      };
    });

    // ===== Recent Activity =====
    const [recentUsers, recentOrders, recentContacts, recentBookings] = await Promise.all([
      User.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email role createdAt"),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email")
        .select("user total paymentStatus createdAt items"),
      Contact.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email subject status createdAt"),
      Booking.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email")
        .select("date type status createdAt"),
    ]);

    // ===== Top Courses by Orders (simple aggregation) =====
    const topCoursesAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$items" },
      { $match: { "items.productType": "course" } },
      {
        $group: {
          _id: "$items.product",
          enrollments: { $sum: "$items.quantity" },
          // if unitPrice is per item, multiply by quantity for accuracy
          revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          title: { $first: "$items.title" },
        },
      },
      { $sort: { enrollments: -1 } },
      { $limit: 5 },
    ]);

    const topCourses = topCoursesAgg.map((c) => ({
      courseId: c._id,
      title: c.title,
      enrollments: c.enrollments,
      revenue: c.revenue,
    }));

    // ===== Final Response =====
    return res.status(200).json({
      success: true,
      message: "Admin stats fetched successfully",
      data: {
        // Top stat cards
        cards: {
          totalUsers,
          newUsersLast7Days,
          totalCourses,

          totalSubscriptions,
          activeSubscriptions,

          totalBookings,
          upcomingBookings,

          totalContacts,
          unreadContacts,

          totalNewsletters,
          totalTestimonials,

          totalBlogs,
          publishedBlogs,

          totalOrders,
          paidOrders,

          // ✅ Products
          totalProducts,
          activeProducts,

          // ✅ Reviews
          totalReviews,
          approvedReviews,

          // ✅ compatibility aliases (prevents UI breaks)
          totalCoachings: totalBookings,
          totalCoachingSessions: totalBookings,
        },

        // Revenue summary (includes fields your old /admin/revenue effect expected)
        revenue: {
          // all-time
          totalRevenue,

          // month + last month + MoM%
          revenueThisMonth: monthRevenue,
          revenueLastMonth,
          revenueChangePct,

          // fields your frontend normalizer supports
          todayRevenue,
          monthRevenue,
          yearRevenue,
        },

        // Chart data
        charts: {
          revenueByMonth,
          newUsersByMonth,
        },

        // Activity sections
        recent: {
          users: recentUsers,
          orders: recentOrders,
          contacts: recentContacts,
          bookings: recentBookings,
        },

        // Top lists
        top: {
          courses: topCourses,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin stats",
      error: error.message,
    });
  }
};

export default {
  getAdminStats,
};
