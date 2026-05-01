// src/pages/SubscriptionSuccess.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import axiosInstance from "../../utils/axiosInstance";

/* =========================
   Luxury Styles (theme-based)
========================= */
const floatIn = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const shimmer = keyframes`
  0%   { transform: translateX(-60%); opacity: 0; }
  15%  { opacity: 0.9; }
  50%  { transform: translateX(60%); opacity: 0.55; }
  100% { transform: translateX(60%); opacity: 0; }
`;

const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 96px 16px 64px;
  color: ${({ theme }) => theme.colors.white};
  background: radial-gradient(
      circle at 18% 10%,
      rgba(214, 182, 159, 0.18),
      transparent 55%
    ),
    radial-gradient(
      circle at 80% 90%,
      rgba(61, 38, 26, 0.55),
      ${({ theme }) => theme.colors.black} 70%
    );
`;

const Card = styled.section`
  width: 100%;
  max-width: 640px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    160deg,
    rgba(61, 38, 26, 0.78),
    rgba(47, 27, 18, 0.92)
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  overflow: hidden;
  position: relative;
  animation: ${floatIn} 0.45s ease both;
`;

const TopBar = styled.div`
  height: 6px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  opacity: 0.9;
`;

const Inner = styled.div`
  padding: 26px 22px 22px;

  @media (max-width: 520px) {
    padding: 22px 18px 18px;
  }
`;

const BadgeRow = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const BadgeDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
  box-shadow: 0 0 0 6px rgba(214, 182, 159, 0.12);
`;

const Title = styled.h1`
  margin: 0 0 10px;
  text-align: center;
  font-size: clamp(2rem, 2.6vw, 2.4rem);
  font-weight: 900;
  letter-spacing: 0.03em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  margin: 0;
  text-align: center;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  line-height: 1.6;
  font-size: 14px;
`;

const Divider = styled.div`
  margin: 18px 0 16px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(214, 182, 159, 0.35),
    transparent
  );
`;

const StatusBox = styled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 16px 16px 14px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.22);
  overflow: hidden;
`;

const StatusShimmer = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 249, 242, 0.12),
    transparent
  );
  transform: translateX(-60%);
  animation: ${shimmer} 1.35s ease-in-out infinite;
  pointer-events: none;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Spinner = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 2px solid rgba(255, 249, 242, 0.22);
  border-top-color: ${({ theme }) => theme.colors.lightBrown};
  animation: spin 0.9s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const StatusText = styled.div`
  flex: 1;
`;

const StatusHeadline = styled.div`
  font-weight: 900;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.ivory};
  margin-bottom: 4px;
  font-size: 14px;
`;

const StatusMsg = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  font-size: 13px;
  line-height: 1.5;
`;

const Tip = styled.p`
  margin: 12px 0 0;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.lightBrown};
  opacity: 0.95;
`;

function getKind(params) {
  const k = String(params.get("kind") || "").toLowerCase().trim();
  if (k === "cart") return "cart";
  if (k === "product" || k === "products") return "cart";
  return "membership";
}

export default function SubscriptionSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const kind = getKind(params);

  const [msg, setMsg] = useState("Verifying your payment…");
  const [headline, setHeadline] = useState("Payment verification");

  useEffect(() => {
    // ✅ CART / PRODUCT checkout success (reused page)
    if (kind === "cart") {
      setHeadline("Payment confirmed");
      setMsg("Success. Routing you back to the shop…");

      const t = setTimeout(() => {
        navigate("/products", { replace: true });
      }, 1200);

      return () => clearTimeout(t);
    }

    // ✅ MEMBERSHIP checkout success (existing flow)
    const sessionId = params.get("session_id");
    const courseIdFromUrl = params.get("courseId") || params.get("course_id") || "";

    if (!sessionId) {
      navigate("/subscription/failed?reason=missing_session", { replace: true });
      return;
    }

    let cancelled = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const run = async () => {
      try {
        setHeadline("Payment verification");
        setMsg("Verifying your payment…");

        for (let i = 0; i < 16; i++) {
          if (cancelled) return;

          const { data } = await axiosInstance.get(
            `/subscriptions/confirm?session_id=${encodeURIComponent(sessionId)}`
          );

          const paid =
            Boolean(data?.paid) ||
            data?.status === "paid" ||
            data?.paymentStatus === "paid";

          if (data?.success && !paid) {
            setHeadline("Processing");
            setMsg("Checkout received. Waiting for confirmation…");
            await sleep(1100);
            continue;
          }

          if (data?.success && paid) {
            setHeadline("Payment confirmed");

            const courseId = data?.courseId || data?.course_id || courseIdFromUrl;

            if (courseId) {
              setMsg("Payment confirmed. Routing you to your course player…");
              navigate(`/course-player/${courseId}`, { replace: true });
              return;
            }

            setMsg("Payment confirmed. Linking your course access…");
            await sleep(1100);
            continue;
          }

          setHeadline("Processing");
          setMsg("Finalizing your access…");
          await sleep(1100);
        }

        navigate("/subscription/failed?reason=processing_timeout", { replace: true });
      } catch (err) {
        console.error("SubscriptionSuccess confirm error:", err);
        navigate("/subscription/failed?reason=server_error", { replace: true });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [params, navigate, kind]);

  const badgeText = kind === "cart" ? "KnockoutCodes • Shop" : "Aurora45 • Elite Circle";
  const subtitleText =
    kind === "cart"
      ? "Your checkout completed successfully. We’re routing you back to the shop."
      : "Your checkout completed successfully. We’re finalizing access and routing you to your course player.";

  return (
    <Page>
      <Card>
        <TopBar />
        <Inner>
          <BadgeRow>
            <Badge>
              <BadgeDot />
              {badgeText}
            </Badge>
          </BadgeRow>

          <Title>Success ✅</Title>
          <Subtitle>{subtitleText}</Subtitle>

          <Divider />

          <StatusBox aria-live="polite" aria-busy="true">
            <StatusShimmer />
            <StatusRow>
              <Spinner />
              <StatusText>
                <StatusHeadline>{headline}</StatusHeadline>
                <StatusMsg>{msg}</StatusMsg>
              </StatusText>
            </StatusRow>
          </StatusBox>

          <Tip>
            If this takes more than a few seconds, it’s usually the webhook finishing up.
          </Tip>
        </Inner>
      </Card>
    </Page>
  );
}

