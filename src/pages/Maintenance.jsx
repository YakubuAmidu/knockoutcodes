import styled, { keyframes } from "styled-components";

const Maintenance = ({
  title = "KnockoutCodes Is Upgrading",
  message = "We are sharpening the platform, improving the training room, and preparing a better experience.",
  updatedAt,
}) => {
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleString()
    : "Maintenance in progress";

  return (
    <Page>
      <Card>
        <Badge>Maintenance Mode</Badge>

        <Title>{title}</Title>

        <Text>{message}</Text>

        <InfoGrid>
          <InfoBox>
            <span>Status</span>
            <strong>Upgrading</strong>
          </InfoBox>

          <InfoBox>
            <span>Access</span>
            <strong>Temporarily Limited</strong>
          </InfoBox>

          <InfoBox>
            <span>Last Updated</span>
            <strong>{formattedDate}</strong>
          </InfoBox>
        </InfoGrid>

        <Notice>
          We are protecting your experience while we improve the system. Please
          check back shortly.
        </Notice>
      </Card>
    </Page>
  );
};

export default Maintenance;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.2), transparent 34%),
    radial-gradient(circle at 85% 20%, rgba(90, 56, 37, 0.4), transparent 40%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
`;

const Card = styled.section`
  width: min(100%, 760px);
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(26px, 5vw, 52px);
  text-align: center;
  background:
    linear-gradient(145deg, rgba(61, 38, 26, 0.86), rgba(0, 0, 0, 0.7)),
    radial-gradient(circle at top, rgba(214, 182, 159, 0.16), transparent 38%);
  border: 1px solid rgba(255, 249, 242, 0.13);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  animation: ${fadeUp} 0.35s ease both;
`;

const Badge = styled.div`
  width: fit-content;
  margin: 0 auto 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 13px;
  color: ${({ theme }) => theme.colors.black};
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2.3rem, 6vw, 5.2rem);
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

const Text = styled.p`
  max-width: 620px;
  margin: 20px auto 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;
  font-size: 15px;
  line-height: 1.75;
`;

const InfoGrid = styled.div`
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const InfoBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(214, 182, 159, 0.16);

  span {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 13px;
    font-weight: 950;
  }
`;

const Notice = styled.div`
  margin-top: 24px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(214, 182, 159, 0.08);
  border: 1px solid rgba(214, 182, 159, 0.18);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 13px;
  line-height: 1.6;
`;