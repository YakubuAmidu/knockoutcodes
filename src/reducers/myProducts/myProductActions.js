import axiosInstance from "../../../utils/axiosInstance";

import {
  MY_PRODUCTS_REQUEST,
  MY_PRODUCTS_SUCCESS,
  MY_PRODUCTS_FAIL,
  MY_PRODUCTS_CLEAR_ERROR,
} from "./myProductActionTypes";

const LIMIT = 100;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value, fallback = "pending") {
  return String(value || fallback)
    .toLowerCase()
    .trim();
}

function getProductId(item) {
  if (!item?.product) return "";
  if (typeof item.product === "string") return item.product;
  return item.product?._id || item.product?.id || "";
}

function getImages(product, item) {
  const rawImages = [
    product?.image,
    product?.imageUrl,
    product?.thumbnail,
    product?.coverImage,
    product?.mainImage,
    item?.image,
    item?.imageUrl,
    ...(Array.isArray(product?.images) ? product.images : []),
    ...(Array.isArray(item?.images) ? item.images : []),
  ];

  return rawImages
    .map((img) => {
      if (!img) return "";
      if (typeof img === "string") return img;
      return img.url || img.secure_url || img.src || "";
    })
    .filter(Boolean);
}

function getTitle(product, item) {
  return (
    product?.title ||
    product?.name ||
    item?.title ||
    item?.name ||
    "Purchased Product"
  );
}

function getDescription(product, item) {
  return (
    product?.description ||
    product?.shortDescription ||
    product?.details ||
    item?.description ||
    ""
  );
}

function getCategory(product, item) {
  return product?.category || item?.category || "Product";
}

function getBrand(product, item) {
  return product?.brand || item?.brand || "KnockoutCodes";
}

function getRating(product) {
  return Number(
    product?.ratingAverage ??
      product?.averageRating ??
      product?.avgRating ??
      product?.rating ??
      product?.ratingsAverage ??
      0,
  );
}

function getReviewCount(product) {
  return Number(
    product?.ratingCount ??
      product?.reviewCount ??
      product?.reviewsCount ??
      product?.totalReviews ??
      product?.numReviews ??
      0,
  );
}

async function fetchProductDetails(productId) {
  if (!productId) return null;

  try {
    const { data } = await axiosInstance.get(`/products/${productId}`, {
      params: { t: Date.now() },
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    return data?.data || data?.product || data || null;
  } catch {
    return null;
  }
}

async function buildPurchasedProducts(orders) {
  const map = new Map();

  safeArray(orders).forEach((order) => {
    const paymentStatus = normalizeStatus(order?.paymentStatus);
    if (paymentStatus !== "paid") return;

    safeArray(order?.items).forEach((item) => {
      const productId = getProductId(item);

      const isProduct =
        item?.productType === "product" ||
        item?.productModel === "Product" ||
        Boolean(productId);

      if (!productId || !isProduct) return;

      const productFromOrder =
        typeof item?.product === "object" && item.product ? item.product : {};

      const quantity = Number(item?.quantity || 1);
      const unitPrice = Number(
        item?.unitPrice || item?.price || productFromOrder?.price || 0,
      );
      const currency = item?.currency || order?.currency || "USD";
      const totalPaid = quantity * unitPrice;

      const existing = map.get(productId);

      if (existing) {
        existing.quantity += quantity;
        existing.totalSpent += totalPaid;
        existing.orderCount += 1;
        existing.orderIds.push(order?._id);
        existing.latestPurchasedAt =
          new Date(order?.createdAt || 0) >
          new Date(existing.latestPurchasedAt || 0)
            ? order?.createdAt
            : existing.latestPurchasedAt;
      } else {
        map.set(productId, {
          productId,
          product: productFromOrder,
          orderItem: item,
          title: getTitle(productFromOrder, item),
          description: getDescription(productFromOrder, item),
          category: getCategory(productFromOrder, item),
          brand: getBrand(productFromOrder, item),
          images: getImages(productFromOrder, item),
          quantity,
          unitPrice,
          totalSpent: totalPaid,
          currency,
          orderCount: 1,
          orderIds: [order?._id].filter(Boolean),
          latestPurchasedAt: order?.createdAt || "",
          status: order?.status || "processing",
          rating: getRating(productFromOrder),
          reviewCount: getReviewCount(productFromOrder),
          stock:
            productFromOrder?.stock ?? productFromOrder?.countInStock ?? "—",
          sku: productFromOrder?.sku || item?.sku || "—",
        });
      }
    });
  });

  const products = Array.from(map.values());

  const hydrated = await Promise.all(
    products.map(async (entry) => {
      const fullProduct = await fetchProductDetails(entry.productId);
      if (!fullProduct) return entry;

      return {
        ...entry,
        product: fullProduct,
        title: getTitle(fullProduct, entry.orderItem),
        description: getDescription(fullProduct, entry.orderItem),
        category: getCategory(fullProduct, entry.orderItem),
        brand: getBrand(fullProduct, entry.orderItem),
        images: getImages(fullProduct, entry.orderItem),
        rating: getRating(fullProduct),
        reviewCount: getReviewCount(fullProduct),
        stock: fullProduct?.stock ?? fullProduct?.countInStock ?? entry.stock,
        sku: fullProduct?.sku || entry.sku,
      };
    }),
  );

  return hydrated.sort(
    (a, b) =>
      new Date(b.latestPurchasedAt || 0) - new Date(a.latestPurchasedAt || 0),
  );
}

export const fetchMyProducts = () => async (dispatch) => {
  dispatch({ type: MY_PRODUCTS_REQUEST });

  try {
    const { data } = await axiosInstance.get("/orders/my", {
      params: {
        page: 1,
        limit: LIMIT,
        t: Date.now(),
      },
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    const orders = Array.isArray(data?.data) ? data.data : [];
    const products = await buildPurchasedProducts(orders);

    const totalQuantity = products.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    const totalSpent = products.reduce(
      (sum, item) => sum + Number(item.totalSpent || 0),
      0,
    );

    dispatch({
      type: MY_PRODUCTS_SUCCESS,
      payload: {
        products,
        orders,
        totalProducts: products.length,
        totalQuantity,
        totalSpent,
      },
    });

    return { success: true, products };
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to load purchased products.";

    dispatch({
      type: MY_PRODUCTS_FAIL,
      payload: message,
    });

    return { success: false, message };
  }
};

export const clearMyProductError = () => ({
  type: MY_PRODUCTS_CLEAR_ERROR,
});
