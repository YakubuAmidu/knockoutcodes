// src/pages/CourseDetail.jsx
import { useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import axiosInstance from "../../utils/axiosInstance";
import beginnerImg from "../assets/knockoutcodes-beginner-access-pass.png";
import intermediateImg from "../assets/knockoutcodes-intermediate-access-pass.png";
import advanceImg from "../assets/knockoutcodes-advance-access-pass.png";
import completeImg from "../assets/knockoutcodes-complete-access-pass.png";

/* =========================
   Styled
========================= */
const PageWrap = styled.main`
  min-height: 100vh;
  background: radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.22),
      transparent 55%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(61, 38, 26, 0.45),
      ${({ theme }) => theme.colors.black} 70%
    );
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  justify-content: center;
  padding: 88px 16px 70px;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr);
  gap: 22px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  background: linear-gradient(
    150deg,
    ${({ theme }) => theme.colors.cocoa},
    ${({ theme }) => theme.colors.darkBrown}
  );
  border-radius: ${({ theme }) => theme.radius.xl};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 249, 242, 0.08);
  overflow: hidden;
`;

const Pad = styled.div`
  padding: 18px 18px 18px;

  @media (max-width: 520px) {
    padding: 16px;
  }
`;

const ThumbWrap = styled.div`
  position: relative;
  background: ${({ theme }) => theme.colors.black};
  aspect-ratio: 16 / 9;
  overflow: hidden;
`;

const Thumb = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.1) contrast(1.05);
  transform: scale(1.001);
`;

const BadgeRow = styled.div`
  position: absolute;
  inset: 14px 14px auto 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  pointer-events: none;
`;

const Badge = styled.span`
  padding: 6px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(0, 0, 0, 0.65);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.26);
`;

const BestSellerBadge = styled(Badge)`
  background: rgba(255, 215, 122, 0.9);
  color: ${({ theme }) => theme.colors.black};
`;

const BadgeRightGroup = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const TitleWrap = styled.div`
  padding: 16px 18px 16px;
  display: grid;
  gap: 10px;
`;

const Eyebrow = styled.p`
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin: 0;
`;

const Title = styled.h1`
  font-size: clamp(1.9rem, 2.2vw, 2.4rem);
  font-weight: 900;
  letter-spacing: 0.03em;
  line-height: 1.15;
  margin: 0;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.white}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Hook = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.95;
  font-weight: 900;
  letter-spacing: 0.01em;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
`;

const MetaPill = styled.span`
  padding: 7px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.28);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const Section = styled.section`
  margin-top: 18px;
`;

const SectionTitle = styled.h2`
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
  margin: 0 0 10px;
`;

const Text = styled.p`
  font-size: 13.5px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  margin: 0;
`;

const Split = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 9px;
`;

const Li = styled.li`
  position: relative;
  padding-left: 16px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  font-size: 13px;
  line-height: 1.55;

  &::before {
    content: "•";
    position: absolute;
    left: 4px;
    top: 0;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 900;
  }
`;

const StickyCard = styled.aside`
  position: sticky;
  top: 92px;
  align-self: start;

  @media (max-width: 980px) {
    position: relative;
    top: auto;
  }
`;

const SidePad = styled.div`
  padding: 18px;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0 10px;
  border-top: 1px solid rgba(255, 249, 242, 0.08);
  border-bottom: 1px solid rgba(255, 249, 242, 0.08);
  margin: 12px 0 12px;
`;

const Price = styled.div`
  font-size: 22px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const OldPrice = styled.div`
  font-size: 13px;
  color: rgba(255, 249, 242, 0.6);
  text-decoration: line-through;
`;

const Small = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;
  line-height: 1.5;
`;

const CTA = styled.button`
  width: 100%;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }
`;

const Ghost = styled.button`
  width: 100%;
  margin-top: 10px;
  border: 1px solid rgba(255, 249, 242, 0.6);
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 12px 14px;
  font-size: 12.5px;
  font-weight: 900;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.18s ease, background 0.18s ease;

  &:hover {
    background: rgba(255, 249, 242, 0.06);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Notice = styled.div`
  margin-top: 12px;
  padding: 12px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(214, 182, 159, 0.28);
  background: rgba(0, 0, 0, 0.24);
`;

const NoticeTitle = styled.div`
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const NoticeText = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.85;
`;

const Fallback = styled.div`
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};
`;

/* =========================
   Helpers
========================= */
function formatMinutesToHours(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return null;
  const hrs = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
}

function safeMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(2);
}

const toArray = (value) => (Array.isArray(value) ? value : []);

function getAuthToken() {
  const raw =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("userToken");

  if (!raw || raw === "undefined" || raw === "null" || raw.length < 10) return null;
  return raw;
}

/* =========================
   Hardcoded course details (matches Courses.jsx IDs)
========================= */
const COURSE_DETAIL = {
  "kc-beginner": {
    _id: "kc-beginner",
    eyebrow: "Beginner Access Pass",
    badgeLeft: "Boxing Fundamentals",
    badgeRight: "Starter Program",
    title: "KnockoutCodes — Beginner Access Pass (Starter Program)",
    hook: "If you’re starting from zero… start here and level up fast.",
    image: beginnerImg,
    level: "Beginner",
    coach: "KnockoutCodes Coaching Team",
    durationInMinutes: 360,
    studentsCount: 1540,
    ratingAverage: 4.8,
    ratingCount: 128,
    price: 20,
    oldPrice: null,
    whatThisIs:
      "Beginner Access is a premium, step-by-step starter program designed to build your boxing foundation the right way. You’ll learn clean mechanics, simple combos, beginner defense, and a repeatable weekly plan—so you stop guessing and start improving with confidence.",
    forYouIf: [
      "You’re brand new or restarting and need a clean path",
      "You feel overwhelmed and don’t know what to train first",
      "You want technique that looks sharp (not sloppy)",
      "You want a routine you can repeat weekly without burnout",
      "You want real improvement—not random tips",
    ],
    outcomes: [
      "A strong stance, guard, and balance foundation",
      "Clean jab, cross, hook mechanics (no arm punching)",
      "Beginner combos you can repeat under fatigue",
      "Basic defense habits you can actually use",
      "A weekly structure so you always know what to do next",
    ],
    whatYouLearn: [
      "Stance & guard fundamentals (balance, posture, weight distribution)",
      "How to throw a jab correctly (range, snap, return, timing)",
      "How to throw a cross correctly (rotation, hip drive, alignment)",
      "How to throw hooks clean (short range mechanics, elbow path, stability)",
      "Beginner body shots (safe entry, placement, balance while punching)",
      "Basic combinations: 1–2, 1–2–3, 2–3, jab-to-body, cross-to-hook",
      "Footwork basics: step-slide, staying centered, not crossing feet",
      "Beginner defense: high guard, basic slips, simple resets",
      "How to practice correctly (so you stop wasting months)",
      "How to build consistency without burnout (a system, not motivation)",
    ],
    whatYouGet: [
      "Beginner Roadmap: what to learn in the correct order",
      "Weekly “Do This Next” steps (simple and clear)",
      "Beginner challenges to build consistency + discipline",
      "Upgrade-ready checkpoint so you know when to move up",
    ],
    howItWorks: [
      "Join Beginner Access and open your roadmap",
      "Follow the weekly steps in order (repeat until clean)",
      "Do the mini challenges to build consistency",
      "Upgrade only when fundamentals feel natural",
    ],
    whenToUpgrade: [
      "Your stance and guard feel natural without thinking",
      "Your jab–cross combos stay clean even when tired",
      "You can complete weekly tasks consistently",
      "You’re ready for deeper systems, defense-counters, and sharper movement",
    ],
    rules: [
      "Respect the process (no skipping fundamentals)",
      "Execution beats hype—train the plan",
      "Consistency is the real secret",
    ],
    whyThisCourse: [
      "It removes confusion (no random training)",
      "It’s beginner-proof (simple steps, real progress)",
      "It builds clean mechanics first (so skills last)",
      "It gives you structure (so you stay consistent)",
    ],
  },

  "kc-intermediate": {
    _id: "kc-intermediate",
    eyebrow: "Intermediate Access Pass",
    badgeLeft: "Footwork • Timing",
    badgeRight: "Builder Program",
    title: "KnockoutCodes — Intermediate Access Pass (Builder Program)",
    hook: "You know the basics… now we make you dangerous.",
    image: intermediateImg,
    level: "Intermediate",
    coach: "KnockoutCodes Coaching Team",
    durationInMinutes: 540,
    studentsCount: 980,
    ratingAverage: 4.9,
    ratingCount: 92,
    price: 35,
    oldPrice: null,
    whatThisIs:
      "Intermediate Access is where you stop ‘trying’ and start executing. This level focuses on movement, timing, defense habits, and counter systems—so your boxing becomes sharp, controlled, and consistent.",
    forYouIf: [
      "You already know the fundamentals but still feel messy",
      "You want better footwork, timing, and defensive habits",
      "You want structured weekly plans instead of random workouts",
      "You want to build counters and cleaner combinations",
    ],
    outcomes: [
      "Cleaner footwork and better positioning",
      "Sharper timing and rhythm control",
      "Defense-to-counter habits (automatic responses)",
      "More confidence sparring-style (even without sparring)",
      "Faster progress through structure",
    ],
    whatYouLearn: [
      "Footwork patterns: step-slide mastery, pivots, angle exits",
      "Distance control: how to be “in range” on your terms",
      "Timing drills: rhythm, feints, and punch placement",
      "Defense foundations: slip + reset, catch + return, safe movement",
      "Counter systems: jab counters, cross counters, hook counters",
      "Combination upgrades: punch flow, punch selection, clean finishing shots",
      "Body-to-head transitions (how to open targets safely)",
      "Consistency systems: weekly structure + discipline routines",
    ],
    whatYouGet: [
      "Intermediate weekly plans (more structure, less guessing)",
      "Skill-building challenges (to force progress)",
      "Builder-level routines & discipline systems",
      "Upgrade checkpoints so you know when you’re ready for Advanced",
    ],
    howItWorks: [
      "Join Intermediate Access and follow the weekly plan",
      "Complete the challenges (they’re designed to level you up)",
      "Build timing, movement, and counters step-by-step",
      "Upgrade when execution holds under pressure",
    ],
    whenToUpgrade: [
      "You complete weekly challenges consistently",
      "Your defense-to-counter feels natural",
      "Your movement stays sharp when tired",
      "You’re ready for power mechanics, pressure control, and advanced systems",
    ],
    rules: [
      "No lazy energy—builders only",
      "No drama, no spam, no excuses",
      "We execute weekly—progress is non-negotiable",
    ],
    whyThisCourse: [
      "It turns basics into habits (automatic execution)",
      "It upgrades movement + timing fast",
      "It builds real structure so you improve every week",
    ],
  },

  "kc-advanced": {
    _id: "kc-advanced",
    eyebrow: "Advanced Access Pass",
    badgeLeft: "Power • Control",
    badgeRight: "Power Program",
    title: "KnockoutCodes — Advanced Access Pass (Power Program)",
    hook: "This is where discipline turns into dominance.",
    image: advanceImg,
    level: "Advanced",
    coach: "KnockoutCodes Coaching Team",
    durationInMinutes: 720,
    studentsCount: 620,
    ratingAverage: 4.9,
    ratingCount: 64,
    price: 40,
    oldPrice: null,
    whatThisIs:
      "Advanced Access is for disciplined executors who want precision, power, and control. This isn’t basics—this is system-based training designed to sharpen execution under pressure.",
    forYouIf: [
      "You already built consistency and want higher-level systems",
      "You want explosive mechanics and clean power",
      "You want pressure control, angles, and advanced defense-to-counter chains",
      "You’re ready to operate at a higher standard",
    ],
    outcomes: [
      "More efficient power without losing balance",
      "Sharper counter chains and advanced combinations",
      "Better pressure control and ring-style positioning",
      "Higher standards and confident execution",
    ],
    whatYouLearn: [
      "Explosive mechanics: generating power from hips + legs (not arms)",
      "Power punching systems: clean torque, snap, impact control",
      "Defense-to-counter chains: slip → counter → angle → finish",
      "Pressure control: how to walk someone down safely",
      "Angles and pivots: stepping off line while staying dangerous",
      "Advanced combination building: setups, traps, and finishing sequences",
      "Pacing under fatigue: staying sharp when tired (real fighter skill)",
      "Pressure tests: structured challenges to confirm your level",
    ],
    whatYouGet: [
      "Advanced breakdowns (systems, not tips)",
      "Pressure-based challenges (to sharpen execution)",
      "Elite routines & frameworks",
      "Positioning path for Complete Access",
    ],
    howItWorks: [
      "Join Advanced Access and apply systems weekly",
      "Pressure-test your execution (no excuses)",
      "Refine power and control with structured challenges",
      "Upgrade when execution becomes automatic",
    ],
    whenToUpgrade: [
      "Your execution is consistent without motivation",
      "You perform clean under fatigue and pressure",
      "You want the full system + long-term strategy and mastery",
    ],
    rules: ["No excuses", "No noise", "Only execution", "Respect the environment"],
    whyThisCourse: [
      "Systems beat motivation at high levels",
      "Pressure tests reveal real skill",
      "This level builds authority and control",
    ],
  },

  "kc-complete": {
    _id: "kc-complete",
    eyebrow: "Complete Access Pass",
    badgeLeft: "Full System",
    badgeRight: "Champion Program",
    title: "KnockoutCodes — Complete Access Pass (Champion Program)",
    hook: "Everything. All systems. One plan—champion level.",
    image: completeImg,
    level: "All Levels",
    coach: "KnockoutCodes Coaching Team",
    durationInMinutes: 1200,
    studentsCount: 410,
    ratingAverage: 5.0,
    ratingCount: 41,
    price: 50,
    oldPrice: null,
    whatThisIs:
      "Complete Access is the full KnockoutCodes blueprint—fundamentals, footwork, defense, power, strategy, and ring IQ—organized into a clean, long-term training system you can follow for months with clarity.",
    forYouIf: [
      "You want the full system, not one piece",
      "You want structure that removes confusion permanently",
      "You want to train long-term with checkpoints and progression",
      "You want the most complete version of KnockoutCodes",
    ],
    outcomes: [
      "A full fundamentals-to-advanced path in one place",
      "Better ring IQ, pacing, and decision-making",
      "Cleaner execution through structured progression",
      "A long-term training plan that stays effective",
    ],
    whatYouLearn: [
      "Fundamentals mastery: stance, guard, clean mechanics, repeatable combos",
      "Footwork + timing: angles, distance control, rhythm, positioning",
      "Defense + counters: habits, chains, safe returns",
      "Power + precision: efficient mechanics and finishing sequences",
      "Strategy + ring IQ: pacing, shot selection, pressure vs counter styles",
      "Consistency systems: routines, discipline frameworks, checkpoints",
      "Long-term execution: training months with structure (no confusion)",
    ],
    whatYouGet: [
      "All levels combined into one organized system",
      "Long-term structure + checkpoints",
      "Priority access path for future drops and upgrades",
      "Highest-level roadmap (clarity + progression)",
    ],
    howItWorks: [
      "Join Complete Access and pick your track (foundation → builder → power → champion)",
      "Follow the plan weekly and track your execution",
      "Progress through checkpoints instead of guessing",
      "Stay consistent and sharpen over time",
    ],
    whenToUpgrade: [],
    rules: ["Respect the process", "Stay consistent", "No noise", "Execution only"],
    whyThisCourse: [
      "It removes confusion permanently",
      "Everything is organized and structured",
      "It’s built for long-term mastery and results",
    ],
  },
};

/* =========================
   Component
========================= */
const CourseDetail = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const course = useMemo(() => {
    const fromState = location?.state?.course || null;
    const hard = COURSE_DETAIL[courseId] || null;

    if (hard && fromState && (fromState._id || fromState.title)) {
      return { ...hard, ...fromState };
    }

    return hard || fromState || null;
  }, [courseId, location?.state?.course]);

  useEffect(() => {
    if (!course) {
      toast?.push?.({
        title: "Course not found",
        description: "That course link is not available. Returning to Courses.",
        variant: "warning",
      });
      const t = setTimeout(() => navigate("/courses"), 450);
      return () => clearTimeout(t);
    }

    toast?.push?.({
      title: "Course loaded",
      description: "Review the full breakdown. Enroll when you’re ready.",
      variant: "info",
    });

    return undefined;
  }, [course, navigate, toast]);

  const durationLabel = formatMinutesToHours(course?.durationInMinutes);

  const hasSale =
    course?.oldPrice != null &&
    Number.isFinite(Number(course.oldPrice)) &&
    Number.isFinite(Number(course.price)) &&
    Number(course.oldPrice) > Number(course.price);

  const forYouIf = useMemo(() => toArray(course?.forYouIf), [course]);
  const outcomes = useMemo(() => toArray(course?.outcomes), [course]);
  const whatYouLearn = useMemo(() => toArray(course?.whatYouLearn), [course]);
  const whatYouGet = useMemo(() => toArray(course?.whatYouGet), [course]);
  const howItWorks = useMemo(() => toArray(course?.howItWorks), [course]);
  const whenToUpgrade = useMemo(() => toArray(course?.whenToUpgrade), [course]);
  const rules = useMemo(() => toArray(course?.rules), [course]);
  const whyThisCourse = useMemo(() => toArray(course?.whyThisCourse), [course]);

  const handleEnroll = useCallback(async () => {
    if (!course?._id) return;

    // 1) Must be logged in
    const token = getAuthToken();
    if (!token) {
      navigate("/login", {
        state: { from: `/courses/${encodeURIComponent(course._id)}` },
      });
      return;
    }

    // 2) Must have active membership subscription
    try {
      const res = await axiosInstance.get("/billing/me");
      const data = res?.data?.data || {};
      const isActive = Boolean(data?.isActive);

      if (!isActive) {
        navigate("/memberships", {
          state: { from: `/courses/${encodeURIComponent(course._id)}`, courseId: course._id },
        });
        return;
      }

      // 3) Passed login + membership -> go to CoursePlayer (we build next)
      navigate(`/course-player/${encodeURIComponent(course._id)}`);
    } catch (err) {
      console.error("membership check failed:", err);
      navigate("/memberships", {
        state: { from: `/courses/${encodeURIComponent(course._id)}`, courseId: course._id },
      });
    }
  }, [course?._id, navigate]);

  const handleBack = useCallback(() => {
    navigate("/courses");
  }, [navigate]);

  if (!course) {
    return (
      <PageWrap>
        <Inner>
          <Fallback>Loading…</Fallback>
        </Inner>
      </PageWrap>
    );
  }

  const leftLearn = whatYouLearn.slice(0, Math.ceil(whatYouLearn.length / 2));
  const rightLearn = whatYouLearn.slice(Math.ceil(whatYouLearn.length / 2));

  const isBestSeller =
    Number(course.ratingAverage) >= 4.7 && Number(course.ratingCount) >= 20;

  return (
    <PageWrap>
      <Inner>
        <TopRow>
          <Card>
            <ThumbWrap>
              <Thumb
                src={
                  course.image ||
                  course.thumbnail ||
                  "https://via.placeholder.com/1200x800?text=KnockoutCodes+Course"
                }
                alt={course.title || "Course thumbnail"}
                loading="lazy"
              />
              <BadgeRow>
                <Badge>{course.badgeLeft || course.category || "Course"}</Badge>
                <BadgeRightGroup>
                  {isBestSeller ? <BestSellerBadge>Best Seller</BestSellerBadge> : null}
                  <Badge>{course.badgeRight || course.level || "Program"}</Badge>
                </BadgeRightGroup>
              </BadgeRow>
            </ThumbWrap>

            <TitleWrap>
              <Eyebrow>{course.eyebrow || "Course Detail"}</Eyebrow>
              <Title>{course.title || "Course"}</Title>
              {course.hook ? <Hook>“{course.hook}”</Hook> : null}

              <MetaRow>
                {course.level ? <MetaPill>Level: {course.level}</MetaPill> : null}
                {course.coach ? <MetaPill>Coach: {course.coach}</MetaPill> : null}
                {durationLabel ? <MetaPill>Duration: {durationLabel}</MetaPill> : null}
                {typeof course.studentsCount === "number" ? (
                  <MetaPill>{course.studentsCount} enrolled</MetaPill>
                ) : null}
                {typeof course.ratingAverage === "number" ? (
                  <MetaPill>
                    ⭐ {Number(course.ratingAverage).toFixed(1)} ({course.ratingCount || 0} ratings)
                  </MetaPill>
                ) : null}
              </MetaRow>
            </TitleWrap>

            <Pad>
              <Section>
                <SectionTitle>What this is</SectionTitle>
                <Text>
                  {course.whatThisIs ||
                    course.description ||
                    "A premium course built with structure and clarity."}
                </Text>
              </Section>

              {whyThisCourse.length > 0 ? (
                <Section>
                  <SectionTitle>Why take this course</SectionTitle>
                  <List>
                    {whyThisCourse.map((x) => (
                      <Li key={x}>{x}</Li>
                    ))}
                  </List>
                </Section>
              ) : null}

              {outcomes.length > 0 ? (
                <Section>
                  <SectionTitle>What you’ll achieve</SectionTitle>
                  <List>
                    {outcomes.map((x) => (
                      <Li key={x}>{x}</Li>
                    ))}
                  </List>
                </Section>
              ) : null}

              {whatYouLearn.length > 0 ? (
                <Section>
                  <SectionTitle>What you’ll learn</SectionTitle>
                  <Split>
                    <div>
                      <List>
                        {leftLearn.map((x) => (
                          <Li key={x}>{x}</Li>
                        ))}
                      </List>
                    </div>
                    <div>
                      <List>
                        {rightLearn.map((x) => (
                          <Li key={x}>{x}</Li>
                        ))}
                      </List>
                    </div>
                  </Split>
                </Section>
              ) : null}

              {whatYouGet.length > 0 ? (
                <Section>
                  <SectionTitle>What you get</SectionTitle>
                  <List>
                    {whatYouGet.map((x) => (
                      <Li key={x}>{x}</Li>
                    ))}
                  </List>
                </Section>
              ) : null}

              {forYouIf.length > 0 ? (
                <Section>
                  <SectionTitle>Who this is for</SectionTitle>
                  <List>
                    {forYouIf.map((x) => (
                      <Li key={x}>{x}</Li>
                    ))}
                  </List>
                </Section>
              ) : null}

              {howItWorks.length > 0 ? (
                <Section>
                  <SectionTitle>How it works</SectionTitle>
                  <List>
                    {howItWorks.map((x) => (
                      <Li key={x}>{x}</Li>
                    ))}
                  </List>
                </Section>
              ) : null}

              {whenToUpgrade.length > 0 ? (
                <Section>
                  <SectionTitle>When to upgrade</SectionTitle>
                  <List>
                    {whenToUpgrade.map((x) => (
                      <Li key={x}>{x}</Li>
                    ))}
                  </List>
                </Section>
              ) : null}

              {rules.length > 0 ? (
                <Section>
                  <SectionTitle>Rules</SectionTitle>
                  <List>
                    {rules.map((x) => (
                      <Li key={x}>{x}</Li>
                    ))}
                  </List>
                </Section>
              ) : null}
            </Pad>
          </Card>

          <StickyCard>
            <Card>
              <SidePad>
                <SectionTitle>Enroll</SectionTitle>

                <PriceRow>
                  <div>
                    <Price>${safeMoney(course.price) || "0.00"}</Price>
                    {hasSale ? <OldPrice>${safeMoney(course.oldPrice)}</OldPrice> : null}
                  </div>
                  <MetaPill>Instant access</MetaPill>
                </PriceRow>

                <CTA type="button" onClick={handleEnroll}>
                  Enroll Now
                </CTA>

                <Ghost type="button" onClick={handleBack}>
                  Back to Courses
                </Ghost>

                <Notice>
                  <NoticeTitle>Quick note</NoticeTitle>
                  <NoticeText>
                    Follow the structure weekly. Upgrade only when the fundamentals
                    feel automatic and your execution stays clean under fatigue.
                  </NoticeText>
                </Notice>

                <div style={{ height: 10 }} />

                {course.hook ? (
                  <Small>
                    Hook (say this in the first 1–3 seconds):{" "}
                    <strong style={{ color: "inherit" }}>“{course.hook}”</strong>
                  </Small>
                ) : null}
              </SidePad>
            </Card>
          </StickyCard>
        </TopRow>
      </Inner>
    </PageWrap>
  );
};

export default CourseDetail;
