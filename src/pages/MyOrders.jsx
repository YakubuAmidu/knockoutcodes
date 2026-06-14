// src/pages/MyOrders.jsx
import { useEffect, useMemo } from "react";
import { socket, connectUserSocket } from "../../utils/socket";
import styled, { keyframes } from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ReviewForm from "../components/ReviewForm";
import { useToast } from "../components/Toast";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyOrders,
  refreshMyOrders,
  setMyOrdersPage,
} from "../reducers/myOrders/myOrderActions";

const LIMIT = 12;

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatCurrency(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStatus(value, fallback = "pending") {
  return String(value || fallback).toLowerCase().trim();
}

function shortText(value, max = 48) {
  const text = String(value || "").trim();
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function hasTracking(order) {
  return Boolean(
    order?.shipping?.trackingNumber ||
      order?.shipping?.trackingUrl ||
      order?.shipping?.carrier ||
      order?.shipping?.shippedAt
  );
}

function getProductIdFromItem(item) {
  if (!item?.product) return "";
  if (typeof item.product === "string") return item.product;
  return item.product?._id || item.product?.id || "";
}

function canReviewItem(order, item) {
  const paymentStatus = normalizeStatus(order?.paymentStatus);

  return (
    paymentStatus === "paid" &&
    item?.productType === "product" &&
    item?.productModel === "Product" &&
    Boolean(getProductIdFromItem(item))
  );
}

export default function MyOrders() {
  const navigate = useNavigate();
  const toast = useToast();
  const push = toast?.push || toast?.showToast;

  const dispatch = useDispatch();

  const authUser = useSelector((state) => state.auth?.user || state.auth?.currentUser);

const {
  orders = [],
  loading,
  error,
  page,
  pages,
  total,
  refreshKey,
} = useSelector((state) => state.myOrders || {});

  const paidCount = useMemo(
    () => orders.filter((order) => normalizeStatus(order?.paymentStatus) === "paid").length,
    [orders]
  );

  const processingCount = useMemo(
    () => orders.filter((order) => normalizeStatus(order?.status, "new") === "processing").length,
    [orders]
  );

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order?.total || 0), 0),
    [orders]
  );

  useEffect(() => {
  const controller = new AbortController();

  dispatch(fetchMyOrders({ page, signal: controller.signal })).then((res) => {
    if (!res?.ok && !res?.cancelled && res?.message) {
      push?.({
        title: "Orders error",
        description: res.message,
        variant: "error",
      });
    }
  });

  return () => {
    controller.abort();
  };
  }, [dispatch, page, refreshKey, push]);
  
  useEffect(() => {
  const userId = authUser?._id || authUser?.id;

  if (!userId) return;

  connectUserSocket(userId);

  const handleOrderUpdate = ({ action }) => {
    if (
      action === "updated" ||
      action === "fulfilled" ||
      action === "cancelled" ||
      action === "refunded" ||
      action === "tracking-updated" ||
      action === "deleted"
    ) {
      dispatch(refreshMyOrders());
    }
  };

  socket.on("user:order-updated", handleOrderUpdate);

  return () => {
    socket.off("user:order-updated", handleOrderUpdate);
  };
}, [authUser?._id, authUser?.id, dispatch]);

function refreshOrders() {
  dispatch(refreshMyOrders());
}

function handlePrev() {
  dispatch(setMyOrdersPage(Math.max(1, page - 1)));
}

function handleNext() {
  dispatch(setMyOrdersPage(Math.min(pages, page + 1)));
}
  
  return (
    <Page>
      <GlowOne />
      <GlowTwo />

      <Shell>
        <Hero
          as={motion.header}
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.38 }}
        >
          <HeroText>
            <Badge>
              <LiveDot />
              KNOCKOUTCODES • PRIVATE ORDER VAULT
            </Badge>

            <Title>
              Your purchases. <span>Clear, protected, and easy to understand.</span>
            </Title>

            <Subtitle>
              View every product order connected to your account, including payment status,
              order status, items purchased, quantity, total paid, shipping details, reviews, and order date.
            </Subtitle>

            <HeroActions>
              <PrimaryButton type="button" onClick={() => navigate("/products")}>
                Shop More Products
              </PrimaryButton>

              <GhostButton type="button" onClick={refreshOrders}>
                Refresh Orders
              </GhostButton>

              <GhostLink to="/user-dashboard">Back To Dashboard</GhostLink>
            </HeroActions>
          </HeroText>

          <HeroPanel>
            <PanelEyebrow>Order Control</PanelEyebrow>

            <HeroStat>
              <HeroStatValue>{total}</HeroStatValue>
              <HeroStatLabel>Total Orders</HeroStatLabel>
            </HeroStat>

            <HeroMiniGrid>
              <HeroMiniCard>
                <MiniValue>{paidCount}</MiniValue>
                <MiniLabel>Paid</MiniLabel>
              </HeroMiniCard>

              <HeroMiniCard>
                <MiniValue>{processingCount}</MiniValue>
                <MiniLabel>Processing</MiniLabel>
              </HeroMiniCard>

              <HeroMiniCard>
                <MiniValue>{formatCurrency(totalSpent, "USD")}</MiniValue>
                <MiniLabel>Page Total</MiniLabel>
              </HeroMiniCard>
            </HeroMiniGrid>
          </HeroPanel>
        </Hero>

        <StatsGrid>
          <StatCard>
            <StatLabel>Payment</StatLabel>
            <StatValue>Verified</StatValue>
            <StatText>Paid orders are confirmed through Stripe before appearing here.</StatText>
          </StatCard>

          <StatCard>
            <StatLabel>Access</StatLabel>
            <StatValue>Private</StatValue>
            <StatText>This page only loads orders that belong to your user account.</StatText>
          </StatCard>

          <StatCard>
            <StatLabel>Tracking</StatLabel>
            <StatValue>Clear</StatValue>
            <StatText>Each card shows item details, status, total, and transaction info.</StatText>
          </StatCard>
        </StatsGrid>

        <OrdersPanel>
          <PanelHeader>
            <div>
              <PanelTitle>My Products & Orders</PanelTitle>
              <PanelSub>
                Page {page} of {pages} • {total} total order{total === 1 ? "" : "s"}
              </PanelSub>
            </div>

            <PanelActions>
              <SmallButton type="button" onClick={refreshOrders} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </SmallButton>
            </PanelActions>
          </PanelHeader>

          {loading ? (
            <StateBox>
              <Spinner />
              <StateTitle>Loading your private orders…</StateTitle>
              <StateText>Checking your account and pulling your latest confirmed purchases.</StateText>
            </StateBox>
          ) : error ? (
            <StateBox>
              <StateIcon>!</StateIcon>
              <StateTitle>Orders could not load.</StateTitle>
              <StateText>{error}</StateText>
              <StateActions>
                <PrimaryButton type="button" onClick={refreshOrders}>
                  Try Again
                </PrimaryButton>
              </StateActions>
            </StateBox>
          ) : orders.length === 0 ? (
            <StateBox>
              <StateIcon>⌁</StateIcon>
              <StateTitle>No orders yet.</StateTitle>
              <StateText>
                When you buy KnockoutCodes products, your verified orders will appear here.
              </StateText>
              <StateActions>
                <PrimaryButton type="button" onClick={() => navigate("/products")}>
                  Shop Products
                </PrimaryButton>
              </StateActions>
            </StateBox>
          ) : (
            <OrderGrid>
              {orders.map((order) => {
                const paymentStatus = normalizeStatus(order?.paymentStatus);
                const orderStatus = normalizeStatus(order?.status, "new");
                const itemList = safeArray(order?.items);
                const orderId = String(order?._id || "");
                const shortId = orderId ? orderId.slice(-8).toUpperCase() : "ORDER";
                const currency = order?.currency || "USD";
                const firstItem = itemList[0] || {};
                const totalQty = itemList.reduce(
                  (sum, item) => sum + Number(item?.quantity || 0),
                  0
                );

                return (
                  <OrderCard key={orderId || order?.transactionId}>
                    <CardTopBar />

                    <OrderTop>
                      <OrderIdentity>
                        <OrderBadge>Order #{shortId}</OrderBadge>
                        <OrderDate>{formatDateTime(order?.createdAt)}</OrderDate>
                      </OrderIdentity>

                      <OrderStatusRow>
                        <PaymentBadge data-status={paymentStatus}>{paymentStatus}</PaymentBadge>
                        <StatusBadge data-status={orderStatus}>{orderStatus}</StatusBadge>
                      </OrderStatusRow>
                    </OrderTop>

                    <ProductBlock>
                      <Label>Product</Label>
                      <ProductTitle title={firstItem?.title || "Purchased item"}>
                        {shortText(firstItem?.title || "Purchased item", 58)}
                      </ProductTitle>

                      {itemList.length > 1 ? (
                        <ExtraItems>
                          + {itemList.length - 1} more item{itemList.length - 1 === 1 ? "" : "s"}
                        </ExtraItems>
                      ) : null}
                    </ProductBlock>

                    <DetailsGrid>
                      <DetailBox>
                        <DetailLabel>Quantity</DetailLabel>
                        <DetailValue>{totalQty || 1}</DetailValue>
                      </DetailBox>

                      <DetailBox>
                        <DetailLabel>Unit Price</DetailLabel>
                        <DetailValue>
                          {formatCurrency(firstItem?.unitPrice, firstItem?.currency || currency)}
                        </DetailValue>
                      </DetailBox>

                      <DetailBox>
                        <DetailLabel>Subtotal</DetailLabel>
                        <DetailValue>{formatCurrency(order?.subtotal, currency)}</DetailValue>
                      </DetailBox>

                      <DetailBox>
                        <DetailLabel>Total Paid</DetailLabel>
                        <DetailValue>{formatCurrency(order?.total, currency)}</DetailValue>
                      </DetailBox>

                      <DetailBox>
                        <DetailLabel>Currency</DetailLabel>
                        <DetailValue>{currency}</DetailValue>
                      </DetailBox>

                      <DetailBox>
                        <DetailLabel>Method</DetailLabel>
                        <DetailValue>{order?.paymentMethod || "stripe"}</DetailValue>
                      </DetailBox>
                    </DetailsGrid>

                    {hasTracking(order) ? (
                      <TrackingBox>
                        <Label>Shipping & Tracking</Label>

                        <TrackingGrid>
                          <DetailBox>
                            <DetailLabel>Carrier</DetailLabel>
                            <DetailValue>{order?.shipping?.carrier || "—"}</DetailValue>
                          </DetailBox>

                          <DetailBox>
                            <DetailLabel>Tracking Number</DetailLabel>
                            <DetailValue>{order?.shipping?.trackingNumber || "—"}</DetailValue>
                          </DetailBox>

                          <DetailBox>
                            <DetailLabel>Shipped At</DetailLabel>
                            <DetailValue>{formatDateTime(order?.shipping?.shippedAt)}</DetailValue>
                          </DetailBox>

                          <DetailBox>
                            <DetailLabel>Status</DetailLabel>
                            <DetailValue>{order?.status || "processing"}</DetailValue>
                          </DetailBox>
                        </TrackingGrid>

                        {order?.shipping?.trackingUrl ? (
                          <TrackingLink
                            href={order.shipping.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Track Package
                          </TrackingLink>
                        ) : null}
                      </TrackingBox>
                    ) : (
                      <TrackingBox>
                        <Label>Shipping & Tracking</Label>
                        <TrackingEmpty>
                          Tracking will appear here once your order is shipped.
                        </TrackingEmpty>
                      </TrackingBox>
                    )}

                    {order?.shippingAddress ? (
                      <TrackingBox>
                        <Label>Shipping Address</Label>

                        <TrackingGrid>
                          <DetailBox>
                            <DetailLabel>Name</DetailLabel>
                            <DetailValue>{order.shippingAddress.fullName || "—"}</DetailValue>
                          </DetailBox>

                          <DetailBox>
                            <DetailLabel>Email</DetailLabel>
                            <DetailValue>{order.shippingAddress.email || "—"}</DetailValue>
                          </DetailBox>

                          <DetailBox>
                            <DetailLabel>Phone</DetailLabel>
                            <DetailValue>{order.shippingAddress.phone || "—"}</DetailValue>
                          </DetailBox>

                          <DetailBox>
                            <DetailLabel>Country</DetailLabel>
                            <DetailValue>{order.shippingAddress.country || "—"}</DetailValue>
                          </DetailBox>
                        </TrackingGrid>

                        <AddressLine>
                          {[
                            order.shippingAddress.line1,
                            order.shippingAddress.line2,
                            order.shippingAddress.city,
                            order.shippingAddress.state,
                            order.shippingAddress.postalCode,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </AddressLine>
                      </TrackingBox>
                    ) : null}

                    <ItemSection>
                      <Label>Items In This Order</Label>

                      <ItemStack>
                        {itemList.map((item, idx) => {
                          const productId = getProductIdFromItem(item);
                          const canReview = canReviewItem(order, item);

                          return (
                            <ItemLine key={`${orderId}-${productId || idx}`}>
                              <ItemDot />

                              <ItemText>
                                <span>{item?.title || "Purchased item"}</span>

                                <small>
                                  Qty {item?.quantity || 1} •{" "}
                                  {formatCurrency(item?.unitPrice, item?.currency || currency)} each
                                </small>

                                {canReview ? (
                                  <ReviewSlot>
                                    <ReviewForm
                                      type="product"
                                      productId={productId}
                                      productTitle={item?.title || "this product"}
                                      onSuccess={refreshOrders}
                                    />

                                    <ReviewNote>
                                      Verified purchase review. Only paid customers can submit.
                                    </ReviewNote>
                                  </ReviewSlot>
                                ) : null}
                              </ItemText>

                              <ItemTotal>
                                {formatCurrency(
                                  Number(item?.unitPrice || 0) * Number(item?.quantity || 1),
                                  item?.currency || currency
                                )}
                              </ItemTotal>
                            </ItemLine>
                          );
                        })}
                      </ItemStack>
                    </ItemSection>

                    <OrderInfoGrid>
                      <InfoRow>
                        <InfoLabel>Order ID</InfoLabel>
                        <InfoValue title={orderId}>{orderId || "—"}</InfoValue>
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Transaction</InfoLabel>
                        <InfoValue title={order?.transactionId || ""}>
                          {order?.transactionId || "—"}
                        </InfoValue>
                      </InfoRow>

                      <InfoRow>
                        <InfoLabel>Updated</InfoLabel>
                        <InfoValue>{formatDateTime(order?.updatedAt)}</InfoValue>
                      </InfoRow>
                    </OrderInfoGrid>

                    {order?.couponCode ? (
                      <OrderFooter>
                        <FooterChip>Coupon: {order.couponCode}</FooterChip>
                      </OrderFooter>
                    ) : null}
                  </OrderCard>
                );
              })}
            </OrderGrid>
          )}
        </OrdersPanel>

        {orders.length > 0 ? (
          <PaginationRow>
            <PageButton type="button" disabled={page <= 1} onClick={handlePrev}>
              ← Previous
            </PageButton>

            <PageInfo>
              Page <strong>{page}</strong> of <strong>{pages}</strong>
            </PageInfo>

            <PageButton type="button" disabled={page >= pages} onClick={handleNext}>
              Next →
            </PageButton>
          </PaginationRow>
        ) : null}
      </Shell>
    </Page>
  );
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: .8; }
  50% { transform: scale(1.35); opacity: 1; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.main`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 96px 18px 76px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(circle at 14% 8%, rgba(214, 182, 159, 0.2), transparent 38%),
    radial-gradient(circle at 86% 16%, rgba(90, 56, 37, 0.32), transparent 42%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.darkBrown} 0%,
      ${({ theme }) => theme.colors.black} 86%
    );
`;

const GlowOne = styled.div`
  position: absolute;
  width: 440px;
  height: 440px;
  border-radius: 999px;
  left: -190px;
  top: 120px;
  background: rgba(214, 182, 159, 0.13);
  filter: blur(18px);
`;

const GlowTwo = styled.div`
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  right: -210px;
  bottom: 70px;
  background: rgba(90, 56, 37, 0.32);
  filter: blur(22px);
`;

const Shell = styled.section`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) 360px;
  gap: 16px;
  align-items: stretch;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const HeroText = styled.div`
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035)),
    rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.25);
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
  margin: 16px 0 10px;
  max-width: 860px;
  font-size: clamp(34px, 5.5vw, 76px);
  line-height: 0.94;
  letter-spacing: -0.06em;
  color: ${({ theme }) => theme.colors.ivory};

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Subtitle = styled.p`
  margin: 0;
  max-width: 740px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  line-height: 1.75;
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
`;

const PrimaryButton = styled.button`
  border: 0;
  cursor: pointer;
  min-height: 45px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  border: 1px solid rgba(255, 249, 242, 0.14);
  cursor: pointer;
  min-height: 45px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.24);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;

  &:hover {
    border-color: rgba(214, 182, 159, 0.42);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const GhostLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 45px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.24);
  color: ${({ theme }) => theme.colors.ivory};
  text-decoration: none;
  font-weight: 950;

  &:hover {
    border-color: rgba(214, 182, 159, 0.42);
    transform: translateY(-1px);
  }
`;

const HeroPanel = styled.aside`
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(214, 182, 159, 0.12), rgba(0, 0, 0, 0.42)),
    ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
`;

const PanelEyebrow = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const HeroStat = styled.div`
  margin-top: 14px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
`;

const HeroStatValue = styled.div`
  font-size: 44px;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.ivory};
`;

const HeroStatLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const HeroMiniGrid = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 10px;
`;

const HeroMiniCard = styled.div`
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.09);
`;

const MiniValue = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 18px;
  font-weight: 950;
`;

const MiniLabel = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const StatsGrid = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  backdrop-filter: blur(14px);
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const StatValue = styled.div`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  font-weight: 950;
`;

const StatText = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  line-height: 1.5;
  font-size: 13px;
`;

const OrdersPanel = styled.section`
  margin-top: 16px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.025)),
    rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 249, 242, 0.11);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
`;

const PanelTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  letter-spacing: -0.02em;
`;

const PanelSub = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
`;

const PanelActions = styled.div`
  display: flex;
  gap: 8px;
`;

const SmallButton = styled(GhostButton)`
  min-height: 40px;
  padding: 0 13px;
  font-size: 13px;
`;

const OrderGrid = styled.div`
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  align-items: stretch;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const OrderCard = styled.article`
  position: relative;
  overflow: hidden;
  padding: 16px;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02)),
    rgba(0, 0, 0, 0.31);
  border: 1px solid rgba(255, 249, 242, 0.1);
  min-height: 520px;
  height: auto;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: rgba(214, 182, 159, 0.34);
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }
`;

const CardTopBar = styled.div`
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, ${({ theme }) => theme.colors.lightBrown}, transparent);
`;

const OrderTop = styled.div`
  display: grid;
  gap: 10px;
`;

const OrderIdentity = styled.div`
  display: grid;
  gap: 6px;
`;

const OrderBadge = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const OrderDate = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.68;
  font-size: 12px;
  line-height: 1.4;
`;

const OrderStatusRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ProductBlock = styled.div`
  margin-top: 14px;
`;

const Label = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const ProductTitle = styled.h3`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 16px;
  line-height: 1.25;
  font-weight: 950;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ExtraItems = styled.div`
  margin-top: 7px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 900;
`;

const DetailsGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const DetailBox = styled.div`
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 249, 242, 0.08);
  min-width: 0;
`;

const DetailLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const DetailValue = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 900;
  word-break: break-word;
`;

const ItemSection = styled.div`
  margin-top: 14px;
`;

const ItemStack = styled.div`
  margin-top: 8px;
  display: grid;
  gap: 8px;
`;

const ItemLine = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: flex-start;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 249, 242, 0.06);

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
`;

const ItemDot = styled.span`
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
`;

const ItemText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  width: 100%;

  span {
    font-weight: 850;
    line-height: 1.45;
    word-break: break-word;
  }

  small {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.62;
    line-height: 1.45;
    word-break: break-word;
  }
`;

const ItemTotal = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 950;
  font-size: 12px;
  white-space: nowrap;

  @media (max-width: 480px) {
    grid-column: 2 / -1;
    white-space: normal;
  }
`;

const OrderInfoGrid = styled.div`
  margin-top: auto;
  padding-top: 14px;
  display: grid;
  gap: 8px;
`;

const InfoRow = styled.div`
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 249, 242, 0.075);
`;

const InfoLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const InfoValue = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.76;
  font-size: 11px;
  word-break: break-all;
`;

const PaymentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 950;
  text-transform: capitalize;
  border: 1px solid rgba(255, 249, 242, 0.16);

  &[data-status="paid"] {
    color: #d9ffe7;
    background: rgba(46, 204, 113, 0.16);
    border-color: rgba(46, 204, 113, 0.55);
  }

  &[data-status="pending"] {
    color: #fff3c4;
    background: rgba(241, 196, 15, 0.16);
    border-color: rgba(241, 196, 15, 0.55);
  }

  &[data-status="failed"],
  &[data-status="refunded"] {
    color: #ffd1d1;
    background: rgba(231, 76, 60, 0.16);
    border-color: rgba(231, 76, 60, 0.55);
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 950;
  text-transform: capitalize;
  border: 1px solid rgba(255, 249, 242, 0.16);

  &[data-status="new"] {
    color: #d7efff;
    background: rgba(52, 152, 219, 0.16);
    border-color: rgba(52, 152, 219, 0.55);
  }

  &[data-status="processing"] {
    color: #fff3c4;
    background: rgba(241, 196, 15, 0.16);
    border-color: rgba(241, 196, 15, 0.55);
  }

  &[data-status="completed"] {
    color: #d9ffe7;
    background: rgba(46, 204, 113, 0.16);
    border-color: rgba(46, 204, 113, 0.55);
  }

  &[data-status="cancelled"],
  &[data-status="canceled"] {
    color: #ffd1d1;
    background: rgba(231, 76, 60, 0.16);
    border-color: rgba(231, 76, 60, 0.55);
  }
`;

const OrderFooter = styled.div`
  margin-top: 12px;
  display: grid;
  gap: 8px;
`;

const FooterChip = styled.div`
  width: fit-content;
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.colors.lightBrown};
  background: rgba(214, 182, 159, 0.11);
  border: 1px solid rgba(214, 182, 159, 0.2);
  font-size: 12px;
  font-weight: 900;
`;

const StateBox = styled.div`
  margin-top: 14px;
  padding: 24px;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const StateIcon = styled.div`
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.lightBrown};
  background: rgba(214, 182, 159, 0.12);
  border: 1px solid rgba(214, 182, 159, 0.22);
  font-size: 26px;
  font-weight: 950;
`;

const StateTitle = styled.h3`
  margin: 12px 0 6px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
`;

const StateText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  line-height: 1.55;
`;

const StateActions = styled.div`
  margin-top: 16px;
`;

const Spinner = styled.span`
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 3px solid rgba(214, 182, 159, 0.2);
  border-top-color: ${({ theme }) => theme.colors.lightBrown};
  animation: ${spin} 0.85s linear infinite;
`;

const PaginationRow = styled.div`
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  min-height: 42px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: ${({ disabled, theme }) =>
    disabled ? "rgba(0,0,0,0.25)" : theme.colors.lightBrown};
  color: ${({ disabled, theme }) =>
    disabled ? "rgba(255,249,242,.55)" : theme.colors.black};
  font-weight: 950;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};

  &:hover {
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const PageInfo = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 13px;
`;

const TrackingBox = styled.div`
  margin-top: 14px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(214, 182, 159, 0.08);
  border: 1px solid rgba(214, 182, 159, 0.16);
`;

const TrackingGrid = styled.div`
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const TrackingLink = styled.a`
  margin-top: 10px;
  min-height: 38px;
  padding: 0 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
  text-decoration: none;
  font-size: 12px;
  font-weight: 950;

  &:hover {
    transform: translateY(-1px);
  }
`;

const TrackingEmpty = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.7;
  font-size: 12px;
  line-height: 1.5;
`;

const AddressLine = styled.div`
  margin-top: 10px;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 249, 242, 0.075);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
`;

const ReviewSlot = styled.div`
  position: relative;
  width: 100%;
  margin-top: 10px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(214, 182, 159, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.14);
  overflow: hidden;
  isolation: isolate;
  transform: none !important;
  backface-visibility: hidden;
  box-shadow: none !important;

  &:hover,
  &:focus,
  &:focus-within,
  &:active {
    transform: none !important;
    box-shadow: none !important;
  }

  * {
    max-width: 100%;
    box-sizing: border-box;
  }

  form,
  div,
  section,
  article {
    transform: none !important;
  }

  button {
    max-width: 100%;
    transform: none !important;
  }

  button:hover {
    transform: none !important;
  }

  /* Fix close X button overflow */
  button[aria-label="Close"],
  .close-btn,
  .review-close-btn {
    position: absolute !important;
    top: 8px !important;
    right: 8px !important;
    width: 28px !important;
    height: 28px !important;
    min-height: 28px !important;
    padding: 0 !important;
    border-radius: 999px !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(0, 0, 0, 0.55) !important;
    border: 1px solid rgba(214, 182, 159, 0.22) !important;
    z-index: 20;
  }
`;

const ReviewNote = styled.small`
  display: block;
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.58;
  font-size: 11px;
  line-height: 1.5;
`;