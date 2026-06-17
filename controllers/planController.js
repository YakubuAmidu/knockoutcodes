// controllers/planController.js
import mongoose from "mongoose";
import Plan from "../models/PlanModel.js";

// Simple slug generator
const generateSlug = (value) => {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// @desc    Create a new subscription plan
// @route   POST /api/v1/plans
// @access  Private/Admin
export const createPlan = async (req, res) => {
  try {
    const {
      name,
      slug,
      stripePriceId,
      price,
      currency,
      description,
      isActive,
    } = req.body;

    if (!name || !stripePriceId || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: "name, stripePriceId and price are required",
      });
    }

    const finalSlug = slug || generateSlug(name);

    // Optional: prevent duplicate name/slug up front
    const existing = await Plan.findOne({
      $or: [{ name }, { slug: finalSlug }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Plan with this name or slug already exists",
      });
    }

    const plan = await Plan.create({
      name,
      slug: finalSlug,
      stripePriceId,
      price,
      currency,
      description,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: plan,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to create plan",
    });
  }
};

// @desc    Get all plans (optionally filter by isActive)
// @route   GET /api/v1/plans
// @access  Public
export const getPlans = async (req, res) => {
  try {
    const { active } = req.query;

    const filter = {};
    if (active === "true") {
      filter.isActive = true;
    } else if (active === "false") {
      filter.isActive = false;
    }

    const plans = await Plan.find(filter).sort({ price: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plans",
    });
  }
};

// @desc    Get a single plan by ID or slug
// @route   GET /api/v1/plans/:id
// @access  Public
export const getPlan = async (req, res) => {
  try {
    const { id } = req.params;

    let plan = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      plan = await Plan.findById(id);
    }

    if (!plan) {
      plan = await Plan.findOne({ slug: id });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: plan,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch plan",
    });
  }
};

// @desc    Update a plan
// @route   PUT /api/v1/plans/:id
// @access  Private/Admin
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If name changed but slug not provided, regenerate slug
    if (updateData.name && !updateData.slug) {
      updateData.slug = generateSlug(updateData.name);
    }

    const plan = await Plan.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      data: plan,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update plan",
    });
  }
};

// @desc    Delete a plan
// @route   DELETE /api/v1/plans/:id
// @access  Private/Admin
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findByIdAndDelete(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete plan",
    });
  }
};
