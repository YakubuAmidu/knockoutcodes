import { useEffect, useMemo } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "../components/Toast";

import {
  fetchManageRevenue,
  setSelectedRevenue,
  clearSelectedRevenue,
  updateRevenueField,
  updateManageRevenue,
  deleteManageRevenue,
  setManageRevenueSearch,
  setManageRevenueFilter,
} from "../reducers/manageRevenue/manageRevenueActions";

const getId = (item) => item?._id || item?.id || "";

const formatMoney = (value, currency = "USD") => {
  const num = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(num);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

export default function ManageRevenue() {
  const dispatch = useDispatch();
  const { push } = useToast();

  const {
    revenues = [],
    selectedRevenue,
    editRevenue,
    loading,
    updating,
    deleting,
    error,
    search,
    filter,
    summary = {},
  } = useSelector((state) => state.manageRevenue || {});

  useEffect(() => {
    dispatch(fetchManageRevenue());
  }, [dispatch]);

  const filteredRevenues = useMemo(() => {
    const q = String(search || "").toLowerCase().trim();

    return revenues.filter((item) => {
      const id = getId(item).toLowerCase();
      const customer =
        item?.user?.name ||
        item?.user?.email ||
        item?.customerName ||
        item?.email ||
        "";
      const status = String(item?.paymentStatus || item?.status || "").toLowerCase();

      const matchesSearch =
        !q ||
        id.includes(q) ||
        String(customer).toLowerCase().includes(q) ||
        String(item?.stripeSessionId || "").toLowerCase().includes(q);

      const matchesFilter = filter === "all" || status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [revenues, search, filter]);

  const cards = [
  {
    label: "Total Revenue",
    value: formatMoney(summary.totalRevenue),
    note: "All paid records",
  },
  {
    label: "Products",
    value: formatMoney(summary.product),
    note: "Physical/digital product sales",
  },
  {
    label: "Courses",
    value: formatMoney(summary.course),
    note: "Course sales",
  },
  {
    label: "Memberships",
    value: formatMoney(
      Number(summary.membership || 0) + Number(summary.subscription || 0)
    ),
    note: "Membership + subscription revenue",
  },
  {
    label: "Ebooks",
    value: formatMoney(summary.ebook),
    note: "Ebook sales",
  },
  {
    label: "Coaching",
    value: formatMoney(summary.coaching),
    note: "Private coaching revenue",
  },
  {
    label: "Monthly Revenue",
    value: formatMoney(summary.monthlyRevenue),
    note: "This month",
  },
  {
    label: "Paid Orders",
    value: summary.paidOrders || 0,
    note: `${summary.totalOrders || 0} total orders`,
  },
];

  async function saveRevenue() {
    if (!editRevenue) return;

    const id = getId(editRevenue);

    const payload = {
      status: editRevenue.status,
      paymentStatus: editRevenue.paymentStatus,
      note: editRevenue.note,
      isRevenueLocked: editRevenue.isRevenueLocked,
    };

    const updated = await dispatch(updateManageRevenue(id, payload));

    if (updated) {
      push({
        title: "Revenue updated",
        description: "Revenue record was saved successfully.",
        variant: "success",
      });
    }
  }

  async function removeRevenue() {
    if (!selectedRevenue) return;

    const ok = window.confirm(
      "Delete this revenue/order record? Only do this for test, duplicate, or invalid records."
    );

    if (!ok) return;

    const success = await dispatch(deleteManageRevenue(getId(selectedRevenue)));

    if (success) {
      push({
        title: "Revenue deleted",
        description: "The selected revenue record was removed.",
        variant: "success",
      });
    }
  }

  return (
    <Page>
      <Shell>
        <Hero>
          <div>
            <Kicker>KnockoutCodes · Revenue Command</Kicker>
            <Title>Revenue Control Center</Title>
            <Subtitle>
              View real revenue from orders and subscriptions, audit payment status,
              protect Stripe records, and manage admin notes without manually faking numbers.
            </Subtitle>
          </div>

          <RefreshButton
            type="button"
            disabled={loading}
            onClick={() => dispatch(fetchManageRevenue())}
          >
            {loading ? "Refreshing..." : "Refresh Revenue"}
          </RefreshButton>
        </Hero>

        <StatsGrid>
          {cards.map((card) => (
            <StatCard key={card.label}>
              <StatLabel>{card.label}</StatLabel>
              <StatValue>{card.value}</StatValue>
              <StatNote>{card.note}</StatNote>
            </StatCard>
          ))}
        </StatsGrid>

        <Layout>
          <Panel>
            <PanelTop>
              <div>
                <PanelTitle>Revenue Records</PanelTitle>
                <PanelHint>Real paid orders, subscriptions, refunds, and payment records.</PanelHint>
              </div>
            </PanelTop>

            <Filters>
              <Input
                placeholder="Search ID, customer, email, Stripe session..."
                value={search || ""}
                onChange={(e) => dispatch(setManageRevenueSearch(e.target.value))}
              />

              <Select
                value={filter || "all"}
                onChange={(e) => dispatch(setManageRevenueFilter(e.target.value))}
              >
                <option value="all">All Revenue</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="completed">Completed</option>
              </Select>
            </Filters>

            <Table>
              <TableHead>
                <span>Record</span>
<span>Type</span>
<span>Customer</span>
<span>Amount</span>
<span>Status</span>
<span>Date</span>
              </TableHead>

              <TableBody>
                {loading ? (
                  <Empty>Loading revenue...</Empty>
                ) : filteredRevenues.length === 0 ? (
                  <Empty>No revenue records found.</Empty>
                ) : (
                  filteredRevenues.map((item) => {
                    const id = getId(item);
                    const selected = getId(selectedRevenue) === id;
                    const customer =
                      item?.user?.name ||
                      item?.user?.email ||
                      item?.customerName ||
                      item?.email ||
                      "Customer";

                    return (
                      <TableRow
                        key={id}
                        type="button"
                        $selected={selected}
                        onClick={() => dispatch(setSelectedRevenue(item))}
                      >
                        <Mono>{id}</Mono>
<TypeBadge>{item.itemType || item.source || "other"}</TypeBadge>
<span>{customer}</span>
<strong>{formatMoney(item.total || item.amount, item.currency)}</strong>
<Status>{item.paymentStatus || item.status || "unknown"}</Status>
<Muted>{formatDate(item.createdAt)}</Muted>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {error && <ErrorText>{error}</ErrorText>}
          </Panel>

          <Panel>
            <PanelTop>
              <div>
                <PanelTitle>Revenue Detail</PanelTitle>
                <PanelHint>Edit admin-safe fields only.</PanelHint>
              </div>

              {selectedRevenue && (
                <GhostButton
                  type="button"
                  onClick={() => dispatch(clearSelectedRevenue())}
                >
                  Clear
                </GhostButton>
              )}
            </PanelTop>

            {!editRevenue ? (
              <Empty>Select a revenue record to manage it.</Empty>
            ) : (
              <>
                <DetailGrid>
                  <DetailFull>
                    <Label>Record ID</Label>
                    <Value>
                      <Mono>{getId(editRevenue)}</Mono>
                    </Value>
                  </DetailFull>

                  <DetailCard>
                    <Label>Amount</Label>
                    <Value>
                      {formatMoney(editRevenue.total || editRevenue.amount, editRevenue.currency)}
                    </Value>
                    </DetailCard>

                  <DetailCard>
                    <Label>Revenue Type</Label>
                      <Value>
                        {editRevenue.itemType || editRevenue.source || "other"}
                      </Value>
                    </DetailCard>

<DetailFull>
  <Label>Item / Sale</Label>
  <Value>{editRevenue.itemTitle || "—"}</Value>
</DetailFull>

                  <DetailCard>
                    <Label>Payment Status</Label>
                    <Select
                      value={editRevenue.paymentStatus || "pending"}
                      onChange={(e) =>
                        dispatch(updateRevenueField("paymentStatus", e.target.value))
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </Select>
                  </DetailCard>

                  <DetailCard>
                    <Label>Order Status</Label>
                    <Select
                      value={editRevenue.status || "new"}
                      onChange={(e) =>
                        dispatch(updateRevenueField("status", e.target.value))
                      }
                    >
                      <option value="new">New</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </Select>
                  </DetailCard>

                  <DetailCard>
                    <Label>Stripe Session</Label>
                    <Value>
                      <Mono>{editRevenue.stripeSessionId || "—"}</Mono>
                    </Value>
                  </DetailCard>

                  <DetailFull>
                    <Label>Admin Note</Label>
                    <Textarea
                      value={editRevenue.note || ""}
                      placeholder="Add internal revenue note..."
                      onChange={(e) => dispatch(updateRevenueField("note", e.target.value))}
                    />
                  </DetailFull>
                </DetailGrid>

                <ButtonRow>
                  <PrimaryButton
                    type="button"
                    disabled={updating}
                    onClick={saveRevenue}
                  >
                    {updating ? "Saving..." : "Save Revenue"}
                  </PrimaryButton>

                  <DangerButton
                    type="button"
                    disabled={deleting}
                    onClick={removeRevenue}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </DangerButton>
                </ButtonRow>
              </>
            )}
          </Panel>
        </Layout>
      </Shell>
    </Page>
  );
}

const Page = styled.main`
  min-height: 100vh;
  padding: 34px 20px 54px;
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.2), transparent 38%),
    radial-gradient(circle at bottom right, rgba(90, 56, 37, 0.32), #050302 58%);
  color: ${({ theme }) => theme.colors.ivory};
`;

const Shell = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  display: grid;
  gap: 22px;
`;

const Hero = styled.header`
  padding: 26px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.72));
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  display: flex;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
`;

const Kicker = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 0.95;
  letter-spacing: -0.05em;
`;

const Subtitle = styled.p`
  max-width: 760px;
  margin: 12px 0 0;
  color: rgba(255,249,242,0.74);
  line-height: 1.7;
`;

const RefreshButton = styled.button`
  align-self: flex-start;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 900;
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
`;

const StatCard = styled.article`
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0,0,0,0.44);
  border: 1px solid rgba(255,255,255,0.09);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const StatValue = styled.div`
  margin-top: 8px;
  font-size: 28px;
  font-weight: 950;
`;

const StatNote = styled.div`
  margin-top: 4px;
  color: rgba(255,249,242,0.62);
  font-size: 12px;
`;

const Layout = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(330px, 0.9fr);
  gap: 20px;

  @media (max-width: 1020px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(145deg, ${({ theme }) => theme.colors.cocoa}, ${({ theme }) => theme.colors.darkBrown}, #050303);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const PanelTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const PanelHint = styled.p`
  margin: 6px 0 0;
  color: rgba(255,249,242,0.62);
  font-size: 12px;
`;

const Filters = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const Input = styled.input`
  flex: 1 1 260px;
  padding: 11px 13px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.45);
  color: ${({ theme }) => theme.colors.white};
`;

const Select = styled.select`
  padding: 11px 13px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.5);
  color: ${({ theme }) => theme.colors.white};
`;

const Table = styled.div`
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.08);
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.75fr 1.2fr 0.8fr 0.8fr 1fr;
  gap: 10px;
  padding: 12px;
  background: rgba(214,182,159,0.13);
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;

  @media (max-width: 760px) {
    display: none;
  }
`;

const TableBody = styled.div`
  max-height: 580px;
  overflow: auto;
`;

const TableRow = styled.button`
  all: unset;
  width: 100%;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1.1fr 0.75fr 1.2fr 0.8fr 0.8fr 1fr;
  gap: 10px;
  padding: 13px 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: ${({ $selected }) =>
    $selected ? "rgba(214,182,159,0.16)" : "transparent"};

  &:hover {
    background: rgba(214,182,159,0.12);
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  overflow-wrap: anywhere;
`;

const Status = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 900;
`;

const TypeBadge = styled.span`
  width: fit-content;
  padding: 5px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(214, 182, 159, 0.14);
  border: 1px solid rgba(214, 182, 159, 0.28);
  color: ${({ theme }) => theme.colors.lightBrown};
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
`;

const Muted = styled.span`
  color: rgba(255,249,242,0.62);
`;

const Empty = styled.div`
  padding: 22px;
  text-align: center;
  color: rgba(255,249,242,0.64);
`;

const ErrorText = styled.div`
  margin-top: 12px;
  color: #ffb4b4;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const DetailCard = styled.div`
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0,0,0,0.26);
  border: 1px solid rgba(255,255,255,0.07);
`;

const DetailFull = styled(DetailCard)`
  grid-column: 1 / -1;
`;

const Label = styled.div`
  margin-bottom: 5px;
  color: rgba(255,249,242,0.54);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const Value = styled.div`
  line-height: 1.55;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  resize: vertical;
  box-sizing: border-box;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.45);
  color: ${({ theme }) => theme.colors.white};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const PrimaryButton = styled.button`
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 11px 16px;
  cursor: pointer;
  font-weight: 900;
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
`;

const DangerButton = styled(PrimaryButton)`
  background: linear-gradient(135deg, #ff5252, #8f1111);
  color: white;
`;

const GhostButton = styled(PrimaryButton)`
  background: rgba(0,0,0,0.55);
  color: ${({ theme }) => theme.colors.white};
`;