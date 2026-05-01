// models/MembershipModel.js
import mongoose from "mongoose";

function generateSlug(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const membershipSchema = new mongoose.Schema(
  {
    membershipId: {
      type: String,
      required: [true, "Membership id is required"],
      unique: true,
      trim: true,
      index: true,
      minlength: 2,
      maxlength: 60,
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 3,
      maxlength: 180,
    },

    instructor: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Aurora45 • Elite Circle",
    },

    priceLabel: {
      type: String,
      required: [true, "Price label is required"],
      trim: true,
      maxlength: 60,
    },

    rating: { type: Number, min: 0, max: 5, default: 0 },
    enrolled: { type: Number, min: 0, default: 0 },

    stripePriceId: { type: String, trim: true, maxlength: 120, default: "" },
    stripePriceIdMonthly: { type: String, trim: true, maxlength: 120, default: "" },
    stripePriceIdYearly: { type: String, trim: true, maxlength: 120, default: "" },


    short: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
      minlength: 10,
      maxlength: 600,
    },

    meta: [{ type: String, trim: true, maxlength: 90 }],

    glyph: { type: String, trim: true, maxlength: 6, default: "" },
    badgeLeft: { type: String, trim: true, maxlength: 40, default: "Elite Circle" },
    badgeRight: { type: String, trim: true, maxlength: 40, default: "" },
    highlight: { type: Boolean, default: false },

    slug: { type: String, trim: true, unique: true, index: true },

    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

/**
 * ✅ Normalize inputs before validation (safe)
 * - trims and standardizes membershipId
 * - cleans meta array
 */
membershipSchema.pre("validate", function (next) {
  if (this.membershipId) {
    this.membershipId = String(this.membershipId).trim();
  }

  if (Array.isArray(this.meta)) {
    this.meta = this.meta
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 12); // keep it reasonable; doesn't break existing data
  }

  next();
});

/**
 * ✅ Ensure slug exists + is consistent
 */
membershipSchema.pre("save", async function (next) {
  if (this.isModified("membershipId") || this.isModified("title") || !this.slug) {
    const base = generateSlug(this.membershipId || this.title);

    // keep slug stable, but avoid collisions safely
    let slug = base;
    let i = 0;

    // only check if slug changed or missing
    while (
      await mongoose.models.Membership.exists({
        slug,
        _id: { $ne: this._id },
      })
    ) {
      i += 1;
      slug = `${base}-${i}`;
      if (i > 30) break; // prevents weird infinite loops
    }

    this.slug = slug;
  }

  next();
});

/**
 * ✅ Keep findOneAndUpdate slug behavior, but don't trust client slug
 */
membershipSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  // never allow slug/createdBy to be set directly by client
  if ($set.slug) delete $set.slug;
  if ($set.createdBy) delete $set.createdBy;

  if ($set.membershipId || $set.title) {
    $set.slug = generateSlug($set.membershipId || $set.title);
    if (update.$set) update.$set = $set;
    else this.setUpdate($set);
  }

  next();
});

const Membership = mongoose.model("Membership", membershipSchema);
export default Membership;

