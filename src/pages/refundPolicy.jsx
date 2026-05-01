// src/pages/RefundPolicy.jsx
import styled from "styled-components";
import { motion } from "framer-motion";

const Page = styled.main`
  min-height: 100vh;
  background: ${({ theme }) =>
    `radial-gradient(
      circle at top,
      ${theme.colors.lightBrown} 0%,
      ${theme.colors.brown} 35%,
      ${theme.colors.darkBrown} 70%,
      ${theme.colors.black} 100%
    )`};
  color: ${({ theme }) => theme.colors.ivory};
  padding: 120px 20px 100px;
  display: flex;
  justify-content: center;
`;

const Container = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
`;

const Card = styled(motion.section)`
  background: ${({ theme }) => theme.colors.glass};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 48px;
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 768px) {
    padding: 32px 24px;
  }
`;

const Title = styled.h1`
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Hook = styled.p`
  font-size: 1.15rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 40px;
  max-width: 780px;
`;

const Section = styled.div`
  margin-bottom: 40px;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.white};
`;

const Text = styled.p`
  font-size: 1rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.ivory};
  margin-bottom: 12px;
`;

const List = styled.ul`
  padding-left: 18px;
  margin-top: 12px;

  li {
    margin-bottom: 10px;
    line-height: 1.6;
    color: ${({ theme }) => theme.colors.ivory};
  }
`;

const FooterNote = styled.p`
  margin-top: 50px;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 500;
`;

export default function RefundPolicy() {
  return (
    <Page>
      <Container>
        <Card
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Title>Refund Policy — KnockoutCodes®</Title>

          <Hook>
            Discipline is non-refundable. Commitment is the entry fee.
          </Hook>

          <Section>
            <SectionTitle>Our Standard</SectionTitle>
            <Text>
              KnockoutCodes is built for individuals who take ownership of their
              growth. Every product, program, and coaching service is designed
              to deliver structured knowledge, systems, and execution paths.
            </Text>
            <Text>
              Because of the digital and professional nature of our offerings,
              we operate under a clear, firm, and fair refund policy.
            </Text>
          </Section>

          <Section>
            <SectionTitle>Digital Products (E-Books & Downloads)</SectionTitle>
            <Text>
              All digital product purchases are final and non-refundable.
            </Text>
            <List>
              <li>Instant access is granted at purchase</li>
              <li>Digital content cannot be returned</li>
              <li>Knowledge, once delivered, cannot be revoked</li>
            </List>
          </Section>

          <Section>
            <SectionTitle>Online Courses & Training Programs</SectionTitle>
            <Text>
              Once access to a course or training program is granted, no refunds
              will be issued.
            </Text>
            <List>
              <li>Video lessons</li>
              <li>Training dashboards</li>
              <li>Bonus materials and updates</li>
            </List>
          </Section>

          <Section>
            <SectionTitle>1-on-1 Coaching & Private Sessions</SectionTitle>
            <Text>
              Coaching sessions are non-refundable once booked or delivered.
            </Text>
            <List>
              <li>One reschedule allowed with 24-hour notice</li>
              <li>Missed sessions without notice are forfeited</li>
              <li>Time is reserved exclusively for each client</li>
            </List>
          </Section>

          <Section>
            <SectionTitle>Memberships & Subscriptions</SectionTitle>
            <Text>
              Membership fees are non-refundable. You may cancel future billing
              at any time before the next billing cycle.
            </Text>
            <Text>
              Cancellation stops future charges but does not refund prior
              payments.
            </Text>
          </Section>

          <Section>
            <SectionTitle>Exceptional Circumstances</SectionTitle>
            <Text>
              Refunds may be considered only in rare cases such as duplicate
              charges or verified technical failures preventing access.
            </Text>
            <Text>
              All decisions are made at the sole discretion of KnockoutCodes.
            </Text>
          </Section>

          <Section>
            <SectionTitle>Chargebacks & Disputes</SectionTitle>
            <Text>
              Initiating a chargeback without contacting us first may result in
              immediate account termination and permanent loss of access.
            </Text>
          </Section>

          <Section>
            <SectionTitle>Contact</SectionTitle>
            <Text>
              For billing or access issues, contact our support team with your
              order details.
            </Text>
          </Section>

          <FooterNote>
            By completing a purchase, you acknowledge and agree to this Refund
            Policy in full.
          </FooterNote>
        </Card>
      </Container>
    </Page>
  );
}
