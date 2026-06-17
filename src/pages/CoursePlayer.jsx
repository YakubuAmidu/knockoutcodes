// src/pages/CoursePlayer.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import ReviewForm from "../components/ReviewForm";
import { useToast } from "../components/Toast";

const PROGRESS_SAVE_INTERVAL_MS = 12000;

function clampNumber(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function formatMinutes(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return "Duration not set";

  const hrs = Math.floor(n / 60);
  const mins = Math.round(n % 60);

  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins} min`;
}

function isSafeVideoUrl(url) {
  const value = String(url || "").trim();

  return (
    /^https?:\/\//i.test(value) ||
    value.startsWith("/uploads/") ||
    value.startsWith("/videos/")
  );
}

function isDirectVideo(url) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(url || ""));
}

function getEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || !isSafeVideoUrl(raw)) return "";

  try {
    const parsed = new URL(raw, window.location.origin);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");

      if (videoId) return `https://www.youtube.com/embed/${videoId}`;

      if (parsed.pathname.includes("/shorts/")) {
        const id = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }

      if (parsed.pathname.includes("/embed/")) return raw;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }

    return raw;
  } catch {
    return raw;
  }
}

const CoursePlayer = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const videoRef = useRef(null);
  const lastProgressSentRef = useRef(0);
  const lastSavedSecondsRef = useRef(0);

  const routeLessonId = location?.state?.lessonId || "";

  const notify = useCallback(
    (message, type = "error") => {
      if (toast?.showToast) {
        toast.showToast(message, type);
        return;
      }

      toast?.push?.({
        title: type === "error" ? "Course Player" : "Success",
        description: message,
        variant: type,
      });
    },
    [toast],
  );

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);

  const [courseLoading, setCourseLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  const [accessChecked, setAccessChecked] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(false);

  const [courseProgress, setCourseProgress] = useState(0);
  const [lessonProgressMap, setLessonProgressMap] = useState({});

  const resumeKey = useMemo(
    () => (courseId ? `course_resume_${courseId}` : ""),
    [courseId],
  );

  const lessonTimeKey = useMemo(
    () =>
      courseId && activeLesson?._id
        ? `course_time_${courseId}_${activeLesson._id}`
        : "",
    [courseId, activeLesson?._id],
  );

  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => {
      const ao = typeof a.order === "number" ? a.order : 999999;
      const bo = typeof b.order === "number" ? b.order : 999999;
      return ao - bo;
    });
  }, [lessons]);

  const activeIndex = useMemo(() => {
    if (!activeLesson?._id) return -1;
    return sortedLessons.findIndex(
      (lesson) => String(lesson._id) === String(activeLesson._id),
    );
  }, [activeLesson, sortedLessons]);

  const activeLessonProgress = useMemo(() => {
    if (!activeLesson?._id) return 0;
    return clampNumber(lessonProgressMap[activeLesson._id] || 0);
  }, [activeLesson?._id, lessonProgressMap]);

  const completedLessonsCount = useMemo(() => {
    return sortedLessons.filter((lesson) => {
      const value = clampNumber(lessonProgressMap[lesson._id] || 0);
      return value >= 90;
    }).length;
  }, [sortedLessons, lessonProgressMap]);

  const calculatedProgress = useMemo(() => {
    if (Number.isFinite(Number(courseProgress)) && Number(courseProgress) > 0) {
      return clampNumber(courseProgress);
    }

    if (!sortedLessons.length) return 0;

    return clampNumber((completedLessonsCount / sortedLessons.length) * 100);
  }, [courseProgress, sortedLessons.length, completedLessonsCount]);

  const canView = Boolean(course?.isFree || accessAllowed);

  const hasCompletedCourse = Boolean(
    sortedLessons.length > 0 &&
    completedLessonsCount === sortedLessons.length &&
    calculatedProgress >= 90,
  );

  const canReview = Boolean(canView && course?._id && hasCompletedCourse);

  const canSaveProgress = Boolean(accessAllowed && activeLesson?._id);

  const loadCourse = useCallback(async () => {
    try {
      setCourseLoading(true);

      if (!courseId) {
        notify("Course ID is missing.", "error");
        navigate("/my-courses");
        return;
      }

      const res = await axiosInstance.get(
        `/courses/player/${encodeURIComponent(courseId)}`,
      );

      const loadedCourse = res.data?.data || res.data?.course || null;
      const loadedEnrollment = res.data?.enrollment || null;

      if (res.data?.success && loadedCourse) {
        setCourse(loadedCourse);

        if (Number.isFinite(Number(loadedEnrollment?.progressPercent))) {
          setCourseProgress(clampNumber(loadedEnrollment.progressPercent));
        }
      } else {
        notify("Unable to load course.", "error");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load course.";

      notify(msg, "error");
    } finally {
      setCourseLoading(false);
    }
  }, [courseId, navigate, notify]);

  const loadLessons = useCallback(async () => {
    try {
      setLessonsLoading(true);

      if (!courseId) {
        notify("Course ID is missing.", "error");
        return;
      }

      const res = await axiosInstance.get(
        `/lessons/by-course/${encodeURIComponent(courseId)}`,
      );

      if (res.data?.success) {
        const list = Array.isArray(res.data?.lessons)
          ? res.data.lessons
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

        const allowed = Boolean(
          res.data?.access?.allowed ||
          res.data?.hasAccess ||
          res.data?.isEnrolled ||
          course?.isFree,
        );

        setAccessAllowed(allowed);
        setAccessChecked(true);

        const sorted = [...list].sort((a, b) => {
          const ao = typeof a.order === "number" ? a.order : 999999;
          const bo = typeof b.order === "number" ? b.order : 999999;
          return ao - bo;
        });

        setLessons(sorted);

        const initialProgress = {};
        sorted.forEach((lesson) => {
          if (Number.isFinite(Number(lesson?.progressPercent))) {
            initialProgress[lesson._id] = clampNumber(lesson.progressPercent);
          }
        });

        setLessonProgressMap((prev) => ({
          ...initialProgress,
          ...prev,
        }));

        let nextActive = sorted[0] || null;

        if (routeLessonId) {
          const fromRoute = sorted.find(
            (lesson) => String(lesson._id) === String(routeLessonId),
          );
          if (fromRoute) nextActive = fromRoute;
        } else if (resumeKey) {
          const savedId = localStorage.getItem(resumeKey);
          if (savedId) {
            const found = sorted.find(
              (lesson) => String(lesson._id) === String(savedId),
            );
            if (found) nextActive = found;
          }
        }

        setActiveLesson(nextActive);
      } else {
        notify("Unable to load lessons.", "error");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load lessons.";

      notify(msg, "error");
    } finally {
      setLessonsLoading(false);
    }
  }, [courseId, course?.isFree, resumeKey, routeLessonId, notify]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    const init = async () => {
      if (!course) return;

      if (course.isFree) {
        setAccessAllowed(true);
        setAccessChecked(true);
      }

      await loadLessons();
    };

    void init();
  }, [course, loadLessons]);

  useEffect(() => {
    if (!resumeKey || !activeLesson?._id) return;
    localStorage.setItem(resumeKey, activeLesson._id);
  }, [activeLesson, resumeKey]);

  useEffect(() => {
    lastProgressSentRef.current = 0;
    lastSavedSecondsRef.current = 0;
  }, [activeLesson?._id]);

  const updateLocalLessonProgress = useCallback(
    (watchedSeconds, durationSeconds) => {
      if (!activeLesson?._id || !durationSeconds) return;

      const percent = clampNumber((watchedSeconds / durationSeconds) * 100);

      setLessonProgressMap((prev) => ({
        ...prev,
        [activeLesson._id]: Math.max(
          clampNumber(prev[activeLesson._id] || 0),
          percent,
        ),
      }));

      if (lessonTimeKey) {
        localStorage.setItem(lessonTimeKey, String(Math.floor(watchedSeconds)));
      }
    },
    [activeLesson?._id, lessonTimeKey],
  );

  const sendLessonProgress = useCallback(
    async (videoElement, force = false) => {
      if (!activeLesson?._id || !canView || !canSaveProgress || !videoElement) {
        return;
      }

      const watchedSeconds = Math.floor(videoElement.currentTime || 0);
      const durationSeconds = Math.floor(videoElement.duration || 0);

      if (!watchedSeconds || !durationSeconds) return;

      updateLocalLessonProgress(watchedSeconds, durationSeconds);

      const now = Date.now();
      const watchedDelta = Math.abs(
        watchedSeconds - lastSavedSecondsRef.current,
      );

      if (
        !force &&
        now - lastProgressSentRef.current < PROGRESS_SAVE_INTERVAL_MS &&
        watchedDelta < 10
      ) {
        return;
      }

      lastProgressSentRef.current = now;
      lastSavedSecondsRef.current = watchedSeconds;

      try {
        const { data } = await axiosInstance.put(
          `/lessons/progress/${encodeURIComponent(activeLesson._id)}`,
          {
            watchedSeconds,
            durationSeconds,
          },
        );

        if (data?.data?.attemptedSkip || data?.accepted === false) {
          notify(
            data?.message ||
              "Please watch the lesson normally before it can be marked complete.",
            "error",
          );
        }

        const nextCourseProgress =
          data?.data?.enrollmentProgressPercent ||
          data?.enrollmentProgressPercent ||
          data?.progressPercent;

        if (Number.isFinite(Number(nextCourseProgress))) {
          setCourseProgress(clampNumber(nextCourseProgress));
        }

        const completed =
          durationSeconds > 0 && watchedSeconds / durationSeconds >= 0.9;

        setLessonProgressMap((prev) => ({
          ...prev,
          [activeLesson._id]: completed
            ? 100
            : Math.max(
                clampNumber(prev[activeLesson._id] || 0),
                clampNumber((watchedSeconds / durationSeconds) * 100),
              ),
        }));
      } catch (error) {
        console.error("Failed to update lesson progress:", error?.message);
      }
    },
    [
      activeLesson?._id,
      canView,
      canSaveProgress,
      updateLocalLessonProgress,
      notify,
    ],
  );

  const handleLoadedMetadata = useCallback(
    (event) => {
      const video = event.currentTarget;
      if (!lessonTimeKey || !video) return;

      const savedSeconds = Number(localStorage.getItem(lessonTimeKey) || 0);

      if (
        Number.isFinite(savedSeconds) &&
        savedSeconds > 3 &&
        Number.isFinite(video.duration) &&
        savedSeconds < video.duration - 5
      ) {
        video.currentTime = savedSeconds;
      }
    },
    [lessonTimeKey],
  );

  const handleLessonClick = (lesson) => {
    if (!lesson) return;

    if (!accessAllowed && !course?.isFree) {
      notify("Unlock this course with an active membership.", "error");
      return;
    }

    if (lesson?.isLocked || !lesson?.videoUrl) {
      notify("This lesson is not available yet.", "error");
      return;
    }

    setActiveLesson(lesson);
  };

  const goToNextLesson = () => {
    if (activeIndex < 0) return;
    const next = sortedLessons[activeIndex + 1];
    if (next) setActiveLesson(next);
  };

  const goToPreviousLesson = () => {
    if (activeIndex < 0) return;
    const previous = sortedLessons[activeIndex - 1];
    if (previous) setActiveLesson(previous);
  };

  const getVideoSrc = () => {
    const src = activeLesson?.videoUrl || course?.promoVideo || "";
    return isSafeVideoUrl(src) ? src : "";
  };

  const renderVideo = () => {
    if (!course) {
      return (
        <VideoWrapper>
          <VideoFallback>
            <FallbackTitle>Loading course...</FallbackTitle>
          </VideoFallback>
        </VideoWrapper>
      );
    }

    if (!course.isFree && accessChecked && !accessAllowed) {
      return (
        <VideoWrapper>
          <VideoFallback>
            <LockIcon>🔒</LockIcon>
            <FallbackTitle>This course is locked</FallbackTitle>
            <FallbackText>
              Get access through enrollment or an active membership to watch the
              full lesson library.
            </FallbackText>
          </VideoFallback>
        </VideoWrapper>
      );
    }

    const videoSrc = getVideoSrc();

    if (!videoSrc) {
      return (
        <VideoWrapper>
          <VideoFallback>
            <LockIcon>🎬</LockIcon>
            <FallbackTitle>No video added yet</FallbackTitle>
            <FallbackText>
              This lesson is ready in your library, but the video URL has not
              been added yet.
            </FallbackText>
          </VideoFallback>
        </VideoWrapper>
      );
    }

    const embedUrl = getEmbedUrl(videoSrc);
    const direct =
      isDirectVideo(videoSrc) ||
      videoSrc.startsWith("/uploads/") ||
      videoSrc.startsWith("/videos/");

    if (!direct && embedUrl) {
      return (
        <VideoWrapper>
          <VideoFrame
            src={embedUrl}
            title={activeLesson?.title || course?.title || "Course video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </VideoWrapper>
      );
    }

    return (
      <VideoWrapper>
        <Video
          key={activeLesson?._id || videoSrc}
          ref={videoRef}
          controls
          controlsList="nodownload"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={(event) =>
            sendLessonProgress(event.currentTarget, false)
          }
          onPause={(event) => sendLessonProgress(event.currentTarget, true)}
          onEnded={(event) => {
            sendLessonProgress(event.currentTarget, true);
            const next = sortedLessons[activeIndex + 1];
            if (next) setActiveLesson(next);
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </Video>
      </VideoWrapper>
    );
  };

  if (courseLoading && !course) {
    return (
      <Page>
        <LoadingShell>
          <Spinner />
          <LoadingTitle>Loading Course Player...</LoadingTitle>
          <LoadingText>Preparing your premium training room.</LoadingText>
        </LoadingShell>
      </Page>
    );
  }

  if (!course) {
    return (
      <Page>
        <EmptyShell>
          <EmptyIcon>🥊</EmptyIcon>
          <LoadingTitle>Course not found</LoadingTitle>
          <LoadingText>
            This course could not be loaded. Please return to your courses and
            try again.
          </LoadingText>
          <PrimaryButton type="button" onClick={() => navigate("/my-courses")}>
            Back to My Courses
          </PrimaryButton>
        </EmptyShell>
      </Page>
    );
  }

  return (
    <Page>
      <Hero>
        <BackButton type="button" onClick={() => navigate("/my-courses")}>
          ← My Courses
        </BackButton>

        <HeroInfo>
          <Eyebrow>KnockoutCodes Course Player</Eyebrow>
          <HeroTitle>{course.title}</HeroTitle>
          <HeroText>
            {!accessChecked
              ? "Checking your access..."
              : canView
                ? activeLesson
                  ? `Now playing: ${activeLesson.title}`
                  : "Select a lesson and continue your training."
                : "This course is locked. Unlock access to continue."}
          </HeroText>

          <HeroBadges>
            {course.level ? <HeroBadge>{course.level}</HeroBadge> : null}
            {course.category ? <HeroBadge>{course.category}</HeroBadge> : null}
            <HeroBadge>
              {course.isFree ? "Free Course" : "Premium Access"}
            </HeroBadge>
            <HeroBadge>
              {sortedLessons.length} Lesson
              {sortedLessons.length === 1 ? "" : "s"}
            </HeroBadge>
          </HeroBadges>
        </HeroInfo>

        <ProgressCard>
          <ProgressTop>
            <span>Course Progress</span>
            <strong>{Math.round(calculatedProgress)}%</strong>
          </ProgressTop>
          <ProgressTrack>
            <ProgressFill $value={calculatedProgress} />
          </ProgressTrack>
          <ProgressSmall>
            {activeIndex >= 0
              ? `Lesson ${activeIndex + 1} of ${sortedLessons.length} • ${Math.round(
                  activeLessonProgress,
                )}% watched`
              : "Choose a lesson to begin"}
          </ProgressSmall>
        </ProgressCard>
      </Hero>

      <Layout>
        <MainColumn>
          <PlayerCard>
            <PlayerTop>
              <NowPlaying>
                <SmallLabel>Now Playing</SmallLabel>
                <PlayerTitle>
                  {activeLesson?.title || course.title || "Course Preview"}
                </PlayerTitle>
              </NowPlaying>

              <PlayerPill>
                {!accessChecked
                  ? "Checking"
                  : canView
                    ? "Access Granted"
                    : "Locked"}
              </PlayerPill>
            </PlayerTop>

            {renderVideo()}

            {canView && activeLesson ? (
              <WatchProgressBox>
                <ProgressTop>
                  <span>Current Lesson Progress</span>
                  <strong>{Math.round(activeLessonProgress)}%</strong>
                </ProgressTop>
                <ProgressTrack>
                  <ProgressFill $value={activeLessonProgress} />
                </ProgressTrack>
              </WatchProgressBox>
            ) : null}

            <LessonControlRow>
              <ControlButton
                type="button"
                onClick={goToPreviousLesson}
                disabled={!canView || activeIndex <= 0}
              >
                Previous
              </ControlButton>

              <ControlButton
                type="button"
                onClick={goToNextLesson}
                disabled={
                  !canView ||
                  activeIndex < 0 ||
                  activeIndex >= sortedLessons.length - 1
                }
              >
                Next Lesson
              </ControlButton>
            </LessonControlRow>

            {canView && activeLesson ? (
              <LessonDetails>
                <DetailsHeader>
                  <div>
                    <SmallLabel>Lesson Details</SmallLabel>
                    <DetailsTitle>{activeLesson.title}</DetailsTitle>
                  </div>

                  <DetailsMeta>
                    {formatMinutes(activeLesson.durationInMinutes)}
                  </DetailsMeta>
                </DetailsHeader>

                <DetailsText>
                  {activeLesson.description ||
                    "No lesson description has been added yet. Watch the video and follow the training instructions carefully."}
                </DetailsText>
              </LessonDetails>
            ) : null}

            {!canView ? (
              <LockedPanel>
                <LockedTitle>Unlock this course</LockedTitle>
                <LockedText>
                  Your access is protected by your enrollment or active
                  membership. Choose a plan to continue training.
                </LockedText>
                <PrimaryButton
                  type="button"
                  onClick={() =>
                    navigate(
                      `/memberships?courseId=${encodeURIComponent(courseId)}`,
                      { replace: false },
                    )
                  }
                >
                  Go to Memberships
                </PrimaryButton>
              </LockedPanel>
            ) : null}

            {canReview ? (
              <ReviewBox>
                <ReviewEyebrow>Student Review</ReviewEyebrow>
                <ReviewHeading>Tell the next student the truth.</ReviewHeading>
                <ReviewText>
                  Your feedback helps future students know if this course is
                  worth their time, discipline, and money.
                </ReviewText>

                <ReviewForm
                  courseId={course._id}
                  courseTitle={course.title || "this course"}
                  canReview={canReview}
                  reviewGateMessage="Finish watching the free course to the end before leaving a verified review."
                />
              </ReviewBox>
            ) : null}
          </PlayerCard>
        </MainColumn>

        <Sidebar>
          <SidebarCard>
            <SidebarHeader>
              <div>
                <SmallLabel>Course Curriculum</SmallLabel>
                <SidebarTitle>Lessons</SidebarTitle>
              </div>

              <SidebarCount>
                {!accessChecked
                  ? "Checking..."
                  : !course.isFree && !accessAllowed
                    ? "Locked"
                    : lessonsLoading
                      ? "Loading..."
                      : `${sortedLessons.length}`}
              </SidebarCount>
            </SidebarHeader>

            {!accessChecked ? (
              <SideState>Checking access...</SideState>
            ) : !course.isFree && !accessAllowed ? (
              <SideState>
                Lessons are locked until you have enrollment or an active
                membership.
              </SideState>
            ) : sortedLessons.length === 0 && !lessonsLoading ? (
              <SideState>No lessons have been added yet.</SideState>
            ) : sortedLessons.length > 0 ? (
              <LessonList>
                {sortedLessons.map((lesson, index) => {
                  const active = activeLesson?._id === lesson._id;
                  const progress = clampNumber(
                    lessonProgressMap[lesson._id] || 0,
                  );
                  const complete = progress >= 90;

                  return (
                    <LessonItem
                      key={lesson._id}
                      $active={active}
                      $disabled={!canView || lesson?.isLocked}
                      onClick={() => handleLessonClick(lesson)}
                    >
                      <LessonNumber $active={active}>
                        {complete ? "✓" : String(index + 1).padStart(2, "0")}
                      </LessonNumber>

                      <LessonContent>
                        <LessonItemTitle>{lesson.title}</LessonItemTitle>
                        <LessonItemMeta>
                          {formatMinutes(lesson.durationInMinutes)}
                        </LessonItemMeta>

                        <MiniProgressTrack>
                          <MiniProgressFill $value={progress} />
                        </MiniProgressTrack>

                        <LessonTagRow>
                          {lesson.isPreview ? (
                            <LessonTag>Preview</LessonTag>
                          ) : null}
                          {complete ? <LessonTag>Completed</LessonTag> : null}
                          {active ? <LessonTag>Playing</LessonTag> : null}
                          {lesson?.isLocked ? (
                            <LessonTag>Locked</LessonTag>
                          ) : null}
                        </LessonTagRow>
                      </LessonContent>
                    </LessonItem>
                  );
                })}
              </LessonList>
            ) : (
              <SideState>Loading lessons...</SideState>
            )}

            <TipBox>
              <TipTitle>Smart Progress</TipTitle>
              <TipText>
                Direct video lessons save watch progress automatically. YouTube
                and Vimeo lessons can play, but exact second-by-second progress
                depends on direct video tracking.
              </TipText>
            </TipBox>
          </SidebarCard>
        </Sidebar>
      </Layout>
    </Page>
  );
};

export default CoursePlayer;

/* ============================
   Styled Components
============================ */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.main`
  width: 100%;
  min-height: 100vh;
  padding: 96px 16px 56px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(
      circle at 15% 8%,
      rgba(214, 182, 159, 0.18),
      transparent 34%
    ),
    radial-gradient(circle at 88% 15%, rgba(90, 56, 37, 0.34), transparent 36%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown}
    );
`;

const Hero = styled.section`
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto 18px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 20px;
  display: grid;
  grid-template-columns: auto 1fr 320px;
  gap: 18px;
  align-items: center;
  background: linear-gradient(
    145deg,
    rgba(61, 38, 26, 0.74),
    rgba(0, 0, 0, 0.58)
  );
  border: 1px solid rgba(255, 249, 242, 0.11);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const BackButton = styled.button`
  width: fit-content;
  border: 1px solid rgba(255, 249, 242, 0.18);
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 11px 14px;
  background: rgba(0, 0, 0, 0.36);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  font-weight: 950;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;

  &:hover {
    border-color: rgba(214, 182, 159, 0.55);
    background: rgba(0, 0, 0, 0.55);
  }
`;

const HeroInfo = styled.div`
  min-width: 0;
`;

const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const HeroTitle = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 0.98;
  font-weight: 950;
  letter-spacing: -0.05em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const HeroText = styled.p`
  max-width: 760px;
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;
  font-size: 14px;
  line-height: 1.65;
`;

const HeroBadges = styled.div`
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const HeroBadge = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 7px 10px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(214, 182, 159, 0.18);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ProgressCard = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 16px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const ProgressTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;

  span {
    opacity: 0.82;
    font-weight: 900;
  }

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
  width: ${({ $value }) => `${clampNumber($value)}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  transition: width 0.22s ease;
`;

const ProgressSmall = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.68;
`;

const Layout = styled.section`
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(320px, 0.9fr);
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const MainColumn = styled.section`
  min-width: 0;
`;

const Sidebar = styled.aside`
  min-width: 0;
`;

const PlayerCard = styled.article`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background: linear-gradient(
    180deg,
    rgba(47, 27, 18, 0.96),
    rgba(0, 0, 0, 0.68)
  );
  border: 1px solid rgba(255, 249, 242, 0.11);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  animation: ${fadeUp} 0.35s ease both;
`;

const SidebarCard = styled(PlayerCard)`
  position: sticky;
  top: 92px;
  max-height: calc(100vh - 112px);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  @media (max-width: 980px) {
    position: static;
    max-height: none;
  }
`;

const PlayerTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 14px;

  @media (max-width: 620px) {
    flex-direction: column;
  }
`;

const NowPlaying = styled.div`
  min-width: 0;
`;

const SmallLabel = styled.p`
  margin: 0 0 5px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.13em;
  text-transform: uppercase;
`;

const PlayerTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.35rem, 2vw, 2rem);
  line-height: 1.1;
  font-weight: 950;
  letter-spacing: -0.03em;
`;

const PlayerPill = styled.span`
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 11px;
  color: ${({ theme }) => theme.colors.black};
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const VideoWrapper = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: radial-gradient(circle at 0 0, #242424, #000000);
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.54);
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  display: block;
  background: #000000;
`;

const VideoFrame = styled.iframe`
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
  background: #000;
`;

const VideoFallback = styled.div`
  width: 100%;
  height: 100%;
  min-height: 300px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 22px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(
      circle at 20% 0%,
      rgba(214, 182, 159, 0.22),
      transparent 38%
    ),
    rgba(0, 0, 0, 0.74);
`;

const LockIcon = styled.div`
  font-size: 42px;
  margin-bottom: 10px;
`;

const FallbackTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 950;
`;

const FallbackText = styled.p`
  max-width: 460px;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.76;
  line-height: 1.6;
  font-size: 14px;
`;

const WatchProgressBox = styled.div`
  margin-top: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(214, 182, 159, 0.14);
`;

const LessonControlRow = styled.div`
  margin-top: 14px;
  display: flex;
  gap: 10px;
  justify-content: space-between;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const ControlButton = styled.button`
  min-height: 42px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.22);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 11px;

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    border-color: rgba(214, 182, 159, 0.56);
    background: rgba(214, 182, 159, 0.08);
  }
`;

const LessonDetails = styled.section`
  margin-top: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 16px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const DetailsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;

  @media (max-width: 580px) {
    flex-direction: column;
  }
`;

const DetailsTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 18px;
  font-weight: 950;
`;

const DetailsMeta = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 7px 10px;
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.lightBrown};
  border: 1px solid rgba(214, 182, 159, 0.18);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
`;

const DetailsText = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  line-height: 1.7;
  font-size: 14px;
`;

const LockedPanel = styled.section`
  margin-top: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background: linear-gradient(
    145deg,
    rgba(61, 38, 26, 0.72),
    rgba(0, 0, 0, 0.48)
  );
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const LockedTitle = styled.h3`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 20px;
  font-weight: 950;
`;

const LockedText = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  line-height: 1.6;
  font-size: 14px;
`;

const PrimaryButton = styled.button`
  min-height: 44px;
  width: 100%;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
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
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 249, 242, 0.1);
`;

const SidebarTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  font-weight: 950;
`;

const SidebarCount = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 7px 10px;
  color: ${({ theme }) => theme.colors.black};
  background: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
`;

const LessonList = styled.ul`
  list-style: none;
  padding: 12px 0 0;
  margin: 0;
  overflow: auto;
  display: grid;
  gap: 9px;
`;

const LessonItem = styled.li`
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 11px;
  align-items: flex-start;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 12px;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  background: ${({ $active }) =>
    $active ? "rgba(214, 182, 159, 0.14)" : "rgba(0, 0, 0, 0.22)"};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214, 182, 159, 0.45)" : "rgba(255, 249, 242, 0.09)"};
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease;

  &:hover {
    transform: ${({ $disabled }) => ($disabled ? "none" : "translateY(-1px)")};
    border-color: ${({ $disabled }) =>
      $disabled ? "rgba(255, 249, 242, 0.09)" : "rgba(214, 182, 159, 0.34)"};
  }
`;

const LessonNumber = styled.span`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: grid;
  place-items: center;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.black : theme.colors.ivory};
  background: ${({ theme, $active }) =>
    $active
      ? `linear-gradient(130deg, ${theme.colors.lightBrown}, ${theme.colors.ivory})`
      : "rgba(0, 0, 0, 0.32)"};
  border: 1px solid rgba(255, 249, 242, 0.1);
  font-size: 12px;
  font-weight: 950;
`;

const LessonContent = styled.div`
  min-width: 0;
`;

const LessonItemTitle = styled.span`
  display: block;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13.5px;
  font-weight: 950;
  line-height: 1.3;
`;

const LessonItemMeta = styled.span`
  display: block;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.62;
  font-size: 11px;
  margin-top: 4px;
`;

const MiniProgressTrack = styled.div`
  margin-top: 8px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  overflow: hidden;
  background: rgba(255, 249, 242, 0.12);
`;

const MiniProgressFill = styled.div`
  width: ${({ $value }) => `${clampNumber($value)}%`};
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
`;

const LessonTagRow = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const LessonTag = styled.span`
  font-size: 10px;
  padding: 4px 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const SideState = styled.div`
  margin-top: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.76;
  line-height: 1.55;
  font-size: 13px;
`;

const TipBox = styled.div`
  margin-top: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(214, 182, 159, 0.08);
  border: 1px solid rgba(214, 182, 159, 0.17);
`;

const TipTitle = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const TipText = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  line-height: 1.5;
  font-size: 12.5px;
`;

const LoadingShell = styled.section`
  max-width: 560px;
  margin: 80px auto 0;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 34px 22px;
  text-align: center;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const EmptyShell = styled(LoadingShell)``;

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

const LoadingTitle = styled.h2`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  font-weight: 950;
`;

const LoadingText = styled.p`
  max-width: 460px;
  margin: 0 auto 18px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.74;
  line-height: 1.65;
  font-size: 14px;
`;

const ReviewBox = styled.section`
  margin-top: 18px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background:
    radial-gradient(
      circle at 20% 0%,
      rgba(214, 182, 159, 0.14),
      transparent 34%
    ),
    rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const ReviewEyebrow = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const ReviewHeading = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const ReviewText = styled.p`
  margin: 10px 0 16px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 13px;
  line-height: 1.7;
`;
