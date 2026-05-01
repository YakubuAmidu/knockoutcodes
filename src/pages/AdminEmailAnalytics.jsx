import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmailAnalytics } from "../reducers/emailAnalytics/emailAnalyticsActions";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast";
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

function AdminEmailAnalytics() {
  const { showToast } = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, analytics, error } = useSelector(
    (state) => state.emailAnalytics
  );

  const chartData =
    analytics?.recentCampaigns?.map((c) => ({
      name: c.name?.slice(0, 12) || "Campaign",
      sent: c.totalSent || 0,
      failed: c.totalFailed || 0,
      recipients: c.totalRecipients || 0,
    })) || [];

  useEffect(() => {
    dispatch(fetchEmailAnalytics());
  }, [dispatch]);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  return (
    <Page>
      <Shell>
        <Hero
          as={motion.section}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Kicker>EMAIL ANALYTICS COMMAND CENTER</Kicker>
          <Title>Know What Converts. Cut What Doesn’t.</Title>
          <Text>
            Track campaigns, opens, clicks, unsubscribes, failures, audience
            movement, and performance signals from one premium admin dashboard.
          </Text>
        </Hero>

        {loading ? (
          <StateCard>Loading email analytics...</StateCard>
        ) : !analytics ? (
          <StateCard>No analytics data found yet.</StateCard>
        ) : (
          <>
            <CardsGrid>
              <StatCard>
                <StatTitle>Total Campaigns</StatTitle>
                <StatValue>{analytics.cards?.totalCampaigns || 0}</StatValue>
              </StatCard>

              <StatCard>
                <StatTitle>Total Sent</StatTitle>
                <StatValue>{analytics.cards?.totalSent || 0}</StatValue>
              </StatCard>

              <StatCard>
                <StatTitle>Total Failed</StatTitle>
                <StatValue>{analytics.cards?.totalFailed || 0}</StatValue>
              </StatCard>

              <StatCard>
                <StatTitle>Recipients</StatTitle>
                <StatValue>{analytics.cards?.totalRecipients || 0}</StatValue>
              </StatCard>

              <StatCard>
                <StatTitle>Open Rate</StatTitle>
                <StatValue>{analytics.engagement?.openRate || 0}%</StatValue>
              </StatCard>

              <StatCard>
                <StatTitle>Click Rate</StatTitle>
                <StatValue>{analytics.engagement?.clickRate || 0}%</StatValue>
              </StatCard>

              <StatCard>
                <StatTitle>Unsubscribe Rate</StatTitle>
                <StatValue>
                  {analytics.engagement?.unsubscribeRate || 0}%
                </StatValue>
              </StatCard>
            </CardsGrid>

            {chartData.length > 0 && (
              <ChartWrapper>
                <SectionHeader>
                  <h3>Campaign Performance</h3>
                  <p>Track sent vs failed vs recipients across campaigns.</p>
                </SectionHeader>

                <ResponsiveContainer width="100%" height={320}>
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
                    <YAxis stroke="#D6B69F" />
                    <Tooltip
                      contentStyle={{
                        background: "#1a0f0a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        color: "#FFF9F2",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke="#D6B69F"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="#5A3825"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="recipients"
                      stroke="#FFF9F2"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartWrapper>
            )}

            <TableWrapper>
              <SectionHeader>
                <h3>Recent Campaigns</h3>
                <p>Latest campaigns and performance overview.</p>
              </SectionHeader>

              {analytics?.recentCampaigns?.length > 0 ? (
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
                      </tr>
                    </thead>

                    <tbody>
                      {analytics.recentCampaigns.map((c) => (
                        <tr
                          key={c._id}
                          onClick={() =>
                            navigate(`/admin/email-analytics/${c._id}`)
                          }
                        >
                          <td>
                            <CampaignName>{c.name}</CampaignName>
                            <CampaignSubject>{c.subject}</CampaignSubject>
                          </td>

                          <td>
                            <StatusBadge $status={c.status}>
                              {c.status || "draft"}
                            </StatusBadge>
                          </td>

                          <td>{c.totalRecipients || 0}</td>
                          <td>{c.totalSent || 0}</td>
                          <td>{c.totalFailed || 0}</td>
                          <td>
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleDateString()
                              : "-"}
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
  );
}

export default AdminEmailAnalytics;

const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.18), transparent 35%),
    radial-gradient(circle at top right, rgba(90, 56, 37, 0.2), transparent 30%),
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
  min-width: 760px;
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
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
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
        return "rgba(90,56,37,0.35)";
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

const EmptyBox = styled.div`
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.04);
  color: ${({ theme }) => theme.colors.lightBrown};
`;