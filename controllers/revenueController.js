import mongoose from "mongoose";
import Order from "../models/OrderModel.js";
import Revenue from "../models/RevenueModel.js";

const PAID_STATUSES = ["paid", "succeeded", "completed"];

const toNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
};

const normalizeText = (value) =>
  String(value || "").replace(/\s+/g, " ").trim();

const getStartDates = () => {
  const now = new Date();

  return {
    now,
    startOfToday: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    startOfYear: new Date(now.getFullYear(), 0, 1),
    startOfNextYear: new Date(now.getFullYear() + 1, 0, 1),
  };
};

const getItemType = (item = {}) => {
  const raw =
    item.productType ||
    item.itemType ||
    item.type ||
    item.category ||
    item.productModel ||
    "other";

  const value = String(raw).toLowerCase();

  if (value.includes("membership")) return "membership";
  if (value.includes("subscription")) return "subscription";
  if (value.includes("course")) return "course";
  if (value.includes("ebook") || value.includes("e-book")) return "ebook";
  if (value.includes("coaching")) return "coaching";
  if (value.includes("product")) return "product";

  return "other";
};

const buildRevenueRecordFromOrder = (order) => {
  const items = Array.isArray(order.items) ? order.items : [];
  const firstItem = items[0] || {};

  const itemType =
    items.length === 1
      ? getItemType(firstItem)
      : items.length > 1
      ? "order"
      : "other";

  const itemTitle =
    items.length === 1
      ? firstItem.title || firstItem.name || "Order item"
      : items.length > 1
      ? `${items.length} items`
      : "Order";

  return {
    _id: order._id,
    id: order._id,
    recordType: "order",
    source: "order",
    itemType,
    itemTitle,
    order: order._id,
    user: order.user || null,
    customerName:
      order.user?.name ||
      order.customerName ||
      order.shippingAddress?.fullName ||
      "Customer",
    email:
      order.user?.email ||
      order.email ||
      order.shippingAddress?.email ||
      "",
    amount: toNumber(order.total),
    total: toNumber(order.total),
    currency: order.currency || "USD",
    status: order.status || "new",
    paymentStatus: order.paymentStatus || "pending",
    stripeSessionId: order.stripeSessionId || "",
    transactionId: order.transactionId || "",
    note: order.note || "",
    items,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

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

export const getRevenueSummary = async (req, res) => {
  try {
    const {
      startOfToday,
      startOfMonth,
      startOfYear,
      startOfNextYear,
    } = getStartDates();

    const paidMatch = {
      paymentStatus: { $in: PAID_STATUSES },
    };

    const [
      todayAgg,
      monthAgg,
      yearAgg,
      totalAgg,
      monthlyAgg,
      typeAgg,
      orderCounts,
      orders,
      manualRevenue,
    ] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            ...paidMatch,
            createdAt: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),

      Order.aggregate([
        {
          $match: {
            ...paidMatch,
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),

      Order.aggregate([
        {
          $match: {
            ...paidMatch,
            createdAt: { $gte: startOfYear },
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),

      Order.aggregate([
        { $match: paidMatch },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),

      Order.aggregate([
        {
          $match: {
            ...paidMatch,
            createdAt: { $gte: startOfYear, $lt: startOfNextYear },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            total: { $sum: "$total" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Order.aggregate([
        { $match: paidMatch },
        { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            itemTypeRaw: {
              $toLower: {
                $ifNull: [
                  "$items.productType",
                  {
                    $ifNull: [
                      "$items.itemType",
                      {
                        $ifNull: ["$items.productModel", "other"],
                      },
                    ],
                  },
                ],
              },
            },
            itemRevenue: {
              $multiply: [
                { $ifNull: ["$items.unitPrice", 0] },
                { $ifNull: ["$items.quantity", 1] },
              ],
            },
          },
        },
        {
          $addFields: {
            itemType: {
              $switch: {
                branches: [
                  {
                    case: {
                      $regexMatch: {
                        input: "$itemTypeRaw",
                        regex: /membership/,
                      },
                    },
                    then: "membership",
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: "$itemTypeRaw",
                        regex: /subscription/,
                      },
                    },
                    then: "subscription",
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: "$itemTypeRaw",
                        regex: /course/,
                      },
                    },
                    then: "course",
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: "$itemTypeRaw",
                        regex: /ebook|e-book/,
                      },
                    },
                    then: "ebook",
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: "$itemTypeRaw",
                        regex: /coaching/,
                      },
                    },
                    then: "coaching",
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: "$itemTypeRaw",
                        regex: /product/,
                      },
                    },
                    then: "product",
                  },
                ],
                default: "other",
              },
            },
          },
        },
        {
          $group: {
            _id: "$itemType",
            total: {
              $sum: {
                $cond: [
                  { $gt: ["$itemRevenue", 0] },
                  "$itemRevenue",
                  "$total",
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            paidOrders: {
              $sum: {
                $cond: [{ $in: ["$paymentStatus", PAID_STATUSES] }, 1, 0],
              },
            },
            refundedOrders: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 1, 0],
              },
            },
          },
        },
      ]),

      Order.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("user", "name email")
        .lean(),

      Revenue.find({ isHiddenFromReports: false })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("user", "name email")
        .lean(),
    ]);

    const revenueByMonth = monthNames.map((label, index) => {
      const monthIndex = index + 1;
      const match = monthlyAgg.find((item) => item._id === monthIndex);

      return {
        label,
        totalRevenue: toNumber(match?.total),
      };
    });

    const revenueByType = {
      product: 0,
      course: 0,
      membership: 0,
      subscription: 0,
      ebook: 0,
      coaching: 0,
      other: 0,
    };

    typeAgg.forEach((item) => {
      revenueByType[item._id || "other"] = toNumber(item.total);
    });

    const orderRevenueRecords = orders.map(buildRevenueRecordFromOrder);

    const manualRevenueRecords = manualRevenue.map((item) => ({
      _id: item._id,
      id: item._id,
      recordType: "manual",
      source: item.source || "manual",
      itemType: item.itemType || "other",
      itemTitle: item.itemTitle || "Manual revenue",
      order: item.order || null,
      user: item.user || null,
      customerName: item.user?.name || "Manual record",
      email: item.user?.email || "",
      amount: toNumber(item.amount),
      total: toNumber(item.amount),
      currency: item.currency || "USD",
      status: item.status || "paid",
      paymentStatus: item.status || "paid",
      note: item.note || "",
      isManual: item.isManual,
      isTest: item.isTest,
      isHiddenFromReports: item.isHiddenFromReports,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const revenues = [...orderRevenueRecords, ...manualRevenueRecords].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      message: "Revenue summary fetched successfully.",
      data: {
        summary: {
          todayRevenue: toNumber(todayAgg[0]?.total),
          monthRevenue: toNumber(monthAgg[0]?.total),
          monthlyRevenue: toNumber(monthAgg[0]?.total),
          yearRevenue: toNumber(yearAgg[0]?.total),
          yearlyRevenue: toNumber(yearAgg[0]?.total),
          totalRevenue: toNumber(totalAgg[0]?.total),
          totalOrders: orderCounts[0]?.totalOrders || 0,
          paidOrders: orderCounts[0]?.paidOrders || 0,
          refundedOrders: orderCounts[0]?.refundedOrders || 0,
          ...revenueByType,
        },
        revenueByMonth,
        revenueByType,
        revenues,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch revenue summary.",
    });
  }
};

export const updateRevenueRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid revenue id.",
      });
    }

    const allowedFields = ["status", "paymentStatus", "note", "isHiddenFromReports"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (updates.note) {
      updates.note = normalizeText(updates.note).slice(0, 1000);
    }

    const manualRevenue = await Revenue.findById(id);

    if (manualRevenue) {
      if (updates.paymentStatus && !updates.status) {
        updates.status = updates.paymentStatus;
      }

      updates.updatedBy = req.user?._id || null;

      const updated = await Revenue.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).populate("user", "name email");

      return res.status(200).json({
        success: true,
        message: "Revenue record updated successfully.",
        data: updated,
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Revenue record not found.",
      });
    }

    const orderUpdates = {};

    if (updates.status) orderUpdates.status = updates.status;
    if (updates.paymentStatus) orderUpdates.paymentStatus = updates.paymentStatus;
    if (typeof updates.note === "string") orderUpdates.note = updates.note;

    const updatedOrder = await Order.findByIdAndUpdate(id, orderUpdates, {
      new: true,
      runValidators: true,
    }).populate("user", "name email");

    return res.status(200).json({
      success: true,
      message: "Order revenue updated successfully.",
      data: buildRevenueRecordFromOrder(updatedOrder),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to update revenue record.",
    });
  }
};

export const deleteRevenueRecord = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid revenue id.",
      });
    }

    const manualRevenue = await Revenue.findById(id);

    if (manualRevenue) {
      await manualRevenue.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Manual revenue record deleted successfully.",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Revenue record not found.",
      });
    }

    const isSafeToDelete =
      order.isTest === true ||
      order.isManual === true ||
      order.paymentStatus !== "paid";

    if (!isSafeToDelete) {
      return res.status(403).json({
        success: false,
        message:
          "Paid Stripe/order revenue cannot be deleted. Mark it refunded, cancelled, or hide it from reports instead.",
      });
    }

    await order.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Revenue order record deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete revenue record.",
    });
  }
};