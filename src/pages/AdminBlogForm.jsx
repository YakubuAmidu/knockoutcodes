// src/components/AdminBlogForm.jsx
import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

const makeSlug = (title = "") =>
  String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const estimateReadTime = (content) => {
  if (!content) return 0;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

const AdminBlogForm = () => {
  const { push } = useToast();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: "",
    category: "boxing",
    tags: "",
    isPublished: true,
    featured: false,
  });

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const wordCount = form.content.trim()
    ? form.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const tagsArray = useMemo(
  () => [
    ...new Set(
      form.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12)
    ),
  ],
  [form.tags]
);

  const finalSlug = form.slug.trim()
    ? makeSlug(form.slug)
    : makeSlug(form.title);

  const readTime = estimateReadTime(form.content);

  const seoWarnings = useMemo(() => {
    const warnings = [];

    if (form.title.trim().length < 12) warnings.push("Title could be stronger.");
    if (!form.excerpt.trim()) warnings.push("Add a short excerpt.");
    if (wordCount < 250) warnings.push("Content is short for a premium article.");
    if (!form.coverImage.trim()) warnings.push("Add a cover image URL.");
    if (tagsArray.length < 2) warnings.push("Add at least 2 tags.");

    return warnings;
  }, [form.title, form.excerpt, form.coverImage, tagsArray.length, wordCount]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleReset = () => {
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImage: "",
      category: "boxing",
      tags: "",
      isPublished: true,
      featured: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!form.title.trim() || !form.content.trim()) {
      push({
        title: "Missing required fields",
        description: "Title and content are required to create a blog.",
        variant: "error",
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || undefined,
        content: form.content.trim(),
        coverImage: form.coverImage.trim() || undefined,
        category: form.category,
        tags: tagsArray,
        isPublished: form.isPublished,
        featured: form.featured,
      };

      if (finalSlug) {
        payload.slug = finalSlug;
      }

      await axiosInstance.post("/blogs", payload);

      push({
        title: "Blog created",
        description: "Your premium article was created successfully.",
        variant: "success",
      });

      handleReset();
    } catch (err) {
      push({
        title: "Error creating blog",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to create blog. Please try again.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOne = async () => {
    if (deleteLoading) return;

    const slug = form.slug.trim().toLowerCase();

    if (!slug) {
      push({
        title: "Slug required",
        description: "Enter the slug of the blog you want to delete.",
        variant: "error",
      });
      return;
    }

    const ok = window.confirm(
      `Delete this blog permanently?\n\nSlug: ${slug}\n\nThis cannot be undone.`
    );

    if (!ok) return;

    try {
      setDeleteLoading(true);

      await axiosInstance.delete(`/blogs/${slug}`);

      push({
        title: "Blog deleted",
        description: `Blog with slug "${slug}" has been removed.`,
        variant: "success",
      });
    } catch (err) {
      push({
        title: "Error deleting blog",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to delete blog. Please try again.",
        variant: "error",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteLoading) return;

    const confirmText = window.prompt(
      'This will delete every blog permanently. Type "DELETE ALL BLOGS" to confirm.'
    );

    if (confirmText !== "DELETE ALL BLOGS") {
      push({
        title: "Delete canceled",
        description: "Blogs were not deleted.",
        variant: "success",
      });
      return;
    }

    try {
      setDeleteLoading(true);

      await axiosInstance.delete(
  "/blogs?confirm=DELETE_ALL_BLOGS"
);

      push({
        title: "All blogs deleted",
        description: "Every blog has been removed from the database.",
        variant: "success",
      });
    } catch (err) {
      push({
        title: "Error deleting all blogs",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to delete all blogs. Please try again.",
        variant: "error",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Section>
      <Shell>
        <HeaderRow>
          <HookBadge>⚡ Premium Admin Blog Studio</HookBadge>
          <Title>Publish A 5-Star Knockout Article</Title>
          <Subtitle>
            Create polished, premium, and professional articles with clean
            formatting, stronger hooks, live preview, and protected admin actions.
          </Subtitle>
        </HeaderRow>

        <FormCard
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LeftColumn>
            <Field>
              <LabelRow>
                <Label htmlFor="title">Title / First Hook</Label>
                <Hint>{form.title.length}/150</Hint>
              </LabelRow>

              <Input
                id="title"
                name="title"
                type="text"
                maxLength={150}
                placeholder="Example: 7 Style Codes That Make Any Outfit Look Expensive"
                value={form.title}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Hint>{form.excerpt.length}/300</Hint>
              </LabelRow>

              <TextArea
                id="excerpt"
                name="excerpt"
                maxLength={300}
                placeholder="Write a short premium teaser that makes people want to open the article..."
                value={form.excerpt}
                onChange={handleChange}
              />
            </Field>

            <MarkdownHelp>
              <strong>Formatting Guide</strong>
              <span># Main Title</span>
              <span>## Section Title</span>
              <span>**Bold text**</span>
              <span>- Bullet point</span>
              <span>&gt; Quote block</span>
            </MarkdownHelp>

            <Field>
              <LabelRow>
                <Label htmlFor="content">Main Content</Label>
                <Hint>{wordCount} words • {readTime || 0} min read</Hint>
              </LabelRow>

              <TextArea
                id="content"
                name="content"
                placeholder="Write your full article here using clean markdown formatting..."
                value={form.content}
                onChange={handleChange}
                $large
              />
            </Field>
          </LeftColumn>

          <RightColumn>
            <Field>
              <LabelRow>
                <Label htmlFor="slug">Slug</Label>
                <Hint>Optional</Hint>
              </LabelRow>

              <Input
                id="slug"
                name="slug"
                type="text"
                placeholder="7-style-codes-expensive-outfit"
                value={form.slug}
                onChange={handleChange}
              />

              <UrlPreview>/blog/{finalSlug || "your-blog-slug"}</UrlPreview>
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="coverImage">Cover Image URL</Label>
                <Hint>Luxury hero image</Hint>
              </LabelRow>

              <Input
                id="coverImage"
                name="coverImage"
                type="url"
                placeholder="https://your-image-url.com/cover.jpg"
                value={form.coverImage}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="category">Category</Label>
                <Hint>Frontend filter</Hint>
              </LabelRow>

              <Select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="boxing">Boxing</option>
                <option value="mindset">Mindset</option>
                <option value="conditioning">Conditioning</option>
                <option value="nutrition">Nutrition</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="other">Other</option>
              </Select>
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="tags">Tags</Label>
                <Hint>{tagsArray.length} tags</Hint>
              </LabelRow>

              <Input
                id="tags"
                name="tags"
                type="text"
                placeholder="style, outfit, luxury, confidence"
                value={form.tags}
                onChange={handleChange}
              />
            </Field>

            <ToggleRow>
              <Toggle>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={form.isPublished}
                  onChange={handleChange}
                />
                <span>Published</span>
              </Toggle>

              <Toggle>
                <input
                  type="checkbox"
                  name="featured"
                  checked={form.featured}
                  onChange={handleChange}
                />
                <span>Featured</span>
              </Toggle>
            </ToggleRow>

            <SeoBox>
              <strong>Quality Check</strong>

              {seoWarnings.length ? (
                seoWarnings.map((warning) => (
                  <span key={warning}>• {warning}</span>
                ))
              ) : (
                <SuccessText>Looks clean, premium, and ready.</SuccessText>
              )}
            </SeoBox>

            <PreviewCard>
              <PreviewImage
                src={
                  form.coverImage ||
                  "https://images.pexels.com/photos/4761660/pexels-photo-4761660.jpeg?auto=compress&cs=tinysrgb&w=1200"
                }
                alt="Blog preview"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://images.pexels.com/photos/4761660/pexels-photo-4761660.jpeg?auto=compress&cs=tinysrgb&w=1200";
                }}
              />

              <PreviewBody>
                <PreviewBadge>{form.category}</PreviewBadge>
                {form.featured ? <PreviewBadge>Featured</PreviewBadge> : null}

                <PreviewTitle>
                  {form.title || "Your premium blog title appears here"}
                </PreviewTitle>

                <PreviewText>
                  {form.excerpt ||
                    "Your article excerpt will preview here before publishing."}
                </PreviewText>

                <PreviewStats>
                  <span>{readTime || 0} min read</span>
                  <span>{wordCount} words</span>
                </PreviewStats>
              </PreviewBody>
            </PreviewCard>

            <FooterRow>
              <Actions>
                <PrimaryButton type="submit" disabled={loading}>
                  {loading ? "Publishing..." : "Publish Blog"} {!loading && "➜"}
                </PrimaryButton>

                <SecondaryButton type="button" onClick={handleReset} disabled={loading}>
                  Reset
                </SecondaryButton>

                <DangerButton
                  type="button"
                  onClick={handleDeleteOne}
                   disabled={deleteLoading}
                >
                  Delete One
                </DangerButton>

                <DangerButton
                  type="button"
                  onClick={handleDeleteAll}
                  disabled={deleteLoading}
                >
                  Delete All
                </DangerButton>
              </Actions>
            </FooterRow>
          </RightColumn>
        </FormCard>
      </Shell>
    </Section>
  );
};

export default AdminBlogForm;

/* =========================
   Styles
========================= */

const Section = styled.section`
  width: 100%;
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.2), transparent 34%),
    radial-gradient(circle at 88% 14%, rgba(90, 56, 37, 0.42), transparent 34%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
  padding: 96px 18px 54px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

const Shell = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  display: grid;
  gap: 24px;
`;

const HeaderRow = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
`;

const HookBadge = styled.span`
  display: inline-flex;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.78rem;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: rgba(214, 182, 159, 0.12);
  border: 1px solid rgba(214, 182, 159, 0.4);
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Title = styled.h1`
  margin: 14px 0 10px;
  font-size: clamp(2.2rem, 5vw, 4.8rem);
  line-height: 0.92;
  font-weight: 950;
  letter-spacing: -0.07em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  max-width: 760px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  line-height: 1.75;
`;

const FormCard = styled(motion.form)`
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.12), transparent 42%),
    rgba(0, 0, 0, 0.42);
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 24px;
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 249, 242, 0.12);
  display: grid;
  gap: 24px;

  @media (min-width: 960px) {
    grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
  }
`;

const LeftColumn = styled.div`
  display: grid;
  gap: 18px;
`;

const RightColumn = styled.div`
  display: grid;
  gap: 18px;
  align-content: start;
`;

const Field = styled.div`
  display: grid;
  gap: 7px;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const Label = styled.label`
  font-size: 0.82rem;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Hint = styled.span`
  font-size: 0.78rem;
  color: rgba(214, 182, 159, 0.82);
`;

const Input = styled.input`
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.38);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 12px;
  font-size: 0.95rem;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.4);
  }
`;

const TextArea = styled.textarea`
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.38);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 13px;
  min-height: ${({ $large }) => ($large ? "360px" : "130px")};
  resize: vertical;
  font-size: 0.96rem;
  outline: none;
  line-height: 1.65;

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.4);
  }
`;

const Select = styled.select`
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.5);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 12px;
  outline: none;
`;

const MarkdownHelp = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.18);
  display: grid;
  gap: 6px;
  color: ${({ theme }) => theme.colors.ivory};

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.75rem;
  }

  span {
    font-size: 0.84rem;
    opacity: 0.82;
  }
`;

const UrlPreview = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const ToggleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const Toggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 249, 242, 0.14);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;

  input {
    accent-color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const SeoBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(214, 182, 159, 0.16);
  display: grid;
  gap: 7px;
  color: ${({ theme }) => theme.colors.ivory};

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.78rem;
  }

  span {
    font-size: 0.84rem;
    opacity: 0.84;
  }
`;

const SuccessText = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 850;
`;

const PreviewCard = styled.div`
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    150deg,
    ${({ theme }) => theme.colors.cocoa},
    ${({ theme }) => theme.colors.darkBrown}
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 190px;
  object-fit: cover;
  display: block;
`;

const PreviewBody = styled.div`
  padding: 16px;
`;

const PreviewBadge = styled.span`
  display: inline-block;
  margin: 0 6px 10px 0;
  padding: 6px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(214, 182, 159, 0.14);
  border: 1px solid rgba(214, 182, 159, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 0.68rem;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const PreviewTitle = styled.h3`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 1.25rem;
  line-height: 1.15;
`;

const PreviewText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 0.9rem;
  line-height: 1.6;
`;

const PreviewStats = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.78rem;
  font-weight: 850;
`;

const FooterRow = styled.div`
  display: flex;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 0;
  padding: 11px 18px;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const SecondaryButton = styled.button`
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.34);
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  padding: 11px 16px;
  font-weight: 850;
  cursor: pointer;
`;

const DangerButton = styled(SecondaryButton)`
  border-color: rgba(255, 120, 120, 0.48);
  color: #ffdede;
`;