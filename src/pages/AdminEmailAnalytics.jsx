import React, { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

import Footer from "../components/Footer";
import { useToast } from "../components/Toast";
import { fetchEmailAnalytics } from "../reducers/emailAnalytics/emailAnalyticsActions";

function AdminEmailAnalytics() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const lastErrorRef = useRef("");

  const {
    loading = false,
    analytics = null,
    error = "",
  } = useSelector((state) => state.emailAnalytics || {});

  useEffect(() => {
    dispatch(fetchEmailAnalytics());
  }, [dispatch]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) return;
    lastErrorRef.current = error;
    showToast(error, "error");
  }, [error, showToast]);

  const cards = analytics?.cards || {};
  const engagement = analytics?.engagement || {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentCampaigns = Array.isArray(analytics?.recentCampaigns)
    ? analytics.recentCampaigns
    : [];

  const chartData = useMemo(() => {
    return recentCampaigns.map((campaign, index) => ({
      name:
        campaign?.name?.length > 14
          ? `${campaign.name.slice(0, 14)}...`
          : campaign?.name || `Campaign ${index + 1}`,
      sent: Number(campaign?.totalSent) || 0,
      failed: Number(campaign?.totalFailed) || 0,
      recipients: Number(campaign?.totalRecipients) || 0,
    }));
  }, [recentCampaigns]);

  const formatNumber = (value) => {
    return new Intl.NumberFormat("en-US").format(Number(value) || 0);
  };

  const formatPercent = (value) => {
    const clean = Number(value) || 0;
    return `${clean.toFixed(clean % 1 === 0 ? 0 : 1)}%`;
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleRefresh = () => {
    dispatch(fetchEmailAnalytics());
    showToast("Email analytics refreshed.", "success");
  };

  const handleOpenCampaign = (campaignId) => {
    if (!campaignId) return;
    navigate(`/admin/email-analytics/${campaignId}`);
  };

  return (
    <>
      <Page>
        <Shell>
          <Hero
            as={motion.section}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <HeroTop>
              <div>
                <Kicker>EMAIL ANALYTICS COMMAND CENTER</Kicker>
                <Title>Know What Converts. Cut What Doesn’t.</Title>
                <Text>
                  Track campaigns, opens, clicks, unsubscribes, failures,
                  audience movement, and performance signals from one premium
                  admin dashboard.
                </Text>
              </div>

              <HeroActions>
                <ActionButton type="button" onClick={() => navigate(-1)}>
                  Back
                </ActionButton>
                <ActionButton
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </ActionButton>
              </HeroActions>
            </HeroTop>
          </Hero>

          {loading && !analytics ? (
            <StateCard>Loading email analytics...</StateCard>
          ) : !analytics ? (
            <StateCard>No analytics data found yet.</StateCard>
          ) : (
            <>
              <CardsGrid>
                <StatCard>
                  <StatTitle>Total Campaigns</StatTitle>
                  <StatValue>{formatNumber(cards.totalCampaigns)}</StatValue>
                </StatCard>

                <StatCard>
                  <StatTitle>Total Sent</StatTitle>
                  <StatValue>{formatNumber(cards.totalSent)}</StatValue>
                </StatCard>

                <StatCard>
                  <StatTitle>Total Failed</StatTitle>
                  <StatValue>{formatNumber(cards.totalFailed)}</StatValue>
                </StatCard>

                <StatCard>
                  <StatTitle>Recipients</StatTitle>
                  <StatValue>{formatNumber(cards.totalRecipients)}</StatValue>
                </StatCard>

                <StatCard>
                  <StatTitle>Open Rate</StatTitle>
                  <StatValue>{formatPercent(engagement.openRate)}</StatValue>
                </StatCard>

                <StatCard>
                  <StatTitle>Click Rate</StatTitle>
                  <StatValue>{formatPercent(engagement.clickRate)}</StatValue>
                </StatCard>

                <StatCard>
                  <StatTitle>Unsubscribe Rate</StatTitle>
                  <StatValue>
                    {formatPercent(engagement.unsubscribeRate)}
                  </StatValue>
                </StatCard>
              </CardsGrid>

              <ChartWrapper>
                <SectionHeader>
                  <div>
                    <h3>Campaign Performance</h3>
                    <p>Track sent vs failed vs recipients across campaigns.</p>
                  </div>
                </SectionHeader>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={330}>
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.08)"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="#D6B69F"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#D6B69F" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#1a0f0a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          color: "#FFF9F2",
                        }}
                        labelStyle={{ color: "#FFF9F2" }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sent"
                        stroke="#D6B69F"
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="failed"
                        stroke="#8B3A2E"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="recipients"
                        stroke="#FFF9F2"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyBox>No chart data available yet.</EmptyBox>
                )}
              </ChartWrapper>

              <TableWrapper>
                <SectionHeader>
                  <div>
                    <h3>Recent Campaigns</h3>
                    <p>Latest campaigns and performance overview.</p>
                  </div>
                </SectionHeader>

                {recentCampaigns.length > 0 ? (
                  <TableScroll>
                    <Table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Status</th>
                          <th>Recipients</th>
                          <th>Sent</th>
                          <th>Failed</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentCampaigns.map((campaign) => (
                          <tr key={campaign._id || campaign.name}>
                            <td>
                              <CampaignName>
                                {campaign.name || "Untitled Campaign"}
                              </CampaignName>
                              <CampaignSubject>
                                {campaign.subject || "No subject"}
                              </CampaignSubject>
                            </td>

                            <td>
                              <StatusBadge $status={campaign.status}>
                                {campaign.status || "draft"}
                              </StatusBadge>
                            </td>

                            <td>{formatNumber(campaign.totalRecipients)}</td>
                            <td>{formatNumber(campaign.totalSent)}</td>
                            <td>{formatNumber(campaign.totalFailed)}</td>
                            <td>{formatDate(campaign.createdAt)}</td>
                            <td>
                              <TableButton
                                type="button"
                                onClick={() =>
                                  handleOpenCampaign(campaign._id)
                                }
                                disabled={!campaign._id}
                              >
                                View
                              </TableButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableScroll>
                ) : (
                  <EmptyBox>No recent campaigns yet.</EmptyBox>
                )}
              </TableWrapper>
            </>
          )}
        </Shell>
      </Page>

      <Footer />
    </>
  );
}

export default AdminEmailAnalytics;

const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      transparent 35%
    ),
    radial-gradient(
      circle at top right,
      rgba(90, 56, 37, 0.2),
      transparent 30%
    ),
    ${({ theme }) => theme.colors.black};
  color: ${({ theme }) => theme.colors.white};
  padding: 3rem 1.5rem;
`;

const Shell = styled.div`
  width: min(1200px, 100%);
  margin: 0 auto;
`;

const Hero = styled.section`
  padding: clamp(2rem, 5vw, 3.5rem);
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const HeroTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;

  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

const HeroActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0.85rem 1.1rem;
  cursor: pointer;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.black};
  background: ${({ theme }) => theme.colors.lightBrown};
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Kicker = styled.p`
  color: ${({ theme }) => theme.colors.lightBrown};
  letter-spacing: 0.18em;
  font-weight: 900;
  font-size: 0.78rem;
  margin: 0 0 1rem;
`;

const Title = styled.h1`
  font-size: clamp(2.2rem, 5vw, 4.8rem);
  line-height: 0.95;
  margin: 0;
  color: ${({ theme }) => theme.colors.white};
  max-width: 900px;
`;

const Text = styled.p`
  max-width: 780px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 1.05rem;
  line-height: 1.8;
  margin: 1.25rem 0 0;
`;

const StateCard = styled.div`
  margin-top: 1.5rem;
  padding: 1.35rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const CardsGrid = styled.div`
  margin-top: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const StatCard = styled.div`
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  backdrop-filter: blur(12px);
`;

const StatTitle = styled.p`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 900;
  margin: 0;
`;

const StatValue = styled.h2`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.white};
  margin: 0.6rem 0 0;
`;

const ChartWrapper = styled.section`
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const TableWrapper = styled.section`
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const SectionHeader = styled.div`
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  h3 {
    margin: 0;
    color: ${({ theme }) => theme.colors.white};
    font-size: 1.15rem;
  }

  p {
    margin: 0.35rem 0 0;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 0.9rem;
  }
`;

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;

  th {
    text-align: left;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.colors.lightBrown};
    padding: 0.9rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  td {
    padding: 1rem 0.9rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 0.9rem;
    vertical-align: middle;
  }

  tbody tr {
    transition: background 0.2s ease;
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.035);
  }
`;

const CampaignName = styled.div`
  font-weight: 900;
  color: ${({ theme }) => theme.colors.white};
`;

const CampaignSubject = styled.div`
  margin-top: 0.25rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.78rem;
  max-width: 340px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
        return "rgba(214,182,159,0.22)";
      case "failed":
        return "rgba(180,60,45,0.25)";
      case "scheduled":
        return "rgba(255,255,255,0.12)";
      case "draft":
        return "rgba(255,255,255,0.07)";
      default:
        return "rgba(255,255,255,0.08)";
    }
  }};

  color: ${({ theme }) => theme.colors.lightBrown};
`;

const TableButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.35);
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0.55rem 0.9rem;
  background: rgba(214, 182, 159, 0.12);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(214, 182, 159, 0.2);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyBox = styled.div`
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.04);
  color: ${({ theme }) => theme.colors.lightBrown};
`;