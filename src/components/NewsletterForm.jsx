import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import axiosInstance from "../utils/axiosInstance";
import { useToast } from "./Toast";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function NewsletterForm() {
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    website: "", // honeypot
    company: "", // honeypot
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const cleanEmail = useMemo(
    () => form.email.trim().toLowerCase(),
    [form.email]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (status.text) setStatus({ type: "", text: "" });
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (loading) return;

    if (form.website || form.company) {
      setStatus({
        type: "success",
        text: "You are locked in.",
      });
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      const message = "Please enter a real email address.";

      setStatus({ type: "error", text: message });

      toast.push({
        title: "Invalid email",
        description: message,
        variant: "error",
      });

      return;
    }

    setLoading(true);
    setStatus({ type: "info", text: "Securing your spot..." });

    try {
      try {
        await axiosInstance.get("/auth/csrf");
      } catch {
        // silent fail, axiosInstance may already have token/cookie
      }

      const res = await axiosInstance.post("/newsletters", {
        name: form.name.trim().slice(0, 80),
        email: cleanEmail,
        topic: "KnockoutCodes Updates",
        source: "newsletter-form",
        website: form.website,
        company: form.company,
      });

      const message =
        res?.data?.message ||
        "You’re in. The next elite drop is coming to your inbox.";

      setStatus({
        type: "success",
        text: message,
      });

      toast.push({
        title: "Subscribed!",
        description: message,
        variant: "success",
      });

      setForm({
        name: "",
        email: "",
        website: "",
        company: "",
      });
    } catch (error) {
      const code = error?.response?.status;

      const message =
        code === 409
          ? "You are already subscribed."
          : code === 403
          ? "Admin accounts cannot subscribe to the newsletter."
          : code === 429
          ? "Too many attempts. Please wait and try again."
          : error?.response?.data?.message ||
            "Please try again in a moment.";

      setStatus({
        type: code === 409 ? "info" : "error",
        text: message,
      });

      toast.push({
        title: code === 409 ? "Already subscribed" : "Subscription failed",
        description: message,
        variant: code === 409 ? "info" : "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Wrap>
      <Card
        as={motion.div}
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        <Kicker>Private Drops • Elite Updates • First Access</Kicker>

        <Title>Join the list before the next champion drop.</Title>

        <Text>
          Get premium boxing lessons, product drops, membership updates, and
          exclusive KnockoutCodes moves before everyone else.
        </Text>

        <Form onSubmit={handleSubmit}>
          <HiddenInput
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={handleChange}
            aria-hidden="true"
          />

          <HiddenInput
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={form.company}
            onChange={handleChange}
            aria-hidden="true"
          />

          <InputGroup>
            <Label htmlFor="newsletter-name">Name</Label>
            <Input
              id="newsletter-name"
              name="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              maxLength={80}
              onChange={handleChange}
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="newsletter-email">Email</Label>
            <Input
              id="newsletter-email"
              name="email"
              type="email"
              placeholder="Your best email"
              value={form.email}
              maxLength={160}
              required
              onChange={handleChange}
            />
          </InputGroup>

          <Button type="submit" disabled={loading}>
            {loading ? "Joining..." : "Join The Elite List"}
          </Button>
        </Form>

        {status.text ? (
          <Status $type={status.type} role="status">
            {status.text}
          </Status>
        ) : null}

        <FinePrint>
          No spam. Only premium updates, early access, and serious growth moves.
        </FinePrint>
      </Card>
    </Wrap>
  );
}

const Wrap = styled.section`
  padding: 80px 18px;
  background:
    radial-gradient(circle at top, rgba(214, 182, 159, 0.18), transparent 55%),
    radial-gradient(circle at bottom right, rgba(90, 56, 37, 0.28), transparent 50%),
    #050505;
  color: #fff;
`;

const Card = styled.div`
  max-width: 860px;
  margin: 0 auto;
  padding: clamp(24px, 5vw, 42px);
  border-radius: 32px;
  background:
    linear-gradient(145deg, rgba(214, 182, 159, 0.14), rgba(0, 0, 0, 0.9)),
    rgba(10, 10, 10, 0.94);
  border: 1px solid rgba(214, 182, 159, 0.3);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(18px);
`;

const Kicker = styled.p`
  color: #d6b69f;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 12px;
`;

const Title = styled.h2`
  font-size: clamp(34px, 6vw, 62px);
  line-height: 0.98;
  margin: 0 0 16px;
  max-width: 760px;
`;

const Text = styled.p`
  color: rgba(255, 255, 255, 0.78);
  margin: 0 0 28px;
  line-height: 1.65;
  max-width: 680px;
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

const InputGroup = styled.div`
  display: grid;
  gap: 7px;
`;

const Label = styled.label`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 900;
`;

const Input = styled.input`
  width: 100%;
  padding: 15px 18px;
  border-radius: 999px;
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.52);
  }

  &:focus {
    border-color: #d6b69f;
    box-shadow: 0 0 0 2px rgba(214, 182, 159, 0.22);
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  left: -9999px;
  opacity: 0;
  height: 0;
  width: 0;
`;

const Button = styled.button`
  border: none;
  border-radius: 999px;
  padding: 15px 24px;
  min-height: 50px;
  cursor: pointer;
  font-weight: 950;
  text-transform: uppercase;
  background: linear-gradient(135deg, #d6b69f, #fff7ed);
  color: #050505;
  white-space: nowrap;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
`;

const Status = styled.div`
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 18px;
  font-weight: 800;
  background: ${({ $type }) =>
    $type === "error"
      ? "rgba(239, 68, 68, 0.12)"
      : $type === "success"
      ? "rgba(34, 197, 94, 0.12)"
      : "rgba(214, 182, 159, 0.12)"};
  color: ${({ $type }) =>
    $type === "error"
      ? "#fecaca"
      : $type === "success"
      ? "#bbf7d0"
      : "#fff7ed"};
  border: 1px solid
    ${({ $type }) =>
      $type === "error"
        ? "rgba(239, 68, 68, 0.35)"
        : $type === "success"
        ? "rgba(34, 197, 94, 0.35)"
        : "rgba(214, 182, 159, 0.35)"};
`;

const FinePrint = styled.p`
  margin: 16px 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 13px;
`;