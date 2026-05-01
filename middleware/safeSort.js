const SORT_MAP = {
  newest: "-createdAt",
  oldest: "createdAt",
  price_low: "price",
  price_high: "-price",
  title_az: "title",
  title_za: "-title",
};

export default function safeSort(req, _res, next) {
  const raw = String(req.query.sort || "newest");
  req.query.sort = SORT_MAP[raw] || SORT_MAP.newest;
  next();
}
