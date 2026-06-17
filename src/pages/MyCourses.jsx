// src/pages/MyCourses.jsx
import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchMyCourses,
  resetMyCourses,
} from "../reducers/myCourses/myCoursesActions";

import { useToast } from "../components/Toast";

const MyCourses = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const { loading, enrollments, error } = useSelector(
    (state) => state.myCourses,
  );

  useEffect(() => {
    dispatch(fetchMyCourses());

    return () => {
      dispatch(resetMyCourses());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!error) return;

    toast?.push?.({
      title: "My Courses",
      description: error,
      variant: "error",
    });
  }, [error, toast]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safeEnrollments = Array.isArray(enrollments) ? enrollments : [];

  const formatDate = (value) => {
    if (!value) return "Not available";

    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(value);
    }
  };

  const formatMoney = (amount, currency = "USD") => {
    const n = Number(amount);

    if (!Number.isFinite(n)) return "Not available";

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  };

  function renderStars(ratingAverage) {
    const rating = Number(ratingAverage) || 0;
    const fullStars = Math.max(0, Math.min(5, Math.round(rating)));

    return Array.from({ length: 5 }, (_, index) =>
      index + 1 <= fullStars ? "★" : "☆",
    ).join("");
  }

  const normalizeText = (value) =>
    String(value || "")
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .trim();

  const getCourseImage = (course) =>
    course?.thumbnail ||
    course?.image ||
    course?.coverImage ||
    course?.photo ||
    "";

  const getCourseId = (enrollment) => {
    const course = enrollment?.course;
    if (!course) return "";
    return typeof course === "string" ? course : course?._id;
  };

  const getProgress = (enrollment) => {
    const value = Number(enrollment?.progressPercent);

    if (!Number.isFinite(value)) return 0;

    return Math.min(Math.max(value, 0), 100);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "expired":
        return "Expired";
      case "pending":
        return "Pending";
      default:
        return "Active";
    }
  };

  const getButtonLabel = (progress) => {
    if (progress >= 100) return "Review Course";
    if (progress > 0) return "Continue Learning";
    return "Start Course";
  };

  const stats = useMemo(() => {
    const total = safeEnrollments.length;

    const active = safeEnrollments.filter(
      (item) => item.status === "active",
    ).length;

    const completed = safeEnrollments.filter(
      (item) => item.status === "completed",
    ).length;

    const totalPaid = safeEnrollments.reduce((sum, item) => {
      const value = Number(item.pricePaid || 0);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    const avgProgress = total
      ? Math.round(
          safeEnrollments.reduce((sum, item) => {
            return sum + getProgress(item);
          }, 0) / total,
        )
      : 0;

    return { total, active, completed, avgProgress, totalPaid };
  }, [safeEnrollments]);

  const filteredEnrollments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase().slice(0, 120);

    const list = safeEnrollments.filter((item) => {
      const course =
        item?.course && typeof item.course === "object" ? item.course : {};
      const title = String(course.title || "").toLowerCase();
      const level = String(course.level || "").toLowerCase();
      const instructor = String(course.instructor || "").toLowerCase();
      const category = String(course.category || "").toLowerCase();
      const paymentPlan = String(item.paymentPlan || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;

      const matchesSearch =
        !term ||
        title.includes(term) ||
        level.includes(term) ||
        instructor.includes(term) ||
        category.includes(term) ||
        paymentPlan.includes(term);

      return matchesStatus && matchesSearch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "progress") return getProgress(b) - getProgress(a);

      if (sortBy === "title") {
        return String(a.course?.title || "").localeCompare(
          String(b.course?.title || ""),
        );
      }

      if (sortBy === "paid") {
        return Number(b.pricePaid || 0) - Number(a.pricePaid || 0);
      }

      return (
        new Date(b?.startedAt || b?.createdAt || 0).getTime() -
        new Date(a?.startedAt || a?.createdAt || 0).getTime()
      );
    });
  }, [safeEnrollments, searchTerm, statusFilter, sortBy]);

  const handleContinue = (enrollment) => {
    const courseId = getCourseId(enrollment);

    if (!courseId) {
      toast?.push?.({
        title: "Course not found",
        description: "This enrollment has no linked course document.",
        variant: "error",
      });
      return;
    }

    navigate(`/course-player/${encodeURIComponent(courseId)}`, {
      state: {
        courseId,
        enrollmentId: enrollment._id,
      },
    });
  };

  const handleViewDetails = (enrollment) => {
    const courseId = getCourseId(enrollment);

    if (!courseId) {
      toast?.push?.({
        title: "Course not found",
        description: "This enrollment has no linked course document.",
        variant: "error",
      });
      return;
    }

    navigate(`/my-courses/${encodeURIComponent(courseId)}`, {
      state: {
        courseId,
        enrollmentId: enrollment._id,
        enrollment,
      },
    });
  };

  return (
    <PageWrap>
      <Inner>
        <Hero>
          <HeroContent>
            <Eyebrow>KnockoutCodes Student Room</Eyebrow>
            <Title>Your Purchased Courses, Progress, And Access</Title>
            <Subtitle>
              Everything you bought is organized here: payment status, access
              status, enrollment date, progress, last activity, instructor,
              course level, and the next action to take.
            </Subtitle>
          </HeroContent>

          <HeroPanel>
            <PanelLabel>Student Access</PanelLabel>
            <PanelTitle>No confusion. Just your unlocked training.</PanelTitle>
            <PanelList>
              <li>See every purchased course</li>
              <li>Track progress and completion</li>
              <li>Review payment and access details</li>
              <li>Continue directly into Course Player</li>
            </PanelList>
          </HeroPanel>
        </Hero>

        <StatusBar>
          <StatusPill>
            <strong>{stats.total}</strong>
            <span>Total Courses</span>
          </StatusPill>

          <StatusPill>
            <strong>{stats.active}</strong>
            <span>Active Access</span>
          </StatusPill>

          <StatusPill>
            <strong>{stats.completed}</strong>
            <span>Completed</span>
          </StatusPill>

          <StatusPill>
            <strong>{stats.avgProgress}%</strong>
            <span>Average Progress</span>
          </StatusPill>
        </StatusBar>

        <Toolbar>
          <SearchBox>
            <SearchLabel htmlFor="courseSearch">
              Search Purchased Courses
            </SearchLabel>
            <SearchInput
              id="courseSearch"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title, level, instructor, category, or plan..."
            />
          </SearchBox>

          <ControlGroup>
            <Field>
              <Label htmlFor="statusFilter">Access Status</Label>
              <Select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All Courses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </Select>
            </Field>

            <Field>
              <Label htmlFor="sortBy">Sort By</Label>
              <Select
                id="sortBy"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="recent">Recently Purchased</option>
                <option value="progress">Most Progress</option>
                <option value="paid">Highest Paid</option>
                <option value="title">Title A-Z</option>
              </Select>
            </Field>
          </ControlGroup>
        </Toolbar>

        {loading ? (
          <StateCard>
            <Spinner />
            <StateTitle>Loading your purchased courses...</StateTitle>
            <StateText>
              We are preparing your full learning dashboard.
            </StateText>
          </StateCard>
        ) : filteredEnrollments.length === 0 ? (
          <StateCard>
            <EmptyIcon>🥊</EmptyIcon>
            <StateTitle>No courses found</StateTitle>
            <StateText>
              {safeEnrollments.length
                ? "No purchased course matches your current search or filter."
                : "You have not purchased or unlocked any courses yet."}
            </StateText>

            <EmptyActions>
              <PrimaryButton type="button" onClick={() => navigate("/courses")}>
                Explore Courses
              </PrimaryButton>

              {safeEnrollments.length ? (
                <OutlineButton
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchTerm("");
                    setSortBy("recent");
                  }}
                >
                  Clear Filters
                </OutlineButton>
              ) : null}
            </EmptyActions>
          </StateCard>
        ) : (
          <>
            <SectionHeader>
              <div>
                <SectionEyebrow>Purchased Library</SectionEyebrow>
                <SectionTitle>
                  Every course you own, with the full access story.
                </SectionTitle>
              </div>

              <SectionNote>
                Click details for the full receipt-style view, or continue
                learning inside the protected course player.
              </SectionNote>
            </SectionHeader>

            <Grid>
              {filteredEnrollments.map((enrollment) => {
                const courseId = getCourseId(enrollment);
                const course =
                  enrollment?.course && typeof enrollment.course === "object"
                    ? enrollment.course
                    : {};
                const image = getCourseImage(course);
                const progress = getProgress(enrollment);
                const currency = enrollment.currency || "USD";

                const pricePaid = Number.isFinite(Number(enrollment.pricePaid))
                  ? formatMoney(enrollment.pricePaid, currency)
                  : course.isFree
                    ? "Free"
                    : "Paid";

                const paymentPlan = normalizeText(
                  enrollment.paymentPlan || "one-time",
                );

                const numericRating = Number(course.ratingAverage) || 0;
                const numericRatingCount = Number(course.ratingCount) || 0;
                const enrolledCount =
                  typeof course.studentsCount === "number"
                    ? course.studentsCount
                    : 0;

                const isBestSeller =
                  Boolean(course.isFeatured) ||
                  (numericRating >= 4.7 && numericRatingCount >= 20);

                return (
                  <Card key={enrollment?._id || courseId}>
                    <ThumbWrap>
                      {image ? (
                        <Thumb
                          src={image}
                          alt={course.title || "Course thumbnail"}
                          loading="lazy"
                        />
                      ) : (
                        <FallbackThumb>
                          <FallbackBadge>KnockoutCodes</FallbackBadge>
                          <FallbackTitle>
                            {course.title || "Purchased Course"}
                          </FallbackTitle>
                        </FallbackThumb>
                      )}

                      <ImageShade />

                      <BadgeRow>
                        <Badge>{course.category || "Course"}</Badge>

                        <BadgeRightGroup>
                          <OwnedBadge>Purchased</OwnedBadge>

                          {isBestSeller ? (
                            <BestSellerBadge>Best Seller</BestSellerBadge>
                          ) : null}

                          <StatusBadge $status={enrollment.status}>
                            {getStatusLabel(enrollment.status)}
                          </StatusBadge>
                        </BadgeRightGroup>
                      </BadgeRow>

                      <HookStrip>
                        {progress >= 100
                          ? "Completed. Review anytime and keep your skills sharp."
                          : progress > 0
                            ? "You already started. Keep building momentum."
                            : "Unlocked and ready. Start from lesson one."}
                      </HookStrip>
                    </ThumbWrap>

                    <Body>
                      <CourseTitle>
                        {course.title || "Untitled Course"}
                      </CourseTitle>

                      <PromiseText>
                        {course.shortDescription ||
                          course.description ||
                          "Your protected training access is active after purchase verification."}
                      </PromiseText>

                      <MetaRow>
                        <MetaPill>
                          Level: {course.level || "All Levels"}
                        </MetaPill>
                        <MetaPill>
                          Instructor:{" "}
                          {course.instructor || "KnockoutCodes Coach"}
                        </MetaPill>
                        <MetaPill>Plan: {paymentPlan}</MetaPill>
                        <MetaPill>Paid: {pricePaid}</MetaPill>
                        <MetaPill>{enrolledCount} enrolled</MetaPill>
                      </MetaRow>

                      <RatingRow>
                        <Stars>{renderStars(course.ratingAverage)}</Stars>

                        <RatingText>
                          {numericRating > 0
                            ? `${numericRating.toFixed(1)}/5`
                            : "New"}
                          {numericRatingCount > 0
                            ? ` • ${numericRatingCount} reviews`
                            : ""}
                        </RatingText>
                      </RatingRow>

                      <InfoGrid>
                        <InfoItem>
                          <InfoLabel>Enrollment ID</InfoLabel>
                          <InfoValue>
                            {enrollment._id || "Not available"}
                          </InfoValue>
                        </InfoItem>

                        <InfoItem>
                          <InfoLabel>Stripe Session</InfoLabel>
                          <InfoValue>
                            {enrollment.stripeSessionId || "Not available"}
                          </InfoValue>
                        </InfoItem>

                        <InfoItem>
                          <InfoLabel>Purchased</InfoLabel>
                          <InfoValue>
                            {formatDate(
                              enrollment.startedAt || enrollment.createdAt,
                            )}
                          </InfoValue>
                        </InfoItem>

                        <InfoItem>
                          <InfoLabel>Last Accessed</InfoLabel>
                          <InfoValue>
                            {formatDate(enrollment.lastAccessedAt)}
                          </InfoValue>
                        </InfoItem>
                      </InfoGrid>

                      <ProgressSection>
                        <ProgressHeader>
                          <span>Course Progress</span>
                          <strong>{Math.round(progress)}%</strong>
                        </ProgressHeader>

                        <ProgressTrack>
                          <ProgressFill $value={progress} />
                        </ProgressTrack>
                      </ProgressSection>

                      <AccessNote>
                        Access Status:{" "}
                        <strong>{getStatusLabel(enrollment.status)}</strong>.{" "}
                        {enrollment.status === "active"
                          ? "You can continue learning now."
                          : "Check details for more information about this enrollment."}
                      </AccessNote>

                      <Footer>
                        <OutlineButton
                          type="button"
                          onClick={() => handleViewDetails(enrollment)}
                        >
                          Details
                        </OutlineButton>

                        <PrimaryButton
                          type="button"
                          onClick={() => handleContinue(enrollment)}
                        >
                          {getButtonLabel(progress)}
                        </PrimaryButton>
                      </Footer>
                    </Body>
                  </Card>
                );
              })}
            </Grid>
          </>
        )}
      </Inner>
    </PageWrap>
  );
};

export default MyCourses;

/* =========================
   Styles
========================= */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
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

const Toolbar = styled.section`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: end;
  margin-bottom: 18px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const SearchBox = styled.div`
  display: grid;
  gap: 8px;
`;

const SearchLabel = styled.label`
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 46px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 249, 242, 0.16);
  background: rgba(0, 0, 0, 0.42);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 14px;
  outline: none;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 249, 242, 0.48);
  }

  &:focus {
    border-color: rgba(214, 182, 159, 0.72);
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.1);
  }
`;

const ControlGroup = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Select = styled.select`
  min-width: 180px;
  min-height: 46px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 249, 242, 0.16);
  background: rgba(0, 0, 0, 0.42);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;
  font-size: 14px;
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
  max-width: 340px;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.68;
  font-size: 13px;
  line-height: 1.6;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
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
  min-height: 620px;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
  animation: ${fadeUp} 0.35s ease both;

  &:hover {
    transform: translateY(-6px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
    border-color: rgba(214, 182, 159, 0.58);
  }
`;

const ThumbWrap = styled.div`
  position: relative;
  padding-top: 62%;
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

const FallbackThumb = styled.div`
  position: absolute;
  inset: 0;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.brown},
    ${({ theme }) => theme.colors.black}
  );
`;

const FallbackBadge = styled.span`
  width: fit-content;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 7px 10px;
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 249, 242, 0.18);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const FallbackTitle = styled.div`
  max-width: 88%;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  font-weight: 950;
  line-height: 1.05;
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

const BestSellerBadge = styled(Badge)`
  background: rgba(255, 215, 122, 0.92);
  color: ${({ theme }) => theme.colors.black};
`;

const OwnedBadge = styled(Badge)`
  background: rgba(255, 249, 242, 0.94);
  color: ${({ theme }) => theme.colors.black};
`;

const StatusBadge = styled(Badge)`
  background: ${({ $status }) => {
    if ($status === "completed") return "rgba(52, 152, 219, 0.88)";
    if ($status === "cancelled" || $status === "expired") {
      return "rgba(231, 76, 60, 0.88)";
    }
    if ($status === "pending") return "rgba(255, 215, 122, 0.9)";
    return "rgba(46, 204, 113, 0.86)";
  }};
  color: ${({ $status, theme }) =>
    $status === "pending" ? theme.colors.black : theme.colors.ivory};
`;

const BadgeRightGroup = styled.div`
  display: flex;
  gap: 6px;
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

const RatingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  margin-bottom: 12px;
`;

const Stars = styled.span`
  font-size: 14px;
  color: #ffd97a;
`;

const RatingText = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
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
  text-transform: capitalize;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 14px;

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 249, 242, 0.08);
`;

const InfoLabel = styled.div`
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.11em;
  text-transform: uppercase;
`;

const InfoValue = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  white-space: normal;
`;

const ProgressSection = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const ProgressTrack = styled.div`
  height: 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  overflow: hidden;
  background: rgba(255, 249, 242, 0.12);
`;

const ProgressFill = styled.div`
  width: ${({ $value }) => `${$value}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
`;

const AccessNote = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 12.5px;
  line-height: 1.55;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-transform: capitalize;
  }
`;

const Footer = styled.div`
  display: flex;
  gap: 9px;
  margin-top: auto;

  @media (max-width: 460px) {
    flex-direction: column;
  }
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
`;

const OutlineButton = styled(Button)`
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.2);
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const StateCard = styled.section`
  max-width: 650px;
  margin: 54px auto 0;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 34px 22px;
  text-align: center;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Spinner = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid rgba(255, 249, 242, 0.14);
  border-top-color: ${({ theme }) => theme.colors.lightBrown};
  animation: ${spin} 0.8s linear infinite;
  margin: 0 auto 14px;
`;

const EmptyIcon = styled.div`
  font-size: 42px;
  margin-bottom: 10px;
`;

const StateTitle = styled.h2`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  font-weight: 950;
`;

const StateText = styled.p`
  max-width: 520px;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 14px;
  line-height: 1.65;
`;

const EmptyActions = styled.div`
  max-width: 360px;
  margin: 20px auto 0;
  display: grid;
  gap: 10px;
`;
