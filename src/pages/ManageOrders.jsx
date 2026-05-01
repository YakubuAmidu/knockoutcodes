// src/pages/admin/ManageOrders.jsx
import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import { useToast } from "../components/Toast";
import Footer from "../components/Footer";

// =======================
// Styled Components
// =======================
const Page = styled.main`
  min-height: 100vh;
  padding: 32px 20px 40px;
  background: radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.12) 0,
      transparent 50%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(90, 56, 37, 0.3) 0,
      ${({ theme }) => theme.colors.black} 55%
    );
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  justify-content: center;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
`;

const TitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Title = styled.h1`
  font-size: 32px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown} 0%,
    ${({ theme }) => theme.colors.white} 40%,
    ${({ theme }) => theme.colors.lightBrown} 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Hook = styled.p`
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const BadgeRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const GlowBadge = styled.div`
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  font-size: 12px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
`;

const StatChip = styled.div`
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const Layout = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1.3fr);
  gap: 20px;
  align-items: flex-start;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.cocoa} 0%,
    ${({ theme }) => theme.colors.darkBrown} 40%,
    #050303 100%
  );
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 18px 18px 16px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  border: 1px solid rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(14px);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
`;

const PanelTitle = styled.h2`
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${({ theme }) => theme.colors.ivory};
`;

const PanelHint = styled.span`
  font-size: 12px;
  opacity: 0.8;
`;

const FiltersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
`;

const Input = styled.input`
  flex: 1 1 180px;
  min-width: 0;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.4);
  color: ${({ theme }) => theme.colors.white};
  font-size: 13px;
  outline: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease,
    background 0.2s ease;

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.3);
    background: rgba(0, 0, 0, 0.7);
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.5);
  }
`;

const Select = styled.select`
  flex: 0 0 150px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.4);
  color: ${({ theme }) => theme.colors.white};
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease,
    background 0.2s ease;

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.3);
    background: rgba(0, 0, 0, 0.7);
  }
`;

const TableWrap = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
`;

const Table = styled.div`
  max-height: 480px;
  overflow: auto;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(214, 182, 159, 0.5);
    border-radius: 999px;
  }
`;

const TableHeadRow = styled.div`
  display: grid;
  grid-template-columns: 0.9fr 1.1fr 0.7fr 0.7fr 0.6fr;
  padding: 10px 14px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  background: linear-gradient(
    135deg,
    rgba(214, 182, 159, 0.12) 0%,
    rgba(0, 0, 0, 0.7) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 720px) {
    grid-template-columns: 1.2fr 1fr 0.9fr 0.8fr;
    & > div:last-child {
      display: none;
    }
  }
`;

const HeadCell = styled.div`
  opacity: 0.8;
`;

// ✅ use transient prop $isSelected to avoid passing to DOM
const Row = styled.button`
  all: unset;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr 0.7fr 0.7fr 0.6fr;
  padding: 10px 14px;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: ${({ $isSelected }) =>
    $isSelected ? "rgba(214,182,159,0.12)" : "transparent"};
  transition: background 0.18s ease, transform 0.12s ease,
    box-shadow 0.18s ease;

  &:hover {
    background: rgba(214, 182, 159, 0.16);
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
  }

  @media (max-width: 720px) {
    grid-template-columns: 1.2fr 1fr 0.9fr 0.8fr;
    & > div:last-child {
      display: none;
    }
  }
`;

const Cell = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`;

const IdText = styled.span`
  font-family: "SF Mono", ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 12px;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SmallMuted = styled.span`
  font-size: 11px;
  opacity: 0.7;
`;

// ✅ use transient prop $tone
const StatusPill = styled.span`
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border: 1px solid
    ${({ $tone }) =>
      $tone === "success"
        ? "rgba(127, 255, 163, 0.8)"
        : $tone === "warn"
        ? "rgba(255, 214, 102, 0.8)"
        : $tone === "danger"
        ? "rgba(255, 140, 140, 0.85)"
        : "rgba(255, 255, 255, 0.45)"};
  color: ${({ $tone }) =>
    $tone === "success"
      ? "rgba(193, 255, 210, 0.95)"
      : $tone === "warn"
      ? "rgba(255, 235, 190, 0.95)"
      : $tone === "danger"
      ? "rgba(255, 204, 204, 0.95)"
      : "rgba(255, 249, 242, 0.9)"};
  background: rgba(0, 0, 0, 0.6);
`;

const Tag = styled.span`
  font-size: 11px;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.5);
`;

const DetailBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 1.1fr;
  gap: 10px 16px;
  font-size: 13px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const DetailLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  opacity: 0.7;
  margin-bottom: 4px;
`;

const DetailValue = styled.div`
  font-size: 13px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px dashed rgba(255, 255, 255, 0.18);
  margin: 4px 0 10px;
`;

const ItemsBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 10px 10px 8px;
  background: rgba(0, 0, 0, 0.45);
  max-height: 180px;
  overflow: auto;
`;

const ItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 4px 0;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
`;

// ✅ use transient prop $variant
const Button = styled.button`
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  cursor: pointer;
  background: ${({ $variant, theme }) =>
    $variant === "primary"
      ? `linear-gradient(135deg, ${theme.colors.lightBrown} 0%, ${theme.colors.brown} 100%)`
      : $variant === "danger"
      ? "linear-gradient(135deg, #ff4b4b 0%, #a31212 100%)"
      : "rgba(0,0,0,0.65)"};
  color: ${({ theme }) => theme.colors.white};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? "none" : "auto")};
  transition: transform 0.12s ease, box-shadow 0.12s ease,
    filter 0.12s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
    filter: brightness(1.03);
  }
`;

const SubButton = styled(Button)`
  padding: 6px 12px;
  font-size: 11px;
  letter-spacing: 0.12em;
`;

const ErrorText = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 144, 144, 0.96);
`;

const EmptyState = styled.div`
  padding: 22px 12px 16px;
  text-align: center;
  font-size: 13px;
  opacity: 0.8;
`;

const SkeletonRow = styled.div`
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.06) 0%,
    rgba(255, 255, 255, 0.02) 50%,
    rgba(255, 255, 255, 0.06) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;

  @keyframes shimmer {
    0% {
      background-position: -80% 0;
    }
    100% {
      background-position: 120% 0;
    }
  }
`;

// =======================
// Helper functions
// =======================
const getOrderId = (order) => order?._id || order?.id || "";

const formatMoney = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `$${Number(value).toFixed(2)}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getStatusTone = (status) => {
  if (!status) return "neutral";
  const s = String(status).toLowerCase();
  if (["completed", "paid", "fulfilled"].some((k) => s.includes(k)))
    return "success";
  if (["pending", "processing"].some((k) => s.includes(k))) return "warn";
  if (["cancel", "refunded", "failed"].some((k) => s.includes(k)))
    return "danger";
  return "neutral";
};

// =======================
// Component
// =======================
const ManageOrders = () => {
  const { push } = useToast();

  const showToast = (message, kind = "info") => {
    // kind should be one of: "success", "error", "info", "warning", "neutral"
    push({
      title: message,
      variant: kind,
    });
  };

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Fetch all orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/v1/orders", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("Not authorized. Please log in as an admin.");
          }
          const text = await res.text();
          throw new Error(text || "Failed to fetch orders");
        }

        const data = await res.json();
        console.log("Orders API response:", data);

        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (Array.isArray(data.orders)) {
          list = data.orders;
        } else if (Array.isArray(data.data)) {
          list = data.data;
        } else if (data.data && Array.isArray(data.data.orders)) {
          list = data.data.orders;
        } else if (Array.isArray(data.results)) {
          list = data.results;
        }

        if (!Array.isArray(list)) list = [];

        setOrders(list);

        if (!selectedOrder && list.length > 0) {
          setSelectedOrder(list[0]);
        }

        if (list.length === 0) {
          showToast("No orders found yet.", "info");
        } else {
          showToast(`Loaded ${list.length} orders successfully.`, "success");
        }
      } catch (err) {
        console.error(err);
        const msg = err.message || "Unable to load orders";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const id = getOrderId(order);
      const customer =
        order?.customerName ||
        order?.user?.name ||
        order?.userName ||
        order?.email ||
        "";
      const status = order?.status || "";

      const matchesSearch =
        !search ||
        id.toLowerCase().includes(search.toLowerCase()) ||
        String(customer).toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        String(status).toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // Handle order select
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setError("");
    if (order) {
      showToast("Editing order — remember to save your changes.", "info");
    }
  };

  // Handle status change (local state only)
  const handleStatusChange = (e) => {
    if (!selectedOrder) return;
    setSelectedOrder({
      ...selectedOrder,
      status: e.target.value,
    });
  };

  // Save (update) order
  const handleSave = async () => {
    if (!selectedOrder) return;

    const id = getOrderId(selectedOrder);
    if (!id) return;

    try {
      setSaving(true);
      setError("");

      const res = await fetch(`/api/v1/orders/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: selectedOrder.status,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update order");
      }

      const resJson = await res.json();

      let updatedOrder = resJson;
      if (resJson && resJson.data && resJson.data.order) {
        updatedOrder = resJson.data.order;
      } else if (resJson && resJson.order) {
        updatedOrder = resJson.order;
      } else if (
        resJson &&
        Array.isArray(resJson.orders) &&
        resJson.orders.length === 1
      ) {
        updatedOrder = resJson.orders[0];
      }

      setOrders((prev) =>
        prev.map((o) =>
          getOrderId(o) === getOrderId(updatedOrder) ? updatedOrder : o
        )
      );
      setSelectedOrder(updatedOrder);
      showToast("Order updated successfully.", "success");
    } catch (err) {
      console.error(err);
      const msg = err.message || "Unable to update order";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete order
  const handleDelete = async () => {
    if (!selectedOrder) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to permanently delete this order?"
    );
    if (!confirmDelete) return;

    const id = getOrderId(selectedOrder);
    if (!id) return;

    try {
      setDeleting(true);
      setError("");

      const res = await fetch(`/api/v1/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete order");
      }

      setOrders((prev) => prev.filter((o) => getOrderId(o) !== id));
      setSelectedOrder(null);
      showToast("Order deleted.", "success");
    } catch (err) {
      console.error(err);
      const msg = err.message || "Unable to delete order";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  // Derived stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => {
    const amount = o.total || o.amount || o.price || 0;
    return sum + Number(amount || 0);
  }, 0);

  const completedCount = orders.filter((o) =>
    String(o.status || "").toLowerCase().includes("completed")
  ).length;
  const pendingCount = orders.filter((o) =>
    String(o.status || "").toLowerCase().includes("pending")
  ).length;

  return (
    <>
     <Page>
      <Inner>
        {/* HOOK HEADER */}
        <Header>
          <TitleWrap>
            <Hook>FIRST 3 SECONDS: OWN EVERY ORDER</Hook>
            <Title>Admin Order Command Center</Title>
          </TitleWrap>

          <BadgeRow>
            <GlowBadge>5★ LUXURY ORDER CONTROL</GlowBadge>
            <StatChip>{totalOrders} Orders Live</StatChip>
            <StatChip>Total: {formatMoney(totalRevenue)}</StatChip>
            <StatChip>
              ✅ {completedCount} • ⏳ {pendingCount} pending
            </StatChip>
          </BadgeRow>
        </Header>

        {/* LAYOUT */}
        <Layout>
          {/* LEFT: TABLE LIST */}
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle>Orders Timeline</PanelTitle>
                <PanelHint>
                  Every row is clickable — tap an order to view & edit on the
                  right.
                </PanelHint>
              </div>
            </PanelHeader>

            <FiltersRow>
              <Input
                placeholder="Search by order ID, customer, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </Select>
            </FiltersRow>

            <TableWrap>
              <TableHeadRow>
                <HeadCell>Order</HeadCell>
                <HeadCell>Customer</HeadCell>
                <HeadCell>Total</HeadCell>
                <HeadCell>Status</HeadCell>
                <HeadCell>Created</HeadCell>
              </TableHeadRow>

              <Table>
                {loading && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {!loading && filteredOrders.length === 0 && (
                  <EmptyState>
                    No orders match your filters yet. Try clearing the search or
                    status.
                  </EmptyState>
                )}

                {!loading &&
                  filteredOrders.map((order) => {
                    const id = getOrderId(order);
                    const isSelected =
                      selectedOrder && getOrderId(selectedOrder) === id;

                    const customer =
                      order.customerName ||
                      order?.user?.name ||
                      order?.userName ||
                      order?.email ||
                      "Unknown customer";

                    const total =
                      order.total ?? order.amount ?? order.price ?? null;

                    const isHighValue =
                      Number(total || 0) >= 200; // highlight big orders

                    return (
                      <Row
                        key={id}
                        $isSelected={isSelected} // ✅ transient prop
                        onClick={() => handleSelectOrder(order)}
                      >
                        <Cell>
                          <IdText>{id}</IdText>
                        </Cell>
                        <Cell>
                          <span>{customer}</span>
                          {isHighValue && <Tag>High Value</Tag>}
                        </Cell>
                        <Cell>
                          <span>{formatMoney(total)}</span>
                        </Cell>
                        <Cell>
                          <StatusPill $tone={getStatusTone(order.status)}>
                            {order.status || "UNSET"}
                          </StatusPill>
                        </Cell>
                        <Cell>
                          <SmallMuted>{formatDate(order.createdAt)}</SmallMuted>
                        </Cell>
                      </Row>
                    );
                  })}
              </Table>
            </TableWrap>

            {error && <ErrorText>{error}</ErrorText>}
          </Panel>

          {/* RIGHT: DETAIL / EDIT */}
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle>Order Detail &amp; Edit</PanelTitle>
                <PanelHint>
                  Review, update status, and manage this order — don&apos;t
                  forget to hit “Save Changes”.
                </PanelHint>
              </div>

              {selectedOrder && (
                <SubButton
                  type="button"
                  onClick={() => handleSelectOrder(null)}
                >
                  Clear
                </SubButton>
              )}
            </PanelHeader>

            {!selectedOrder && (
              <EmptyState>
                Select an order from the left to see full details and controls
                here.
              </EmptyState>
            )}

            {selectedOrder && (
              <DetailBody>
                <DetailGrid>
                  <div>
                    <DetailLabel>Order ID</DetailLabel>
                    <DetailValue>
                      <IdText>{getOrderId(selectedOrder)}</IdText>
                    </DetailValue>
                  </div>

                  <div>
                    <DetailLabel>Customer</DetailLabel>
                    <DetailValue>
                      {selectedOrder.customerName ||
                        selectedOrder?.user?.name ||
                        selectedOrder.userName ||
                        selectedOrder.email ||
                        "Unknown"}
                    </DetailValue>
                  </div>

                  <div>
                    <DetailLabel>Email</DetailLabel>
                    <DetailValue>
                      {selectedOrder.email ||
                        selectedOrder?.user?.email ||
                        "—"}
                    </DetailValue>
                  </div>

                  <div>
                    <DetailLabel>Total</DetailLabel>
                    <DetailValue>
                      {formatMoney(
                        selectedOrder.total ??
                          selectedOrder.amount ??
                          selectedOrder.price
                      )}
                    </DetailValue>
                  </div>

                  <div>
                    <DetailLabel>Status</DetailLabel>
                    <Select
                      value={selectedOrder.status || "pending"}
                      onChange={handleStatusChange}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </Select>
                  </div>

                  <div>
                    <DetailLabel>Created At</DetailLabel>
                    <DetailValue>
                      {formatDate(selectedOrder.createdAt)}
                    </DetailValue>
                  </div>

                  <div>
                    <DetailLabel>Updated At</DetailLabel>
                    <DetailValue>
                      {formatDate(selectedOrder.updatedAt)}
                    </DetailValue>
                  </div>

                  <div>
                    <DetailLabel>Payment Reference</DetailLabel>
                    <DetailValue>
                      {selectedOrder.paymentIntentId ||
                        selectedOrder.transactionId ||
                        "—"}
                    </DetailValue>
                  </div>
                </DetailGrid>

                <Divider />

                <div>
                  <DetailLabel>Line Items</DetailLabel>
                  <ItemsBox>
                    {Array.isArray(selectedOrder.items) &&
                    selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, idx) => (
                        <ItemRow key={`${getOrderId(selectedOrder)}-${idx}`}>
                          <div>
                            {item.title || item.name || "Item"}{" "}
                            {item.sku && (
                              <SmallMuted>({item.sku})</SmallMuted>
                            )}
                          </div>
                          <div>
                            <SmallMuted>
                              x{item.quantity || 1} •{" "}
                              {formatMoney(item.price || item.amount)}
                            </SmallMuted>
                          </div>
                        </ItemRow>
                      ))
                    ) : (
                      <SmallMuted>
                        No items attached to this order.
                      </SmallMuted>
                    )}
                  </ItemsBox>
                </div>

                <ButtonRow>
                  <Button
                    type="button"
                    $variant="primary"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>

                  <Button
                    type="button"
                    $variant="danger"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? "Deleting…" : "Delete Order"}
                  </Button>
                </ButtonRow>

                {error && <ErrorText>{error}</ErrorText>}
              </DetailBody>
            )}
          </Panel>
        </Layout>
      </Inner>
      </Page>
      
      <Footer />
    </>
  );
};

export default ManageOrders;
