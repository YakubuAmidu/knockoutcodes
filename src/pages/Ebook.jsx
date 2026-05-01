// src/pages/Ebook.jsx
import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import image1 from '../assets/advance.png';
import image2 from '../assets/beyond.png';
import image3 from '../assets/boxing1.png';
import image4 from '../assets/worldclass.png';
import image5 from '../assets/image5.png';
import image6 from '../assets/image6.png';

// =======================
// Default Static Data (updated)
// =======================
const GUMROAD_SHELF =
  "https://aurora45.gumroad.com/?_gl=1*1wsndhj*_ga*MzE4NDI0Njg2LjE3NDMwNTI5Mzc.*_ga_6LJN6D94N6*czE3NjIxMjM3NjQkbzE3MyRnMSR0MTc2MjEyMzc3MiRqNTIkbDAkaDA.";

const defaultItems = [
  {
    id: "advanced-pro-boxing",
    title: "Advanced Pro Boxing",
    price: 39,
    image: image1,
    url: GUMROAD_SHELF,
    highlights: ["Elite combos & setups", "Defense → counter chains", "Fight IQ drills"],
  },
  {
    id: "beyond-the-ring",
    title: "Beyond The Ring",
    price: 49, // ✅ updated to match PDF verdict
    image: image2,
    url: GUMROAD_SHELF,
    highlights: ["Wealth & leadership", "Branding & legacy", "Life after boxing"],
  },
  {
    id: "how-to-become-a-boxer-for-beginners",
    title: "How To Become A Boxer – For Beginners",
    price: 19, // ✅ updated to match PDF verdict
    image: image3,
    url: GUMROAD_SHELF,
    highlights: ["Day-1 fundamentals", "Footwork, guard, jabs", "Home & gym variations"],
  },
  {
    id: "world-champion-boxing-blueprint",
    title: "World Champion Boxing Blueprint",
    price: 59, // ✅ updated to match PDF verdict
    image: image4,
    url: GUMROAD_SHELF,
    highlights: ["Rankings & pathways", "Team, media, sponsors", "Business & career map"],
  },
  {
    id: "ight-strategy-game-planning",
    title: "Fight Strategy & Game Planning",
    price: 39,
    image: image5,
    url: GUMROAD_SHELF,
    highlights: ["Opponent analysis", "Round-by-round planning", "Fight IQ adjustments"],
  },
  {
    id: "ight-ready-conditioning",
    title: "Fight-Ready Conditioning",
    price: 35,
    image: image6,
    url: GUMROAD_SHELF,
    highlights: ["Endless stamina", "Explosive power", "Fight-camp conditioning"],
  }
];

// =======================
// Component
// =======================
export default function Ebook({ items = defaultItems, shelfUrl = GUMROAD_SHELF }) {
  return (
    <Wrap>
      <Hero
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Tag>KnockoutCodes E-Books</Tag>
        <Title>Premium Boxing E-Books</Title>
        <Sub>
          Instant downloads. Pro techniques, clean layouts, and step-by-step drills that hit harder.
          Learn, train, repeat — then level up.
        </Sub>
        <Badges>
          <Badge>Instant Access</Badge>
          <Badge>Secure Checkout</Badge>
          <Badge>Lifetime Updates</Badge>
        </Badges>
      </Hero>

      <Grid
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 },
          },
        }}
      >
        {items.map((b) => (
          <Card
            key={b.id}
            variants={{ hidden: { y: 18, opacity: 0 }, show: { y: 0, opacity: 1 } }}
            whileHover={{ y: -6, rotateX: 0.5, rotateY: -0.5 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <CardGlow aria-hidden />
            <Thumb>
              <img
                src={b.image}
                alt={`${b.title} cover`}
                width={800}
                height={620}
                loading="lazy"
              />
              <Shine aria-hidden />
            </Thumb>

            <CardBody>
              <CardTitle>{b.title}</CardTitle>

              <Highlights>
                {(b.highlights || []).slice(0, 3).map((h, i) => (
                  <li key={i}>• {h}</li>
                ))}
              </Highlights>

              <MetaRow>
                <Price>${Number(b.price).toFixed(2)}</Price>
                <Ctas>
                  <BuyButton
                    as="a"
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Buy ${b.title} on Gumroad`}
                  >
                    Buy on Gumroad
                  </BuyButton>
                </Ctas>
              </MetaRow>
            </CardBody>
          </Card>
        ))}
      </Grid>

      <InfoStrip>
        <InfoItem>
          <InfoTitle>What you get</InfoTitle>
          <InfoText>
            PDF e-book, lifetime access, structured chapters, drills & checklists, and bonus links to
            follow-along videos where available.
          </InfoText>
        </InfoItem>
        <InfoItem>
          <InfoTitle>Who it’s for</InfoTitle>
          <InfoText>
            Beginners leveling up fundamentals, and pros tightening technique — clear cues, fight IQ,
            and conditioning bursts built in.
          </InfoText>
        </InfoItem>
        <InfoItem>
          <InfoTitle>Results</InfoTitle>
          <InfoText>
            Sharper form, cleaner power, smarter footwork, and higher ring confidence. Train with intent.
          </InfoText>
        </InfoItem>
      </InfoStrip>

      <MotionShelfCta
        href={shelfUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Browse all KnockoutCodes e-books on Gumroad"
        whileHover={{ y: -2 }}
        whileTap={{ y: 0 }}
      >
        Purchase • View All on Gumroad
      </MotionShelfCta>
    </Wrap>
  );
}

// =======================
// Styled
// =======================
const Wrap = styled.div`
  --bg: ${({ theme }) => theme.colors.darkBrown};
  --surface: ${({ theme }) => theme.colors.brown};
  --accent: ${({ theme }) => theme.colors.lightBrown};
  --glass: ${({ theme }) => theme.colors.glass};
  --ivory: ${({ theme }) => theme.colors.ivory};
  --cocoa: ${({ theme }) => theme.colors.cocoa};
  --white: ${({ theme }) => theme.colors.white};
  --black: ${({ theme }) => theme.colors.black};
  --r-lg: ${({ theme }) => theme.radius.lg};
  --r-xl: ${({ theme }) => theme.radius.xl};
  --shadow-soft: ${({ theme }) => theme.shadow.soft};
  --shadow-glow: ${({ theme }) => theme.shadow.glow};
  --max: ${({ theme }) => theme.layout.max};

  background: radial-gradient(1200px 800px at 20% 0%, rgba(214,182,159,0.12), transparent 60%),
              radial-gradient(800px 600px at 90% 10%, rgba(214,182,159,0.08), transparent 60%),
              var(--bg);
  min-height: 100%;
  color: var(--ivory);
  padding: 72px 24px 96px;
  display: grid;
  place-items: center;
`;

const Hero = styled(motion.header)`
  max-width: var(--max);
  width: 100%;
  text-align: center;
  margin-bottom: 36px;
`;

const Tag = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: var(--glass);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.08);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
`;

const Title = styled.h1`
  margin: 14px 0 10px;
  font-size: clamp(32px, 5vw, 54px);
  line-height: 1.05;
  background: linear-gradient(180deg, var(--ivory), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 1px 0 rgba(0,0,0,0.12);
`;

const Sub = styled.p`
  max-width: 820px;
  margin: 0 auto;
  opacity: 0.9;
`;

const Badges = styled.div`
  margin-top: 16px;
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Badge = styled.span`
  font-size: 12px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--ivory);
`;

const Grid = styled(motion.section)`
  max-width: var(--max);
  width: 100%;
  margin: 22px auto 40px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.article)`
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-glow);
  overflow: hidden;
  position: relative;
  transform-style: preserve-3d;
  transition: box-shadow 220ms ease;

  &:hover {
    box-shadow: 0 0 0 1px rgba(255,255,255,0.12), 0 24px 60px rgba(0,0,0,0.35);
  }
`;

const CardGlow = styled.i`
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(600px 200px at 30% 0%, rgba(214,182,159,0.22), transparent 50%),
              radial-gradient(400px 160px at 80% 0%, rgba(214,182,159,0.15), transparent 50%);
`;

/* ===== UPDATED: taller, clearer images + hover effects + strike-through line ===== */
const Thumb = styled.div`
  position: relative;
  width: 100%;
  height: 420px;                /* much taller for clear visibility */
  background: var(--cocoa);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
  cursor: pointer;

  /* strike-through line (hidden until hover) */
  &::after {
    content: "";
    position: absolute;
    left: -8%;
    right: -8%;
    top: 50%;
    height: 3px;
    background: rgba(255, 255, 255, 0.8);
    transform: translateY(-50%) scaleX(0);
    transform-origin: center;
    transition: transform 380ms cubic-bezier(0.22,1,0.36,1);
    pointer-events: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;        /* keeps full cover artwork visible */
    transform: scale(1.02);
    transition: transform 380ms cubic-bezier(0.22,1,0.36,1), filter 220ms ease;
    display: block;
  }

  ${Card}:hover & img {
    transform: scale(1.07);
    filter: brightness(1.06);
  }

  ${Card}:hover &::after {
    transform: translateY(-50%) scaleX(1);  /* show strike-through on hover */
  }

  @media (max-width: 720px) {
    height: 360px;
  }
`;

const Shine = styled.span`
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.06) 35%, transparent 52%);
  transform: translateX(-60%);
  transition: transform 600ms cubic-bezier(0.22,1,0.36,1);
  ${Card}:hover & { transform: translateX(0%); }
`;

const CardBody = styled.div`
  padding: 16px 16px 18px;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  line-height: 1.25;
  color: var(--ivory);
  margin: 2px 0 10px;
`;

const Highlights = styled.ul`
  margin: 0 0 14px;
  padding-left: 0;
  list-style: none;
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  display: grid;
  gap: 4px;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Price = styled.div`
  font-weight: 700;
  font-size: 18px;
  color: var(--accent);
`;

const Ctas = styled.div`
  display: inline-flex;
  gap: 8px;
`;

const BuyButton = styled(motion.button)`
  position: relative;
  padding: 12px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.7);
  background: linear-gradient(180deg, var(--ivory) 0%, var(--accent) 100%);
  color: var(--black);
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow:
    0 10px 24px rgba(214, 182, 159, 0.35),
    inset 0 0 0 1px rgba(255,255,255,0.45);
  transition: transform 140ms ease, filter 140ms ease, box-shadow 140ms ease;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.04);
    box-shadow:
      0 14px 34px rgba(214, 182, 159, 0.45),
      inset 0 0 0 1px rgba(255,255,255,0.55);
  }

  &:active {
    transform: translateY(0);
    filter: brightness(0.98);
  }

  &:focus-visible {
    outline: 0;
    box-shadow:
      0 0 0 2px rgba(0,0,0,0.8),
      0 0 0 4px var(--ivory),
      0 12px 28px rgba(214,182,159,0.5);
  }
`;

const InfoStrip = styled.section`
  max-width: var(--max);
  width: 100%;
  margin: 8px auto 22px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--r-lg);
  padding: 16px 16px 18px;
`;

const InfoTitle = styled.h4`
  margin: 0 0 6px;
  color: var(--accent);
`;

const InfoText = styled.p`
  margin: 0;
  color: rgba(255,255,255,0.86);
`;

const ShelfCtaBase = styled.a`
  margin-top: 18px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(180deg, var(--ivory) 0%, var(--accent) 100%);
  border: 1px solid rgba(214, 182, 159, 0.7);
  color: var(--black);
  font-weight: 900;
  text-decoration: none;
  box-shadow:
    0 12px 28px rgba(214, 182, 159, 0.4),
    inset 0 0 0 1px rgba(255,255,255,0.45);
  letter-spacing: 0.02em;
  will-change: transform, filter, box-shadow;

  &:hover {
    filter: brightness(1.05);
    transform: translateY(-2px);
    box-shadow:
      0 16px 36px rgba(214, 182, 159, 0.5),
      inset 0 0 0 1px rgba(255,255,255,0.55);
  }

  &:active {
    transform: translateY(0);
    filter: brightness(0.98);
  }

  &:focus-visible {
    outline: 0;
    box-shadow:
      0 0 0 2px rgba(0,0,0,0.8),
      0 0 0 4px var(--ivory),
      0 16px 40px rgba(214,182,159,0.55);
  }
`;

const MotionShelfCta = motion.create(ShelfCtaBase);
