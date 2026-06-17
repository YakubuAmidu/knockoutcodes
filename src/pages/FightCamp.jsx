// src/pages/FightCamp.jsx
import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const MotionLink = motion.create(Link);

export default function FightCamp() {
  return (
    <Page>
      <HeroSection>
        <Overlay />

        <HeroContent>
          <Kicker
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            🥊 KNOCKOUTCODES • ELITE FIGHT CAMP
          </Kicker>

          <HeroTitle
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Most Fighters Train Hard.
            <Gradient> Very Few Train Correctly.</Gradient>
          </HeroTitle>

          <HookBadge
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.22,
              type: "spring",
              stiffness: 420,
              damping: 28,
            }}
          >
            ⚡ Speed. Power. Defense. Ring IQ. Built into one elite system.
          </HookBadge>

          <HeroText
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            This is not random boxing workouts. This is a structured fight
            system designed to turn beginners into dangerous, disciplined, sharp
            fighters — step by step.
          </HeroText>

          <CTAGroup>
            <PrimaryCTA
              to="/courses/free-7-day-fight-camp-challenge"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              START TRAINING →
            </PrimaryCTA>

            <GhostCTA
              to="/curriculum"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              SEE THE FULL CURRICULUM →
            </GhostCTA>
          </CTAGroup>
        </HeroContent>
      </HeroSection>

      <Section>
        <Container>
          <SectionKicker>⚔ CHOOSE YOUR LEVEL</SectionKicker>

          <SectionTitle>
            Every level is engineered to make you sharper.
          </SectionTitle>

          <LevelGrid>
            <LevelCard whileHover={{ y: -6 }}>
              <LevelTop>BEGINNER</LevelTop>

              <LevelTitle>Build Your Foundation Like A Real Fighter</LevelTitle>

              <LevelText>
                Learn stance, balance, jab mechanics, defense, movement, and
                clean punching form from the ground up.
              </LevelText>
            </LevelCard>

            <LevelCard whileHover={{ y: -6 }}>
              <LevelTop>INTERMEDIATE</LevelTop>

              <LevelTitle>Turn Basic Skills Into Dangerous Weapons</LevelTitle>

              <LevelText>
                Combination systems, counters, timing, angles, footwork, and
                pressure control.
              </LevelText>
            </LevelCard>

            <LevelCard whileHover={{ y: -6 }}>
              <LevelTop>ADVANCE</LevelTop>

              <LevelTitle>
                Train Like Someone Preparing For Real Combat
              </LevelTitle>

              <LevelText>
                Ring IQ, traps, feints, rhythm breaks, advanced defense, and
                elite movement.
              </LevelText>
            </LevelCard>

            <LevelCard whileHover={{ y: -6 }}>
              <LevelTop>COMPLETE FIGHT CAMP</LevelTop>

              <LevelTitle>
                Full Elite System + Conditioning + Fight Preparation
              </LevelTitle>

              <LevelText>
                Everything combined into a complete fight-camp structure built
                for serious transformation.
              </LevelText>
            </LevelCard>
          </LevelGrid>
        </Container>
      </Section>

      <DarkSection>
        <Container>
          <SectionKicker>🔥 FREE STARTER SYSTEM</SectionKicker>

          <SectionTitle>
            Start training before most people even begin.
          </SectionTitle>

          <FreeCard
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <FreeTitle>FREE 7-DAY FIGHT CAMP CHALLENGE</FreeTitle>

            <FreeText>
              Build speed, defense, sharper movement, conditioning, and cleaner
              punches using the exact structure inside the elite system.
            </FreeText>

            <ChallengeList>
              <li>🥊 Day 1 — Stance + Balance</li>
              <li>⚡ Day 2 — Jab Mechanics</li>
              <li>🛡 Day 3 — Defense + Counters</li>
              <li>🔥 Day 4 — Combinations</li>
              <li>🧠 Day 5 — Ring IQ</li>
              <li>💨 Day 6 — Speed + Conditioning</li>
              <li>🏆 Day 7 — Elite Fight Flow</li>
            </ChallengeList>

            <CTAGroup>
              <PrimaryCTA
                to="/courses/free-7-day-fight-camp-challenge"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                START TRAINING →
              </PrimaryCTA>
            </CTAGroup>
          </FreeCard>
        </Container>
      </DarkSection>

      <Section>
        <Container>
          <SectionKicker>💎 PREMIUM SYSTEM</SectionKicker>

          <SectionTitle>
            Built for people who want more than average results.
          </SectionTitle>

          <PremiumGrid>
            <PremiumCard whileHover={{ y: -5 }}>
              <PremiumTitle>ELITE COURSE</PremiumTitle>

              <PremiumText>
                Structured modules from beginner → complete fight camp.
              </PremiumText>

              <SmallCTA to="/courses">ENTER COURSE →</SmallCTA>
            </PremiumCard>

            <PremiumCard whileHover={{ y: -5 }}>
              <PremiumTitle>BOXING E-BOOK</PremiumTitle>

              <PremiumText>
                Premium fight principles, mindset, drills, and systems.
              </PremiumText>

              <SmallCTA to="/ebook">GRAB E-BOOK →</SmallCTA>
            </PremiumCard>

            <PremiumCard whileHover={{ y: -5 }}>
              <PremiumTitle>1-ON-1 COACHING</PremiumTitle>

              <PremiumText>
                Personalized boxing guidance and elite corrections.
              </PremiumText>

              <SmallCTA to="/coaching">APPLY →</SmallCTA>
            </PremiumCard>
          </PremiumGrid>

          <StatsSection>
            <StatCard whileHover={{ y: -4 }}>
              <StatNumber>4</StatNumber>
              <StatLabel>Elite Training Levels</StatLabel>
            </StatCard>

            <StatCard whileHover={{ y: -4 }}>
              <StatNumber>50+</StatNumber>
              <StatLabel>Fight System Drills</StatLabel>
            </StatCard>

            <StatCard whileHover={{ y: -4 }}>
              <StatNumber>100%</StatNumber>
              <StatLabel>Structured Progression</StatLabel>
            </StatCard>

            <StatCard whileHover={{ y: -4 }}>
              <StatNumber>1</StatNumber>
              <StatLabel>Complete Boxing System</StatLabel>
            </StatCard>
          </StatsSection>

          <ProblemSection>
            <ProblemKicker>⚠ WHY MOST FIGHTERS STAY STUCK</ProblemKicker>

            <ProblemTitle>
              Most people train randomly. That’s why they never evolve.
            </ProblemTitle>

            <ProblemText>
              They punch hard but move badly. They train fast but think slowly.
              They work hard but improve little.
            </ProblemText>

            <ProblemText>
              KnockoutCodes was built differently. Every level connects together
              like an elite fight system: mechanics → defense → movement →
              conditioning → ring IQ.
            </ProblemText>
          </ProblemSection>

          <TestimonialSection>
            <SectionKicker>🏆 FIGHTER RESULTS</SectionKicker>

            <SectionTitle>
              The goal is not to look busy. The goal is to become dangerous.
            </SectionTitle>

            <TestimonialGrid>
              <TestimonialCard whileHover={{ y: -5 }}>
                <Quote>
                  “For the first time, boxing actually made sense to me.”
                </Quote>

                <FighterName>— Beginner Fighter</FighterName>
              </TestimonialCard>

              <TestimonialCard whileHover={{ y: -5 }}>
                <Quote>
                  “My footwork and defense improved faster than months in the
                  gym.”
                </Quote>

                <FighterName>— Intermediate Boxer</FighterName>
              </TestimonialCard>

              <TestimonialCard whileHover={{ y: -5 }}>
                <Quote>
                  “This feels like a real fight system, not random workouts.”
                </Quote>

                <FighterName>— Fight Camp Student</FighterName>
              </TestimonialCard>
            </TestimonialGrid>
          </TestimonialSection>

          <FinalCTASection>
            <FinalCard>
              <FinalTitle>
                Build the version of yourself most people will never become.
              </FinalTitle>

              <FinalText>
                Faster. Sharper. Stronger. Smarter. Start your elite fight
                journey today.
              </FinalText>

              <CTAGroup>
                <PrimaryCTA
                  to="/courses"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ENTER THE ELITE COURSE →
                </PrimaryCTA>

                <GhostCTA
                  to="/curriculum"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  VIEW FULL SYSTEM →
                </GhostCTA>
              </CTAGroup>
            </FinalCard>
          </FinalCTASection>
        </Container>
      </Section>
    </Page>
  );
}

/* ================= STYLES ================= */

const Page = styled.main`
  min-height: 100vh;
  background: ${({ theme }) =>
    `linear-gradient(180deg,
      ${theme.colors.black} 0%,
      ${theme.colors.darkBrown} 30%,
      ${theme.colors.cocoa} 70%,
      ${theme.colors.black} 100%)`};
  color: ${({ theme }) => theme.colors.ivory};
`;

const HeroSection = styled.section`
  position: relative;
  overflow: hidden;
  min-height: 92vh;
  display: flex;
  align-items: center;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.22),
      transparent 35%
    ),
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.86),
      rgba(0, 0, 0, 0.58),
      rgba(0, 0, 0, 0.82)
    );
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  max-width: 1280px;
  margin: 0 auto;
  padding: 120px 20px;
  display: grid;
  gap: 22px;
`;

const Kicker = styled(motion.div)`
  width: fit-content;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
`;

const HeroTitle = styled(motion.h1)`
  margin: 0;
  max-width: 980px;
  font-size: clamp(48px, 8vw, 102px);
  line-height: 0.95;
  font-weight: 950;
  letter-spacing: -0.05em;
`;

const Gradient = styled.span`
  background: linear-gradient(90deg, #fff9f2, #d6b69f, #ffb347, #ffd700);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const HookBadge = styled(motion.div)`
  width: fit-content;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 900;
`;

const HeroText = styled(motion.p)`
  max-width: 760px;
  margin: 0;
  font-size: clamp(16px, 1.6vw, 22px);
  line-height: 1.7;
  opacity: 0.94;
`;

const CTAGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 8px;
`;

const PrimaryCTA = styled(MotionLink)`
  text-decoration: none;
  padding: 15px 24px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff9f2, #d6b69f);
  color: #000;
  font-weight: 950;
`;

const GhostCTA = styled(PrimaryCTA)`
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.16);
`;

const Section = styled.section`
  padding: 100px 20px;
`;

const DarkSection = styled(Section)`
  background: rgba(0, 0, 0, 0.24);
`;

const Container = styled.div`
  max-width: 1280px;
  margin: 0 auto;
`;

const SectionKicker = styled.div`
  margin-bottom: 16px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const SectionTitle = styled.h2`
  margin: 0 0 34px;
  max-width: 760px;
  font-size: clamp(34px, 5vw, 62px);
  line-height: 1.05;
  font-weight: 950;
`;

const LevelGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const LevelCard = styled(motion.div)`
  padding: 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
`;

const LevelTop = styled.div`
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const LevelTitle = styled.h3`
  margin: 0 0 14px;
  font-size: 24px;
  line-height: 1.15;
`;

const LevelText = styled.p`
  margin: 0;
  line-height: 1.7;
  opacity: 0.92;
`;

const FreeCard = styled(motion.div)`
  padding: 38px;
  border-radius: 32px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.03)
  );
  border: 1px solid rgba(255, 255, 255, 0.14);
`;

const FreeTitle = styled.h3`
  margin: 0 0 16px;
  font-size: clamp(28px, 4vw, 52px);
`;

const FreeText = styled.p`
  max-width: 760px;
  line-height: 1.7;
`;

const ChallengeList = styled.ul`
  display: grid;
  gap: 10px;
  margin: 28px 0;
  padding-left: 18px;

  li {
    line-height: 1.6;
  }
`;

const PremiumGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const PremiumCard = styled(motion.div)`
  padding: 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const PremiumTitle = styled.h3`
  margin: 0 0 14px;
  font-size: 24px;
`;

const PremiumText = styled.p`
  margin: 0 0 20px;
  line-height: 1.7;
`;

const SmallCTA = styled(Link)`
  color: ${({ theme }) => theme.colors.lightBrown};
  text-decoration: none;
  font-weight: 900;
`;

const StatsSection = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-top: 80px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)`
  padding: 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: clamp(38px, 5vw, 62px);
  font-weight: 950;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #fff9f2, #d6b69f, #ffd700);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const StatLabel = styled.div`
  font-size: 15px;
  opacity: 0.92;
`;

const ProblemSection = styled.section`
  margin-top: 110px;
`;

const ProblemKicker = styled.div`
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const ProblemTitle = styled.h2`
  margin: 0 0 20px;
  max-width: 760px;
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.05;
`;

const ProblemText = styled.p`
  max-width: 860px;
  font-size: 18px;
  line-height: 1.8;
  opacity: 0.94;
`;

const TestimonialSection = styled.section`
  margin-top: 110px;
`;

const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const TestimonialCard = styled(motion.div)`
  padding: 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const Quote = styled.p`
  margin: 0 0 20px;
  font-size: 20px;
  line-height: 1.7;
`;

const FighterName = styled.div`
  font-size: 14px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const FinalCTASection = styled.section`
  margin-top: 120px;
`;

const FinalCard = styled.div`
  padding: clamp(38px, 5vw, 70px);
  border-radius: 36px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08),
    rgba(255, 255, 255, 0.03)
  );
  border: 1px solid rgba(255, 255, 255, 0.14);
  text-align: center;
`;

const FinalTitle = styled.h2`
  margin: 0 auto 20px;
  max-width: 900px;
  font-size: clamp(38px, 6vw, 82px);
  line-height: 0.98;
`;

const FinalText = styled.p`
  max-width: 760px;
  margin: 0 auto 30px;
  font-size: 20px;
  line-height: 1.8;
  opacity: 0.94;
`;
