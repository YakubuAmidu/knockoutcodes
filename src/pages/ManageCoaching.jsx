// src/pages/ManageCoaching.jsx
import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "../components/Toast";

import { ADMIN_COACHINGS_ACTIONS } from "../reducers/adminCoaching/adminCoachingActionTypes";
import {
  fetchAdminCoachings,
  updateAdminCoaching,
  deleteAdminCoaching,
} from "../lib/adminCoachingApi";

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];
const TYPE_OPTIONS = ["", "1-on-1", "group", "online", "in-person"];

function fmtDate(iso) {
  try {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function isValidEmail(v) {
  const s = String(v || "").trim();
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function getStatusLabel(status = "pending") {
  return String(status || "pending").toLowerCase();
}

export default function ManageCoaching() {
  const { showToast } = useToast();
  const dispatch = useDispatch();

  const ui = useSelector((s) => s.adminCoachings?.ui);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useSelector((s) => s.adminCoachings?.data?.items) || [];
  const total = useSelector((s) => s.adminCoachings?.data?.total) || 0;
  const status = useSelector((s) => s.adminCoachings?.status);

  const safeUI = ui || { q: "", page: 1, limit: 20, sort: "-createdAt" };

  const [qInput, setQInput] = useState(safeUI.q || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [draft, setDraft] = useState({
    _id: "",
    createdAt: "",
    updatedAt: "",
    fullName: "",
    email: "",
    phone: "",
    coachingType: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
    status: "pending",
    adminNote: "",
  });

  const isLoading = status?.state === "loading";

  const stats = useMemo(() => {
    const list = Array.isArray(items) ? items : [];

    return {
      total: total || list.length,
      pending: list.filter((x) => getStatusLabel(x.status) === "pending").length,
      confirmed: list.filter((x) => getStatusLabel(x.status) === "confirmed").length,
      completed: list.filter((x) => getStatusLabel(x.status) === "completed").length,
      cancelled: list.filter((x) => getStatusLabel(x.status) === "cancelled").length,
    };
  }, [items, total]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const statusOk =
        statusFilter === "all" || getStatusLabel(item.status) === statusFilter;

      const typeOk =
        typeFilter === "all" ||
        String(item.coachingType || "").toLowerCase() === typeFilter;

      return statusOk && typeOk;
    });
  }, [items, statusFilter, typeFilter]);

  const coachingTypes = useMemo(() => {
    const set = new Set();

    items.forEach((item) => {
      const value = String(item.coachingType || "").trim();
      if (value) set.add(value);
    });

    return Array.from(set);
  }, [items]);

  const totalPages = useMemo(() => {
    const lim = Math.max(1, Number(safeUI.limit || 20));
    return Math.max(1, Math.ceil((total || 0) / lim));
  }, [safeUI.limit, total]);

  async function load() {
    dispatch({ type: ADMIN_COACHINGS_ACTIONS.FETCH_START });

    try {
      const data = await fetchAdminCoachings({
        page: safeUI.page,
        limit: safeUI.limit,
        q: safeUI.q,
      });

      if (!data?.success) {
        const msg = data?.message || "Failed to fetch coachings.";
        dispatch({ type: ADMIN_COACHINGS_ACTIONS.FETCH_ERROR, payload: msg });
        if (typeof showToast === "function") showToast(msg, "error");
        return;
      }

      dispatch({
        type: ADMIN_COACHINGS_ACTIONS.FETCH_SUCCESS,
        payload: { items: data.items || [], total: data.total || 0 },
      });
    } catch (err) {
      console.error("Coachings fetch error:", err?.response?.data || err);
      
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch coachings.";

      dispatch({ type: ADMIN_COACHINGS_ACTIONS.FETCH_ERROR, payload: msg });
      if (typeof showToast === "function") showToast(msg, "error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeUI.page, safeUI.limit, safeUI.q]);

  function setUI(name, value) {
    dispatch({
      type: ADMIN_COACHINGS_ACTIONS.SET_UI_FIELD,
      payload: { name, value },
    });
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    setUI("page", 1);
    setUI("q", String(qInput || "").trim());
  }

  function resetLocalFilters() {
    setQInput("");
    setStatusFilter("all");
    setTypeFilter("all");
   setUI("page", 1);
setUI("limit", 20);
setUI("sort", "-createdAt");
setUI("q", "");
  }

  function openEdit(item) {
    setDraft({
      _id: item?._id || "",
      createdAt: item?.createdAt || "",
      updatedAt: item?.updatedAt || "",
      fullName: item?.fullName || "",
      email: item?.email || "",
      phone: item?.phone || "",
      coachingType: item?.coachingType || "",
      preferredDate: item?.preferredDate || item?.date || "",
      preferredTime: item?.preferredTime || item?.time || "",
      message: item?.goals || item?.message || item?.details || "",
      status: item?.status || "pending",
      adminNote: item?.adminNote || "",
    });

    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);

    setDraft({
      _id: "",
      createdAt: "",
      updatedAt: "",
      fullName: "",
      email: "",
      phone: "",
      coachingType: "",
      preferredDate: "",
      preferredTime: "",
      message: "",
      status: "pending",
      adminNote: "",
    });
  }

  async function saveEdit() {
    const id = String(draft._id || "");
    if (!id) return;

    const nextStatus = String(draft.status || "pending").trim();

    if (!STATUS_OPTIONS.includes(nextStatus)) {
      if (typeof showToast === "function") showToast("Invalid status.", "error");
      return;
    }

    const fullName = String(draft.fullName || "").trim().slice(0, 80);
    const email = String(draft.email || "").trim().slice(0, 120);
    const phone = String(draft.phone || "").trim().slice(0, 40);

    const coachingType = String(draft.coachingType || "").trim().slice(0, 60);
    const preferredDate = String(draft.preferredDate || "").trim().slice(0, 60);
    const preferredTime = String(draft.preferredTime || "").trim().slice(0, 60);
    const message = String(draft.message || "").trim().slice(0, 1200);
    const adminNote = String(draft.adminNote || "").trim().slice(0, 500);

    if (!isValidEmail(email)) {
      if (typeof showToast === "function")
        showToast("Please enter a valid email.", "error");
      return;
    }

    const payload = {
      status: nextStatus,
      adminNote,
      fullName,
      email,
      phone,
      coachingType,
      preferredDate,
      preferredTime,
      goals: message,
    };

    setSaving(true);

    try {
      const data = await updateAdminCoaching(id, payload);

      if (!data?.success) {
        const msg = data?.message || "Update failed.";
        if (typeof showToast === "function") showToast(msg, "error");
        return;
      }

      dispatch({
        type: ADMIN_COACHINGS_ACTIONS.UPSERT_ITEM,
        payload: data.item,
      });

      if (typeof showToast === "function")
        showToast("Coaching updated.", "success");

      closeEdit();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Update failed.";

      if (typeof showToast === "function") showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    const safeId = String(id || "");
    if (!safeId) return;

    const ok = window.confirm("Delete this coaching request permanently?");
    if (!ok) return;

    setDeletingId(safeId);

    try {
      const data = await deleteAdminCoaching(safeId);

      if (!data?.success) {
        const msg = data?.message || "Delete failed.";
        if (typeof showToast === "function") showToast(msg, "error");
        return;
      }

      dispatch({ type: ADMIN_COACHINGS_ACTIONS.REMOVE_ITEM, payload: safeId });

      if (typeof showToast === "function")
        showToast("Coaching deleted.", "success");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Delete failed.";

      if (typeof showToast === "function") showToast(msg, "error");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <Page
      as={motion.main}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Shell>
        <Hero>
          <HeroCopy>
            <Kicker>KnockoutCodes Admin Coaching</Kicker>
            <Title>Elite Coaching Control Room</Title>
            <Sub>
              Manage every private coaching request with precision. Search,
              filter, confirm, complete, cancel, edit notes, and protect your
              coaching pipeline like a premium academy.
            </Sub>
          </HeroCopy>

          <HeroStatus>
            <StatusLabel>Pipeline Health</StatusLabel>
            <StatusNumber>{stats.total}</StatusNumber>
            <StatusText>Total coaching requests in this view.</StatusText>
            <Reload type="button" onClick={load} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh Requests"}
            </Reload>
          </HeroStatus>
        </Hero>

        <StatsGrid>
          <StatCard>
            <StatValue>{stats.pending}</StatValue>
            <StatName>Pending</StatName>
          </StatCard>

          <StatCard>
            <StatValue>{stats.confirmed}</StatValue>
            <StatName>Confirmed</StatName>
          </StatCard>

          <StatCard>
            <StatValue>{stats.completed}</StatValue>
            <StatName>Completed</StatName>
          </StatCard>

          <StatCard>
            <StatValue>{stats.cancelled}</StatValue>
            <StatName>Cancelled</StatName>
          </StatCard>
        </StatsGrid>

        <Panel>
          <PanelTop>
            <div>
              <PanelKicker>Request Management</PanelKicker>
              <PanelTitle>Coaching Requests</PanelTitle>
              <PanelSub>
                Showing {filteredItems.length} of {total || items.length} requests.
              </PanelSub>
            </div>

            <PanelActions>
              <SoftButton type="button" onClick={resetLocalFilters}>
                Clear Filters
              </SoftButton>
              <SoftButton type="button" onClick={load} disabled={isLoading}>
                {isLoading ? "Loading..." : "Reload"}
              </SoftButton>
            </PanelActions>
          </PanelTop>

          <FilterBar onSubmit={onSearchSubmit}>
            <SearchInput
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search name, email, phone, type, status..."
              aria-label="Search coachings"
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by coaching type"
            >
              <option value="all">All types</option>
              {coachingTypes.map((type) => (
                <option key={type} value={type.toLowerCase()}>
                  {type}
                </option>
              ))}
            </Select>

            <Select
              value={String(safeUI.limit)}
              onChange={(e) => {
                setUI("page", 1);
                setUI("limit", Number(e.target.value));
              }}
              aria-label="Rows per page"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </Select>

            <SearchBtn type="submit">Search</SearchBtn>
          </FilterBar>

          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Coaching</th>
                  <th>Preferred</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ width: 230 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <Empty>
                        {isLoading
                          ? "Loading coaching requests..."
                          : "No coaching requests found."}
                      </Empty>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => (
                    <tr key={it._id}>
                      <td>
                        <ClientCell>
                          <Avatar>
                            {(it.fullName || "KC").slice(0, 2).toUpperCase()}
                          </Avatar>
                          <div>
                            <Strong>{it.fullName || "Unnamed Client"}</Strong>
                            <Muted>ID: {String(it._id || "").slice(-8)}</Muted>
                          </div>
                        </ClientCell>
                      </td>

                      <td>
                        <Stack>
                          <span>{it.email || "—"}</span>
                          <Muted>{it.phone || "No phone"}</Muted>
                        </Stack>
                      </td>

                      <td>
                        <Stack>
                          <Strong>{it.coachingType || "General Coaching"}</Strong>
                          <Muted>
                            {(it.goals || it.message || it.details || "No message").slice(0, 58)}
{(it.goals || it.message || it.details || "").length > 58 ? "..." : ""}
                          </Muted>
                        </Stack>
                      </td>

                      <td>
                        <Stack>
                          <span>{it.preferredDate || it.date || "—"}</span>
                          <Muted>{it.preferredTime || it.time || "No time set"}</Muted>
                        </Stack>
                      </td>

                      <td>
                        <StatusBadge $status={getStatusLabel(it.status)}>
                          {getStatusLabel(it.status)}
                        </StatusBadge>
                      </td>

                      <td>{fmtDate(it.createdAt)}</td>

                      <td>
                        <ActionRow>
                          <ActionBtn type="button" onClick={() => openEdit(it)}>
                            Edit
                          </ActionBtn>

                          <DangerBtn
                            type="button"
                            onClick={() => onDelete(it._id)}
                            disabled={deletingId === String(it._id)}
                          >
                            {deletingId === String(it._id)
                              ? "Deleting..."
                              : "Delete"}
                          </DangerBtn>
                        </ActionRow>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>

          <Pager>
            <PageBtn
              type="button"
              onClick={() => setUI("page", Math.max(1, safeUI.page - 1))}
              disabled={safeUI.page <= 1 || isLoading}
            >
              Prev
            </PageBtn>

            <PageInfo>
              Page <strong>{safeUI.page}</strong> of{" "}
              <strong>{totalPages}</strong>
            </PageInfo>

            <PageBtn
              type="button"
              onClick={() => setUI("page", Math.min(totalPages, safeUI.page + 1))}
              disabled={safeUI.page >= totalPages || isLoading}
            >
              Next
            </PageBtn>
          </Pager>
        </Panel>

        <AnimatePresence>
          {editOpen && (
            <Overlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEdit}
            >
              <Modal
                as={motion.div}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ModalTop>
                  <div>
                    <ModalKicker>Private Coaching Update</ModalKicker>
                    <ModalTitle>Update Coaching Request</ModalTitle>
                    <ModalSub>
                      Edit client details, preferred schedule, status, and private
                      admin notes.
                    </ModalSub>
                  </div>

                  <X type="button" onClick={closeEdit} aria-label="Close">
                    ✕
                  </X>
                </ModalTop>

                <MetaRow>
                  <MetaPill>
                    ID <strong>{draft._id || "—"}</strong>
                  </MetaPill>
                  <MetaPill>
                    Created <strong>{fmtDate(draft.createdAt)}</strong>
                  </MetaPill>
                  <MetaPill>
                    Updated <strong>{fmtDate(draft.updatedAt)}</strong>
                  </MetaPill>
                </MetaRow>

                <Grid>
                  <Field>
                    <Label>Full Name</Label>
                    <Input
                      value={draft.fullName}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          fullName: e.target.value.slice(0, 80),
                        }))
                      }
                      placeholder="Client name"
                    />
                  </Field>

                  <Field>
                    <Label>Email</Label>
                    <Input
                      value={draft.email}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          email: e.target.value.slice(0, 120),
                        }))
                      }
                      placeholder="client@email.com"
                      inputMode="email"
                    />
                    {!isValidEmail(draft.email) ? (
                      <Warn>Enter a valid email format.</Warn>
                    ) : null}
                  </Field>

                  <Field>
                    <Label>Phone</Label>
                    <Input
                      value={draft.phone}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          phone: e.target.value.slice(0, 40),
                        }))
                      }
                      placeholder="+1 (555) 555-5555"
                      inputMode="tel"
                    />
                  </Field>

                  <Field>
                    <Label>Status</Label>
                    <Select
                      value={draft.status}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, status: e.target.value }))
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field>
                    <Label>Coaching Type</Label>
                    <TypeRow>
                      <Select
                        value={
                          TYPE_OPTIONS.includes(String(draft.coachingType || ""))
                            ? String(draft.coachingType || "")
                            : ""
                        }
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            coachingType: e.target.value,
                          }))
                        }
                      >
                        <option value="">Preset</option>
                        {TYPE_OPTIONS.filter(Boolean).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>

                      <Input
                        value={draft.coachingType}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            coachingType: e.target.value.slice(0, 60),
                          }))
                        }
                        placeholder="Custom type..."
                      />
                    </TypeRow>
                  </Field>

                  <Field>
                    <Label>Preferred Date</Label>
                    <Input
                      value={draft.preferredDate}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          preferredDate: e.target.value.slice(0, 60),
                        }))
                      }
                      placeholder="2026-01-20"
                    />
                  </Field>

                  <Field>
                    <Label>Preferred Time</Label>
                    <Input
                      value={draft.preferredTime}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          preferredTime: e.target.value.slice(0, 60),
                        }))
                      }
                      placeholder="2:30 PM PST"
                    />
                  </Field>

                  <Field style={{ gridColumn: "1 / -1" }}>
                    <Label>Client Message / Details</Label>
                    <Textarea
                      value={draft.message}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          message: e.target.value.slice(0, 1200),
                        }))
                      }
                      rows={5}
                      placeholder="Client goals, links, questions, schedule notes..."
                    />
                    <Hint>{String(draft.message || "").length}/1200</Hint>
                  </Field>

                  <Field style={{ gridColumn: "1 / -1" }}>
                    <Label>Admin Note</Label>
                    <Textarea
                      value={draft.adminNote}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          adminNote: e.target.value.slice(0, 500),
                        }))
                      }
                      rows={4}
                      placeholder="Private admin note..."
                    />
                    <Hint>{String(draft.adminNote || "").length}/500</Hint>
                  </Field>
                </Grid>

                <ModalActions>
                  <Ghost type="button" onClick={closeEdit} disabled={saving}>
                    Cancel
                  </Ghost>

                  <Primary type="button" onClick={saveEdit} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Primary>
                </ModalActions>
              </Modal>
            </Overlay>
          )}
        </AnimatePresence>
      </Shell>
    </Page>
  );
}

/* =========================
   Styled Components
========================= */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 16px 70px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.2), transparent 34%),
    radial-gradient(circle at 86% 16%, rgba(90, 56, 37, 0.36), transparent 38%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
`;

const Shell = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1200px"};
  margin: 0 auto;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 18px;
  margin-bottom: 18px;
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const HeroCopy = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(24px, 4vw, 42px);
  background:
    linear-gradient(145deg, rgba(61, 38, 26, 0.86), rgba(0, 0, 0, 0.66)),
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.16), transparent 36%);
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Kicker = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2.25rem, 5vw, 5rem);
  line-height: 0.92;
  font-weight: 950;
  letter-spacing: -0.07em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Sub = styled.p`
  max-width: 780px;
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  line-height: 1.75;
  font-size: 14px;
`;

const HeroStatus = styled.aside`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 22px;
  background: rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(214, 182, 159, 0.16);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const StatusLabel = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const StatusNumber = styled.div`
  font-size: 52px;
  line-height: 1;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.ivory};
`;

const StatusText = styled.p`
  margin: 10px 0 16px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.68;
  line-height: 1.55;
  font-size: 13px;
`;

const Reload = styled.button`
  width: 100%;
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.62;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StatCard = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 16px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.14);
`;

const StatValue = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 30px;
  font-weight: 950;
`;

const StatName = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const Panel = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background: linear-gradient(
    180deg,
    rgba(47, 27, 18, 0.96),
    rgba(0, 0, 0, 0.72)
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const PanelTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 14px;

  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

const PanelKicker = styled.p`
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const PanelSub = styled.p`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.62;
  font-size: 13px;
`;

const PanelActions = styled.div`
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
`;

const SoftButton = styled.button`
  min-height: 40px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.16);
  background: rgba(0, 0, 0, 0.26);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 14px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const FilterBar = styled.form`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 160px 160px 140px auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const inputBase = `
  width: 100%;
  min-height: 44px;
  background: rgba(0,0,0,0.32);
  border: 1px solid rgba(255,249,242,0.14);
  border-radius: 16px;
  color: #FFF9F2;
  padding: 0 14px;
  outline: none;
  transition: 180ms ease;

  &:focus {
    border-color: rgba(214,182,159,0.65);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.1);
  }

  &::placeholder {
    color: rgba(255,249,242,0.48);
  }
`;

const SearchInput = styled.input`${inputBase}`;
const Select = styled.select`${inputBase}`;
const Input = styled.input`${inputBase}`;

const Textarea = styled.textarea`
  ${inputBase}
  min-height: 110px;
  resize: vertical;
  padding: 12px 14px;
`;

const SearchBtn = styled.button`
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  padding: 0 18px;
  cursor: pointer;
`;

const TableWrap = styled.div`
  overflow: auto;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 249, 242, 0.09);
  background: rgba(0, 0, 0, 0.28);
`;

const Table = styled.table`
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;

  th,
  td {
    padding: 13px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 249, 242, 0.08);
    font-size: 13px;
    vertical-align: top;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: rgba(0, 0, 0, 0.88);
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  tbody tr:hover td {
    background: rgba(214, 182, 159, 0.04);
  }
`;

const ClientCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  font-size: 12px;
  font-weight: 950;
`;

const Stack = styled.div`
  display: grid;
  gap: 4px;
`;

const Strong = styled.strong`
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.62;
  font-size: 12px;
`;

const Empty = styled.div`
  padding: 20px 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.76;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 11px;
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.08em;

  ${({ $status, theme }) =>
    $status === "confirmed"
      ? `border-color: rgba(214,182,159,0.55); color: ${theme.colors.lightBrown};`
      : $status === "completed"
      ? "border-color: rgba(130,255,180,0.35);"
      : $status === "cancelled"
      ? "border-color: rgba(255,120,120,0.38); color: #ffb4b4;"
      : ""}
`;

const ActionRow = styled.div`
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  min-height: 38px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.16);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 12px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
`;

const DangerBtn = styled(ActionBtn)`
  border-color: rgba(255, 120, 120, 0.34);
  color: #ffb4b4;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const Pager = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  padding-top: 16px;
`;

const PageBtn = styled.button`
  min-height: 40px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.16);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 14px;
  cursor: pointer;
  font-weight: 900;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(10px);
`;

const Modal = styled.div`
  width: min(860px, 100%);
  max-height: 92vh;
  overflow: auto;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.darkBrown},
    ${({ theme }) => theme.colors.black}
  );
  border: 1px solid rgba(255, 249, 242, 0.13);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 20px;
`;

const ModalTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
`;

const ModalKicker = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const ModalSub = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  line-height: 1.55;
`;

const X = styled.button`
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.16);
  background: rgba(0, 0, 0, 0.32);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
`;

const MetaRow = styled.div`
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaPill = styled.div`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.15);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Grid = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;

  @media (max-width: 740px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 8px;
`;

const Label = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Hint = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.6;
  font-size: 12px;
`;

const Warn = styled.div`
  color: #ffb4b4;
  font-size: 12px;
`;

const TypeRow = styled.div`
  display: grid;
  grid-template-columns: 190px 1fr;
  gap: 10px;

  @media (max-width: 740px) {
    grid-template-columns: 1fr;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const Ghost = styled.button`
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Primary = styled.button`
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  cursor: pointer;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

