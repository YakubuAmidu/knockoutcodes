import { Link, useSearchParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";

export default function ProductFailed() {
  const [params] = useSearchParams();

  const canceled = params.get("canceled") === "true";
  const sessionId = params.get("session_id");

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
          KNOCKOUTCODES • CHECKOUT STATUS
        </Badge>

        <Title>
          {canceled ? "Checkout cancelled." : "Payment did not complete."}
        </Title>

        <Subtitle>
          {canceled
            ? "No worries. Your cart is still safe. You can return and finish whenever you are ready."
            : sessionId
? "Stripe started the checkout process, but the payment did not fully complete or confirm."
: "Something stopped the payment from completing. Your order was not confirmed yet."}
        </Subtitle>

        <Card>
          <Icon>!</Icon>

          <CardTitle>
            {canceled ? "Your order was not placed." : "Your payment needs attention."}
          </CardTitle>

          <CardText>
  We only create a confirmed order after Stripe verifies payment and
  MongoDB safely stores the order.

  {sessionId ? (
    <>
      {" "}
      A checkout session was detected, but payment confirmation was not
      completed yet.
    </>
  ) : null}

  {" "}
  If money was charged but this page appeared, check My Orders first
  before retrying checkout.
</CardText>

          <Actions>
            <PrimaryLink to="/cart">Return To Cart</PrimaryLink>
            {sessionId ? (
  <PrimaryLink to="/checkout/recover">
    Recover Checkout
  </PrimaryLink>
) : null}
            <GhostLink to="/products">Continue Shopping</GhostLink>
            <GhostLink to="/dashboard/my-orders">Check My Orders</GhostLink>
          </Actions>
        </Card>
      </Shell>
    </Page>
  );
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: .85; }
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
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035)),
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
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(214, 182, 159, 0.28);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 34px;
  font-weight: 950;
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

  &:nth-child(2) {
    background: rgba(214, 182, 159, 0.14);
    color: ${({ theme }) => theme.colors.ivory};
    border: 1px solid rgba(214, 182, 159, 0.22);
  }
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