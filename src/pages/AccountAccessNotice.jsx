import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import theme from "../Styles/theme";
import {
  socket,
  connectUserSocket,
  disconnectUserSocket,
} from "../../utils/socket";

const DEFAULT_STATUS = "restricted";

const DEFAULT_MESSAGE =
  "Your account access has been restricted. Please contact support if you believe this is a mistake.";

const UPDATED_MESSAGE = "Your account access was updated by an administrator.";

export default function AccountAccessNotice() {
  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState(() => {
    return (
      location.state?.accountStatus ||
      localStorage.getItem("accountStatus") ||
      DEFAULT_STATUS
    );
  });

  const [message, setMessage] = useState(() => {
    return (
      location.state?.message ||
      localStorage.getItem("accountAccessMessage") ||
      DEFAULT_MESSAGE
    );
  });

  useEffect(() => {
    const restrictedUserId = localStorage.getItem("accountAccessUserId");

    if (!restrictedUserId) return;

    connectUserSocket(restrictedUserId);

    const handleAccessUpdated = (data = {}) => {
      const nextStatus = data.accountStatus || DEFAULT_STATUS;
      const nextMessage = data.message || data.statusReason || UPDATED_MESSAGE;

      setStatus(nextStatus);
      setMessage(nextMessage);

      localStorage.setItem("accountStatus", nextStatus);
      localStorage.setItem("accountAccessMessage", nextMessage);

      const restored =
        data.isDeleted !== true &&
        data.isActive !== false &&
        nextStatus === "active";

      if (restored) {
        localStorage.removeItem("accountStatus");
        localStorage.removeItem("accountAccessMessage");
        localStorage.removeItem("accountAccessUserId");

        navigate("/login", {
          replace: true,
          state: {
            message:
              "Your account has been restored. Please log in again to continue.",
          },
        });
      }
    };

    socket.on("account:access-updated", handleAccessUpdated);

    return () => {
      socket.off("account:access-updated", handleAccessUpdated);
      disconnectUserSocket(restrictedUserId);
    };
  }, [navigate]);

  return (
    <Page>
      <Card>
        <Kicker>Account Access Notice</Kicker>

        <Title>Your Account Needs Attention</Title>

        <StatusBadge>{String(status).replace(/_/g, " ")}</StatusBadge>

        <Message>{message}</Message>

        <SupportBox>
          This action was taken to protect the KnockoutCodes platform, our
          users, and account security. If this was a mistake, contact support
          with your account email.
        </SupportBox>

        <ButtonRow>
          <HomeButton to="/">Back To Home</HomeButton>
          <ContactButton to="/contact">Contact Support</ContactButton>
        </ButtonRow>
      </Card>
    </Page>
  );
}

const Page = styled.main`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      transparent 40%
    ),
    linear-gradient(180deg, ${theme.colors.darkBrown}, ${theme.colors.black});
  color: ${theme.colors.ivory};
`;

const Card = styled.section`
  width: min(100%, 680px);
  padding: clamp(1.5rem, 4vw, 2.7rem);
  border-radius: ${theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.72)),
    ${theme.colors.black};
  border: 1px solid rgba(214, 182, 159, 0.28);
  box-shadow: ${theme.shadow.hard};
  text-align: center;
`;

const Kicker = styled.p`
  margin: 0 0 0.75rem;
  color: ${theme.colors.lightBrown};
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 0.78rem;
  font-weight: 900;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.4rem);
  line-height: 1.05;
  text-shadow: ${theme.shadow.glow};
`;

const StatusBadge = styled.div`
  display: inline-flex;
  margin: 1.2rem auto;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  background: rgba(255, 84, 84, 0.13);
  border: 1px solid rgba(255, 176, 176, 0.45);
  color: #ffb0b0;
  text-transform: capitalize;
  font-weight: 900;
  letter-spacing: 0.08em;
`;

const Message = styled.p`
  margin: 0 auto;
  max-width: 560px;
  color: ${theme.colors.ivory};
  font-size: 1.03rem;
  line-height: 1.8;
`;

const SupportBox = styled.div`
  margin-top: 1.2rem;
  padding: 1rem;
  border-radius: ${theme.radius.lg};
  background: rgba(214, 182, 159, 0.08);
  border: 1px solid rgba(214, 182, 159, 0.18);
  color: ${theme.colors.lightBrown};
  line-height: 1.7;
`;

const ButtonRow = styled.div`
  margin-top: 1.4rem;
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const BaseLink = styled(Link)`
  text-decoration: none;
  border-radius: 999px;
  padding: 0.75rem 1.2rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const HomeButton = styled(BaseLink)`
  background: linear-gradient(
    135deg,
    ${theme.colors.lightBrown},
    ${theme.colors.ivory}
  );
  color: ${theme.colors.black};
`;

const ContactButton = styled(BaseLink)`
  background: rgba(0, 0, 0, 0.6);
  color: ${theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.35);
`;
