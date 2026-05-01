// models/courseModel.js
import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title must be at most 120 characters'],
    },

    slug: {
      type: String,
      unique: true, // unique already creates an index internally
      trim: true,
    },

    description: {
      type: String,
      required: [true, 'Course description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
    },

    category: {
      type: String,
      enum: [
        'Boxing Fundamentals',
        'Conditioning',
        'Footwork',
        'Defense',
        'Power Punching',
        'Strategy & Ring IQ',
        'Other',
      ],
      default: 'Boxing Fundamentals',
    },

    focusArea: {
      type: String,
      trim: true,
    },

    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
      default: 'all-levels',
    },

    thumbnail: {
      type: String,
      trim: true,
    },

    promoVideo: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: [true, 'Course price is required'],
      min: [0, 'Price cannot be negative'],
    },

    salePrice: {
      type: Number,
      min: [0, 'Sale price cannot be negative'],
      validate: {
        validator: function (value) {
          // If salePrice is set, it must be <= price
          if (value == null) return true;
          return value <= this.price;
        },
        message: 'Sale price cannot be greater than regular price',
      },
    },

    isFree: {
      type: Boolean,
      default: false,
    },

    durationInMinutes: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
    },

    totalLessons: {
      type: Number,
      min: [0, 'Total lessons cannot be negative'],
    },

    language: {
      type: String,
      default: 'English',
      trim: true,
    },

    equipmentNeeded: [
      {
        type: String,
        trim: true,
      },
    ],

    requirements: [
      {
        type: String,
        trim: true,
      },
    ],

    whatYouWillLearn: [
      {
        type: String,
        trim: true,
      },
    ],

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    ratingAverage: {
      type: Number,
      min: [0, 'Rating must be above or equal to 0'],
      max: [5, 'Rating must be below or equal to 5'],
      default: 0,
    },

    ratingCount: {
      type: Number,
      min: [0, 'Rating count cannot be negative'],
      default: 0,
    },

    studentsCount: {
      type: Number,
      min: [0, 'Students count cannot be negative'],
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Simple slug generator (no extra dependency)
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Update slug on create/save
courseSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = generateSlug(this.title);
  }
  next();
});

// Update slug on findOneAndUpdate when title changes
courseSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.title) {
    update.slug = generateSlug(update.title);
    this.setUpdate(update);
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);

export default Course;
