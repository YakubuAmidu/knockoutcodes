// src/pages/Courses.jsx
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

import {
  fetchCourses,
  createCourseCheckout,
  resetCourseState,
} from "../reducers/courses/courseActions";

import BeginnerImg from "../assets/knockoutcodes-beginner-access-pass.png";
import IntermediateImg from "../assets/knockoutcodes-intermediate-access-pass.png";
import AdvanceImg from "../assets/knockoutcodes-advance-access-pass.png";
import CompleteImg from "../assets/knockoutcodes-complete-access-pass.png";

/* =========================
   Layout
========================= */
const PageWrap = styled.section`
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
  padding: 80px 16px 60px;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 24px;
`;

const Eyebrow = styled.p`
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 10px;
`;

const Title = styled.h1`
  font-size: clamp(2.4rem, 3vw, 3rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.white}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  font-size: 15.5px;
  max-width: 720px;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 18px;
  flex-wrap: wrap;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const StatusPill = styled.span`
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.35);
`;

/* =========================
   Grid + Cards
========================= */
const Grid = styled.div`
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 980px) {
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
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 249, 242, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 420px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
    border-color: rgba(214, 182, 159, 0.75);
  }
`;

const ThumbWrap = styled.div`
  position: relative;
  padding-top: 60%;
  background: ${({ theme }) => theme.colors.black};
  overflow: hidden;
`;

const Thumb = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.1) contrast(1.05);
  transition: transform 0.5s ease;

  ${Card}:hover & {
    transform: scale(1.06);
  }
`;

const BadgeRow = styled.div`
  position: absolute;
  inset: 14px 14px auto 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
`;

const Badge = styled.span`
  padding: 5px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(0, 0, 0, 0.65);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.26);
`;

const FreeBadge = styled(Badge)`
  background: rgba(214, 182, 159, 0.85);
  color: ${({ theme }) => theme.colors.black};
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

const Body = styled.div`
  padding: 16px 16px 14px;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const CourseTitle = styled.h2`
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 10px;
`;

const Dot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.lightBrown};
  margin: 0 4px;
  display: inline-block;
`;

const Description = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const RatingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 10px;
`;

const Stars = styled.span`
  font-size: 14px;
  color: #ffd97a;
`;

const RatingText = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.85;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
`;

const Price = styled.span`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const OldPrice = styled.span`
  font-size: 13px;
  text-decoration: line-through;
  color: rgba(255, 249, 242, 0.6);
`;

const FreeText = styled.span`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Footer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: auto;
`;

const Button = styled.button`
  flex: 1;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 9px 10px;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease,
    color 0.18s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const OutlineButton = styled(Button)`
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.6);
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    background: rgba(255, 249, 242, 0.06);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }
`;

/* =========================
   Empty / Loading / Error
========================= */
const EmptyState = styled.div`
  margin-top: 40px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const LoadingText = styled.p`
  margin-top: 40px;
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const ErrorText = styled.p`
  margin-top: 40px;
  text-align: center;
  font-size: 14px;
  color: #ffb3b3;
`;

/* =========================
   Pagination
========================= */
const Pager = styled.div`
  margin-top: 26px;
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
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(214, 182, 159, 0.75);
    background: rgba(255, 255, 255, 0.08);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

const PagePill = styled.span`
  padding: 9px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
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

function renderStars(ratingAverage) {
  const rating = Number(ratingAverage) || 0;
  const fullStars = Math.max(0, Math.min(5, Math.round(rating)));
  const stars = [];
  for (let i = 1; i <= 5; i += 1) stars.push(i <= fullStars ? "★" : "☆");
  return stars.join("");
}

function safeMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(2);
}

// optional: if backend sometimes returns empty thumbnail, you can map slugs to local images
function pickLocalCourseImage(course) {
  const key = String(course?.slug || course?._id || "").toLowerCase();
  if (key.includes("beginner")) return BeginnerImg;
  if (key.includes("intermediate")) return IntermediateImg;
  if (key.includes("advanced")) return AdvanceImg;
  if (key.includes("complete")) return CompleteImg;
  return null;
}

/* =========================
   Component
========================= */
const PAGE_SIZE = 8;

const Courses = () => {
  const [page, setPage] = useState(1);

  // ✅ NEW: track which course is actively starting checkout
  const [activeCheckoutId, setActiveCheckoutId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();

  const { isAuthenticated, loading: authLoading } = useAuth();

  // ✅ Redux Courses + Loading/Error
  const { courses, loading, error, checkoutLoading, checkoutError, checkoutUrl } =
    useSelector((state) => state.courses);

  // ✅ Fetch courses (redux)
  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  // ✅ keep page safe when list changes
  useEffect(() => {
    setPage(1);
  }, [courses?.length]);

  // ✅ pagination
  const pages = useMemo(() => {
    const len = Array.isArray(courses) ? courses.length : 0;
    return Math.max(1, Math.ceil(len / PAGE_SIZE));
  }, [courses]);

  const pageCourses = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return list.slice(start, end);
  }, [page, courses]);

  // ✅ redirect ONLY when url exists (and looks valid)
  useEffect(() => {
    if (checkoutUrl && typeof checkoutUrl === "string" && /^https?:\/\//i.test(checkoutUrl)) {
      // ✅ NEW: clear active state before redirect
      setActiveCheckoutId(null);

      window.location.assign(checkoutUrl);
      dispatch(resetCourseState());
    }
  }, [checkoutUrl, dispatch]);

  // ✅ show error toast (only when error exists)
  useEffect(() => {
    if (checkoutError) {
      toast?.push?.({
        title: "Checkout failed",
        description: checkoutError,
        variant: "danger",
      });

      // ✅ NEW: clear active state on failure
      setActiveCheckoutId(null);

      dispatch(resetCourseState());
    }
  }, [checkoutError, dispatch, toast]);

  // ✅ if user came back from login with "?enroll=..."
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const params = new URLSearchParams(location.search);
    const enroll = params.get("enroll");
    if (!enroll) return;

    const list = Array.isArray(courses) ? courses : [];

    const found =
      list.find((c) => String(c?._id) === enroll) ||
      list.find((c) => String(c?.slug) === enroll);

    if (found) {
      // ✅ NEW: free course should not go to Stripe
      if (found?.isFree) {
        toast?.push?.({
          title: "Free course",
          description: "This course is free. Opening details…",
          variant: "success",
        });

        navigate(`/courses/${found?._id}`, { state: { course: found }, replace: true });
        return;
      }

      const idForCheckout = found?._id || found?.slug;

      // ✅ NEW: track only this course as active
      setActiveCheckoutId(String(found?._id || idForCheckout));

      dispatch(createCourseCheckout(idForCheckout, "one_time"));
    } else {
      toast?.push?.({
        title: "Course not found",
        description: "That course could not be found. Please try again.",
        variant: "danger",
      });
    }

    navigate("/courses", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, location.search, courses]);

  const goNext = () => setPage((p) => Math.min(pages, p + 1));
  const goPrev = () => setPage((p) => Math.max(1, p - 1));

  // ✅ Handle Enroll
  const handleEnroll = (course) => {
    if (authLoading) return;

    // ✅ NEW: prevents double-click / duplicate Stripe sessions
    if (checkoutLoading) return;

    if (!course) return;

    // ✅ NEW: free course = no Stripe
    if (course?.isFree) {
      toast?.push?.({
        title: "Free course",
        description: "This course is free. Opening details…",
        variant: "success",
      });

      navigate(`/courses/${course?._id}`, { state: { course } });
      return;
    }

    if (!isAuthenticated) {
      const idForReturn = course?.slug || course?._id;
      navigate("/login", {
        state: { from: `/courses?enroll=${encodeURIComponent(idForReturn)}` },
        replace: false,
      });
      return;
    }

    const courseId = course?._id || course?.slug;

    // ✅ NEW: per-course loading
    setActiveCheckoutId(String(course?._id || courseId));

    dispatch(createCourseCheckout(courseId, "one_time"));
  };

  return (
    <PageWrap>
      <Inner>
        <Header>
          <Eyebrow>5-Star Curriculum</Eyebrow>
          <Title>Train Like A Champion. Learn Like A Pro.</Title>
          <Subtitle>
            Premium, battle-tested courses with structure and clarity. Pick a course,
            preview the details, and enroll when you’re ready.
          </Subtitle>

          <StatusBar>
            <StatusPill>Top-rated 5★ courses</StatusPill>
            <StatusPill>Coaching team • Clear systems</StatusPill>
            <StatusPill>{PAGE_SIZE} per page • Fast navigation</StatusPill>
          </StatusBar>
        </Header>

        {loading && <LoadingText>Loading premium courses…</LoadingText>}
        {!loading && error && <ErrorText>{error}</ErrorText>}

        {!loading && !error && (!courses || courses.length === 0) && (
          <EmptyState>No courses are live yet. Check back soon.</EmptyState>
        )}

        {!loading && !error && courses && courses.length > 0 && (
          <>
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

                const coachLabel = "KnockoutCodes Coaching Team";

                const isBestSeller =
                  Boolean(isFeatured) || (numericRating >= 4.7 && numericRatingCount >= 20);

                const enrolledCount = typeof studentsCount === "number" ? studentsCount : 0;

                const hasSale =
                  salePrice != null &&
                  Number.isFinite(Number(salePrice)) &&
                  Number.isFinite(Number(price)) &&
                  Number(salePrice) < Number(price);

                // ✅ NEW: only disable the clicked course’s enroll button
                const isThisCourseCheckingOut =
                  Boolean(checkoutLoading) && String(activeCheckoutId) === String(_id);

                return (
                  <Card key={_id}>
                    <ThumbWrap>
                      <Thumb
                        src={
                          thumbnail ||
                          pickLocalCourseImage(course) ||
                          "https://via.placeholder.com/1200x800?text=KnockoutCodes+Course"
                        }
                        alt={title || "Course thumbnail"}
                        loading="lazy"
                      />

                      <BadgeRow>
                        <Badge>{category || "Course"}</Badge>
                        <BadgeRightGroup>
                          {isBestSeller ? <BestSellerBadge>Best Seller</BestSellerBadge> : null}
                          {isFree ? <FreeBadge>Free</FreeBadge> : null}
                        </BadgeRightGroup>
                      </BadgeRow>
                    </ThumbWrap>

                    <Body>
                      <CourseTitle>{title || "Untitled Course"}</CourseTitle>

                      <MetaRow>
                        <span>Coach: {coachLabel}</span>

                        {level ? (
                          <span>
                            <Dot /> Level: {level}
                          </span>
                        ) : null}

                        {durationLabel ? (
                          <span>
                            <Dot /> {durationLabel}
                          </span>
                        ) : null}

                        <span>
                          <Dot /> {enrolledCount} enrolled
                        </span>
                      </MetaRow>

                      <Description>
                        {description ||
                          "A premium course built with structure, clarity, and real-world execution."}
                      </Description>

                      <RatingRow>
                        <Stars>{renderStars(ratingAverage)}</Stars>
                        <RatingText>
                          {numericRating > 0 ? `${numericRating.toFixed(1)}/5` : "—"}
                          {numericRatingCount > 0 ? ` • ${numericRatingCount} ratings` : ""}
                        </RatingText>
                      </RatingRow>

                      <PriceRow>
                        {isFree ? (
                          <FreeText>Free to start</FreeText>
                        ) : (
                          <>
                            {hasSale ? (
                              <>
                                <Price>${safeMoney(salePrice)}</Price>
                                <OldPrice>${safeMoney(price)}</OldPrice>
                              </>
                            ) : (
                              <Price>${safeMoney(price) || "0.00"}</Price>
                            )}
                          </>
                        )}
                      </PriceRow>

                      <Footer>
                        <OutlineButton
                          type="button"
                          onClick={() => navigate(`/courses/${_id}`, { state: { course } })}
                        >
                          Course Details
                        </OutlineButton>

                        <PrimaryButton
                          type="button"
                          onClick={() => handleEnroll(course)}
                          disabled={isThisCourseCheckingOut}
                        >
                          {isThisCourseCheckingOut ? "Redirecting..." : isFree ? "Start Free" : "Enroll"}
                        </PrimaryButton>
                      </Footer>
                    </Body>
                  </Card>
                );
              })}
            </Grid>

            <Pager>
              <PagerBtn type="button" onClick={goPrev} disabled={loading || page <= 1}>
                Prev
              </PagerBtn>

              <PagePill>
                Page {page} / {pages}
              </PagePill>

              <PagerBtn type="button" onClick={goNext} disabled={loading || page >= pages}>
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
