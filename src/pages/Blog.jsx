import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../../utils/axiosInstance";

const FALLBACK_COVER =
  "https://images.pexels.com/photos/4761660/pexels-photo-4761660.jpeg?auto=compress&cs=tinysrgb&w=1200";

const categoryOptions = [
  { value: "", label: "All" },
  { value: "boxing", label: "Boxing" },
  { value: "mindset", label: "Mindset" },
  { value: "conditioning", label: "Conditioning" },
  { value: "nutrition", label: "Nutrition" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "other", label: "Other" },
];

function cleanText(value = "") {
  return String(value || "")
    .replace(/\\n/g, " ")
    .replace(/[#>*_`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const Blog = () => {
  const navigate = useNavigate();

  const [blogs, setBlogs] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 9,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

    return () => clearTimeout(timer);
  }, [search]);

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const buildExcerpt = (blog) => {
    const raw = cleanText(blog?.excerpt || blog?.content || "");
    if (!raw) return "Open this premium article to read the full breakdown.";
    return raw.length > 155 ? `${raw.slice(0, 155)}…` : raw;
  };

  const sortedBlogs = useMemo(() => {
    const list = [...blogs];

    if (sort === "popular") {
      return list.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
    }

    if (sort === "mostLiked") {
      return list.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0));
    }

    if (sort === "oldest") {
      return list.sort(
        (a, b) =>
          new Date(a.publishedAt || a.createdAt || 0) -
          new Date(b.publishedAt || b.createdAt || 0)
      );
    }

    return list.sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt || 0) -
        new Date(a.publishedAt || a.createdAt || 0)
    );
  }, [blogs, sort]);

  const fetchBlogs = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: pagination.limit,
      };

      if (category) params.category = category;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await axiosInstance.get("/blogs", { params });

      if (res.data?.success) {
        setBlogs(Array.isArray(res.data.data) ? res.data.data : []);
        setPagination(
          res.data.pagination || {
            page,
            pages: 1,
            total: 0,
            limit: pagination.limit,
          }
        );
      } else {
        setBlogs([]);
        setError(res.data?.message || "We couldn’t load the blog feed right now.");
      }
    } catch (err) {
      setBlogs([]);
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
    fetchBlogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, debouncedSearch]);

  const handlePageChange = (newPage) => {
    if (
      newPage === pagination.page ||
      newPage < 1 ||
      newPage > pagination.pages
    ) {
      return;
    }

    fetchBlogs(newPage);
  };

  const handleReadMore = (blog) => {
    if (!blog?._id && !blog?.slug) return;
    navigate(`/blog/${blog.slug || blog._id}`);
  };

  const totalViews = blogs.reduce((sum, blog) => sum + Number(blog.views || 0), 0);
  const totalLikes = blogs.reduce((sum, blog) => sum + Number(blog.likes || 0), 0);

  return (
    <PageWrap>
      <LuxuryGlow />

      <Inner>
        <HeadingRow>
          <TitleBlock>
            <Kicker>KnockoutCodes Journal</Kicker>
            <PageTitle>
              Premium Fight IQ,
              <br />
              Style, Mindset & Discipline.
            </PageTitle>
            <Subtitle>
              Sharp articles built for people who want cleaner movement, stronger
              confidence, better habits, and a more powerful presence.
            </Subtitle>
          </TitleBlock>

          <ControlsCard>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles, tags, or topics…"
            />

            <ControlRow>
              <Select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="popular">Most Viewed</option>
                <option value="mostLiked">Most Liked</option>
              </Select>
            </ControlRow>

            <FilterBar>
              {categoryOptions.map((cat) => (
                <Chip
                  key={cat.value || "all"}
                  type="button"
                  $active={category === cat.value}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.label}
                </Chip>
              ))}
            </FilterBar>
          </ControlsCard>
        </HeadingRow>

        <StatsStrip>
          <StatBox>
            <strong>{pagination.total || blogs.length}</strong>
            <span>Articles</span>
          </StatBox>

          <StatBox>
            <strong>{totalViews}</strong>
            <span>Page Views</span>
          </StatBox>

          <StatBox>
            <strong>{totalLikes}</strong>
            <span>Page Likes</span>
          </StatBox>

          <StatBox>
            <strong>{pagination.page}</strong>
            <span>Current Page</span>
          </StatBox>
        </StatsStrip>

        {error && (
          <ErrorBox>
            <span>{error}</span>
            <RetryBtn type="button" onClick={() => fetchBlogs(pagination.page || 1)}>
              Try Again
            </RetryBtn>
          </ErrorBox>
        )}

        {loading ? (
          <SkeletonGrid>
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </SkeletonGrid>
        ) : sortedBlogs.length === 0 ? (
          <EmptyState>
            {debouncedSearch
              ? "No matches found. Try a different keyword."
              : "No published articles are available in this category yet."}
          </EmptyState>
        ) : (
          <>
            <Grid>
              {sortedBlogs.map((blog, index) => {
                const views = Number(blog.views || 0);
                const likes = Number(blog.likes || 0);
                const unlikes = Number(blog.unlikes || 0);
                const readTime = Number(blog.readTime || 1);

                return (
                  <Card
                    key={blog._id || blog.slug || index}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: index * 0.04 }}
                    layout
                  >
                    <Cover type="button" onClick={() => handleReadMore(blog)}>
                      <img
                        src={blog.coverImage || FALLBACK_COVER}
                        alt={blog.title || "Blog cover"}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_COVER;
                        }}
                      />

                      <ImageShade />

                      <BadgeRow>
                        <CategoryTag>{blog.category || "boxing"}</CategoryTag>
                        {blog.featured ? <FeaturedBadge>Featured</FeaturedBadge> : null}
                      </BadgeRow>

                      <HookStrip>Open the full breakdown.</HookStrip>
                    </Cover>

                    <CardBody>
                      <MetaRow>
                        <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                        <span>{readTime} min read</span>
                      </MetaRow>

                      <CardTitle>{blog.title}</CardTitle>

                      <Excerpt>{buildExcerpt(blog)}</Excerpt>

                      {Array.isArray(blog.tags) && blog.tags.length > 0 ? (
                        <TagRow>
                          {blog.tags.slice(0, 4).map((tag) => (
                            <TagPill key={tag}>#{tag}</TagPill>
                          ))}
                        </TagRow>
                      ) : null}

                      <EngagementMiniGrid>
                        <MiniStat>
                          <strong>{views}</strong>
                          <span>{views === 1 ? "View" : "Views"}</span>
                        </MiniStat>

                        <MiniStat>
                          <strong>{likes}</strong>
                          <span>{likes === 1 ? "Like" : "Likes"}</span>
                        </MiniStat>

                        <MiniStat>
                          <strong>{unlikes}</strong>
                          <span>{unlikes === 1 ? "Unlike" : "Unlikes"}</span>
                        </MiniStat>
                      </EngagementMiniGrid>

                      <CardFooter>
                        <FooterText>Premium article</FooterText>

                        <ReadMoreButton type="button" onClick={() => handleReadMore(blog)}>
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
                  type="button"
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
                      type="button"
                      $active={pagination.page === pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </PageButton>
                  );
                })}

                <PageButton
                  type="button"
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

/* =========================
   Styles
========================= */

const shimmer = keyframes`
  0% { background-position: 0% 0; }
  100% { background-position: -200% 0; }
`;

const PageWrap = styled.main`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 10% 6%, rgba(214, 182, 159, 0.22), transparent 34%),
    radial-gradient(circle at 90% 12%, rgba(90, 56, 37, 0.38), transparent 36%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
  color: ${({ theme }) => theme.colors.white};
  padding: 100px 20px 80px;
  display: flex;
  justify-content: center;
`;

const LuxuryGlow = styled.div`
  position: absolute;
  inset: auto -20% -36% -20%;
  height: 460px;
  background: radial-gradient(circle, rgba(214, 182, 159, 0.18), transparent 62%);
  pointer-events: none;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  position: relative;
  z-index: 1;
`;

const HeadingRow = styled.div`
  display: grid;
  gap: 18px;
  margin-bottom: 18px;

  @media (min-width: 920px) {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: stretch;
  }
`;

const TitleBlock = styled.header`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(24px, 4vw, 42px);
  background:
    linear-gradient(145deg, rgba(61, 38, 26, 0.82), rgba(0, 0, 0, 0.62)),
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.16), transparent 42%);
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Kicker = styled.p`
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 5rem);
  line-height: 0.92;
  font-weight: 950;
  letter-spacing: -0.07em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  max-width: 720px;
  margin: 18px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  font-size: 15px;
  line-height: 1.75;
`;

const ControlsCard = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 20px;
  background:
    radial-gradient(circle at 20% 0%, rgba(214, 182, 159, 0.14), transparent 42%),
    rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(214, 182, 159, 0.16);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  display: grid;
  gap: 12px;
  align-content: center;
`;

const ControlRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(0, 0, 0, 0.42);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 12px 15px;
  outline: none;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 249, 242, 0.55);
  }

  &:focus {
    border-color: rgba(214, 182, 159, 0.68);
    box-shadow: ${({ theme }) => theme.shadow.glow};
  }
`;

const Select = styled.select`
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(0, 0, 0, 0.42);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 12px 15px;
  outline: none;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  &:focus {
    border-color: rgba(214, 182, 159, 0.68);
    box-shadow: ${({ theme }) => theme.shadow.glow};
  }
`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
`;

const Chip = styled.button`
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214, 182, 159, 0.78)" : "rgba(255, 249, 242, 0.1)"};
  padding: 8px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? `linear-gradient(130deg, ${theme.colors.lightBrown}, ${theme.colors.ivory})`
      : "rgba(0, 0, 0, 0.32)"};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.black : theme.colors.ivory};
`;

const StatsStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0 24px;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 16px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.16);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 26px;
    font-weight: 950;
  }

  span {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.74;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.article)`
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(150deg, ${({ theme }) => theme.colors.cocoa}, ${({ theme }) => theme.colors.darkBrown});
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  min-height: 540px;
`;

const Cover = styled.button`
  position: relative;
  width: 100%;
  border: 0;
  padding: 0;
  padding-top: 64%;
  overflow: hidden;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.black};
  text-align: left;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  ${Card}:hover & img {
    transform: scale(1.07);
  }
`;

const ImageShade = styled.span`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.74)),
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.14), transparent 40%);
`;

const BadgeRow = styled.div`
  position: absolute;
  inset: 14px 14px auto 14px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`;

const CategoryTag = styled.span`
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(0, 0, 0, 0.68);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.2);
`;

const FeaturedBadge = styled(CategoryTag)`
  background: rgba(255, 215, 122, 0.94);
  color: ${({ theme }) => theme.colors.black};
`;

const HookStrip = styled.span`
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  z-index: 2;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.66);
  border: 1px solid rgba(214, 182, 159, 0.2);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 950;
`;

const CardBody = styled.div`
  padding: 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.76;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const CardTitle = styled.h2`
  margin: 12px 0 10px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 21px;
  line-height: 1.1;
  font-weight: 950;
  letter-spacing: -0.035em;
`;

const Excerpt = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.8;
  font-size: 13.5px;
  line-height: 1.68;
  flex: 1;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
`;

const TagPill = styled.span`
  font-size: 11px;
  font-weight: 850;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 249, 242, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
`;

const EngagementMiniGrid = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`;

const MiniStat = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 10px 8px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.13);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 17px;
    font-weight: 950;
  }

  span {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.72;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
`;

const CardFooter = styled.div`
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 249, 242, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const FooterText = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const ReadMoreButton = styled.button`
  border: none;
  padding: 10px 15px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const SkeletonCard = styled.div`
  min-height: 520px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    120deg,
    rgba(255, 249, 242, 0.08),
    rgba(0, 0, 0, 0.5),
    rgba(255, 249, 242, 0.08)
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.4s infinite;
  border: 1px solid rgba(255, 249, 242, 0.08);
`;

const ErrorBox = styled.div`
  margin: 14px 0 22px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(140, 23, 23, 0.24);
  border: 1px solid rgba(255, 120, 120, 0.6);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const RetryBtn = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.35);
  padding: 9px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  cursor: pointer;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(0, 0, 0, 0.42);
  color: ${({ theme }) => theme.colors.ivory};
`;

const PaginationBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.24);
  padding: 9px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? `linear-gradient(130deg, ${theme.colors.lightBrown}, ${theme.colors.ivory})`
      : "rgba(0, 0, 0, 0.46)"};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.black : theme.colors.ivory};
  opacity: ${({ disabled }) => (disabled ? 0.45 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? "none" : "auto")};
`;

const EmptyState = styled.div`
  margin-top: 36px;
  text-align: center;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
`;