// controllers/courseController.js
import mongoose from 'mongoose';
import Course from '../models/CourseModel.js'; // ✅ correct path & name

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Admin
export const createCourse = async (req, res) => {
  try {
    const data = req.body;

    // Optionally attach admin/coach id from auth middleware
    if (req.user && req.user._id) {
      data.createdBy = req.user._id;
    }

    const course = await Course.create(data);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    console.error('createCourse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: error.message,
    });
  }
};

// @desc    Get all courses (with basic filters, search, pagination)
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const filters = {};

    // Published filter (optional)
    if (req.query.published === 'true') {
      filters.isPublished = true;
    }

    // Category filter
    if (req.query.category) {
      filters.category = req.query.category;
    }

    // Level filter
    if (req.query.level) {
      filters.level = req.query.level;
    }

    // Featured filter
    if (req.query.featured === 'true') {
      filters.isFeatured = true;
    }

    // ✅ Safe keyword search without text index
    if (req.query.keyword) {
      const keyword = req.query.keyword.trim();
      filters.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    // Sorting
    let sort = '-createdAt';
    if (req.query.sort === 'top-rated') {
      sort = '-ratingAverage -ratingCount';
    } else if (req.query.sort === 'students') {
      sort = '-studentsCount';
    } else if (req.query.sort === 'price-asc') {
      sort = 'price';
    } else if (req.query.sort === 'price-desc') {
      sort = '-price';
    }

    const total = await Course.countDocuments(filters);

    const courses = await Course.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email'); // optional

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: courses,
    });
  } catch (error) {
    console.error('getCourses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message,
    });
  }
};

// @desc    Get a single course by ID or slug
// @route   GET /api/courses/:id
// @access  Public
export const getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    let course;

    // If valid ObjectId, try by _id; otherwise treat as slug
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id).populate('createdBy', 'name email');
    }

    if (!course) {
      course = await Course.findOne({ slug: id }).populate(
        'createdBy',
        'name email'
      );
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error('getCourse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
      error: error.message,
    });
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Admin
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findOneAndUpdate(
      { _id: id },
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    console.error('updateCourse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course',
      error: error.message,
    });
  }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('deleteCourse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course',
      error: error.message,
    });
  }
};

// Protected course data for coursePlayer
export const getCoursePlayer = async (req, res) => {
 try {
   const courseId = req.params;

   if (!courseId) {
     return res.statust(404).json({
       success: false,
       message: "Course ID is required.."
     });
   };

   const course = await Course.findById(courseId)
     .select("title description thumbnail level modules lessons duration instructor")
     .lean();
   
   if (!course) {
     return res.status(404).json({
       success: false,
       message: "Course not found...",
     });
   };

   res.status(200).json({
     success: true,
     data: course,
   });
 } catch (error) {
   console.error("getCoursePlayer error", error);
   return res.status(500).json({
     success: false,
     message: "Failed to fetch course player data..."
   });
 }
}