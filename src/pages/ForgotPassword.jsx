// src/pages/ForgotPassword.jsx

import React from "react";
import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useDispatch, useSelector } from "react-redux";

import { useToast } from "../components/Toast";
import {
  submitForgotPassword,
  resetForgotPassword,
} from "../reducers/forgotPassword/forgotPasswordActions";

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const toast = useToast();

  const { loading, success, message, error, emailSentTo } = useSelector(
    (state) => state.forgotPassword,
  );

  const [email, setEmail] = React.useState("");
  const submitLockRef = React.useRef(false);

  React.useEffect(() => {
    return () => resetForgotPassword(dispatch);
  }, [dispatch]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (submitLockRef.current || loading) return;

    submitLockRef.current = true;

    const result = await submitForgotPassword(dispatch, email);

    if (result.ok) {
      toast?.push?.({
        title: "Check your email",
        description:
          "If that email exists, we sent a secure password reset link.",
        variant: "success",
      });
    } else {
      toast?.push?.({
        title: "Reset failed",
        description: result.error || "Please try again.",
        variant: "error",
      });
    }

    submitLockRef.current = false;
  }

  const cleanEmail = normalizeEmail(email);
  const canSubmit = !!cleanEmail && !loading;

  return (
    <Wrap>
      <Glow />

      <Shell>
        <HeroPanel>
          <Kicker>Secure Recovery</Kicker>

          <HeroTitle>Reset your access without losing your momentum.</HeroTitle>

          <HeroText>
            Enter your account email and we’ll send a secure password reset
            link. For your protection, we never reveal whether an email exists.
          </HeroText>

          <SecurityList>
            <li>Secure reset request</li>
            <li>Email-based verification</li>
            <li>No account details exposed</li>
          </SecurityList>
        </HeroPanel>

        <Card>
          <Form onSubmit={handleSubmit} noValidate>
            <Top>
              <MiniBadge>Forgot Password</MiniBadge>
              <Title>Recover your account.</Title>
              <Text>
                Type your email below. If it matches an account, you’ll receive
                instructions to create a new password.
              </Text>
            </Top>

            {error ? <ErrorBox role="alert">{error}</ErrorBox> : null}

            {success ? (
              <SuccessBox role="status">
                <strong>Email sent.</strong>
                <span>
                  {message ||
                    "If this email exists, a password reset link has been sent."}
                </span>
                {emailSentTo ? <small>{emailSentTo}</small> : null}
              </SuccessBox>
            ) : null}

            <Field>
              <label htmlFor="forgot-email">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                placeholder="you@domain.com"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </Field>

            <Button type="submit" disabled={!canSubmit}>
              {loading ? "Sending secure link..." : "Send Reset Link"}
            </Button>

            <Meta>
              <span>Remembered your password?</span>
              <StyledLink to="/login">Back to login</StyledLink>
            </Meta>

            <Hint>
              For security, the same response may show even if no account exists
              with that email.
            </Hint>
          </Form>
        </Card>
      </Shell>
    </Wrap>
  );
}

/* ================= styles ================= */

const floatGlow = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.68; }
  50% { transform: translate3d(-18px, 16px, 0) scale(1.07); opacity: 1; }
`;

const Wrap = styled.section`
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 52px 24px;

  background:
    radial-gradient(
      900px 500px at 8% 0%,
      rgba(214, 182, 159, 0.22),
      transparent 58%
    ),
    radial-gradient(
      720px 420px at 95% 8%,
      rgba(255, 249, 242, 0.12),
      transparent 62%
    ),
    linear-gradient(
      145deg,
      ${({ theme }) => theme.colors.black} 0%,
      ${({ theme }) => theme.colors.darkBrown} 42%,
      ${({ theme }) => theme.colors.cocoa} 100%
    );

  @media (max-width: 680px) {
    padding: 34px 16px;
  }
`;

const Glow = styled.div`
  position: absolute;
  width: 360px;
  height: 360px;
  right: -120px;
  bottom: -120px;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.16);
  filter: blur(38px);
  animation: ${floatGlow} 7s ease-in-out infinite;
  z-index: -1;
`;

const Shell = styled.div`
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: 1fr 520px;
  gap: 26px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    max-width: 620px;
  }
`;

const HeroPanel = styled.aside`
  position: relative;
  overflow: hidden;
  min-height: 560px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 38px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.82)),
    radial-gradient(
      circle at 20% 10%,
      rgba(214, 182, 159, 0.28),
      transparent 42%
    ),
    linear-gradient(135deg, rgba(90, 56, 37, 0.78), rgba(0, 0, 0, 0.92));

  border: 1px solid rgba(214, 182, 159, 0.2);
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &::before {
    content: "KC";
    position: absolute;
    top: 34px;
    right: 34px;
    font-size: 8rem;
    font-weight: 950;
    letter-spacing: -0.08em;
    color: rgba(255, 255, 255, 0.035);
  }

  @media (max-width: 560px) {
    display: none;
  }
`;

const Kicker = styled.div`
  width: fit-content;
  margin-bottom: 16px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.34);
  background: rgba(0, 0, 0, 0.26);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const HeroTitle = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(2rem, 5vw, 4.15rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
`;

const HeroText = styled.p`
  max-width: 620px;
  margin: 18px 0 0;
  color: rgba(255, 249, 242, 0.74);
  font-size: 1rem;
  line-height: 1.75;
`;

const SecurityList = styled.ul`
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 28px 0 0;
  list-style: none;

  li {
    padding: 13px 14px;
    border-radius: ${({ theme }) => theme.radius.lg};
    border: 1px solid rgba(214, 182, 159, 0.14);
    background: rgba(0, 0, 0, 0.28);
    color: rgba(255, 249, 242, 0.78);
    font-weight: 800;
  }
`;

const Card = styled.div`
  width: 100%;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.xl};
  border: 1px solid rgba(214, 182, 159, 0.18);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.035)
  );
  backdrop-filter: blur(18px);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Form = styled.form`
  display: grid;
  gap: 18px;
  min-height: 100%;
  padding: 30px;
  border-radius: calc(${({ theme }) => theme.radius.xl} - 8px);
  background:
    radial-gradient(
      circle at 0% 0%,
      rgba(214, 182, 159, 0.16),
      transparent 34%
    ),
    linear-gradient(180deg, rgba(0, 0, 0, 0.52), rgba(0, 0, 0, 0.28));
  border: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 520px) {
    padding: 22px;
  }
`;

const Top = styled.div`
  display: grid;
  gap: 8px;
`;

const MiniBadge = styled.span`
  width: fit-content;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.3);
  background: rgba(214, 182, 159, 0.1);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.15rem);
  letter-spacing: -0.06em;
  font-weight: 950;
  line-height: 0.95;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  color: transparent;
`;

const Text = styled.p`
  margin: 0 0 4px;
  font-size: 0.92rem;
  line-height: 1.65;
  color: rgba(255, 249, 242, 0.72);
`;

const Field = styled.div`
  display: grid;
  gap: 10px;

  label {
    font-size: 0.78rem;
    font-weight: 850;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 249, 242, 0.82);
  }

  input {
    width: 100%;
    height: 52px;
    border-radius: ${({ theme }) => theme.radius.md};
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(0, 0, 0, 0.34);
    color: ${({ theme }) => theme.colors.ivory};
    padding: 0 14px;
    outline: none;

    &:focus {
      border-color: ${({ theme }) => theme.colors.lightBrown};
      box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.18);
    }

    &:disabled {
      opacity: 0.65;
    }
  }
`;

const Button = styled.button`
  height: 54px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: radial-gradient(
    120% 160% at 10% 0%,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown} 42%,
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const ErrorBox = styled.div`
  background: rgba(255, 74, 74, 0.12);
  border: 1px solid rgba(255, 74, 74, 0.35);
  color: #ffdede;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
`;

const SuccessBox = styled.div`
  display: grid;
  gap: 5px;
  background: rgba(67, 255, 161, 0.1);
  border: 1px solid rgba(67, 255, 161, 0.28);
  color: #d9ffe9;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.md};

  strong {
    font-size: 0.9rem;
  }

  span,
  small {
    color: rgba(255, 255, 255, 0.76);
    line-height: 1.5;
  }
`;

const Meta = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  color: rgba(255, 249, 242, 0.76);
`;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.colors.lightBrown};
  text-decoration: none;
  font-weight: 850;

  &:hover {
    text-decoration: underline;
  }
`;

const Hint = styled.p`
  margin: 4px 0 0;
  text-align: center;
  font-size: 0.76rem;
  line-height: 1.6;
  color: rgba(255, 249, 242, 0.58);
`;
