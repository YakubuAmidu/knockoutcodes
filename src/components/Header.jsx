// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import bgVideo from "../assets/skippingrope.mp4";

/**
 * Backend-ready API shape (future):
 * headerData = {
 *   kicker: string,
 *   title: string,
 *   rotatingWords: string[],
 *   subtitle: string,
 *   ctas: [{ label: string, href: string }],
 * }
 */

const Section = styled.header`
  position: relative;
  overflow: clip;
  min-height: clamp(520px, 78vh, 880px);
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.colors.darkBrown} 0%, ${theme.colors.cocoa} 40%, ${theme.colors.brown} 100%)`};
  color: ${({ theme }) => theme.colors.ivory};
  box-shadow: ${({ theme }) => theme.shadow.glow};

  /* readable text over any video frame */
  &:after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(1200px 420px at 20% 0%, rgba(0,0,0,.55), transparent 40%),
      linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.35) 30%, rgba(0,0,0,.55) 100%);
    z-index: 1;
  }
`;

/* ===== Video Layer (shows FULL video height with no cropping) ===== */
const VideoLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000; /* clean letterboxing if aspect ratios differ */

  video {
    /* Fit inside header without cropping, always fully visible */
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: center center;
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    video { animation: none !important; }
  }
`;

const Shell = styled.div`
  position: relative;
  z-index: 2; /* on top of video & overlays */
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  padding: clamp(72px, 9vw, 120px) clamp(16px, 5vw, 28px);
  display: grid;
  gap: 24px;
`;

const Kicker = styled(motion.span)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(6px);
  color: ${({ theme }) => theme.colors.white};
`;

const Title = styled.h1`
  line-height: 1.03;
  font-weight: 900;
  font-size: clamp(40px, 6vw, 84px);
  letter-spacing: -0.02em;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  text-shadow: 0 8px 30px rgba(0,0,0,0.45);
`;

const TitleRow = styled.div`
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
`;

/* Luxury colorful gradient text for emphasis */
const GradientWord = styled.span`
  background: linear-gradient(90deg, #ff8a00 0%, #ff3d81 35%, #9a5bff 68%, #ffd700 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 8px 22px rgba(255, 141, 38, 0.18));
`;

const WordWrap = styled.span`
  position: relative;
  display: inline-flex;
  min-width: 10ch;
  justify-content: flex-start;
  ${GradientWord} {
    filter: drop-shadow(0 8px 22px rgba(255, 141, 38, 0.18));
  }
`;

const Subtitle = styled(motion.p)`
  max-width: 62ch;
  margin: 6px 0 0;
  font-size: clamp(16px, 1.6vw, 20px);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.95;
  text-shadow: 0 6px 20px rgba(0,0,0,0.45);
`;

const CTAWrap = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
`;

const CTA = styled(motion.a)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 22px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: ${({ theme }) => theme.colors.brown};
  color: ${({ theme }) => theme.colors.ivory};
  text-decoration: none;
  font-weight: 800;
  letter-spacing: 0.2px;
  font-size: clamp(14px, 1.3vw, 16px);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
  isolation: isolate;
  cursor: pointer;

  &:after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(1200px 120px at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.12), transparent 40%);
    opacity: 0;
    transition: opacity .25s ease;
    z-index: -1;
  }
  &:hover:after { opacity: 1; }

  &:hover {
    transform: translateY(-1px) rotate(-0.2deg);
    box-shadow: ${({ theme }) => theme.shadow.hard};
  }
`;

const GhostCTA = styled(CTA)`
  background: transparent;
  border-color: rgba(255,255,255,0.28);
`;

const Decor = styled.div`
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 1; /* beneath Shell but above video */
  &:before, &:after {
    content: "";
    position: absolute;
    filter: blur(40px);
    opacity: 0.35;
  }
  &:before {
    width: 340px; height: 340px;
    top: -60px; right: -60px;
    background: radial-gradient(closest-side, ${({ theme }) => theme.colors.lightBrown}, transparent);
  }
  &:after {
    width: 280px; height: 280px;
    bottom: -60px; left: -60px;
    background: radial-gradient(closest-side, ${({ theme }) => theme.colors.glass}, transparent);
  }
`;

const HookBadge = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-top: 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  font-weight: 700;
  color: ${({ theme }) => theme.colors.white};
  backdrop-filter: blur(6px);
  user-select: none;
  text-shadow: 0 4px 14px rgba(0,0,0,.35);
`;

const RotatingWord = ({ words, interval = 1800 }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((n) => (n + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words, interval]);
  return (
    <WordWrap aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[idx]}
          initial={{ y: "90%", opacity: 0, rotateX: 60 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: "-90%", opacity: 0, rotateX: -60 }}
          transition={{ type: "spring", stiffness: 620, damping: 34 }}
          style={{ display: "inline-block" }}
        >
          <GradientWord>{words[idx]}</GradientWord>
        </motion.span>
      </AnimatePresence>
    </WordWrap>
  );
};

const Header = ({ headerData }) => {
  // graceful defaults until backend fills these
  const data = {
    kicker: "KNOCKOUTCODES BOXING",
    title: "Stop Scrolling.",
    rotatingWords: ["Start Winning.", "Build Power.", "Move Like Smoke.", "Punch Faster.", "Dominate Rounds."],
    subtitle:
      "Real fight mechanics, not fluff. Footwork, power, defense, and ring IQ—delivered with elite clarity. Book 1-on-1 coaching, join the course, or grab the playbook.",
    ctas: [
      { label: "START YOUR FIGHT CAMP →", href: "/coaching" },
      { label: "JOIN THE ELITE COURSE →", href: "/courses" },
      { label: "GRAB THE E-BOOK →", href: "/ebook" },
    ],
    ...(headerData || {}),
  };

  const setXY = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  return (
    <Section role="banner" aria-label="KnockoutCodes boxing header">
      {/* Background Video */}
      <VideoLayer aria-hidden="true">
        <video
          src={bgVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </VideoLayer>

      <Decor />

      <Shell>
        <Kicker
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>🥊</span>
          <span>{data.kicker}</span>
        </Kicker>

        <Title as={motion.h1} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <TitleRow>
            <GradientWord>{data.title}</GradientWord>
            {Array.isArray(data.rotatingWords) && data.rotatingWords.length > 0 && (
              <RotatingWord words={data.rotatingWords} />
            )}
          </TitleRow>
        </Title>

        <HookBadge
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 420, damping: 28 }}
          aria-label="First 1–3 seconds hook"
        >
          ⚡ Train like a pro—speed, power & ring IQ unlocked in weeks, not years.
        </HookBadge>

        <Subtitle
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {data.subtitle}
        </Subtitle>

        <CTAWrap>
          {(data.ctas || []).map((c) => (
            <CTA
              key={c.href}
              href={c.href}
              onMouseMove={setXY}
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -2 }}
              aria-label={c.label}
            >
              {c.label}
            </CTA>
          ))}

          <GhostCTA
            href="/curriculum"
            onMouseMove={setXY}
            whileTap={{ scale: 0.98 }}
            whileHover={{ y: -2 }}
            aria-label="See Full Training Curriculum"
          >
            SEE THE FULL CURRICULUM →
          </GhostCTA>
        </CTAWrap>
      </Shell>
    </Section>
  );
};

export default Header;

