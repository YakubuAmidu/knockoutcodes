import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

const STATUS_OPTIONS = ["active", "revoked", "all"];
const TRUST_OPTIONS = ["", "true", "false"];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function statusLabel(status) {
  if (status === "revoked") return "Revoked";
  if (status === "active") return "Active";
  return "All";
}

export default function Session() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeModal, setActiveModal] = useState(null);

  const [filters, setFilters] = useState({
    status: "all",
    email: "",
    trusted: "",
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const fetchSessions = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", limit);

      if (filters.status && filters.status !== "all") {
        params.set("status", filters.status);
      }

      if (filters.email.trim()) {
        params.set("email", filters.email.trim());
      }

      if (filters.trusted) {
        params.set("trusted", filters.trusted);
      }

      const { data } = await axiosInstance.get(
        `/auth/sessions/admin?${params.toString()}`,
      );

      setSessions(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
      setPages(Number(data?.pages) || 1);
    } catch (error) {
      toast?.error?.(
        error?.response?.data?.message || "Failed to load admin sessions.",
      );
      setSessions([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit, toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && activeModal && !actionLoading) {
        setActiveModal(null);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [activeModal, actionLoading]);

  const stats = useMemo(() => {
    return {
      total,
      active: sessions.filter((s) => s.status === "active").length,
      revoked: sessions.filter((s) => s.status === "revoked").length,
      trusted: sessions.filter((s) => s.isTrusted).length,
    };
  }, [sessions, total]);

  function updateFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  }

  async function handleTrust(session) {
    if (!session?.id || session.status === "revoked") return;

    setActionLoading(true);

    try {
      const { data } = await axiosInstance.patch(
        `/auth/sessions/admin/${session.id}/trust`,
        { isTrusted: !session.isTrusted },
      );

      setSessions((prev) =>
        prev.map((item) => (item.id === session.id ? data.item : item)),
      );

      toast?.success?.(data?.message || "Session updated.");
      setActiveModal(null);
    } catch (error) {
      toast?.error?.(
        error?.response?.data?.message || "Failed to update session.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevoke(session) {
    if (!session?.id || session.status === "revoked") return;

    setActionLoading(true);

    try {
      const { data } = await axiosInstance.delete(
        `/auth/sessions/admin/${session.id}/revoke`,
        { data: {} },
      );

      setSessions((prev) =>
        prev.map((item) => (item.id === session.id ? data.item : item)),
      );

      toast?.success?.(data?.message || "Session revoked.");
      setActiveModal(null);
    } catch (error) {
      toast?.error?.(
        error?.response?.data?.message || "Failed to revoke session.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(session) {
    if (!session?.id) return;

    if (session.status !== "revoked") {
      toast?.error?.("Only revoked sessions can be deleted.");
      return;
    }

    setActionLoading(true);

    try {
      const { data } = await axiosInstance.delete(
        `/auth/sessions/admin/${session.id}/delete`,
        { data: { confirm: true } },
      );

      setSessions((prev) => prev.filter((item) => item.id !== data.deletedId));

      toast?.success?.(data?.message || "Revoked session deleted.");
      setActiveModal(null);

      await fetchSessions();
    } catch (error) {
      toast?.error?.(
        error?.response?.data?.message || "Failed to delete revoked session.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCleanup() {
    setActionLoading(true);

    try {
      const { data } = await axiosInstance.delete(
        "/auth/sessions/admin/cleanup",
        { data: { days: 1 } },
      );

      toast?.success?.(data?.message || "Old sessions cleaned.");
      setActiveModal(null);
      await fetchSessions();
    } catch (error) {
      toast?.error?.(
        error?.response?.data?.message || "Failed to cleanup sessions.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Page>
      <Shell>
        <Hero
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Eyebrow>KO ADMIN • SESSION CONTROL</Eyebrow>
          <Title>See every login before trouble gets comfortable.</Title>
          <Subtitle>
            Review platform sessions, identify unknown devices, revoke risky
            access, trust safe devices, and clean old revoked sessions with a
            serious security command view.
          </Subtitle>

          <HeroActions>
            <PrimaryBtn
              onClick={fetchSessions}
              disabled={loading || actionLoading}
            >
              {loading ? "Refreshing..." : "Refresh Sessions"}
            </PrimaryBtn>

            <GhostBtn
              onClick={() => setActiveModal({ type: "cleanup" })}
              disabled={loading || actionLoading}
            >
              Clean 1+ Day Revoked
            </GhostBtn>
          </HeroActions>
        </Hero>

        <StatsGrid>
          <StatCard>
            <StatLabel>Total Found</StatLabel>
            <StatValue>{stats.total}</StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>Visible Active</StatLabel>
            <StatValue>{stats.active}</StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>Visible Revoked</StatLabel>
            <StatValue>{stats.revoked}</StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>Trusted</StatLabel>
            <StatValue>{stats.trusted}</StatValue>
          </StatCard>
        </StatsGrid>

        <Panel>
          <PanelTop>
            <div>
              <PanelTitle>Admin Sessions</PanelTitle>
              <PanelText>
                Sessions are login/device records. Security events are where
                suspicious actions belong.
              </PanelText>
            </div>
          </PanelTop>

          <Filters>
            <Field>
              <Label>Email</Label>
              <Input
                value={filters.email}
                onChange={(e) => updateFilter("email", e.target.value)}
                placeholder="Search user email..."
                autoComplete="off"
              />
            </Field>

            <Field>
              <Label>Status</Label>
              <Select
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label>Trust</Label>
              <Select
                value={filters.trusted}
                onChange={(e) => updateFilter("trusted", e.target.value)}
              >
                <option value="">All</option>
                {TRUST_OPTIONS.filter(Boolean).map((item) => (
                  <option key={item} value={item}>
                    {item === "true" ? "Trusted" : "Untrusted"}
                  </option>
                ))}
              </Select>
            </Field>
          </Filters>

          {loading ? (
            <EmptyBox>Loading admin sessions...</EmptyBox>
          ) : sessions.length === 0 ? (
            <EmptyBox>No sessions found.</EmptyBox>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Device</th>
                    <th>IP / Location</th>
                    <th>Status</th>
                    <th>Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <Strong>{session.user?.name || "Unknown User"}</Strong>
                        <Small>{session.user?.email || "No email"}</Small>
                        <Small>{session.user?.role || "user"}</Small>
                      </td>

                      <td>
                        <Strong>{session.deviceName || "Device"}</Strong>
                        <Small>
                          {session.browser || "Unknown"} •{" "}
                          {session.os || "Unknown"}
                        </Small>
                        <Small>{session.userAgent || "No user agent"}</Small>
                      </td>

                      <td>
                        <Strong>{session.ip || "No IP"}</Strong>
                        <Small>{session.approxLocation || "No location"}</Small>
                      </td>

                      <td>
                        <BadgeStack>
                          <StatusBadge data-status={session.status}>
                            {session.status || "unknown"}
                          </StatusBadge>

                          {session.isTrusted ? (
                            <TrustBadge>Trusted</TrustBadge>
                          ) : (
                            <UntrustBadge>Untrusted</UntrustBadge>
                          )}
                        </BadgeStack>
                      </td>

                      <td>
                        <Strong>Last Active</Strong>
                        <Small>{formatDate(session.lastActiveAt)}</Small>
                        <Small>Created: {formatDate(session.createdAt)}</Small>
                        {session.revokedAt ? (
                          <Small>
                            Revoked: {formatDate(session.revokedAt)}
                          </Small>
                        ) : null}
                      </td>

                      <td>
                        <ActionGroup>
                          <MiniButton
                            type="button"
                            onClick={() =>
                              setActiveModal({ type: "details", session })
                            }
                          >
                            Details
                          </MiniButton>

                          <MiniButton
                            type="button"
                            onClick={() =>
                              setActiveModal({ type: "trust", session })
                            }
                            disabled={
                              actionLoading || session.status === "revoked"
                            }
                          >
                            {session.isTrusted ? "Untrust" : "Trust"}
                          </MiniButton>

                          <MiniDanger
                            type="button"
                            onClick={() =>
                              setActiveModal({ type: "revoke", session })
                            }
                            disabled={
                              actionLoading || session.status === "revoked"
                            }
                          >
                            Revoke
                          </MiniDanger>

                          <MiniDanger
                            type="button"
                            onClick={() =>
                              setActiveModal({ type: "delete", session })
                            }
                            disabled={
                              actionLoading || session.status !== "revoked"
                            }
                          >
                            Delete
                          </MiniDanger>
                        </ActionGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}

          <Pagination>
            <PageBtn
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading || actionLoading}
            >
              Previous
            </PageBtn>

            <PageInfo>
              Page {page} of {pages || 1}
            </PageInfo>

            <PageBtn
              onClick={() => setPage((p) => Math.min(p + 1, pages || 1))}
              disabled={page >= pages || loading || actionLoading}
            >
              Next
            </PageBtn>
          </Pagination>
        </Panel>
      </Shell>

      <AnimatePresence>
        {activeModal ? (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !actionLoading) {
                setActiveModal(null);
              }
            }}
          >
            <ModalCard
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
            >
              {activeModal.type === "details" && (
                <>
                  <ModalEyebrow>Session Details</ModalEyebrow>
                  <ModalTitle>
                    {activeModal.session?.deviceName || "Device Session"}
                  </ModalTitle>

                  <DetailGrid>
                    <Detail>
                      <b>User:</b> {activeModal.session?.user?.email || "—"}
                    </Detail>
                    <Detail>
                      <b>Name:</b> {activeModal.session?.user?.name || "—"}
                    </Detail>
                    <Detail>
                      <b>Role:</b> {activeModal.session?.user?.role || "—"}
                    </Detail>
                    <Detail>
                      <b>Browser:</b> {activeModal.session?.browser || "—"}
                    </Detail>
                    <Detail>
                      <b>OS:</b> {activeModal.session?.os || "—"}
                    </Detail>
                    <Detail>
                      <b>IP:</b> {activeModal.session?.ip || "—"}
                    </Detail>
                    <Detail>
                      <b>Location:</b>{" "}
                      {activeModal.session?.approxLocation || "—"}
                    </Detail>
                    <Detail>
                      <b>Status:</b> {activeModal.session?.status || "—"}
                    </Detail>
                    <Detail>
                      <b>Trusted:</b>{" "}
                      {activeModal.session?.isTrusted ? "Yes" : "No"}
                    </Detail>
                    <Detail>
                      <b>Last Active:</b>{" "}
                      {formatDate(activeModal.session?.lastActiveAt)}
                    </Detail>
                    <Detail>
                      <b>Created:</b>{" "}
                      {formatDate(activeModal.session?.createdAt)}
                    </Detail>
                    <Detail>
                      <b>Revoked:</b>{" "}
                      {formatDate(activeModal.session?.revokedAt)}
                    </Detail>
                    <Detail>
                      <b>Reason:</b> {activeModal.session?.revokedReason || "—"}
                    </Detail>
                  </DetailGrid>

                  <ModalActions>
                    <ModalCancel onClick={() => setActiveModal(null)}>
                      Close
                    </ModalCancel>
                  </ModalActions>
                </>
              )}

              {activeModal.type === "trust" && (
                <>
                  <ModalEyebrow>Trust Control</ModalEyebrow>
                  <ModalTitle>
                    {activeModal.session?.isTrusted
                      ? "Mark this session untrusted?"
                      : "Mark this session trusted?"}
                  </ModalTitle>

                  <ModalText>
                    This does not change login access by itself. It helps admin
                    review which devices are known and safe.
                  </ModalText>

                  <ModalActions>
                    <ModalCancel
                      onClick={() => setActiveModal(null)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </ModalCancel>

                    <ModalConfirm
                      onClick={() => handleTrust(activeModal.session)}
                      disabled={
                        actionLoading ||
                        activeModal.session?.status === "revoked"
                      }
                    >
                      {actionLoading ? "Saving..." : "Confirm"}
                    </ModalConfirm>
                  </ModalActions>
                </>
              )}

              {activeModal.type === "revoke" && (
                <>
                  <ModalEyebrow>Revoke Session</ModalEyebrow>
                  <ModalTitle>Remove this device access?</ModalTitle>

                  <ModalText>
                    This signs out this device/session. Use this for unknown,
                    suspicious, old, or unsafe access.
                  </ModalText>

                  <ModalActions>
                    <ModalCancel
                      onClick={() => setActiveModal(null)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </ModalCancel>

                    <ModalDelete
                      onClick={() => handleRevoke(activeModal.session)}
                      disabled={
                        actionLoading ||
                        activeModal.session?.status === "revoked"
                      }
                    >
                      {actionLoading ? "Revoking..." : "Revoke Session"}
                    </ModalDelete>
                  </ModalActions>
                </>
              )}

              {activeModal.type === "delete" && (
                <>
                  <ModalEyebrow>Delete Session</ModalEyebrow>
                  <ModalTitle>
                    Permanently delete this revoked session?
                  </ModalTitle>

                  <ModalText>
                    This removes the revoked session record from the admin list.
                    Active sessions cannot be deleted from here.
                  </ModalText>

                  <ModalActions>
                    <ModalCancel
                      onClick={() => setActiveModal(null)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </ModalCancel>

                    <ModalDelete
                      onClick={() => handleDelete(activeModal.session)}
                      disabled={
                        actionLoading ||
                        activeModal.session?.status !== "revoked"
                      }
                    >
                      {actionLoading ? "Deleting..." : "Delete Session"}
                    </ModalDelete>
                  </ModalActions>
                </>
              )}

              {activeModal.type === "cleanup" && (
                <>
                  <ModalEyebrow>Cleanup</ModalEyebrow>
                  <ModalTitle>Delete old revoked sessions?</ModalTitle>

                  <ModalText>
                    This deletes revoked sessions older than 1 day. Active
                    sessions will not be deleted.
                  </ModalText>

                  <ModalActions>
                    <ModalCancel
                      onClick={() => setActiveModal(null)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </ModalCancel>

                    <ModalDelete
                      onClick={handleCleanup}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Cleaning..." : "Delete Old Revoked"}
                    </ModalDelete>
                  </ModalActions>
                </>
              )}
            </ModalCard>
          </ModalOverlay>
        ) : null}
      </AnimatePresence>
    </Page>
  );
}

const Page = styled.main`
  min-height: 100vh;
  padding: 120px 18px 80px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(
      circle at 14% 8%,
      rgba(214, 182, 159, 0.18),
      transparent 36%
    ),
    radial-gradient(circle at 88% 22%, rgba(90, 56, 37, 0.34), transparent 42%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown},
      ${({ theme }) => theme.colors.black}
    );
`;

const Shell = styled.section`
  width: ${({ theme }) => theme.layout.gutter};
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled(motion.section)`
  padding: 34px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.78rem;
`;

const Title = styled.h1`
  max-width: 900px;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(2.2rem, 5vw, 4.7rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
`;

const Subtitle = styled.p`
  max-width: 820px;
  margin: 18px 0 0;
  color: rgba(255, 249, 242, 0.78);
  line-height: 1.7;
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
`;

const PrimaryBtn = styled.button`
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 13px 20px;
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.darkBrown};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const GhostBtn = styled(PrimaryBtn)`
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.25);
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 18px 0;

  @media (max-width: 850px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.article`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 20px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const StatLabel = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.66);
  font-size: 0.84rem;
`;

const StatValue = styled.h2`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 2rem;
`;

const Panel = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 22px;
  background: rgba(61, 38, 26, 0.78);
  border: 1px solid rgba(214, 182, 159, 0.14);
  box-shadow: ${({ theme }) => theme.shadow.hard};
`;

const PanelTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
`;

const PanelText = styled.p`
  margin: 8px 0 0;
  color: rgba(255, 249, 242, 0.66);
`;

const Filters = styled.div`
  display: grid;
  grid-template-columns: 1fr 220px 220px;
  gap: 14px;
  margin: 20px 0;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const Input = styled.input`
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: ${({ theme }) => theme.colors.black};
  color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px;
  outline: none;
`;

const Select = styled.select`
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: ${({ theme }) => theme.colors.black};
  color: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px;
  outline: none;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radius.lg};
`;

const Table = styled.table`
  width: 100%;
  min-width: 1180px;
  border-collapse: separate;
  border-spacing: 0 10px;
  background: transparent;

  thead tr {
    background: rgba(0, 0, 0, 0.34);
  }

  tbody tr {
    background: rgba(0, 0, 0, 0.34);
    transition:
      transform 0.16s ease,
      background 0.16s ease;
  }

  tbody tr:hover {
    background: rgba(0, 0, 0, 0.48);
    transform: translateY(-1px);
  }

  th,
  td {
    padding: 16px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  th:first-child,
  td:first-child {
    border-top-left-radius: ${({ theme }) => theme.radius.lg};
    border-bottom-left-radius: ${({ theme }) => theme.radius.lg};
  }

  th:last-child,
  td:last-child {
    border-top-right-radius: ${({ theme }) => theme.radius.lg};
    border-bottom-right-radius: ${({ theme }) => theme.radius.lg};
  }

  th {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.72rem;
    white-space: nowrap;
  }
`;

const Strong = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
`;

const Small = styled.span`
  display: block;
  margin-top: 5px;
  max-width: 260px;
  color: rgba(255, 249, 242, 0.58);
  font-size: 0.78rem;
  word-break: break-word;
`;

const StatusBadge = styled.span`
  width: fit-content;
  min-width: 82px;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 12px;
  font-size: 0.72rem;
  font-weight: 950;
  line-height: 1;
  text-transform: uppercase;
  background: rgba(214, 182, 159, 0.16);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.24);

  &[data-status="revoked"] {
    background: rgba(255, 74, 74, 0.13);
    border-color: rgba(255, 74, 74, 0.28);
    color: #ffdede;
  }
`;

const TrustBadge = styled(StatusBadge)`
  margin-top: 8px;
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.darkBrown};
  border-color: rgba(214, 182, 159, 0.55);
`;

const UntrustBadge = styled(StatusBadge)`
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.34);
  color: rgba(255, 249, 242, 0.82);
  border-color: rgba(255, 255, 255, 0.13);
`;

const BadgeStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
`;

const ActionGroup = styled.div`
  min-width: 190px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
`;

const MiniButton = styled.button`
  min-width: 76px;
  height: 34px;
  border: 1px solid rgba(214, 182, 159, 0.24);
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.045);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  font-weight: 900;
  font-size: 0.74rem;
  white-space: nowrap;

  &:hover {
    background: rgba(214, 182, 159, 0.12);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const MiniDanger = styled(MiniButton)`
  color: #ffdede;
  border-color: rgba(255, 74, 74, 0.28);
`;

const EmptyBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 34px;
  background: rgba(0, 0, 0, 0.28);
  text-align: center;
  color: rgba(255, 249, 242, 0.72);
`;

const Pagination = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 20px;

  @media (max-width: 520px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const PageBtn = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.25);
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 15px;
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: rgba(255, 249, 242, 0.7);
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(12px);
`;

const ModalCard = styled(motion.div)`
  width: min(94vw, 560px);
  max-height: 86vh;
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 28px;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1),
      rgba(214, 182, 159, 0.07)
    ),
    ${({ theme }) => theme.colors.darkBrown};
  border: 1px solid rgba(214, 182, 159, 0.24);
  box-shadow: ${({ theme }) => theme.shadow.hard};
`;

const ModalEyebrow = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.lightBrown};
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.76rem;
  font-weight: 950;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 1.8rem;
`;

const ModalText = styled.p`
  color: rgba(255, 249, 242, 0.76);
  line-height: 1.7;
`;

const DetailGrid = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 18px;
`;

const Detail = styled.div`
  padding: 11px 13px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.28);
  color: rgba(255, 249, 242, 0.82);
  word-break: break-word;

  b {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const ModalCancel = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.25);
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 12px 18px;
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const ModalConfirm = styled(ModalCancel)`
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.darkBrown};
  border: 0;
`;

const ModalDelete = styled(ModalConfirm)`
  background: #ffdede;
  color: #3d120f;
`;
