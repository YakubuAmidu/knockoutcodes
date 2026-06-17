import mongoose from "mongoose";
import Blog from "../models/BlogModel.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const getUserRole = (req) => String(req.user?.role || "").toLowerCase();

const isAdminUser = (req) => {
  const role = getUserRole(req);
  return role === "admin" || role === "superadmin";
};

const findBlogByIdOrSlug = async (idOrSlug, extraQuery = {}) => {
  const value = String(idOrSlug || "")
    .trim()
    .toLowerCase();

  if (isValidObjectId(value)) {
    const blog = await Blog.findOne({ _id: value, ...extraQuery });
    if (blog) return blog;
  }

  return Blog.findOne({ slug: value, ...extraQuery });
};

const parsePositiveNumber = (value, fallback, max) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.min(Math.floor(num), max);
};

export const createBlog = async (req, res) => {
  try {
    const authorId = req.user?._id;

    if (!authorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const blog = await Blog.create({
      ...req.body,
      author: authorId,
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully.",
      data: blog,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Slug already exists. Use a different title or set a unique slug.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create blog.",
    });
  }
};

export const getBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      tag,
      featured,
      published,
    } = req.query;

    const safePage = parsePositiveNumber(page, 1, 100000);
    const safeLimit = parsePositiveNumber(limit, 10, 50);
    const skip = (safePage - 1) * safeLimit;

    const query = {};

    const admin = isAdminUser(req);

    if (admin && typeof published !== "undefined") {
      query.isPublished = String(published) === "true";
    } else if (!admin) {
      query.isPublished = true;
    }

    const safeSearch = String(search || "").trim();

    if (safeSearch) {
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { excerpt: { $regex: safeSearch, $options: "i" } },
        { content: { $regex: safeSearch, $options: "i" } },
        { tags: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (category) {
      query.category = String(category).trim().toLowerCase();
    }

    if (tag) {
      query.tags = String(tag).trim().toLowerCase();
    }

    if (typeof featured !== "undefined") {
      query.featured = String(featured) === "true";
    }

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .populate("author", "name")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Blog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Articles loaded successfully.",
      data: blogs,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit) || 1,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs.",
    });
  }
};

export const getBlog = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    const query = isAdminUser(req) ? {} : { isPublished: true };

    const blog = await findBlogByIdOrSlug(idOrSlug, query);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    if (!isAdminUser(req)) {
      await Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } });
      blog.views += 1;
    }

    await blog.populate("author", "name");

    return res.status(200).json({
      success: true,
      message: "Article loaded successfully.",
      data: blog,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog.",
    });
  }
};

export const likeBlog = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Admin accounts cannot like or unlike blog articles. Please use a regular user account.",
      });
    }

    const blog = await findBlogByIdOrSlug(idOrSlug, { isPublished: true });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    const alreadyLiked = blog.likedBy.some(
      (id) => String(id) === String(userId),
    );

    if (alreadyLiked) {
      return res.status(400).json({
        success: false,
        message: "You already liked this article.",
      });
    }

    const hadUnliked = blog.unlikedBy.some(
      (id) => String(id) === String(userId),
    );

    const update = {
      $addToSet: { likedBy: userId },
      $pull: { unlikedBy: userId },
      $inc: {
        likes: 1,
        unlikes: hadUnliked ? -1 : 0,
      },
    };

    const updatedBlog = await Blog.findByIdAndUpdate(blog._id, update, {
      new: true,
      runValidators: true,
      select: "likes unlikes likedBy unlikedBy",
    });

    return res.status(200).json({
      success: true,
      message: "Article liked successfully.",
      data: {
        likes: Math.max(0, Number(updatedBlog.likes || 0)),
        unlikes: Math.max(0, Number(updatedBlog.unlikes || 0)),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to like article.",
    });
  }
};

export const unlikeBlog = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (isAdminUser(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Admin accounts cannot like or unlike blog articles. Please use a regular user account.",
      });
    }

    const blog = await findBlogByIdOrSlug(idOrSlug, { isPublished: true });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    const alreadyUnliked = blog.unlikedBy.some(
      (id) => String(id) === String(userId),
    );

    if (alreadyUnliked) {
      return res.status(400).json({
        success: false,
        message: "You already unliked this article.",
      });
    }

    const hadLiked = blog.likedBy.some((id) => String(id) === String(userId));

    const update = {
      $addToSet: { unlikedBy: userId },
      $pull: { likedBy: userId },
      $inc: {
        unlikes: 1,
        likes: hadLiked ? -1 : 0,
      },
    };

    const updatedBlog = await Blog.findByIdAndUpdate(blog._id, update, {
      new: true,
      runValidators: true,
      select: "likes unlikes likedBy unlikedBy",
    });

    return res.status(200).json({
      success: true,
      message: "Article feedback updated successfully.",
      data: {
        likes: Math.max(0, Number(updatedBlog.likes || 0)),
        unlikes: Math.max(0, Number(updatedBlog.unlikes || 0)),
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to unlike article.",
    });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndUpdate(
      id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      },
    ).populate("author", "name");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully.",
      data: blog,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Slug already exists. Use a different title or set a unique slug.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update blog.",
    });
  }
};

export const deleteBlog = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const blog = await findBlogByIdOrSlug(idOrSlug);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    await Blog.deleteOne({ _id: blog._id });

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully.",
      data: blog,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAllBlogs = async (req, res, next) => {
  try {
    const confirm = String(req.query.confirm || "").trim();

    if (confirm !== "DELETE_ALL_BLOGS") {
      return res.status(400).json({
        success: false,
        message:
          "Delete all blocked. Add ?confirm=DELETE_ALL_BLOGS to confirm this dangerous action.",
      });
    }

    const result = await Blog.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "All blogs deleted successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};
