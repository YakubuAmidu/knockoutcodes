// controllers/revenueController.js
import Order from "../models/OrderModel.js";

export const getRevenueSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const [todayAgg, monthAgg, yearAgg, monthlyAgg] = await Promise.all([
      // Today
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      // This month
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      // This year (total)
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfYear },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      // Revenue by month for current year
      Order.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: startOfYear, $lt: startOfNextYear },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" }, // 1–12
            total: { $sum: "$total" },
          },
        },
        { $sort: { "_id": 1 } },
      ]),
    ]);

    const todayRevenue = todayAgg[0]?.total || 0;
    const monthRevenue = monthAgg[0]?.total || 0;
    const yearRevenue = yearAgg[0]?.total || 0;

    // Map monthlyAgg (1–12) into a fixed 12-month array with labels
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const revenueByMonth = monthNames.map((label, index) => {
      const monthIndex = index + 1; // Mongo $month is 1-based
      const match = monthlyAgg.find((m) => m._id === monthIndex);
      return {
        label, // "Jan", "Feb", ...
        totalRevenue: match ? match.total : 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Revenue summary fetched successfully",
      data: {
        todayRevenue,
        monthRevenue,
        yearRevenue,
        revenueByMonth,
      },
    });
  } catch (error) {
    console.error("Error fetching revenue summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue summary",
      error: error.message,
    });
  }
};
