// src/pages/admin/ManageOrders.jsx
import React, { useEffect, useMemo } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";

import { useToast } from "../components/Toast";
import Footer from "../components/Footer";

import {
  getAdminOrders,
  updateAdminOrder,
  deleteAdminOrder,
  markAdminOrderSeen,
  fulfillAdminOrder,
  cancelAdminOrder,
  refundAdminOrder,
  updateAdminOrderTracking,
} from "../lib/apiClient";

import {
  fetchManageOrdersStart,
  fetchManageOrdersSuccess,
  fetchManageOrdersFailure,
  setSelectedManageOrder,
  clearSelectedManageOrder,
  setEditManageOrder,
  updateManageOrderField,
  clearEditManageOrder,
  updateManageOrderStart,
  updateManageOrderSuccess,
  updateManageOrderFailure,
  deleteManageOrderStart,
  deleteManageOrderSuccess,
  deleteManageOrderFailure,
  setManageOrderSearch,
  setManageOrderFilter,
} from "../reducers/manageOrders/manageOrderActions";

// =======================
// Styled Components
// =======================

const Page = styled.main`
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  padding: 34px 20px 44px;
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.18), transparent 42%),
    radial-gradient(circle at bottom right, rgba(90, 56, 37, 0.34), ${({ theme }) => theme.colors.black} 58%);
  color: ${({ theme }) => theme.colors.white};

  @media (max-width: 520px) {
    padding: 22px 12px 34px;
  }
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
`;

const Header = styled.header`
  width: 100%;
  min-width: 0;
  padding: 26px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.7));
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 18px;
  overflow: hidden;

  > div {
    min-width: 0;
  }

  @media (max-width: 520px) {
    padding: 20px;
    border-radius: ${({ theme }) => theme.radius.lg};
  }
`;

const Hook = styled.p`
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 8px;
  overflow-wrap: anywhere;

  @media (max-width: 520px) {
    font-size: 10px;
    letter-spacing: 0.14em;
  }
`;

const Title = styled.h1`
  font-size: clamp(30px, 5vw, 56px);
  line-height: 0.95;
  text-transform: uppercase;
  letter-spacing: -0.04em;
  background: linear-gradient(120deg, ${({ theme }) => theme.colors.lightBrown}, ${({ theme }) => theme.colors.white}, ${({ theme }) => theme.colors.lightBrown});
  -webkit-background-clip: text;
  color: transparent;
  overflow-wrap: anywhere;
`;

const SubTitle = styled.p`
  margin-top: 12px;
  max-width: 680px;
  color: rgba(255,249,242,0.78);
  line-height: 1.65;
  overflow-wrap: anywhere;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-content: flex-start;
  min-width: 0;
`;

const StatChip = styled.div`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.12);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  max-width: 100%;
  overflow-wrap: anywhere;
`;

const Layout = styled.section`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.95fr);
  gap: 20px;
  align-items: start;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: linear-gradient(145deg, ${({ theme }) => theme.colors.cocoa}, ${({ theme }) => theme.colors.darkBrown}, #050303);
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 18px;

  @media (max-width: 520px) {
    padding: 14px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

const PanelTop = styled.div`
  min-width: 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;

  > div {
    min-width: 0;
  }

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const PanelTitle = styled.h2`
  font-size: 15px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
`;

const PanelHint = styled.p`
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255,249,242,0.65);
  overflow-wrap: anywhere;
`;

const Filters = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  min-width: 0;
`;

const Input = styled.input`
  flex: 1 1 220px;
  min-width: 0;
  width: 100%;
  padding: 11px 13px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.45);
  color: ${({ theme }) => theme.colors.white};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Select = styled.select`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 11px 13px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.5);
  color: ${({ theme }) => theme.colors.white};
  outline: none;
`;

const FilterSelect = styled(Select)`
  flex: 0 1 220px;
`;

const TableWrap = styled.div`
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.42);
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: minmax(130px, 1fr) minmax(120px, 1.15fr) minmax(80px, 0.7fr) minmax(90px, 0.75fr) minmax(105px, 0.65fr);
  gap: 10px;
  padding: 12px 14px;
  background: rgba(214,182,159,0.12);
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255,249,242,0.76);

  > div {
    min-width: 0;
  }

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 90px;

    div:nth-child(4),
    div:nth-child(5) {
      display: none;
    }
  }
`;

const TableBody = styled.div`
  max-height: 560px;
  overflow: auto;
`;

const Row = styled.button`
  all: unset;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(130px, 1fr) minmax(120px, 1.15fr) minmax(80px, 0.7fr) minmax(90px, 0.75fr) minmax(105px, 0.65fr);
  gap: 10px;
  padding: 13px 14px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: ${({ $selected }) => ($selected ? "rgba(214,182,159,0.16)" : "transparent")};
  transition: 0.18s ease;

  &:hover {
    background: rgba(214,182,159,0.12);
    transform: translateY(-1px);
  }

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 90px;

    div:nth-child(4),
    div:nth-child(5) {
      display: none;
    }
  }
`;

const Cell = styled.div`
  min-width: 0;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;

  span {
    min-width: 0;
  }
`;

const Mono = styled.span`
  display: inline-block;
  max-width: 100%;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
  line-height: 1.45;
`;

const TableMono = styled(Mono)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Muted = styled.span`
  color: rgba(255,249,242,0.62);
  font-size: 12px;
  overflow-wrap: anywhere;
`;

const Pill = styled.span`
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid
    ${({ $tone }) =>
      $tone === "success"
        ? "rgba(127,255,163,0.7)"
        : $tone === "danger"
        ? "rgba(255,120,120,0.75)"
        : $tone === "warn"
        ? "rgba(255,214,102,0.75)"
        : "rgba(255,255,255,0.3)"};
`;

const DetailGrid = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const DetailCard = styled.div`
  min-width: 0;
  overflow: hidden;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255,255,255,0.07);
`;

const DetailFull = styled(DetailCard)`
  grid-column: 1 / -1;
`;

const Label = styled.div`
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255,249,242,0.54);
  margin-bottom: 5px;
  overflow-wrap: anywhere;
`;

const Value = styled.div`
  min-width: 0;
  max-width: 100%;
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  word-break: break-word;
`;

const Textarea = styled.textarea`
  width: 100%;
  max-width: 100%;
  min-height: 92px;
  resize: vertical;
  box-sizing: border-box;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.45);
  color: ${({ theme }) => theme.colors.white};
  outline: none;
  overflow-wrap: anywhere;
`;

const ItemsBox = styled.div`
  width: 100%;
  min-width: 0;
  margin-top: 14px;
  padding: 12px;
  box-sizing: border-box;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0,0,0,0.42);
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
`;

const ItemRow = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(255,255,255,0.1);

  > div {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  strong {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    gap: 4px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const Button = styled.button`
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 15px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.white};
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  background: ${({ $variant, theme }) =>
    $variant === "primary"
      ? `linear-gradient(135deg, ${theme.colors.lightBrown}, ${theme.colors.brown})`
      : $variant === "danger"
      ? "linear-gradient(135deg, #ff5252, #8f1111)"
      : $variant === "success"
      ? "linear-gradient(135deg, #2ecc71, #145a32)"
      : "rgba(0,0,0,0.62)"};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? "none" : "auto")};
  max-width: 100%;

  &:hover {
    transform: translateY(-1px);
  }

  @media (max-width: 520px) {
    width: 100%;
  }
`;

const Empty = styled.div`
  padding: 26px;
  text-align: center;
  color: rgba(255,249,242,0.66);
  overflow-wrap: anywhere;
`;

const ErrorText = styled.div`
  margin-top: 12px;
  color: #ffb4b4;
  font-size: 13px;
  overflow-wrap: anywhere;
`;

const Skeleton = styled.div`
  height: 48px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02), rgba(255,255,255,0.06));
`;

// =======================
// Helpers
// =======================

const getOrderId = (order) => order?._id || order?.id || "";

const getCustomerName = (order) =>
  order?.user?.name || order?.customerName || order?.userName || "Unknown customer";

const getCustomerEmail = (order) => order?.user?.email || order?.email || "—";

const formatMoney = (value, currency = "USD") => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(num);
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const getStatusTone = (status) => {
  const s = String(status || "").toLowerCase();

  if (["paid", "completed", "fulfilled", "delivered"].includes(s)) return "success";
  if (["new", "pending", "processing", "on_hold", "shipped"].includes(s)) return "warn";
  if (["cancelled", "refunded", "failed"].includes(s)) return "danger";

  return "neutral";
};

const normalizeOrders = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.orders)) return res.orders;
  if (Array.isArray(res?.data?.orders)) return res.data.orders;
  return [];
};

const getReturnedOrder = (res) => res?.data || res?.order || res;

// =======================
// Component
// =======================

const ManageOrders = () => {
  const dispatch = useDispatch();
  const { push } = useToast();

  const {
    orders,
    selectedOrder,
    editOrder,
    loading,
    updating,
    deleting,
    error,
    search,
    filter,
  } = useSelector((state) => state.manageOrders);

  const toast = (title, variant = "info") => {
    push({ title, variant });
  };

  const loadOrders = async () => {
    try {
      dispatch(fetchManageOrdersStart());

      const res = await getAdminOrders();
      const list = normalizeOrders(res);

      dispatch(fetchManageOrdersSuccess(list));

      if (list.length > 0) {
        dispatch(setSelectedManageOrder(list[0]));
        dispatch(setEditManageOrder(list[0]));
      }

      toast(`Loaded ${list.length} orders.`, "success");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to load orders.";
      dispatch(fetchManageOrdersFailure(msg));
      toast(msg, "error");
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    const q = String(search || "").toLowerCase().trim();

    return orders.filter((order) => {
      const id = getOrderId(order).toLowerCase();
      const customer = getCustomerName(order).toLowerCase();
      const email = getCustomerEmail(order).toLowerCase();
      const status = String(order?.status || "").toLowerCase();
      const payment = String(order?.paymentStatus || "").toLowerCase();

      const matchesSearch =
        !q || id.includes(q) || customer.includes(q) || email.includes(q);

      const matchesFilter =
        filter === "all" || status === filter || payment === filter;

      return matchesSearch && matchesFilter;
    });
  }, [orders, search, filter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const revenue = orders.reduce((sum, order) => sum + Number(order?.total || 0), 0);
    const paid = orders.filter((o) => o.paymentStatus === "paid").length;
    const unseen = orders.filter((o) => !o.isSeenByAdmin).length;

    return { total, revenue, paid, unseen };
  }, [orders]);

  const selectOrder = async (order) => {
    dispatch(setSelectedManageOrder(order));
    dispatch(setEditManageOrder(order));

    if (order && !order.isSeenByAdmin) {
      try {
        const res = await markAdminOrderSeen(getOrderId(order));
        dispatch(updateManageOrderSuccess(getReturnedOrder(res)));
      } catch {
        // Do not block admin viewing if seen update fails.
      }
    }
  };

  const saveOrder = async () => {
    if (!editOrder) return;

    try {
      dispatch(updateManageOrderStart());

      const payload = {
        status: editOrder.status,
        paymentStatus: editOrder.paymentStatus,
        note: editOrder.note,
        isSeenByAdmin: editOrder.isSeenByAdmin,
      };

      const res = await updateAdminOrder(getOrderId(editOrder), payload);
      const updated = getReturnedOrder(res);

      dispatch(updateManageOrderSuccess(updated));
      dispatch(setSelectedManageOrder(updated));
      toast("Order saved successfully.", "success");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to save order.";
      dispatch(updateManageOrderFailure(msg));
      toast(msg, "error");
    }
  };

  const saveTracking = async () => {
  if (!editOrder) return;

  try {
    dispatch(updateManageOrderStart());

    const res = await updateAdminOrderTracking(getOrderId(editOrder), {
      carrier: editOrder?.shipping?.carrier || "",
      trackingNumber: editOrder?.shipping?.trackingNumber || "",
      trackingUrl: editOrder?.shipping?.trackingUrl || "",
    });

    const updated = getReturnedOrder(res);

    dispatch(updateManageOrderSuccess(updated));
    dispatch(setSelectedManageOrder(updated));
    dispatch(setEditManageOrder(updated));

    toast("Tracking updated successfully.", "success");
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err.message ||
      "Failed to update tracking.";

    dispatch(updateManageOrderFailure(msg));
    toast(msg, "error");
  }
};

  const quickAction = async (type) => {
    if (!selectedOrder) return;

    const id = getOrderId(selectedOrder);
    const note = editOrder?.note || "";

    try {
      dispatch(updateManageOrderStart());

      let res;

      if (type === "fulfill") res = await fulfillAdminOrder(id, note);
      if (type === "cancel") res = await cancelAdminOrder(id, note);
      if (type === "refund") res = await refundAdminOrder(id, note);

      const updated = getReturnedOrder(res);

      dispatch(updateManageOrderSuccess(updated));
      dispatch(setSelectedManageOrder(updated));
      dispatch(setEditManageOrder(updated));

      toast(`Order ${type} action completed.`, "success");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || `Failed to ${type} order.`;
      dispatch(updateManageOrderFailure(msg));
      toast(msg, "error");
    }
  };

  const removeOrder = async () => {
    if (!selectedOrder) return;

    const ok = window.confirm("Delete this order permanently? This cannot be undone.");
    if (!ok) return;

    const id = getOrderId(selectedOrder);

    try {
      dispatch(deleteManageOrderStart());

      await deleteAdminOrder(id);

      dispatch(deleteManageOrderSuccess(id));
      toast("Order deleted successfully.", "success");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to delete order.";
      dispatch(deleteManageOrderFailure(msg));
      toast(msg, "error");
    }
  };

  return (
    <>
      <Page>
        <Inner>
          <Header>
            <div>
              <Hook>FIRST 2 SECONDS: CONTROL EVERY PAID ORDER</Hook>
              <Title>Order Command Center</Title>
              <SubTitle>
                A premium admin workflow for tracking orders, updating fulfillment,
                managing refunds, protecting Stripe records, and keeping the database clean.
              </SubTitle>
            </div>

            <BadgeRow>
              <StatChip>{stats.total} Orders</StatChip>
              <StatChip>{formatMoney(stats.revenue)} Revenue</StatChip>
              <StatChip>{stats.paid} Paid</StatChip>
              <StatChip>{stats.unseen} New</StatChip>
            </BadgeRow>
          </Header>

          <Layout>
            <Panel>
              <PanelTop>
                <div>
                  <PanelTitle>Orders Timeline</PanelTitle>
                  <PanelHint>Search, filter, select, and manage every order cleanly.</PanelHint>
                </div>

                <Button type="button" onClick={loadOrders}>
                  Refresh
                </Button>
              </PanelTop>

              <Filters>
                <Input
                  placeholder="Search order ID, customer, email..."
                  value={search}
                  onChange={(e) => dispatch(setManageOrderSearch(e.target.value))}
                />

                <FilterSelect
                  value={filter}
                  onChange={(e) => dispatch(setManageOrderFilter(e.target.value))}
                >
                  <option value="all">All Orders</option>
                  <option value="new">New</option>
                  <option value="processing">Processing</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                  <option value="on_hold">On Hold</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Payment Pending</option>
                  <option value="failed">Failed</option>
                </FilterSelect>
              </Filters>

              <TableWrap>
                <TableHead>
                  <div>Order</div>
                  <div>Customer</div>
                  <div>Total</div>
                  <div>Status</div>
                  <div>Date</div>
                </TableHead>

                <TableBody>
                  {loading && (
                    <>
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                    </>
                  )}

                  {!loading && filteredOrders.length === 0 && (
                    <Empty>No matching orders found.</Empty>
                  )}

                  {!loading &&
                    filteredOrders.map((order) => {
                      const id = getOrderId(order);
                      const selected = getOrderId(selectedOrder) === id;

                      return (
                        <Row
                          key={id}
                          type="button"
                          $selected={selected}
                          onClick={() => selectOrder(order)}
                        >
                          <Cell>
                            {!order.isSeenByAdmin && <Pill $tone="warn">New</Pill>}
                            <TableMono>{id}</TableMono>
                          </Cell>

                          <Cell>
                            <TableMono>{getCustomerName(order)}</TableMono>
                          </Cell>

                          <Cell>{formatMoney(order.total, order.currency)}</Cell>

                          <Cell>
                            <Pill $tone={getStatusTone(order.status)}>
                              {order.status || "new"}
                            </Pill>
                          </Cell>

                          <Cell>
                            <Muted>{formatDate(order.createdAt)}</Muted>
                          </Cell>
                        </Row>
                      );
                    })}
                </TableBody>
              </TableWrap>

              {error && <ErrorText>{error}</ErrorText>}
            </Panel>

            <Panel>
              <PanelTop>
                <div>
                  <PanelTitle>Order Detail</PanelTitle>
                  <PanelHint>Edit status, payment state, notes, and fulfillment actions.</PanelHint>
                </div>

                {selectedOrder && (
                  <Button
                    type="button"
                    onClick={() => {
                      dispatch(clearSelectedManageOrder());
                      dispatch(clearEditManageOrder());
                    }}
                  >
                    Clear
                  </Button>
                )}
              </PanelTop>

              {!editOrder && <Empty>Select an order to manage it.</Empty>}

              {editOrder && (
                <>
                  <DetailGrid>
                    <DetailFull>
                      <Label>Order ID</Label>
                      <Value>
                        <Mono>{getOrderId(editOrder)}</Mono>
                      </Value>
                    </DetailFull>

                    <DetailCard>
                      <Label>Customer</Label>
                      <Value>{getCustomerName(editOrder)}</Value>
                    </DetailCard>

                    <DetailCard>
                      <Label>Email</Label>
                      <Value>{getCustomerEmail(editOrder)}</Value>
                    </DetailCard>

                    <DetailCard>
                      <Label>Total</Label>
                      <Value>{formatMoney(editOrder.total, editOrder.currency)}</Value>
                    </DetailCard>

                    <DetailCard>
                      <Label>Status</Label>
                      <Select
                        value={editOrder.status || "new"}
                        onChange={(e) =>
                          dispatch(updateManageOrderField("status", e.target.value))
                        }
                      >
                        <option value="new">New</option>
                        <option value="processing">Processing</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                        <option value="on_hold">On Hold</option>
                      </Select>
                    </DetailCard>

                    <DetailCard>
                      <Label>Payment</Label>
                      <Select
                        value={editOrder.paymentStatus || "pending"}
                        onChange={(e) =>
                          dispatch(updateManageOrderField("paymentStatus", e.target.value))
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </Select>
                    </DetailCard>

                    <DetailFull>
                      <Label>Stripe Session</Label>
                      <Value>
                        <Mono>{editOrder.stripeSessionId || "—"}</Mono>
                      </Value>
                    </DetailFull>

                    <DetailFull>
                      <Label>Transaction</Label>
                      <Value>
                        <Mono>{editOrder.transactionId || "—"}</Mono>
                      </Value>
                    </DetailFull>

                    <DetailCard>
                      <Label>Created</Label>
                      <Value>{formatDate(editOrder.createdAt)}</Value>
                    </DetailCard>

                    <DetailCard>
                      <Label>Updated</Label>
                      <Value>{formatDate(editOrder.updatedAt)}</Value>
                    </DetailCard>
                  </DetailGrid>

                  <ItemsBox>
                    <Label>Line Items</Label>

                    {Array.isArray(editOrder.items) && editOrder.items.length > 0 ? (
                      editOrder.items.map((item, index) => (
                        <ItemRow key={`${getOrderId(editOrder)}-${index}`}>
                          <div>
                            <strong>{item.title || "Item"}</strong>
                            <br />
                            <Muted>
                              {item.productType || "item"} • {item.productModel || "model"}
                            </Muted>
                          </div>

                          <div>
                            <Muted>
                              x{item.quantity || 1} •{" "}
                              {formatMoney(item.unitPrice, item.currency)}
                            </Muted>
                          </div>
                        </ItemRow>
                      ))
                    ) : (
                      <Muted>No items attached.</Muted>
                    )}
                  </ItemsBox>

                  <ItemsBox>
                    <Label>Shipping & Tracking</Label>
                    <DetailGrid>
  <DetailCard>
    <Label>Full Name</Label>
    <Value>{editOrder?.shippingAddress?.fullName || "—"}</Value>
  </DetailCard>

  <DetailCard>
    <Label>Email</Label>
    <Value>{editOrder?.shippingAddress?.email || "—"}</Value>
  </DetailCard>

  <DetailCard>
    <Label>Phone</Label>
    <Value>{editOrder?.shippingAddress?.phone || "—"}</Value>
  </DetailCard>

  <DetailFull>
    <Label>Address</Label>
    <Value>
      {[
        editOrder?.shippingAddress?.line1,
        editOrder?.shippingAddress?.line2,
        editOrder?.shippingAddress?.city,
        editOrder?.shippingAddress?.state,
        editOrder?.shippingAddress?.postalCode,
        editOrder?.shippingAddress?.country,
      ]
        .filter(Boolean)
        .join(", ") || "—"}
    </Value>
  </DetailFull>
</DetailGrid>

  <DetailGrid>
    <DetailCard>
      <Label>Carrier</Label>
      <Select
        value={editOrder?.shipping?.carrier || ""}
        onChange={(e) =>
          dispatch(
            updateManageOrderField("shipping", {
              ...(editOrder.shipping || {}),
              carrier: e.target.value,
            })
          )
        }
      >
        <option value="">Select Carrier</option>
        <option value="usps">USPS</option>
        <option value="ups">UPS</option>
        <option value="fedex">FedEx</option>
        <option value="dhl">DHL</option>
        <option value="other">Other</option>
      </Select>
    </DetailCard>

    <DetailCard>
      <Label>Tracking Number</Label>
      <Input
        value={editOrder?.shipping?.trackingNumber || ""}
        placeholder="Enter tracking number..."
        onChange={(e) =>
          dispatch(
            updateManageOrderField("shipping", {
              ...(editOrder.shipping || {}),
              trackingNumber: e.target.value,
            })
          )
        }
      />
    </DetailCard>

    <DetailFull>
      <Label>Tracking URL</Label>
      <Input
        value={editOrder?.shipping?.trackingUrl || ""}
        placeholder="https://carrier.com/track/..."
        onChange={(e) =>
          dispatch(
            updateManageOrderField("shipping", {
              ...(editOrder.shipping || {}),
              trackingUrl: e.target.value,
            })
          )
        }
      />
    </DetailFull>
  </DetailGrid>

  <ButtonRow>
    <Button
      type="button"
      $variant="primary"
      disabled={updating}
      onClick={saveTracking}
    >
      {updating ? "Saving..." : "Save Tracking"}
    </Button>
  </ButtonRow>
</ItemsBox>

                  <ItemsBox>
                    <Label>Admin Note</Label>
                    <Textarea
                      value={editOrder.note || ""}
                      placeholder="Add internal fulfillment note..."
                      onChange={(e) =>
                        dispatch(updateManageOrderField("note", e.target.value))
                      }
                    />
                  </ItemsBox>

                  <ButtonRow>
                    <Button
                      type="button"
                      $variant="primary"
                      disabled={updating}
                      onClick={saveOrder}
                    >
                      {updating ? "Saving..." : "Save Changes"}
                    </Button>

                    <Button
                      type="button"
                      $variant="success"
                      disabled={updating}
                      onClick={() => quickAction("fulfill")}
                    >
                      Fulfill
                    </Button>

                    <Button
                      type="button"
                      disabled={updating}
                      onClick={() => quickAction("cancel")}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      disabled={updating}
                      onClick={() => quickAction("refund")}
                    >
                      Refund
                    </Button>

                    <Button
                      type="button"
                      $variant="danger"
                      disabled={deleting}
                      onClick={removeOrder}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </ButtonRow>

                  {error && <ErrorText>{error}</ErrorText>}
                </>
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