import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import { confirmCheckoutSession, getMySubscription } from "../lib/apiClient";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSubscriptionPayload(payload) {
  return (
    payload?.subscription ||
    payload?.data?.subscription ||
    payload?.data ||
    payload ||
    null
  );
}

export default function MembershipSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Verifying your premium membership…");
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function verifyMembership() {
      if (!sessionId) {
        setStatus("error");
        setMessage("Missing checkout session. Please contact support.");
        return;
      }

      try {
        const confirmed = await confirmCheckoutSession(sessionId, {
          signal: controller.signal,
        });

        const confirmedSub = getSubscriptionPayload(confirmed);

        if (!cancelled && confirmedSub) {
          setSubscription(confirmedSub);
        }

        for (let attempt = 1; attempt <= 12; attempt += 1) {
          if (cancelled) return;

          const data = await getMySubscription({ signal: controller.signal });
          const activeSub = data?.data || data?.subscription || data;

          if (
            activeSub?.isActive ||
            ["active", "trialing"].includes(
              String(activeSub?.status || "").toLowerCase(),
            )
          ) {
            setSubscription(activeSub);
            setStatus("success");
            setMessage(
              "Membership confirmed. Your premium access is now unlocked.",
            );
            return;
          }

          setMessage(
            `Payment confirmed. Unlocking your membership… (${attempt}/12)`,
          );
          await sleep(1100);
        }

        setStatus("processing");
        setMessage(
          "Stripe confirmed your payment, but your membership is still syncing. Check your dashboard shortly.",
        );
      } catch (err) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;

        setStatus("error");
        setMessage(
          err?.response?.data?.message ||
            err?.message ||
            "We could not verify your membership right now.",
        );
      }
    }

    verifyMembership();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sessionId]);

  const isSuccess = status === "success";
  const isError = status === "error";
  const isProcessing = status === "processing";
  const isLoading = status === "checking";

  return (
    <Page>
      <GlowOne />
      <GlowTwo />

      <Shell
        as={motion.section}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
      >
        <Badge>
          <LiveDot />
          KNOCKOUTCODES • MEMBERSHIP ACCESS
        </Badge>

        <Title>
          {isSuccess
            ? "Access unlocked. You’re officially inside."
            : isError
              ? "Membership needs attention."
              : "Hold tight. We’re unlocking your access."}
        </Title>

        <Subtitle>
          {isSuccess
            ? "Your payment was verified and your premium membership is now active."
            : isProcessing
              ? "Stripe confirmed payment. Your account access is still syncing."
              : isError
                ? "Something blocked the final membership confirmation."
                : "First we verify Stripe. Then we confirm your membership. Then we unlock your premium access."}
        </Subtitle>

        <Card>
          <Icon $status={status}>
            {isLoading ? <Spinner /> : isSuccess ? "✓" : isError ? "!" : "…"}
          </Icon>

          <CardTitle>
            {isSuccess
              ? "Your membership is active."
              : isError
                ? "Verification did not complete."
                : isProcessing
                  ? "Membership is still processing."
                  : "Checking your membership now."}
          </CardTitle>

          <CardText>{message}</CardText>

          {subscription?._id ? (
            <MembershipBox>
              <BoxLabel>Membership ID</BoxLabel>
              <BoxValue>{subscription._id}</BoxValue>
            </MembershipBox>
          ) : null}

          <Actions>
            <PrimaryLink to="/dashboard">Enter Dashboard</PrimaryLink>
            <GhostLink to="/courses">Browse Courses</GhostLink>
            <GhostLink to="/memberships">View Memberships</GhostLink>
          </Actions>

          <SmallNote>
            {isSuccess
              ? "Your access is protected and connected to your account."
              : "Do not refresh repeatedly. The system is checking safely."}
          </SmallNote>
        </Card>
      </Shell>
    </Page>
  );
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: .85; }
  50% { transform: scale(1.35); opacity: 1; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.main`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 104px 18px 86px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(
      circle at 18% 10%,
      rgba(214, 182, 159, 0.2),
      transparent 38%
    ),
    radial-gradient(circle at 80% 18%, rgba(90, 56, 37, 0.34), transparent 42%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.darkBrown} 0%,
      ${({ theme }) => theme.colors.black} 82%
    );
`;

const GlowOne = styled.div`
  position: absolute;
  width: 440px;
  height: 440px;
  border-radius: 999px;
  left: -180px;
  top: 120px;
  background: rgba(214, 182, 159, 0.14);
  filter: blur(18px);
`;

const GlowTwo = styled.div`
  position: absolute;
  width: 380px;
  height: 380px;
  border-radius: 999px;
  right: -160px;
  bottom: 60px;
  background: rgba(90, 56, 37, 0.3);
  filter: blur(20px);
`;

const Shell = styled.section`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(214, 182, 159, 0.26);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;
`;

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
  box-shadow: 0 0 0 6px rgba(214, 182, 159, 0.13);
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

const Title = styled.h1`
  margin: 18px 0 12px;
  font-size: clamp(38px, 6vw, 82px);
  line-height: 0.92;
  letter-spacing: -0.065em;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Subtitle = styled.p`
  margin: 0 auto;
  max-width: 650px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
  line-height: 1.75;
`;

const Card = styled.div`
  margin-top: 26px;
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.075),
      rgba(255, 255, 255, 0.035)
    ),
    rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.13);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
`;

const Icon = styled.div`
  width: 76px;
  height: 76px;
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: ${({ $status }) =>
    $status === "success"
      ? "rgba(214, 182, 159, 0.22)"
      : "rgba(0, 0, 0, 0.35)"};
  border: 1px solid rgba(214, 182, 159, 0.28);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 34px;
  font-weight: 950;
`;

const Spinner = styled.span`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid rgba(214, 182, 159, 0.22);
  border-top-color: ${({ theme }) => theme.colors.lightBrown};
  animation: ${spin} 0.85s linear infinite;
`;

const CardTitle = styled.h2`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(22px, 3vw, 34px);
`;

const CardText = styled.p`
  margin: 0 auto;
  max-width: 58ch;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;
  line-height: 1.65;
`;

const MembershipBox = styled.div`
  margin: 18px auto 0;
  max-width: 520px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(214, 182, 159, 0.18);
  text-align: left;
`;

const BoxLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const BoxValue = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  word-break: break-all;
  font-weight: 800;
`;

const Actions = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const PrimaryLink = styled(Link)`
  min-height: 46px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  text-decoration: none;
  font-weight: 950;
`;

const GhostLink = styled(Link)`
  min-height: 46px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.ivory};
  text-decoration: none;
  font-weight: 950;
  border: 1px solid rgba(255, 249, 242, 0.14);
`;

const SmallNote = styled.p`
  margin: 14px 0 0;
  color: ${({ theme }) => theme.colors.lightBrown};
  opacity: 0.9;
  font-size: 12px;
`;
