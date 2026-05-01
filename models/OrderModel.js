// models/orderModel.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productType: {
      type: String,
      enum: ["course", "subscription", "booking", "ebook", "other"],
      required: [true, "Product type is required"],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Product reference is required"],
      refPath: "items.productModel",
    },
    productModel: {
      type: String,
      required: [true, "Product model name is required"],
      enum: ["Course", "Subscription", "Booking", "Ebook", "Other"],
    },
    title: {
      type: String,
      required: [true, "Item title is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    currency: {
      type: String,
      default: "USD",
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
    },
    items: {
      type: [orderItemSchema],
      validate: [
        (val) => val.length > 0,
        "Order must contain at least one item",
      ],
    },
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },
    currency: {
      type: String,
      default: "USD",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "stripe", "paypal", "cashapp", "other"],
      default: "stripe",
    },
    transactionId: {
      type: String,
      default: "",
    },
    couponCode: {
      type: String,
      default: "",
    },
    note: {
      type: String,
      default: "",
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["new", "processing", "completed", "cancelled"],
      default: "new",
    },
    isSeenByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Make sure total = subtotal - discount if not explicitly provided
orderSchema.pre("save", function (next) {
  if (this.subtotal < this.discount) {
    this.discount = this.subtotal;
  }

  if (!this.total || this.total <= 0) {
    this.total = this.subtotal - this.discount;
  }

  next();
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
