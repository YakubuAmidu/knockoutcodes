import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

import {
  fetchEmailSubscribers,
  updateEmailSubscriber,
  deleteEmailSubscriber,
  blockEmailSubscriber,
  bulkUpdateEmailSubscribers,
  bulkDeleteEmailSubscribers,
  getEmailSubscriberDetails,
  setSelectedEmailSubscriber,
  clearSelectedEmailSubscriber,
  setEmailSubscriberSearch,
  setEmailSubscriberFilter,
  setEmailSubscriberSort,
  clearEmailSubscriberError,
  resetEmailSubscriberSuccess,
} from "../reducers/emailSubscriber/emailSubscriberActions";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_FORM = {
  email: "",
  name: "",
  status: "active",
  source: "manual",
  tags: "",
  notes: "",
  bounceReason: "",
  blockedReason: "",
};

function AdminEmailSubscribers() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { initializing, checkingAuth, isAuthenticated, isAdmin } = useAuth();

  const {
    loading,
    detailsLoading,
    subscribers = [],
    selectedSubscriber,
    summary = {},
    pagination = {},
    search = "",
    error,
    filter = "all",
    sort = "newest",
    success,
    updating,
    deleting,
    bulkLoading,
    successMessage,
  } = useSelector((state) => state.emailSubscribers || {});

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [reason, setReason] = useState("");

  const authLoading = initializing || checkingAuth;
  const subscribersPerPage = 9;

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      dispatch(
        fetchEmailSubscribers({
          page: 1,
          limit: 100,
          search,
          status: filter === "all" ? "" : filter,
          sort,
        }),
      );
    }
  }, [dispatch, isAuthenticated, isAdmin, filter, sort, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && isAdmin) {
        dispatch(
          fetchEmailSubscribers({
            page: 1,
            limit: 100,
            search,
            status: filter === "all" ? "" : filter,
            sort,
          }),
        );
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [dispatch, isAuthenticated, isAdmin, search, filter, sort]);

  useEffect(() => {
    if (error) {
      showToast(error, "error");
      dispatch(clearEmailSubscriberError());
    }

    if (success) {
      showToast(successMessage || "Subscriber action completed", "success");
      dispatch(resetEmailSubscriberSuccess());
    }
  }, [error, success, successMessage, showToast, dispatch]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleClear = useCallback(() => {
    dispatch(clearSelectedEmailSubscriber());
    setFormData(DEFAULT_FORM);
  });

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, filter, sort]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") handleClear();
    };

    if (selectedSubscriber) {
      window.addEventListener("keydown", closeOnEscape);
    }

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [handleClear, selectedSubscriber]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safeSubscribers = Array.isArray(subscribers) ? subscribers : [];

  const filteredSubscribers = useMemo(() => {
    const cleanSearch = String(search || "")
      .toLowerCase()
      .trim();

    return safeSubscribers.filter((subscriber) => {
      const emailMatch = subscriber.email?.toLowerCase().includes(cleanSearch);
      const nameMatch = subscriber.name?.toLowerCase().includes(cleanSearch);
      const tagMatch = Array.isArray(subscriber.tags)
        ? subscriber.tags.join(" ").toLowerCase().includes(cleanSearch)
        : false;

      const statusMatch = filter === "all" || subscriber.status === filter;

      return (
        (emailMatch || nameMatch || tagMatch || !cleanSearch) && statusMatch
      );
    });
  }, [safeSubscribers, search, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubscribers.length / subscribersPerPage),
  );

  const paginatedSubscribers = filteredSubscribers.slice(
    (currentPage - 1) * subscribersPerPage,
    currentPage * subscribersPerPage,
  );

  const stats = {
    total: summary.totalAll ?? safeSubscribers.length,
    active:
      summary.active ??
      safeSubscribers.filter((s) => s.status === "active").length,
    unsubscribed:
      summary.unsubscribed ??
      safeSubscribers.filter((s) => s.status === "unsubscribed").length,
    bounced:
      summary.bounced ??
      safeSubscribers.filter((s) => s.status === "bounced").length,
    blocked:
      summary.blocked ??
      safeSubscribers.filter((s) => s.status === "blocked").length,
    sentCount: summary.sentCount || 0,
    openCount: summary.openCount || 0,
    clickCount: summary.clickCount || 0,
    bounceRate: summary.bounceRate || 0,
    openRate: summary.openRate || 0,
    clickRate: summary.clickRate || 0,
    unsubscribeRate: summary.unsubscribeRate || 0,
    results: filteredSubscribers.length,
  };

  const selectedEmails = safeSubscribers
    .filter((s) => selectedIds.includes(s._id))
    .map((s) => s.email)
    .filter(Boolean);

  const handleSelect = async (subscriber) => {
    if (!subscriber?._id) return;

    dispatch(setSelectedEmailSubscriber(subscriber));

    setFormData({
      email: subscriber.email || "",
      name: subscriber.name || "",
      status: subscriber.status || "active",
      source: subscriber.source || "manual",
      tags: Array.isArray(subscriber.tags) ? subscriber.tags.join(", ") : "",
      notes: subscriber.notes || "",
      bounceReason: subscriber.bounceReason || "",
      blockedReason: subscriber.blockedReason || "",
    });

    await dispatch(getEmailSubscriberDetails(subscriber._id));
  };

  const handleUpdate = async () => {
    if (!selectedSubscriber?._id) {
      showToast("No subscriber selected", "error");
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      showToast("Enter a valid email address", "error");
      return;
    }

    const payload = {
      email: cleanEmail,
      name: formData.name.trim(),
      status: formData.status,
      source: formData.source,
      notes: formData.notes.trim(),
      bounceReason:
        formData.status === "bounced" ? formData.bounceReason.trim() : "",
      blockedReason:
        formData.status === "blocked" ? formData.blockedReason.trim() : "",
      tags: String(formData.tags || "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    };

    const result = await dispatch(
      updateEmailSubscriber(selectedSubscriber._id, payload),
    );

    if (result?.success) {
      handleClear();
      dispatch(fetchEmailSubscribers({ page: 1, limit: 100 }));
    }
  };

  const handleDelete = async (subscriber) => {
    if (!subscriber?._id) return;

    const confirmed = window.confirm(
      `Delete this subscriber?\n\n${subscriber.email}\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    const result = await dispatch(deleteEmailSubscriber(subscriber._id));

    if (result?.success && selectedSubscriber?._id === subscriber._id) {
      handleClear();
    }
  };

  const handleBlock = async (subscriber) => {
    if (!subscriber?._id) return;

    const shouldBlock = subscriber.status !== "blocked";
    const result = await dispatch(
      blockEmailSubscriber(subscriber._id, shouldBlock),
    );

    if (result?.success) {
      dispatch(fetchEmailSubscribers({ page: 1, limit: 100 }));
    }
  };

  const toggleSelectSubscriber = (id) => {
    if (!id) return;

    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedSubscribers.map((subscriber) => subscriber._id);
    const allPageSelected = pageIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) =>
      allPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      showToast("Select at least one subscriber", "error");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} subscribers?`)) return;

    const result = await dispatch(bulkDeleteEmailSubscribers(selectedIds));

    if (result?.success) {
      setSelectedIds([]);
      dispatch(fetchEmailSubscribers({ page: 1, limit: 100 }));
    }
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) {
      showToast("Select at least one subscriber", "error");
      return;
    }

    if ((status === "blocked" || status === "bounced") && !reason.trim()) {
      showToast("Add a reason before blocking or marking bounced", "error");
      return;
    }

    const result = await dispatch(
      bulkUpdateEmailSubscribers({
        ids: selectedIds,
        status,
        reason,
      }),
    );

    if (result?.success) {
      setSelectedIds([]);
      setReason("");
      dispatch(fetchEmailSubscribers({ page: 1, limit: 100 }));
    }
  };

  const handleSendToCampaign = () => {
    if (selectedEmails.length === 0) {
      showToast("Select subscribers first", "error");
      return;
    }

    localStorage.setItem(
      "selectedCampaignEmails",
      JSON.stringify(selectedEmails),
    );
    showToast("Subscribers added to campaign", "success");
    navigate("/admin/email-campaigns/create");
  };

  const handleExportCSV = () => {
    if (!filteredSubscribers.length) {
      showToast("No subscribers to export", "error");
      return;
    }

    const headers = [
      "Email",
      "Name",
      "Status",
      "Source",
      "Tags",
      "Sent",
      "Opens",
      "Clicks",
      "Open Rate",
      "Click Rate",
      "Created At",
    ];

    const rows = filteredSubscribers.map((subscriber) => {
      const sent = Number(subscriber.sentCount || 0);
      const opens = Number(subscriber.openCount || 0);
      const clicks = Number(subscriber.clickCount || 0);

      return [
        subscriber.email || "",
        subscriber.name || "",
        subscriber.status || "active",
        subscriber.source || "",
        Array.isArray(subscriber.tags) ? subscriber.tags.join(" | ") : "",
        sent,
        opens,
        clicks,
        sent > 0 ? `${Math.round((opens / sent) * 100)}%` : "0%",
        sent > 0 ? `${Math.round((clicks / sent) * 100)}%` : "0%",
        subscriber.createdAt
          ? new Date(subscriber.createdAt).toLocaleDateString()
          : "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "email-subscribers-enterprise.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    showToast("CSV exported successfully", "success");
  };

  if (authLoading) {
    return <Container>Checking admin access...</Container>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return (
    <Container>
      <TopGlow />

      <Hero>
        <HeroContent>
          <Eyebrow>KnockoutCodes Audience Control</Eyebrow>
          <Header>Email Subscribers</Header>
          <SubHeader>
            Enterprise subscriber management with bulk APIs, analytics, notes,
            consent data, engagement tracking, export, and campaign targeting.
          </SubHeader>
        </HeroContent>

        <HeroBadge>
          <span>Protected List</span>
          <strong>{stats.total}</strong>
        </HeroBadge>
      </Hero>

      <StatsGrid>
        <StatCard>
          <span>Total</span>
          <strong>{stats.total}</strong>
          <small>All subscribers</small>
        </StatCard>

        <StatCard>
          <span>Active</span>
          <strong>{stats.active}</strong>
          <small>Ready to email</small>
        </StatCard>

        <StatCard>
          <span>Unsubscribed</span>
          <strong>{stats.unsubscribed}</strong>
          <small>Do not send</small>
        </StatCard>

        <StatCard>
          <span>Bounced</span>
          <strong>{stats.bounced}</strong>
          <small>Delivery issues</small>
        </StatCard>

        <StatCard>
          <span>Blocked</span>
          <strong>{stats.blocked}</strong>
          <small>Suppressed contacts</small>
        </StatCard>

        <StatCard>
          <span>Open Rate</span>
          <strong>{stats.openRate}%</strong>
          <small>{stats.openCount} opens</small>
        </StatCard>

        <StatCard>
          <span>Click Rate</span>
          <strong>{stats.clickRate}%</strong>
          <small>{stats.clickCount} clicks</small>
        </StatCard>

        <StatCard>
          <span>Bounce Rate</span>
          <strong>{stats.bounceRate}%</strong>
          <small>{stats.sentCount} sent</small>
        </StatCard>
      </StatsGrid>

      <ControlPanel>
        <SearchInput
          placeholder="Search by email, name, or tag..."
          value={search}
          onChange={(e) => dispatch(setEmailSubscriberSearch(e.target.value))}
        />

        <Input
          as="select"
          value={sort}
          onChange={(e) => dispatch(setEmailSubscriberSort(e.target.value))}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="email">Email A-Z</option>
          <option value="mostOpened">Most Opened</option>
          <option value="mostClicked">Most Clicked</option>
          <option value="recentlySent">Recently Sent</option>
          <option value="recentlyOpened">Recently Opened</option>
          <option value="recentlyClicked">Recently Clicked</option>
        </Input>
      </ControlPanel>

      <FilterRow>
        {["all", "active", "unsubscribed", "bounced", "blocked"].map((item) => (
          <FilterButton
            key={item}
            $active={filter === item}
            onClick={() => dispatch(setEmailSubscriberFilter(item))}
          >
            {item}
          </FilterButton>
        ))}
      </FilterRow>

      <BulkBar>
        <BulkLeft>
          <label>
            <input
              type="checkbox"
              checked={
                paginatedSubscribers.length > 0 &&
                paginatedSubscribers.every((subscriber) =>
                  selectedIds.includes(subscriber._id),
                )
              }
              onChange={toggleSelectAll}
            />
            Select Page
          </label>

          <span>
            {selectedIds.length} selected • Showing{" "}
            {paginatedSubscribers.length}
          </span>

          <ReasonInput
            placeholder="Reason for block/bounce..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </BulkLeft>

        <BulkActions>
          <ActionButton
            $danger
            disabled={bulkLoading}
            onClick={handleBulkDelete}
          >
            {bulkLoading ? "Working..." : "Delete"}
          </ActionButton>

          <ActionButton
            $warn
            disabled={bulkLoading}
            onClick={() => handleBulkStatus("blocked")}
          >
            Block
          </ActionButton>

          <ActionButton
            disabled={bulkLoading}
            onClick={() => handleBulkStatus("active")}
          >
            Activate
          </ActionButton>

          <ActionButton
            $warn
            disabled={bulkLoading}
            onClick={() => handleBulkStatus("unsubscribed")}
          >
            Unsubscribe
          </ActionButton>

          <ActionButton
            $warn
            disabled={bulkLoading}
            onClick={() => handleBulkStatus("bounced")}
          >
            Mark Bounced
          </ActionButton>

          <ActionButton $gold onClick={handleExportCSV}>
            Export CSV
          </ActionButton>

          <ActionButton $gold onClick={handleSendToCampaign}>
            Send To Campaign
          </ActionButton>
        </BulkActions>
      </BulkBar>

      <Grid>
        {loading ? (
          <LoadingState>
            <LoaderDot />
            <h3>Loading subscribers...</h3>
            <p>Checking your protected email list.</p>
          </LoadingState>
        ) : filteredSubscribers.length === 0 ? (
          <EmptyState>
            <h3>No subscribers found</h3>
            <p>When people join your email list, they will appear here.</p>
          </EmptyState>
        ) : (
          paginatedSubscribers.map((subscriber) => (
            <Card key={subscriber._id}>
              <CardTop>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(subscriber._id)}
                  onChange={() => toggleSelectSubscriber(subscriber._id)}
                />

                <Status $status={subscriber.status}>
                  {(subscriber.status || "active").toUpperCase()}
                </Status>
              </CardTop>

              <Avatar>{(subscriber.name || subscriber.email || "?")[0]}</Avatar>
              <Email>{subscriber.email}</Email>

              <Meta>
                <span>{subscriber.name || "No name saved"}</span>
                <small>{subscriber.source || "newsletter"}</small>
                <small>
                  Sent: {subscriber.sentCount || 0} • Opens:{" "}
                  {subscriber.openCount || 0} • Clicks:{" "}
                  {subscriber.clickCount || 0}
                </small>
                <small>
                  {subscriber.createdAt
                    ? new Date(subscriber.createdAt).toLocaleDateString()
                    : "No date"}
                </small>
              </Meta>

              <ButtonRow>
                <ActionButton onClick={() => handleSelect(subscriber)}>
                  View / Edit
                </ActionButton>

                <ActionButton
                  $danger
                  disabled={deleting}
                  onClick={() => handleDelete(subscriber)}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </ActionButton>

                <ActionButton
                  $warn
                  disabled={updating}
                  onClick={() => handleBlock(subscriber)}
                >
                  {subscriber.status === "blocked" ? "Unblock" : "Block"}
                </ActionButton>
              </ButtonRow>
            </Card>
          ))
        )}
      </Grid>

      <PaginationRow>
        <PageButton
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
        >
          Previous
        </PageButton>

        <PageText>
          Page {currentPage} of {totalPages} • Backend pages:{" "}
          {pagination.pages || 1}
        </PageText>

        <PageButton
          disabled={currentPage >= totalPages}
          onClick={() =>
            setCurrentPage((page) => Math.min(totalPages, page + 1))
          }
        >
          Next
        </PageButton>
      </PaginationRow>

      {selectedSubscriber && (
        <ModalOverlay onMouseDown={handleClear}>
          <ModalCard onMouseDown={(e) => e.stopPropagation()}>
            <ModalTop>
              <div>
                <Eyebrow>Subscriber Detail</Eyebrow>
                <ModalTitle>Update Contact</ModalTitle>
              </div>

              <CloseButton type="button" onClick={handleClear}>
                ×
              </CloseButton>
            </ModalTop>

            {detailsLoading && (
              <ModalNote>Loading full subscriber history...</ModalNote>
            )}

            <FieldGroup>
              <label>Email Address</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </FieldGroup>

            <FieldGroup>
              <label>Name</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </FieldGroup>

            <FieldGroup>
              <label>Status</label>
              <Input
                as="select"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="active">Active</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="bounced">Bounced</option>
                <option value="blocked">Blocked</option>
              </Input>
            </FieldGroup>

            <FieldGroup>
              <label>Source</label>
              <Input
                as="select"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
              >
                <option value="newsletter">Newsletter</option>
                <option value="checkout">Checkout</option>
                <option value="manual">Manual</option>
                <option value="campaign">Campaign</option>
                <option value="import">Import</option>
              </Input>
            </FieldGroup>

            <FieldGroup>
              <label>Tags</label>
              <Input
                value={formData.tags}
                placeholder="boxing, vip, course-buyer"
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
            </FieldGroup>

            <FieldGroup>
              <label>Admin Notes</label>
              <TextArea
                value={formData.notes}
                placeholder="Private admin notes about this subscriber..."
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </FieldGroup>

            {formData.status === "bounced" && (
              <FieldGroup>
                <label>Bounce Reason</label>
                <Input
                  value={formData.bounceReason}
                  placeholder="Mailbox full, invalid address, hard bounce..."
                  onChange={(e) =>
                    setFormData({ ...formData, bounceReason: e.target.value })
                  }
                />
              </FieldGroup>
            )}

            {formData.status === "blocked" && (
              <FieldGroup>
                <label>Blocked Reason</label>
                <Input
                  value={formData.blockedReason}
                  placeholder="Spam complaint, manual block, risk..."
                  onChange={(e) =>
                    setFormData({ ...formData, blockedReason: e.target.value })
                  }
                />
              </FieldGroup>
            )}

            <InsightBox>
              <strong>Engagement</strong>
              <span>Sent: {selectedSubscriber.sentCount || 0}</span>
              <span>Opens: {selectedSubscriber.openCount || 0}</span>
              <span>Clicks: {selectedSubscriber.clickCount || 0}</span>
              <span>
                Last Sent:{" "}
                {selectedSubscriber.lastEmailSentAt
                  ? new Date(
                      selectedSubscriber.lastEmailSentAt,
                    ).toLocaleString()
                  : "Never"}
              </span>
              <span>
                Last Opened:{" "}
                {selectedSubscriber.lastOpenedAt
                  ? new Date(selectedSubscriber.lastOpenedAt).toLocaleString()
                  : "Never"}
              </span>
              <span>
                Last Clicked:{" "}
                {selectedSubscriber.lastClickedAt
                  ? new Date(selectedSubscriber.lastClickedAt).toLocaleString()
                  : "Never"}
              </span>
            </InsightBox>

            <HistoryBox>
              <strong>Activity History</strong>

              {Array.isArray(selectedSubscriber.activityLog) &&
              selectedSubscriber.activityLog.length > 0 ? (
                selectedSubscriber.activityLog
                  .slice()
                  .reverse()
                  .map((item, index) => (
                    <HistoryItem key={`${item.action}-${index}`}>
                      <span>{item.action}</span>
                      <small>{item.message || "No message"}</small>
                      <em>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : ""}
                      </em>
                    </HistoryItem>
                  ))
              ) : (
                <small>No activity history yet.</small>
              )}
            </HistoryBox>

            <ModalActions>
              <ActionButton onClick={handleUpdate} disabled={updating}>
                {updating ? "Updating..." : "Save Changes"}
              </ActionButton>

              <ActionButton $danger type="button" onClick={handleClear}>
                Cancel
              </ActionButton>
            </ModalActions>
          </ModalCard>
        </ModalOverlay>
      )}
    </Container>
  );
}

export default AdminEmailSubscribers;

/* =========================
   STYLES
========================= */

const Container = styled.div`
  position: relative;
  padding: 34px;
  min-height: 100vh;
  overflow: hidden;
  color: #fff9f2;
  background:
    radial-gradient(
      circle at 12% 8%,
      rgba(214, 182, 159, 0.24),
      transparent 28%
    ),
    radial-gradient(circle at 88% 0%, rgba(90, 56, 37, 0.42), transparent 28%),
    linear-gradient(135deg, #050201, #1b0d07 42%, #3d261a);
`;

const TopGlow = styled.div`
  position: absolute;
  inset: -140px auto auto 50%;
  width: 620px;
  height: 280px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.16);
  filter: blur(80px);
  pointer-events: none;
`;

const Hero = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: stretch;
  margin-bottom: 26px;
  padding: 26px;
  border-radius: 30px;
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.09),
    rgba(255, 255, 255, 0.035)
  );
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(18px);

  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

const HeroContent = styled.div`
  max-width: 760px;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  margin-bottom: 10px;
  color: #d6b69f;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const Header = styled.h1`
  margin: 0 0 12px;
  font-size: clamp(34px, 5vw, 64px);
  font-weight: 950;
  letter-spacing: -0.06em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #ffffff, #fff9f2, #d6b69f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const SubHeader = styled.p`
  max-width: 760px;
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: rgba(255, 249, 242, 0.76);
`;

const HeroBadge = styled.div`
  min-width: 190px;
  display: grid;
  place-content: center;
  text-align: center;
  border-radius: 26px;
  border: 1px solid rgba(214, 182, 159, 0.24);
  background: linear-gradient(145deg, #2f1b12, #5a3825);

  span {
    color: #fff9f2;
    opacity: 0.78;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 8px;
    font-size: 42px;
    color: #ffffff;
  }
`;

const StatsGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
  gap: 16px;
  margin-bottom: 22px;
`;

const StatCard = styled.div`
  padding: 20px;
  border-radius: 24px;
  border: 1px solid rgba(214, 182, 159, 0.18);
  background: linear-gradient(
    145deg,
    rgba(47, 27, 18, 0.92),
    rgba(61, 38, 26, 0.82)
  );
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);

  span {
    display: block;
    margin-bottom: 8px;
    color: #d6b69f;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  strong {
    display: block;
    font-size: 32px;
    color: #ffffff;
  }

  small {
    display: block;
    margin-top: 8px;
    color: rgba(255, 249, 242, 0.58);
  }
`;

const ControlPanel = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 14px;
  margin-bottom: 18px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 15px 16px;
  color: #fff9f2;
  outline: none;
  border-radius: 18px;
  border: 1px solid rgba(214, 182, 159, 0.25);
  background: rgba(255, 255, 255, 0.06);

  &::placeholder {
    color: rgba(255, 249, 242, 0.54);
  }

  &:focus {
    border-color: #d6b69f;
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.12);
  }
`;

const FilterRow = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
`;

const FilterButton = styled.button`
  padding: 10px 15px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active }) => ($active ? "#d6b69f" : "rgba(214, 182, 159, 0.22)")};
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, #d6b69f, #5a3825)"
      : "rgba(255, 255, 255, 0.06)"};
  color: ${({ $active }) => ($active ? "#ffffff" : "#d6b69f")};
  cursor: pointer;
  font-weight: 900;
  text-transform: capitalize;
`;

const BulkBar = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  margin-bottom: 20px;
  border-radius: 20px;
  border: 1px solid rgba(214, 182, 159, 0.18);
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(14px);
  flex-wrap: wrap;
`;

const BulkLeft = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff9f2;
    font-weight: 800;
  }

  span {
    color: #d6b69f;
    font-size: 14px;
  }

  input {
    accent-color: #d6b69f;
  }
`;

const ReasonInput = styled.input`
  min-width: 240px;
  padding: 11px 13px;
  color: #fff9f2;
  border-radius: 14px;
  outline: none;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.22);

  &::placeholder {
    color: rgba(255, 249, 242, 0.5);
  }
`;

const BulkActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Grid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 16px;
`;

const Card = styled.div`
  position: relative;
  padding: 18px;
  border-radius: 26px;
  border: 1px solid rgba(214, 182, 159, 0.18);
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.035)
    ),
    rgba(47, 27, 18, 0.72);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(16px);
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;

  input {
    cursor: pointer;
    transform: scale(1.15);
    accent-color: #d6b69f;
  }
`;

const Avatar = styled.div`
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  margin-bottom: 14px;
  border-radius: 16px;
  color: #2f1b12;
  background: linear-gradient(135deg, #fff9f2, #d6b69f);
  font-size: 20px;
  font-weight: 950;
  text-transform: uppercase;
`;

const Email = styled.p`
  margin: 0 0 10px;
  color: #fff9f2;
  font-size: 14px;
  font-weight: 900;
  overflow-wrap: anywhere;
`;

const Meta = styled.p`
  display: grid;
  gap: 4px;
  margin: 0 0 16px;
  color: #d6b69f;
  font-size: 13px;

  small {
    color: rgba(255, 249, 242, 0.55);
  }
`;

const Status = styled.p`
  margin: 0;
  padding: 7px 10px;
  border-radius: 999px;
  color: #fff9f2;
  background: ${({ $status }) => {
    if ($status === "blocked") return "rgba(143, 55, 36, 0.45)";
    if ($status === "bounced") return "rgba(255, 160, 64, 0.25)";
    if ($status === "unsubscribed") return "rgba(120, 120, 120, 0.28)";
    return "rgba(214, 182, 159, 0.16)";
  }};
  border: 1px solid rgba(214, 182, 159, 0.22);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 9px 13px;
  border-radius: 12px;
  border: 1px solid
    ${({ $danger, $warn }) =>
      $danger
        ? "rgba(255, 120, 90, 0.28)"
        : $warn
          ? "rgba(214, 182, 159, 0.3)"
          : "rgba(214, 182, 159, 0.36)"};
  background: ${({ $danger, $warn, $gold }) =>
    $danger
      ? "linear-gradient(135deg, #2f1b12, #1b0d07)"
      : $warn
        ? "linear-gradient(135deg, #5a3825, #3d261a)"
        : $gold
          ? "linear-gradient(135deg, #fff9f2, #d6b69f, #5a3825)"
          : "linear-gradient(135deg, #d6b69f, #5a3825)"};
  color: ${({ $gold }) => ($gold ? "#2f1b12" : "#ffffff")};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  font-weight: 950;
`;

const PaginationRow = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  margin-top: 28px;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  padding: 11px 18px;
  border-radius: 999px;
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: ${({ disabled }) =>
    disabled
      ? "rgba(255, 255, 255, 0.04)"
      : "linear-gradient(135deg, #d6b69f, #5a3825)"};
  color: ${({ disabled }) => (disabled ? "rgba(255, 249, 242, 0.4)" : "#fff")};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font-weight: 950;
`;

const PageText = styled.span`
  color: #d6b69f;
  font-weight: 900;
`;

const LoadingState = styled.div`
  grid-column: 1 / -1;
  padding: 48px 24px;
  text-align: center;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.18);

  h3 {
    margin: 14px 0 8px;
    color: #fff9f2;
  }

  p {
    color: #d6b69f;
  }
`;

const LoaderDot = styled.div`
  width: 18px;
  height: 18px;
  margin: 0 auto;
  border-radius: 999px;
  background: #d6b69f;
  box-shadow: 0 0 24px rgba(214, 182, 159, 0.75);
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  padding: 44px 24px;
  text-align: center;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.18);

  h3 {
    margin-bottom: 8px;
    color: #fff9f2;
    font-size: 24px;
  }

  p {
    color: #d6b69f;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(12px);
`;

const ModalCard = styled.div`
  width: min(620px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(214, 182, 159, 0.28);
  background:
    radial-gradient(
      circle at top right,
      rgba(214, 182, 159, 0.16),
      transparent 35%
    ),
    linear-gradient(145deg, #1b0d07, #2f1b12 54%, #3d261a);
`;

const ModalTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 10px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #fff9f2;
  font-size: 28px;
`;

const CloseButton = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(214, 182, 159, 0.28);
  background: rgba(255, 255, 255, 0.06);
  color: #fff9f2;
  cursor: pointer;
  font-size: 24px;
`;

const ModalNote = styled.p`
  margin: 0 0 18px;
  color: rgba(255, 249, 242, 0.68);
`;

const FieldGroup = styled.div`
  margin-bottom: 14px;

  label {
    display: block;
    margin-bottom: 8px;
    color: #d6b69f;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 15px;
  color: #fff9f2;
  border-radius: 16px;
  outline: none;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.24);

  option {
    background: #1b0d07;
    color: #fff9f2;
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.48);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 90px;
  resize: vertical;
  padding: 14px 15px;
  color: #fff9f2;
  border-radius: 16px;
  outline: none;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.24);

  &::placeholder {
    color: rgba(255, 249, 242, 0.48);
  }
`;

const InsightBox = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(255, 255, 255, 0.05);

  strong {
    color: #fff9f2;
    margin-bottom: 4px;
  }

  span {
    color: rgba(255, 249, 242, 0.72);
    font-size: 13px;
  }
`;

const HistoryBox = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(255, 255, 255, 0.05);

  strong {
    color: #fff9f2;
  }

  small {
    color: rgba(255, 249, 242, 0.66);
  }
`;

const HistoryItem = styled.div`
  display: grid;
  gap: 3px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(214, 182, 159, 0.12);

  span {
    color: #d6b69f;
    font-weight: 900;
    text-transform: capitalize;
  }

  small {
    color: rgba(255, 249, 242, 0.72);
  }

  em {
    color: rgba(255, 249, 242, 0.45);
    font-size: 11px;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 20px;
`;
