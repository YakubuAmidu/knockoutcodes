import React, { useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast"; // adjust if your path differs

const Terms = () => {
  const toast = useToast();
  const updatedDate = "December 14, 2025";

  const sections = useMemo(
    () => [
      {
        id: "acceptance",
        title: "Agreement to Terms",
        body: [
          "By accessing or using KnockoutCodes, you agree to these Terms. If you do not agree, do not use the platform.",
          "These Terms apply to visitors, users, customers, and anyone who accesses our content or services.",
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility",
        body: [
          "You must be able to form a legally binding contract in your jurisdiction.",
          "If you use KnockoutCodes on behalf of an organization, you represent you have authority to bind that organization.",
        ],
      },
      {
        id: "accounts",
        title: "Accounts & Security",
        bullets: [
          "You are responsible for maintaining the confidentiality of your login credentials.",
          "You agree to provide accurate information and keep your account details updated.",
          "We may suspend accounts for suspicious activity, policy violations, or security risks.",
        ],
      },
      {
        id: "purchases",
        title: "Purchases, Payments, and Access",
        bullets: [
          "Purchases may grant access to digital content, features, subscriptions, or services.",
          "Prices, offers, and availability may change at any time.",
          "Refunds (if offered) are handled according to the product’s stated policy at checkout or on the product page.",
        ],
        note:
          "If a payment dispute/chargeback occurs, access may be paused while the issue is resolved.",
      },
      {
        id: "content",
        title: "Content & Intellectual Property",
        bullets: [
          "All content (videos, text, branding, training guides, UI, assets) is owned by KnockoutCodes or its licensors.",
          "You may not copy, resell, redistribute, or create derivative works without written permission.",
          "You may share links and promotional previews as allowed by the platform.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable Use",
        bullets: [
          "Do not misuse the platform (hacking, scraping, reverse engineering, abuse, or disruption).",
          "Do not upload unlawful, harmful, or infringing material.",
          "Do not attempt to access accounts, data, or systems you do not have permission to access.",
        ],
      },
      {
        id: "training-disclaimer",
        title: "Training & Fitness Disclaimer",
        body: [
          "Training content is for educational purposes and does not replace professional medical advice.",
          "Consult a qualified professional before starting any training program, especially if you have injuries or health concerns.",
          "You assume the risk of participating in any exercises or routines shown or described.",
        ],
      },
      {
        id: "termination",
        title: "Termination",
        body: [
          "We may suspend or terminate access if you violate these Terms or if required for safety or legal reasons.",
          "You may stop using KnockoutCodes at any time.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of Liability",
        body: [
          "To the fullest extent permitted by law, KnockoutCodes is not liable for indirect, incidental, special, consequential, or punitive damages.",
          "We do not guarantee uninterrupted availability and may modify or discontinue parts of the platform.",
        ],
      },
      {
        id: "changes",
        title: "Changes to These Terms",
        body: [
          "We may update these Terms from time to time. Continued use of the platform after updates means you accept the updated Terms.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        body: [
          "Questions about these Terms? Reach out via our Contact page and we’ll help.",
        ],
      },
    ],
    []
  );

  const onAgreeToast = () => {
    toast?.push?.({
      title: "Noted",
      description: "You can review these Terms anytime from the footer.",
      variant: "neutral",
    });
  };

  const onCopyKeyPoints = async () => {
    const text = `KnockoutCodes Terms Key Points:
- Use of the platform means you agree to these Terms.
- Don’t misuse the platform or copy/resell content without permission.
- Purchases and access follow product policies at checkout.
- Training content is educational; consult a professional before starting.`;

    try {
      await navigator.clipboard.writeText(text);
      toast?.push?.({
        title: "Copied",
        description: "Terms key points copied to clipboard.",
        variant: "success",
      });
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      toast?.push?.({
        title: "Copy failed",
        description: "Clipboard access was blocked by your browser.",
        variant: "error",
      });
    }
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
          KnockoutCodes • Legal
        </Badge>

        <Hero>
          <Title
            as={motion.h1}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            Terms & Conditions
          </Title>

          <Subtitle
            as={motion.p}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            Premium standards. Clear rules. Built to protect the platform — and your experience.
          </Subtitle>

          <MetaRow>
            <MetaPill>Last updated: {updatedDate}</MetaPill>
            <MetaPill $tone="soft">KnockoutCodes Integrity</MetaPill>
          </MetaRow>

          <Actions>
            <PrimaryBtn onClick={onCopyKeyPoints}>Copy Key Points</PrimaryBtn>
            <GhostBtn onClick={onAgreeToast}>Where to Find This Later</GhostBtn>
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
            These Terms are a general template for product clarity. If you need jurisdiction-specific legal coverage, consult a qualified professional.
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
            <BottomTitle>Respect the craft. Respect the rules.</BottomTitle>
            <BottomText>
              KnockoutCodes is built for real progress. Use the platform with discipline,
              integrity, and respect — and you’ll get the best out of it.
            </BottomText>
            <BottomActions>
              <GhostBtn onClick={onAgreeToast}>Reminder Toast</GhostBtn>
              <PrimaryBtn onClick={onCopyKeyPoints}>Copy Key Points</PrimaryBtn>
            </BottomActions>
          </BottomCard>
        </Content>
      </Shell>
    </Wrap>
  );
};

export default Terms;

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
