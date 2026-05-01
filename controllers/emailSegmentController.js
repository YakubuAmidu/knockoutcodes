import EmailSegment from "../models/EmailSegmentModel.js";

const allowedTypes = [
  "newsletter",
  "buyers",
  "coaching",
  "vip",
  "inactive",
  "manual",
];

const allowedStatuses = ["active", "paused"];

const allowedSources = ["all", "newsletter", "orders", "coaching", "manual"];

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildSegmentPayload(body = {}) {
  const payload = {};

  if (body.name !== undefined) {
    payload.name = cleanString(body.name);
  }

  if (body.description !== undefined) {
    payload.description = cleanString(body.description);
  }

  if (body.type !== undefined) {
    const type = cleanString(body.type).toLowerCase();

    if (!allowedTypes.includes(type)) {
      const error = new Error("Invalid segment type");
      error.statusCode = 400;
      throw error;
    }

    payload.type = type;
  }

  if (body.status !== undefined) {
    const status = cleanString(body.status).toLowerCase();

    if (!allowedStatuses.includes(status)) {
      const error = new Error("Invalid segment status");
      error.statusCode = 400;
      throw error;
    }

    payload.status = status;
  }

  if (body.rules && typeof body.rules === "object") {
    payload.rules = {};

    if (body.rules.source !== undefined) {
      const source = cleanString(body.rules.source).toLowerCase();

      if (!allowedSources.includes(source)) {
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

      payload.rules.minOrders = minOrders;
    }

    if (Array.isArray(body.rules.tags)) {
      payload.rules.tags = body.rules.tags
        .filter((tag) => typeof tag === "string")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 20);
    }
  }

  return payload;
}

export async function createEmailSegment(req, res, next) {
  try {
    const payload = buildSegmentPayload(req.body);

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
      data: segment,
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
    const segments = await EmailSegment.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: segments.length,
      data: segments,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmailSegmentById(req, res, next) {
  try {
    const segment = await EmailSegment.findById(req.params.id).lean();

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "Email segment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: segment,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmailSegment(req, res, next) {
  try {
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

    const segment = await EmailSegment.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "Email segment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email segment updated successfully",
      data: segment,
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