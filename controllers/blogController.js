// controllers/blogController.js
import mongoose from "mongoose";
import Blog from "../models/BlogModel.js";

// @desc    Create a new blog post
// @route   POST /api/v1/blogs
// @access  Private (admin only)
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      isPublished,
      featured,
    } = req.body;

    const authorId = req.user?._id;
    if (!authorId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const blog = await Blog.create({
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      isPublished: Boolean(isPublished),
      featured: Boolean(featured),
      author: authorId,
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Slug already exists. Use a different title or set a unique slug.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create blog",
      error: error.message,
    });
  }
};

// @desc    Get all blogs (published only for public)
// @route   GET /api/v1/blogs
// @access  Public
export const getBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      tag,
      featured,
    } = req.query;

    const query = { isPublished: true };

    if (search) {
      query.$or = [
        { title: { $regex: String(search), $options: "i" } },
        { content: { $regex: String(search), $options: "i" } },
        { excerpt: { $regex: String(search), $options: "i" } },
      ];
    }

    if (category) query.category = category;
    if (typeof featured !== "undefined") query.featured = featured === "true";
    if (tag) query.tags = { $in: [tag] };

    const safeLimit = Math.min(50, Math.max(1, Number(limit)));
    const safePage = Math.max(1, Number(page));
    const skip = (safePage - 1) * safeLimit;

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .populate("author", "name email")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      Blog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Blogs fetched successfully",
      data: blogs,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
      error: error.message,
    });
  }
};

// @desc    Get a single published blog by ID or slug (public)
// @route   GET /api/v1/blogs/:idOrSlug
// @access  Public
export const getBlog = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    let blog = null;

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      blog = await Blog.findOne({ _id: idOrSlug, isPublished: true }).populate(
        "author",
        "name email"
      );
    }

    if (!blog) {
      blog = await Blog.findOne({ slug: idOrSlug, isPublished: true }).populate(
        "author",
        "name email"
      );
    }

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    await Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } });

    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      data: blog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
      error: error.message,
    });
  }
};

// @desc    Update a blog
// @route   PUT /api/v1/blogs/:id
// @access  Private (admin only)
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("author", "name email");

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Slug already exists. Use a different title or set a unique slug.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update blog",
      error: error.message,
    });
  }
};

// @desc    Delete ONE blog by id OR slug
// @route   DELETE /api/v1/blogs/:idOrSlug
// @access  Private (admin only)
export const deleteBlog = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const deleted = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? await Blog.findByIdAndDelete(idOrSlug)
      : await Blog.findOneAndDelete({ slug: idOrSlug });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: deleted,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete ALL blogs
// @route   DELETE /api/v1/blogs
// @access  Private (admin only)
export const deleteAllBlogs = async (req, res, next) => {
  try {
    const result = await Blog.deleteMany({});
    return res.status(200).json({
      success: true,
      message: "All blogs deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};
