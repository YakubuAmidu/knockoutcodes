// src/pages/Cart.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";

import { useToast } from "../components/Toast";
import { createProductCheckoutSession } from "../lib/apiClient";
import { CHECKOUT_ACTIONS } from "../reducers/checkout/checkoutActionTypes";
import { CART_ACTIONS } from "../reducers/cart/cartActionTypes";

function formatMoney(value) {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
}

function getCartItemId(item) {
  return item?.cartItemId || item?._id || item?.productId || item?.id || null;
}

function getProductId(item) {
  return item?.productId || item?._id || item?.id || null;
}

function getStock(item) {
  const stock = Number(item?.stock);
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : null;
}

function clampQty(q, stock = null) {
  const n = Number(q);
  const clean = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;

  if (stock !== null) {
    return Math.min(clean, Math.max(1, stock));
  }

  return clean;
}

function normalizeCartItem(item) {
  const productId = getProductId(item);
  const cartItemId = getCartItemId(item);
  const stock = getStock(item);
  const qty = clampQty(item?.qty, stock);

  return {
    ...item,
    productId,
    cartItemId,
    qty,
    stock,
    title: item?.title || item?.name || "Product",
    image:
      item?.image ||
      item?.thumbnail ||
      (Array.isArray(item?.images) ? item.images[0] : ""),
    price: Number(item?.price || 0),
    size: item?.size || "",
    color: item?.color || "",
    description: item?.shortDescription || item?.description || "",
  };
}

export default function Cart() {
  const toast = useToast();
  const dispatch = useDispatch();

  const rawItems = useSelector((state) => state?.cart?.items || []);
  const [redirecting, setRedirecting] = useState(false);

  const items = useMemo(() => {
    return Array.isArray(rawItems) ? rawItems.map(normalizeCartItem) : [];
  }, [rawItems]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * clampQty(item.qty, item.stock),
      0,
    );

    const itemCount = items.reduce(
      (sum, item) => sum + clampQty(item.qty, item.stock),
      0,
    );

    return { subtotal, itemCount };
  }, [items]);

  function pushToast(payload) {
    toast?.push?.(payload);
  }

  function updateQty(cartItemId, nextQty) {
    if (!cartItemId || redirecting) return;

    const item = items.find((p) => getCartItemId(p) === cartItemId);
    const stock = getStock(item);
    const qty = clampQty(nextQty, stock);

    if (stock !== null && stock <= 0) {
      pushToast({
        title: "Out of stock",
        description: "This product is currently out of stock.",
        variant: "warning",
      });
      return;
    }

    dispatch({
      type: CART_ACTIONS.UPDATE_QTY,
      payload: { cartItemId, qty },
    });
  }

  function removeItem(cartItemId) {
    if (!cartItemId || redirecting) return;

    dispatch({
      type: CART_ACTIONS.REMOVE_ITEM,
      payload: cartItemId,
    });

    pushToast({
      title: "Removed",
      description: "Product removed from cart.",
      variant: "success",
    });
  }

  function clearCart() {
    if (!items.length || redirecting) return;

    const ok = window.confirm("Clear your entire cart?");
    if (!ok) return;

    dispatch({ type: CART_ACTIONS.CLEAR });

    pushToast({
      title: "Cart cleared",
      description: "Your cart is now empty.",
      variant: "success",
    });
  }

  async function checkout() {
    if (redirecting) return;

    if (!items.length) {
      pushToast({
        title: "Cart is empty",
        description: "Add at least one product before checkout.",
        variant: "warning",
      });
      return;
    }

    const payloadItems = items.map((item) => ({
      productId: item.productId,
      qty: clampQty(item.qty, item.stock),
      size: item.size || undefined,
      color: item.color || undefined,
    }));

    const hasBadItem = payloadItems.some(
      (item) => !item.productId || item.qty < 1,
    );

    if (hasBadItem) {
      pushToast({
        title: "Cart error",
        description: "One or more items are missing valid product data.",
        variant: "error",
      });
      return;
    }

    try {
      setRedirecting(true);
      dispatch({ type: CHECKOUT_ACTIONS.START });

      const data = await createProductCheckoutSession(payloadItems);

      if (!data?.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      dispatch({
        type: CHECKOUT_ACTIONS.SUCCESS,
        payload: data,
      });

      window.location.href = data.url;
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Checkout failed. Please try again.";

      dispatch({
        type: CHECKOUT_ACTIONS.ERROR,
        payload: msg,
      });

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
        <Hero
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Badge>🥊 KNOCKOUTCODES • SECURE CART</Badge>

          <Title>
            Lock in the gear. <span>Then go train like the work matters.</span>
          </Title>

          <Sub>
            Review your KnockoutCodes products, adjust quantities, and continue
            to secure checkout. Final totals are verified by the backend before
            payment.
          </Sub>

          <HeroStats>
            <StatCard>
              <StatNumber>{totals.itemCount}</StatNumber>
              <StatLabel>Total Items</StatLabel>
            </StatCard>

            <StatCard>
              <StatNumber>{items.length}</StatNumber>
              <StatLabel>Product Lines</StatLabel>
            </StatCard>

            <StatCard>
              <StatNumber>{formatMoney(totals.subtotal)}</StatNumber>
              <StatLabel>Estimated Subtotal</StatLabel>
            </StatCard>
          </HeroStats>

          <TopActions>
            <PrimaryLink to="/products">← Continue Shopping</PrimaryLink>

            <GhostBtn
              type="button"
              onClick={clearCart}
              disabled={!items.length || redirecting}
            >
              Clear Cart
            </GhostBtn>
          </TopActions>
        </Hero>

        <Grid>
          <CartPanel
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <PanelHeader>
              <div>
                <PanelTitle>Your Fight Gear</PanelTitle>
                <PanelSub>
                  {totals.itemCount} item{totals.itemCount === 1 ? "" : "s"}{" "}
                  ready for checkout
                </PanelSub>
              </div>

              <SecureBadge>Secure Checkout Ready</SecureBadge>
            </PanelHeader>

            {!items.length ? (
              <EmptyBox>
                <EmptyTitle>Your cart is empty.</EmptyTitle>
                <EmptyText>
                  Choose premium KnockoutCodes gear and your cart will appear
                  here.
                </EmptyText>
                <EmptyButton to="/products">Shop Products →</EmptyButton>
              </EmptyBox>
            ) : (
              <ItemList>
                {items.map((item) => {
                  const key = getCartItemId(item);
                  const qty = clampQty(item.qty, item.stock);
                  const stock = getStock(item);
                  const lineTotal = Number(item.price || 0) * qty;
                  const outOfStock = stock !== null && stock <= 0;

                  return (
                    <CartRow key={key}>
                      <Thumb>
                        {item.image ? (
                          <ThumbImg src={item.image} alt={item.title} />
                        ) : (
                          <ThumbFallback>No Image</ThumbFallback>
                        )}
                      </Thumb>

                      <ItemInfo>
                        <ItemName title={item.title}>{item.title}</ItemName>

                        <ItemMeta>
                          <MiniPill>
                            {item.size ? `Size: ${item.size}` : "No size"}
                          </MiniPill>
                          <MiniPill>
                            {item.color ? `Color: ${item.color}` : "No color"}
                          </MiniPill>
                          {stock !== null ? (
                            <MiniPill>
                              {outOfStock ? "Out of stock" : `Stock: ${stock}`}
                            </MiniPill>
                          ) : null}
                        </ItemMeta>

                        {item.description ? (
                          <MiniDesc>{item.description}</MiniDesc>
                        ) : null}

                        <MobilePrice>{formatMoney(lineTotal)}</MobilePrice>

                        <Controls>
                          <QtyBox>
                            <QtyBtn
                              type="button"
                              onClick={() => updateQty(key, qty - 1)}
                              disabled={redirecting || qty <= 1 || outOfStock}
                            >
                              −
                            </QtyBtn>

                            <QtyInput
                              value={qty}
                              onChange={(e) => updateQty(key, e.target.value)}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              disabled={redirecting || outOfStock}
                            />

                            <QtyBtn
                              type="button"
                              onClick={() => updateQty(key, qty + 1)}
                              disabled={
                                redirecting ||
                                outOfStock ||
                                (stock !== null && qty >= stock)
                              }
                            >
                              +
                            </QtyBtn>
                          </QtyBox>

                          <RemoveBtn
                            type="button"
                            onClick={() => removeItem(key)}
                            disabled={redirecting}
                          >
                            Remove
                          </RemoveBtn>
                        </Controls>
                      </ItemInfo>

                      <PriceBlock>
                        <UnitPrice>{formatMoney(item.price)} each</UnitPrice>
                        <LineTotal>{formatMoney(lineTotal)}</LineTotal>
                      </PriceBlock>
                    </CartRow>
                  );
                })}
              </ItemList>
            )}
          </CartPanel>

          <SummaryPanel
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <PanelTitle>Order Summary</PanelTitle>
            <PanelSub>Clean, secure, and ready for Stripe checkout.</PanelSub>

            <SummaryBox>
              <SummaryRow>
                <SummaryLabel>Subtotal</SummaryLabel>
                <SummaryValue>{formatMoney(totals.subtotal)}</SummaryValue>
              </SummaryRow>

              <SummaryRow>
                <SummaryLabel>Shipping</SummaryLabel>
                <SummaryMuted>Calculated later</SummaryMuted>
              </SummaryRow>

              <SummaryRow>
                <SummaryLabel>Taxes</SummaryLabel>
                <SummaryMuted>Calculated later</SummaryMuted>
              </SummaryRow>

              <Divider />

              <SummaryRow>
                <TotalLabel>Estimated Total</TotalLabel>
                <TotalValue>{formatMoney(totals.subtotal)}</TotalValue>
              </SummaryRow>
            </SummaryBox>

            <CheckoutBtn
              type="button"
              onClick={checkout}
              disabled={!items.length || redirecting}
              aria-busy={redirecting ? "true" : "false"}
            >
              {redirecting ? (
                <BtnRow>
                  <Spinner />
                  Redirecting…
                </BtnRow>
              ) : (
                "Continue To Secure Checkout"
              )}
            </CheckoutBtn>

            <TrustBox>
              <TrustTitle>Checkout Protection</TrustTitle>
              <TrustText>
                Your cart is only the estimate. The backend verifies every
                product, quantity, stock, and Stripe price before payment.
              </TrustText>
            </TrustBox>
          </SummaryPanel>
        </Grid>
      </Inner>
    </Page>
  );
}

/* ------------------------- styles ------------------------- */

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 18px 90px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(
      circle at 18% 8%,
      rgba(214, 182, 159, 0.22) 0%,
      rgba(0, 0, 0, 0) 42%
    ),
    radial-gradient(
      circle at 82% 16%,
      rgba(90, 56, 37, 0.34) 0%,
      rgba(0, 0, 0, 0) 46%
    ),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.darkBrown} 0%,
      #000 86%
    );
`;

const Inner = styled.section`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled(motion.header)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 28px 22px;
  backdrop-filter: blur(18px);
`;

const Badge = styled.div`
  display: inline-flex;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Title = styled.h1`
  margin: 14px 0 10px;
  max-width: 980px;
  font-size: clamp(30px, 4vw, 58px);
  line-height: 0.98;
  letter-spacing: -0.045em;

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Sub = styled.p`
  margin: 0;
  max-width: 82ch;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  line-height: 1.65;
`;

const HeroStats = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const StatNumber = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 24px;
  font-weight: 950;
`;

const StatLabel = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.84;
`;

const TopActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
`;

const PrimaryLink = styled(Link)`
  display: inline-flex;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    90deg,
    rgba(214, 182, 159, 0.95),
    rgba(90, 56, 37, 0.95)
  );
  color: ${({ theme }) => theme.colors.black};
  text-decoration: none;
  font-weight: 950;
`;

const GhostBtn = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const Grid = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const CartPanel = styled(motion.section)`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const SummaryPanel = styled(motion.aside)`
  height: fit-content;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 20px;
`;

const PanelSub = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
  font-size: 13px;
`;

const SecureBadge = styled.div`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(214, 182, 159, 0.15);
  color: ${({ theme }) => theme.colors.lightBrown};
  border: 1px solid rgba(214, 182, 159, 0.24);
  font-size: 12px;
  font-weight: 950;
`;

const EmptyBox = styled.div`
  padding: 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
`;

const EmptyTitle = styled.h3`
  margin: 0 0 6px;
`;

const EmptyText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
`;

const EmptyButton = styled(Link)`
  margin-top: 12px;
  display: inline-flex;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  text-decoration: none;
  background: linear-gradient(
    90deg,
    rgba(214, 182, 159, 0.95),
    rgba(90, 56, 37, 0.95)
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
`;

const ItemList = styled.div`
  display: grid;
  gap: 12px;
`;

const CartRow = styled.div`
  display: grid;
  grid-template-columns: 96px 1fr 130px;
  gap: 12px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.26);

  @media (max-width: 680px) {
    grid-template-columns: 88px 1fr;
  }
`;

const Thumb = styled.div`
  width: 96px;
  height: 96px;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: rgba(0, 0, 0, 0.42);
  display: grid;
  place-items: center;

  @media (max-width: 680px) {
    width: 88px;
    height: 88px;
  }
`;

const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ThumbFallback = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 11px;
  font-weight: 950;
`;

const ItemInfo = styled.div`
  display: grid;
  gap: 7px;
  min-width: 0;
`;

const ItemName = styled.div`
  font-weight: 950;
  color: ${({ theme }) => theme.colors.ivory};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ItemMeta = styled.div`
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
`;

const MiniPill = styled.span`
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.4);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 900;
`;

const MiniDesc = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.85;
  font-size: 13px;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`;

const QtyBox = styled.div`
  display: grid;
  grid-template-columns: 42px 58px 42px;
  gap: 8px;
`;

const QtyBtn = styled.button`
  height: 42px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const QtyInput = styled.input`
  height: 42px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 950;
`;

const RemoveBtn = styled.button`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 950;
  cursor: pointer;
`;

const PriceBlock = styled.div`
  display: grid;
  justify-items: end;
  align-content: start;
  gap: 6px;

  @media (max-width: 680px) {
    display: none;
  }
`;

const UnitPrice = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;
  font-weight: 850;
`;

const LineTotal = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 18px;
  font-weight: 950;
`;

const MobilePrice = styled.div`
  display: none;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 950;

  @media (max-width: 680px) {
    display: block;
  }
`;

const SummaryBox = styled.div`
  margin-top: 14px;
  display: grid;
  gap: 12px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const SummaryLabel = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
`;

const SummaryValue = styled.div`
  font-weight: 950;
`;

const SummaryMuted = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.68;
  font-weight: 800;
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
`;

const TotalLabel = styled.div`
  font-size: 18px;
  font-weight: 950;
`;

const TotalValue = styled.div`
  font-size: 18px;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const CheckoutBtn = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 13px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  background: linear-gradient(
    90deg,
    rgba(214, 182, 159, 0.95),
    rgba(90, 56, 37, 0.95)
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const BtnRow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(0, 0, 0, 0.18);
  border-top-color: rgba(0, 0, 0, 0.65);
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const TrustBox = styled.div`
  margin-top: 14px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.26);
`;

const TrustTitle = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 950;
  margin-bottom: 5px;
`;

const TrustText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
`;
