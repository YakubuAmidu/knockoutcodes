// src/pages/admin/AdminCoachings.jsx
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
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
const TYPE_OPTIONS = ["", "1-on-1", "group", "online", "in-person"]; // safe defaults (admin can still type custom)

function fmtDate(iso) {
  try {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function isValidEmail(v) {
  const s = String(v || "").trim();
  if (!s) return true; // allow blank
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function AdminCoachings() {
  const { showToast } = useToast();
  const dispatch = useDispatch();

  const ui = useSelector((s) => s.adminCoachings?.ui);
  const items = useSelector((s) => s.adminCoachings?.data?.items) || [];
  const total = useSelector((s) => s.adminCoachings?.data?.total) || 0;
  const status = useSelector((s) => s.adminCoachings?.status);

  const safeUI = ui || { q: "", page: 1, limit: 20, sort: "-createdAt" };

  const [qInput, setQInput] = useState(safeUI.q || "");
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  // ✅ now supports editing “user coaching info” + admin note + status
  const [draft, setDraft] = useState({
    _id: "",
    createdAt: "",
    updatedAt: "",

    // user info
    fullName: "",
    email: "",
    phone: "",

    // coaching info
    coachingType: "",
    preferredDate: "", // string (safe)
    preferredTime: "", // string (safe)
    message: "", // what the user asked / details

    // admin fields
    status: "pending",
    adminNote: "",
  });

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

  function openEdit(item) {
    setDraft({
      _id: item?._id || "",
      createdAt: item?.createdAt || "",
      updatedAt: item?.updatedAt || "",

      fullName: item?.fullName || "",
      email: item?.email || "",
      phone: item?.phone || "",

      coachingType: item?.coachingType || "",
      preferredDate: item?.preferredDate || item?.date || "", // tolerate different schema keys
      preferredTime: item?.preferredTime || item?.time || "",
      message: item?.message || item?.details || "",

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

    // ✅ payload includes editable “user coaching info” + status + adminNote
    const payload = {
      status: nextStatus,
      adminNote,

      fullName,
      email,
      phone,

      coachingType,
      preferredDate,
      preferredTime,
      message,
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
    <Wrap
      as={motion.main}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Top>
        <div>
          <Kicker>ADMIN • COACHING</Kicker>
          <Title>Elite Coaching Requests</Title>
          <Sub>
            Edit coaching details, update status, add admin notes, and delete —
            everything reflects in the database.
          </Sub>
        </div>

        <Right>
          <Pill>
            Total: <strong>{total}</strong>
          </Pill>
          <Reload onClick={load} disabled={status?.state === "loading"}>
            {status?.state === "loading" ? "Refreshing…" : "Refresh"}
          </Reload>
        </Right>
      </Top>

      <Panel>
        <SearchRow onSubmit={onSearchSubmit}>
          <SearchInput
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search name, email, phone, type, status…"
            aria-label="Search coachings"
          />
          <SearchBtn type="submit">Search</SearchBtn>

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
        </SearchRow>

        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <Empty>
                      {status?.state === "loading"
                        ? "Loading coachings…"
                        : "No coaching requests found."}
                    </Empty>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it._id}>
                    <td>{fmtDate(it.createdAt)}</td>
                    <td>{it.fullName || "—"}</td>
                    <td>{it.email || "—"}</td>
                    <td>{it.phone || "—"}</td>
                    <td>{it.coachingType || "—"}</td>
                    <td>
                      <StatusBadge $status={it.status || "pending"}>
                        {it.status || "pending"}
                      </StatusBadge>
                    </td>
                    <td>
                      <ActionRow>
                        <ActionBtn onClick={() => openEdit(it)}>
                          Edit / Update
                        </ActionBtn>
                        <DangerBtn
                          onClick={() => onDelete(it._id)}
                          disabled={deletingId === String(it._id)}
                        >
                          {deletingId === String(it._id)
                            ? "Deleting…"
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
            onClick={() => setUI("page", Math.max(1, safeUI.page - 1))}
            disabled={safeUI.page <= 1 || status?.state === "loading"}
          >
            Prev
          </PageBtn>

          <PageInfo>
            Page <strong>{safeUI.page}</strong> of{" "}
            <strong>{totalPages}</strong>
          </PageInfo>

          <PageBtn
            onClick={() => setUI("page", Math.min(totalPages, safeUI.page + 1))}
            disabled={safeUI.page >= totalPages || status?.state === "loading"}
          >
            Next
          </PageBtn>
        </Pager>
      </Panel>

      {/* =======================
          Edit Modal
      ======================= */}
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
                  <ModalTitle>Update Coaching</ModalTitle>
                  <ModalSub>
                    Edit user info + coaching details, update status, and add an
                    admin note (private).
                  </ModalSub>
                </div>
                <X onClick={closeEdit} aria-label="Close">
                  ✕
                </X>
              </ModalTop>

              <MetaRow>
                <MetaPill>
                  ID: <strong>{draft._id || "—"}</strong>
                </MetaPill>
                <MetaPill>
                  Created: <strong>{fmtDate(draft.createdAt)}</strong>
                </MetaPill>
                <MetaPill>
                  Updated: <strong>{fmtDate(draft.updatedAt)}</strong>
                </MetaPill>
              </MetaRow>

              <Grid>
                <Field>
                  <Label>Full name</Label>
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
                  <Label>Coaching type</Label>
                  <TypeRow>
                    <Select
                      value={
                        TYPE_OPTIONS.includes(String(draft.coachingType || ""))
                          ? String(draft.coachingType || "")
                          : ""
                      }
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, coachingType: e.target.value }))
                      }
                      aria-label="Coaching type preset"
                      title="Choose a preset or type your own"
                    >
                      <option value="">— preset —</option>
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
                      placeholder="Or type a custom coaching type…"
                      aria-label="Custom coaching type"
                    />
                  </TypeRow>
                </Field>

                <Field>
                  <Label>Preferred date</Label>
                  <Input
                    value={draft.preferredDate}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        preferredDate: e.target.value.slice(0, 60),
                      }))
                    }
                    placeholder="e.g., 2026-01-20"
                  />
                </Field>

                <Field>
                  <Label>Preferred time</Label>
                  <Input
                    value={draft.preferredTime}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        preferredTime: e.target.value.slice(0, 60),
                      }))
                    }
                    placeholder="e.g., 2:30 PM PST"
                  />
                </Field>

                <Field style={{ gridColumn: "1 / -1" }}>
                  <Label>Client message / details</Label>
                  <Textarea
                    value={draft.message}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        message: e.target.value.slice(0, 1200),
                      }))
                    }
                    rows={5}
                    placeholder="What the client requested, goals, links, questions, etc."
                  />
                  <Hint>{String(draft.message || "").length}/1200</Hint>
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
                  <Label>Admin note (private)</Label>
                  <Input
                    value={draft.adminNote}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        adminNote: e.target.value.slice(0, 500),
                      }))
                    }
                    placeholder="Quick note… (you can also write a longer note below)"
                  />
                </Field>

                <Field style={{ gridColumn: "1 / -1" }}>
                  <Label>Admin note (long)</Label>
                  <Textarea
                    value={draft.adminNote}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        adminNote: e.target.value.slice(0, 500),
                      }))
                    }
                    rows={4}
                    placeholder="Example: Called client, confirmed for Friday. Sent Google Meet link."
                  />
                  <Hint>{String(draft.adminNote || "").length}/500</Hint>
                </Field>
              </Grid>

              <ModalActions>
                <Ghost onClick={closeEdit} disabled={saving}>
                  Cancel
                </Ghost>
                <Primary onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </Primary>
              </ModalActions>
            </Modal>
          </Overlay>
        )}
      </AnimatePresence>
    </Wrap>
  );
}

/* =========================
   Styled (Luxury Brown Palette)
========================= */

const Wrap = styled.div`
  padding: 26px 22px 70px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Top = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
`;

const Kicker = styled.div`
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 12px;
  opacity: 0.78;
`;

const Title = styled.h1`
  margin: 8px 0 6px;
  font-size: clamp(28px, 3.4vw, 42px);
  letter-spacing: -0.02em;
`;

const Sub = styled.p`
  margin: 0;
  opacity: 0.9;
  max-width: 760px;
  line-height: 1.65;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Pill = styled.div`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Reload = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  transition: 180ms ease;
  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.08);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Panel = styled.section`
  margin-top: 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.05),
      rgba(255, 255, 255, 0) 22%
    ),
    ${({ theme }) => theme.colors.brown};
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 16px;
`;

const SearchRow = styled.form`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const inputBase = `
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 14px;
  color: #fff;
  padding: 12px 14px;
  outline: none;
  transition: 180ms ease;
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.2);
  &:focus {
    border-color: rgba(255,255,255,0.45);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.16);
  }
`;

const SearchInput = styled.input`${inputBase}`;
const Select = styled.select`${inputBase}`;
const Textarea = styled.textarea`${inputBase}`;
const Input = styled.input`${inputBase}`;

const SearchBtn = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: 180ms ease;
  &:hover {
    transform: translateY(-1px);
  }
`;

const TableWrap = styled.div`
  margin-top: 12px;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;

  th,
  td {
    padding: 12px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 14px;
    white-space: nowrap;
  }

  th {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    opacity: 0.8;
  }

  tbody tr:hover td {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const Empty = styled.div`
  padding: 16px 12px;
  opacity: 0.85;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  text-transform: capitalize;

  ${({ $status, theme }) =>
    $status === "confirmed"
      ? `border-color: rgba(214,182,159,0.55); color: ${theme.colors.lightBrown};`
      : $status === "completed"
      ? `border-color: rgba(150,255,200,0.28);`
      : $status === "cancelled"
      ? `border-color: rgba(255,120,120,0.28);`
      : ``}
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  transition: 180ms ease;
  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const DangerBtn = styled.button`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 120, 120, 0.34);
  background: rgba(255, 120, 120, 0.12);
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  transition: 180ms ease;
  &:hover {
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Pager = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding-top: 14px;
`;

const PageBtn = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  transition: 180ms ease;
  &:hover {
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

const PageInfo = styled.div`
  opacity: 0.9;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
  padding: 18px;
  z-index: 1000;
`;

const Modal = styled.div`
  width: min(760px, 100%);
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.darkBrown};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 16px;
`;

const ModalTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
`;

const ModalSub = styled.p`
  margin: 6px 0 0;
  opacity: 0.85;
  line-height: 1.55;
`;

const X = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.radius.pill};
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: 180ms ease;
  &:hover {
    transform: translateY(-1px);
  }
`;

const MetaRow = styled.div`
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaPill = styled.div`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 12px;
  opacity: 0.9;
  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 900;
  }
`;

const Grid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 8px;
`;

const Label = styled.div`
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.8;
`;

const Hint = styled.div`
  font-size: 12px;
  opacity: 0.7;
`;

const Warn = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  opacity: 0.95;
`;

const TypeRow = styled.div`
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 10px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
`;

const Ghost = styled.button`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: ${({ theme }) => theme.colors.white};
  cursor: pointer;
  transition: 180ms ease;
  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.05);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Primary = styled.button`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
  font-weight: 900;
  cursor: pointer;
  transition: 180ms ease;
  box-shadow: 0 12px 26px rgba(214, 182, 159, 0.22);
  &:hover {
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
`;

