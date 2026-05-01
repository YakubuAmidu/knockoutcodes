// src/pages/MyOrders.jsx
import { useEffect, useState } from "react";
import styled from "styled-components";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

const MyOrders = () => {
  const { push } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchMyOrders = async () => {
      try {
        setLoading(true);

        // Backend getOrders supports userId filter, but we also
        // have a GET /api/v1/orders/:id. For a user "My Orders"
        // we’ll use a dedicated endpoint later if you add it.
        // For now this assumes your backend treats non-admin
        // GET /api/v1/orders with auth as "own orders only".
        const res = await axiosInstance.get("/orders", {
          params: {
            page,
            limit: 10,
          },
        });

        if (!isMounted) return;

        const payload = res.data || {};
        const items = Array.isArray(payload.data) ? payload.data : [];

        setOrders(items);
        setTotal(payload.pagination?.total || 0);
        setPages(payload.pagination?.pages || 1);
      } catch (error) {
        if (!isMounted) return;

        const message =
          error.response?.data?.message ||
          "Failed to load your orders. Please try again.";

        push({
          title: "Orders error",
          description: message,
          variant: "error",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMyOrders();

    return () => {
      isMounted = false;
    };
  }, [page, push]);

  const handlePrev = () => {
    setPage((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setPage((prev) => (prev < pages ? prev + 1 : prev));
  };

  const formatDateTime = (value) => {
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
  };

  const formatCurrency = (amount, currency) => {
    if (typeof amount !== "number") return "—";
    const code = currency || "USD";

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${code}`;
    }
  };

  const summarizeItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) return "—";

    if (items.length === 1) {
      const first = items[0];
      return `${first.title} ×${first.quantity || 1}`;
    }

    const first = items[0];
    const remaining = items.length - 1;
    return `${first.title} ×${first.quantity || 1} + ${remaining} more`;
  };

  return (
    <Wrap>
      <Header>
        <Title>My Orders</Title>
        <Meta>
          <span>
            <strong>{total}</strong> total
          </span>
          <span>
            Page <strong>{page}</strong> of <strong>{pages}</strong>
          </span>
        </Meta>
      </Header>

      <Card>
        {loading ? (
          <StateText>Loading your orders…</StateText>
        ) : orders.length === 0 ? (
          <StateText>You have no orders yet.</StateText>
        ) : (
          <List>
            {orders.map((order) => {
              const totalValue = formatCurrency(
                order.total,
                order.currency
              );
              const createdAt = formatDateTime(order.createdAt);
              const paymentStatus = order.paymentStatus || "pending";
              const status = order.status || "new";

              return (
                <OrderCard key={order._id}>
                  <OrderHeader>
                    <OrderTitle>Order #{order._id.slice(-6)}</OrderTitle>
                    <OrderMeta>{createdAt}</OrderMeta>
                  </OrderHeader>

                  <OrderBody>
                    <Column>
                      <Label>Items</Label>
                      <Value>{summarizeItems(order.items)}</Value>
                    </Column>

                    <Column>
                      <Label>Total Paid</Label>
                      <Value>{totalValue}</Value>
                    </Column>

                    <Column>
                      <Label>Payment</Label>
                      <BadgeRow>
                        <PaymentBadge data-status={paymentStatus}>
                          {paymentStatus}
                        </PaymentBadge>
                        <MethodTag>{order.paymentMethod || "stripe"}</MethodTag>
                      </BadgeRow>
                    </Column>

                    <Column>
                      <Label>Status</Label>
                      <StatusBadge data-status={status}>{status}</StatusBadge>
                    </Column>
                  </OrderBody>

                  {order.couponCode && (
                    <FooterRow>
                      <FooterLabel>Coupon</FooterLabel>
                      <FooterValue>{order.couponCode}</FooterValue>
                    </FooterRow>
                  )}
                </OrderCard>
              );
            })}
          </List>
        )}
      </Card>

      {orders.length > 0 && (
        <PaginationRow>
          <PageButton type="button" disabled={page <= 1} onClick={handlePrev}>
            Prev
          </PageButton>
          <PageInfo>
            Page {page} of {pages}
          </PageInfo>
          <PageButton
            type="button"
            disabled={page >= pages}
            onClick={handleNext}
          >
            Next
          </PageButton>
        </PaginationRow>
      )}
    </Wrap>
  );
};

export default MyOrders;

/* ============================
   Styled Components
   ============================ */

const Wrap = styled.main`
  width: 100%;
  min-height: 100%;
  padding: 20px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: ${({ theme }) => theme.colors.darkBrown};
  color: ${({ theme }) => theme.colors.ivory};
`;

const Header = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.4px;
`;

const Meta = styled.div`
  display: flex;
  gap: 12px;
  font-size: 12px;
  opacity: 0.9;

  span strong {
    font-weight: 700;
  }
`;

const Card = styled.section`
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.brown};
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 14px 12px;
`;

const StateText = styled.p`
  margin: 8px 0;
  font-size: 13px;
  opacity: 0.95;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const OrderCard = styled.article`
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px 10px 8px;
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
`;

const OrderTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.3px;
`;

const OrderMeta = styled.span`
  font-size: 11px;
  opacity: 0.85;
`;

const OrderBody = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr 1.1fr;
  gap: 10px;
  align-items: flex-start;
  margin-top: 4px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Label = styled.span`
  font-size: 11px;
  opacity: 0.75;
`;

const Value = styled.span`
  font-size: 13px;
  font-weight: 500;
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const PaymentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  text-transform: capitalize;
  border: 1px solid rgba(255, 255, 255, 0.18);

  &[data-status="paid"] {
    background: rgba(46, 204, 113, 0.16);
    border-color: rgba(46, 204, 113, 0.9);
  }

  &[data-status="pending"] {
    background: rgba(241, 196, 15, 0.16);
    border-color: rgba(241, 196, 15, 0.9);
  }

  &[data-status="failed"],
  &[data-status="refunded"] {
    background: rgba(231, 76, 60, 0.16);
    border-color: rgba(231, 76, 60, 0.9);
  }
`;

const MethodTag = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.85;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px dashed rgba(255, 255, 255, 0.35);
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  text-transform: capitalize;
  border: 1px solid rgba(255, 255, 255, 0.18);

  &[data-status="new"] {
    background: rgba(52, 152, 219, 0.18);
    border-color: rgba(52, 152, 219, 0.9);
  }

  &[data-status="processing"] {
    background: rgba(241, 196, 15, 0.18);
    border-color: rgba(241, 196, 15, 0.9);
  }

  &[data-status="completed"] {
    background: rgba(46, 204, 113, 0.18);
    border-color: rgba(46, 204, 113, 0.9);
  }

  &[data-status="cancelled"] {
    background: rgba(231, 76, 60, 0.18);
    border-color: rgba(231, 76, 60, 0.9);
  }
`;

const FooterRow = styled.div`
  margin-top: 6px;
  display: flex;
  gap: 6px;
  font-size: 11px;
  opacity: 0.85;
`;

const FooterLabel = styled.span`
  font-weight: 600;
`;

const FooterValue = styled.span``;

const PaginationRow = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
`;

const PageButton = styled.button`
  min-width: 72px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: ${({ disabled, theme }) =>
    disabled ? "rgba(0,0,0,0.3)" : theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
  font-size: 12px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
    box-shadow: ${({ disabled, theme }) =>
      disabled ? "none" : theme.shadow.soft};
  }
`;

const PageInfo = styled.span`
  font-size: 12px;
  opacity: 0.9;
`;
