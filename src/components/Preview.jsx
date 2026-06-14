// src/components/Preview.jsx
import React from "react";
import styled, { css } from "styled-components";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Premium Preview Section
 * Purpose:
 * - Calls out visitors fast with a strong 1–2 second boxing hook
 * - Shows the main KnockoutCodes offers clearly
 * - Routes users to the correct pages without refreshing the React app
 * - Backend-ready: you can replace defaultData later with API data
 */

const MotionLink = motion.create(Link);

const defaultData = {
  hero: {
    kicker: "KNOCKOUTCODES • ELITE BOXING SYSTEM",
    hookPhrases: [
      "MOST PEOPLE PUNCH. FEW KNOW HOW TO FIGHT.",
      "TRAIN CLEAN. HIT SHARP. MOVE DANGEROUS.",
      "STOP WASTING ROUNDS. BUILD REAL SKILL.",
    ],
    subtitle:
      "A premium boxing system built for power, defense, footwork, conditioning, and fight IQ — from beginner to complete fight camp.",
  },

  skills: [
    "Stance",
    "Jab",
    "Cross",
    "Hook",
    "Uppercut",
    "Footwork",
    "Head Movement",
    "Defense",
    "Counters",
    "Combos",
    "Conditioning",
    "Bag Work",
    "Shadowboxing",
    "Ring IQ",
  ],

  cards: [
    {
      id: "fight-camp",
      eyebrow: "START HERE",
      title: "Fight Camp System 🥊",
      description:
        "Enter the full KnockoutCodes roadmap: beginner, intermediate, advance, and complete fight-camp structure.",
      cta: "Start Fight Camp",
      to: "/fight-camp",
      featured: true,
    },
    {
      id: "courses",
      eyebrow: "TRAIN STEP BY STEP",
      title: "Elite Online Courses 🧠",
      description:
        "Learn stance, power shots, defense, combinations, conditioning, and boxing IQ with a clear progression system.",
      cta: "Explore Courses",
      to: "/courses",
    },
    {
      id: "coaching",
      eyebrow: "PERSONAL CORRECTION",
      title: "1-on-1 Coaching 💥",
      description:
        "Get personal boxing guidance to fix your form, sharpen speed, build confidence, and stop repeating bad habits.",
      cta: "Book Coaching",
      to: "/coachings",
    },
    {
      id: "ebook",
      eyebrow: "TRAIN ANYWHERE",
      title: "Premium Boxing E-Book 📘",
      description:
        "Grab the boxing playbook with drills, routines, fundamentals, mindset, and fight principles you can follow anywhere.",
      cta: "Grab The E-Book",
      to: "/ebooks",
    },
  ],
};

export default function Preview({ data = defaultData }) {
  const hero = data?.hero || defaultData.hero;
  const skills = Array.isArray(data?.skills) ? data.skills : defaultData.skills;
  const cards = Array.isArray(data?.cards) ? data.cards : defaultData.cards;

  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const phrases = hero?.hookPhrases || defaultData.hero.hookPhrases;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, 1500);

    return () => clearInterval(id);
  }, [hero?.hookPhrases]);

  const hookPhrases = hero?.hookPhrases?.length
    ? hero.hookPhrases
    : defaultData.hero.hookPhrases;

  return (
    <Section aria-label="KnockoutCodes premium preview">
      <GlowOne />
      <GlowTwo />

      <Wrap>
        <Hero>
          <Kicker
            initial={{ y: 12, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            ⚡ {hero.kicker || defaultData.hero.kicker}
          </Kicker>

          <AnimatePresence mode="wait">
            <HookLine
              key={hookPhrases[index]}
              initial={{ opacity: 0, y: 22, rotateX: 35 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -18, rotateX: -25 }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {hookPhrases[index]}
            </HookLine>
          </AnimatePresence>

          <Subtitle
            initial={{ y: 12, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12, duration: 0.5 }}
          >
            {hero.subtitle || defaultData.hero.subtitle}
          </Subtitle>

          <HeroActions>
            <PrimaryCTA to="/fight-camp" whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
              START YOUR FIGHT CAMP →
            </PrimaryCTA>

            <GhostCTA to="/curriculum" whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
              SEE FULL CURRICULUM →
            </GhostCTA>
          </HeroActions>
        </Hero>

        <Grid>
          <Cards>
            {cards.map((card, i) => (
              <Card
                key={card.id || card.to || card.title}
                to={card.to || "/"}
                $featured={card.featured}
                whileHover={{ y: -7, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                initial={{ y: 18, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.28 }}
                transition={{
                  delay: i * 0.06,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <CardShine />

                <CardEyebrow>{card.eyebrow || "ELITE SYSTEM"}</CardEyebrow>

                <CardTitle>{card.title}</CardTitle>

                <CardDesc>{card.description}</CardDesc>

                <CardCta>
                  {card.cta}
                  <span aria-hidden="true">→</span>
                </CardCta>
              </Card>
            ))}
          </Cards>

          <SkillsWrap
            initial={{ y: 16, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5 }}
          >
            <SkillsHeader>
              <div>
                <SkillsKicker>WHAT YOU BUILD</SkillsKicker>
                <SkillsTitle>Core Boxing Skills</SkillsTitle>
              </div>

              <SkillsBadge>Beginner → Complete</SkillsBadge>
            </SkillsHeader>

            <ChipRow>
              {skills.map((skill, i) => (
                <Chip
                  key={skill}
                  initial={{ y: 10, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: i * 0.025, duration: 0.35 }}
                >
                  {skill}
                </Chip>
              ))}
            </ChipRow>
          </SkillsWrap>
        </Grid>
      </Wrap>
    </Section>
  );
}

/* =========================
   Styled Components
========================= */

const Section = styled.section`
  position: relative;
  overflow: hidden;
  width: 100%;
  padding: clamp(70px, 8vw, 110px) 20px;
  background: ${({ theme }) =>
    `linear-gradient(180deg, ${theme.colors.black} 0%, ${theme.colors.darkBrown} 48%, ${theme.colors.cocoa} 100%)`};
  color: ${({ theme }) => theme.colors.ivory};
`;

const GlowOne = styled.div`
  position: absolute;
  width: 440px;
  height: 440px;
  top: -170px;
  right: -120px;
  background: radial-gradient(circle, rgba(214, 182, 159, 0.32), transparent 68%);
  filter: blur(20px);
  pointer-events: none;
`;

const GlowTwo = styled.div`
  position: absolute;
  width: 360px;
  height: 360px;
  bottom: -160px;
  left: -110px;
  background: radial-gradient(circle, rgba(255, 249, 242, 0.12), transparent 70%);
  filter: blur(18px);
  pointer-events: none;
`;

const Wrap = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled.div`
  display: grid;
  gap: 16px;
  margin-bottom: 34px;
`;

const Kicker = styled(motion.div)`
  width: fit-content;
  padding: 9px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const HookLine = styled(motion.h2)`
  max-width: 1050px;
  margin: 0;
  font-size: clamp(34px, 6vw, 82px);
  line-height: 0.98;
  letter-spacing: -0.045em;
  font-weight: 950;
  background: ${({ theme }) => css`
    linear-gradient(
      90deg,
      ${theme.colors.ivory} 0%,
      ${theme.colors.lightBrown} 48%,
      #ffd36a 100%
    )
  `};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
`;

const Subtitle = styled(motion.p)`
  max-width: 820px;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  font-size: clamp(16px, 1.6vw, 21px);
  line-height: 1.7;
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;

const PrimaryCTA = styled(MotionLink)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 14px 22px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.colors.ivory}, ${theme.colors.lightBrown})`};
  color: ${({ theme }) => theme.colors.black};
  text-decoration: none;
  font-weight: 950;
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const GhostCTA = styled(PrimaryCTA)`
  background: rgba(255, 255, 255, 0.08);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.18);
`;

const Grid = styled.div`
  display: grid;
  gap: 20px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
`;

const Card = styled(MotionLink)`
  grid-column: span 12;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  min-height: 255px;
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.xl};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.ivory};
  background: ${({ theme, $featured }) =>
    $featured
      ? `linear-gradient(145deg, rgba(214,182,159,.18), ${theme.colors.brown})`
      : `linear-gradient(145deg, rgba(255,255,255,.06), ${theme.colors.brown})`};
  border: 1px solid
    ${({ $featured }) =>
      $featured ? "rgba(214,182,159,.45)" : "rgba(255,255,255,.12)"};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  display: flex;
  flex-direction: column;

  @media (min-width: 760px) {
    grid-column: ${({ $featured }) => ($featured ? "span 6" : "span 6")};
  }

  @media (min-width: 1100px) {
    grid-column: ${({ $featured }) => ($featured ? "span 3" : "span 3")};
  }

  &:hover ${""} {
    border-color: rgba(255, 249, 242, 0.28);
  }
`;

const CardShine = styled.div`
  position: absolute;
  top: -120%;
  left: -60%;
  width: 60%;
  height: 340%;
  transform: rotate(25deg);
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.16) 45%,
    rgba(255, 255, 255, 0) 90%
  );
  transition: left 0.7s ease;
  z-index: -1;

  ${Card}:hover & {
    left: 130%;
  }
`;

const CardEyebrow = styled.div`
  margin-bottom: 14px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const CardTitle = styled.h3`
  margin: 0 0 12px;
  font-size: clamp(22px, 2vw, 30px);
  line-height: 1.08;
  letter-spacing: -0.025em;
`;

const CardDesc = styled.p`
  margin: 0 0 20px;
  opacity: 0.91;
  line-height: 1.7;
`;

const CardCta = styled.span`
  margin-top: auto;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
`;

const SkillsWrap = styled(motion.div)`
  margin-top: 10px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.hard};
  padding: 20px;
`;

const SkillsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const SkillsKicker = styled.div`
  margin-bottom: 5px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const SkillsTitle = styled.h4`
  margin: 0;
  font-size: clamp(20px, 2vw, 28px);
  letter-spacing: -0.02em;
`;

const SkillsBadge = styled.div`
  height: fit-content;
  padding: 9px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Chip = styled(motion.span)`
  padding: 9px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.brown};
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  font-size: 13px;
  font-weight: 850;
  white-space: nowrap;
`;