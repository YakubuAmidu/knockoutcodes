import { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

export default function VerifyEmail() {
  const { token } = useParams();
  const toast = useToast();
  const hasVerified = useRef(false);

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verifyEmail = async () => {
      try {
        if (!token) {
          setStatus("error");
          setMessage("Verification token is missing.");
          toast?.error?.("Verification token is missing.");
          return;
        }

        const { data } = await axiosInstance.get(`/auth/verify-email/${token}`);

        setStatus("success");
        setMessage(data?.message || "Email verified successfully.");
        toast?.success?.("Email verified successfully. You can now log in.");
      } catch (error) {
        const errorMessage =
          error?.response?.data?.message ||
          "This verification link is invalid, expired, or already used. If you already verified your email, please log in.";

        setStatus("error");
        setMessage(errorMessage);
        toast?.error?.(errorMessage);
      }
    };

    verifyEmail();
  }, [token, toast]);

  return (
    <Page>
      <Card
        as={motion.div}
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
      >
        <Eyebrow>KnockoutCodes Security</Eyebrow>

        <Icon $status={status}>
          {status === "loading" ? "…" : status === "success" ? "✓" : "!"}
        </Icon>

        <Title>
          {status === "loading"
            ? "Verifying Email"
            : status === "success"
              ? "Email Verified"
              : "Verification Failed"}
        </Title>

        <Text>{message}</Text>

        {status === "success" ? (
          <ButtonLink to="/login">Go to Login</ButtonLink>
        ) : status === "error" ? (
          <ButtonLink to="/login">Go to Login</ButtonLink>
        ) : (
          <LoadingText>Please wait...</LoadingText>
        )}
      </Card>
    </Page>
  );
}

const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 30px;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      transparent 34%
    ),
    linear-gradient(135deg, #000000 0%, #2f1b12 50%, #000000 100%);
  color: #ffffff;
`;

const Card = styled.section`
  width: min(94vw, 560px);
  text-align: center;
  border-radius: 28px;
  padding: 42px 30px;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.09),
      rgba(214, 182, 159, 0.06)
    ),
    rgba(61, 38, 26, 0.82);
  border: 1px solid rgba(214, 182, 159, 0.22);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 18px 44px rgba(0, 0, 0, 0.38);
`;

const Eyebrow = styled.p`
  margin: 0 0 18px;
  color: #d6b69f;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const Icon = styled.div`
  width: 86px;
  height: 86px;
  margin: 0 auto 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${({ $status }) =>
    $status === "success" ? "#d6b69f" : "rgba(255,255,255,0.08)"};
  color: ${({ $status }) => ($status === "success" ? "#2f1b12" : "#fff9f2")};
  border: 1px solid rgba(214, 182, 159, 0.28);
  font-size: 2.4rem;
  font-weight: 900;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.4rem);
  line-height: 1;
`;

const Text = styled.p`
  max-width: 440px;
  margin: 18px auto 0;
  color: rgba(255, 249, 242, 0.78);
  line-height: 1.7;
`;

const ButtonLink = styled(Link)`
  display: inline-flex;
  margin-top: 28px;
  text-decoration: none;
  border-radius: 999px;
  padding: 14px 24px;
  background: #d6b69f;
  color: #2f1b12;
  font-weight: 900;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
`;

const LoadingText = styled.p`
  margin-top: 26px;
  color: #d6b69f;
  font-weight: 800;
`;
