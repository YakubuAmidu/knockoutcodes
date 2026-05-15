// src/pages/Blog.jsx
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../../utils/axiosInstance";

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const PageWrap = styled.main`
  min-height: 100vh;
  background: ${({ theme }) =>
    `radial-gradient(circle at top, ${theme.colors.lightBrown} 0%, ${theme.colors.darkBrown} 42%, #000 100%)`};
  color: ${({ theme }) => theme.colors.white};
  padding: 100px 20px 80px;
  display: flex;
  justify-content: center;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
`;

const HeadingRow = styled.div`
  display: grid;
  gap: 16px;
  margin-bottom: 18px;

  @media (min-width: 900px) {
    grid-template-columns: 1.2fr 0.8fr;
    align-items: end;
  }
`;

const TitleBlock = styled.div`
  max-width: 720px;
`;

const Kicker = styled.div`
  font-size: 13px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const PageTitle = styled.h1`
  font-size: clamp(32px, 4vw, 46px);
  line-height: 1.08;
  margin: 6px 0 10px;
  background: linear-gradient(
    120deg,
    #ffd7a0 0%,
    ${({ theme }) => theme.colors.white} 40%,
    ${({ theme }) => theme.colors.lightBrown} 100%
  );
  -webkit-background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  font-size: 15px;
  max-width: 560px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const ControlsCard = styled.div`
  background: radial-gradient(
      circle at top left,
      rgba(255, 255, 255, 0.08),
      transparent 60%
    ),
    rgba(0, 0, 0, 0.42);
  border-radius: ${({ theme }) => theme.radius.xl};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 14px;
  display: grid;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`;

const Input = styled.input`
  flex: 1;
  min-width: 220px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.55);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  outline: none;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 249, 242, 0.55);
  }

  &:focus {
    box-shadow: ${({ theme }) => theme.shadow.glow};
    border-color: rgba(255, 215, 160, 0.5);
  }
`;

const Select = styled.select`
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.55);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  outline: none;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;

  &:focus {
    box-shadow: ${({ theme }) => theme.shadow.glow};
    border-color: rgba(255, 215, 160, 0.5);
  }
`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Chip = styled.button`
  border: none;
  padding: 7px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.lightBrown : "rgba(0,0,0,0.36)"};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.black : theme.colors.ivory};
  box-shadow: ${({ $active, theme }) =>
    $active ? theme.shadow.glow : "0 0 0 1px rgba(255,255,255,0.06)"};
  transition: all 0.22s ${({ theme }) => theme.easing || "ease-out"};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.glow};
  }
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 18px 0 16px;
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin: 10px 0 16px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
  flex-wrap: wrap;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 22px;
`;

const Card = styled(motion.article)`
  background: radial-gradient(
      circle at top left,
      rgba(255, 255, 255, 0.08),
      transparent 60%
    ),
    ${({ theme }) => theme.colors.cocoa};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 320px;
  position: relative;
`;

const Cover = styled.div`
  position: relative;
  padding-top: 56%;
  overflow: hidden;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ${({ theme }) => theme.easing || "ease-out"};
  }

  &:hover img {
    transform: scale(1.06);
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.18),
      rgba(0, 0, 0, 0.78)
    );
  }
`;

const CategoryTag = styled.span`
  position: absolute;
  left: 16px;
  bottom: 14px;
  z-index: 2;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  background: rgba(0, 0, 0, 0.7);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.18);
`;

const FeaturedBadge = styled.span`
  position: absolute;
  right: 16px;
  top: 16px;
  z-index: 2;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  background: linear-gradient(120deg, #ffcf71, #ff8a00);
  color: #000;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
`;

const CardBody = styled.div`
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(255, 249, 242, 0.8);
`;

const StarRow = styled.div`
  display: flex;
  gap: 2px;
  font-size: 13px;
`;

const Star = styled.span`
  filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.55));
`;

const CardTitle = styled.h2`
  font-size: 18px;
  line-height: 1.3;
  margin-top: 4px;
`;

const Excerpt = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  flex: 1;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
`;

const TagPill = styled.span`
  font-size: 11px;
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.09);
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 249, 242, 0.78);
  gap: 10px;
`;

const ReadMoreButton = styled.button`
  border: none;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  cursor: pointer;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    #ffcf71
  );
  color: #000;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: ${({ theme }) => theme.shadow.glow};
  transition: transform 0.18s ${({ theme }) => theme.easing || "ease-out"},
    box-shadow 0.18s ${({ theme }) => theme.easing || "ease-out"};

  &:hover {
    transform: translateY(-1px) scale(1.01);
    box-shadow: ${({ theme }) => theme.shadow.hard};
  }
`;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 22px;
`;

const SkeletonCard = styled.div`
  min-height: 280px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.07),
    rgba(0, 0, 0, 0.45),
    rgba(255, 255, 255, 0.07)
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;

  @keyframes shimmer {
    0% {
      background-position: 0% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const ErrorBox = styled.div`
  margin: 14px 0;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(140, 23, 23, 0.28);
  border: 1px solid rgba(255, 120, 120, 0.7);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const RetryBtn = styled.button`
  border: none;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  cursor: pointer;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  background: rgba(0, 0, 0, 0.55);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.16);

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.soft};
    transform: translateY(-1px);
  }
`;

const PaginationBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  border: none;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.lightBrown : "rgba(0,0,0,0.55)"};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.black : theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.16);
  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? "none" : "auto")};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }
`;

const EmptyState = styled.div`
  margin-top: 36px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
`;

// ✅ 2nd image (small)
const MiniImageRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
`;

const MiniImage = styled.img`
  width: 46px;
  height: 46px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const categoryOptions = [
  { value: "", label: "All" },
  { value: "boxing", label: "Boxing" },
  { value: "mindset", label: "Mindset" },
  { value: "conditioning", label: "Conditioning" },
  { value: "nutrition", label: "Nutrition" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "other", label: "Other" },
];

const FALLBACK_COVER =
  "https://images.pexels.com/photos/4761660/pexels-photo-4761660.jpeg?auto=compress&cs=tinysrgb&w=1200";

const Blog = () => {
  const navigate = useNavigate();

  const [blogs, setBlogs] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest"); // newest | oldest | popular
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 9,
  });

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ✅ Same behavior as BlogDetail.jsx (no rewriting). Just return the DB value.
  const safeImg = (url) => url || "";

  // ✅ STOP random second image: only allow blog.secondImage (exact field).
  // If you don't want it at all, set it to always return "".
  const getSecondImage = (blog) => {
    if (!blog) return "";
    const cover = blog.coverImage || "";
    const second = blog.secondImage || "";
    if (!second) return "";
    if (second === cover) return "";
    return second;
  };

  const buildExcerpt = (blog) => {
    if (blog?.excerpt) return blog.excerpt;
    const raw = (blog?.content || "").replace(/\s+/g, " ").trim();
    if (!raw)
      return "Premium insight is loading—open this post to read the full breakdown.";
    return raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
  };

  const clientSortedBlogs = useMemo(() => {
    const list = [...blogs];

    if (sort === "popular") {
      list.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.publishedAt || a.createdAt) -
          new Date(b.publishedAt || b.createdAt)
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(b.publishedAt || b.createdAt) -
          new Date(a.publishedAt || a.createdAt)
      );
    }

    if (!search.trim()) return list;

    const q = search.trim().toLowerCase();
    return list.filter((b) => {
      const title = (b.title || "").toLowerCase();
      const excerpt = (b.excerpt || "").toLowerCase();
      const tags = Array.isArray(b.tags) ? b.tags.join(" ").toLowerCase() : "";
      return title.includes(q) || excerpt.includes(q) || tags.includes(q);
    });
  }, [blogs, sort, search]);

  const fetchBlogs = async (page = 1, selectedCategory = category) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: pagination.limit,
        isPublished: "true",
      };

      if (selectedCategory) params.category = selectedCategory;

      const res = await axiosInstance.get("/blogs", {
        params,
        withCredentials: false,
      });

      if (res.data?.success) {
        setBlogs(res.data.data || []);
        setPagination(
          res.data.pagination || { ...pagination, page, pages: 1, total: 0 }
        );
      } else {
        setError(res.data?.message || "We couldn’t load the blog feed right now.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong while loading the blog feed."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs(1, category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handlePageChange = (newPage) => {
    if (
      newPage === pagination.page ||
      newPage < 1 ||
      newPage > pagination.pages
    )
      return;
    fetchBlogs(newPage, category);
  };

  const handleReadMore = (blog) => {
    const idOrSlug = blog.slug || blog._id;
    navigate(`/blog/${idOrSlug}`);
  };

  const totalLabel =
    pagination.total > 0
      ? `${pagination.total} premium article${pagination.total === 1 ? "" : "s"}`
      : "No published articles yet";

  return (
    <PageWrap>
      <Inner>
        <HeadingRow>
          <TitleBlock>
            <Kicker>KnockoutCodes Blog</Kicker>
            <PageTitle>
              Elite Boxing & Mindset
              <br />
              Strategy Journal
            </PageTitle>
            <Subtitle>
              Clean, premium breakdowns on boxing, conditioning, mindset,
              nutrition, and lifestyle—crafted to sharpen your hands and your
              decision-making.
            </Subtitle>
          </TitleBlock>

          <ControlsCard>
            <Row>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles, tags, and excerpts…"
              />
            </Row>
            <Row>
              <Select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="popular">Most Viewed</option>
              </Select>
            </Row>
            <FilterBar>
              {categoryOptions.map((cat) => (
                <Chip
                  key={cat.value || "all"}
                  $active={category === cat.value}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.label}
                </Chip>
              ))}
            </FilterBar>
          </ControlsCard>
        </HeadingRow>

        <Divider />

        <StatusBar>
          <span>{totalLabel}</span>
          <span>
            Page {pagination.page} of {pagination.pages || 1}
          </span>
        </StatusBar>

        {error && (
          <ErrorBox>
            <span>{error}</span>
            <RetryBtn onClick={() => fetchBlogs(pagination.page || 1, category)}>
              Try again
            </RetryBtn>
          </ErrorBox>
        )}

        {loading ? (
          <SkeletonGrid>
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </SkeletonGrid>
        ) : clientSortedBlogs.length === 0 ? (
          <EmptyState>
            {search.trim()
              ? "No matches found. Try a different keyword or clear the search."
              : "No published articles in this category yet. Check back soon—new heat is dropping."}
          </EmptyState>
        ) : (
          <>
            <Grid>
              {clientSortedBlogs.map((blog) => {
                const secondImage = getSecondImage(blog);

                return (
                  <Card
                    key={blog._id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    layout
                  >
                    <Cover>
                      <img
                        src={safeImg(blog.coverImage) || FALLBACK_COVER}
                        alt={blog.title || "Blog cover"}
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_COVER;
                        }}
                      />
                      <CategoryTag>{blog.category || "boxing"}</CategoryTag>
                      {blog.featured && <FeaturedBadge>Featured</FeaturedBadge>}
                    </Cover>

                    <CardBody>
                      <MetaRow>
                        <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                        <StarRow>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star}>★</Star>
                          ))}
                        </StarRow>
                      </MetaRow>

                      {secondImage && (
                        <MiniImageRow>
                          <MiniImage
                            src={safeImg(secondImage) || FALLBACK_COVER}
                            alt={`${blog.title || "Blog"} secondary`}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_COVER;
                            }}
                          />
                        </MiniImageRow>
                      )}

                      <CardTitle>{blog.title}</CardTitle>

                      <Excerpt>{buildExcerpt(blog)}</Excerpt>

                      {Array.isArray(blog.tags) && blog.tags.length > 0 && (
                        <TagRow>
                          {blog.tags.slice(0, 4).map((tag) => (
                            <TagPill key={tag}>#{tag}</TagPill>
                          ))}
                        </TagRow>
                      )}

                      <CardFooter>
                        <span>
                          {blog.readTime || 1} min read · {blog.views || 0} view
                          {(blog.views || 0) === 1 ? "" : "s"}
                        </span>
                        <ReadMoreButton onClick={() => handleReadMore(blog)}>
                          Read <span>↗</span>
                        </ReadMoreButton>
                      </CardFooter>
                    </CardBody>
                  </Card>
                );
              })}
            </Grid>

            {pagination.pages > 1 && (
              <PaginationBar>
                <PageButton
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Prev
                </PageButton>

                {Array.from({ length: pagination.pages }).map((_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <PageButton
                      key={pageNumber}
                      $active={pagination.page === pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </PageButton>
                  );
                })}

                <PageButton
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next
                </PageButton>
              </PaginationBar>
            )}
          </>
        )}
      </Inner>
    </PageWrap>
  );
};

export default Blog;
