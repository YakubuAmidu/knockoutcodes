// src/components/Header.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import bgVideo from "../assets/skippingrope.mp4";

const MotionLink = motion.create(Link);

const Header = ({ headerData }) => {
  const data = useMemo(
    () => ({
      kicker: "KNOCKOUTCODES • ELITE BOXING SYSTEM",
      title: "Train Clean.",
      rotatingWords: [
        "Hit Harder.",
        "Move Smarter.",
        "Defend Better.",
        "Build Fight IQ.",
      ],
      subtitle:
        "A premium boxing training system for beginners, intermediate fighters, advanced athletes, and complete fight-camp preparation.",
      ctas: [
        { label: "START YOUR FIGHT CAMP →", to: "/fight-camp" },
        { label: "JOIN THE ELITE COURSE →", to: "/courses" },
        { label: "GRAB THE E-BOOK →", to: "/ebooks" },
      ],
      ...(headerData || {}),
    }),
    [headerData],
  );

  const setXY = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  return (
    <Section role="banner" aria-label="KnockoutCodes premium boxing header">
      <VideoLayer aria-hidden="true">
        <video src={bgVideo} autoPlay muted loop playsInline preload="auto" />
      </VideoLayer>

      <Overlay />
      <Decor />

      <Shell>
        <Kicker
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span>🥊</span>
          <span>{data.kicker}</span>
        </Kicker>

        <Title>
          <GradientWord>{data.title}</GradientWord>{" "}
          <RotatingWord words={data.rotatingWords} />
        </Title>

        <HookBadge
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.12,
            type: "spring",
            stiffness: 420,
            damping: 28,
          }}
        >
          ⚡ Beginner → Intermediate → Advance → Complete Fight Camp
        </HookBadge>

        <Subtitle
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22 }}
        >
          {data.subtitle}
        </Subtitle>

        <LevelGrid>
          <LevelCard>
            <strong>Beginner</strong>
            <span>stance, jab, balance, guard</span>
          </LevelCard>
          <LevelCard>
            <strong>Intermediate</strong>
            <span>combos, defense, counters</span>
          </LevelCard>
          <LevelCard>
            <strong>Advance</strong>
            <span>angles, feints, traps</span>
          </LevelCard>
          <LevelCard>
            <strong>Complete</strong>
            <span>full system + fight camp</span>
          </LevelCard>
        </LevelGrid>

        <CTAWrap>
          {data.ctas.map((c, index) => (
            <CTA
              key={c.to}
              to={c.to}
              onMouseMove={setXY}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              $primary={index === 0}
            >
              {c.label}
            </CTA>
          ))}

          <GhostCTA
            to="/curriculum"
            onMouseMove={setXY}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            SEE THE FULL CURRICULUM →
          </GhostCTA>
        </CTAWrap>
      </Shell>
    </Section>
  );
};

function RotatingWord({ words = [], interval = 1800 }) {
  const safeWords = words.length ? words : ["Start Winning."];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIdx((n) => (n + 1) % safeWords.length),
      interval,
    );
    return () => clearInterval(t);
  }, [safeWords.length, interval]);

  return (
    <WordWrap aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.span
          key={safeWords[idx]}
          initial={{ y: "85%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-85%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 620, damping: 34 }}
        >
          <GradientWord>{safeWords[idx]}</GradientWord>
        </motion.span>
      </AnimatePresence>
    </WordWrap>
  );
}

export default Header;

const Section = styled.header`
  position: relative;
  overflow: hidden;
  min-height: clamp(620px, 86vh, 920px);
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.colors.darkBrown}, ${theme.colors.cocoa}, ${theme.colors.brown})`};
  color: ${({ theme }) => theme.colors.ivory};
`;

const VideoLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #000;
  display: grid;
  place-items: center;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.82),
      rgba(0, 0, 0, 0.45),
      rgba(0, 0, 0, 0.76)
    ),
    radial-gradient(
      900px 420px at 18% 12%,
      rgba(214, 182, 159, 0.22),
      transparent 60%
    );
`;

const Decor = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;

  &:before {
    content: "";
    position: absolute;
    width: 420px;
    height: 420px;
    top: -120px;
    right: -100px;
    background: radial-gradient(
      circle,
      rgba(214, 182, 159, 0.35),
      transparent 65%
    );
    filter: blur(28px);
  }
`;

const Shell = styled.div`
  position: relative;
  z-index: 3;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  padding: clamp(90px, 10vw, 140px) clamp(18px, 5vw, 32px);
  display: grid;
  gap: 22px;
`;

const Kicker = styled(motion.div)`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Title = styled(motion.h1)`
  margin: 0;
  max-width: 980px;
  font-size: clamp(44px, 7vw, 92px);
  line-height: 0.98;
  font-weight: 950;
  letter-spacing: -0.04em;
  text-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
`;

const GradientWord = styled.span`
  background: linear-gradient(90deg, #fff9f2, #d6b69f, #ffd36a);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const WordWrap = styled.span`
  display: inline-flex;
  min-width: 10ch;
`;

const HookBadge = styled(motion.div)`
  width: fit-content;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
  font-weight: 900;
`;

const Subtitle = styled(motion.p)`
  max-width: 760px;
  margin: 0;
  font-size: clamp(16px, 1.6vw, 21px);
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.94;
`;

const LevelGrid = styled.div`
  max-width: 900px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;

  @media (max-width: 850px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const LevelCard = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.12);

  strong {
    display: block;
    margin-bottom: 5px;
    color: ${({ theme }) => theme.colors.ivory};
    font-weight: 950;
  }

  span {
    display: block;
    font-size: 13px;
    color: ${({ theme }) => theme.colors.lightBrown};
    line-height: 1.45;
  }
`;

const CTAWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;

const CTA = styled(MotionLink)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 14px 22px;
  border-radius: ${({ theme }) => theme.radius.pill};
  text-decoration: none;
  font-weight: 950;
  color: ${({ theme, $primary }) =>
    $primary ? theme.colors.black : theme.colors.ivory};
  background: ${({ theme, $primary }) =>
    $primary
      ? `linear-gradient(135deg, ${theme.colors.ivory}, ${theme.colors.lightBrown})`
      : theme.colors.brown};
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;

  &:after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      700px 90px at var(--x, 50%) var(--y, 50%),
      rgba(255, 255, 255, 0.22),
      transparent 45%
    );
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &:hover:after {
    opacity: 1;
  }
`;

const GhostCTA = styled(CTA)`
  background: rgba(0, 0, 0, 0.24);
  color: ${({ theme }) => theme.colors.ivory};
  border-color: rgba(255, 255, 255, 0.28);
`;
