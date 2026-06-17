// src/pages/SubscriptionFailed.jsx
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";

/* =========================
   Luxury Styles (theme-based)
========================= */
const floatIn = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 96px 16px 64px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(
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
    rgba(214, 182, 159, 0.8),
    rgba(255, 249, 242, 0.95)
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
  line-height: 1.65;
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

const ReasonBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.22);
`;

const ReasonTitle = styled.div`
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 6px;
`;

const ReasonText = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  font-size: 13px;
  line-height: 1.55;
`;

const Actions = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 16px;

  @media (min-width: 520px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Btn = styled.button`
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 12.5px;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    opacity 0.18s ease;

  &:active {
    transform: translateY(0);
  }
`;

const PrimaryBtn = styled(Btn)`
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45);
  }
`;

const OutlineBtn = styled(Btn)`
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.55);
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 249, 242, 0.06);
    border-color: rgba(214, 182, 159, 0.75);
  }
`;

const Hint = styled.p`
  margin: 12px 0 0;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.lightBrown};
  opacity: 0.95;
`;

function prettyReason(reason) {
  const r = String(reason || "").trim();
  if (!r) return "";

  const map = {
    missing_session: "Checkout session ID was missing.",
    not_paid: "Payment didn’t complete on Stripe.",
    processing_timeout: "Payment is confirmed but access is still processing.",
    server_error: "We hit a server error while confirming the session.",
  };

  return map[r] || r.replace(/_/g, " ");
}

function getKind(params) {
  const k = String(params.get("kind") || "")
    .toLowerCase()
    .trim();
  if (k === "cart") return "cart";
  if (k === "product" || k === "products") return "cart";
  return "membership";
}

export default function SubscriptionFailed() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const kind = getKind(params);
  const canceled = params.get("canceled") === "true";
  const reason = params.get("reason") || "";

  const badgeText =
    kind === "cart" ? "KnockoutCodes • Shop" : "Aurora45 • Elite Circle";
  const titleText =
    kind === "cart" ? "Checkout Canceled ❌" : "Payment Failed ❌";

  const message = useMemo(() => {
    if (canceled)
      return "You canceled the checkout. No worries — you can try again.";
    if (reason === "processing_timeout")
      return "Payment is confirmed, but your access is still being finalized. Please try again in a moment.";
    return "Your payment didn’t complete. Please try again.";
  }, [canceled, reason]);

  const extra = useMemo(() => prettyReason(reason), [reason]);

  const primaryPath = kind === "cart" ? "/cart" : "/memberships";
  const primaryLabel = kind === "cart" ? "Back to Cart" : "Back to Memberships";

  const secondaryPath = kind === "cart" ? "/products" : "/courses";
  const secondaryLabel = kind === "cart" ? "Go to Shop" : "Go to Courses";

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

          <Title>{titleText}</Title>
          <Subtitle>{message}</Subtitle>

          <Divider />

          {extra ? (
            <ReasonBox>
              <ReasonTitle>Details</ReasonTitle>
              <ReasonText>{extra}</ReasonText>
            </ReasonBox>
          ) : (
            <ReasonBox>
              <ReasonTitle>What you can do</ReasonTitle>
              <ReasonText>
                Try again, confirm your card details, or use a different payment
                method. If the issue persists, wait 30–60 seconds and retry
                (webhook delays happen).
              </ReasonText>
            </ReasonBox>
          )}

          <Actions>
            <PrimaryBtn
              type="button"
              onClick={() => navigate(primaryPath, { replace: true })}
            >
              {primaryLabel}
            </PrimaryBtn>

            <OutlineBtn
              type="button"
              onClick={() => navigate(secondaryPath, { replace: true })}
            >
              {secondaryLabel}
            </OutlineBtn>
          </Actions>

          <Hint>
            If you already paid and got “processing”, refresh in a moment — it
            can take a few seconds.
          </Hint>
        </Inner>
      </Card>
    </Page>
  );
}
