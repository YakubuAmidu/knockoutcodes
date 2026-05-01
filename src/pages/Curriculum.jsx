// src/pages/Curriculum.jsx
import React, { useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

/* =========================================================
   Curriculum Sections:
   1) Hero (done)
   2) What You'll Master (done)
   3) Program Roadmap (done)
   4) Detailed Module Cards — luxury accordion + module meta
   5) How Training Works — weekly system + time options
========================================================= */

/* =========================
   Page + Shared Section Styles
========================= */
const Page = styled.main`
  min-height: 100vh;
  background: ${({ theme }) =>
    `radial-gradient(1200px 520px at 18% 0%, ${theme.colors.brown} 0%, ${theme.colors.cocoa} 34%, ${theme.colors.darkBrown} 70%, ${theme.colors.black} 100%)`};
  color: ${({ theme }) => theme.colors.ivory};
`;

const Section = styled.section`
  padding: clamp(34px, 6vw, 60px) 20px clamp(78px, 9vw, 110px);
`;

const SectionShell = styled.div`
  max-width: ${({ theme }) => theme.layout.max};
  width: min(${({ theme }) => theme.layout.gutter}, 100%);
  margin: 0 auto;
`;

const SectionHead = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
`;

const SectionKicker = styled(motion.div)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  color: ${({ theme }) => theme.colors.white};
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
`;

const SectionTitle = styled(motion.h2)`
  margin: 0;
  font-size: clamp(26px, 3.2vw, 44px);
  font-weight: 950;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.ivory};
  text-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
`;

const SectionDesc = styled(motion.p)`
  margin: 0;
  max-width: 84ch;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  font-size: clamp(15px, 1.4vw, 18px);
  text-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
`;

/* =========================
   Section 4: Modules (Accordion)
========================= */
const ModulesWrap = styled.div`
  margin-top: 18px;
  display: grid;
  gap: 14px;
`;

/* ✅ NEW: gives spacing between each Level block */
const LevelGroup = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 18px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const LevelTagRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 14px 0 10px; /* ✅ was 14px 0 6px */
  align-items: center;
`;

const LevelTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
`;

const LevelNote = styled.span`
  font-size: 12px;
  font-weight: 900;
  opacity: 0.92;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
`;

const ModuleItem = styled(motion.div)`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
  isolation: isolate;
  margin-top: 4px; /* ✅ adds a tiny breathing room per card */

  &:before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
        900px 160px at 10% 18%,
        rgba(214, 182, 159, 0.16),
        transparent 55%
      ),
      radial-gradient(
        700px 150px at 90% 30%,
        rgba(255, 249, 242, 0.1),
        transparent 58%
      );
    opacity: 0.75;
    pointer-events: none;
  }
`;

const ModuleButton = styled.button`
  width: 100%;
  text-align: left;
  cursor: pointer;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 16px 18px;
  display: grid;
  gap: 10px;
  position: relative;
  z-index: 1;

  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.22);
    outline-offset: 3px;
    border-radius: ${({ theme }) => theme.radius.xl};
  }
`;

const ModuleTitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;

  @media (max-width: 560px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
`;

const ModuleTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 950;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.ivory};

  @media (min-width: 900px) {
    font-size: 18px;
  }
`;

const ModuleMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 560px) {
    justify-content: flex-start;
  }
`;

const MetaPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 900;
  opacity: 0.95;
  color: ${({ theme }) => theme.colors.ivory};
`;

const ModuleSummary = styled.p`
  margin: 0;
  opacity: 0.92;
  max-width: 95ch;
  line-height: 1.6;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const ModuleChevron = styled(motion.span)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.12);
  flex: 0 0 auto;
  color: ${({ theme }) => theme.colors.ivory};
`;

const ModuleBody = styled(motion.div)`
  position: relative;
  z-index: 1;
  padding: 0 18px 18px;
  overflow: hidden;
`;

const BodyGrid = styled.div`
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 14px;
  margin-top: 10px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const BodyCard = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 14px;
`;

const BodyTitle = styled.h4`
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
`;

const List = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;

  li {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.95;
  }
`;

const BodyNote = styled.p`
  margin: 10px 0 0;
  opacity: 0.9;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.ivory};
`;

const FooterCTA = styled.div`
  margin-top: 18px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`;

const CTA = styled(motion.a)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 22px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: ${({ theme }) => theme.colors.brown};
  color: ${({ theme }) => theme.colors.ivory};
  text-decoration: none;
  font-weight: 900;
  letter-spacing: 0.2px;
  font-size: 15px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
  isolation: isolate;
  transform: translateZ(0);

  &:after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      1200px 120px at var(--x, 50%) var(--y, 50%),
      rgba(255, 255, 255, 0.16),
      transparent 42%
    );
    opacity: 0;
    transition: opacity 0.25s ease;
    z-index: -1;
  }

  &:hover:after {
    opacity: 1;
  }
`;

const GhostCTA = styled(CTA)`
  background: transparent;
  border-color: rgba(255, 255, 255, 0.28);
`;

/* =========================
   Section 5: How Training Works
========================= */
const Grid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(12, 1fr);
  margin-top: 18px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(6, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(1, 1fr);
  }
`;

const Card = styled(motion.div)`
  grid-column: span 6;
  position: relative;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  padding: 18px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
  isolation: isolate;

  &:before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
        900px 160px at 18% 18%,
        rgba(214, 182, 159, 0.16),
        transparent 55%
      ),
      radial-gradient(
        700px 140px at 90% 30%,
        rgba(255, 249, 242, 0.1),
        transparent 58%
      );
    opacity: 0;
    transition: opacity 0.25s ease;
    z-index: -1;
  }

  &:hover:before {
    opacity: 1;
  }

  @media (max-width: 640px) {
    grid-column: span 1;
  }
`;

const CardTitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  margin-bottom: 10px;

  @media (max-width: 560px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 950;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.ivory};

  @media (min-width: 900px) {
    font-size: 18px;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 900;
`;

const Note = styled.p`
  margin: 12px 0 0;
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.ivory};
`;

const TimeGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(12, 1fr);
  margin-top: 14px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(6, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: repeat(1, 1fr);
  }
`;

const TimeCard = styled(motion.div)`
  grid-column: span 4;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  @media (max-width: 980px) {
    grid-column: span 3;
  }
  @media (max-width: 640px) {
    grid-column: span 1;
  }
`;

const TimeTitle = styled.h4`
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
`;

const TimeDesc = styled.p`
  margin: 0;
  font-size: 13px;
  opacity: 0.92;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Strip = styled(motion.div)`
  margin-top: 14px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) =>
    `linear-gradient(135deg, rgba(0,0,0,0.24), ${theme.colors.glass})`};
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const StripRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`;

const StripPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ivory};
`;

/* =========================
   Helpers
========================= */
const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    (acc[item[key]] ||= []).push(item);
    return acc;
  }, {});

/* =========================================================
   MAIN
========================================================= */
export default function Curriculum() {
  const setXY = useCallback((e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  }, []);

  const modules = useMemo(
    () => [
      // LEVEL 1: FOUNDATION
      {
        id: "m1",
        level: "Level 1 — Foundation",
        title: "Stance, Guard & Balance (Your base = your power)",
        duration: "20–35 min",
        difficulty: "Beginner",
        summary:
          "Fix the base so you stop falling apart under pressure and every punch becomes cleaner.",
        drills: [
          "Wall stance checks",
          "Balance line steps",
          "Guard return reps",
          "Mirror shadowboxing rounds",
        ],
        fixes: [
          "Leaning forward",
          "Hands dropping after punching",
          "Crossing feet",
          "Tension in shoulders",
        ],
        checkpoint:
          "You can move and punch without losing balance or dropping guard.",
      },
      {
        id: "m2",
        level: "Level 1 — Foundation",
        title: "Jab System (The key that opens everything)",
        duration: "20–40 min",
        difficulty: "Beginner",
        summary:
          "Build a jab that controls range, scores, and sets up the right hand like a trap.",
        drills: ["Step jab", "Double jab timing", "Jab to body", "Jab → exit footwork"],
        fixes: ["Pawing jab", "No snap", "Standing still after jab", "Chin up on jab"],
        checkpoint: "Your jab lands clean and you exit without standing in front.",
      },
      {
        id: "m3",
        level: "Level 1 — Foundation",
        title: "Straight Right Mechanics (Power without telegraphing)",
        duration: "25–45 min",
        difficulty: "Beginner",
        summary:
          "Learn the clean sequence: feet → hips → shoulders → hand — for speed and power.",
        drills: ["Hip turn reps", "Jab → right hand", "Right hand to body", "Right hand → pivot exit"],
        fixes: ["Arm punching", "Over-rotating", "Dropping left hand", "Feet stuck"],
        checkpoint:
          "Right hand feels effortless but hits harder — and you stay protected.",
      },

      // LEVEL 2: INTERMEDIATE
      {
        id: "m4",
        level: "Level 2 — Intermediate",
        title: "Hooks & Uppercuts (Short punches, big damage)",
        duration: "30–50 min",
        difficulty: "Intermediate",
        summary:
          "Build tight hooks and clean uppercuts that don’t expose you on the inside.",
        drills: [
          "Hook mechanics on bag",
          "Body hook reps",
          "Uppercut → hook flow",
          "Inside guard returns",
        ],
        fixes: ["Wide hook", "Elbow flaring", "Chin high", "No base on inside punches"],
        checkpoint: "Hooks stay tight and you can throw without losing defense.",
      },
      {
        id: "m5",
        level: "Level 2 — Intermediate",
        title: "Combinations + Exits (Hit, don’t admire)",
        duration: "25–45 min",
        difficulty: "Intermediate",
        summary:
          "Turn combos into systems: entry → land → exit. You stop getting countered after punching.",
        drills: [
          "3-punch + exit rounds",
          "Angle-out combos",
          "Body-head setups",
          "Finish-and-move rules",
        ],
        fixes: ["Standing still after combo", "Same rhythm every time", "No angle", "Hands dropping"],
        checkpoint: "Every combo ends with an exit or angle — automatic.",
      },
      {
        id: "m6",
        level: "Level 2 — Intermediate",
        title: "Defense Basics → Counters (Slip/Roll with purpose)",
        duration: "25–45 min",
        difficulty: "Intermediate",
        summary: "Defense is not “avoid.” Defense is “avoid + punish.”",
        drills: ["Slip line", "Roll-under reps", "Slip → cross", "Roll → hook"],
        fixes: ["Slipping too big", "Eyes closing", "No return fire", "Hands not protecting while moving"],
        checkpoint: "You defend and counter in the same beat.",
      },

      // LEVEL 3: ADVANCED
      {
        id: "m7",
        level: "Level 3 — Advanced",
        title: "Feints & Traps (Make them react first)",
        duration: "25–45 min",
        difficulty: "Advanced",
        summary:
          "Learn to draw reactions, then punish the reaction — that’s high-level boxing.",
        drills: ["Jab feint → entry", "Shoulder feint counters", "Trap on jab", "Feint → body work"],
        fixes: ["Feinting with no plan", "Over-feinting", "No foot positioning", "Watching your own hands"],
        checkpoint: "Your feints create reactions you can predict.",
      },
      {
        id: "m8",
        level: "Level 3 — Advanced",
        title: "Angles & Ring Control (Cut space like a pro)",
        duration: "30–55 min",
        difficulty: "Advanced",
        summary:
          "You learn how to win without trading: position, angles, and pace.",
        drills: ["Pivot attack rounds", "Cut-off steps", "Angle counters", "Corner escape patterns"],
        fixes: ["Chasing in straight lines", "Wasting steps", "No angle after landing", "Backing up too much"],
        checkpoint:
          "You consistently land while staying off the center line.",
      },

      // LEVEL 4: FIGHT-READY
      {
        id: "m9",
        level: "Level 4 — Fight-Ready",
        title: "Round Strategy & Game Plans (Win rounds, not moments)",
        duration: "25–45 min",
        difficulty: "Fight-Ready",
        summary:
          "Build round-by-round strategy: what to do early, mid, late — and how to adjust.",
        drills: [
          "Goal-based rounds (score / break / control)",
          "Tempo switches",
          "Plan A/B reps",
          "Reset protocols",
        ],
        fixes: ["Brawling", "No pace control", "Forgetting defense late", "Not adjusting"],
        checkpoint:
          "You can explain your plan and execute it under fatigue.",
      },
      {
        id: "m10",
        level: "Level 4 — Fight-Ready",
        title: "Fight Conditioning (Skill stays sharp when tired)",
        duration: "30–60 min",
        difficulty: "Fight-Ready",
        summary:
          "Build a boxing engine: output, recovery, and composure so your form doesn’t break late rounds.",
        drills: ["Intervals (boxing specific)", "12-round simulator (scaled)", "Active recovery", "Breath control rounds"],
        fixes: ["Gassing early", "Form collapsing", "Panic breathing", "Wild punches under fatigue"],
        checkpoint: "Your technique stays clean late rounds.",
      },
    ],
    []
  );

  const grouped = useMemo(() => groupBy(modules, "level"), [modules]);

  const flatIds = useMemo(() => modules.map((m) => m.id), [modules]);
  const [openModuleId, setOpenModuleId] = useState(flatIds[0] ?? "");

  return (
    <Page>
      {/* =========================
          SECTION 4: MODULE DETAILS
      ========================== */}
      <Section aria-label="Detailed modules">
        <SectionShell>
          <SectionHead>
            <SectionKicker
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <span>📚</span>
              <span>DETAILED MODULES</span>
            </SectionKicker>

            <SectionTitle
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.05 }}
            >
              Tap a module — see drills, fixes, and checkpoints.
            </SectionTitle>

            <SectionDesc
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              This is what makes it premium: you don’t just “work out.” You train a system.
              Every module comes with drills, the most common mistakes you’ll fix, and a checkpoint
              that proves you’re improving.
            </SectionDesc>
          </SectionHead>

          <ModulesWrap>
            {Object.entries(grouped).map(([levelName, levelModules], levelIdx) => (
              <LevelGroup key={levelName}>
                <LevelTagRow>
                  <LevelTag>🏷 {levelName}</LevelTag>
                  <LevelNote>Tap any module to expand</LevelNote>
                </LevelTagRow>

                {levelModules.map((m, i) => {
                  const isOpen = openModuleId === m.id;
                  return (
                    <ModuleItem
                      key={m.id}
                      initial={{ y: 12, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{
                        delay: 0.04 * (levelIdx + i),
                        duration: 0.55,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <ModuleButton
                        type="button"
                        onMouseMove={setXY}
                        onClick={() => setOpenModuleId((cur) => (cur === m.id ? "" : m.id))}
                        aria-expanded={isOpen}
                        aria-controls={`module-${m.id}`}
                      >
                        <ModuleTitleRow>
                          <ModuleTitle>{m.title}</ModuleTitle>

                          <ModuleMeta>
                            <MetaPill>⏱ {m.duration}</MetaPill>
                            <MetaPill>🎯 {m.difficulty}</MetaPill>
                            <ModuleChevron
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ type: "spring", stiffness: 520, damping: 34 }}
                              aria-hidden="true"
                            >
                              ▼
                            </ModuleChevron>
                          </ModuleMeta>
                        </ModuleTitleRow>

                        <ModuleSummary>{m.summary}</ModuleSummary>
                      </ModuleButton>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <ModuleBody
                            id={`module-${m.id}`}
                            key={`body-${m.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <BodyGrid>
                              <BodyCard>
                                <BodyTitle>Drills Included</BodyTitle>
                                <List>
                                  {m.drills.map((x) => (
                                    <li key={x}>{x}</li>
                                  ))}
                                </List>
                                <BodyNote>Do these exactly as written. Clean reps beat hard reps.</BodyNote>
                              </BodyCard>

                              <BodyCard>
                                <BodyTitle>Mistakes You Fix</BodyTitle>
                                <List>
                                  {m.fixes.map((x) => (
                                    <li key={x}>{x}</li>
                                  ))}
                                </List>
                                <BodyNote>This is where most people stay stuck. You won’t.</BodyNote>
                              </BodyCard>

                              <BodyCard style={{ gridColumn: "1 / -1" }}>
                                <BodyTitle>Checkpoint (Prove Improvement)</BodyTitle>
                                <List>
                                  <li>{m.checkpoint}</li>
                                </List>
                                <BodyNote>
                                  When you hit the checkpoint, you move on — not when you “feel tired.”
                                </BodyNote>
                              </BodyCard>
                            </BodyGrid>
                          </ModuleBody>
                        )}
                      </AnimatePresence>
                    </ModuleItem>
                  );
                })}
              </LevelGroup>
            ))}
          </ModulesWrap>

          <FooterCTA>
            <CTA href="/courses" onMouseMove={setXY} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              JOIN THE COURSE →
            </CTA>

            <GhostCTA href="/coaching" onMouseMove={setXY} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              START 1-ON-1 COACHING →
            </GhostCTA>

            <GhostCTA href="/ebook" onMouseMove={setXY} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              GRAB THE E-BOOK →
            </GhostCTA>
          </FooterCTA>
        </SectionShell>
      </Section>

      {/* =========================
          SECTION 5: HOW TRAINING WORKS
      ========================== */}
      <Section aria-label="How training works">
        <SectionShell>
          <SectionHead>
            <SectionKicker
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <span>🧩</span>
              <span>HOW TRAINING WORKS</span>
            </SectionKicker>

            <SectionTitle
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.05 }}
            >
              No confusion. Just a weekly system that builds real fighters.
            </SectionTitle>

            <SectionDesc
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              Here’s the structure: you train the right skills in the right order — mechanics, movement,
              defense, combinations, conditioning, and ring IQ. Every week is designed to make you sharper,
              faster, and more controlled — not just tired.
            </SectionDesc>
          </SectionHead>

          <Grid>
            <Card
              initial={{ y: 14, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
            >
              <CardTitleRow>
                <CardTitle>Weekly Structure (5 days)</CardTitle>
                <Badge>📅 Repeat weekly</Badge>
              </CardTitleRow>

              <List>
                <li>
                  <b>Day 1 — Mechanics:</b> jab + right hand + clean form
                </li>
                <li>
                  <b>Day 2 — Footwork:</b> balance, pivots, angles, exits
                </li>
                <li>
                  <b>Day 3 — Defense:</b> slips/rolls/parries → counters
                </li>
                <li>
                  <b>Day 4 — Combos:</b> setups + flow + finish-and-move
                </li>
                <li>
                  <b>Day 5 — Conditioning + IQ:</b> pace, engine, strategy
                </li>
              </List>

              <Note>You’re not “training random.” You’re building a system—so your skills stack.</Note>
            </Card>

            <Card
              initial={{ y: 14, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
            >
              <CardTitleRow>
                <CardTitle>How a Session Works</CardTitle>
                <Badge>🎯 Simple + elite</Badge>
              </CardTitleRow>

              <List>
                <li>
                  <b>Warm-up (3–5 min):</b> joints, breath, rhythm
                </li>
                <li>
                  <b>Skill block (10–25 min):</b> the main technique
                </li>
                <li>
                  <b>Drill rounds (2–6 rounds):</b> reps under pace
                </li>
                <li>
                  <b>Checkpoint test (2–3 min):</b> prove improvement
                </li>
                <li>
                  <b>Cool down (2–5 min):</b> reset + recovery
                </li>
              </List>

              <Note>Every session ends with a checkpoint—so you know you’re progressing.</Note>
            </Card>
          </Grid>

          <SectionHead style={{ marginTop: 20 }}>
            <SectionTitle
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.05 }}
            >
              Choose your time: 15 / 30 / 45+ minutes
            </SectionTitle>

            <SectionDesc
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              Same program — different time. Pick what fits your life and stay consistent.
            </SectionDesc>
          </SectionHead>

          <TimeGrid>
            <TimeCard
              initial={{ y: 12, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3 }}
            >
              <TimeTitle>⏱ 15 Minutes</TimeTitle>
              <TimeDesc>
                Quick sharp sessions: warm-up → skill block → 2 rounds → checkpoint. Perfect for consistency
                when life is busy.
              </TimeDesc>
            </TimeCard>

            <TimeCard
              initial={{ y: 12, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3 }}
            >
              <TimeTitle>⏱ 30 Minutes</TimeTitle>
              <TimeDesc>
                The sweet spot: warm-up → skill + drills → 4 rounds → checkpoint. Fast improvement with real
                structure.
              </TimeDesc>
            </TimeCard>

            <TimeCard
              initial={{ y: 12, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3 }}
            >
              <TimeTitle>⏱ 45–60 Minutes</TimeTitle>
              <TimeDesc>
                Full camp: technique + rounds + conditioning + strategy. Best for fight prep and serious
                athletes.
              </TimeDesc>
            </TimeCard>
          </TimeGrid>

          <Strip
            initial={{ y: 12, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ delay: 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <StripRow>
              <StripPill>✅ Works with NO gym</StripPill>
              <StripPill>🥊 Optional: bag + wraps + gloves</StripPill>
              <StripPill>🧠 Focus: clean reps</StripPill>
              <StripPill>⚡ Goal: skill under pressure</StripPill>
            </StripRow>
          </Strip>
        </SectionShell>
      </Section>
    </Page>
  );
}

