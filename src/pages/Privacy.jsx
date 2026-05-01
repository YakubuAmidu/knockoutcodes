import { useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast"; // adjust if your path differs

const Privacy = () => {
  const toast = useToast();

  const updatedDate = "December 14, 2025";

  const sections = useMemo(
    () => [
      {
        id: "overview",
        title: "Privacy at KnockoutCodes",
        body: [
          "We respect your privacy and design our experiences to be clean, secure, and transparent.",
          "This Privacy Policy explains what we collect, why we collect it, and how you control your information when you use KnockoutCodes.",
        ],
      },
      {
        id: "info-we-collect",
        title: "Information We Collect",
        bullets: [
          "Account data (name, email, login credentials) when you create an account.",
          "Purchase and order data (billing details, product access, receipts).",
          "Contact data (messages you send via forms, support requests).",
          "Usage data (pages viewed, interactions, device/browser info) to improve performance and security.",
        ],
        note:
          "If you connect third-party services (payments, analytics, etc.), they may process data under their own policies.",
      },
      {
        id: "how-we-use",
        title: "How We Use Your Information",
        bullets: [
          "To provide products, services, and customer support.",
          "To process payments, prevent fraud, and secure accounts.",
          "To send important updates (policy changes, security notices).",
          "To improve the site, features, and overall experience.",
          "To comply with legal obligations (when required).",
        ],
      },
      {
        id: "cookies",
        title: "Cookies & Tracking",
        body: [
          "We may use cookies and similar technologies to keep you logged in, remember preferences, and analyze performance.",
          "You can control cookies through your browser settings. Disabling cookies may affect some features.",
        ],
      },
      {
        id: "sharing",
        title: "When We Share Information",
        bullets: [
          "Service providers (e.g., payment processors, hosting) to run the platform.",
          "Legal compliance if required by law or to protect rights and safety.",
          "Business changes (merger, acquisition) with notice where required.",
        ],
        note:
          "We do not sell your personal information as a business model. We build value by serving you, not by selling your data.",
      },
      {
        id: "security",
        title: "Security",
        body: [
          "We use reasonable safeguards to protect your data. No system is 100% secure, but we take security seriously.",
          "Protect your account by using a strong password and avoiding sharing your login credentials.",
        ],
      },
      {
        id: "your-rights",
        title: "Your Choices & Rights",
        bullets: [
          "Access: request a copy of your personal data we hold.",
          "Correction: update inaccurate information.",
          "Deletion: request deletion of your account where applicable.",
          "Marketing: opt out of promotional messages anytime.",
        ],
      },
      {
        id: "children",
        title: "Children’s Privacy",
        body: [
          "KnockoutCodes is not intended for children under 13. If we learn we collected data from a child under 13, we will take steps to delete it.",
        ],
      },
      {
        id: "contact",
        title: "Contact Us",
        body: [
          "If you have questions or requests regarding privacy, contact us through our support/contact page.",
        ],
      },
    ],
    []
  );

  const onCopySummary = async () => {
    const summary = `KnockoutCodes Privacy Summary:
- We collect account, purchase, contact, and usage data to run and secure the platform.
- We use cookies for login, preferences, and performance.
- We share data only with providers, for legal compliance, or business changes.
- You can request access, correction, or deletion where applicable.`;

    try {
      await navigator.clipboard.writeText(summary);
      toast?.push?.({
        title: "Copied",
        description: "Privacy summary copied to clipboard.",
        variant: "success",
      });
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      toast?.push?.({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "error",
      });
    }
  };

  const onEmailPrompt = () => {
    toast?.push?.({
      title: "Quick tip",
      description: "Use the Contact page to request data access, correction, or deletion.",
      variant: "info",
    });
  };

  return (
    <Wrap>
      <Glow />

      <Top>
        <Badge
          as={motion.div}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          KnockoutCodes • Privacy
        </Badge>

        <Hero>
          <Title
            as={motion.h1}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            Privacy Policy
          </Title>

          <Subtitle
            as={motion.p}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            Clean. Secure. Transparent. Your data is handled with intent — and respect.
          </Subtitle>

          <MetaRow>
            <MetaPill>Last updated: {updatedDate}</MetaPill>
            <MetaPill $tone="soft">Premium protection mindset</MetaPill>
          </MetaRow>

          <Actions>
            <PrimaryBtn onClick={onCopySummary}>Copy Summary</PrimaryBtn>
            <GhostBtn onClick={onEmailPrompt}>How to Request Data</GhostBtn>
          </Actions>
        </Hero>
      </Top>

      <Shell>
        <NavCard
          as={motion.aside}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <NavTitle>On this page</NavTitle>
          <NavList>
            {sections.map((s) => (
              <NavItem key={s.id}>
                <NavLink href={`#${s.id}`}>{s.title}</NavLink>
              </NavItem>
            ))}
          </NavList>

          <NavDivider />

          <MiniNote>
            This policy is provided for transparency and general guidance.
            For specific legal needs, consult a qualified professional.
          </MiniNote>
        </NavCard>

        <Content>
          {sections.map((s, idx) => (
            <Section
              key={s.id}
              id={s.id}
              as={motion.section}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: Math.min(idx * 0.04, 0.2) }}
            >
              <SectionTop>
                <SectionKicker>KnockoutCodes Standard</SectionKicker>
                <SectionTitle>{s.title}</SectionTitle>
              </SectionTop>

              {s.body?.map((p, i) => (
                <P key={i}>{p}</P>
              ))}

              {s.bullets?.length ? (
                <Ul>
                  {s.bullets.map((b, i) => (
                    <Li key={i}>{b}</Li>
                  ))}
                </Ul>
              ) : null}

              {s.note ? <Note>{s.note}</Note> : null}
            </Section>
          ))}

          <BottomCard
            as={motion.div}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <BottomTitle>Control, clarity, confidence.</BottomTitle>
            <BottomText>
              If you ever need help with account access, deletion, or privacy requests,
              send a message through the Contact page — we’ll guide you.
            </BottomText>
            <BottomActions>
              <GhostBtn onClick={onEmailPrompt}>Open Request Tip</GhostBtn>
              <PrimaryBtn onClick={onCopySummary}>Copy Summary</PrimaryBtn>
            </BottomActions>
          </BottomCard>
        </Content>
      </Shell>
    </Wrap>
  );
};

export default Privacy;

/* -------------------- styled -------------------- */

const Wrap = styled.main`
  min-height: 100vh;
  background: radial-gradient(1200px 700px at 20% 10%, rgba(214, 182, 159, 0.12), transparent 55%),
              radial-gradient(900px 600px at 80% 25%, rgba(90, 56, 37, 0.20), transparent 60%),
              radial-gradient(900px 700px at 50% 100%, rgba(61, 38, 26, 0.35), transparent 60%),
              ${(p) => p.theme.colors.black};
  color: ${(p) => p.theme.colors.ivory};
  position: relative;
  overflow: hidden;
`;

const Glow = styled.div`
  position: absolute;
  inset: -2px;
  pointer-events: none;
  background: radial-gradient(650px 220px at 50% 0%, rgba(255, 249, 242, 0.10), transparent 60%);
`;

const Top = styled.section`
  max-width: ${(p) => p.theme.layout.max};
  width: ${(p) => p.theme.layout.gutter};
  margin: 0 auto;
  padding: 72px 0 26px;
`;

const Badge = styled.div`
  display: inline-flex;
  gap: 10px;
  align-items: center;
  padding: 10px 14px;
  border-radius: ${(p) => p.theme.radius.pill};
  background: ${(p) => p.theme.colors.glass};
  box-shadow: ${(p) => p.theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.08);
  color: ${(p) => p.theme.colors.lightBrown};
  letter-spacing: 0.22px;
  font-weight: 650;
`;

const Hero = styled.div`
  margin-top: 18px;
  padding: 26px 22px;
  border-radius: ${(p) => p.theme.radius.xl};
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: ${(p) => p.theme.shadow.hard};
  position: relative;
  overflow: hidden;

  &:before{
    content:"";
    position:absolute;
    inset:0;
    background: radial-gradient(700px 220px at 20% 10%, rgba(214,182,159,0.18), transparent 60%),
                radial-gradient(700px 220px at 85% 30%, rgba(90,56,37,0.16), transparent 60%);
    pointer-events:none;
  }

  > * { position: relative; }
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 2.6vw, 3.05rem);
  letter-spacing: -0.6px;
  line-height: 1.05;
`;

const Subtitle = styled.p`
  margin: 10px 0 0;
  max-width: 72ch;
  color: ${(p) => p.theme.colors.lightBrown};
  line-height: 1.5;
  font-size: 1.02rem;
`;

const MetaRow = styled.div`
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const MetaPill = styled.span`
  padding: 9px 12px;
  border-radius: ${(p) => p.theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.10);
  background: ${(p) =>
    p.$tone === "soft"
      ? "rgba(214, 182, 159, 0.10)"
      : "rgba(255,255,255,0.05)"};
  color: ${(p) => (p.$tone === "soft" ? p.theme.colors.ivory : p.theme.colors.lightBrown)};
  font-size: 0.92rem;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
`;

const PrimaryBtn = styled.button`
  border: 0;
  cursor: pointer;
  border-radius: ${(p) => p.theme.radius.pill};
  padding: 12px 16px;
  font-weight: 800;
  letter-spacing: 0.2px;
  color: ${(p) => p.theme.colors.black};
  background: linear-gradient(135deg, ${(p) => p.theme.colors.lightBrown}, ${(p) => p.theme.colors.ivory});
  box-shadow: ${(p) => p.theme.shadow.soft};
  transition: transform 0.14s ease, filter 0.14s ease;

  &:hover { transform: translateY(-1px); filter: brightness(1.05); }
  &:active { transform: translateY(0px) scale(0.99); }
`;

const GhostBtn = styled.button`
  cursor: pointer;
  border-radius: ${(p) => p.theme.radius.pill};
  padding: 12px 16px;
  font-weight: 750;
  letter-spacing: 0.2px;
  color: ${(p) => p.theme.colors.ivory};
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: ${(p) => p.theme.shadow.soft};
  transition: transform 0.14s ease, background 0.14s ease;

  &:hover { transform: translateY(-1px); background: rgba(255,255,255,0.06); }
  &:active { transform: translateY(0px) scale(0.99); }
`;

const Shell = styled.div`
  max-width: ${(p) => p.theme.layout.max};
  width: ${(p) => p.theme.layout.gutter};
  margin: 0 auto;
  padding: 22px 0 90px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const CardBase = styled.div`
  border-radius: ${(p) => p.theme.radius.xl};
  background: ${(p) => p.theme.colors.glass};
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: ${(p) => p.theme.shadow.glow};
  position: relative;
  overflow: hidden;

  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(255,249,242,0.22), rgba(214,182,159,0.12), rgba(90,56,37,0.14));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
  }
`;

const NavCard = styled(CardBase)`
  padding: 18px 16px;

  @media (max-width: 980px) {
    position: sticky;
    top: 14px;
    z-index: 2;
  }
`;

const NavTitle = styled.div`
  font-weight: 900;
  letter-spacing: 0.3px;
  color: ${(p) => p.theme.colors.ivory};
  margin-bottom: 10px;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
`;

const NavItem = styled.li``;

const NavLink = styled.a`
  display: block;
  padding: 10px 12px;
  border-radius: ${(p) => p.theme.radius.md};
  color: ${(p) => p.theme.colors.lightBrown};
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.18);
  transition: transform 0.12s ease, background 0.12s ease, color 0.12s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(214, 182, 159, 0.08);
    color: ${(p) => p.theme.colors.ivory};
  }
`;

const NavDivider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.10);
  margin: 14px 0;
`;

const MiniNote = styled.p`
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: ${(p) => p.theme.colors.lightBrown};
`;

const Content = styled.div`
  display: grid;
  gap: 14px;
`;

const Section = styled(CardBase)`
  padding: 18px 18px;
  scroll-margin-top: 90px;
`;

const SectionTop = styled.div`
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
`;

const SectionKicker = styled.div`
  display: inline-flex;
  width: fit-content;
  padding: 6px 10px;
  border-radius: ${(p) => p.theme.radius.pill};
  background: rgba(214, 182, 159, 0.10);
  border: 1px solid rgba(255,255,255,0.10);
  color: ${(p) => p.theme.colors.ivory};
  font-weight: 800;
  letter-spacing: 0.18px;
  font-size: 0.84rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: -0.2px;
`;

const P = styled.p`
  margin: 10px 0 0;
  color: ${(p) => p.theme.colors.lightBrown};
  line-height: 1.6;
`;

const Ul = styled.ul`
  margin: 12px 0 0;
  padding-left: 18px;
  color: ${(p) => p.theme.colors.lightBrown};
  display: grid;
  gap: 8px;
`;

const Li = styled.li`
  line-height: 1.55;
`;

const Note = styled.div`
  margin-top: 12px;
  padding: 12px 12px;
  border-radius: ${(p) => p.theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(90, 56, 37, 0.20);
  color: ${(p) => p.theme.colors.ivory};
  line-height: 1.55;
`;

const BottomCard = styled(CardBase)`
  padding: 18px 18px;
`;

const BottomTitle = styled.div`
  font-weight: 950;
  letter-spacing: -0.2px;
  font-size: 1.15rem;
`;

const BottomText = styled.p`
  margin: 10px 0 0;
  color: ${(p) => p.theme.colors.lightBrown};
  line-height: 1.6;
`;

const BottomActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
`;
