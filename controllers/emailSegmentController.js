// controllers/emailSegmentController.js
import mongoose from "mongoose";
import EmailSegment, {
  EMAIL_SEGMENT_TYPES,
  EMAIL_SEGMENT_STATUSES,
  EMAIL_SEGMENT_RULE_SOURCES,
} from "../models/EmailSegmentModel.js";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function cleanString(value, maxLength = 500) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanTags(tags = []) {
  if (!Array.isArray(tags)) return [];

  return [
    ...new Set(
      tags
        .map((tag) => cleanString(tag, 40).toLowerCase())
        .filter(Boolean)
        .slice(0, 30)
    ),
  ];
}

function buildSegmentPayload(body = {}, isCreate = false) {
  const payload = {};

  if (body.name !== undefined || isCreate) {
    payload.name = cleanString(body.name, 80);
  }

  if (body.description !== undefined) {
    payload.description = cleanString(body.description, 500);
  }

  if (body.type !== undefined) {
    const type = cleanString(body.type, 30).toLowerCase();

    if (!EMAIL_SEGMENT_TYPES.includes(type)) {
      const error = new Error("Invalid segment type");
      error.statusCode = 400;
      throw error;
    }

    payload.type = type;
  }

  if (body.status !== undefined) {
    const status = cleanString(body.status, 30).toLowerCase();

    if (!EMAIL_SEGMENT_STATUSES.includes(status)) {
      const error = new Error("Invalid segment status");
      error.statusCode = 400;
      throw error;
    }

    payload.status = status;
  }

  if (body.rules !== undefined) {
    if (!body.rules || typeof body.rules !== "object" || Array.isArray(body.rules)) {
      const error = new Error("Rules must be an object");
      error.statusCode = 400;
      throw error;
    }

    payload.rules = {};

    if (body.rules.source !== undefined) {
      const source = cleanString(body.rules.source, 30).toLowerCase();

      if (!EMAIL_SEGMENT_RULE_SOURCES.includes(source)) {
        const error = new Error("Invalid segment rule source");
        error.statusCode = 400;
        throw error;
      }

      payload.rules.source = source;
    }

    if (body.rules.minOrders !== undefined) {
      const minOrders = Number(body.rules.minOrders);

      if (!Number.isFinite(minOrders) || minOrders < 0) {
        const error = new Error("Minimum orders must be a valid positive number");
        error.statusCode = 400;
        throw error;
      }

      payload.rules.minOrders = Math.floor(minOrders);
    }

    if (body.rules.tags !== undefined) {
      payload.rules.tags = cleanTags(body.rules.tags);
    }
  }

  return payload;
}

function safeSegment(segment) {
  if (!segment) return null;
  const item = segment.toObject ? segment.toObject() : segment;

  return {
    _id: item._id,
    name: item.name,
    description: item.description || "",
    type: item.type || "newsletter",
    status: item.status || "active",
    rules: item.rules || {
      source: "all",
      minOrders: 0,
      tags: [],
    },
    createdBy: item.createdBy || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createEmailSegment(req, res, next) {
  try {
    const payload = buildSegmentPayload(req.body, true);

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: "Segment name is required",
      });
    }

    const existingSegment = await EmailSegment.findOne({
      name: payload.name,
    }).lean();

    if (existingSegment) {
      return res.status(409).json({
        success: false,
        message: "A segment with this name already exists",
      });
    }

    const segment = await EmailSegment.create({
      ...payload,
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Email segment created successfully",
      data: safeSegment(segment),
      segment: safeSegment(segment),
    });
  } catch (error) {
    if (error?.code === 11000) {
      error.statusCode = 409;
      error.message = "A segment with this name already exists";
    }

    next(error);
  }
}

export async function getEmailSegments(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const search = cleanString(req.query.search || req.query.q || "", 120);
    const type = cleanString(req.query.type || "", 30).toLowerCase();
    const status = cleanString(req.query.status || "", 30).toLowerCase();

    const query = {};

    if (search) {
      const escaped = escapeRegex(search);

      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    if (type && EMAIL_SEGMENT_TYPES.includes(type)) {
      query.type = type;
    }

    if (status && EMAIL_SEGMENT_STATUSES.includes(status)) {
      query.status = status;
    }

    const [segments, total] = await Promise.all([
      EmailSegment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailSegment.countDocuments(query),
    ]);

    const safeData = segments.map(safeSegment);

    return res.status(200).json({
      success: true,
      count: safeData.length,
      total,
      data: safeData,
      segments: safeData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmailSegmentById(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid segment id",
      });
    }

    const segment = await EmailSegment.findById(req.params.id).lean();

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "Email segment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: safeSegment(segment),
      segment: safeSegment(segment),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmailSegment(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid segment id",
      });
    }

    const payload = buildSegmentPayload(req.body);

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    if (payload.name) {
      const existingSegment = await EmailSegment.findOne({
        name: payload.name,
        _id: { $ne: req.params.id },
      }).lean();

      if (existingSegment) {
        return res.status(409).json({
          success: false,
          message: "A segment with this name already exists",
        });
      }
    }

    const segment = await EmailSegment.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "Email segment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email segment updated successfully",
      data: safeSegment(segment),
      segment: safeSegment(segment),
    });
  } catch (error) {
    if (error?.code === 11000) {
      error.statusCode = 409;
      error.message = "A segment with this name already exists";
    }

    next(error);
  }
}

export async function deleteEmailSegment(req, res, next) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid segment id",
      });
    }

    const segment = await EmailSegment.findByIdAndDelete(req.params.id);

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "Email segment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email segment deleted successfully",
      data: {
        id: req.params.id,
      },
    });
  } catch (error) {
    next(error);
  }
}