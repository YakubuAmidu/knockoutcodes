// src/pages/admin/ManageUserSubscription.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import { useToast } from "../components/Toast";
import apiClient from "../lib/apiClient";

const EMPTY_FORM = {
  user: "",
  membership: "",
  membershipId: "beginner",
  accessLevel: "beginner",
  billingPeriod: "monthly",
  status: "active",
  stripeCustomerId: "",
  stripeSubscriptionId: "",
  stripePriceId: "",
  currentPeriodStart: "",
  currentPeriodEnd: "",
  cancelAtPeriodEnd: false,
};

const levels = ["beginner", "intermediate", "advance", "complete"];
const billingPeriods = ["monthly", "yearly"];
const statuses = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
];

const getId = (value) => value?._id || value?.id || value || "";

const getUserLabel = (user) =>
  user?.name || user?.fullName || user?.email || getId(user) || "Unknown user";

const getMembershipLabel = (membership) =>
  membership?.title ||
  membership?.name ||
  membership?.membershipId ||
  membership?.accessLevel ||
  getId(membership) ||
  "Unknown membership";

const toDateInput = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const normalizeSub = (item = {}) => ({
  ...item,
  _id: getId(item),
  userId: getId(item.user),
  membershipObjectId: getId(item.membership),
  userLabel: getUserLabel(item.user),
  membershipLabel: getMembershipLabel(item.membership),
});

export default function ManageUserSubscription() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { showToast } = useToast();

  const isEditing = Boolean(editingId);

  const filteredSubscriptions = useMemo(() => {
    const search = query.trim().toLowerCase();

    return subscriptions.filter((item) => {
      const matchesSearch =
        !search ||
        item.userLabel.toLowerCase().includes(search) ||
        item.membershipLabel.toLowerCase().includes(search) ||
        String(item.membershipId || "")
          .toLowerCase()
          .includes(search) ||
        String(item.accessLevel || "")
          .toLowerCase()
          .includes(search) ||
        String(item.stripeCustomerId || "")
          .toLowerCase()
          .includes(search) ||
        String(item.stripeSubscriptionId || "")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesLevel =
        levelFilter === "all" || item.accessLevel === levelFilter;

      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [subscriptions, query, statusFilter, levelFilter]);

  const stats = useMemo(
    () => ({
      total: subscriptions.length,
      active: subscriptions.filter((s) =>
        ["active", "trialing"].includes(s.status),
      ).length,
      canceled: subscriptions.filter((s) => s.status === "canceled").length,
      canceling: subscriptions.filter((s) => s.cancelAtPeriodEnd).length,
    }),
    [subscriptions],
  );

  const fetchSubscriptions = useCallback(
    async ({ notify = false } = {}) => {
      try {
        setLoading(true);
        setError("");

        const res = await apiClient.get("/subscriptions/admin/manage");

        const list =
          res.data?.data || res.data?.subscriptions || res.data?.items || [];

        setSubscriptions(Array.isArray(list) ? list.map(normalizeSub) : []);

        if (notify) {
          showToast("Subscriptions refreshed successfully.", "success");
        }
      } catch (err) {
        const errorMessage =
          err?.response?.data?.message ||
          "Failed to load subscriptions. Admin manage route may be missing.";

        setError(errorMessage);

        if (notify) {
          showToast(errorMessage, "error");
        }
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  function handleRefresh() {
    fetchSubscriptions({ notify: true });
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId("");
    setMessage("");
    setError("");
  }

  function startEdit(sub) {
    setEditingId(sub._id);

    setForm({
      user: sub.userId || "",
      membership: sub.membershipObjectId || "",
      membershipId: sub.membershipId || "beginner",
      accessLevel: sub.accessLevel || sub.membershipId || "beginner",
      billingPeriod: sub.billingPeriod || "monthly",
      status: sub.status || "active",
      stripeCustomerId: sub.stripeCustomerId || "",
      stripeSubscriptionId: sub.stripeSubscriptionId || "",
      stripePriceId: sub.stripePriceId || "",
      currentPeriodStart: toDateInput(sub.currentPeriodStart),
      currentPeriodEnd: toDateInput(sub.currentPeriodEnd),
      cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload() {
    const basePayload = {
      membershipId: form.membershipId,
      accessLevel: form.accessLevel || form.membershipId,
      billingPeriod: form.billingPeriod,
      status: form.status,
      stripeCustomerId: String(form.stripeCustomerId || "").trim(),
      stripeSubscriptionId: String(form.stripeSubscriptionId || "").trim(),
      stripePriceId: String(form.stripePriceId || "").trim(),
      currentPeriodStart: form.currentPeriodStart || null,
      currentPeriodEnd: form.currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(form.cancelAtPeriodEnd),
    };

    if (isEditing) {
      return basePayload;
    }

    return {
      ...basePayload,
      user: form.user.trim(),
      membership: form.membership.trim(),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = buildPayload();

    if (!isEditing && (!payload.user || !payload.membership)) {
      setError("User ID and Membership ID are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (isEditing) {
        await apiClient.put(`/subscriptions/${editingId}`, payload);

        setMessage("Subscription updated successfully.");

        showToast("Subscription updated successfully.", "success");
      } else {
        await apiClient.post("/subscriptions/admin/manage", payload);

        setMessage("Subscription created successfully.");

        showToast("Subscription created successfully.", "success");
      }

      resetForm();
      await fetchSubscriptions();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        "Failed to save subscription. Check backend validation.";

      setError(errorMessage);

      showToast.error?.(errorMessage) ||
        showToast.show?.(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this user subscription?")) return;

    try {
      setDeletingId(id);
      setError("");
      setMessage("");

      await apiClient.delete(`/subscriptions/${id}`);

      setMessage("Subscription deleted successfully.");

      showToast("Subscription deleted successfully.", "success");
      await fetchSubscriptions();
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || "Failed to delete subscription.";

      setError(errorMessage);

      showToast(errorMessage, "error");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <Page>
      <Shell>
        <Hero>
          <div>
            <Eyebrow>KnockoutCodes Admin</Eyebrow>
            <Title>Manage User Subscriptions</Title>
            <HeroText>
              Control memberships, billing status, access levels, Stripe links,
              and cancellation state with enterprise precision.
            </HeroText>
          </div>

          <RefreshButton type="button" onClick={handleRefresh}>
            Refresh
          </RefreshButton>
        </Hero>

        <StatsGrid>
          <StatCard>
            <strong>{stats.total}</strong>
            <span>Total</span>
          </StatCard>
          <StatCard>
            <strong>{stats.active}</strong>
            <span>Active</span>
          </StatCard>
          <StatCard>
            <strong>{stats.canceled}</strong>
            <span>Canceled</span>
          </StatCard>
          <StatCard>
            <strong>{stats.canceling}</strong>
            <span>Ending Soon</span>
          </StatCard>
        </StatsGrid>

        {(message || error) && (
          <Alert $error={Boolean(error)}>{error || message}</Alert>
        )}

        <Panel>
          <PanelHeader>
            <h2>
              {isEditing ? "Edit Subscription" : "Create Manual Subscription"}
            </h2>
            <p>
              Use this carefully. Stripe-created subscriptions should match
              Stripe records.
            </p>
          </PanelHeader>

          <Form onSubmit={handleSubmit}>
            <Field>
              <label>User ID</label>
              <input
                name="user"
                value={form.user}
                onChange={handleChange}
                disabled={isEditing}
                required={!isEditing}
              />
            </Field>

            <Field>
              <label>Membership ObjectId</label>
              <input
                name="membership"
                value={form.membership}
                onChange={handleChange}
                disabled={isEditing}
                required={!isEditing}
              />
            </Field>

            <Field>
              <label>Membership Level</label>
              <select
                name="membershipId"
                value={form.membershipId}
                onChange={handleChange}
              >
                {levels.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>

            <Field>
              <label>Access Level</label>
              <select
                name="accessLevel"
                value={form.accessLevel}
                onChange={handleChange}
              >
                {levels.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>

            <Field>
              <label>Billing Period</label>
              <select
                name="billingPeriod"
                value={form.billingPeriod}
                onChange={handleChange}
              >
                {billingPeriods.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>

            <Field>
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                {statuses.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>

            <Field>
              <label>Stripe Customer ID</label>
              <input
                name="stripeCustomerId"
                value={form.stripeCustomerId}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <label>Stripe Subscription ID</label>
              <input
                name="stripeSubscriptionId"
                value={form.stripeSubscriptionId}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <label>Stripe Price ID</label>
              <input
                name="stripePriceId"
                value={form.stripePriceId}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <label>Period Start</label>
              <input
                name="currentPeriodStart"
                type="date"
                value={form.currentPeriodStart}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <label>Period End</label>
              <input
                name="currentPeriodEnd"
                type="date"
                value={form.currentPeriodEnd}
                onChange={handleChange}
              />
            </Field>

            <CheckField>
              <input
                name="cancelAtPeriodEnd"
                type="checkbox"
                checked={form.cancelAtPeriodEnd}
                onChange={handleChange}
              />
              <span>Cancel at period end</span>
            </CheckField>

            <Actions>
              <PrimaryButton disabled={saving}>
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Subscription"
                    : "Create Subscription"}
              </PrimaryButton>

              {isEditing && (
                <GhostButton type="button" onClick={resetForm}>
                  Cancel
                </GhostButton>
              )}
            </Actions>
          </Form>
        </Panel>

        <Panel>
          <Toolbar>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search user, level, Stripe ID..."
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {statuses.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="all">All Levels</option>
              {levels.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Toolbar>

          {loading ? (
            <Muted>Loading subscriptions...</Muted>
          ) : filteredSubscriptions.length === 0 ? (
            <Muted>No subscriptions found.</Muted>
          ) : (
            <TableWrap>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Membership</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Billing</th>
                    <th>Period End</th>
                    <th>Canceling</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSubscriptions.map((item) => (
                    <tr key={item._id}>
                      <td>{item.userLabel}</td>
                      <td>{item.membershipLabel}</td>
                      <td>{item.accessLevel}</td>
                      <td>
                        <Badge $status={item.status}>{item.status}</Badge>
                      </td>
                      <td>{item.billingPeriod}</td>
                      <td>{formatDate(item.currentPeriodEnd)}</td>
                      <td>{item.cancelAtPeriodEnd ? "Yes" : "No"}</td>
                      <td>
                        <RowActions>
                          <SmallButton onClick={() => startEdit(item)}>
                            Edit
                          </SmallButton>
                          <DangerButton
                            onClick={() => handleDelete(item._id)}
                            disabled={deletingId === item._id}
                          >
                            {deletingId === item._id ? "Deleting..." : "Delete"}
                          </DangerButton>
                        </RowActions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>
      </Shell>
    </Page>
  );
}

const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      transparent 34rem
    ),
    linear-gradient(
      135deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown}
    );
  color: ${({ theme }) => theme.colors.white};
  padding: 48px 0;
`;

const Shell = styled.div`
  width: ${({ theme }) => theme.colors.gutter};
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled.section`
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  padding: 34px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.09),
    rgba(255, 255, 255, 0.03)
  );
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};

  @media (max-width: 760px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Eyebrow = styled.p`
  color: ${({ theme }) => theme.colors.lightBrown};
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  margin-bottom: 10px;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 4.1rem);
  line-height: 0.95;
  margin: 0;
`;

const HeroText = styled.p`
  color: rgba(255, 255, 255, 0.78);
  max-width: 720px;
  margin-top: 14px;
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 24px 0;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.ivory};
  color: ${({ theme }) => theme.colors.darkBrown};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 22px;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  strong {
    display: block;
    font-size: 2rem;
  }

  span {
    color: ${({ theme }) => theme.colors.brown};
    font-weight: 800;
  }
`;

const Panel = styled.section`
  background: rgba(255, 255, 255, 0.075);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 26px;
  margin-top: 24px;
  box-shadow: ${({ theme }) => theme.shadow.hard};
  backdrop-filter: blur(14px);
`;

const PanelHeader = styled.div`
  margin-bottom: 22px;

  h2 {
    margin: 0;
    font-size: 1.45rem;
  }

  p {
    margin: 8px 0 0;
    color: rgba(255, 255, 255, 0.68);
  }
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  label {
    display: block;
    margin-bottom: 8px;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 800;
    font-size: 0.85rem;
  }

  input,
  select {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: ${({ theme }) => theme.radius.md};
    padding: 14px 15px;
    background: rgba(0, 0, 0, 0.34);
    color: ${({ theme }) => theme.colors.white};
    outline: none;
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CheckField = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 28px;
  color: ${({ theme }) => theme.colors.white};
  font-weight: 800;

  input {
    width: 18px;
    height: 18px;
  }
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: 1fr 190px 190px;
  gap: 14px;
  margin-bottom: 20px;

  input,
  select {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: ${({ theme }) => theme.radius.md};
    padding: 14px 15px;
    background: rgba(0, 0, 0, 0.34);
    color: ${({ theme }) => theme.colors.white};
    outline: none;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonBase = styled.button`
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 13px 18px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.25s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    opacity: 0.9;
  }

  &:active:not(:disabled) {
    transform: translateY(2px) scale(0.98);
    opacity: 0.8;
  }
`;

const PrimaryButton = styled(ButtonBase)`
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.darkBrown};
`;

const RefreshButton = styled(PrimaryButton)`
  white-space: nowrap;
`;

const GhostButton = styled(ButtonBase)`
  background: rgba(255, 255, 255, 0.08);
  color: ${({ theme }) => theme.colors.white};
  border: 1px solid rgba(255, 255, 255, 0.16);
`;

const SmallButton = styled(GhostButton)`
  padding: 9px 13px;
`;

const DangerButton = styled(SmallButton)`
  background: rgba(255, 70, 70, 0.14);
  color: #ffd5d5;
`;

const Actions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const Alert = styled.div`
  margin: 22px 0;
  padding: 15px 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $error }) =>
    $error ? "rgba(255,80,80,0.14)" : "rgba(120,255,180,0.12)"};
  border: 1px solid
    ${({ $error }) =>
      $error ? "rgba(255,80,80,0.32)" : "rgba(120,255,180,0.28)"};
`;

const TableWrap = styled.div`
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1050px;
  }

  th,
  td {
    text-align: left;
    padding: 16px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  }

  th {
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  td {
    color: rgba(255, 255, 255, 0.84);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.78rem;
  font-weight: 900;
  background: ${({ $status }) =>
    ["active", "trialing"].includes($status)
      ? "rgba(120,255,180,0.15)"
      : $status === "canceled"
        ? "rgba(255,80,80,0.14)"
        : "rgba(255,180,90,0.16)"};
`;

const RowActions = styled.div`
  display: flex;
  gap: 8px;
`;

const Muted = styled.p`
  color: rgba(255, 255, 255, 0.68);
`;
