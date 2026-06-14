// src/components/reviews/ReviewForm.jsx

import { useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "../components/Toast";

import {
  createCourseReview,
  createProductReview,
  resetReview,
} from "../reducers/review/reviewActions";

export default function ReviewForm({
  type = "course",
  courseId,
  productId,
  courseTitle,
  productTitle,
  onSuccess,
}) {
  const dispatch = useDispatch();
  const toast = useToast();

  const { loading } = useSelector((state) => state.review || {});

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

  const isProductReview = type === "product";
  const targetId = isProductReview ? productId : courseId;
  const targetTitle =
    productTitle || courseTitle || (isProductReview ? "this product" : "this course");

  const canSubmit = useMemo(() => {
    return (
      targetId &&
      Number(rating) >= 1 &&
      Number(rating) <= 5 &&
      comment.trim().length >= 10 &&
      comment.trim().length <= 1000
    );
  }, [targetId, rating, comment]);

  const handleClose = () => {
    setOpen(false);
    dispatch(resetReview());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit || loading) return;

    const payload = {
      rating: Number(rating),
      title: title.trim(),
      comment: comment.trim(),
    };

    console.log("REVIEW DEBUG:", {
  type,
  courseId,
  productId,
  targetId,
  courseTitle,
  productTitle,
});

    const result = isProductReview
      ? await dispatch(createProductReview({ productId, ...payload }))
      : await dispatch(createCourseReview({ courseId, ...payload }));

    toast?.push?.({
      title: result.success ? "Review Submitted" : "Review Failed",
      description: result.message,
      variant: result.success ? "success" : "error",
    });

    if (result.success) {
      setTitle("");
      setComment("");
      setRating(5);
      handleClose();
      onSuccess?.();
    }
  };

  return (
    <Wrap>
      <OpenButton type="button" onClick={() => setOpen(true)}>
        {isProductReview ? "Leave Product Review" : "Leave Course Review"}
      </OpenButton>

      {open ? (
        <Overlay>
          <Modal>
            <Close type="button" onClick={handleClose}>
              ×
            </Close>

            <Eyebrow>
              {isProductReview ? "Verified Product Review" : "Verified Student Review"}
            </Eyebrow>

            <Title>
              {isProductReview
                ? "Your experience helps the next customer buy with confidence."
                : "Your words help the next student choose wisely."}
            </Title>

            <Sub>
              Share your honest experience with <strong>{targetTitle}</strong>.
              Keep it useful, respectful, and clean.
            </Sub>

            <Form onSubmit={handleSubmit}>
              <Field>
                <Label>Your Rating</Label>
                <Stars>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarButton
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      $active={star <= rating}
                      aria-label={`${star} star rating`}
                    >
                      ★
                    </StarButton>
                  ))}
                </Stars>
              </Field>

              <Field>
                <Label>Review Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder={
                    isProductReview
                      ? "Example: Premium quality and worth it"
                      : "Example: This sharpened my discipline"
                  }
                />
              </Field>

              <Field>
                <Label>Your Review</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder={
                    isProductReview
                      ? "Tell future customers about the quality, fit, delivery, and value..."
                      : "Tell future students what improved, what felt valuable, and why this course helped you..."
                  }
                />
                <Hint>{comment.trim().length}/1000 characters</Hint>
              </Field>

              <SubmitButton type="submit" disabled={!canSubmit || loading}>
                {loading ? "Submitting..." : "Submit Review"}
              </SubmitButton>
            </Form>
          </Modal>
        </Overlay>
      ) : null}
    </Wrap>
  );
};

const pop = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Wrap = styled.div`
  width: 100%;
`;

const OpenButton = styled.button`
  width: 100%;
  min-height: 48px;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 16px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:hover {
    transform: translateY(-1px);
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  padding: 20px;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(12px);
`;

const Modal = styled.div`
  position: relative;
  width: min(620px, 100%);
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(22px, 4vw, 38px);
  background:
    radial-gradient(circle at 18% 0%, rgba(214, 182, 159, 0.2), transparent 36%),
    linear-gradient(145deg, ${({ theme }) => theme.colors.cocoa}, ${({ theme }) => theme.colors.black});
  border: 1px solid rgba(255, 249, 242, 0.14);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  animation: ${pop} 0.25s ease both;
`;

const Close = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  font-size: 24px;
`;

const Eyebrow = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0;
  max-width: 520px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.8rem, 4vw, 3.4rem);
  line-height: 0.95;
  font-weight: 950;
  letter-spacing: -0.06em;
`;

const Sub = styled.p`
  margin: 14px 0 22px;
  color: rgba(255, 249, 242, 0.74);
  font-size: 14px;
  line-height: 1.7;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Form = styled.form`
  display: grid;
  gap: 14px;
`;

const Field = styled.div`
  display: grid;
  gap: 7px;
`;

const Label = styled.label`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Stars = styled.div`
  display: flex;
  gap: 6px;
`;

const StarButton = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ $active }) => ($active ? "#ffd97a" : "rgba(255,249,242,0.25)")};
  font-size: 34px;
  line-height: 1;
  transition: transform 0.15s ease, color 0.15s ease;

  &:hover {
    transform: translateY(-2px) scale(1.08);
    color: #ffd97a;
  }
`;

const inputCss = `
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(255,249,242,0.16);
  background: rgba(0,0,0,0.42);
  color: #FFF9F2;
  outline: none;
  font-size: 14px;
`;

const Input = styled.input`
  ${inputCss}
  min-height: 48px;
  padding: 0 14px;

  &::placeholder {
    color: rgba(255, 249, 242, 0.38);
  }
`;

const Textarea = styled.textarea`
  ${inputCss}
  min-height: 132px;
  resize: vertical;
  padding: 14px;

  &::placeholder {
    color: rgba(255, 249, 242, 0.38);
  }
`;

const Hint = styled.small`
  color: rgba(255, 249, 242, 0.5);
  font-size: 11px;
`;

const SubmitButton = styled.button`
  min-height: 50px;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 18px;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;