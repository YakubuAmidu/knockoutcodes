import React, { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Footer from "../components/Footer";
import { useToast } from "../components/Toast";
import { fetchEmailCampaignAnalyticsById } from "../reducers/emailAnalytics/emailAnalyticsActions";

function AdminEmailAnalyticsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const lastErrorRef = useRef("");

  const {
  campaignLoading = false,
  selectedCampaign = null,
  campaignTotals = {},
  campaignRates = {},
  recentEvents = [],
  campaignError = "",
} = useSelector((state) => state.emailAnalytics || {});

const loading = campaignLoading;
const error = campaignError;

// eslint-disable-next-line react-hooks/exhaustive-deps
const detailData = selectedCampaign
  ? {
      campaign: selectedCampaign,
      totals: campaignTotals,
      engagement: campaignRates,
      recentActivity: recentEvents,
    }
  : null;

  useEffect(() => {
    if (!id) {
      showToast("Missing campaign analytics ID.", "error");
      navigate("/admin/email-analytics");
      return;
    }

    dispatch(fetchEmailCampaignAnalyticsById(id));
  }, [dispatch, id, navigate, showToast]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) return;
    lastErrorRef.current = error;
    showToast(error, "error");
  }, [error, showToast]);

  const campaign = detailData?.campaign || {};
  const totals = detailData?.totals || {};
  const engagement = detailData?.engagement || detailData?.rates || {};

  const recentActivity = useMemo(() => {
    if (Array.isArray(detailData?.recentActivity)) {
      return detailData.recentActivity;
    }

    if (Array.isArray(detailData?.recentEvents)) {
      return detailData.recentEvents;
    }

    return [];
  }, [detailData]);

  const formatNumber = (value) =>
    new Intl.NumberFormat("en-US").format(Number(value) || 0);

  const formatPercent = (value) => {
    const clean = Number(value) || 0;
    return `${clean.toFixed(clean % 1 === 0 ? 0 : 1)}%`;
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleRefresh = () => {
    if (!id || loading) return;
    dispatch(fetchEmailCampaignAnalyticsById(id));
    showToast("Campaign analytics refreshed.", "success");
  };

  return (
    <>
      <Page>
        <Shell>
          <TopBar>
            <BackButton
              type="button"
              onClick={() => navigate("/admin/email-analytics")}
            >
              ← Back to Analytics
            </BackButton>

            <RefreshButton
              type="button"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </RefreshButton>
          </TopBar>

          <Hero>
            <Kicker>CAMPAIGN INTELLIGENCE</Kicker>
            <Title>{campaign?.name || "Campaign Analytics"}</Title>
            <Text>
              {campaign?.subject ||
                "Deep performance tracking for this campaign."}
            </Text>

            <HeroMeta>
              <StatusBadge $status={campaign?.status || "draft"}>
                {campaign?.status || "draft"}
              </StatusBadge>

              <MetaText>Created: {formatDateTime(campaign?.createdAt)}</MetaText>

              {campaign?.sentAt && (
                <MetaText>Sent: {formatDateTime(campaign.sentAt)}</MetaText>
              )}
            </HeroMeta>
          </Hero>

          {loading && !detailData ? (
            <StateCard>Loading campaign analytics...</StateCard>
          ) : !detailData ? (
            <StateCard>No campaign analytics found.</StateCard>
          ) : (
            <>
              <Grid>
                <Card>
                  <p>Recipients</p>
                  <h2>
                    {formatNumber(
                      totals?.recipients ?? campaign?.totalRecipients
                    )}
                  </h2>
                </Card>

                <Card>
                  <p>Sent</p>
                  <h2>{formatNumber(totals?.sent ?? campaign?.totalSent)}</h2>
                </Card>

                <Card>
                  <p>Failed</p>
                  <h2>
                    {formatNumber(totals?.failed ?? campaign?.totalFailed)}
                  </h2>
                </Card>

                <Card>
                  <p>Opened</p>
                  <h2>{formatNumber(totals?.opened)}</h2>
                </Card>

                <Card>
                  <p>Clicked</p>
                  <h2>{formatNumber(totals?.clicked)}</h2>
                </Card>

                <Card>
                  <p>Unsubscribed</p>
                  <h2>{formatNumber(totals?.unsubscribed)}</h2>
                </Card>

                <Card>
                  <p>Open Rate</p>
                  <h2>{formatPercent(engagement?.openRate)}</h2>
                </Card>

                <Card>
                  <p>Click Rate</p>
                  <h2>{formatPercent(engagement?.clickRate)}</h2>
                </Card>

                <Card>
                  <p>Failure Rate</p>
                  <h2>{formatPercent(engagement?.failureRate)}</h2>
                </Card>
              </Grid>

              <LogWrapper>
                <LogHeader>
                  <div>
                    <h3>Recent Activity</h3>
                    <p>See opens, clicks, unsubscribes, bounces, and failures.</p>
                  </div>

                  <StatusBadge $status={campaign?.status || "draft"}>
                    {campaign?.status || "draft"}
                  </StatusBadge>
                </LogHeader>

                {recentActivity.length > 0 ? (
                  <TableScroll>
                    <LogTable>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Event</th>
                          <th>Opened</th>
                          <th>Clicked</th>
                          <th>Unsubscribed</th>
                          <th>Error</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentActivity.map((log, index) => (
                          <tr key={log?._id || `${log?.email}-${index}`}>
                            <td>{log?.email || log?.recipientEmail || "-"}</td>

                            <td>
                              <StatusBadge $status={log?.status}>
                                {log?.status || "pending"}
                              </StatusBadge>
                            </td>

                            <td>{log?.eventType || log?.type || "-"}</td>
                            <td>{formatDateTime(log?.openedAt)}</td>
                            <td>{formatDateTime(log?.clickedAt)}</td>
                            <td>{formatDateTime(log?.unsubscribedAt)}</td>

                            <td>
                              <ErrorText title={log?.errorMessage || ""}>
                                {log?.errorMessage || "-"}
                              </ErrorText>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </LogTable>
                  </TableScroll>
                ) : (
                  <EmptyBox>No recent activity yet.</EmptyBox>
                )}
              </LogWrapper>
            </>
          )}
        </Shell>
      </Page>

      <Footer />
    </>
  );
}

export default AdminEmailAnalyticsDetail;

const Page = styled.main`
  min-height: 100vh;
  padding: 3rem 1.5rem;
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.18), transparent 35%),
    radial-gradient(circle at top right, rgba(90, 56, 37, 0.2), transparent 30%),
    ${({ theme }) => theme.colors.black};
  color: ${({ theme }) => theme.colors.white};
`;

const Shell = styled.div`
  width: min(1200px, 100%);
  margin: 0 auto;
`;

const TopBar = styled.div`
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const BackButton = styled.button`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.2);
  cursor: pointer;
`;

const RefreshButton = styled.button`
  color: ${({ theme }) => theme.colors.black};
  font-weight: 900;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.lightBrown};
  border: none;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Hero = styled.section`
  padding: clamp(2rem, 5vw, 3rem);
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Kicker = styled.p`
  color: ${({ theme }) => theme.colors.lightBrown};
  letter-spacing: 0.18em;
  font-weight: 900;
  font-size: 0.78rem;
  margin: 0 0 1rem;
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1;
  margin: 0;
  color: ${({ theme }) => theme.colors.white};
  word-break: break-word;
`;

const Text = styled.p`
  max-width: 760px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 1rem;
  line-height: 1.7;
  margin: 1rem 0 0;
`;

const HeroMeta = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 1.3rem;
`;

const MetaText = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.85rem;
`;

const Grid = styled.div`
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 1rem;
`;

const Card = styled.div`
  padding: 1.35rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 900;
  }

  h2 {
    margin: 0.65rem 0 0;
    font-size: 2rem;
    color: ${({ theme }) => theme.colors.white};
  }
`;

const LogWrapper = styled.section`
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const LogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;

  h3 {
    margin: 0;
    color: ${({ theme }) => theme.colors.white};
  }

  p {
    margin: 0.35rem 0 0;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 0.9rem;
  }

  @media (max-width: 620px) {
    flex-direction: column;
  }
`;

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const LogTable = styled.table`
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 0.85rem;
    color: ${({ theme }) => theme.colors.lightBrown};
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  td {
    padding: 0.95rem 0.85rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 0.9rem;
    vertical-align: middle;
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.035);
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.38rem 0.72rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;

  background: ${({ $status }) => {
    switch ($status) {
      case "sent":
      case "opened":
      case "clicked":
        return "rgba(214,182,159,0.22)";
      case "failed":
      case "bounced":
        return "rgba(180,60,45,0.25)";
      case "scheduled":
        return "rgba(255,255,255,0.12)";
      case "draft":
      case "pending":
        return "rgba(255,255,255,0.07)";
      case "unsubscribed":
        return "rgba(90,56,37,0.35)";
      default:
        return "rgba(255,255,255,0.08)";
    }
  }};

  color: ${({ theme }) => theme.colors.lightBrown};
`;

const StateCard = styled.div`
  margin-top: 1.5rem;
  padding: 1.25rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.lightBrown};
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const EmptyBox = styled.div`
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.04);
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const ErrorText = styled.span`
  display: inline-block;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;