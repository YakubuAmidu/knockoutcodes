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
import Membership from "../models/MembershipModel.js";
import Enrollment from "../models/EnrollmentModel.js";
import Lesson from "../models/LessonModel.js";
import EmailCampaign from "../models/EmailCampaignModel.js";
import EmailSegment from "../models/EmailSegmentModel.js";
import EmailSubscriber from "../models/EmailSubscriberModel.js";
import EmailTemplate from "../models/EmailTemplateModel.js";

const paidOrderMatch = {
  paymentStatus: { $in: ["paid", "succeeded", "success"] },
};

const paidEnrollmentMatch = {
  paymentStatus: "paid",
  status: { $in: ["active", "completed"] },
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getMonthLabel = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const buildLastSixMonths = () => {
  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: getMonthLabel(d),
    });
  }

  return months;
};

const getAggRevenue = (agg) => toNumber(agg?.[0]?.totalRevenue);

const mergeMonthlyRevenue = ({
  lastSixMonths,
  orderRevenueByMonthAgg,
  enrollmentRevenueByMonthAgg,
}) =>
  lastSixMonths.map((m) => {
    const orderFound = orderRevenueByMonthAgg.find(
      (x) => x?._id?.year === m.year && x?._id?.month === m.month,
    );

    const enrollmentFound = enrollmentRevenueByMonthAgg.find(
      (x) => x?._id?.year === m.year && x?._id?.month === m.month,
    );

    return {
      ...m,
      totalRevenue:
        toNumber(orderFound?.totalRevenue) +
        toNumber(enrollmentFound?.totalRevenue),
      orders: toNumber(orderFound?.orders) + toNumber(enrollmentFound?.orders),
    };
  });

const mergeMonthlyUsers = ({ lastSixMonths, newUsersByMonthAgg }) =>
  lastSixMonths.map((m) => {
    const found = newUsersByMonthAgg.find(
      (x) => x?._id?.year === m.year && x?._id?.month === m.month,
    );

    return {
      ...m,
      count: toNumber(found?.count),
    };
  });

export const getAdminStats = async (_req, res) => {
  try {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const lastSixMonths = buildLastSixMonths();

    const [
      totalUsers,
      newUsersLast7Days,

      totalCourses,
      publishedCourses,

      totalSubscriptions,
      activeSubscriptions,
      trialingSubscriptions,
      pastDueSubscriptions,
      canceledSubscriptions,

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
      pendingOrders,
      failedOrders,

      totalProducts,
      activeProducts,

      totalReviews,
      approvedReviews,
      pendingReviews,

      totalMemberships,
      activeMemberships,

      totalEnrollments,
      activeEnrollments,

      totalLessons,
      publishedLessons,

      totalCampaigns,
      sentCampaigns,
      scheduledCampaigns,
      draftCampaigns,

      totalSegments,
      totalSubscribers,
      activeSubscribers,
      totalTemplates,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),

      Course.countDocuments({}),
      Course.countDocuments({
        $or: [{ isPublished: true }, { status: "published" }],
      }),

      Subscription.countDocuments({}),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "trialing" }),
      Subscription.countDocuments({ status: "past_due" }),
      Subscription.countDocuments({ status: "canceled" }),

      Booking.countDocuments({}),
      Booking.countDocuments({
        date: { $gte: startOfToday },
        status: { $nin: ["cancelled", "canceled"] },
      }),

      Contact.countDocuments({}),
      Contact.countDocuments({ status: "unread" }),

      Newsletter.countDocuments({}),
      Testimonial.countDocuments({}),

      Blog.countDocuments({}),
      Blog.countDocuments({ isPublished: true }),

      Order.countDocuments({}),
      Order.countDocuments(paidOrderMatch),
      Order.countDocuments({ paymentStatus: "pending" }),
      Order.countDocuments({
        paymentStatus: { $in: ["failed", "canceled", "cancelled", "refunded"] },
      }),

      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),

      Review.countDocuments({}),
      Review.countDocuments({ isApproved: true }),
      Review.countDocuments({ isApproved: false }),

      Membership.countDocuments({}),
      Membership.countDocuments({
        $or: [{ isActive: true }, { isPublished: true }],
      }),

      Enrollment.countDocuments({}),
      Enrollment.countDocuments({
        status: { $in: ["active", "paid", "completed"] },
      }),

      Lesson.countDocuments({}),
      Lesson.countDocuments({
        $or: [{ isPublished: true }, { status: "published" }],
      }),

      EmailCampaign.countDocuments({}),
      EmailCampaign.countDocuments({ status: "sent" }),
      EmailCampaign.countDocuments({ status: "scheduled" }),
      EmailCampaign.countDocuments({ status: "draft" }),

      EmailSegment.countDocuments({}),
      EmailSubscriber.countDocuments({}),
      EmailSubscriber.countDocuments({
        status: { $in: ["active", "subscribed"] },
      }),
      EmailTemplate.countDocuments({}),
    ]);

    const revenueGroupStage = (field) => ({
      $group: {
        _id: null,
        totalRevenue: { $sum: { $ifNull: [`$${field}`, 0] } },
      },
    });

    const [
      totalOrderRevenueAgg,
      monthOrderRevenueAgg,
      yearOrderRevenueAgg,
      todayOrderRevenueAgg,
      lastMonthOrderRevenueAgg,

      totalEnrollmentRevenueAgg,
      monthEnrollmentRevenueAgg,
      yearEnrollmentRevenueAgg,
      todayEnrollmentRevenueAgg,
      lastMonthEnrollmentRevenueAgg,
    ] = await Promise.all([
      Order.aggregate([{ $match: paidOrderMatch }, revenueGroupStage("total")]),

      Order.aggregate([
        { $match: { ...paidOrderMatch, createdAt: { $gte: startOfMonth } } },
        revenueGroupStage("total"),
      ]),

      Order.aggregate([
        { $match: { ...paidOrderMatch, createdAt: { $gte: startOfYear } } },
        revenueGroupStage("total"),
      ]),

      Order.aggregate([
        { $match: { ...paidOrderMatch, createdAt: { $gte: startOfToday } } },
        revenueGroupStage("total"),
      ]),

      Order.aggregate([
        {
          $match: {
            ...paidOrderMatch,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        revenueGroupStage("total"),
      ]),

      Enrollment.aggregate([
        { $match: paidEnrollmentMatch },
        revenueGroupStage("pricePaid"),
      ]),

      Enrollment.aggregate([
        {
          $match: {
            ...paidEnrollmentMatch,
            createdAt: { $gte: startOfMonth },
          },
        },
        revenueGroupStage("pricePaid"),
      ]),

      Enrollment.aggregate([
        {
          $match: {
            ...paidEnrollmentMatch,
            createdAt: { $gte: startOfYear },
          },
        },
        revenueGroupStage("pricePaid"),
      ]),

      Enrollment.aggregate([
        {
          $match: {
            ...paidEnrollmentMatch,
            createdAt: { $gte: startOfToday },
          },
        },
        revenueGroupStage("pricePaid"),
      ]),

      Enrollment.aggregate([
        {
          $match: {
            ...paidEnrollmentMatch,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        revenueGroupStage("pricePaid"),
      ]),
    ]);

    const totalRevenue =
      getAggRevenue(totalOrderRevenueAgg) +
      getAggRevenue(totalEnrollmentRevenueAgg);

    const monthRevenue =
      getAggRevenue(monthOrderRevenueAgg) +
      getAggRevenue(monthEnrollmentRevenueAgg);

    const yearRevenue =
      getAggRevenue(yearOrderRevenueAgg) +
      getAggRevenue(yearEnrollmentRevenueAgg);

    const todayRevenue =
      getAggRevenue(todayOrderRevenueAgg) +
      getAggRevenue(todayEnrollmentRevenueAgg);

    const revenueLastMonth =
      getAggRevenue(lastMonthOrderRevenueAgg) +
      getAggRevenue(lastMonthEnrollmentRevenueAgg);

    const revenueChangePct =
      revenueLastMonth > 0
        ? ((monthRevenue - revenueLastMonth) / revenueLastMonth) * 100
        : monthRevenue > 0
          ? 100
          : 0;

    const [
      orderRevenueByMonthAgg,
      enrollmentRevenueByMonthAgg,
      newUsersByMonthAgg,
      ordersByStatusAgg,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { ...paidOrderMatch, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalRevenue: { $sum: { $ifNull: ["$total", 0] } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      Enrollment.aggregate([
        {
          $match: {
            ...paidEnrollmentMatch,
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalRevenue: { $sum: { $ifNull: ["$pricePaid", 0] } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      Order.aggregate([
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const revenueByMonth = mergeMonthlyRevenue({
      lastSixMonths,
      orderRevenueByMonthAgg,
      enrollmentRevenueByMonthAgg,
    });

    const newUsersByMonth = mergeMonthlyUsers({
      lastSixMonths,
      newUsersByMonthAgg,
    });

    const ordersByStatus = ordersByStatusAgg.map((item) => ({
      status: item._id || "unknown",
      count: toNumber(item.count),
    }));

    const [
      recentUsers,
      recentOrders,
      recentContacts,
      recentBookings,
      recentReviews,
    ] = await Promise.all([
      User.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name fullName email role createdAt")
        .lean(),

      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name fullName email")
        .select("user total paymentStatus status createdAt items")
        .lean(),

      Contact.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email subject status createdAt")
        .lean(),

      Booking.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name fullName email")
        .select("date type status createdAt")
        .lean(),

      Review.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name fullName email")
        .select("user rating comment isApproved reviewType createdAt")
        .lean(),
    ]);

    const topCoursesFromOrdersAgg = await Order.aggregate([
      { $match: paidOrderMatch },
      { $unwind: "$items" },
      { $match: { "items.productType": "course" } },
      {
        $group: {
          _id: "$items.product",
          enrollments: { $sum: { $ifNull: ["$items.quantity", 1] } },
          revenue: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.unitPrice", 0] },
                { $ifNull: ["$items.quantity", 1] },
              ],
            },
          },
          title: { $first: "$items.title" },
        },
      },
      { $sort: { enrollments: -1, revenue: -1 } },
      { $limit: 5 },
    ]);

    const topCoursesFromEnrollmentsAgg = await Enrollment.aggregate([
      { $match: paidEnrollmentMatch },
      {
        $group: {
          _id: "$course",
          enrollments: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$pricePaid", 0] } },
        },
      },
      { $sort: { enrollments: -1, revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          enrollments: 1,
          revenue: 1,
          title: "$course.title",
        },
      },
    ]);

    const topCoursesMap = new Map();

    for (const item of [
      ...topCoursesFromOrdersAgg,
      ...topCoursesFromEnrollmentsAgg,
    ]) {
      const key = String(item._id || item.title || "");
      if (!key) continue;

      const existing = topCoursesMap.get(key) || {
        courseId: item._id,
        title: item.title || "Untitled Course",
        enrollments: 0,
        revenue: 0,
      };

      existing.enrollments += toNumber(item.enrollments);
      existing.revenue += toNumber(item.revenue);

      topCoursesMap.set(key, existing);
    }

    const topCourses = Array.from(topCoursesMap.values())
      .sort((a, b) => b.enrollments - a.enrollments || b.revenue - a.revenue)
      .slice(0, 5);

    const subscriptionStatusBreakdown = [
      { status: "active", count: activeSubscriptions },
      { status: "trialing", count: trialingSubscriptions },
      { status: "past_due", count: pastDueSubscriptions },
      { status: "canceled", count: canceledSubscriptions },
    ];

    return res.status(200).json({
      success: true,
      message: "Admin stats fetched successfully",
      data: {
        cards: {
          totalUsers,
          newUsersLast7Days,

          totalCourses,
          publishedCourses,

          totalSubscriptions,
          activeSubscriptions,
          trialingSubscriptions,
          pastDueSubscriptions,
          canceledSubscriptions,

          totalBookings,
          upcomingBookings,
          totalCoachings: totalBookings,
          totalCoachingSessions: totalBookings,

          totalContacts,
          unreadContacts,

          totalNewsletters,
          totalTestimonials,

          totalBlogs,
          publishedBlogs,

          totalOrders,
          paidOrders,
          pendingOrders,
          failedOrders,

          totalProducts,
          activeProducts,

          totalReviews,
          approvedReviews,
          pendingReviews,

          totalMemberships,
          activeMemberships,

          totalEnrollments,
          activeEnrollments,

          totalLessons,
          publishedLessons,

          totalCampaigns,
          sentCampaigns,
          scheduledCampaigns,
          draftCampaigns,

          totalSegments,
          totalSubscribers,
          activeSubscribers,
          totalTemplates,
        },

        revenue: {
          totalRevenue,
          todayRevenue,
          monthRevenue,
          yearRevenue,
          revenueThisMonth: monthRevenue,
          revenueLastMonth,
          revenueChangePct,
        },

        charts: {
          revenueByMonth,
          newUsersByMonth,
          ordersByStatus,
          subscriptionStatusBreakdown,
        },

        recent: {
          users: recentUsers,
          orders: recentOrders,
          contacts: recentContacts,
          bookings: recentBookings,
          reviews: recentReviews,
        },

        top: {
          courses: topCourses,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin stats",
    });
  }
};

export default {
  getAdminStats,
};
