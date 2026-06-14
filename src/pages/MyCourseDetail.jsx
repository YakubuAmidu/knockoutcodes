// src/pages/MyCoursesDetail.jsx
import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import ReviewForm from "../components/ReviewForm";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

function formatMinutesToHours(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return "Self-paced";

  const hrs = Math.floor(m / 60);
  const mins = Math.round(m % 60);

  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
}

const MyCoursesDetail = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const stateEnrollment = location?.state?.enrollment || null;

  const [enrollment, setEnrollment] = useState(stateEnrollment);
  const [loading, setLoading] = useState(!stateEnrollment);
  const [error, setError] = useState("");

  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadEnrollment() {
      if (stateEnrollment?.course) {
        setEnrollment(stateEnrollment);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data } = await axiosInstance.get("/enrollments/my");

        const list = Array.isArray(data?.enrollments)
          ? data.enrollments
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

        const found = list.find((item) => {
          const course = item?.course;
          const id = typeof course === "string" ? course : course?._id;
          return String(id) === String(courseId);
        });

        if (!mounted) return;

        if (!found) {
          setEnrollment(null);
          setError("This course was not found in your purchased courses.");
          return;
        }

        setEnrollment(found);
      } catch (err) {
        if (!mounted) return;

        setEnrollment(null);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Could not load your course details."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEnrollment();

    return () => {
      mounted = false;
    };
  }, [courseId, stateEnrollment]);

  useEffect(() => {
    if (!error) return;

    toast?.push?.({
      title: "Course Details",
      description: error,
      variant: "error",
    });
  }, [error, toast]);

  const course =
    enrollment?.course && typeof enrollment.course === "object"
      ? enrollment.course
      : {};

  const courseDbId = course?._id || courseId || "";
  const hasValidCourseId = Boolean(courseDbId);

  useEffect(() => {
    if (!hasValidCourseId) return;

    let mounted = true;

    async function loadLessons() {
      try {
        setLessonsLoading(true);
        setLessonsError("");

        const { data } = await axiosInstance.get(
          `/lessons/by-course/${encodeURIComponent(courseDbId)}`
        );

        const list = Array.isArray(data?.lessons)
          ? data.lessons
          : Array.isArray(data?.data)
          ? data.data
          : [];

        if (mounted) setLessons(list);
      } catch (err) {
        if (!mounted) return;

        setLessons([]);
        setLessonsError(
          err?.response?.data?.message ||
            err?.message ||
            "Could not load lessons for this course."
        );
      } finally {
        if (mounted) setLessonsLoading(false);
      }
    }

    loadLessons();

    return () => {
      mounted = false;
    };
  }, [courseDbId, hasValidCourseId]);

  const progressValue = Number(enrollment?.progressPercent);

  const progress = Number.isFinite(progressValue)
    ? Math.min(Math.max(progressValue, 0), 100)
    : 0;

  const ratingAverage = Number(course?.ratingAverage || 0);
  const ratingCount = Number(course?.ratingCount || 0);
  const studentsCount = Number(course?.studentsCount || 0);

  const lessonCount = lessons.length || Number(course?.totalLessons) || 0;

  const completedLessonCount = useMemo(() => {
    if (!lessonCount) return 0;
    return Math.min(lessonCount, Math.floor((progress / 100) * lessonCount));
  }, [lessonCount, progress]);

  const currentLessonIndex = useMemo(() => {
    if (!lessonCount) return -1;
    if (progress >= 100) return lessonCount - 1;
    return Math.min(lessonCount - 1, completedLessonCount);
  }, [lessonCount, progress, completedLessonCount]);

  const totalLessonMinutes = useMemo(() => {
    const fromLessons = lessons.reduce(
      (sum, lesson) => sum + (Number(lesson?.durationInMinutes) || 0),
      0
    );

    return fromLessons || Number(course?.durationInMinutes) || 0;
  }, [lessons, course?.durationInMinutes]);

  const renderStars = (ratingValue) => {
    const rating = Number(ratingValue) || 0;
    const fullStars = Math.max(0, Math.min(5, Math.round(rating)));

    return Array.from({ length: 5 }, (_, index) =>
      index + 1 <= fullStars ? "★" : "☆"
    ).join("");
  };

  const formatDate = (value) => {
    if (!value) return "Not available";

    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
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

  const normalizeText = (value) =>
    String(value || "Not available").replaceAll("-", " ").replaceAll("_", " ");

  const image =
    course?.thumbnail ||
    course?.image ||
    course?.coverImage ||
    course?.photo ||
    "";

  const pricePaid = Number.isFinite(Number(enrollment?.pricePaid))
    ? formatMoney(enrollment.pricePaid, enrollment.currency || "USD")
    : course?.isFree
    ? "Free"
    : "Paid";

  const statusLabel = useMemo(() => {
    switch (enrollment?.status) {
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
  }, [enrollment?.status]);

  const accessIsActive = ["active", "completed"].includes(
    String(enrollment?.status || "")
  );

  const handleContinue = () => {
    if (!courseDbId) {
      toast?.push?.({
        title: "Course not found",
        description: "This enrollment has no linked course document.",
        variant: "error",
      });
      return;
    }

    if (!accessIsActive) {
      toast?.push?.({
        title: "Access Not Active",
        description:
          "This course is not active yet. Please check your payment or subscription status.",
        variant: "danger",
      });
      return;
    }

    navigate(`/course-player/${encodeURIComponent(courseDbId)}`, {
      state: {
        courseId: courseDbId,
        enrollmentId: enrollment?._id,
      },
    });
  };

  const handleOpenLesson = (lesson) => {
    if (!accessIsActive) {
      toast?.push?.({
        title: "Access Not Active",
        description: "Your course access must be active before watching lessons.",
        variant: "danger",
      });
      return;
    }

    navigate(`/course-player/${encodeURIComponent(courseDbId)}`, {
      state: {
        courseId: courseDbId,
        enrollmentId: enrollment?._id,
        lessonId: lesson?._id,
      },
    });
  };

  if (loading) {
    return (
      <PageWrap>
        <Inner>
          <StateCard>
            <Spinner />
            <StateTitle>Loading course details...</StateTitle>
            <StateText>Preparing your full purchase and access summary.</StateText>
          </StateCard>
        </Inner>
      </PageWrap>
    );
  }

  if (!enrollment) {
    return (
      <PageWrap>
        <Inner>
          <StateCard>
            <StateTitle>Course details not found</StateTitle>
            <StateText>
              {error || "This course could not be found in your purchased list."}
            </StateText>

            <ButtonRow>
              <OutlineButton type="button" onClick={() => navigate("/my-courses")}>
                Back To My Courses
              </OutlineButton>

              <PrimaryButton
                type="button"
                onClick={() => {
                  if (hasValidCourseId) {
                    navigate(`/courses/${encodeURIComponent(courseDbId)}`);
                  } else {
                    navigate("/courses");
                  }
                }}
              >
                Explore Courses
              </PrimaryButton>
            </ButtonRow>
          </StateCard>
        </Inner>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <Inner>
        <TopBar>
          <BackBtn type="button" onClick={() => navigate("/my-courses")}>
            ← Back To My Courses
          </BackBtn>

          <TopPills>
            <Pill>Purchased</Pill>
            <Pill>{statusLabel}</Pill>
            <Pill>{Math.round(progress)}% Complete</Pill>
          </TopPills>
        </TopBar>

        <Hero>
          <HeroContent>
            <Eyebrow>Purchased Course Detail</Eyebrow>
            <Title>{course?.title || "Untitled Course"}</Title>

            <Subtitle>
              {course?.description ||
                course?.shortDescription ||
                "This page gives you the full story of your course access, payment, enrollment, progress, lessons, and next step."}
            </Subtitle>

            <RatingBox>
              <Stars>{renderStars(ratingAverage)}</Stars>
              <RatingText>
                {ratingAverage > 0 ? `${ratingAverage.toFixed(1)}/5` : "New Course"}
                {ratingCount > 0 ? ` • ${ratingCount} reviews` : " • No reviews yet"}
                {` • ${studentsCount} enrolled`}
              </RatingText>
            </RatingBox>

            <HeroActions>
              <PrimaryButton type="button" onClick={handleContinue}>
                {progress > 0 ? "Continue Learning" : "Start Course"}
              </PrimaryButton>

              <OutlineButton
                type="button"
                onClick={() => {
                  if (hasValidCourseId) {
                    navigate(`/courses/${encodeURIComponent(courseDbId)}`);
                  } else {
                    navigate("/courses");
                  }
                }}
              >
                View Public Details
              </OutlineButton>
            </HeroActions>
          </HeroContent>

          <HeroMedia>
            {image ? (
              <HeroImage src={image} alt={course?.title || "Course image"} />
            ) : (
              <FallbackMedia>
                <FallbackBadge>KnockoutCodes</FallbackBadge>
                <FallbackTitle>{course?.title || "Course Access"}</FallbackTitle>
              </FallbackMedia>
            )}

            <MediaShade />
            <StatusBadge $status={enrollment?.status}>{statusLabel}</StatusBadge>
          </HeroMedia>
        </Hero>

        <StatusBar>
          <StatusPill>
            <strong>{pricePaid}</strong>
            <span>Amount Paid</span>
          </StatusPill>

          <StatusPill>
            <strong>{normalizeText(enrollment?.paymentPlan || "one-time")}</strong>
            <span>Payment Plan</span>
          </StatusPill>

          <StatusPill>
            <strong>{lessonCount || "Coming"}</strong>
            <span>Total Lessons</span>
          </StatusPill>

          <StatusPill>
            <strong>{formatMinutesToHours(totalLessonMinutes)}</strong>
            <span>Training Time</span>
          </StatusPill>
        </StatusBar>

        <ContentGrid>
          <MainColumn>
            <InfoCard>
              <SectionEyebrow>Your Progress</SectionEyebrow>
              <SectionTitle>Course Completion</SectionTitle>

              <ProgressHeader>
                <span>Overall Progress</span>
                <strong>{Math.round(progress)}%</strong>
              </ProgressHeader>

              <ProgressTrack>
                <ProgressFill $value={progress} />
              </ProgressTrack>

              <ProgressMetaGrid>
                <ProgressMeta>
                  <strong>{completedLessonCount}</strong>
                  <span>Lessons Completed</span>
                </ProgressMeta>

                <ProgressMeta>
                  <strong>{lessonCount}</strong>
                  <span>Total Lessons</span>
                </ProgressMeta>

                <ProgressMeta>
                  <strong>
                    {lessonCount && currentLessonIndex >= 0
                      ? `Lesson ${currentLessonIndex + 1}`
                      : "Not Started"}
                  </strong>
                  <span>Watching Stage</span>
                </ProgressMeta>
              </ProgressMetaGrid>

              <AccessNote>
                {progress >= 100
                  ? "You completed this course. You can still return anytime to review the lessons."
                  : progress > 0
                  ? "You already started this course. Continue from your current watching stage."
                  : "Your course is unlocked and ready. Start from lesson one."}
              </AccessNote>
            </InfoCard>

            <InfoCard>
              <SectionEyebrow>Lesson Roadmap</SectionEyebrow>
              <SectionTitle>Your Watching Stage</SectionTitle>

              {lessonsLoading ? (
                <LessonNotice>Loading your lessons...</LessonNotice>
              ) : lessonsError ? (
                <LessonNotice>{lessonsError}</LessonNotice>
              ) : lessons.length > 0 ? (
                <LessonList>
                  {lessons.map((lesson, index) => {
                    const isCompleted = index < completedLessonCount;
                    const isCurrent =
                      progress < 100 && index === currentLessonIndex;
                    const isLocked = !accessIsActive || lesson?.isLocked;
                    const lessonProgress = isCompleted
                      ? 100
                      : isCurrent
                      ? Math.max(8, Math.round(progress % (100 / lessonCount || 1)))
                      : 0;

                    return (
                      <LessonCard
                        key={lesson?._id || `${lesson?.title}-${index}`}
                        $current={isCurrent}
                      >
                        <LessonNumber>
                          {String(index + 1).padStart(2, "0")}
                        </LessonNumber>

                        <LessonContent>
                          <LessonTopRow>
                            <LessonTitle>{lesson?.title || "Untitled Lesson"}</LessonTitle>

                            <LessonBadges>
                              {isCompleted ? (
                                <CompletedBadge>Completed</CompletedBadge>
                              ) : isCurrent ? (
                                <CurrentBadge>Watching</CurrentBadge>
                              ) : isLocked ? (
                                <LockedBadge>Locked</LockedBadge>
                              ) : (
                                <ReadyBadge>Ready</ReadyBadge>
                              )}

                              {lesson?.isPreview ? (
                                <PreviewBadge>Preview</PreviewBadge>
                              ) : null}
                            </LessonBadges>
                          </LessonTopRow>

                          {lesson?.description ? (
                            <LessonDescription>{lesson.description}</LessonDescription>
                          ) : null}

                          <MiniProgressHeader>
                            <span>
                              {lesson?.durationInMinutes
                                ? formatMinutesToHours(lesson.durationInMinutes)
                                : "Self-paced"}
                            </span>
                            <strong>{lessonProgress}%</strong>
                          </MiniProgressHeader>

                          <MiniProgressTrack>
                            <MiniProgressFill $value={lessonProgress} />
                          </MiniProgressTrack>
                        </LessonContent>

                        <LessonButton
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleOpenLesson(lesson)}
                        >
                          {isCompleted
                            ? "Review"
                            : isCurrent
                            ? "Continue"
                            : isLocked
                            ? "Locked"
                            : "Start"}
                        </LessonButton>
                      </LessonCard>
                    );
                  })}
                </LessonList>
              ) : (
                <LessonNotice>
                  No lessons are attached to this course yet. Once lessons are
                  added, they will appear here automatically.
                </LessonNotice>
              )}
            </InfoCard>

            <InfoCard>
              <SectionEyebrow>Course Information</SectionEyebrow>
              <SectionTitle>What You Purchased</SectionTitle>

              <DetailGrid>
                <DetailItem>
                  <DetailLabel>Course Title</DetailLabel>
                  <DetailValue>{course?.title || "Not available"}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Instructor</DetailLabel>
                  <DetailValue>{course?.instructor || "KnockoutCodes Coach"}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Level</DetailLabel>
                  <DetailValue>{course?.level || "All Levels"}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Category</DetailLabel>
                  <DetailValue>{course?.category || "Boxing"}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Reviews</DetailLabel>
                  <DetailValue>{ratingCount}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Enrolled Students</DetailLabel>
                  <DetailValue>{studentsCount}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Course ID</DetailLabel>
                  <DetailValue>{courseDbId || "Not available"}</DetailValue>
                </DetailItem>

                <DetailItem>
                  <DetailLabel>Enrollment ID</DetailLabel>
                  <DetailValue>{enrollment?._id || "Not available"}</DetailValue>
                </DetailItem>
              </DetailGrid>
            </InfoCard>

            <InfoCard>
              <SectionEyebrow>Access Protection</SectionEyebrow>
              <SectionTitle>Why You Can Watch This Course</SectionTitle>

              <FeatureList>
                <li>Your purchase or subscription was verified by the backend.</li>
                <li>Your enrollment is connected to your user account.</li>
                <li>The Course Player should only open for verified access.</li>
                <li>Your progress is tracked under this enrollment record.</li>
              </FeatureList>
            </InfoCard>

            <InfoCard>
              <SectionEyebrow>Leave Your Review</SectionEyebrow>
              <SectionTitle>Help The Next Student Decide</SectionTitle>

              <AccessNote>
                Share your honest experience with this course. Your review helps
                other students know if this training is worth their time.
              </AccessNote>

              {hasValidCourseId && accessIsActive ? (
                <ReviewForm
                  courseId={courseDbId}
                  courseTitle={course?.title || "this course"}
                />
              ) : (
                <AccessNote>
                  Course ID is missing or access is inactive, so reviews cannot be
                  submitted for this course yet.
                </AccessNote>
              )}
            </InfoCard>
          </MainColumn>

          <SideColumn>
            <SummaryCard>
              <SectionEyebrow>Purchase Summary</SectionEyebrow>
              <SummaryTitle>{course?.title || "Course Summary"}</SummaryTitle>

              <SummaryPrice>{pricePaid}</SummaryPrice>

              <SummaryList>
                <li>Status: {statusLabel}</li>
                <li>Plan: {normalizeText(enrollment?.paymentPlan || "one-time")}</li>
                <li>Currency: {enrollment?.currency || "USD"}</li>
                <li>Progress: {Math.round(progress)}%</li>
                <li>Watching Stage: {currentLessonIndex >= 0 ? `Lesson ${currentLessonIndex + 1}` : "Not Started"}</li>
                <li>Lessons: {lessonCount || "Not available"}</li>
                <li>Training Time: {formatMinutesToHours(totalLessonMinutes)}</li>
                <li>Rating: {ratingAverage > 0 ? ratingAverage.toFixed(1) : "New"}</li>
                <li>Reviews: {ratingCount}</li>
                <li>Students Enrolled: {studentsCount}</li>
                <li>Purchased: {formatDate(enrollment?.createdAt)}</li>
                <li>Started: {formatDate(enrollment?.startedAt)}</li>
                <li>Last Accessed: {formatDate(enrollment?.lastAccessedAt)}</li>
                <li>Stripe Session: {enrollment?.stripeSessionId || "Not available"}</li>
              </SummaryList>

              <PrimaryButton type="button" onClick={handleContinue}>
                Open Course Player
              </PrimaryButton>
            </SummaryCard>
          </SideColumn>
        </ContentGrid>
      </Inner>
    </PageWrap>
  );
};

export default MyCoursesDetail;

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
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.2), transparent 34%),
    radial-gradient(circle at 88% 14%, rgba(90, 56, 37, 0.42), transparent 34%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  justify-content: center;
  padding: 96px 16px 64px;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const TopPills = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const BackBtn = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  font-weight: 950;
  cursor: pointer;
`;

const Pill = styled.span`
  padding: 8px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 850;
  font-size: 12px;
  text-transform: capitalize;
`;

const Hero = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
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
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.16), transparent 36%);
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

const RatingBox = styled.div`
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Stars = styled.span`
  font-size: 18px;
  color: #ffd97a;
  letter-spacing: 1px;
`;

const RatingText = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  font-size: 13px;
  font-weight: 850;
`;

const HeroActions = styled.div`
  margin-top: 22px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const HeroMedia = styled.aside`
  position: relative;
  min-height: 380px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.black};
  border: 1px solid rgba(214, 182, 159, 0.16);
  box-shadow: ${({ theme }) => theme.shadow.glow};

  @media (max-width: 520px) {
    min-height: 260px;
  }
`;

const HeroImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const FallbackMedia = styled.div`
  position: absolute;
  inset: 0;
  padding: 24px;
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
  font-size: 30px;
  font-weight: 950;
  line-height: 1.05;
`;

const MediaShade = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.62)),
    radial-gradient(circle at 30% 0%, rgba(214, 182, 159, 0.12), transparent 38%);
`;

const StatusBadge = styled.span`
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 2;
  padding: 8px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.ivory};
  background: ${({ $status }) => {
    if ($status === "completed") return "rgba(52, 152, 219, 0.88)";
    if ($status === "cancelled" || $status === "expired") {
      return "rgba(231, 76, 60, 0.88)";
    }
    if ($status === "pending") return "rgba(255, 215, 122, 0.9)";
    return "rgba(46, 204, 113, 0.86)";
  }};
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
    font-size: 18px;
    font-weight: 950;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

const ContentGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) 360px;
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const MainColumn = styled.div`
  display: grid;
  gap: 18px;
`;

const SideColumn = styled.aside``;

const InfoCard = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    160deg,
    rgba(61, 38, 26, 0.72),
    rgba(0, 0, 0, 0.54)
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 22px;
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
  margin: 0 0 16px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.55rem, 3vw, 2.5rem);
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.045em;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 14px;
  margin-bottom: 10px;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const ProgressTrack = styled.div`
  height: 11px;
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

const ProgressMetaGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ProgressMeta = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 12px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.12);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 16px;
    font-weight: 950;
  }

  span {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.76;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

const AccessNote = styled.p`
  margin: 14px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 13px;
  line-height: 1.65;
`;

const LessonList = styled.div`
  display: grid;
  gap: 12px;
`;

const LessonCard = styled.article`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 14px;
  background: ${({ $current }) =>
    $current ? "rgba(214, 182, 159, 0.15)" : "rgba(0, 0, 0, 0.28)"};
  border: 1px solid
    ${({ $current }) =>
      $current ? "rgba(214, 182, 159, 0.42)" : "rgba(214, 182, 159, 0.14)"};

  @media (max-width: 760px) {
    grid-template-columns: 42px minmax(0, 1fr);
  }
`;

const LessonNumber = styled.div`
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(214, 182, 159, 0.18);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
`;

const LessonContent = styled.div`
  min-width: 0;
`;

const LessonTopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const LessonTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 15px;
  line-height: 1.2;
  font-weight: 950;
`;

const LessonBadges = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const LessonBadge = styled.span`
  padding: 6px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid rgba(255, 249, 242, 0.16);
`;

const CompletedBadge = styled(LessonBadge)`
  background: rgba(46, 204, 113, 0.86);
  color: ${({ theme }) => theme.colors.black};
`;

const CurrentBadge = styled(LessonBadge)`
  background: rgba(214, 182, 159, 0.92);
  color: ${({ theme }) => theme.colors.black};
`;

const LockedBadge = styled(LessonBadge)`
  background: rgba(0, 0, 0, 0.44);
  color: ${({ theme }) => theme.colors.ivory};
`;

const ReadyBadge = styled(LessonBadge)`
  background: rgba(255, 249, 242, 0.92);
  color: ${({ theme }) => theme.colors.black};
`;

const PreviewBadge = styled(LessonBadge)`
  background: rgba(255, 215, 122, 0.92);
  color: ${({ theme }) => theme.colors.black};
`;

const LessonDescription = styled.p`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.74;
  font-size: 12.5px;
  line-height: 1.55;
`;

const MiniProgressHeader = styled.div`
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.8;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const MiniProgressTrack = styled.div`
  margin-top: 6px;
  height: 7px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 249, 242, 0.11);
`;

const MiniProgressFill = styled.div`
  width: ${({ $value }) => `${Math.min(Math.max(Number($value) || 0, 0), 100)}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
`;

const LessonButton = styled.button`
  min-height: 40px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 14px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(255, 249, 242, 0.08);
    border-color: rgba(214, 182, 159, 0.36);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 760px) {
    grid-column: 2;
    width: 100%;
  }
`;

const LessonNotice = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 16px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.16);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;
  font-size: 13px;
  line-height: 1.65;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const DetailItem = styled.div`
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 249, 242, 0.08);
`;

const DetailLabel = styled.div`
  margin-bottom: 5px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.11em;
  text-transform: uppercase;
`;

const DetailValue = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FeatureList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;

  li {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.84;
    font-size: 13px;
    line-height: 1.55;
  }

  li::before {
    content: "✓";
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
    margin-right: 8px;
  }
`;

const SummaryCard = styled.section`
  position: sticky;
  top: 94px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    160deg,
    rgba(61, 38, 26, 0.86),
    rgba(0, 0, 0, 0.7)
  );
  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 22px;
`;

const SummaryTitle = styled.h3`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  font-weight: 950;
`;

const SummaryPrice = styled.div`
  font-size: 30px;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 14px;
`;

const SummaryList = styled.ul`
  padding: 0;
  margin: 0 0 18px;
  list-style: none;
  display: grid;
  gap: 9px;

  li {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.82;
    font-size: 13px;
    line-height: 1.45;
    word-break: break-word;
    text-transform: capitalize;
  }

  li::before {
    content: "✓";
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
    margin-right: 8px;
  }
`;

const ButtonRow = styled.div`
  max-width: 420px;
  margin: 22px auto 0;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Button = styled.button`
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  min-height: 44px;
  padding: 0 16px;
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