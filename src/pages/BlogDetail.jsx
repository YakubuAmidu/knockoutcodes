import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import axiosInstance from "../../utils/axiosInstance";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { motion } from "framer-motion";

const FALLBACK_COVER =
  "https://images.pexels.com/photos/4761660/pexels-photo-4761660.jpeg?auto=compress&cs=tinysrgb&w=1200";

function renderInlineMarkdown(text = "") {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return <span key={index}>{part}</span>;
  });
}

function renderBlogContent(content = "") {
  const normalized = String(content || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  const lines = normalized.split("\n");
  const elements = [];
  let listItems = [];
  let listType = "ul";

  const flushList = () => {
    if (!listItems.length) return;

    const ListTag = listType === "ol" ? "ol" : "ul";

    elements.push(
      <ListTag key={`list-${elements.length}`}>
        {listItems.map((item, index) => (
          <li key={`item-${index}`}>{renderInlineMarkdown(item)}</li>
        ))}
      </ListTag>
    );

    listItems = [];
    listType = "ul";
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    if (line === "---") {
      flushList();
      elements.push(<hr key={`hr-${index}`} />);
      return;
    }

    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={index}>{renderInlineMarkdown(line.replace("### ", ""))}</h3>
      );
      return;
    }

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={index}>{renderInlineMarkdown(line.replace("## ", ""))}</h2>
      );
      return;
    }

    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={index}>{renderInlineMarkdown(line.replace("# ", ""))}</h1>
      );
      return;
    }

    if (line.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote key={index}>
          {renderInlineMarkdown(line.replace("> ", ""))}
        </blockquote>
      );
      return;
    }

    if (line.startsWith("- ")) {
      if (listItems.length && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(line.replace("- ", ""));
      return;
    }

    if (/^\d+\.\s/.test(line)) {
      if (listItems.length && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(line.replace(/^\d+\.\s/, ""));
      return;
    }

    flushList();
    elements.push(<p key={index}>{renderInlineMarkdown(line)}</p>);
  });

  flushList();

  return elements;
}

const BlogDetail = () => {
  const navigate = useNavigate();
  const { idOrSlug } = useParams();
  const toast = useToast();

  const { isAuthenticated, user, currentUser, authUser } = useAuth();

  const loggedInUser = user || currentUser || authUser || {};
  const userRole = String(
    loggedInUser?.role || loggedInUser?.user?.role || ""
  ).toLowerCase();

  const isAdmin =
    ["admin", "superadmin"].includes(userRole) || loggedInUser?.isAdmin === true;

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);
  const [unlikeLoading, setUnlikeLoading] = useState(false);

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

  const isNotFound = useMemo(() => {
    const msg = String(error || "").toLowerCase();
    return msg.includes("not found") || msg.includes("404");
  }, [error]);

  const readTime = Number(blog?.readTime || 1);
  const views = Number(blog?.views || 0);
  const likes = Number(blog?.likes || 0);
  const unlikes = Number(blog?.unlikes || 0);

  const fetchBlog = useCallback(async () => {
    if (!idOrSlug) {
      setLoading(false);
      setError("Missing article id or slug.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await axiosInstance.get(`/blogs/${idOrSlug}`);

      if (res.data?.success) {
        const data = res.data.data;

        if (!data) {
          setBlog(null);
          setError("This article is not available.");
          return;
        }

        if (data.isPublished === false && !isAdmin) {
          setBlog(null);
          setError("This article isn’t published yet.");
          return;
        }

        setBlog(data);
      } else {
        setBlog(null);
        setError(res.data?.message || "We couldn’t load this article.");
      }
    } catch (err) {
      setBlog(null);

      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong while loading this article.";

      if (status === 404) {
        setError("This article is not available (not found).");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [idOrSlug, isAdmin]);

  const handleLike = useCallback(async () => {
    if (likeLoading || unlikeLoading) return;

    try {
      if (!isAuthenticated) {
        navigate("/login");
        return;
      }

      if (isAdmin) {
        toast?.push?.({
          title: "Admins cannot like articles",
          description:
            "Admin accounts cannot like or unlike blog articles. Please use a regular user account.",
          variant: "danger",
        });
        return;
      }

      setLikeLoading(true);

      const res = await axiosInstance.patch(`/blogs/${idOrSlug}/like`, {});

      if (res.data?.success) {
        setBlog((prev) =>
          prev
            ? {
                ...prev,
                likes: res.data.data.likes,
                unlikes: res.data.data.unlikes,
              }
            : prev
        );

        toast?.push?.({
          title: "Article liked",
          description: "Your feedback was saved successfully.",
          variant: "success",
        });
      }
    } catch (err) {
      toast?.push?.({
        title: "Unable to like article",
        description:
          err?.response?.data?.message ||
          "Something went wrong while liking this article.",
        variant: "danger",
      });
    } finally {
      setLikeLoading(false);
    }
  }, [
    idOrSlug,
    isAdmin,
    isAuthenticated,
    likeLoading,
    navigate,
    toast,
    unlikeLoading,
  ]);

  const handleUnlike = useCallback(async () => {
    if (likeLoading || unlikeLoading) return;

    try {
      if (!isAuthenticated) {
        navigate("/login");
        return;
      }

      if (isAdmin) {
        toast?.push?.({
          title: "Admins cannot like articles",
          description:
            "Admin accounts cannot like or unlike blog articles. Please use a regular user account.",
          variant: "danger",
        });
        return;
      }

      setUnlikeLoading(true);

      const res = await axiosInstance.patch(`/blogs/${idOrSlug}/unlike`, {});

      if (res.data?.success) {
        setBlog((prev) =>
          prev
            ? {
                ...prev,
                likes: res.data.data.likes,
                unlikes: res.data.data.unlikes,
              }
            : prev
        );

        toast?.push?.({
          title: "Feedback updated",
          description: "Your article feedback was updated successfully.",
          variant: "success",
        });
      }
    } catch (err) {
      toast?.push?.({
        title: "Unable to update feedback",
        description:
          err?.response?.data?.message ||
          "Something went wrong while updating feedback.",
        variant: "danger",
      });
    } finally {
      setUnlikeLoading(false);
    }
  }, [
    idOrSlug,
    isAdmin,
    isAuthenticated,
    likeLoading,
    navigate,
    toast,
    unlikeLoading,
  ]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  return (
    <PageWrap>
      <LuxuryGlow />

      <Inner>
        <BackRow>
          <BackButton type="button" onClick={() => navigate("/blog")}>
            <span>←</span>
            <span>Back to Articles</span>
          </BackButton>

          <TopPills>
            {!loading && blog?.featured ? <MiniBadge>Featured Article</MiniBadge> : null}
            {!loading && blog ? <MiniBadge>KnockoutCodes Journal</MiniBadge> : null}
          </TopPills>
        </BackRow>

        {loading ? (
          <>
            <SkeletonBlock />
            <Spacer />
            <SkeletonBlock style={{ height: 420 }} />
          </>
        ) : error ? (
          <ErrorBox>
            <span>{error}</span>

            <ErrorActions>
              <ActionBtn type="button" onClick={fetchBlog}>
                Try Again
              </ActionBtn>

              <ActionBtn type="button" onClick={() => navigate("/blog")}>
                All Articles
              </ActionBtn>
            </ErrorActions>
          </ErrorBox>
        ) : !blog ? (
          <ErrorBox>
            <span>
              {isNotFound ? "Article not found." : "This article isn’t available."}
            </span>

            <ActionBtn type="button" onClick={() => navigate("/blog")}>
              All Articles
            </ActionBtn>
          </ErrorBox>
        ) : (
          <>
            <HeroCard
              as={motion.section}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <CoverWrap>
                <img
                  src={blog.coverImage || FALLBACK_COVER}
                  alt={blog.title || "Blog cover"}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_COVER;
                  }}
                />

                <ImageOverlay />
              </CoverWrap>

              <HeroContent>
                <CategoryTag>{blog.category || "boxing"}</CategoryTag>

                <HookLine>Read this before your next training move.</HookLine>

                <Title>{blog.title}</Title>

                {blog.excerpt ? <Excerpt>{blog.excerpt}</Excerpt> : null}

                <MetaGrid>
                  <MetaCard>
                    <strong>
                      {formatDate(blog.publishedAt || blog.createdAt) || "Today"}
                    </strong>
                    <span>Published</span>
                  </MetaCard>

                  <MetaCard>
                    <strong>{readTime} min</strong>
                    <span>Read Time</span>
                  </MetaCard>

                  <MetaCard>
                    <strong>{views}</strong>
                    <span>{views === 1 ? "View" : "Views"}</span>
                  </MetaCard>

                  <MetaCard>
                    <strong>{likes}</strong>
                    <span>{likes === 1 ? "Like" : "Likes"}</span>
                  </MetaCard>
                </MetaGrid>
              </HeroContent>
            </HeroCard>

            <ContentGrid>
              <BodyCard
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.08 }}
              >
                <AuthorRow>
                  <AuthorBox>
                    <AuthorAvatar>
                      {(blog.author?.name || "K").charAt(0).toUpperCase()}
                    </AuthorAvatar>

                    <div>
                      <AuthorLabel>Written By</AuthorLabel>
                      <AuthorName>
                        {blog.author?.name || "KnockoutCodes Team"}
                      </AuthorName>
                    </div>
                  </AuthorBox>

                  <ArticleBadge>Premium Breakdown</ArticleBadge>
                </AuthorRow>

                {Array.isArray(blog.tags) && blog.tags.length > 0 ? (
                  <TagRow>
                    {blog.tags.map((tag) => (
                      <TagPill key={tag}>#{tag}</TagPill>
                    ))}
                  </TagRow>
                ) : null}

                <Divider />

                <Content>{renderBlogContent(blog.content)}</Content>

                <Divider />

                <StatsRow>
                  <span>Published: {formatDate(blog.publishedAt || blog.createdAt)}</span>
                  <span>Updated: {formatDate(blog.updatedAt || blog.createdAt)}</span>
                  <span>
                    {views} real {views === 1 ? "view" : "views"}
                  </span>
                  <span>{readTime} min estimated reading time</span>
                </StatsRow>

                <EngagementRow>
                  <EngagementButton
                    type="button"
                    onClick={handleLike}
                    disabled={likeLoading || unlikeLoading}
                  >
                    👍 {likeLoading ? "Liking..." : `${likes} Likes`}
                  </EngagementButton>

                  <EngagementButton
                    type="button"
                    onClick={handleUnlike}
                    disabled={likeLoading || unlikeLoading}
                  >
                    👎 {unlikeLoading ? "Updating..." : `${unlikes} Unlikes`}
                  </EngagementButton>
                </EngagementRow>
              </BodyCard>

              <SideCard
                as={motion.aside}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32, delay: 0.12 }}
              >
                <SideLabel>Article Room</SideLabel>
                <SideTitle>Train smarter. Move cleaner. Build discipline.</SideTitle>

                <SideList>
                  <li>Clear boxing education</li>
                  <li>Premium fighter mindset</li>
                  <li>Simple lessons you can apply fast</li>
                </SideList>
              </SideCard>
            </ContentGrid>
          </>
        )}
      </Inner>
    </PageWrap>
  );
};

export default BlogDetail;

/* =========================
   Styles
========================= */

const shimmerMove = keyframes`
  0% { background-position: 0% 0; }
  100% { background-position: -200% 0; }
`;

const PageWrap = styled.main`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 8%, rgba(214, 182, 159, 0.22), transparent 34%),
    radial-gradient(circle at 88% 18%, rgba(90, 56, 37, 0.36), transparent 36%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
  color: ${({ theme }) => theme.colors.white};
  padding: 100px 20px 80px;
  display: flex;
  justify-content: center;
`;

const LuxuryGlow = styled.div`
  position: absolute;
  inset: auto -15% -35% -15%;
  height: 420px;
  background: radial-gradient(circle, rgba(214, 182, 159, 0.18), transparent 62%);
  pointer-events: none;
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1180px;
`;

const BackRow = styled.div`
  display: flex;
  margin-bottom: 18px;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const TopPills = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const BackButton = styled.button`
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.42);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 11px 15px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.74);
    border-color: rgba(214, 182, 159, 0.55);
    transform: translateY(-1px);
  }
`;

const MiniBadge = styled.span`
  padding: 9px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  background: rgba(214, 182, 159, 0.13);
  border: 1px solid rgba(214, 182, 159, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
`;

const HeroCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(61, 38, 26, 0.86), rgba(0, 0, 0, 0.66)),
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.16), transparent 42%);
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  margin-bottom: 22px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const CoverWrap = styled.div`
  position: relative;
  min-height: 520px;
  background: ${({ theme }) => theme.colors.black};
  overflow: hidden;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(1.08) contrast(1.08);
    transform: scale(1.02);
  }

  @media (max-width: 900px) {
    min-height: 360px;
  }
`;

const ImageOverlay = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.72)),
    linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.8));
`;

const HeroContent = styled.div`
  padding: clamp(26px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const CategoryTag = styled.span`
  width: fit-content;
  padding: 7px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.46);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.34);
`;

const HookLine = styled.p`
  margin: 18px 0 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2.3rem, 5vw, 5rem);
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

const Excerpt = styled.p`
  margin: 18px 0 0;
  max-width: 680px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  font-size: 15px;
  line-height: 1.75;
`;

const MetaGrid = styled.div`
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const MetaCard = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 13px 12px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.16);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 15px;
    font-weight: 950;
  }

  span {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.7;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 22px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const BodyCard = styled(motion.section)`
  background:
    linear-gradient(160deg, rgba(61, 38, 26, 0.78), rgba(0, 0, 0, 0.6)),
    ${({ theme }) => theme.colors.cocoa};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(22px, 3vw, 34px);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const AuthorRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const AuthorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AuthorAvatar = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
`;

const AuthorLabel = styled.span`
  display: block;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.15em;
  text-transform: uppercase;
`;

const AuthorName = styled.span`
  display: block;
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
`;

const ArticleBadge = styled.span`
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(214, 182, 159, 0.14);
  border: 1px solid rgba(214, 182, 159, 0.32);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 14px;
`;

const TagPill = styled.span`
  font-size: 11px;
  font-weight: 850;
  padding: 6px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(255, 249, 242, 0.12);
  color: ${({ theme }) => theme.colors.ivory};
`;

const Content = styled.article`
  color: ${({ theme }) => theme.colors.ivory};
  letter-spacing: 0.01em;

  h1 {
    margin: 0 0 24px;
    font-size: clamp(2rem, 4vw, 3.8rem);
    line-height: 0.96;
    font-weight: 950;
    letter-spacing: -0.06em;
    color: ${({ theme }) => theme.colors.lightBrown};
  }

  h2 {
    margin: 34px 0 14px;
    font-size: clamp(1.55rem, 2.8vw, 2.35rem);
    line-height: 1.05;
    font-weight: 950;
    letter-spacing: -0.04em;
    color: ${({ theme }) => theme.colors.ivory};
  }

  h3 {
    margin: 28px 0 12px;
    font-size: clamp(1.25rem, 2vw, 1.7rem);
    line-height: 1.12;
    font-weight: 950;
    color: ${({ theme }) => theme.colors.lightBrown};
  }

  p {
    margin: 0 0 18px;
    font-size: clamp(1rem, 1.35vw, 1.08rem);
    line-height: 1.95;
    opacity: 0.9;
  }

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
  }

  em {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.95;
  }

  ul,
  ol {
    margin: 16px 0 24px;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
    counter-reset: article-list;
  }

  li {
    position: relative;
    padding-left: 30px;
    font-size: clamp(1rem, 1.3vw, 1.06rem);
    line-height: 1.75;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.9;
  }

  ul li::before {
    content: "✓";
    position: absolute;
    left: 0;
    top: 0;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
  }

  ol li {
    counter-increment: article-list;
  }

  ol li::before {
    content: counter(article-list) ".";
    position: absolute;
    left: 0;
    top: 0;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
  }

  blockquote {
    margin: 26px 0;
    padding: 20px 22px;
    border-left: 4px solid ${({ theme }) => theme.colors.lightBrown};
    border-radius: ${({ theme }) => theme.radius.lg};
    background: rgba(0, 0, 0, 0.34);
    color: ${({ theme }) => theme.colors.ivory};
    font-size: clamp(1.05rem, 1.5vw, 1.18rem);
    line-height: 1.75;
    font-weight: 850;
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }

  hr {
    border: none;
    height: 1px;
    margin: 30px 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(214, 182, 159, 0.55),
      transparent
    );
  }
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 249, 242, 0.1);
  margin: 20px 0 18px;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: rgba(255, 249, 242, 0.72);
`;

const EngagementRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
`;

const EngagementButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.32);
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 11px 15px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(214, 182, 159, 0.72);
    background: rgba(0, 0, 0, 0.58);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const SideCard = styled.aside`
  position: sticky;
  top: 96px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 22px;
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.16), transparent 42%),
    rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(214, 182, 159, 0.16);
  box-shadow: ${({ theme }) => theme.shadow.soft};

  @media (max-width: 960px) {
    position: static;
  }
`;

const SideLabel = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const SideTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 25px;
  line-height: 1.05;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const SideList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 18px 0;
  display: grid;
  gap: 10px;

  li {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.84;
    font-size: 13px;
    line-height: 1.5;
  }

  li::before {
    content: "✓";
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
    margin-right: 8px;
  }
`;

const SkeletonBlock = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  height: 380px;
  background: linear-gradient(
    120deg,
    rgba(255, 249, 242, 0.08),
    rgba(0, 0, 0, 0.5),
    rgba(255, 249, 242, 0.08)
  );
  background-size: 200% 100%;
  animation: ${shimmerMove} 1.4s infinite;
  border: 1px solid rgba(255, 249, 242, 0.08);
`;

const Spacer = styled.div`
  height: 18px;
`;

const ErrorBox = styled.div`
  margin-top: 18px;
  padding: 18px;
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
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.35);
  padding: 10px 15px;
  border-radius: ${({ theme }) => theme.radius.pill};
  cursor: pointer;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(0, 0, 0, 0.42);
  color: ${({ theme }) => theme.colors.ivory};
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.soft};
    border-color: rgba(214, 182, 159, 0.72);
    transform: translateY(-1px);
  }
`;