// src/pages/Ebook.jsx
import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

import image1 from "../assets/advance.png";
import image2 from "../assets/beyond.png";
import image3 from "../assets/boxing1.png";
import image4 from "../assets/worldclass.png";
import image5 from "../assets/image5.png";
import image6 from "../assets/image6.png";

// =====================================================
// KNOCKOUTCODES • PREMIUM BOXING E-BOOK SALES DATA
// Luxury product shelf built for curiosity, authority,
// clean conversion, and high-trust checkout flow.
// =====================================================
const GUMROAD_SHELF =
  "https://aurora45.gumroad.com/?_gl=1*1wsndhj*_ga*MzE4NDI0Njg2LjE3NDMwNTI5Mzc.*_ga_6LJN6D94N6*czE3NjIxMjM3NjQkbzE3MyRnMSR0MTc2MjEyMzc3MiRqNTIkbDAkaDA.";

const defaultItems = [
  {
    id: "advanced-pro-boxing",
    title: "Advanced Pro Boxing",
    price: 39,
    image: image1,
    url: GUMROAD_SHELF,
    badge: "Elite Level",
    hook: "For fighters ready to stop looking basic.",
    highlights: [
      "Elite combos & setups",
      "Defense into counter chains",
      "Fight IQ drills",
    ],
  },
  {
    id: "beyond-the-ring",
    title: "Beyond The Ring",
    price: 49,
    image: image2,
    url: GUMROAD_SHELF,
    badge: "Legacy Builder",
    hook: "Boxing is the skill. Legacy is the mission.",
    highlights: [
      "Wealth & leadership",
      "Branding & legacy",
      "Life after boxing",
    ],
  },
  {
    id: "how-to-become-a-boxer-for-beginners",
    title: "How To Become A Boxer – For Beginners",
    price: 19,
    image: image3,
    url: GUMROAD_SHELF,
    badge: "Start Here",
    hook: "Your first clean step into real boxing.",
    highlights: [
      "Day-1 fundamentals",
      "Footwork, guard, jabs",
      "Home & gym variations",
    ],
  },
  {
    id: "world-champion-boxing-blueprint",
    title: "World Champion Boxing Blueprint",
    price: 59,
    image: image4,
    url: GUMROAD_SHELF,
    badge: "Champion Path",
    hook: "The roadmap most fighters never get shown.",
    highlights: [
      "Rankings & pathways",
      "Team, media, sponsors",
      "Business & career map",
    ],
  },
  {
    id: "fight-strategy-game-planning",
    title: "Fight Strategy & Game Planning",
    price: 39,
    image: image5,
    url: GUMROAD_SHELF,
    badge: "Fight IQ",
    hook: "Win before the first bell rings.",
    highlights: [
      "Opponent analysis",
      "Round-by-round planning",
      "Fight IQ adjustments",
    ],
  },
  {
    id: "fight-ready-conditioning",
    title: "Fight-Ready Conditioning",
    price: 35,
    image: image6,
    url: GUMROAD_SHELF,
    badge: "Camp Ready",
    hook: "Gas tank, power, pressure — built round by round.",
    highlights: [
      "Endless stamina",
      "Explosive power",
      "Fight-camp conditioning",
    ],
  },
];

// =====================================================
// PREMIUM BOXING E-BOOK PAGE
// Designed as a luxury product shelf with strong hook,
// trust signals, curiosity copy, and clean Gumroad CTAs.
// =====================================================
export default function Ebook({
  items = defaultItems,
  shelfUrl = GUMROAD_SHELF,
}) {
  return (
    <Wrap>
      <Hero
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <Eyebrow>KnockoutCodes • Premium Boxing Library</Eyebrow>

        <Title>
          Most Fighters Train Hard.
          <span> Few Train With A Blueprint.</span>
        </Title>

        <Sub>
          Premium boxing e-books built for fighters, beginners, coaches, and
          disciplined people who want sharper technique, stronger fight IQ, and
          a more professional training system.
        </Sub>

        <HeroActions>
          <PrimaryHeroCta
            href={shelfUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View all KnockoutCodes boxing e-books on Gumroad"
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
          >
            Enter The Boxing Library
          </PrimaryHeroCta>

          <TrustLine>
            Instant access • Secure checkout • Train at your pace
          </TrustLine>
        </HeroActions>

        <Badges>
          <Badge>Premium PDFs</Badge>
          <Badge>Step-by-step drills</Badge>
          <Badge>Fight IQ focused</Badge>
          <Badge>Beginner to advanced</Badge>
        </Badges>
      </Hero>

      <Grid
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.18 }}
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.12 },
          },
        }}
      >
        {items.map((book) => (
          <Card
            key={book.id}
            variants={{
              hidden: { y: 18, opacity: 0 },
              show: { y: 0, opacity: 1 },
            }}
            whileHover={{ y: -7 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <CardGlow aria-hidden="true" />

            <Thumb>
              <ProductBadge>{book.badge}</ProductBadge>

              <img
                src={book.image}
                alt={`${book.title} cover`}
                width={800}
                height={620}
                loading="lazy"
              />

              <Shine aria-hidden="true" />
            </Thumb>

            <CardBody>
              <CardTitle>{book.title}</CardTitle>
              <CardHook>{book.hook}</CardHook>

              <Highlights>
                {(book.highlights || []).slice(0, 3).map((highlight, index) => (
                  <li key={`${book.id}-${index}`}>{highlight}</li>
                ))}
              </Highlights>

              <MetaRow>
                <Price>${Number(book.price).toFixed(2)}</Price>

                <BuyButton
                  as="a"
                  href={book.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Buy ${book.title} on Gumroad`}
                >
                  Get Ebook
                </BuyButton>
              </MetaRow>
            </CardBody>
          </Card>
        ))}
      </Grid>

      <InfoStrip>
        <InfoItem>
          <InfoKicker>01</InfoKicker>
          <InfoTitle>What You Get</InfoTitle>
          <InfoText>
            Clean PDF training guides, structured chapters, boxing drills,
            checklists, and clear cues you can use immediately.
          </InfoText>
        </InfoItem>

        <InfoItem>
          <InfoKicker>02</InfoKicker>
          <InfoTitle>Who It’s For</InfoTitle>
          <InfoText>
            Beginners, disciplined athletes, fitness fighters, and boxers who
            want more than random workouts.
          </InfoText>
        </InfoItem>

        <InfoItem>
          <InfoKicker>03</InfoKicker>
          <InfoTitle>The Result</InfoTitle>
          <InfoText>
            Sharper fundamentals, smarter training, cleaner power, better
            conditioning, and stronger confidence.
          </InfoText>
        </InfoItem>
      </InfoStrip>

      <ClosingCta>
        <ClosingTitle>Build The Fighter Before The Fight.</ClosingTitle>
        <ClosingText>
          Choose the blueprint that matches your level, then train with purpose.
        </ClosingText>

        <MotionShelfCta
          href={shelfUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Browse all KnockoutCodes e-books on Gumroad"
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
        >
          View All E-Books On Gumroad
        </MotionShelfCta>
      </ClosingCta>
    </Wrap>
  );
}

// =====================================================
// LUXURY STYLED COMPONENTS
// Dark cocoa atmosphere, ivory highlights, premium cards,
// clean mobile layout, and high-trust checkout buttons.
// =====================================================
const Wrap = styled.main`
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

  min-height: 100%;
  padding: 78px 24px 96px;
  color: var(--ivory);
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 15% 0%,
      rgba(214, 182, 159, 0.16),
      transparent 34%
    ),
    radial-gradient(
      circle at 85% 8%,
      rgba(255, 249, 242, 0.08),
      transparent 30%
    ),
    linear-gradient(180deg, #160b06 0%, var(--bg) 42%, #080403 100%);
`;

const Hero = styled(motion.header)`
  width: 100%;
  max-width: var(--max);
  text-align: center;
  margin-bottom: 42px;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(214, 182, 159, 0.28);
  color: var(--accent);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.25);
`;

const Title = styled.h1`
  max-width: 980px;
  margin: 18px auto 14px;
  font-size: clamp(38px, 6vw, 76px);
  line-height: 0.96;
  letter-spacing: -0.055em;
  font-weight: 950;
  color: var(--ivory);

  span {
    display: block;
    background: linear-gradient(180deg, var(--ivory), var(--accent));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;

const Sub = styled.p`
  max-width: 820px;
  margin: 0 auto;
  color: rgba(255, 249, 242, 0.82);
  font-size: clamp(15px, 1.7vw, 18px);
  line-height: 1.75;
`;

const HeroActions = styled.div`
  margin-top: 22px;
  display: grid;
  justify-items: center;
  gap: 10px;
`;

const PrimaryHeroCta = styled(motion.a)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 15px 24px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(180deg, var(--ivory) 0%, var(--accent) 100%);
  color: var(--black);
  border: 1px solid rgba(255, 249, 242, 0.6);
  text-decoration: none;
  font-weight: 950;
  letter-spacing: 0.03em;
  box-shadow:
    0 18px 46px rgba(214, 182, 159, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.45);

  &:focus-visible {
    outline: 0;
    box-shadow:
      0 0 0 3px rgba(0, 0, 0, 0.8),
      0 0 0 5px var(--ivory),
      0 18px 46px rgba(214, 182, 159, 0.35);
  }
`;

const TrustLine = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.62);
  font-size: 13px;
`;

const Badges = styled.div`
  margin-top: 20px;
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
`;

const Badge = styled.span`
  font-size: 12px;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.065),
    rgba(255, 255, 255, 0.025)
  );
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: rgba(255, 249, 242, 0.88);
`;

const Grid = styled(motion.section)`
  width: 100%;
  max-width: var(--max);
  margin: 24px auto 42px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.article)`
  position: relative;
  overflow: hidden;
  border-radius: var(--r-xl);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.065),
    rgba(255, 255, 255, 0.025)
  );
  border: 1px solid rgba(255, 255, 255, 0.095);
  box-shadow: var(--shadow-glow);
  transform-style: preserve-3d;

  &:hover {
    border-color: rgba(214, 182, 159, 0.34);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08),
      0 26px 70px rgba(0, 0, 0, 0.45);
  }
`;

const CardGlow = styled.i`
  position: absolute;
  inset: -2px;
  pointer-events: none;
  border-radius: inherit;
  background:
    radial-gradient(
      520px 180px at 30% 0%,
      rgba(214, 182, 159, 0.22),
      transparent 52%
    ),
    radial-gradient(
      380px 150px at 85% 0%,
      rgba(255, 249, 242, 0.08),
      transparent 55%
    );
`;

const Thumb = styled.div`
  position: relative;
  width: 100%;
  height: 430px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 50% 0%,
      rgba(214, 182, 159, 0.16),
      transparent 42%
    ),
    var(--cocoa);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    padding: 12px;
    transform: scale(1.015);
    transition:
      transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 220ms ease;
  }

  ${Card}:hover & img {
    transform: scale(1.06);
    filter: brightness(1.07) contrast(1.03);
  }

  @media (max-width: 720px) {
    height: 370px;
  }
`;

const ProductBadge = styled.span`
  position: absolute;
  z-index: 3;
  top: 14px;
  left: 14px;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.66);
  color: var(--accent);
  border: 1px solid rgba(214, 182, 159, 0.34);
  backdrop-filter: blur(10px);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Shine = styled.span`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    transparent 18%,
    rgba(255, 255, 255, 0.08) 36%,
    transparent 54%
  );
  transform: translateX(-70%);
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);

  ${Card}:hover & {
    transform: translateX(18%);
  }
`;

const CardBody = styled.div`
  position: relative;
  z-index: 2;
  padding: 18px 18px 20px;
`;

const CardTitle = styled.h3`
  margin: 0 0 7px;
  color: var(--ivory);
  font-size: 19px;
  line-height: 1.22;
  letter-spacing: -0.02em;
`;

const CardHook = styled.p`
  margin: 0 0 13px;
  color: var(--accent);
  font-size: 13px;
  line-height: 1.55;
  font-weight: 700;
`;

const Highlights = styled.ul`
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 7px;
  color: rgba(255, 249, 242, 0.82);
  font-size: 14px;

  li {
    position: relative;
    padding-left: 18px;
  }

  li::before {
    content: "✦";
    position: absolute;
    left: 0;
    top: 0;
    color: var(--accent);
    font-size: 12px;
  }
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  @media (max-width: 420px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const Price = styled.div`
  color: var(--accent);
  font-size: 20px;
  font-weight: 950;
`;

const BuyButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.72);
  background: linear-gradient(180deg, var(--ivory) 0%, var(--accent) 100%);
  color: var(--black);
  font-weight: 950;
  letter-spacing: 0.02em;
  cursor: pointer;
  text-decoration: none;
  box-shadow:
    0 12px 28px rgba(214, 182, 159, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.42);
  transition:
    transform 150ms ease,
    filter 150ms ease,
    box-shadow 150ms ease;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
    box-shadow:
      0 16px 36px rgba(214, 182, 159, 0.42),
      inset 0 0 0 1px rgba(255, 255, 255, 0.55);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 0;
    box-shadow:
      0 0 0 2px rgba(0, 0, 0, 0.8),
      0 0 0 4px var(--ivory),
      0 14px 34px rgba(214, 182, 159, 0.46);
  }
`;

const InfoStrip = styled.section`
  width: 100%;
  max-width: var(--max);
  margin: 8px auto 28px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  position: relative;
  overflow: hidden;
  padding: 18px 18px 20px;
  border-radius: var(--r-lg);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.06),
    rgba(255, 255, 255, 0.025)
  );
  border: 1px solid rgba(255, 255, 255, 0.09);
`;

const InfoKicker = styled.span`
  display: inline-flex;
  margin-bottom: 10px;
  color: rgba(214, 182, 159, 0.72);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.16em;
`;

const InfoTitle = styled.h4`
  margin: 0 0 7px;
  color: var(--accent);
  font-size: 17px;
`;

const InfoText = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.83);
  line-height: 1.65;
`;

const ClosingCta = styled.section`
  width: 100%;
  max-width: 880px;
  text-align: center;
  margin-top: 18px;
  padding: 30px 20px 0;
`;

const ClosingTitle = styled.h2`
  margin: 0 0 8px;
  color: var(--ivory);
  font-size: clamp(26px, 4vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.04em;
`;

const ClosingText = styled.p`
  margin: 0 auto 20px;
  max-width: 620px;
  color: rgba(255, 249, 242, 0.75);
  line-height: 1.65;
`;

const ShelfCtaBase = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(180deg, var(--ivory) 0%, var(--accent) 100%);
  border: 1px solid rgba(214, 182, 159, 0.72);
  color: var(--black);
  font-weight: 950;
  text-decoration: none;
  letter-spacing: 0.02em;
  box-shadow:
    0 16px 38px rgba(214, 182, 159, 0.38),
    inset 0 0 0 1px rgba(255, 255, 255, 0.45);

  &:hover {
    filter: brightness(1.05);
    box-shadow:
      0 20px 48px rgba(214, 182, 159, 0.48),
      inset 0 0 0 1px rgba(255, 255, 255, 0.55);
  }

  &:focus-visible {
    outline: 0;
    box-shadow:
      0 0 0 2px rgba(0, 0, 0, 0.8),
      0 0 0 4px var(--ivory),
      0 18px 46px rgba(214, 182, 159, 0.5);
  }
`;

const MotionShelfCta = motion.create(ShelfCtaBase);
