import React from "react";
import styled, { css } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

// ==========================
// Default data (can be replaced by backend JSON later)
// ==========================
const defaultData = {
  hero: {
    hookPhrases: [
      "HIT HARDER 🥊",
      "MOVE SHARPER 🌀",
      "GAS OUT NEVER ⚡️",
    ],
    subtitle:
      "KnockoutCodes — boxing coaching that builds real power, clean technique, and fight-ready confidence.",
  },
  skills: [
    "Jab", "Cross", "Hook", "Uppercut", "Footwork",
    "Head Movement", "Defense", "Combos", "Conditioning",
    "Bag Work", "Pad Work", "Shadowboxing", "Breathing",
  ],
  cards: [
    {
      id: "courses",
      title: "Online Courses 🧠",
      description:
        "Step-by-step lessons for beginners and pros: stance, defense, power shots, conditioning & more.",
      cta: "Explore Courses",
      href: "/courses",
    },
    {
      id: "coaching",
      title: "1-on-1 Coaching 💥",
      description:
        "Personalized training to fix form, add speed, and build knockout power. In-person or virtual.",
      cta: "Book Coaching",
      href: "/coaching",
    },
    {
      id: "ebook",
      title: "Download the E-Book 📘",
      description:
        "Your complete guide to fundamentals, drills, and routines — train anywhere, level up fast.",
      cta: "Get the E-Book",
      href: "/ebook",
    },
  ],
};

// ==========================
// Styled Components
// ==========================
const Section = styled.section`
  position: relative;
  width: 100%;
  padding: 64px 20px 48px;
  background: ${({ theme }) => theme.colors.darkBrown};
  color: ${({ theme }) => theme.colors.ivory};
  display: grid;
  justify-items: center;
`;

const Wrap = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
`;

const Hero = styled.div`
  display: grid;
  gap: 14px;
  margin-bottom: 28px;
`;

const HookLine = styled(motion.h1)`
  font-size: clamp(26px, 4.5vw, 56px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-weight: 800;
  margin: 0;
  background: ${({ theme }) => css`
    linear-gradient(92deg, ${theme.colors.lightBrown}, ${theme.colors.ivory})
  `};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
`;

const Cards = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
`;

const Card = styled(motion.a)`
  grid-column: span 12;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.ivory};
  background: ${({ theme }) => theme.colors.brown};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 20px;
  position: relative;
  overflow: hidden;

  @media (min-width: 700px) {
    grid-column: span 4;
  }

  /* Subtle luxury sheen */
  &::after {
    content: "";
    position: absolute;
    top: -100%;
    left: -40%;
    width: 60%;
    height: 300%;
    transform: rotate(25deg);
    background: linear-gradient(
      to right,
      rgba(255,255,255,0) 0%,
      rgba(255,255,255,0.12) 45%,
      rgba(255,255,255,0) 90%
    );
    transition: all 0.6s ease;
  }
  &:hover::after { left: 120%; }
`;

const CardTitle = styled.h3`
  margin: 0 0 6px 0;
  font-size: 20px;
  letter-spacing: 0.2px;
`;

const CardDesc = styled.p`
  margin: 0 0 14px 0;
  opacity: 0.9;
`;

const CardCta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.cocoa};
  box-shadow: ${({ theme }) => theme.shadow.soft};

  /* Ensure FA icons align nicely */
  i {
    font-size: 16px;
    line-height: 1;
  }
`;

const SkillsWrap = styled.div`
  grid-column: 1 / -1;
  background: ${({ theme }) => theme.colors.cocoa};
  border-radius: ${({ theme }) => theme.radius.xl};
  box-shadow: ${({ theme }) => theme.shadow.hard};
  padding: 16px;
`;

const SkillsTitle = styled.h4`
  margin: 0 0 10px 0;
  font-size: 16px;
  letter-spacing: 0.3px;
  opacity: 0.9;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Chip = styled(motion.span)`
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.brown};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  font-size: 13px;
  white-space: nowrap;
`;

// ==========================
// Animation helpers
// ==========================
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 * i, duration: 0.48, ease: [0.22, 1, 0.36, 1] },
  }),
};

const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -6, scale: 1.02, transition: { duration: 0.25 } },
};

// ==========================
// Component
// ==========================
export default function LuxuryPreview({ data = defaultData }) {
  const { hero, skills, cards } = data;
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % hero.hookPhrases.length);
    }, 1200); // quick cycle in the first ~1–3 seconds
    return () => clearInterval(id);
  }, [hero.hookPhrases.length]);

  return (
    <Section aria-label="Boxing Preview">
      <Wrap>
        <Hero>
          <AnimatePresence mode="wait">
            <HookLine
              key={hero.hookPhrases[index]}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {hero.hookPhrases[index]}
            </HookLine>
          </AnimatePresence>
          <Subtitle>{hero.subtitle}</Subtitle>
        </Hero>

        <Grid>
          <Cards>
            {cards.map((c, i) => (
              <Card
                key={c.id}
                href={c.href}
                whileHover="hover"
                initial="rest"
                animate="rest"
                variants={cardHover}
              >
                <motion.div variants={fadeUp} custom={i}>
                  <CardTitle>{c.title}</CardTitle>
                </motion.div>
                <motion.div variants={fadeUp} custom={i + 0.5}>
                  <CardDesc>{c.description}</CardDesc>
                </motion.div>
                <motion.div variants={fadeUp} custom={i + 1}>
                  <CardCta>
                    {c.cta}
                    {/* Font Awesome icon (no SVG) */}
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                  </CardCta>
                </motion.div>
              </Card>
            ))}
          </Cards>

          <SkillsWrap>
            <SkillsTitle>Core Boxing Skills</SkillsTitle>
            <ChipRow>
              {skills.map((s, i) => (
                <Chip
                  key={s}
                  variants={fadeUp}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.4 }}
                >
                  {s}
                </Chip>
              ))}
            </ChipRow>
          </SkillsWrap>
        </Grid>
      </Wrap>
    </Section>
  );
}

// ==========================
// Usage (example)
// ==========================
// import LuxuryPreview from "../components/LuxuryPreview";
// <LuxuryPreview />
//
// To hydrate with backend data later, pass your fetched JSON:
// <LuxuryPreview data={serverData} />
