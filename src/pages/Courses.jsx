// src/pages/Courses.jsx
import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

import axiosInstance from "../../utils/axiosInstance";

import {
  fetchCourses,
  resetCourseState,
} from "../reducers/courses/courseActions";

import BeginnerImg from "../assets/knockoutcodes-beginner-access-pass.png";
import IntermediateImg from "../assets/knockoutcodes-intermediate-access-pass.png";
import AdvanceImg from "../assets/knockoutcodes-advance-access-pass.png";
import CompleteImg from "../assets/knockoutcodes-complete-access-pass.png";

const PAGE_SIZE = 8;

const VALID_MEMBERSHIPS = ["beginner", "intermediate", "advance", "complete"];

const VALID_BILLING_PERIODS = ["monthly", "yearly"];

function formatMinutesToHours(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return null;

  const hrs = Math.floor(m / 60);
  const mins = Math.round(m % 60);

  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
}

function renderStars(ratingAverage) {
  const rating = Number(ratingAverage) || 0;
  const fullStars = Math.max(0, Math.min(5, Math.round(rating)));

  return Array.from({ length: 5 }, (_, index) =>
    index + 1 <= fullStars ? "★" : "☆",
  ).join("");
}

function safeMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(2);
}

function normalizeLevel(value) {
  const level = String(value || "")
    .trim()
    .toLowerCase();
  if (level === "advanced") return "advance";
  return level;
}

function pickLocalCourseImage(course) {
  const key = String(
    course?.slug || course?.title || course?._id || "",
  ).toLowerCase();

  if (key.includes("beginner")) return BeginnerImg;
  if (key.includes("intermediate")) return IntermediateImg;
  if (key.includes("advanced")) return AdvanceImg;
  if (key.includes("advance")) return AdvanceImg;
  if (key.includes("complete")) return CompleteImg;

  return null;
}

function getCourseHook(course) {
  const level = String(course?.level || course?.title || "").toLowerCase();

  if (level.includes("beginner")) {
    return "Start clean. Build sharp. Stop training random.";
  }

  if (level.includes("intermediate")) {
    return "You know the basics — now become dangerous.";
  }

  if (level.includes("advanced") || level.includes("advance")) {
    return "Discipline turns into dominance here.";
  }

  if (level.includes("complete")) {
    return "The full system. One path. Champion energy.";
  }

  return "Don’t just train — build a system that changes how you move.";
}

function getCoursePromise(course) {
  const category = course?.category || "Boxing";
  const level = course?.level || "All Levels";

  return `${category} training for ${level} students who want structure, confidence, clean execution, and real progress.`;
}

function getRequiredMembershipLevel(course) {
  const level = course?.requiredMembershipLevel || course?.level || "beginner";
  const normalized = normalizeLevel(level);

  if (!normalized || normalized === "all-levels") return "beginner";
  return normalized;
}

const Courses = () => {
  const [page, setPage] = useState(1);
  const [activeCheckoutId, setActiveCheckoutId] = useState(null);
  const [accessCourseIds, setAccessCourseIds] = useState(() => new Set());

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();

  const { isAuthenticated, loading: authLoading } = useAuth();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const membershipIdFromUrl = String(searchParams.get("membershipId") || "")
    .trim()
    .toLowerCase();

  const billingPeriodFromUrl = String(searchParams.get("billingPeriod") || "")
    .trim()
    .toLowerCase();

  const selectedMembershipId = VALID_MEMBERSHIPS.includes(membershipIdFromUrl)
    ? membershipIdFromUrl
    : "";

  const selectedBillingPeriod = VALID_BILLING_PERIODS.includes(
    billingPeriodFromUrl,
  )
    ? billingPeriodFromUrl
    : "";

  const membershipQueryString = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedMembershipId) {
      params.set("membershipId", selectedMembershipId);
    }

    if (selectedBillingPeriod) {
      params.set("billingPeriod", selectedBillingPeriod);
    }

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [selectedMembershipId, selectedBillingPeriod]);

  const membershipState = useMemo(
    () => ({
      membershipId: selectedMembershipId,
      billingPeriod: selectedBillingPeriod,
      fromMembershipFlow: Boolean(selectedMembershipId),
    }),
    [selectedMembershipId, selectedBillingPeriod],
  );

  const {
    courses,
    loading,
    error,
    checkoutLoading,
    checkoutError,
    checkoutUrl,
    alreadyPurchased,
    purchasedCourseId,
    purchaseMessage,
  } = useSelector((state) => state.courses);

  useEffect(() => {
    dispatch(fetchCourses());

    return () => {
      dispatch(resetCourseState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setAccessCourseIds(() => new Set());
      return;
    }

    let mounted = true;

    async function loadMyAccess() {
      try {
        const { data } = await axiosInstance.get("/enrollments/my");

        const enrollments = data?.enrollments || data?.data || [];

        const enrollmentIds = new Set(
          enrollments
            .map((enrollment) => enrollment?.course?._id || enrollment?.course)
            .filter(Boolean)
            .map(String),
        );

        if (!mounted) return;

        setAccessCourseIds(enrollmentIds);
      } catch {
        if (mounted) setAccessCourseIds(new Set());
      }
    }

    loadMyAccess();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    setPage(1);
  }, [courses?.length]);

  const totalCourses = Array.isArray(courses) ? courses.length : 0;

  const pages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCourses / PAGE_SIZE));
  }, [totalCourses]);

  const pageCourses = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [page, courses]);

  const featuredCount = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    return list.filter((course) => course?.isFeatured).length;
  }, [courses]);

  const freeCount = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    return list.filter((course) => course?.isFree).length;
  }, [courses]);

  useEffect(() => {
    if (
      checkoutUrl &&
      typeof checkoutUrl === "string" &&
      /^https?:\/\//i.test(checkoutUrl)
    ) {
      setActiveCheckoutId(null);
      window.location.assign(checkoutUrl);
      dispatch(resetCourseState());
    }
  }, [checkoutUrl, dispatch]);

  useEffect(() => {
    if (checkoutError) {
      toast?.push?.({
        title: "Checkout failed",
        description: checkoutError,
        variant: "danger",
      });

      setActiveCheckoutId(null);
      dispatch(resetCourseState());
    }
  }, [checkoutError, dispatch, toast]);

  useEffect(() => {
    if (!alreadyPurchased) return;

    const targetCourseId = purchasedCourseId || activeCheckoutId;

    toast?.push?.({
      title: "Already Purchased",
      description:
        purchaseMessage ||
        "You already own this course. Opening your training room.",
      variant: "success",
    });

    setActiveCheckoutId(null);

    if (targetCourseId) {
      setAccessCourseIds((prev) => {
        const next = new Set(prev);
        next.add(String(targetCourseId));
        return next;
      });

      const timer = setTimeout(() => {
        navigate(`/course-player/${encodeURIComponent(targetCourseId)}`);
        dispatch(resetCourseState());
      }, 500);

      return () => clearTimeout(timer);
    }

    dispatch(resetCourseState());
    return undefined;
  }, [
    alreadyPurchased,
    purchasedCourseId,
    purchaseMessage,
    activeCheckoutId,
    navigate,
    toast,
    dispatch,
  ]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const params = new URLSearchParams(location.search);
    const enroll = params.get("enroll");

    if (!enroll) return;

    const list = Array.isArray(courses) ? courses : [];

    const found =
      list.find((c) => String(c?._id) === enroll) ||
      list.find((c) => String(c?.slug) === enroll);

    if (!found) {
      toast?.push?.({
        title: "Course not found",
        description: "That course could not be found. Please try again.",
        variant: "danger",
      });

      navigate("/courses", { replace: true });
      return;
    }

    if (accessCourseIds.has(String(found?._id))) {
      toast?.push?.({
        title: "Access Unlocked",
        description: "Opening your course access.",
        variant: "success",
      });

      navigate(`/course-player/${encodeURIComponent(found._id)}`, {
        replace: true,
      });
      return;
    }

    if (found?.isFree) {
      toast?.push?.({
        title: "Free course",
        description: "Opening your course details.",
        variant: "success",
      });

      navigate(`/courses/${found?._id}${membershipQueryString}`, {
        state: {
          course: found,
          ...membershipState,
        },
        replace: true,
      });
      return;
    }

    const requiredMembershipLevel = getRequiredMembershipLevel(found);

    navigate(`/courses/${found?._id}${membershipQueryString}`, {
      replace: true,
      state: {
        course: found,
        showPurchaseOptions: true,
        requiredMembershipId: requiredMembershipLevel,
        ...membershipState,
      },
    });
  }, [
    isAuthenticated,
    authLoading,
    location.search,
    courses,
    accessCourseIds,
    navigate,
    toast,
    membershipQueryString,
    membershipState,
  ]);

  const goNext = () => setPage((p) => Math.min(pages, p + 1));
  const goPrev = () => setPage((p) => Math.max(1, p - 1));

  const goToCourseDetails = (course, extraState = {}) => {
    const courseId = course?._id;

    if (!courseId) {
      toast?.push?.({
        title: "Course Error",
        description: "Course ID is missing. Please refresh and try again.",
        variant: "danger",
      });
      return;
    }

    navigate(
      `/courses/${encodeURIComponent(courseId)}${membershipQueryString}`,
      {
        state: {
          course,
          ...membershipState,
          ...extraState,
        },
      },
    );
  };

  const handleEnroll = (course) => {
    if (authLoading || checkoutLoading || !course) return;

    const ownsCourse = accessCourseIds.has(String(course?._id));

    if (ownsCourse) {
      toast?.push?.({
        title: "Access Unlocked",
        description: "Opening your course access.",
        variant: "success",
      });

      const courseId = course?._id;

      if (!courseId) {
        toast?.push?.({
          title: "Course Error",
          description: "Course ID is missing. Please refresh and try again.",
          variant: "danger",
        });
        return;
      }

      navigate(`/course-player/${encodeURIComponent(courseId)}`);
      return;
    }

    if (course?.isFree) {
      toast?.push?.({
        title: "Free course",
        description: "Opening your course details.",
        variant: "success",
      });

      goToCourseDetails(course);
      return;
    }

    if (!isAuthenticated) {
      const idForReturn = course?.slug || course?._id;

      const returnPath = selectedMembershipId
        ? `/courses?enroll=${encodeURIComponent(idForReturn)}&membershipId=${encodeURIComponent(
            selectedMembershipId,
          )}&billingPeriod=${encodeURIComponent(selectedBillingPeriod)}`
        : `/courses?enroll=${encodeURIComponent(idForReturn)}`;

      navigate("/login", {
        state: {
          from: returnPath,
        },
        replace: false,
      });

      return;
    }

    const requiredMembershipLevel = getRequiredMembershipLevel(course);

    if (selectedMembershipId) {
      goToCourseDetails(course, {
        showPurchaseOptions: true,
        requiredMembershipId: requiredMembershipLevel,
      });
      return;
    }

    if (course?.allowSinglePurchase === false) {
      navigate("/memberships", {
        state: {
          courseId: course?._id,
          requiredMembershipId: requiredMembershipLevel,
          from: `/courses/${course?._id}`,
        },
      });
      return;
    }

    goToCourseDetails(course, {
      showPurchaseOptions: true,
      requiredMembershipId: requiredMembershipLevel,
    });
  };

  return (
    <PageWrap>
      <Inner>
        <Hero>
          <HeroContent>
            <Eyebrow>KnockoutCodes Premium Academy</Eyebrow>
            <Title>
              Stop Training Random. Build Fighter-Level Skill With A Real
              System.
            </Title>
            <Subtitle>
              Every course is built to sharpen your stance, hands, footwork,
              defense, discipline, and confidence — one clean lesson at a time.
            </Subtitle>

            {selectedMembershipId ? (
              <FlowNotice>
                Membership selected. Now choose the course you want to unlock
                with your {selectedBillingPeriod || "membership"} plan.
              </FlowNotice>
            ) : null}

            <HeroActions>
              <HeroButton type="button" onClick={() => navigate("/courses")}>
                Explore Courses
              </HeroButton>

              <HeroGhost type="button" onClick={() => navigate("/memberships")}>
                View Membership
              </HeroGhost>
            </HeroActions>
          </HeroContent>

          <HeroPanel>
            <PanelLabel>Inside The System</PanelLabel>
            <PanelTitle>Built for serious progress</PanelTitle>

            <PanelList>
              <li>Structured training path</li>
              <li>Beginner to advance levels</li>
              <li>Premium boxing breakdowns</li>
              <li>Protected course access</li>
            </PanelList>
          </HeroPanel>
        </Hero>

        <StatusBar>
          <StatusPill>
            <strong>{totalCourses}</strong>
            <span>Live Courses</span>
          </StatusPill>

          <StatusPill>
            <strong>{featuredCount}</strong>
            <span>Featured</span>
          </StatusPill>

          <StatusPill>
            <strong>{freeCount}</strong>
            <span>Free Starters</span>
          </StatusPill>

          <StatusPill>
            <strong>{selectedMembershipId ? "ON" : "5★"}</strong>
            <span>
              {selectedMembershipId
                ? "Membership Flow"
                : "Premium Training Feel"}
            </span>
          </StatusPill>
        </StatusBar>

        {loading && <LoadingText>Loading premium courses...</LoadingText>}
        {!loading && error && <ErrorText>{error}</ErrorText>}

        {!loading && !error && (!courses || courses.length === 0) && (
          <EmptyState>No courses are live yet. Check back soon.</EmptyState>
        )}

        {!loading && !error && courses && courses.length > 0 && (
          <>
            <SectionHeader>
              <div>
                <SectionEyebrow>Choose Your Level</SectionEyebrow>
                <SectionTitle>
                  Pick the course that matches your next transformation.
                </SectionTitle>
              </div>
              <SectionNote>
                Preview the details first. Enroll only when the course fits your
                goal.
              </SectionNote>
            </SectionHeader>

            <Grid>
              {pageCourses.map((course) => {
                const {
                  _id,
                  title,
                  description,
                  category,
                  level,
                  thumbnail,
                  isFree,
                  price,
                  salePrice,
                  ratingAverage,
                  ratingCount,
                  studentsCount,
                  durationInMinutes,
                  isFeatured,
                } = course;

                const durationLabel = formatMinutesToHours(durationInMinutes);
                const numericRating = Number(ratingAverage) || 0;
                const numericRatingCount = Number(ratingCount) || 0;
                const enrolledCount =
                  typeof studentsCount === "number" ? studentsCount : 0;

                const isBestSeller =
                  Boolean(isFeatured) ||
                  (numericRating >= 4.7 && numericRatingCount >= 20);

                const hasSale =
                  salePrice != null &&
                  Number.isFinite(Number(salePrice)) &&
                  Number.isFinite(Number(price)) &&
                  Number(salePrice) < Number(price);

                const isThisCourseCheckingOut =
                  Boolean(checkoutLoading) &&
                  String(activeCheckoutId) === String(_id);

                const ownsCourse =
                  Boolean(_id) && accessCourseIds.has(String(_id));
                const membershipLevel = getRequiredMembershipLevel(course);

                return (
                  <Card key={_id}>
                    <ThumbWrap>
                      <Thumb
                        src={
                          thumbnail ||
                          pickLocalCourseImage(course) ||
                          "/images/default-course.jpg"
                        }
                        alt={title || "Course thumbnail"}
                        loading="lazy"
                      />

                      <ImageShade />

                      <BadgeRow>
                        <Badge>{category || "Course"}</Badge>

                        <BadgeRightGroup>
                          {ownsCourse ? (
                            <OwnedBadge>Unlocked</OwnedBadge>
                          ) : null}
                          {selectedMembershipId && !ownsCourse ? (
                            <SelectedBadge>Selected Plan</SelectedBadge>
                          ) : null}
                          {isBestSeller ? (
                            <BestSellerBadge>Best Seller</BestSellerBadge>
                          ) : null}
                          {isFree ? <FreeBadge>Free</FreeBadge> : null}
                        </BadgeRightGroup>
                      </BadgeRow>

                      <HookStrip>{getCourseHook(course)}</HookStrip>
                    </ThumbWrap>

                    <Body>
                      <CourseTitle>{title || "Untitled Course"}</CourseTitle>

                      <PromiseText>{getCoursePromise(course)}</PromiseText>

                      <MetaRow>
                        {level ? (
                          <MetaPill>Level: {normalizeLevel(level)}</MetaPill>
                        ) : null}
                        {durationLabel ? (
                          <MetaPill>{durationLabel}</MetaPill>
                        ) : null}
                        <MetaPill>{enrolledCount} enrolled</MetaPill>
                        {ownsCourse ? (
                          <MetaPill>Access Unlocked</MetaPill>
                        ) : null}
                        {!isFree ? (
                          <MetaPill>Membership: {membershipLevel}</MetaPill>
                        ) : null}
                      </MetaRow>

                      <Description>
                        {description ||
                          "A premium course built with structure, clarity, and real-world execution."}
                      </Description>

                      <FeatureList>
                        <li>Clean step-by-step training</li>
                        <li>Built for discipline and progress</li>
                        <li>Unlocks inside Course Player</li>
                      </FeatureList>

                      <RatingRow>
                        <Stars>{renderStars(ratingAverage)}</Stars>
                        <RatingText>
                          {numericRating > 0
                            ? `${numericRating.toFixed(1)}/5`
                            : "New"}
                          {numericRatingCount > 0
                            ? ` • ${numericRatingCount} ratings`
                            : ""}
                        </RatingText>
                      </RatingRow>

                      <PriceRow>
                        {ownsCourse ? (
                          <OwnedText>Unlocked</OwnedText>
                        ) : isFree ? (
                          <FreeText>Free to start</FreeText>
                        ) : hasSale ? (
                          <>
                            <Price>${safeMoney(salePrice)}</Price>
                            <OldPrice>${safeMoney(price)}</OldPrice>
                          </>
                        ) : (
                          <Price>${safeMoney(price) || "0.00"}</Price>
                        )}
                      </PriceRow>

                      <Footer>
                        <OutlineButton
                          type="button"
                          onClick={() => goToCourseDetails(course)}
                        >
                          Details
                        </OutlineButton>

                        <PrimaryButton
                          type="button"
                          onClick={() => handleEnroll(course)}
                          disabled={isThisCourseCheckingOut}
                        >
                          {isThisCourseCheckingOut
                            ? "Redirecting..."
                            : ownsCourse
                              ? "Watch Now"
                              : selectedMembershipId
                                ? "Choose Course"
                                : isFree
                                  ? "Start Free"
                                  : "Enroll Now"}
                        </PrimaryButton>
                      </Footer>
                    </Body>
                  </Card>
                );
              })}
            </Grid>

            <Pager>
              <PagerBtn
                type="button"
                onClick={goPrev}
                disabled={loading || page <= 1}
              >
                Prev
              </PagerBtn>

              <PagePill>
                Page {page} / {pages}
              </PagePill>

              <PagerBtn
                type="button"
                onClick={goNext}
                disabled={loading || page >= pages}
              >
                Next
              </PagerBtn>
            </Pager>
          </>
        )}
      </Inner>
    </PageWrap>
  );
};

export default Courses;

/* =========================
   Styles
========================= */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

const PageWrap = styled.section`
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 12% 8%,
      rgba(214, 182, 159, 0.2),
      transparent 34%
    ),
    radial-gradient(circle at 88% 14%, rgba(90, 56, 37, 0.42), transparent 34%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown}
    );
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  justify-content: center;
  padding: 96px 16px 64px;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
`;

const Hero = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.7fr);
  gap: 18px;
  align-items: stretch;
  margin-bottom: 18px;
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const HeroContent = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(24px, 4vw, 42px);
  background:
    linear-gradient(145deg, rgba(61, 38, 26, 0.82), rgba(0, 0, 0, 0.62)),
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.16),
      transparent 36%
    );
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Title = styled.h1`
  max-width: 900px;
  margin: 0;
  font-size: clamp(2.35rem, 5.4vw, 5.3rem);
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

const Subtitle = styled.p`
  max-width: 760px;
  margin: 18px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  font-size: 15px;
  line-height: 1.75;
`;

const FlowNotice = styled.div`
  margin-top: 18px;
  max-width: 760px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 13px 14px;
  background: rgba(214, 182, 159, 0.13);
  border: 1px solid rgba(214, 182, 159, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  font-weight: 850;
  line-height: 1.55;
`;

const HeroActions = styled.div`
  margin-top: 22px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const HeroButton = styled.button`
  min-height: 46px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 18px;
  cursor: pointer;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:hover {
    transform: translateY(-1px);
  }
`;

const HeroGhost = styled(HeroButton)`
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.22);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const HeroPanel = styled.aside`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 22px;
  background:
    radial-gradient(
      circle at 30% 0%,
      rgba(214, 182, 159, 0.14),
      transparent 34%
    ),
    rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(214, 182, 159, 0.16);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const PanelLabel = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 26px;
  line-height: 1.05;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const PanelList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 18px 0 0;
  display: grid;
  gap: 10px;

  li {
    border-radius: ${({ theme }) => theme.radius.lg};
    padding: 12px;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid rgba(255, 249, 242, 0.1);
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 13px;
    font-weight: 850;
  }
`;

const StatusBar = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 22px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatusPill = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 16px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.16);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 26px;
    font-weight: 950;
  }

  span {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.75;
    font-size: 12px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

const SectionHeader = styled.div`
  margin: 26px 0 16px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-end;

  @media (max-width: 760px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const SectionEyebrow = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  max-width: 720px;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.55rem, 3vw, 2.5rem);
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.045em;
`;

const SectionNote = styled.p`
  max-width: 320px;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.68;
  font-size: 13px;
  line-height: 1.6;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 920px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article`
  background: linear-gradient(
    150deg,
    ${({ theme }) => theme.colors.cocoa},
    ${({ theme }) => theme.colors.darkBrown}
  );
  border-radius: ${({ theme }) => theme.radius.xl};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 249, 242, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 560px;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
    border-color: rgba(214, 182, 159, 0.58);
  }
`;

const ThumbWrap = styled.div`
  position: relative;
  padding-top: 67%;
  background: ${({ theme }) => theme.colors.black};
  overflow: hidden;
`;

const Thumb = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.12) contrast(1.08);
  transition: transform 0.5s ease;

  ${Card}:hover & {
    transform: scale(1.07);
  }
`;

const ImageShade = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.62)),
    radial-gradient(
      circle at 30% 0%,
      rgba(214, 182, 159, 0.12),
      transparent 38%
    );
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
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const HookStrip = styled.div`
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.68);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  line-height: 1.35;
  font-weight: 950;
`;

const Body = styled.div`
  padding: 17px;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const CourseTitle = styled.h2`
  margin: 0 0 9px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 18px;
  line-height: 1.12;
  font-weight: 950;
  letter-spacing: -0.035em;
`;

const PromiseText = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12.5px;
  line-height: 1.55;
  font-weight: 850;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;
`;

const MetaPill = styled.span`
  padding: 6px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(214, 182, 159, 0.17);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
  font-size: 11px;
  font-weight: 850;
`;

const Description = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 13px;
  line-height: 1.58;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const FeatureList = styled.ul`
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;

  li {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.82;
    font-size: 12px;
    line-height: 1.4;
  }

  li::before {
    content: "✓";
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
    margin-right: 7px;
  }
`;

const RatingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  margin-top: auto;
  margin-bottom: 10px;
`;

const Stars = styled.span`
  font-size: 14px;
  color: #ffd97a;
`;

const RatingText = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
`;

const Price = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 21px;
  font-weight: 950;
`;

const OldPrice = styled.span`
  color: rgba(255, 249, 242, 0.55);
  font-size: 13px;
  text-decoration: line-through;
`;

const FreeText = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 16px;
  font-weight: 950;
`;

const OwnedText = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 16px;
  font-weight: 950;
`;

const Footer = styled.div`
  display: flex;
  gap: 9px;
`;

const Button = styled.button`
  flex: 1;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  min-height: 42px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }
`;

const OutlineButton = styled(Button)`
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.2);

  &:hover {
    background: rgba(255, 249, 242, 0.06);
    transform: translateY(-1px);
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
  }
`;

const EmptyState = styled.div`
  margin-top: 40px;
  text-align: center;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
`;

const LoadingText = styled.p`
  margin-top: 40px;
  text-align: center;
  color: ${({ theme }) => theme.colors.ivory};
`;

const ErrorText = styled.p`
  margin-top: 40px;
  text-align: center;
  color: #ffb3b3;
`;

const Pager = styled.div`
  margin-top: 28px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const PagerBtn = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 9px 14px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const PagePill = styled.span`
  padding: 9px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;
