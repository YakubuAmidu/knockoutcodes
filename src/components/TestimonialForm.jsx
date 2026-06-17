import React, { useMemo, useState } from "react";
import styled from "styled-components";
import theme from "../Styles/theme";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "./Toast";

const initialForm = {
  name: "",
  message: "",
  rating: 5,
  imageUrl: "",
  website: "",
};

export default function TestimonialForm({ onSubmitted }) {
  const { showToast } = useToast();

  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const charsLeft = useMemo(() => 1200 - form.message.length, [form.message]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    const cleaned =
      typeof value === "string" ? value.replace(/\s{2,}/g, " ") : value;

    setForm((prev) => ({
      ...prev,
      [name]: name === "rating" ? Number(cleaned) : cleaned,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const cleanMessage = form.message.trim();
    const cleanName = form.name.trim();
    const cleanImageUrl = form.imageUrl.trim();

    const validImage =
      !cleanImageUrl || /^https?:\/\/.+|^\/?uploads\//i.test(cleanImageUrl);

    if (!validImage) {
      showToast("Please enter a valid image URL.", "warning");
      return;
    }

    if (!cleanName || cleanName.length < 2) {
      showToast("Please enter your display name.", "warning");
      return;
    }

    if (cleanName.length > 80) {
      showToast("Name must be at most 80 characters.", "warning");
      return;
    }

    if (!cleanMessage || cleanMessage.length < 3) {
      showToast("Please write at least 3 characters.", "warning");
      return;
    }

    if (cleanMessage.length > 1200) {
      showToast("Testimonial is too long.", "warning");
      return;
    }

    try {
      setSubmitting(true);

      await axiosInstance.post("/testimonials", {
        name: cleanName,
        message: cleanMessage,
        rating: Math.max(1, Math.min(5, Number(form.rating || 5))),
        imageUrl: cleanImageUrl,
        website: form.website,
      });

      showToast(
        "Testimonial submitted. Admin will approve it before it goes public.",
        "success",
      );

      setForm(initialForm);

      if (onSubmitted) onSubmitted();
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
          "Could not submit testimonial. Please login and try again.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormShell>
      <FormHeader>
        <span>SHARE YOUR RESULT</span>
        <h2>Your transformation could inspire the next fighter.</h2>
        <p>
          Submit your testimonial. Once approved by admin, it can appear on the
          public testimonial wall.
        </p>
      </FormHeader>

      <Form onSubmit={handleSubmit}>
        <HiddenInput
          type="text"
          name="website"
          value={form.website}
          onChange={handleChange}
          tabIndex="-1"
          autoComplete="off"
          inputMode="text"
          autoCorrect="off"
          spellCheck={false}
          aria-hidden="true"
        />

        <Grid>
          <Field>
            <Label>Your Display Name</Label>
            <Input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Example: Yakubu A."
              maxLength={80}
              disabled={submitting}
              required
            />
          </Field>

          <Field>
            <Label>Rating</Label>
            <Select
              name="rating"
              value={form.rating}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value={5}>★★★★★ 5 Stars</option>
              <option value={4}>★★★★ 4 Stars</option>
              <option value={3}>★★★ 3 Stars</option>
              <option value={2}>★★ 2 Stars</option>
              <option value={1}>★ 1 Star</option>
            </Select>
          </Field>
        </Grid>

        <Field>
          <Label>Image URL Optional</Label>
          <Input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            placeholder="Optional image link"
            maxLength={500}
            disabled={submitting}
          />
        </Field>

        <Field>
          <Label>Your Testimonial</Label>
          <Textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Tell people how KnockoutCodes helped you..."
            maxLength={1200}
            disabled={submitting}
            required
          />
          <Counter $danger={charsLeft < 80}>
            {charsLeft} characters left
          </Counter>
        </Field>

        <SubmitButton
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? "Submitting..." : "Submit Testimonial"}
        </SubmitButton>

        <Note>
          Protected submission: login required, spam filtered, admin approval
          required before public display.
        </Note>
      </Form>
    </FormShell>
  );
}

const FormShell = styled.div`
  margin: 0 0 2.5rem;
  padding: 1.5rem;
  border-radius: ${theme.radius.xl};
  background:
    linear-gradient(
      145deg,
      rgba(255, 249, 242, 0.1),
      rgba(255, 255, 255, 0.025)
    ),
    rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(214, 182, 159, 0.22);
  box-shadow: ${theme.shadow.glow};
`;

const FormHeader = styled.div`
  margin-bottom: 1.3rem;

  span {
    color: ${theme.colors.lightBrown};
    font-size: 0.75rem;
    font-weight: 900;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 0.55rem 0;
    color: ${theme.colors.ivory};
    font-size: clamp(1.55rem, 3vw, 2.6rem);
    line-height: 1;
  }

  p {
    margin: 0;
    color: rgba(255, 249, 242, 0.72);
    line-height: 1.6;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 1rem;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 0.45rem;
`;

const Label = styled.span`
  color: ${theme.colors.lightBrown};
  font-weight: 900;
  font-size: 0.8rem;
`;

const inputStyles = `
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.24);
  background: rgba(0, 0, 0, 0.55);
  color: ${theme.colors.ivory};
  border-radius: 16px;
  padding: 0.95rem 1rem;
  outline: none;
  font: inherit;

  &:focus {
    border-color: rgba(214, 182, 159, 0.7);
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.1);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  ${inputStyles}
`;

const Select = styled.select`
  ${inputStyles}
`;

const Textarea = styled.textarea`
  ${inputStyles}
  min-height: 145px;
  resize: vertical;
`;

const HiddenInput = styled.input`
  position: absolute;
  left: -9999px;
  opacity: 0;
`;

const Counter = styled.small`
  color: ${({ $danger }) =>
    $danger ? "#ffb4a8" : "rgba(255, 249, 242, 0.55)"};
  font-weight: 700;
`;

const SubmitButton = styled.button`
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 1rem 1.25rem;
  background: ${theme.colors.lightBrown};
  color: ${theme.colors.black};
  font-weight: 950;
  cursor: pointer;
  transition: 250ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 45px rgba(214, 182, 159, 0.22);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Note = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.58);
  font-size: 0.85rem;
  line-height: 1.5;
`;
