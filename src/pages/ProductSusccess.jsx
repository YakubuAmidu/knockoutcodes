import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";

import { CART_ACTIONS } from "../reducers/cart/cartActionTypes";
import { confirmProductCheckoutSession } from "../lib/apiClient";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ProductSuccess() {
  const [params] = useSearchParams();
  const dispatch = useDispatch();

  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Verifying your premium order…");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function verifyOrder() {
      const sessionId = params.get("session_id");

      if (!sessionId) {
        setStatus("error");
        setMessage("Missing checkout session. Please contact support.");
        return;
      }

      try {
        for (let attempt = 1; attempt <= 14; attempt += 1) {
          if (cancelled) return;

          const data = await confirmProductCheckoutSession(sessionId);

          if (data?.success && data?.paid && data?.orderReady) {
            dispatch({ type: CART_ACTIONS.CLEAR });

            setOrder(data.order);
            setStatus("success");
            setMessage("Order confirmed. Your purchase is officially locked in.");

            return;
          }

          setMessage(
            data?.message ||
              `Payment received. Preparing your order… (${attempt}/14)`
          );

          await sleep(1100);
        }

        if (!cancelled) {
          setStatus("processing");
          setMessage(
            "Payment is confirmed, but your order is still processing. Check My Orders shortly."
          );
        }
      } catch (err) {
        console.error("ProductSuccess verification error:", err);
        setStatus("error");
        setMessage(
          err?.response?.data?.message ||
            err?.message ||
            "We could not verify your order right now."
        );
      }
    }

    verifyOrder();

    return () => {
      cancelled = true;
    };
  }, [params, dispatch]);

  const isLoading = status === "checking";
  const isSuccess = status === "success";
  const isProcessing = status === "processing";
  const isError = status === "error";

  return (
    <Page>
      <GlowOne />
      <GlowTwo />

      <Shell>
        <Hero
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
        >
          <PremiumBadge>
            <LiveDot />
            KNOCKOUTCODES • PREMIUM ORDER STATUS
          </PremiumBadge>

          <Title>
            {isSuccess
              ? "Payment hit. Order locked."
              : isError
              ? "Order needs attention."
              : "Hold tight. We’re securing your order."}
          </Title>

          <Subtitle>
            {isSuccess
              ? "Your product purchase has been verified, protected, and recorded inside your account."
              : isProcessing
              ? "Stripe confirmed your payment. The system is still finishing the order record."
              : isError
              ? "Something blocked the final confirmation. Your payment may still be safe, but this needs a quick check."
              : "First we verify Stripe. Then we confirm MongoDB. Then we clear your cart only after your order is truly saved."}
          </Subtitle>

          <StatusCard>
            <TopLine />

            <StatusIconWrap $status={status}>
              {isLoading ? <Spinner /> : isSuccess ? "✓" : isError ? "!" : "…"}
            </StatusIconWrap>

            <StatusEyebrow>
              {isSuccess
                ? "Verified"
                : isError
                ? "Action Needed"
                : isProcessing
                ? "Processing"
                : "Secure Verification"}
            </StatusEyebrow>

            <StatusTitle>
              {isSuccess
                ? "Your order is complete."
                : isError
                ? "Verification did not complete."
                : isProcessing
                ? "Order is still processing."
                : "Checking your payment now."}
            </StatusTitle>

            <StatusMessage>{message}</StatusMessage>

            {order?._id ? (
              <OrderBox>
                <OrderLabel>Order ID</OrderLabel>
                <OrderValue>{order._id}</OrderValue>
              </OrderBox>
            ) : null}

            <ActionRow>
              <PrimaryButton to="/dashboard/orders">View My Orders</PrimaryButton>
              <GhostButton to="/products">Continue Shopping</GhostButton>
            </ActionRow>

            {isSuccess ? (
              <SmallNote>
                Your cart was cleared only after your paid order was confirmed.
              </SmallNote>
            ) : (
              <SmallNote>
                Do not refresh repeatedly. The system is checking safely.
              </SmallNote>
            )}
          </StatusCard>
        </Hero>

        <TrustGrid>
          <TrustCard>
            <TrustNumber>01</TrustNumber>
            <TrustTitle>Stripe Verified</TrustTitle>
            <TrustText>We confirm the checkout session is paid before showing success.</TrustText>
          </TrustCard>

          <TrustCard>
            <TrustNumber>02</TrustNumber>
            <TrustTitle>Order Protected</TrustTitle>
            <TrustText>Your order is checked against your logged-in account.</TrustText>
          </TrustCard>

          <TrustCard>
            <TrustNumber>03</TrustNumber>
            <TrustTitle>Cart Cleared Safely</TrustTitle>
            <TrustText>The cart clears only after MongoDB confirms the order exists.</TrustText>
          </TrustCard>
        </TrustGrid>
      </Shell>
    </Page>
  );
}

const shimmer = keyframes`
  0% { transform: translateX(-120%); opacity: 0; }
  35% { opacity: 1; }
  100% { transform: translateX(120%); opacity: 0; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.35); opacity: 1; }
`;

const Page = styled.main`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 104px 18px 86px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(circle at 18% 10%, rgba(214, 182, 159, 0.2), transparent 38%),
    radial-gradient(circle at 80% 18%, rgba(90, 56, 37, 0.34), transparent 42%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.darkBrown} 0%, ${({ theme }) => theme.colors.black} 82%);
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
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled(motion.section)`
  display: grid;
  place-items: center;
  text-align: center;
`;

const PremiumBadge = styled.div`
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
  max-width: 980px;
  font-size: clamp(36px, 6vw, 86px);
  line-height: 0.92;
  letter-spacing: -0.065em;
  color: ${({ theme }) => theme.colors.ivory};
  text-shadow: 0 24px 54px rgba(0, 0, 0, 0.36);
`;

const Subtitle = styled.p`
  margin: 0 auto;
  max-width: 760px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.88;
  line-height: 1.75;
  font-size: clamp(14px, 1.5vw, 17px);
`;

const StatusCard = styled.div`
  position: relative;
  width: 100%;
  max-width: 720px;
  margin-top: 28px;
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035)),
    rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.13);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  overflow: hidden;
  backdrop-filter: blur(18px);
`;

const TopLine = styled.div`
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  overflow: hidden;
  background: rgba(214, 182, 159, 0.22);

  &::after {
    content: "";
    display: block;
    width: 45%;
    height: 100%;
    background: linear-gradient(90deg, transparent, ${({ theme }) => theme.colors.lightBrown}, transparent);
    animation: ${shimmer} 1.5s ease-in-out infinite;
  }
`;

const StatusIconWrap = styled.div`
  width: 76px;
  height: 76px;
  margin: 6px auto 14px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: ${({ $status }) =>
    $status === "success"
      ? "rgba(214, 182, 159, 0.22)"
      : $status === "error"
      ? "rgba(255, 255, 255, 0.08)"
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

const StatusEyebrow = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const StatusTitle = styled.h2`
  margin: 8px 0 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(22px, 3vw, 34px);
  letter-spacing: -0.035em;
`;

const StatusMessage = styled.p`
  margin: 0 auto;
  max-width: 58ch;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
  line-height: 1.65;
`;

const OrderBox = styled.div`
  margin: 18px auto 0;
  max-width: 520px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(214, 182, 159, 0.18);
  text-align: left;
`;

const OrderLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const OrderValue = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  word-break: break-all;
  font-weight: 800;
`;

const ActionRow = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const PrimaryButton = styled(Link)`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(90deg, ${({ theme }) => theme.colors.lightBrown}, ${({ theme }) => theme.colors.ivory});
  color: ${({ theme }) => theme.colors.black};
  text-decoration: none;
  font-weight: 950;
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const GhostButton = styled(Link)`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 46px;
  padding: 0 18px;
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

const TrustGrid = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const TrustCard = styled.div`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  backdrop-filter: blur(14px);
`;

const TrustNumber = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.16em;
`;

const TrustTitle = styled.h3`
  margin: 8px 0 6px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 16px;
`;

const TrustText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 13px;
  line-height: 1.55;
`;