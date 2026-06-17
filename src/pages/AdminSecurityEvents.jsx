// src/pages/AdminSecurityEvents.jsx
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchSecurityEvents,
  setSecurityEventFilters,
  clearSecurityEventError,
  cleanupSecurityEvents,
  updateSecurityEventReview,
  deleteSecurityEvent,
  deactivateSecurityEventUser,
  blockSecurityEventIp,
  unblockSecurityEventIp,
} from "../reducers/securityEvents/securityEventActions";

import { useToast } from "../components/Toast";

const EVENT_TYPES = [
  "",
  "LOGIN_FAILED",
  "ACCOUNT_LOCKED",
  "REFRESH_FAILED",
  "BOT_DETECTED",
  "RATE_LIMITED",
  "CSRF_FAILED",
  "XSS_ATTEMPT",
  "SQLI_ATTEMPT",
  "NOSQLI_ATTEMPT",
  "PATH_TRAVERSAL_ATTEMPT",
  "ADMIN_ACCESS_DENIED",
  "BLOCKED_IP_HIT",
  "PASSWORD_RESET_ABUSE",
  "SCAM_PATTERN",
  "CHECKOUT_ABUSE",
  "SUSPICIOUS_REQUEST",
];

const REVIEW_STATUSES = [
  "",
  "unreviewed",
  "reviewed",
  "suspicious",
  "resolved",
  "ignored",
];

const SEVERITIES = ["", "low", "medium", "high", "critical"];

const CATEGORIES = [
  "",
  "auth",
  "bot",
  "abuse",
  "attack",
  "admin",
  "payment",
  "system",
];

const emptyModal = {
  type: "",
  event: null,
};

const cleanText = (value = "", max = 500) =>
  String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const labelize = (value = "", fallback = "Unknown") => {
  if (!value) return fallback;
  return String(value).replaceAll("_", " ");
};

const getToastSuccess = (toast, message) => {
  if (toast?.success) return toast.success(message);
  return toast?.push?.({
    title: "Success",
    description: message,
    variant: "success",
  });
};

const getToastError = (toast, message) => {
  if (toast?.error) return toast.error(message);
  return toast?.push?.({
    title: "Error",
    description: message,
    variant: "error",
  });
};

export default function AdminSecurityEvents() {
  const dispatch = useDispatch();
  const toast = useToast();

  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [activeModal, setActiveModal] = useState(emptyModal);
  const [reviewDraft, setReviewDraft] = useState({
    reviewStatus: "reviewed",
    adminNote: "",
  });

  const {
    loading = false,
    cleanupLoading = false,
    actionLoading = false,
    error = null,
    items = [],
    page = 1,
    limit = 20,
    total = 0,
    pages = 0,
    filters = {
      type: "",
      email: "",
      reviewStatus: "",
      severity: "",
      category: "",
      ip: "",
    },
  } = useSelector((state) => state.securityEvent || {});

  const safeFilters = {
    type: filters.type || "",
    email: filters.email || "",
    reviewStatus: filters.reviewStatus || "",
    severity: filters.severity || "",
    category: filters.category || "",
    ip: filters.ip || "",
  };

  const stats = useMemo(() => {
    return {
      totalOnPage: items.length,
      critical: items.filter((item) => item.severity === "critical").length,
      high: items.filter((item) => item.severity === "high").length,
      suspicious: items.filter(
        (item) =>
          item.reviewStatus === "suspicious" ||
          item.severity === "high" ||
          item.severity === "critical",
      ).length,
    };
  }, [items]);

  const loadEvents = (custom = {}) => {
    return dispatch(
      fetchSecurityEvents({
        page: custom.page || page,
        limit: custom.limit || limit,
        type: custom.type ?? safeFilters.type,
        email: custom.email ?? safeFilters.email,
        reviewStatus: custom.reviewStatus ?? safeFilters.reviewStatus,
        severity: custom.severity ?? safeFilters.severity,
        category: custom.category ?? safeFilters.category,
        ip: custom.ip ?? safeFilters.ip,
      }),
    );
  };

  useEffect(() => {
    loadEvents().catch(() => {
      getToastError(toast, "Failed to load security events.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    page,
    limit,
    safeFilters.type,
    safeFilters.email,
    safeFilters.reviewStatus,
    safeFilters.severity,
    safeFilters.category,
    safeFilters.ip,
  ]);

  useEffect(() => {
    if (error) {
      getToastError(toast, error);
      dispatch(clearSecurityEventError());
    }
  }, [error, toast, dispatch]);

  const openModal = (type, event) => {
    setActiveModal({ type, event });

    if (type === "review") {
      setReviewDraft({
        reviewStatus: event?.reviewStatus || "reviewed",
        adminNote: event?.adminNote || "",
      });
    }
  };

  const closeModal = () => {
    if (actionLoading || cleanupLoading) return;

    setActiveModal(emptyModal);
    setReviewDraft({ reviewStatus: "reviewed", adminNote: "" });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    dispatch(
      setSecurityEventFilters({
        [name]: cleanText(value, 120),
        page: 1,
      }),
    );
  };

  const handleRefresh = () => {
    loadEvents()
      .then(() => getToastSuccess(toast, "Security events refreshed."))
      .catch(() => getToastError(toast, "Unable to refresh security events."));
  };

  const handleCleanup = () => {
    dispatch(cleanupSecurityEvents({ days: 90 }))
      .then((data) => {
        getToastSuccess(
          toast,
          data?.message || "Old reviewed security events cleaned.",
        );
        setShowCleanupModal(false);
        loadEvents({ page: 1 });
      })
      .catch(() =>
        getToastError(toast, "Unable to cleanup old security events."),
      );
  };

  const handleReviewSave = () => {
    if (!activeModal.event?._id) return;

    dispatch(
      updateSecurityEventReview(activeModal.event._id, {
        reviewStatus: reviewDraft.reviewStatus,
        adminNote: cleanText(reviewDraft.adminNote, 1000),
      }),
    )
      .then((data) => {
        getToastSuccess(toast, data?.message || "Security event reviewed.");
        closeModal();
        loadEvents();
      })
      .catch(() => getToastError(toast, "Unable to update review."));
  };

  const handleDelete = () => {
    if (!activeModal.event?._id) return;

    dispatch(deleteSecurityEvent(activeModal.event._id))
      .then((data) => {
        getToastSuccess(toast, data?.message || "Security event deleted.");
        closeModal();
        loadEvents();
      })
      .catch(() => getToastError(toast, "Unable to delete security event."));
  };

  const handleDeactivateUser = () => {
    if (!activeModal.event?._id) return;

    dispatch(
      deactivateSecurityEventUser(activeModal.event._id, {
        adminNote: "User deactivated from admin security review.",
      }),
    )
      .then((data) => {
        getToastSuccess(toast, data?.message || "User account deactivated.");
        closeModal();
        loadEvents();
      })
      .catch(() => getToastError(toast, "Unable to deactivate user."));
  };

  const handleBlockIp = () => {
    if (!activeModal.event?._id) return;

    dispatch(
      blockSecurityEventIp(activeModal.event._id, {
        reason: "Blocked from admin security event review.",
        adminNote: `IP ${activeModal.event?.ip || ""} blocked from security review.`,
      }),
    )
      .then((data) => {
        getToastSuccess(toast, data?.message || "IP address blocked.");
        closeModal();
        loadEvents();
      })
      .catch(() => getToastError(toast, "Unable to block IP address."));
  };

  const handleUnblockIp = () => {
    if (!activeModal.event?._id) return;

    dispatch(
      unblockSecurityEventIp(activeModal.event._id, {
        adminNote: `IP ${activeModal.event?.ip || ""} unblocked from security review.`,
      }),
    )
      .then((data) => {
        getToastSuccess(toast, data?.message || "IP address unblocked.");
        closeModal();
        loadEvents();
      })
      .catch(() => getToastError(toast, "Unable to unblock IP address."));
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pages) return;

    dispatch(
      fetchSecurityEvents({
        page: nextPage,
        limit,
        type: safeFilters.type,
        email: safeFilters.email,
        reviewStatus: safeFilters.reviewStatus,
        severity: safeFilters.severity,
        category: safeFilters.category,
        ip: safeFilters.ip,
      }),
    ).catch(() => getToastError(toast, "Unable to load that page."));
  };

  return (
    <PageWrap>
      <Shell>
        <Hero
          as={motion.section}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Eyebrow>KnockoutCodes Security Command</Eyebrow>
          <Title>Threats only. Noise reduced.</Title>
          <Subtitle>
            This dashboard now focuses on suspicious activity, hacking attempts,
            bot behavior, blocked IP hits, account abuse, and admin security
            risks instead of filling MongoDB with normal user activity.
          </Subtitle>

          <HeroActions>
            <Button type="button" onClick={handleRefresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Threat Logs"}
            </Button>

            <DangerButton
              type="button"
              onClick={() => setShowCleanupModal(true)}
              disabled={cleanupLoading || loading}
            >
              {cleanupLoading ? "Cleaning..." : "Clean 90+ Day Reviewed Logs"}
            </DangerButton>
          </HeroActions>
        </Hero>

        <StatsGrid>
          <StatCard>
            <StatLabel>Total Threat Logs</StatLabel>
            <StatValue>{total}</StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>Critical On Page</StatLabel>
            <StatValue>{stats.critical}</StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>High Risk On Page</StatLabel>
            <StatValue>{stats.high}</StatValue>
          </StatCard>

          <StatCard $danger={stats.suspicious > 0 ? "true" : undefined}>
            <StatLabel>Needs Attention</StatLabel>
            <StatValue>{stats.suspicious}</StatValue>
          </StatCard>
        </StatsGrid>

        <Panel>
          <PanelTop>
            <div>
              <PanelTitle>Security Threat Trail</PanelTitle>
              <PanelText>
                Review what happened, who was connected, the route used, IP,
                device, risk level, repeat count, and admin action history.
              </PanelText>
            </div>
          </PanelTop>

          <Filters>
            <FieldGroup>
              <Label>Email Search</Label>
              <Input
                name="email"
                value={safeFilters.email}
                onChange={handleFilterChange}
                placeholder="Search email..."
                maxLength={120}
              />
            </FieldGroup>

            <FieldGroup>
              <Label>IP Search</Label>
              <Input
                name="ip"
                value={safeFilters.ip}
                onChange={handleFilterChange}
                placeholder="Search IP..."
                maxLength={80}
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Event Type</Label>
              <Select
                name="type"
                value={safeFilters.type}
                onChange={handleFilterChange}
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type || "ALL"} value={type}>
                    {type ? labelize(type) : "All Threat Events"}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label>Severity</Label>
              <Select
                name="severity"
                value={safeFilters.severity}
                onChange={handleFilterChange}
              >
                {SEVERITIES.map((severity) => (
                  <option key={severity || "ALL"} value={severity}>
                    {severity ? labelize(severity) : "All Severities"}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label>Category</Label>
              <Select
                name="category"
                value={safeFilters.category}
                onChange={handleFilterChange}
              >
                {CATEGORIES.map((category) => (
                  <option key={category || "ALL"} value={category}>
                    {category ? labelize(category) : "All Categories"}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label>Review Status</Label>
              <Select
                name="reviewStatus"
                value={safeFilters.reviewStatus}
                onChange={handleFilterChange}
              >
                {REVIEW_STATUSES.map((status) => (
                  <option key={status || "ALL"} value={status}>
                    {status ? labelize(status) : "All Statuses"}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </Filters>

          {loading ? (
            <EmptyBox>Loading security threat logs...</EmptyBox>
          ) : items.length === 0 ? (
            <EmptyBox>No suspicious security events found.</EmptyBox>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Threat</th>
                    <th>Risk</th>
                    <th>User / Email</th>
                    <th>IP / Device</th>
                    <th>Activity</th>
                    <th>Review</th>
                    <th>Last Seen</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((event) => (
                    <tr key={event._id}>
                      <td>
                        <Badge data-type={event.type}>
                          {labelize(event.title || event.type, "Unknown Event")}
                        </Badge>

                        <Small>{labelize(event.type)}</Small>

                        {event.actionTaken && event.actionTaken !== "none" ? (
                          <Small>Action: {labelize(event.actionTaken)}</Small>
                        ) : null}
                      </td>

                      <td>
                        <SeverityBadge
                          data-severity={event.severity || "medium"}
                        >
                          {labelize(event.severity || "medium")}
                        </SeverityBadge>
                        <Small>{labelize(event.category || "system")}</Small>
                        <Small>Count: {event.count || 1}</Small>
                      </td>

                      <td>
                        {event.user?.name || "Unknown User"}
                        <Small>
                          {event.email || event.user?.email || "No email"}
                        </Small>
                        <Small>
                          {event.user?.role || "No role"}
                          {event.user?.isActive === false ? " • Inactive" : ""}
                        </Small>
                      </td>

                      <td>
                        {event.ip || "Not available"}
                        <Small>{event.userAgent || "No user agent"}</Small>
                      </td>

                      <td>
                        {event.method || "N/A"} {event.path || "No route"}
                        {event.meta?.whatTheyDid ? (
                          <Small>{event.meta.whatTheyDid}</Small>
                        ) : null}
                      </td>

                      <td>
                        <StatusBadge
                          data-status={event.reviewStatus || "unreviewed"}
                        >
                          {labelize(event.reviewStatus || "unreviewed")}
                        </StatusBadge>
                        {event.adminNote ? (
                          <Small>{event.adminNote}</Small>
                        ) : null}
                      </td>

                      <td>
                        {formatDate(event.lastSeenAt || event.createdAt)}
                        <Small>Created: {formatDate(event.createdAt)}</Small>
                      </td>

                      <td>
                        <ActionGroup>
                          <MiniButton
                            type="button"
                            onClick={() => openModal("review", event)}
                            disabled={actionLoading}
                          >
                            Review
                          </MiniButton>

                          <MiniButton
                            type="button"
                            onClick={() => openModal("deactivate", event)}
                            disabled={actionLoading || !event.user?._id}
                          >
                            Deactivate
                          </MiniButton>

                          <MiniButton
                            type="button"
                            onClick={() => openModal("blockIp", event)}
                            disabled={actionLoading || !event.ip}
                          >
                            Block IP
                          </MiniButton>

                          <MiniButton
                            type="button"
                            onClick={() => openModal("unblockIp", event)}
                            disabled={actionLoading || !event.ip}
                          >
                            Unblock IP
                          </MiniButton>

                          <MiniDanger
                            type="button"
                            onClick={() => openModal("delete", event)}
                            disabled={actionLoading}
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
            <PageButton
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={loading || page <= 1}
            >
              Previous
            </PageButton>

            <PageInfo>
              Page {page} of {pages || 1}
            </PageInfo>

            <PageButton
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={loading || page >= pages}
            >
              Next
            </PageButton>
          </Pagination>
        </Panel>
      </Shell>

      {showCleanupModal && (
        <ConfirmModal
          eyebrow="Security Cleanup"
          title="Delete old reviewed security logs?"
          text="This deletes security events older than 90 days only when they are already reviewed, resolved, or ignored. Active unreviewed threat logs stay protected."
          confirmText="Delete Old Logs"
          loading={cleanupLoading}
          onCancel={() => setShowCleanupModal(false)}
          onConfirm={handleCleanup}
          danger
        />
      )}

      {activeModal.type === "review" && (
        <ModalOverlay>
          <ModalCard
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ModalEyebrow>Admin Review</ModalEyebrow>
            <ModalTitle>Review this threat event</ModalTitle>
            <ModalText>
              Add a clear decision note. This keeps the investigation trail
              clean without changing the original security event.
            </ModalText>

            <ModalField>
              <Label>Review Status</Label>
              <Select
                value={reviewDraft.reviewStatus}
                onChange={(event) =>
                  setReviewDraft((prev) => ({
                    ...prev,
                    reviewStatus: event.target.value,
                  }))
                }
              >
                {REVIEW_STATUSES.filter(Boolean).map((status) => (
                  <option key={status} value={status}>
                    {labelize(status)}
                  </option>
                ))}
              </Select>
            </ModalField>

            <ModalField>
              <Label>Admin Note</Label>
              <Textarea
                value={reviewDraft.adminNote}
                maxLength={1000}
                onChange={(event) =>
                  setReviewDraft((prev) => ({
                    ...prev,
                    adminNote: cleanText(event.target.value, 1000),
                  }))
                }
                placeholder="Example: Repeated failed login attempts from same IP. Marked suspicious and blocked."
              />
            </ModalField>

            <ModalActions>
              <ModalCancel
                type="button"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Cancel
              </ModalCancel>

              <ModalConfirm
                type="button"
                onClick={handleReviewSave}
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : "Save Review"}
              </ModalConfirm>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}

      {activeModal.type === "delete" && (
        <ConfirmModal
          eyebrow="Delete Log"
          title="Delete this security event?"
          text="Only delete test logs or spam logs you are sure you do not need. Professional systems usually review or resolve logs instead of deleting them."
          confirmText="Delete Event"
          loading={actionLoading}
          onCancel={closeModal}
          onConfirm={handleDelete}
          danger
        />
      )}

      {activeModal.type === "deactivate" && (
        <ConfirmModal
          eyebrow="Deactivate User"
          title="Deactivate this user account?"
          text="This blocks the user from normal access if your auth middleware checks isActive. Use this only for dangerous or suspicious account behavior."
          confirmText="Deactivate User"
          loading={actionLoading}
          onCancel={closeModal}
          onConfirm={handleDeactivateUser}
          danger
        />
      )}

      {activeModal.type === "blockIp" && (
        <ConfirmModal
          eyebrow="Block IP"
          title={`Block IP ${activeModal.event?.ip || ""}?`}
          text="This saves the IP to your blocked IP list. Your backend middleware must check BlockedIp for enforcement."
          confirmText="Block IP"
          loading={actionLoading}
          onCancel={closeModal}
          onConfirm={handleBlockIp}
          danger
        />
      )}

      {activeModal.type === "unblockIp" && (
        <ConfirmModal
          eyebrow="Unblock IP"
          title={`Unblock IP ${activeModal.event?.ip || ""}?`}
          text="This will mark this IP as inactive in the blocked IP list so it can access the platform again."
          confirmText="Unblock IP"
          loading={actionLoading}
          onCancel={closeModal}
          onConfirm={handleUnblockIp}
        />
      )}
    </PageWrap>
  );
}

function ConfirmModal({
  eyebrow,
  title,
  text,
  confirmText,
  loading,
  onCancel,
  onConfirm,
  danger,
}) {
  return (
    <ModalOverlay>
      <ModalCard
        as={motion.div}
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <ModalEyebrow>{eyebrow}</ModalEyebrow>
        <ModalTitle>{title}</ModalTitle>
        <ModalText>{text}</ModalText>

        <ModalActions>
          <ModalCancel type="button" onClick={onCancel} disabled={loading}>
            Cancel
          </ModalCancel>

          {danger ? (
            <ModalDelete type="button" onClick={onConfirm} disabled={loading}>
              {loading ? "Working..." : confirmText}
            </ModalDelete>
          ) : (
            <ModalConfirm type="button" onClick={onConfirm} disabled={loading}>
              {loading ? "Working..." : confirmText}
            </ModalConfirm>
          )}
        </ModalActions>
      </ModalCard>
    </ModalOverlay>
  );
}

const PageWrap = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      transparent 34%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(255, 249, 242, 0.08),
      transparent 36%
    ),
    linear-gradient(135deg, #000000 0%, #2f1b12 52%, #000000 100%);
  color: #ffffff;
  padding: 48px 0;
`;

const Shell = styled.div`
  width: 92vw;
  max-width: 1320px;
  margin: 0 auto;
`;

const Hero = styled.section`
  border: 1px solid rgba(214, 182, 159, 0.2);
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.09),
      rgba(214, 182, 159, 0.07)
    ),
    rgba(255, 255, 255, 0.045);
  border-radius: 32px;
  padding: 38px;
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.34);
  position: relative;
  overflow: hidden;

  &::after {
    content: "SECURITY";
    position: absolute;
    right: -16px;
    bottom: -18px;
    font-size: clamp(3rem, 11vw, 9rem);
    font-weight: 950;
    letter-spacing: -0.08em;
    color: rgba(255, 255, 255, 0.035);
    pointer-events: none;
  }
`;

const Eyebrow = styled.p`
  color: #d6b69f;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  font-weight: 950;
  margin: 0 0 14px;
`;

const Title = styled.h1`
  max-width: 920px;
  font-size: clamp(2.2rem, 5vw, 5rem);
  line-height: 0.92;
  letter-spacing: -0.065em;
  margin: 0;
  color: #fff9f2;
`;

const Subtitle = styled.p`
  max-width: 820px;
  color: rgba(255, 249, 242, 0.78);
  font-size: 1rem;
  line-height: 1.75;
  margin: 20px 0 0;
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
`;

const Button = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 13px 22px;
  cursor: pointer;
  background: #d6b69f;
  color: #2f1b12;
  font-weight: 950;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.24);

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const DangerButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.28);
  border-radius: 999px;
  padding: 13px 22px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.22);
  color: #fff9f2;
  font-weight: 950;

  &:hover {
    background: rgba(214, 182, 159, 0.1);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin: 22px 0;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.article`
  border-radius: 24px;
  padding: 22px;
  background: ${({ $danger }) =>
    $danger ? "rgba(255, 74, 74, 0.1)" : "rgba(255, 255, 255, 0.06)"};
  border: 1px solid
    ${({ $danger }) =>
      $danger ? "rgba(255, 74, 74, 0.24)" : "rgba(255, 255, 255, 0.09)"};
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.2);
`;

const StatLabel = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.68);
  font-size: 0.85rem;
`;

const StatValue = styled.h2`
  margin: 8px 0 0;
  color: #d6b69f;
  font-size: 2.15rem;
`;

const Panel = styled.section`
  border-radius: 30px;
  padding: 24px;
  background: rgba(61, 38, 26, 0.78);
  border: 1px solid rgba(214, 182, 159, 0.13);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.06),
    0 18px 44px rgba(45, 18, 8, 0.38);
`;

const PanelTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.55rem;
  color: #fff9f2;
`;

const PanelText = styled.p`
  margin: 8px 0 0;
  color: rgba(255, 249, 242, 0.68);
`;

const Filters = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 240px 180px 180px 210px;
  gap: 16px;
  margin: 22px 0;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.label`
  display: grid;
  gap: 8px;
`;

const Label = styled.span`
  color: #d6b69f;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: #000000;
  color: #ffffff;
  border-radius: 16px;
  padding: 14px 15px;
  outline: none;

  &:focus {
    border-color: #d6b69f;
  }
`;

const Select = styled.select`
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: #000000;
  color: #ffffff;
  border-radius: 16px;
  padding: 14px 15px;
  outline: none;

  &:focus {
    border-color: #d6b69f;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  resize: vertical;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: #000000;
  color: #ffffff;
  border-radius: 16px;
  padding: 14px 15px;
  outline: none;
  font-family: inherit;

  &:focus {
    border-color: #d6b69f;
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: 24px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1320px;
  background: rgba(0, 0, 0, 0.36);

  th,
  td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    vertical-align: top;
  }

  th {
    color: #d6b69f;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  td {
    color: rgba(255, 255, 255, 0.9);
  }
`;

const Badge = styled.span`
  display: inline-flex;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 0.72rem;
  font-weight: 950;
  color: #2f1b12;
  background: #d6b69f;
`;

const SeverityBadge = styled.span`
  display: inline-flex;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 0.72rem;
  font-weight: 950;
  text-transform: uppercase;
  color: #2f1b12;
  background: #fff9f2;

  &[data-severity="high"] {
    background: #ffdede;
    color: #3d120f;
  }

  &[data-severity="critical"] {
    background: #ffb3b3;
    color: #280000;
  }

  &[data-severity="low"] {
    background: rgba(214, 182, 159, 0.85);
    color: #2f1b12;
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 0.72rem;
  font-weight: 950;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.08);
  color: #fff9f2;
  border: 1px solid rgba(255, 255, 255, 0.12);

  &[data-status="suspicious"] {
    background: rgba(255, 74, 74, 0.14);
    border-color: rgba(255, 74, 74, 0.28);
  }

  &[data-status="resolved"],
  &[data-status="reviewed"] {
    background: rgba(214, 182, 159, 0.14);
    border-color: rgba(214, 182, 159, 0.28);
  }
`;

const Small = styled.span`
  display: block;
  color: rgba(255, 249, 242, 0.52);
  font-size: 0.76rem;
  margin-top: 5px;
  max-width: 260px;
  word-break: break-word;
`;

const ActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 240px;
`;

const MiniButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.22);
  border-radius: 999px;
  padding: 8px 11px;
  background: rgba(255, 255, 255, 0.045);
  color: #fff9f2;
  cursor: pointer;
  font-size: 0.74rem;
  font-weight: 900;

  &:hover {
    background: rgba(214, 182, 159, 0.11);
  }

  &:disabled {
    opacity: 0.44;
    cursor: not-allowed;
  }
`;

const MiniDanger = styled(MiniButton)`
  border-color: rgba(255, 74, 74, 0.28);
  color: #ffdede;

  &:hover {
    background: rgba(255, 74, 74, 0.12);
  }
`;

const EmptyBox = styled.div`
  border-radius: 24px;
  padding: 34px;
  text-align: center;
  background: rgba(0, 0, 0, 0.28);
  color: rgba(255, 249, 242, 0.74);
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 22px;

  @media (max-width: 520px) {
    justify-content: center;
  }
`;

const PageButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.28);
  border-radius: 999px;
  padding: 11px 16px;
  background: transparent;
  color: #fff9f2;
  cursor: pointer;
  font-weight: 850;

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: rgba(255, 249, 242, 0.7);
  font-size: 0.9rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgba(0, 0, 0, 0.74);
  backdrop-filter: blur(12px);
`;

const ModalCard = styled.div`
  width: min(94vw, 560px);
  border-radius: 30px;
  padding: 30px;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1),
      rgba(214, 182, 159, 0.07)
    ),
    #2f1b12;
  border: 1px solid rgba(214, 182, 159, 0.24);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.48);
`;

const ModalEyebrow = styled.p`
  margin: 0 0 10px;
  color: #d6b69f;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.76rem;
  font-weight: 950;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 1.8rem;
  letter-spacing: -0.03em;
`;

const ModalText = styled.p`
  margin: 14px 0 0;
  color: rgba(255, 249, 242, 0.76);
  line-height: 1.7;
`;

const ModalField = styled.label`
  display: grid;
  gap: 8px;
  margin-top: 18px;
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
  border-radius: 999px;
  padding: 12px 18px;
  background: transparent;
  color: #fff9f2;
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ModalConfirm = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  background: #d6b69f;
  color: #2f1b12;
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ModalDelete = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  background: #ffdede;
  color: #3d120f;
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
