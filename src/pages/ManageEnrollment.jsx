// src/pages/admin/ManageEnrollment.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import apiClient from "../lib/apiClient";
import theme from "../Styles/theme";

const EMPTY_FORM = {
  user: "",
  course: "",
  pricePaid: 0,
  currency: "USD",
  paymentPlan: "one-time",
  paymentStatus: "paid",
  status: "active",
  accessType: "admin",
  progressPercent: 0,
  rating: "",
  review: "",
  expiresAt: "",
};

const paymentPlans = ["one-time", "monthly", "yearly", "lifetime", "free"];
const paymentStatuses = ["pending", "paid", "failed", "refunded"];
const statuses = ["active", "completed", "cancelled", "expired"];
const accessTypes = ["single-course", "free", "admin"];

const getId = (value) => value?._id || value?.id || value || "";

const getUserLabel = (user) =>
  user?.name || user?.fullName || user?.email || getId(user) || "Unknown user";

const getCourseLabel = (course) =>
  course?.title || course?.name || getId(course) || "Unknown course";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const normalizeEnrollment = (item = {}) => ({
  ...item,
  _id: getId(item),
  userId: getId(item.user),
  courseId: getId(item.course),
  userLabel: getUserLabel(item.user),
  courseLabel: getCourseLabel(item.course),
});

export default function ManageEnrollment() {
  const [enrollments, setEnrollments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEditing = Boolean(editingId);

  const filteredEnrollments = useMemo(() => {
    const search = query.trim().toLowerCase();

    return enrollments.filter((item) => {
      const matchesSearch =
        !search ||
        item.userLabel.toLowerCase().includes(search) ||
        item.courseLabel.toLowerCase().includes(search) ||
        String(item.paymentPlan || "").toLowerCase().includes(search) ||
        String(item.accessType || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesPayment =
        paymentFilter === "all" || item.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [enrollments, query, statusFilter, paymentFilter]);

  const stats = useMemo(
    () => ({
      total: enrollments.length,
      active: enrollments.filter((e) => e.status === "active").length,
      completed: enrollments.filter((e) => e.status === "completed").length,
      paid: enrollments.filter((e) => e.paymentStatus === "paid").length,
    }),
    [enrollments]
  );

  async function fetchEnrollments() {
    try {
      setLoading(true);
      setError("");

      const res = await apiClient.get("/enrollments/admin/manage");
      const list =
        res.data?.data || res.data?.enrollments || res.data?.items || [];

      setEnrollments(Array.isArray(list) ? list.map(normalizeEnrollment) : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load enrollments. Admin manage route may be missing."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEnrollments();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId("");
    setMessage("");
    setError("");
  }

  function startEdit(enrollment) {
    setEditingId(enrollment._id);

    setForm({
      user: enrollment.userId || "",
      course: enrollment.courseId || "",
      pricePaid: Number(enrollment.pricePaid || 0),
      currency: enrollment.currency || "USD",
      paymentPlan: enrollment.paymentPlan || "one-time",
      paymentStatus: enrollment.paymentStatus || "paid",
      status: enrollment.status || "active",
      accessType: enrollment.accessType || "admin",
      progressPercent: Number(enrollment.progressPercent || 0),
      rating: enrollment.rating || "",
      review: enrollment.review || "",
      expiresAt: enrollment.expiresAt
        ? new Date(enrollment.expiresAt).toISOString().slice(0, 10)
        : "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload() {
  const basePayload = {
    pricePaid: Math.max(0, Number(form.pricePaid || 0)),
    currency: String(form.currency || "USD").trim().toUpperCase(),
    paymentPlan: form.paymentPlan,
    paymentStatus: form.paymentStatus,
    status: form.status,
    accessType: form.accessType,
    progressPercent: Math.min(
      100,
      Math.max(0, Number(form.progressPercent || 0))
    ),
    rating: form.rating ? Number(form.rating) : null,
    review: String(form.review || "").trim().slice(0, 1000),
    expiresAt: form.expiresAt || null,
  };

  if (isEditing) {
    return basePayload;
  }

  return {
    ...basePayload,
    user: form.user.trim(),
    course: form.course.trim(),
  };
}

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = buildPayload();

    if (!isEditing && (!payload.user || !payload.course)) {
  setError("User ID and Course ID are required.");
  return;
}

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (isEditing) {
        await apiClient.put(`/enrollments/${editingId}`, payload);
        setMessage("Enrollment updated successfully.");
      } else {
        await apiClient.post("/enrollments", payload);
        setMessage("Enrollment created successfully.");
      }

      resetForm();
      await fetchEnrollments();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to save enrollment. Check backend validation."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this enrollment and remove course access?")) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");
      setMessage("");

      await apiClient.delete(`/enrollments/${id}`);

      setMessage("Enrollment deleted successfully.");
      await fetchEnrollments();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to delete enrollment. Delete route may be missing."
      );
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
            <Title>Manage Enrollments</Title>
            <HeroText>
              Create, update, monitor, and protect course access from one
              premium enterprise command center.
            </HeroText>
          </div>

          <RefreshButton type="button" onClick={fetchEnrollments}>
            Refresh
          </RefreshButton>
        </Hero>

        <StatsGrid>
          <StatCard><strong>{stats.total}</strong><span>Total</span></StatCard>
          <StatCard><strong>{stats.active}</strong><span>Active</span></StatCard>
          <StatCard><strong>{stats.completed}</strong><span>Completed</span></StatCard>
          <StatCard><strong>{stats.paid}</strong><span>Paid</span></StatCard>
        </StatsGrid>

        {(message || error) && (
          <Alert $error={Boolean(error)}>{error || message}</Alert>
        )}

        <Panel>
          <PanelHeader>
            <h2>{isEditing ? "Edit Enrollment" : "Create Manual Enrollment"}</h2>
            <p>Use valid MongoDB ObjectIds for user and course.</p>
          </PanelHeader>

          <Form onSubmit={handleSubmit}>
            <Field>
  <label>User ID</label>
  <input
    name="user"
    value={form.user}
    onChange={handleChange}
    required
    disabled={isEditing}
  />
</Field>

<Field>
  <label>Course ID</label>
  <input
    name="course"
    value={form.course}
    onChange={handleChange}
    required
    disabled={isEditing}
  />
</Field>

            <Field>
              <label>Price Paid</label>
              <input name="pricePaid" type="number" min="0" value={form.pricePaid} onChange={handleChange} />
            </Field>

            <Field>
              <label>Currency</label>
              <input name="currency" maxLength="10" value={form.currency} onChange={handleChange} />
            </Field>

            <Field>
              <label>Payment Plan</label>
              <select name="paymentPlan" value={form.paymentPlan} onChange={handleChange}>
                {paymentPlans.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>

            <Field>
              <label>Payment Status</label>
              <select name="paymentStatus" value={form.paymentStatus} onChange={handleChange}>
                {paymentStatuses.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>

            <Field>
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                {statuses.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>

            <Field>
              <label>Access Type</label>
              <select name="accessType" value={form.accessType} onChange={handleChange}>
                {accessTypes.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>

            <Field>
              <label>Progress %</label>
              <input name="progressPercent" type="number" min="0" max="100" value={form.progressPercent} onChange={handleChange} />
            </Field>

            <Field>
              <label>Rating</label>
              <input name="rating" type="number" min="1" max="5" value={form.rating} onChange={handleChange} placeholder="Optional" />
            </Field>

            <Field>
              <label>Expires At</label>
              <input name="expiresAt" type="date" value={form.expiresAt} onChange={handleChange} />
            </Field>

            <Field $full>
              <label>Review</label>
              <textarea name="review" value={form.review} onChange={handleChange} maxLength="1000" placeholder="Optional review..." />
            </Field>

            <Actions>
              <PrimaryButton disabled={saving}>
                {saving ? "Saving..." : isEditing ? "Update Enrollment" : "Create Enrollment"}
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
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search user, course, plan..." />

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {statuses.map((x) => <option key={x}>{x}</option>)}
            </select>

            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
              <option value="all">All Payments</option>
              {paymentStatuses.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Toolbar>

          {loading ? (
            <Muted>Loading enrollments...</Muted>
          ) : filteredEnrollments.length === 0 ? (
            <Muted>No enrollments found.</Muted>
          ) : (
            <TableWrap>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Access</th>
                    <th>Progress</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEnrollments.map((item) => (
                    <tr key={item._id}>
                      <td>{item.userLabel}</td>
                      <td>{item.courseLabel}</td>
                      <td><Badge $status={item.status}>{item.status}</Badge></td>
                      <td>{item.paymentStatus} · {item.currency} {Number(item.pricePaid || 0).toFixed(2)}</td>
                      <td>{item.accessType}</td>
                      <td>{Number(item.progressPercent || 0)}%</td>
                      <td>{formatDate(item.expiresAt)}</td>
                      <td>
                        <RowActions>
                          <SmallButton onClick={() => startEdit(item)}>Edit</SmallButton>
                          <DangerButton onClick={() => handleDelete(item._id)} disabled={deletingId === item._id}>
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
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.18), transparent 34rem),
    linear-gradient(135deg, ${theme.colors.black}, ${theme.colors.darkBrown});
  color: ${theme.colors.white};
  padding: 48px 0;
`;

const Shell = styled.div`
  width: ${theme.layout.gutter};
  max-width: ${theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled.section`
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  padding: 34px;
  border-radius: ${theme.radius.xl};
  background: linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03));
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${theme.shadow.glow};

  @media (max-width: 760px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Eyebrow = styled.p`
  color: ${theme.colors.lightBrown};
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  margin-bottom: 10px;
`;

const Title = styled.h1`
  font-size: clamp(2.1rem, 5vw, 4.3rem);
  line-height: 0.95;
  margin: 0;
`;

const HeroText = styled.p`
  color: rgba(255,255,255,0.78);
  max-width: 680px;
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
  background: ${theme.colors.ivory};
  color: ${theme.colors.darkBrown};
  border-radius: ${theme.radius.lg};
  padding: 22px;
  box-shadow: ${theme.shadow.soft};

  strong {
    display: block;
    font-size: 2rem;
  }

  span {
    color: ${theme.colors.brown};
    font-weight: 700;
  }
`;

const Panel = styled.section`
  background: rgba(255,255,255,0.075);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: ${theme.radius.xl};
  padding: 26px;
  margin-top: 24px;
  box-shadow: ${theme.shadow.hard};
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
    color: rgba(255,255,255,0.68);
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
  grid-column: ${({ $full }) => ($full ? "1 / -1" : "auto")};

  label {
    display: block;
    margin-bottom: 8px;
    color: ${theme.colors.lightBrown};
    font-weight: 800;
    font-size: 0.85rem;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: ${theme.radius.md};
    padding: 14px 15px;
    background: rgba(0,0,0,0.34);
    color: ${theme.colors.white};
    outline: none;
  }

  textarea {
    min-height: 120px;
    resize: vertical;
  }
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: 1fr 190px 190px;
  gap: 14px;
  margin-bottom: 20px;

  input,
  select {
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: ${theme.radius.md};
    padding: 14px 15px;
    background: rgba(0,0,0,0.34);
    color: ${theme.colors.white};
    outline: none;
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonBase = styled.button`
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 13px 18px;
  font-weight: 900;
  cursor: pointer;
  transition: 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
`;

const PrimaryButton = styled(ButtonBase)`
  background: ${theme.colors.lightBrown};
  color: ${theme.colors.darkBrown};
`;

const RefreshButton = styled(PrimaryButton)`
  white-space: nowrap;
`;

const GhostButton = styled(ButtonBase)`
  background: rgba(255,255,255,0.08);
  color: ${theme.colors.white};
  border: 1px solid rgba(255,255,255,0.16);
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
  border-radius: ${theme.radius.md};
  background: ${({ $error }) =>
    $error ? "rgba(255,80,80,0.14)" : "rgba(120,255,180,0.12)"};
  border: 1px solid ${({ $error }) =>
    $error ? "rgba(255,80,80,0.32)" : "rgba(120,255,180,0.28)"};
`;

const TableWrap = styled.div`
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 980px;
  }

  th,
  td {
    text-align: left;
    padding: 16px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.09);
  }

  th {
    color: ${theme.colors.lightBrown};
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  td {
    color: rgba(255,255,255,0.84);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  padding: 7px 11px;
  border-radius: ${theme.radius.pill};
  font-size: 0.78rem;
  font-weight: 900;
  background: ${({ $status }) =>
    $status === "active"
      ? "rgba(120,255,180,0.15)"
      : $status === "completed"
      ? "rgba(214,182,159,0.18)"
      : $status === "expired"
      ? "rgba(255,180,90,0.16)"
      : "rgba(255,80,80,0.14)"};
`;

const RowActions = styled.div`
  display: flex;
  gap: 8px;
`;

const Muted = styled.p`
  color: rgba(255,255,255,0.68);
`;