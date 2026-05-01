// src/components/AdminBlogForm.jsx
import React, { useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import axios from "axios";
import { useToast } from "../components/Toast";

const Section = styled.section`
  width: 100%;
  min-height: 100vh;
  background: radial-gradient(circle at top left, #5a3825 0%, #2f1b12 35%, #000000 100%);
  padding: 48px 18px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

const Shell = styled.div`
  width: 100%;
  max-width: ${(p) => p.theme.layout.max};
  margin: 0 auto;
  display: grid;
  gap: 28px;
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: ${(p) => p.theme.colors.ivory};
`;

const HookBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: ${(p) => p.theme.radius.pill};
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: rgba(214, 182, 159, 0.12);
  border: 1px solid rgba(214, 182, 159, 0.4);
  color: ${(p) => p.theme.colors.lightBrown};
`;

const Title = styled.h1`
  font-size: clamp(2rem, 3vw, 2.4rem);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: linear-gradient(
    120deg,
    ${(p) => p.theme.colors.ivory},
    ${(p) => p.theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  max-width: 640px;
  font-size: 0.98rem;
  line-height: 1.6;
  color: rgba(255, 249, 242, 0.72);
`;

const FormCard = styled(motion.form)`
  background: radial-gradient(circle at top left, rgba(214, 182, 159, 0.1), rgba(61, 38, 26, 0.96));
  border-radius: ${(p) => p.theme.radius.xl};
  padding: 26px 22px 24px;
  box-shadow: ${(p) => p.theme.shadow.glow};
  border: 1px solid rgba(255, 249, 242, 0.12);
  display: grid;
  gap: 22px;

  @media (min-width: 900px) {
    padding: 30px 28px 26px;
    grid-template-columns: 3fr 2.1fr;
    gap: 26px;
  }
`;

const LeftColumn = styled.div`
  display: grid;
  gap: 18px;
`;

const RightColumn = styled.div`
  display: grid;
  gap: 18px;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${(p) => p.theme.colors.ivory};
`;

const Hint = styled.span`
  font-size: 0.78rem;
  color: rgba(214, 182, 159, 0.8);
`;

const Input = styled.input`
  border-radius: ${(p) => p.theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.22);
  background: rgba(0, 0, 0, 0.35);
  color: ${(p) => p.theme.colors.ivory};
  padding: 10px 12px;
  font-size: 0.96rem;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.08s ease;

  &:focus {
    border-color: ${(p) => p.theme.colors.lightBrown};
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.5);
    transform: translateY(-0.5px);
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.4);
  }
`;

const TextArea = styled.textarea`
  border-radius: ${(p) => p.theme.radius.lg};
  border: 1px solid rgba(255, 249, 242, 0.22);
  background: rgba(0, 0, 0, 0.4);
  color: ${(p) => p.theme.colors.ivory};
  padding: 12px 12px;
  min-height: 160px;
  resize: vertical;
  font-size: 0.96rem;
  outline: none;
  line-height: 1.6;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.08s ease;

  &:focus {
    border-color: ${(p) => p.theme.colors.lightBrown};
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.5);
    transform: translateY(-0.5px);
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.4);
  }
`;

const Select = styled.select`
  border-radius: ${(p) => p.theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.24);
  background: rgba(0, 0, 0, 0.6);
  color: ${(p) => p.theme.colors.ivory};
  padding: 9px 11px;
  font-size: 0.96rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:focus {
    border-color: ${(p) => p.theme.colors.lightBrown};
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.5);
  }
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
  padding: 8px 11px;
  border-radius: ${(p) => p.theme.radius.pill};
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 249, 242, 0.18);
  color: rgba(255, 249, 242, 0.9);
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.08s ease;

  input {
    accent-color: ${(p) => p.theme.colors.lightBrown};
    cursor: pointer;
  }

  &:hover {
    border-color: ${(p) => p.theme.colors.lightBrown};
    transform: translateY(-1px);
  }
`;

const FooterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  border-radius: ${(p) => p.theme.radius.pill};
  border: 0;
  outline: 0;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: linear-gradient(
    130deg,
    ${(p) => p.theme.colors.lightBrown},
    ${(p) => p.theme.colors.ivory}
  );
  color: ${(p) => p.theme.colors.black};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: ${(p) => p.theme.shadow.soft};
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${(p) => p.theme.shadow.hard};
  }

  &:active {
    transform: translateY(1px) scale(0.98);
    box-shadow: ${(p) => p.theme.shadow.soft};
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const SecondaryButton = styled.button`
  border-radius: ${(p) => p.theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.4);
  background: transparent;
  color: ${(p) => p.theme.colors.ivory};
  padding: 10px 18px;
  font-size: 0.9rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.12s ease, transform 0.12s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px) scale(0.98);
  }
`;

const StatusText = styled.span`
  font-size: 0.8rem;
  color: rgba(214, 182, 159, 0.86);
`;

const WordCount = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 249, 242, 0.7);
`;

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// Helper to estimate read time (same logic as backend – ~200 wpm)
const estimateReadTime = (content) => {
  if (!content) return 0;
  const words = content.trim().split(/\s+/).length;
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

  const wordCount = form.content.trim()
    ? form.content.trim().split(/\s+/).length
    : 0;

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

    const tagsArray = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || undefined,
      content: form.content.trim(),
      coverImage: form.coverImage.trim() || undefined,
      category: form.category,
      tags: tagsArray,
      isPublished: form.isPublished,
      featured: form.featured,
      readTime: estimateReadTime(form.content),
    };

    if (form.slug.trim()) {
      payload.slug = form.slug.trim().toLowerCase();
    }

    await axios.post(`${API_BASE}/blogs`, payload, {
      withCredentials: true,
    });

    push({
      title: "Blog created",
      description: "Your knockout article is live and ready for the frontend.",
      variant: "success",
    });

    handleReset();
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to create blog. Please try again.";
    push({
      title: "Error creating blog",
      description: message,
      variant: "error",
    });
  } finally {
    setLoading(false);
  }
};

const handleDeleteOne = async () => {
  const slug = form.slug.trim().toLowerCase();

  if (!slug) {
    push({
      title: "Slug required",
      description: "Enter the slug of the blog you want to delete.",
      variant: "error",
    });
    return;
  }

  try {
    await axios.delete(`${API_BASE}/blogs/${slug}`, {
      withCredentials: true,
    });

    push({
      title: "Blog deleted",
      description: `Blog with slug "${slug}" has been removed.`,
      variant: "success",
    });
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to delete blog. Please try again.";
    push({
      title: "Error deleting blog",
      description: message,
      variant: "error",
    });
  }
};

const handleDeleteAll = async () => {
  try {
    await axios.delete(`${API_BASE}/blogs`, {
      withCredentials: true,
    });

    push({
      title: "All blogs deleted",
      description: "Every blog has been removed from the database.",
      variant: "success",
    });
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to delete all blogs. Please try again.";
    push({
      title: "Error deleting all blogs",
      description: message,
      variant: "error",
    });
  }
};

  return (
    <Section>
      <Shell>
        <HeaderRow>
          <HookBadge>
            ⚡ First 3 Seconds Hook • Admin Blog
          </HookBadge>
          <Title>Drop a Premium Knockout Blog Post</Title>
          <Subtitle>
            Craft luxury-level boxing, mindset, conditioning, and lifestyle articles
            that your audience can’t scroll past. Hit publish once and let the frontend
            pull pure fire straight from your database.
          </Subtitle>
        </HeaderRow>

        <FormCard
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <LeftColumn>
            <Field>
              <LabelRow>
                <Label htmlFor="title">Title (Hook)</Label>
                <Hint>Make the first 1–3 seconds hit harder.</Hint>
              </LabelRow>
              <Input
                id="title"
                name="title"
                type="text"
                maxLength={150}
                placeholder="Example: The Right Hook Timing Drill That Scrambles Any Opponent"
                value={form.title}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="excerpt">Subtitle / Excerpt</Label>
                <Hint>Short teaser shown on the frontend cards.</Hint>
              </LabelRow>
              <TextArea
                id="excerpt"
                name="excerpt"
                maxLength={300}
                placeholder="One or two luxury lines that make them tap in and read the full story..."
                value={form.excerpt}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="content">Main Content</Label>
                <Hint>
                  Build value. Teach, entertain, and sell your brand.
                </Hint>
              </LabelRow>
              <TextArea
                id="content"
                name="content"
                placeholder="Write your long-form blog content here..."
                value={form.content}
                onChange={handleChange}
              />
            </Field>
          </LeftColumn>

          <RightColumn>
            <Field>
              <LabelRow>
                <Label htmlFor="slug">Slug (optional)</Label>
                <Hint>Auto-generated if you leave this empty.</Hint>
              </LabelRow>
              <Input
                id="slug"
                name="slug"
                type="text"
                placeholder="right-hook-timing-drill"
                value={form.slug}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="coverImage">Cover Image URL</Label>
                <Hint>Hero image for the blog card.</Hint>
              </LabelRow>
              <Input
                id="coverImage"
                name="coverImage"
                type="url"
                placeholder="https://your-cdn.com/boxing/right-hook-drill-cover.jpg"
                value={form.coverImage}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="category">Category</Label>
                <Hint>Helps with frontend filtering.</Hint>
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
                <Hint>Comma separated. Example: power, timing, defense</Hint>
              </LabelRow>
              <Input
                id="tags"
                name="tags"
                type="text"
                placeholder="boxing, right hook, drills, power, knockoutcodes"
                value={form.tags}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <LabelRow>
                <Label>Visibility</Label>
                <Hint>Control how it hits the frontend.</Hint>
              </LabelRow>
              <ToggleRow>
                <Toggle>
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={form.isPublished}
                    onChange={handleChange}
                  />
                  <span>Published (visible on frontend)</span>
                </Toggle>
                <Toggle>
                  <input
                    type="checkbox"
                    name="featured"
                    checked={form.featured}
                    onChange={handleChange}
                  />
                  <span>Featured (show in hero / spotlight)</span>
                </Toggle>
              </ToggleRow>
            </Field>

            <FooterRow>
              <Actions>
                <PrimaryButton type="submit" disabled={loading}>
                  {loading ? "Publishing..." : "Publish Blog"}
                  {!loading && <span>➜</span>}
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Reset
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={handleDeleteOne}
                >
                  Delete One
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={handleDeleteAll}
                >
                  Delete All
                </SecondaryButton>
              </Actions>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <StatusText>
                  Est. read time: {estimateReadTime(form.content) || 0} min
                </StatusText>
                <WordCount>{wordCount} words</WordCount>
              </div>
            </FooterRow>
          </RightColumn>
        </FormCard>
      </Shell>
    </Section>
  );
};

export default AdminBlogForm;
