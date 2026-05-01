import React, { useEffect } from "react";
import styled from "styled-components";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmailCampaignAnalyticsById } from "../reducers/emailAnalytics/emailAnalyticsActions";
import { useToast } from "../components/Toast";

function AdminEmailAnalyticsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const { loading, analytics, error } = useSelector(
    (state) => state.emailAnalytics
  );

  useEffect(() => {
    if (id) dispatch(fetchEmailCampaignAnalyticsById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const data = analytics;
  const campaign = data?.campaign;

  return (
    <Page>
      <Shell>
        <TopBar>
          <BackButton onClick={() => navigate("/admin/email-analytics")}>
            ← Back to Analytics
          </BackButton>
        </TopBar>

        <Hero>
          <Kicker>CAMPAIGN INTELLIGENCE</Kicker>
          <Title>{campaign?.name || "Campaign Analytics"}</Title>
          <Text>
            {campaign?.subject || "Deep performance tracking for this campaign."}
          </Text>
        </Hero>

        {loading ? (
          <StateCard>Loading campaign analytics...</StateCard>
        ) : !data ? (
          <StateCard>No campaign analytics found.</StateCard>
        ) : (
          <>
            <Grid>
              <Card>
                <p>Recipients</p>
                <h2>{campaign?.totalRecipients || 0}</h2>
              </Card>

              <Card>
                <p>Sent</p>
                <h2>{campaign?.totalSent || 0}</h2>
              </Card>

              <Card>
                <p>Failed</p>
                <h2>{campaign?.totalFailed || 0}</h2>
              </Card>

              <Card>
                <p>Open Rate</p>
                <h2>{data.engagement?.openRate || 0}%</h2>
              </Card>

              <Card>
                <p>Click Rate</p>
                <h2>{data.engagement?.clickRate || 0}%</h2>
              </Card>

              <Card>
                <p>Unsubscribe Rate</p>
                <h2>{data.engagement?.unsubscribeRate || 0}%</h2>
              </Card>
            </Grid>

            <LogWrapper>
              <LogHeader>
                <div>
                  <h3>Recent Activity</h3>
                  <p>See who opened, clicked, unsubscribed, or failed.</p>
                </div>

                <StatusBadge $status={campaign?.status || "draft"}>
                  {campaign?.status || "draft"}
                </StatusBadge>
              </LogHeader>

              {data?.recentActivity?.length > 0 ? (
                <TableScroll>
                  <LogTable>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Opened</th>
                        <th>Clicked</th>
                        <th>Error</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.recentActivity.map((log, index) => (
                        <tr key={log._id || index}>
                          <td>{log.email}</td>

                          <td>
                            <StatusBadge $status={log.status}>
                              {log.status || "pending"}
                            </StatusBadge>
                          </td>

                          <td>
                            {log.openedAt
                              ? new Date(log.openedAt).toLocaleString()
                              : "-"}
                          </td>

                          <td>
                            {log.clickedAt
                              ? new Date(log.clickedAt).toLocaleString()
                              : "-"}
                          </td>

                          <td>{log.errorMessage || "-"}</td>
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
`;

const BackButton = styled.button`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 800;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.06);
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
`;

const Text = styled.p`
  max-width: 760px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 1rem;
  line-height: 1.7;
  margin: 1rem 0 0;
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
`;

const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const LogTable = styled.table`
  width: 100%;
  min-width: 760px;
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
  }

  tr:hover {
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

const StateCard = styled.div`
  margin-top: 1.5rem;
  padding: 1.25rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const EmptyBox = styled.div`
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.04);
  color: ${({ theme }) => theme.colors.lightBrown};
`;