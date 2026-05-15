// src/pages/CourseDetail.jsx
import { useEffect, useMemo, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import {
  createCourseCheckout,
  resetCourseState,
} from "../reducers/courses/courseActions";
import styled, { keyframes } from "styled-components";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import axiosInstance from "../../utils/axiosInstance";
import { createMembershipCheckoutSession } from "../lib/apiClient";

import beginnerImg from "../assets/knockoutcodes-beginner-access-pass.png";
import intermediateImg from "../assets/knockoutcodes-intermediate-access-pass.png";
import advanceImg from "../assets/knockoutcodes-advance-access-pass.png";
import completeImg from "../assets/knockoutcodes-complete-access-pass.png";

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

function normalizeLevel(value) {
  const level = String(value || "").trim().toLowerCase();
  if (level === "advanced") return "advance";
  return level;
}

function getRequiredMembershipLevel(course) {
  const level = course?.requiredMembershipLevel || course?.level || "beginner";
  const normalized = normalizeLevel(level);

  if (!normalized || normalized === "all-levels") return "beginner";
  return normalized;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickLocalCourseImage(course) {
  const key = String(course?.slug || course?.title || course?._id || "").toLowerCase();

  if (key.includes("beginner")) return beginnerImg;
  if (key.includes("intermediate")) return intermediateImg;
  if (key.includes("advanced")) return advanceImg;
  if (key.includes("advance")) return advanceImg;
  if (key.includes("complete")) return completeImg;

  return null;
}

function getCourseHook(course) {
  const level = String(course?.level || course?.title || "").toLowerCase();

  if (level.includes("beginner")) {
    return "If you’re starting from zero, this is where discipline becomes skill.";
  }

  if (level.includes("intermediate")) {
    return "You know the basics — now we make your movement dangerous.";
  }

  if (level.includes("advanced") || level.includes("advance")) {
    return "This is where pressure, power, and control start looking different.";
  }

  if (level.includes("complete")) {
    return "Everything. All systems. One clean path to champion-level execution.";
  }

  return "This is not random training. This is a system built for serious progress.";
}

function resolveCheckoutUrl(res) {
  const payload = res?.data ?? res ?? {};

  const url =
    payload?.url ||
    payload?.checkoutUrl ||
    payload?.checkoutURL ||
    payload?.redirectUrl ||
    payload?.redirectURL ||
    payload?.data?.url ||
    payload?.data?.checkoutUrl;

  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return String(url);
  if (String(url).startsWith("/")) return `${window.location.origin}${url}`;
  return "";
}

function buildFallbackDetails(course) {
  const level = course?.level || "All Levels";
  const title = course?.title || "KnockoutCodes Course";

  return {
    whatThisIs:
      course?.whatThisIs ||
      course?.description ||
      `${title} is a premium KnockoutCodes training experience built to help you train with structure, discipline, confidence, and clean execution.`,
    whyThisCourse: toArray(course?.whyThisCourse).length
      ? course.whyThisCourse
      : [
          "It removes confusion and gives you a clear training path.",
          "It helps you stop guessing and start improving with structure.",
          "It is built for students who want discipline, skill, and real progress.",
        ],
    outcomes: toArray(course?.outcomes).length
      ? course.outcomes
      : [
          "Sharper fundamentals and cleaner boxing habits.",
          "Better confidence through repeatable training structure.",
          "A stronger understanding of what to practice and why it matters.",
        ],
    whatYouLearn: toArray(course?.whatYouLearn).length
      ? course.whatYouLearn
      : [
          "Stance, guard, balance, and clean movement.",
          "Punch mechanics, combinations, and controlled execution.",
          "Footwork, discipline, and training consistency.",
          "How to follow a system instead of random workouts.",
        ],
    whatYouGet: toArray(course?.whatYouGet).length
      ? course.whatYouGet
      : [
          "Premium course access.",
          "Structured lessons inside the course player.",
          "A clean path for training and improvement.",
        ],
    forYouIf: toArray(course?.forYouIf).length
      ? course.forYouIf
      : [
          `You are ready to train at the ${level} level.`,
          "You want a serious system instead of scattered tips.",
          "You want to build discipline, confidence, and skill.",
        ],
    howItWorks: toArray(course?.howItWorks).length
      ? course.howItWorks
      : [
          "Enroll or start the free course.",
          "Open the course player.",
          "Follow the lessons in order.",
          "Repeat, sharpen, and progress with discipline.",
        ],
    rules: toArray(course?.rules).length
      ? course.rules
      : ["Respect the process.", "Train with discipline.", "Execute before excuses."],
  };
}

const COURSE_DETAIL = {
  "kc-beginner": {
    _id: "kc-beginner",
    eyebrow: "Beginner Access Pass",
    badgeLeft: "Boxing Fundamentals",
    badgeRight: "Starter Program",
    title: "KnockoutCodes — Beginner Access Pass",
    hook: "If you’re starting from zero… start here and level up fast.",
    image: beginnerImg,
    level: "Beginner",
    coach: "KnockoutCodes Coaching Team",
    durationInMinutes: 360,
    studentsCount: 1540,
    ratingAverage: 4.8,
    ratingCount: 128,
    price: 20,
    whatThisIs:
      "Beginner Access is a premium starter program designed to build your boxing foundation the right way. You’ll learn clean mechanics, simple combos, beginner defense, and a repeatable weekly plan.",
  },
  "kc-intermediate": {
    _id: "kc-intermediate",
    eyebrow: "Intermediate Access Pass",
    badgeLeft: "Footwork • Timing",
    badgeRight: "Builder Program",
    title: "KnockoutCodes — Intermediate Access Pass",
    hook: "You know the basics… now we make you dangerous.",
    image: intermediateImg,
    level: "Intermediate",
    coach: "KnockoutCodes Coaching Team",
    durationInMinutes: 540,
    studentsCount: 980,
    ratingAverage: 4.9,
    ratingCount: 92,
    price: 35,
    whatThisIs:
      "Intermediate Access is where you stop trying and start executing. This course sharpens movement, timing, defense habits, and counter systems.",
  },
  "kc-advanced": {
    _id: "kc-advanced",
    eyebrow: "Advanced Access Pass",
    badgeLeft: "Power • Control",
    badgeRight: "Power Program",
    title: "KnockoutCodes — Advanced Access Pass",
    hook: "This is where discipline turns into dominance.",
    image: advanceImg,
    level: "Advanced",
    coach: "KnockoutCodes Coaching Team",
    durationInMinutes: 720,
    studentsCount: 620,
    ratingAverage: 4.9,
    ratingCount: 64,
    price: 40,
    whatThisIs:
      "Advanced Access is for disciplined executors who want precision, power, pressure control, and advanced defense-to-counter systems.",
  },
  "kc-complete": {
    _id: "kc-complete",
    eyebrow: "Complete Access Pass",
    badgeLeft: "Full System",
    badgeRight: "Champion Program",
    title: "KnockoutCodes — Complete Access Pass",
    hook: "Everything. All systems. One plan — champion level.",
    image: completeImg,
    level: "All Levels",
    coach: "KnockoutCodes Coaching Team",
    durationInMinutes: 1200,
    studentsCount: 410,
    ratingAverage: 5.0,
    ratingCount: 41,
    price: 50,
    whatThisIs:
      "Complete Access is the full KnockoutCodes blueprint — fundamentals, footwork, defense, power, strategy, and ring IQ organized into one long-term training system.",
  },
};

const CourseDetail = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();

  const [isOwned, setIsOwned] = useState(false);
  const [checkingOwnership, setCheckingOwnership] = useState(false);
  const [membershipCheckoutLoading, setMembershipCheckoutLoading] = useState(false);

  const { isAuthenticated, loading: authLoading } = useAuth();

  const {
    checkoutLoading,
    checkoutError,
    checkoutUrl,
    alreadyPurchased,
    purchasedCourseId,
    purchaseMessage,
  } = useSelector((state) => state.courses);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const selectedMembershipId =
    searchParams.get("membershipId") || location?.state?.membershipId || "";

  const selectedBillingPeriod =
    searchParams.get("billingPeriod") ||
    location?.state?.billingPeriod ||
    "monthly";

  const hasSelectedMembership = Boolean(selectedMembershipId);

  const course = useMemo(() => {
    const fromState = location?.state?.course || null;
    const hard = COURSE_DETAIL[courseId] || null;

    if (hard && fromState && (fromState._id || fromState.title)) {
      return { ...hard, ...fromState };
    }

    return hard || fromState || null;
  }, [courseId, location?.state?.course]);

  const details = useMemo(() => buildFallbackDetails(course || {}), [course]);

  const resolvedCourseId = course?._id || courseId;
  const showOwnedState = Boolean(isOwned || alreadyPurchased);
  const isAnyCheckoutLoading = Boolean(
    checkoutLoading || membershipCheckoutLoading
  );

  useEffect(() => {
    if (!course) {
      toast?.push?.({
        title: "Course not found",
        description: "That course link is not available. Returning to Courses.",
        variant: "warning",
      });

      const timer = setTimeout(() => navigate("/courses"), 450);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [course, navigate, toast]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || !resolvedCourseId) {
      setIsOwned(false);
      return;
    }

    let mounted = true;

    async function checkOwnership() {
      try {
        setCheckingOwnership(true);

        const { data } = await axiosInstance.get(
          `/enrollments/status/${encodeURIComponent(resolvedCourseId)}`
        );

        if (mounted) {
          setIsOwned(Boolean(data?.hasAccess || data?.isEnrolled));
        }
      } catch {
        if (mounted) setIsOwned(false);
      } finally {
        if (mounted) setCheckingOwnership(false);
      }
    }

    checkOwnership();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, authLoading, resolvedCourseId]);

  useEffect(() => {
    if (
      checkoutUrl &&
      typeof checkoutUrl === "string" &&
      /^https?:\/\//i.test(checkoutUrl)
    ) {
      window.location.assign(checkoutUrl);
      dispatch(resetCourseState());
    }
  }, [checkoutUrl, dispatch]);

  useEffect(() => {
    if (!alreadyPurchased) return;

    toast?.push?.({
      title: "Already Purchased",
      description:
        purchaseMessage ||
        "You already own this course. Opening your training room.",
      variant: "success",
    });

    const targetCourseId = purchasedCourseId || resolvedCourseId;

    const timer = setTimeout(() => {
      navigate(`/course-player/${encodeURIComponent(targetCourseId)}`);
      dispatch(resetCourseState());
    }, 700);

    return () => clearTimeout(timer);
  }, [
    alreadyPurchased,
    purchaseMessage,
    purchasedCourseId,
    resolvedCourseId,
    navigate,
    toast,
    dispatch,
  ]);

  useEffect(() => {
    if (checkoutError) {
      toast?.push?.({
        title: "Checkout failed",
        description: checkoutError,
        variant: "danger",
      });

      dispatch(resetCourseState());
    }
  }, [checkoutError, dispatch, toast]);

  const getCourseDetailReturnPath = useCallback(() => {
    const params = new URLSearchParams();

    if (selectedMembershipId) {
      params.set("membershipId", selectedMembershipId);
    }

    if (selectedBillingPeriod) {
      params.set("billingPeriod", selectedBillingPeriod);
    }

    const qs = params.toString();
    return `/courses/${resolvedCourseId}${qs ? `?${qs}` : ""}`;
  }, [resolvedCourseId, selectedMembershipId, selectedBillingPeriod]);

  const handleJoinMembership = useCallback(() => {
    if (!resolvedCourseId || !course) return;

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/courses?enroll=${encodeURIComponent(resolvedCourseId)}`,
        },
      });
      return;
    }

    navigate("/memberships", {
      state: {
        courseId: resolvedCourseId,
        requiredMembershipId: getRequiredMembershipLevel(course),
        from: `/courses/${resolvedCourseId}`,
      },
    });
  }, [resolvedCourseId, course, isAuthenticated, navigate]);

  const handleMembershipCheckout = useCallback(async () => {
    if (!resolvedCourseId || !selectedMembershipId || !course) return;

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: getCourseDetailReturnPath(),
          courseId: resolvedCourseId,
          membershipId: selectedMembershipId,
          billingPeriod: selectedBillingPeriod,
          requiredMembershipId: getRequiredMembershipLevel(course),
        },
      });
      return;
    }

    try {
      setMembershipCheckoutLoading(true);

      const res = await createMembershipCheckoutSession({
        membershipId: selectedMembershipId,
        courseId: resolvedCourseId,
        billingPeriod: selectedBillingPeriod || "monthly",
        kind: "membership",
      });

      const checkoutUrl = resolveCheckoutUrl(res);

      if (!checkoutUrl) {
        throw new Error("Stripe checkout URL missing from API response.");
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      toast?.push?.({
        title: "Membership checkout failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Could not start membership checkout. Please try again.",
        variant: "danger",
      });

      setMembershipCheckoutLoading(false);
    }
  }, [
    resolvedCourseId,
    selectedMembershipId,
    selectedBillingPeriod,
    course,
    isAuthenticated,
    navigate,
    toast,
    getCourseDetailReturnPath,
  ]);

  const handleEnroll = useCallback(() => {
    if (
      !resolvedCourseId ||
      authLoading ||
      checkoutLoading ||
      membershipCheckoutLoading ||
      checkingOwnership
    ) {
      return;
    }

    if (showOwnedState) {
      navigate(`/course-player/${encodeURIComponent(resolvedCourseId)}`);
      return;
    }

    if (course?.isFree) {
      navigate(`/course-player/${encodeURIComponent(resolvedCourseId)}`);
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: getCourseDetailReturnPath(),
        },
      });
      return;
    }

    if (hasSelectedMembership) {
      handleMembershipCheckout();
      return;
    }

    if (course?.allowSinglePurchase === false) {
      handleJoinMembership();
      return;
    }

    dispatch(createCourseCheckout(resolvedCourseId, "one_time"));
  }, [
    resolvedCourseId,
    authLoading,
    checkoutLoading,
    membershipCheckoutLoading,
    checkingOwnership,
    showOwnedState,
    course?.isFree,
    course?.allowSinglePurchase,
    isAuthenticated,
    hasSelectedMembership,
    handleMembershipCheckout,
    handleJoinMembership,
    dispatch,
    navigate,
    getCourseDetailReturnPath,
  ]);

  const handleBack = useCallback(() => {
    if (hasSelectedMembership) {
      const params = new URLSearchParams();

      params.set("membershipId", selectedMembershipId);
      params.set("billingPeriod", selectedBillingPeriod || "monthly");

      navigate(`/courses?${params.toString()}`);
      return;
    }

    navigate("/courses");
  }, [
    navigate,
    hasSelectedMembership,
    selectedMembershipId,
    selectedBillingPeriod,
  ]);

  if (!course) {
    return (
      <PageWrap>
        <Inner>
          <Fallback>Loading course...</Fallback>
        </Inner>
      </PageWrap>
    );
  }

  const durationLabel = formatMinutesToHours(course?.durationInMinutes);

  const hasSale =
    course?.salePrice != null &&
    Number.isFinite(Number(course.salePrice)) &&
    Number.isFinite(Number(course.price)) &&
    Number(course.salePrice) < Number(course.price);

  const displayPrice = hasSale ? course.salePrice : course.price;

  const whatYouLearn = toArray(details.whatYouLearn);
  const leftLearn = whatYouLearn.slice(0, Math.ceil(whatYouLearn.length / 2));
  const rightLearn = whatYouLearn.slice(Math.ceil(whatYouLearn.length / 2));

  const isBestSeller =
    Boolean(course.isFeatured) ||
    (Number(course.ratingAverage) >= 4.7 && Number(course.ratingCount) >= 20);

  return (
    <PageWrap>
      <Inner>
        <BackButton type="button" onClick={handleBack}>
          ← Back to Courses
        </BackButton>

        {hasSelectedMembership ? (
          <FlowNotice>
            Membership selected:{" "}
            <strong>{selectedBillingPeriod || "monthly"}</strong>. This course
            will be attached to your recurring membership checkout.
          </FlowNotice>
        ) : null}

        <Hero>
          <HeroCopy>
            <Eyebrow>{course.eyebrow || "KnockoutCodes Course Detail"}</Eyebrow>
            <Title>{course.title || "Premium Boxing Course"}</Title>
            <Hook>“{course.hook || getCourseHook(course)}”</Hook>
            <HeroText>{details.whatThisIs}</HeroText>

            <MetaGrid>
              {course.level ? <MetaPill>Level: {course.level}</MetaPill> : null}
              {course.coach ? <MetaPill>Coach: {course.coach}</MetaPill> : null}
              {durationLabel ? <MetaPill>Duration: {durationLabel}</MetaPill> : null}
              {showOwnedState ? <MetaPill>Already Purchased</MetaPill> : null}
              {hasSelectedMembership ? (
                <MetaPill>
                  Membership checkout: {selectedBillingPeriod || "monthly"}
                </MetaPill>
              ) : null}
              {typeof course.studentsCount === "number" ? (
                <MetaPill>{course.studentsCount} students</MetaPill>
              ) : null}
              {typeof course.ratingAverage === "number" ? (
                <MetaPill>
                  ⭐ {Number(course.ratingAverage).toFixed(1)} / 5
                  {course.ratingCount ? ` • ${course.ratingCount} ratings` : ""}
                </MetaPill>
              ) : null}
            </MetaGrid>
          </HeroCopy>

          <HeroMedia>
            <ThumbWrap>
              <Thumb
                src={
                  course.image ||
                  course.thumbnail ||
                  pickLocalCourseImage(course) ||
                  "https://via.placeholder.com/1200x800?text=KnockoutCodes+Course"
                }
                alt={course.title || "Course thumbnail"}
                loading="lazy"
              />

              <ImageShade />

              <BadgeRow>
                <Badge>{course.badgeLeft || course.category || "Course"}</Badge>

                <BadgeRightGroup>
                  {showOwnedState ? <OwnedBadge>Owned</OwnedBadge> : null}
                  {hasSelectedMembership && !showOwnedState ? (
                    <SelectedBadge>Membership Selected</SelectedBadge>
                  ) : null}
                  {isBestSeller ? <BestSellerBadge>Best Seller</BestSellerBadge> : null}
                  {course?.isFree ? <FreeBadge>Free</FreeBadge> : null}
                  <Badge>{course.badgeRight || course.level || "Program"}</Badge>
                </BadgeRightGroup>
              </BadgeRow>
            </ThumbWrap>
          </HeroMedia>
        </Hero>

        <Layout>
          <MainCard>
            <Section>
              <SectionKicker>Why this course matters</SectionKicker>
              <SectionTitle>Train with a path, not confusion.</SectionTitle>

              <LuxuryGrid>
                {toArray(details.whyThisCourse).map((item, index) => (
                  <LuxuryPoint key={item}>
                    <PointNumber>{String(index + 1).padStart(2, "0")}</PointNumber>
                    <PointText>{item}</PointText>
                  </LuxuryPoint>
                ))}
              </LuxuryGrid>
            </Section>

            <SplitSection>
              <Section>
                <SectionKicker>Transformation</SectionKicker>
                <SectionTitle>What you’ll achieve</SectionTitle>
                <List>
                  {toArray(details.outcomes).map((item) => (
                    <Li key={item}>{item}</Li>
                  ))}
                </List>
              </Section>

              <Section>
                <SectionKicker>Best fit</SectionKicker>
                <SectionTitle>Who this is for</SectionTitle>
                <List>
                  {toArray(details.forYouIf).map((item) => (
                    <Li key={item}>{item}</Li>
                  ))}
                </List>
              </Section>
            </SplitSection>

            <Section>
              <SectionKicker>Curriculum preview</SectionKicker>
              <SectionTitle>What you’ll learn inside</SectionTitle>

              <LearnGrid>
                <List>
                  {leftLearn.map((item) => (
                    <Li key={item}>{item}</Li>
                  ))}
                </List>

                <List>
                  {rightLearn.map((item) => (
                    <Li key={item}>{item}</Li>
                  ))}
                </List>
              </LearnGrid>
            </Section>

            <SplitSection>
              <Section>
                <SectionKicker>Included</SectionKicker>
                <SectionTitle>What you get</SectionTitle>
                <List>
                  {toArray(details.whatYouGet).map((item) => (
                    <Li key={item}>{item}</Li>
                  ))}
                </List>
              </Section>

              <Section>
                <SectionKicker>Execution plan</SectionKicker>
                <SectionTitle>How it works</SectionTitle>
                <List>
                  {toArray(details.howItWorks).map((item) => (
                    <Li key={item}>{item}</Li>
                  ))}
                </List>
              </Section>
            </SplitSection>

            <Section>
              <SectionKicker>Standard</SectionKicker>
              <SectionTitle>The KnockoutCodes rules</SectionTitle>
              <RuleRow>
                {toArray(details.rules).map((item) => (
                  <RulePill key={item}>{item}</RulePill>
                ))}
              </RuleRow>
            </Section>
          </MainCard>

          <Sidebar>
            <EnrollCard>
              <EnrollTop>
                <SmallLabel>
                  {showOwnedState
                    ? "Your Access"
                    : hasSelectedMembership
                    ? "Membership Checkout"
                    : "Enrollment"}
                </SmallLabel>

                <EnrollTitle>
                  {showOwnedState
                    ? "Course already unlocked"
                    : hasSelectedMembership
                    ? "Start recurring membership"
                    : "Unlock the training room"}
                </EnrollTitle>

                <EnrollText>
                  {showOwnedState
                    ? "You already purchased this course. Continue training anytime from your protected course access."
                    : hasSelectedMembership
                    ? "This course will be connected to your selected monthly or yearly membership before Stripe checkout."
                    : "Get access, follow the lessons, and build the skill with discipline."}
                </EnrollText>
              </EnrollTop>

              <PriceBox>
                {showOwnedState ? (
                  <Price>Unlocked</Price>
                ) : hasSelectedMembership ? (
                  <div>
                    <Price>{selectedBillingPeriod || "Monthly"}</Price>
                    <PlanText>Recurring membership</PlanText>
                  </div>
                ) : course?.isFree ? (
                  <Price>Free</Price>
                ) : (
                  <div>
                    <Price>${safeMoney(displayPrice) || "0.00"}</Price>
                    {hasSale ? <OldPrice>${safeMoney(course.price)}</OldPrice> : null}
                  </div>
                )}

                <InstantPill>
                  {showOwnedState
                    ? "Active Access"
                    : hasSelectedMembership
                    ? "Stripe Subscription"
                    : "Instant Access"}
                </InstantPill>
              </PriceBox>

              <CTA
                type="button"
                onClick={handleEnroll}
                disabled={isAnyCheckoutLoading || authLoading || checkingOwnership}
              >
                {authLoading || checkingOwnership
                  ? "Checking..."
                  : isAnyCheckoutLoading
                  ? "Redirecting..."
                  : showOwnedState
                  ? "Watch Now"
                  : course?.isFree
                  ? "Start Free"
                  : hasSelectedMembership
                  ? `Start ${selectedBillingPeriod || "Monthly"} Membership`
                  : course?.allowSinglePurchase === false
                  ? `Join ${getRequiredMembershipLevel(course)} Membership`
                  : "Buy Course Once"}
              </CTA>

              {!showOwnedState && !course?.isFree && !hasSelectedMembership ? (
                <Ghost type="button" onClick={handleJoinMembership}>
                  Join {getRequiredMembershipLevel(course)} Membership
                </Ghost>
              ) : null}

              <Ghost type="button" onClick={handleBack}>
                Back to Courses
              </Ghost>

              {showOwnedState ? (
                <OwnedNotice>
                  <OwnedTitle>Access Unlocked</OwnedTitle>
                  <OwnedText>
                    This course is unlocked through your purchase or active membership.
                    Your access is protected.
                  </OwnedText>
                </OwnedNotice>
              ) : null}

              <Notice>
                <NoticeTitle>First thing to remember</NoticeTitle>
                <NoticeText>
                  Do not rush the lessons. Repeat the basics until your body moves
                  clean without thinking.
                </NoticeText>
              </Notice>

              <MiniStats>
                <MiniStat>
                  <strong>{durationLabel || "Self-paced"}</strong>
                  <span>Training time</span>
                </MiniStat>

                <MiniStat>
                  <strong>{course.level || "All Levels"}</strong>
                  <span>Level</span>
                </MiniStat>

                <MiniStat>
                  <strong>
                    {showOwnedState
                      ? "Owned"
                      : hasSelectedMembership
                      ? "Membership"
                      : course?.isFree
                      ? "Free"
                      : "Premium"}
                  </strong>
                  <span>Access</span>
                </MiniStat>
              </MiniStats>
            </EnrollCard>
          </Sidebar>
        </Layout>
      </Inner>
    </PageWrap>
  );
};

export default CourseDetail;

/* =========================
   Styles
========================= */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PageWrap = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.2), transparent 34%),
    radial-gradient(circle at 86% 10%, rgba(90, 56, 37, 0.42), transparent 34%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  justify-content: center;
  padding: 96px 16px 70px;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
`;

const BackButton = styled.button`
  margin-bottom: 14px;
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.32);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  min-height: 42px;
  padding: 0 14px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  &:hover {
    border-color: rgba(214, 182, 159, 0.5);
  }
`;

const FlowNotice = styled.div`
  margin-bottom: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 13px 14px;
  background: rgba(214, 182, 159, 0.13);
  border: 1px solid rgba(214, 182, 159, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  font-weight: 850;
  line-height: 1.55;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-transform: capitalize;
  }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 18px;
  align-items: stretch;
  margin-bottom: 18px;
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const HeroCopy = styled.article`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(24px, 4vw, 42px);
  background:
    linear-gradient(145deg, rgba(61, 38, 26, 0.86), rgba(0, 0, 0, 0.66)),
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.16), transparent 36%);
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  max-width: 880px;
  font-size: clamp(2.2rem, 5vw, 5rem);
  line-height: 0.92;
  font-weight: 950;
  letter-spacing: -0.07em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Hook = styled.p`
  margin: 18px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1rem, 1.6vw, 1.35rem);
  line-height: 1.35;
  font-weight: 950;
`;

const HeroText = styled.p`
  max-width: 780px;
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 14.5px;
  line-height: 1.8;
`;

const MetaGrid = styled.div`
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MetaPill = styled.span`
  padding: 8px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.18);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.88;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.04em;
`;

const HeroMedia = styled.article`
  border-radius: ${({ theme }) => theme.radius.xl};
  overflow: hidden;
  background: rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const ThumbWrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 390px;
  background: ${({ theme }) => theme.colors.black};
  overflow: hidden;

  @media (max-width: 960px) {
    aspect-ratio: 16 / 9;
    min-height: auto;
  }
`;

const Thumb = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.12) contrast(1.08);
`;

const ImageShade = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.58)),
    radial-gradient(circle at 25% 0%, rgba(214, 182, 159, 0.14), transparent 38%);
`;

const BadgeRow = styled.div`
  position: absolute;
  inset: 14px 14px auto 14px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  pointer-events: none;
`;

const Badge = styled.span`
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: rgba(0, 0, 0, 0.68);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.22);
`;

const FreeBadge = styled(Badge)`
  background: rgba(214, 182, 159, 0.92);
  color: ${({ theme }) => theme.colors.black};
`;

const BestSellerBadge = styled(Badge)`
  background: rgba(255, 215, 122, 0.92);
  color: ${({ theme }) => theme.colors.black};
`;

const OwnedBadge = styled(Badge)`
  background: rgba(255, 249, 242, 0.94);
  color: ${({ theme }) => theme.colors.black};
`;

const SelectedBadge = styled(Badge)`
  background: rgba(214, 182, 159, 0.92);
  color: ${({ theme }) => theme.colors.black};
`;

const BadgeRightGroup = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
`;

const Layout = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.6fr);
  gap: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const MainCard = styled.article`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(18px, 3vw, 26px);
  background: linear-gradient(
    180deg,
    rgba(47, 27, 18, 0.94),
    rgba(0, 0, 0, 0.68)
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const Section = styled.section`
  &:not(:first-child) {
    margin-top: 28px;
  }
`;

const SectionKicker = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.35rem, 2.2vw, 2.1rem);
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const LuxuryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const LuxuryPoint = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 16px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.14);
`;

const PointNumber = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.12em;
`;

const PointText = styled.p`
  margin: 9px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  font-size: 13px;
  line-height: 1.65;
`;

const SplitSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 28px;

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }

  ${Section} {
    margin-top: 0;
  }
`;

const LearnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 9px;
`;

const Li = styled.li`
  position: relative;
  padding-left: 24px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
  font-size: 13.5px;
  line-height: 1.62;

  &::before {
    content: "✓";
    position: absolute;
    left: 0;
    top: 0;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
  }
`;

const RuleRow = styled.div`
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
`;

const RulePill = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 9px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(214, 182, 159, 0.18);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 900;
`;

const Sidebar = styled.aside`
  min-width: 0;
`;

const EnrollCard = styled.div`
  position: sticky;
  top: 94px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background:
    radial-gradient(circle at 30% 0%, rgba(214, 182, 159, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(47, 27, 18, 0.94), rgba(0, 0, 0, 0.68));
  border: 1px solid rgba(214, 182, 159, 0.16);
  box-shadow: ${({ theme }) => theme.shadow.glow};

  @media (max-width: 960px) {
    position: static;
  }
`;

const EnrollTop = styled.div`
  margin-bottom: 14px;
`;

const SmallLabel = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const EnrollTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 28px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.045em;
`;

const EnrollText = styled.p`
  margin: 10px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.74;
  font-size: 13px;
  line-height: 1.6;
`;

const PriceBox = styled.div`
  margin: 16px 0;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 249, 242, 0.1);
  border-bottom: 1px solid rgba(255, 249, 242, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Price = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 32px;
  font-weight: 950;
  letter-spacing: -0.04em;
  text-transform: capitalize;
`;

const PlanText = styled.div`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.62;
  font-size: 12px;
  font-weight: 850;
`;

const OldPrice = styled.div`
  margin-top: 2px;
  color: rgba(255, 249, 242, 0.55);
  font-size: 13px;
  text-decoration: line-through;
`;

const InstantPill = styled.span`
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.18);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
`;

const CTA = styled.button`
  width: 100%;
  min-height: 48px;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 16px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }
`;

const Ghost = styled.button`
  width: 100%;
  margin-top: 10px;
  min-height: 44px;
  border: 1px solid rgba(255, 249, 242, 0.22);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 16px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  &:hover {
    background: rgba(255, 249, 242, 0.06);
  }
`;

const Notice = styled.div`
  margin-top: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const NoticeTitle = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const NoticeText = styled.p`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 12.5px;
  line-height: 1.55;
`;

const MiniStats = styled.div`
  margin-top: 14px;
  display: grid;
  gap: 9px;
`;

const MiniStat = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 12px;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.09);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 13px;
    font-weight: 950;
  }

  span {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

const Fallback = styled.div`
  margin-top: 18px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};
`;

const OwnedNotice = styled.div`
  margin-top: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(214, 182, 159, 0.12);
  border: 1px solid rgba(214, 182, 159, 0.22);
`;

const OwnedTitle = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const OwnedText = styled.p`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;
  font-size: 12.5px;
  line-height: 1.6;
`;