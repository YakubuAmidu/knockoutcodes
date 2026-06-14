// controllers/systemCleanupController.js

import mongoose from "mongoose";

const INDEX_FIXES = [
  {
    collection: "reviews",
    dropIndexes: ["user_1_product_1"],
  },
  {
    collection: "testimonials",
    dropIndexes: ["user_1"],
  },
];

async function safeDropIndex(db, collectionName, indexName) {
  try {
    const collection = db.collection(collectionName);
    await collection.dropIndex(indexName);

    return {
      collection: collectionName,
      index: indexName,
      action: "dropped",
    };
  } catch (error) {
    if (
      error?.codeName === "IndexNotFound" ||
      error?.code === 27 ||
      String(error?.message || "").includes("index not found")
    ) {
      return {
        collection: collectionName,
        index: indexName,
        action: "not_found",
      };
    }

    return {
      collection: collectionName,
      index: indexName,
      action: "drop_failed",
      error: "Index operation failed",
    };
  }
}

export const cleanupDatabaseIndexes = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database connection is not ready.",
      });
    }

    const results = [];

    for (const fix of INDEX_FIXES) {
      for (const indexName of fix.dropIndexes) {
        const result = await safeDropIndex(db, fix.collection, indexName);
        results.push(result);
      }
    }

    return res.status(200).json({
      success: true,
      message: "System cleanup completed.",
      results,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to run system cleanup.",
    });
  }
};

export default cleanupDatabaseIndexes;