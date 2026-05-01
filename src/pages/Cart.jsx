// src/pages/Cart.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast";
import { createProductCheckoutSession } from "../lib/apiClient";
import { CHECKOUT_ACTIONS } from "../reducers/checkout/checkoutActionTypes";

// redux
import { useDispatch, useSelector } from "react-redux";
import { CART_ACTIONS } from "../reducers/cart/cartActionTypes";

export default function Cart() {
  const toast = useToast();
  const dispatch = useDispatch();

  // ✅ single source of truth
  const items = useSelector((state) => state?.cart?.items || []);

  // ✅ local UI state
  const [redirecting, setRedirecting] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
    const itemCount = items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    return { subtotal, itemCount };
  }, [items]);

  function pushToast(payload) {
    toast?.push?.(payload);
  }

  function clampQty(q) {
    const n = Number(q);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.floor(n));
  }

  function updateQty(cartItemId, nextQty) {
    const qty = clampQty(nextQty);

    dispatch({
      type: CART_ACTIONS.UPDATE_QTY,
      payload: { cartItemId, qty },
    });

    pushToast({
      title: "Success",
      description: "Cart updated ✅",
      variant: "success",
    });
  }

  function removeItem(cartItemId) {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: cartItemId });

    pushToast({
      title: "Success",
      description: "Removed from cart ✅",
      variant: "success",
    });
  }

  function clearCart() {
    dispatch({ type: CART_ACTIONS.CLEAR });

    pushToast({
      title: "Success",
      description: "Cart cleared ✅",
      variant: "success",
    });
  }

  async function checkout() {
    // ✅ prevent double clicks
    if (redirecting) return;

    // ✅ validate first (DO NOT set redirecting yet)
    if (!items.length) {
      pushToast({
        title: "Error",
        description: "Your cart is empty.",
        variant: "error",
      });
      return;
    }

    // Build items for backend (do NOT send prices)
    const payloadItems = items.map((it) => ({
      productId: it.productId,
      qty: clampQty(it.qty),
    }));

    // guard bad ids
    const hasBad = payloadItems.some((x) => !x.productId);
    if (hasBad) {
      pushToast({
        title: "Error",
        description: "One or more cart items are missing productId.",
        variant: "error",
      });
      return;
    }

    try {
      setRedirecting(true);
      dispatch({ type: CHECKOUT_ACTIONS.START });

      const data = await createProductCheckoutSession(payloadItems);

      dispatch({ type: CHECKOUT_ACTIONS.SUCCESS, payload: data });

      // ✅ Stripe redirect
      window.location.href = data.url;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Checkout failed. Please try again.";

      dispatch({ type: CHECKOUT_ACTIONS.ERROR, payload: msg });

      pushToast({
        title: "Checkout failed",
        description: msg,
        variant: "error",
      });

      setRedirecting(false);
    }
  }

  return (
    <Page>
      <Inner>
        <Top
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Badge>KO • CART</Badge>
          <Title>
            ⚡ <span>LOCK IN</span> YOUR GEAR — THEN GO WORK.
          </Title>
          <Sub>
            Review your items, adjust size/color quantity, and check out when
            you’re ready.
          </Sub>

          <TopActions>
            <BackLink to="/products">← Continue Shopping</BackLink>

            <GhostBtn type="button" onClick={clearCart} disabled={!items.length || redirecting}>
              Clear Cart
            </GhostBtn>
          </TopActions>
        </Top>

        <Grid>
          <LeftCard
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <CardHead>
              <CardTitle>Items</CardTitle>
              <Small>
                {totals.itemCount} item{totals.itemCount === 1 ? "" : "s"}
              </Small>
            </CardHead>

            {!items.length ? (
              <Empty>
                <EmptyTitle>Your cart is empty.</EmptyTitle>
                <EmptySub>Pick your gear and come back here.</EmptySub>
                <EmptyBtn to="/products">Shop KnockoutCodes →</EmptyBtn>
              </Empty>
            ) : (
              <List>
                {items.map((it) => (
                  <Row key={it.cartItemId || it.productId}>
                    <Thumb>
                      {it.image ? (
                        <ThumbImg src={it.image} alt={it.title || "Product"} />
                      ) : (
                        <ThumbFallback>—</ThumbFallback>
                      )}
                    </Thumb>

                    <Info>
                      <Name title={it.title || "Product"}>{it.title || "Product"}</Name>

                      <Meta>
                        {it.size ? <Pill>Size: {it.size}</Pill> : <Pill>No size</Pill>}
                        {it.color ? <Pill>Color: {it.color}</Pill> : <Pill>No color</Pill>}
                      </Meta>

                      <MiniDesc>{it.description || ""}</MiniDesc>

                      <Controls>
                        <QtyWrap>
                          <QtyBtn
                            type="button"
                            onClick={() => updateQty(it.cartItemId, clampQty(it.qty) - 1)}
                            disabled={redirecting}
                          >
                            −
                          </QtyBtn>

                          <QtyInput
                            value={clampQty(it.qty)}
                            onChange={(e) => updateQty(it.cartItemId, e.target.value)}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            aria-label="Quantity"
                            disabled={redirecting}
                          />

                          <QtyBtn
                            type="button"
                            onClick={() => updateQty(it.cartItemId, clampQty(it.qty) + 1)}
                            disabled={redirecting}
                          >
                            +
                          </QtyBtn>
                        </QtyWrap>

                        <RemoveBtn
                          type="button"
                          onClick={() => removeItem(it.cartItemId)}
                          disabled={redirecting}
                        >
                          Remove
                        </RemoveBtn>
                      </Controls>
                    </Info>

                    <Right>
                      <Unit>${Number(it.price || 0).toFixed(2)}</Unit>
                      <LineTotal>
                        ${(Number(it.price || 0) * clampQty(it.qty)).toFixed(2)}
                      </LineTotal>
                    </Right>
                  </Row>
                ))}
              </List>
            )}
          </LeftCard>

          <RightCard
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <CardTitle>Summary</CardTitle>

            <SummaryRow>
              <Label>Subtotal</Label>
              <Value>${totals.subtotal.toFixed(2)}</Value>
            </SummaryRow>

            <SummaryRow>
              <Label>Estimated Shipping</Label>
              <Value>—</Value>
            </SummaryRow>

            <Divider />

            <SummaryRow>
              <Big>Total</Big>
              <Big>${totals.subtotal.toFixed(2)}</Big>
            </SummaryRow>

            <CheckoutBtn
              type="button"
              onClick={checkout}
              disabled={!items.length || redirecting}
              aria-busy={redirecting ? "true" : "false"}
            >
              {redirecting ? (
                <BtnRow>
                  <BtnSpinner />
                  Redirecting…
                </BtnRow>
              ) : (
                "Checkout"
              )}
            </CheckoutBtn>

            <FinePrint>
              Taxes/shipping calculated at checkout after payment integration.
            </FinePrint>
          </RightCard>
        </Grid>
      </Inner>
    </Page>
  );
}

/* ------------------------- STYLES (theme colors) ------------------------- */

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 18px 90px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(circle at 18% 8%, rgba(214,182,159,0.20) 0%, rgba(0,0,0,0) 45%),
    radial-gradient(circle at 82% 16%, rgba(90,56,37,0.30) 0%, rgba(0,0,0,0) 46%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.darkBrown} 0%, #000 86%);
`;

const Inner = styled.section`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Top = styled(motion.header)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.12);
  padding: 22px;
  backdrop-filter: blur(18px);
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  font-weight: 900;
  letter-spacing: 0.16em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Title = styled.h1`
  margin: 12px 0 8px;
  font-size: clamp(26px, 3.0vw, 42px);
  line-height: 1.05;
  letter-spacing: -0.02em;

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-shadow: 0 14px 38px rgba(0,0,0,0.45);
  }
`;

const Sub = styled.p`
  margin: 0;
  opacity: 0.92;
  color: ${({ theme }) => theme.colors.ivory};
  max-width: 75ch;
`;

const TopActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(90,56,37,0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 1000;
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.12);
  transition: transform 0.15s ease;

  &:hover { transform: translateY(-2px); }
`;

const GhostBtn = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.55);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 16px;
  margin-top: 16px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const LeftCard = styled(motion.section)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(18px);
  padding: 16px;
`;

const RightCard = styled(motion.aside)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(18px);
  padding: 16px;
  height: fit-content;
`;

const CardHead = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.02em;
`;

const Small = styled.div`
  font-size: 13px;
  opacity: 0.85;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Empty = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.28);
  padding: 18px;
  display: grid;
  gap: 8px;
`;

const EmptyTitle = styled.div`
  font-weight: 1000;
  font-size: 18px;
`;

const EmptySub = styled.div`
  opacity: 0.9;
  color: ${({ theme }) => theme.colors.ivory};
`;

const EmptyBtn = styled(Link)`
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(90,56,37,0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 1000;
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.12);
`;

const List = styled.div`
  display: grid;
  gap: 12px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 92px 1fr 130px;
  gap: 12px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.25);

  @media (max-width: 640px) {
    grid-template-columns: 92px 1fr;
  }
`;

const Thumb = styled.div`
  width: 92px;
  height: 92px;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.35);
  display: grid;
  place-items: center;
`;

const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ThumbFallback = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.7;
  font-weight: 1000;
`;

const Info = styled.div`
  display: grid;
  gap: 6px;
`;

const Name = styled.div`
  font-weight: 1000;
  letter-spacing: -0.01em;
`;

const Meta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Pill = styled.div`
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.12);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  font-size: 12px;
`;

const MiniDesc = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const QtyWrap = styled.div`
  display: grid;
  grid-template-columns: 44px 64px 44px;
  gap: 10px;
  align-items: center;
`;

const QtyBtn = styled.button`
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 18px;
  font-weight: 1000;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.55);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const QtyInput = styled.input`
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.30);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  padding: 0 10px;
  outline: none;
  text-align: center;

  &:focus {
    border-color: rgba(214,182,159,0.55);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.10);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const RemoveBtn = styled.button`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.30);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  cursor: pointer;

  &:hover { background: rgba(0,0,0,0.55); }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Right = styled.div`
  display: grid;
  justify-items: end;
  align-content: start;
  gap: 6px;

  @media (max-width: 640px) {
    justify-items: start;
  }
`;

const Unit = styled.div`
  font-weight: 900;
  opacity: 0.9;
`;

const LineTotal = styled.div`
  font-weight: 1000;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
`;

const Label = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const Value = styled.div`
  font-weight: 1000;
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.12);
  margin: 14px 0;
`;

const Big = styled.div`
  font-weight: 1100;
  font-size: 18px;
`;

const BtnRow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
`;

const BtnSpinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(0,0,0,0.18);
  border-top-color: rgba(0,0,0,0.65);
  display: inline-block;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const CheckoutBtn = styled.button`
  width: 100%;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(90,56,37,0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 1100;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover { transform: translateY(-2px); }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const FinePrint = styled.div`
  margin-top: 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.8;
`;
