// src/pages/BlogDetail.jsx
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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
  max-width: 900px;
`;

const BackRow = styled.div`
  display: flex;
  margin-bottom: 18px;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`;

const BackButton = styled.button`
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.22);

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    box-shadow: ${({ theme }) => theme.shadow.soft};
    transform: translateY(-1px);
  }
`;

const MiniBadge = styled.span`
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 249, 242, 0.86);
`;

const CoverWrap = styled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.xl};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadow.hard};
  margin-bottom: 22px;

  img {
    width: 100%;
    max-height: 460px;
    object-fit: cover;
    display: block;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.78),
      transparent 44%
    );
  }
`;

const CoverOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 2;
`;

const CategoryTag = styled.span`
  padding: 5px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.72);
  color: ${({ theme }) => theme.colors.ivory};
  align-self: flex-start;
  border: 1px solid rgba(255, 255, 255, 0.18);
`;

const Title = styled.h1`
  font-size: clamp(26px, 3.2vw, 38px);
  line-height: 1.12;
  max-width: 760px;
  margin: 0;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 249, 242, 0.88);
`;

const BodyCard = styled(motion.section)`
  background: ${({ theme }) => theme.colors.cocoa};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 22px 20px 26px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const AuthorRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  flex-wrap: wrap;
`;

const AuthorName = styled.span`
  font-weight: 700;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
`;

const TagPill = styled.span`
  font-size: 11px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const Content = styled.div`
  font-size: 15.6px;
  line-height: 1.75;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: pre-wrap;

  p + p {
    margin-top: 12px;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 18px 0 14px;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: rgba(255, 249, 242, 0.78);
`;

const SkeletonBlock = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  height: 260px;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.08),
    rgba(0, 0, 0, 0.5),
    rgba(255, 255, 255, 0.08)
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

const Spacer = styled.div`
  height: 18px;
`;

const ErrorBox = styled.div`
  margin-top: 18px;
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

const ActionBtn = styled.button`
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

const FALLBACK_COVER =
  "https://images.pexels.com/photos/4761660/pexels-photo-4761660.jpeg?auto=compress&cs=tinysrgb&w=1200";

const BlogDetail = () => {
  const navigate = useNavigate();
  const { idOrSlug } = useParams();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const isNotFound = useMemo(() => {
    const msg = (error || "").toLowerCase();
    return msg.includes("not found") || msg.includes("404");
  }, [error]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(`${API_BASE_URL}/api/v1/blogs/${idOrSlug}`, {
        withCredentials: false, // public endpoint
      });

      if (res.data?.success) {
        const data = res.data.data;

        // Optional: if someone tries to access an unpublished post
        if (data && data.isPublished === false) {
          setBlog(null);
          setError("This article isn’t published yet.");
          return;
        }

        setBlog(data);
      } else {
        setError(res.data?.message || "We couldn’t load this article.");
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong while loading this article.";

      // nicer 404 message
      if (status === 404) {
        setError("This article is not available (not found).");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOrSlug]);

  return (
    <PageWrap>
      <Inner>
        <BackRow>
          <BackButton onClick={() => navigate("/blog")}>
            <span>←</span>
            <span>Back to all articles</span>
          </BackButton>

          {!loading && blog?.featured && <MiniBadge>Featured</MiniBadge>}
        </BackRow>

        {loading ? (
          <>
            <SkeletonBlock />
            <Spacer />
            <SkeletonBlock style={{ height: 360 }} />
          </>
        ) : error ? (
          <ErrorBox>
            <span>{error}</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionBtn onClick={fetchBlog}>Try again</ActionBtn>
              <ActionBtn onClick={() => navigate("/blog")}>All articles</ActionBtn>
            </div>
          </ErrorBox>
        ) : !blog ? (
          <ErrorBox>
            <span>{isNotFound ? "Article not found." : "This article isn’t available."}</span>
            <ActionBtn onClick={() => navigate("/blog")}>All articles</ActionBtn>
          </ErrorBox>
        ) : (
          <>
            <CoverWrap>
              <img src={blog.coverImage || FALLBACK_COVER} alt={blog.title || "Blog cover"} />
              <CoverOverlay>
                <CategoryTag>{blog.category || "boxing"}</CategoryTag>
                <Title>{blog.title}</Title>
                <MetaRow>
                  <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                  <span>{blog.readTime || 1} min read</span>
                  <span>
                    {blog.views || 0} view{(blog.views || 0) === 1 ? "" : "s"}
                  </span>
                </MetaRow>
              </CoverOverlay>
            </CoverWrap>

            <BodyCard
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32 }}
            >
              <AuthorRow>
                <div>
                  <span>Written by </span>
                  <AuthorName>{blog.author?.name || "KnockoutCodes Team"}</AuthorName>
                </div>
                <div>
                  <span>
                    {blog.likes || 0} like{(blog.likes || 0) === 1 ? "" : "s"}
                  </span>
                </div>
              </AuthorRow>

              {Array.isArray(blog.tags) && blog.tags.length > 0 && (
                <TagRow>
                  {blog.tags.map((tag) => (
                    <TagPill key={tag}>#{tag}</TagPill>
                  ))}
                </TagRow>
              )}

              {blog.excerpt && (
                <>
                  <div style={{ opacity: 0.95, color: "rgba(255,249,242,0.9)" }}>
                    {blog.excerpt}
                  </div>
                  <Divider />
                </>
              )}

              <Content>{blog.content}</Content>

              <Divider />

              <StatsRow>
                <span>Published: {formatDate(blog.publishedAt || blog.createdAt)}</span>
                <span>Updated: {formatDate(blog.updatedAt || blog.createdAt)}</span>
              </StatsRow>
            </BodyCard>
          </>
        )}
      </Inner>
    </PageWrap>
  );
};

export default BlogDetail;

