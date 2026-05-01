// src/pages/CoursePlayer.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

const Page = styled.div`
  max-width: 1180px;
  margin: 0 auto;
  padding: 30px 16px 60px;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const PlayerCard = styled.div`
  background: ${({ theme }) => theme.colors.black || "#050505"};
  border-radius: 18px;
  padding: 18px 18px 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55);
`;

const SidebarCard = styled(PlayerCard)`
  padding: 14px 14px 16px;
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const SubTitle = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.lightgray || "#a8a8a8"};
  margin-bottom: 14px;
`;

const VideoWrapper = styled.div`
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: radial-gradient(circle at 0 0, #242424, #000000);
  margin-bottom: 14px;
  position: relative;
  aspect-ratio: 16 / 9;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  display: block;
  background: #000000;
`;

const Fallback = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.lightgray || "#b5b5b5"};
`;

const LessonHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const LessonTitle = styled.h2`
  font-size: 14px;
  font-weight: 600;
`;

const LessonMeta = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.lightgray || "#9c9c9c"};
`;

const LessonList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 480px;
  overflow: auto;
`;

const LessonItem = styled.li`
  border-radius: 10px;
  padding: 10px 10px;
  margin-bottom: 6px;
  display: flex;
  flex-direction: column;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  background: ${({ active }) =>
    active ? "rgba(255, 255, 255, 0.06)" : "transparent"};
  border: 1px solid
    ${({ active }) =>
      active ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.06)"};
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  transition: background 0.18s ease-out, border-color 0.18s ease-out,
    transform 0.18s ease-out;

  &:hover {
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
    background: ${({ disabled }) =>
      disabled ? "transparent" : "rgba(255, 255, 255, 0.05)"};
    border-color: ${({ disabled }) =>
      disabled ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.18)"};
  }
`;

const LessonItemTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
`;

const LessonItemMeta = styled.span`
  font-size: 11px;
  margin-top: 3px;
  color: ${({ theme }) => theme.colors.lightgray || "#a0a0a0"};
`;

const LessonTagRow = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const LessonTag = styled.span`
  font-size: 10px;
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: ${({ theme }) => theme.colors.lightgray || "#c4c4c4"};
`;

const BadgeRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

const Badge = styled.span`
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 600;
  color: #ffffff;
  background: ${({ theme }) =>
    theme.gradients?.brand || "linear-gradient(120deg, #C71585, #ff5bb1)"};
`;

const SecondaryBadge = styled.span`
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: ${({ theme }) => theme.colors.lightgray || "#d0d0d0"};
`;

const SmallInfo = styled.p`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.lightgray || "#999999"};
  margin-top: 8px;
`;

const LockedPanel = styled.div`
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  padding: 14px;
`;

const PrimaryButton = styled.button`
  margin-top: 10px;
  width: 100%;
  padding: 12px 12px;
  border-radius: 12px;
  border: 0;
  cursor: pointer;
  font-weight: 700;
  color: #fff;
  background: ${({ theme }) =>
    theme.gradients?.brand || "linear-gradient(120deg, #C71585, #ff5bb1)"};
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
  transition: transform 0.16s ease-out, opacity 0.16s ease-out;

  &:hover {
    transform: translateY(-1px);
    opacity: 0.95;
  }
`;

const CoursePlayer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);

  const [courseLoading, setCourseLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [subscription, setSubscription] = useState(null);

  const [accessChecked, setAccessChecked] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(false);

  const hasActiveSubscription = Boolean(
    subscription &&
      (subscription.status === "active" || subscription.status === "trialing")
  );

  const resumeKey = useMemo(
    () => (courseId ? `course_resume_${courseId}` : ""),
    [courseId]
  );

  const loadCourse = useCallback(async () => {
    try {
      setCourseLoading(true);
      const res = await axiosInstance.get(`/courses/${courseId}`);

      if (res.data && res.data.success && res.data.course) {
        setCourse(res.data.course);
      } else {
        toast.showToast("Unable to load course.", "error");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load course.";
      toast.showToast(msg, "error");
    } finally {
      setCourseLoading(false);
    }
  }, [courseId, toast]);

  const loadEnrollment = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/enrollments/status/${courseId}`);
      if (res.data && res.data.success) {
        setIsEnrolled(Boolean(res.data.isEnrolled));
      } else {
        setIsEnrolled(false);
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        setIsEnrolled(false);
      }
    }
  }, [courseId]);

  const loadSubscription = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/subscriptions/me");
      if (res.data && res.data.success) {
        setSubscription(res.data.subscription || null);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      if (error?.response?.status !== 401) {
        setSubscription(null);
      }
    }
  }, []);

  const loadLessons = useCallback(async () => {
    try {
      setLessonsLoading(true);
      const res = await axiosInstance.get(`/lessons/by-course/${courseId}`);

      if (res.data && res.data.success) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];

        // Premium touch: stable ordering
        const sorted = [...list].sort((a, b) => {
          const ao = typeof a.order === "number" ? a.order : 999999;
          const bo = typeof b.order === "number" ? b.order : 999999;
          return ao - bo;
        });

        setLessons(sorted);

        // Premium touch: resume last watched lesson if present
        let nextActive = sorted[0] || null;
        if (resumeKey) {
          const savedId = localStorage.getItem(resumeKey);
          if (savedId) {
            const found = sorted.find((l) => l._id === savedId);
            if (found) nextActive = found;
          }
        }
        setActiveLesson(nextActive);
      } else {
        toast.showToast("Unable to load lessons.", "error");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load lessons.";
      toast.showToast(msg, "error");
    } finally {
      setLessonsLoading(false);
    }
  }, [courseId, toast, resumeKey]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  // Check access first. Only load lessons when allowed (or free).
  useEffect(() => {
    const checkAccess = async () => {
      if (!course) return;

      if (course.isFree) {
        setAccessAllowed(true);
        setAccessChecked(true);
        await loadLessons();
        return;
      }

      await Promise.all([loadEnrollment(), loadSubscription()]);

      const allowedNow = Boolean(isEnrolled || hasActiveSubscription);
      setAccessAllowed(allowedNow);
      setAccessChecked(true);

      if (allowedNow) {
        await loadLessons();
      }
    };

    void checkAccess();
    // NOTE: we intentionally depend on course and loaders.
    // accessAllowed is derived from state updates below, so we keep this tight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, loadEnrollment, loadSubscription, loadLessons]);

  // When active lesson changes, persist resume id
  useEffect(() => {
    if (!resumeKey || !activeLesson?._id) return;
    localStorage.setItem(resumeKey, activeLesson._id);
  }, [activeLesson, resumeKey]);

  const handleLessonClick = (lesson) => {
    if (!lesson) return;
    if (!accessAllowed && !course?.isFree) {
      toast.showToast("Unlock this course with an active membership.", "error");
      return;
    }
    setActiveLesson(lesson);
  };

  const renderVideo = () => {
    if (!course) return <Fallback>Loading…</Fallback>;

    // Locked state (paid course, no access)
    if (!course.isFree && accessChecked && !accessAllowed) {
      return (
        <VideoWrapper>
          <Fallback style={{ padding: "16px" }}>
            This course is locked. Get a membership to watch lessons.
          </Fallback>
        </VideoWrapper>
      );
    }

    const videoSrc =
      (activeLesson && activeLesson.videoUrl) || course.promoVideo || "";

    if (!videoSrc) {
      return (
        <VideoWrapper>
          <Fallback style={{ padding: "16px" }}>
            No video URL has been added yet.
          </Fallback>
        </VideoWrapper>
      );
    }

    return (
      <VideoWrapper>
        <Video controls controlsList="nodownload">
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </Video>
      </VideoWrapper>
    );
  };

  if (courseLoading && !course) {
    return (
      <Page>
        <Fallback>Loading course player…</Fallback>
      </Page>
    );
  }

  if (!course) {
    return (
      <Page>
        <Fallback>Course not found.</Fallback>
      </Page>
    );
  }

  const canView = course.isFree || (accessChecked && accessAllowed);

  return (
    <Page>
      <Layout>
        <PlayerCard>
          <BadgeRow>
            <Badge>Course Player</Badge>
            {course.level && <SecondaryBadge>{course.level}</SecondaryBadge>}
            {course.category && (
              <SecondaryBadge>{course.category}</SecondaryBadge>
            )}
          </BadgeRow>

          <Title>{course.title}</Title>
          <SubTitle>
            {!accessChecked
              ? "Checking access…"
              : canView
              ? activeLesson
                ? `Now playing: ${activeLesson.title}`
                : "Select a lesson from the right to begin."
              : "Locked — membership required to watch."}
          </SubTitle>

          {renderVideo()}

          {canView && activeLesson && activeLesson.description ? (
            <>
              <LessonHeader>
                <LessonTitle>Lesson details</LessonTitle>
              </LessonHeader>
              <LessonMeta>{activeLesson.description}</LessonMeta>
            </>
          ) : null}

          {!canView ? (
            <LockedPanel>
              <LessonTitle>Unlock this course</LessonTitle>
              <SmallInfo>
                Your access is based on your enrollment or an active membership.
                Choose a plan to continue.
              </SmallInfo>
              <PrimaryButton
                onClick={() =>
                  navigate(`/subscription?courseId=${courseId}`, { replace: false })
                }
              >
                Go to Memberships
              </PrimaryButton>
            </LockedPanel>
          ) : !activeLesson ? (
            <SmallInfo>
              Choose any lesson from the right sidebar to start watching.
            </SmallInfo>
          ) : null}
        </PlayerCard>

        <SidebarCard>
          <LessonHeader>
            <LessonTitle>Lessons</LessonTitle>
            <LessonMeta>
              {!accessChecked
                ? "Checking…"
                : !course.isFree && !accessAllowed
                ? "Locked"
                : lessonsLoading
                ? "Loading…"
                : `${lessons.length} lesson${lessons.length === 1 ? "" : "s"}`}
            </LessonMeta>
          </LessonHeader>

          {!accessChecked ? (
            <Fallback>Checking access…</Fallback>
          ) : !course.isFree && !accessAllowed ? (
            <Fallback>
              Lessons are locked until you have an active membership.
            </Fallback>
          ) : lessons.length === 0 && !lessonsLoading ? (
            <Fallback>No lessons have been added yet.</Fallback>
          ) : lessons.length > 0 ? (
            <LessonList>
              {lessons.map((lesson) => (
                <LessonItem
                  key={lesson._id}
                  active={activeLesson && activeLesson._id === lesson._id}
                  disabled={!canView}
                  onClick={() => handleLessonClick(lesson)}
                >
                  <LessonItemTitle>{lesson.title}</LessonItemTitle>
                  <LessonItemMeta>
                    {typeof lesson.durationInMinutes === "number"
                      ? `${lesson.durationInMinutes} min`
                      : "Duration not set"}
                  </LessonItemMeta>

                  <LessonTagRow>
                    {lesson.isPreview && <LessonTag>Preview</LessonTag>}
                    {lesson.isPublished ? (
                      <LessonTag>Published</LessonTag>
                    ) : (
                      <LessonTag>Draft</LessonTag>
                    )}
                    {typeof lesson.order === "number" && (
                      <LessonTag>Lesson {lesson.order + 1}</LessonTag>
                    )}
                  </LessonTagRow>
                </LessonItem>
              ))}
            </LessonList>
          ) : (
            <Fallback>Loading…</Fallback>
          )}

          <SmallInfo>
            Tip: your last watched lesson is saved automatically on this device.
          </SmallInfo>
        </SidebarCard>
      </Layout>
    </Page>
  );
};

export default CoursePlayer;
