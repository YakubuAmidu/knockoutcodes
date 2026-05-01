// src/components/CourseLessons.jsx
import { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { useToast } from "./Toast";

// ===== Styled Components =====

const Wrapper = styled.section`
  margin-top: 24px;
  padding: 18px 18px 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: radial-gradient(
    circle at top left,
    ${({ theme }) => theme.colors.cocoa},
    ${({ theme }) => theme.colors.darkBrown}
  );
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
`;

const SubTitle = styled.p`
  margin: 0;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  opacity: 0.9;
`;

const LessonsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
`;

const LessonItem = styled.li`
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  background: ${({ theme }) => theme.colors.black};
  background-image: linear-gradient(
    135deg,
    rgba(214, 182, 159, 0.12),
    rgba(0, 0, 0, 0.6)
  );
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.soft};
    border-color: rgba(214, 182, 159, 0.55);
    background-image: linear-gradient(
      135deg,
      rgba(214, 182, 159, 0.2),
      rgba(0, 0, 0, 0.7)
    );
  }
`;

const IndexBubble = styled.div`
  width: 26px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radius.pill};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  background: radial-gradient(
    circle at top,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  flex-shrink: 0;
`;

const LessonMain = styled.div`
  flex: 1;
  min-width: 0;
`;

const LessonTitle = styled.div`
  font-size: 0.94rem;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LessonMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.85;
`;

const Duration = styled.span``;

const PreviewBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(214, 182, 159, 0.2);
  color: ${({ theme }) => theme.colors.ivory};
`;

const LockedBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: ${({ theme }) => theme.colors.lightBrown};
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const StatusDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.lightBrown};
`;

const RightCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
`;

const SmallText = styled.div`
  margin-top: 8px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  opacity: 0.85;
`;

const LoadingText = styled.div`
  padding: 12px 2px 4px;
  font-size: 0.86rem;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const ErrorText = styled.div`
  padding: 12px 2px 4px;
  font-size: 0.86rem;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

// ===== Helper =====
const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return "Flexible";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
};

// ===== Component =====

const CourseLessons = ({ courseId, isEnrolled = false, onSelectLesson }) => {
  const { push } = useToast();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!courseId) return;

    let isMounted = true;

    const fetchLessons = async () => {
      try {
        setLoading(true);
        setError("");

        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        const { data } = await axios.get(
          `${baseUrl}/api/v1/lessons/by-course/${courseId}`
        );

        if (!isMounted) return;

        const list = data?.data || data || [];
        setLessons(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading lessons:", err);
        const msg = "We couldn’t load the lessons for this course.";
        setError(msg);
        push({
          title: "Error loading lessons",
          description: msg,
          variant: "error",
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLessons();

    return () => {
      isMounted = false;
    };
  }, [courseId, push]);

  const handleClick = (lesson) => {
    if (typeof onSelectLesson === "function") {
      onSelectLesson(lesson);
    }
  };

  return (
    <Wrapper>
      <HeaderRow>
        <div>
          <Title>Course Lessons</Title>
          <SubTitle>
            Structured rounds you can follow step by step – just like training
            in the gym.
          </SubTitle>
        </div>
      </HeaderRow>

      {loading && <LoadingText>Loading lessons…</LoadingText>}
      {error && !loading && <ErrorText>{error}</ErrorText>}

      {!loading && !error && lessons.length === 0 && (
        <LoadingText>No lessons added yet for this course.</LoadingText>
      )}

      {!loading && !error && lessons.length > 0 && (
        <>
          <LessonsList>
            {lessons.map((lesson, index) => {
              const durationLabel = formatDuration(lesson.durationInMinutes);
              const locked =
                !isEnrolled && !lesson.isPreview && lesson.isPublished !== false;

              return (
                <LessonItem
                  key={lesson._id || index}
                  onClick={() => handleClick(lesson)}
                >
                  <IndexBubble>{index + 1}</IndexBubble>

                  <LessonMain>
                    <LessonTitle>{lesson.title}</LessonTitle>
                    <LessonMetaRow>
                      <Duration>{durationLabel}</Duration>
                      {lesson.isPreview && <PreviewBadge>Preview</PreviewBadge>}
                      {locked && (
                        <LockedBadge>
                          <span>🔒</span> Enroll to unlock
                        </LockedBadge>
                      )}
                    </LessonMetaRow>
                  </LessonMain>

                  <RightCol>
                    {lesson.order !== undefined && (
                      <LessonMetaRow>
                        <StatusDot /> <span>Lesson {lesson.order}</span>
                      </LessonMetaRow>
                    )}
                  </RightCol>
                </LessonItem>
              );
            })}
          </LessonsList>

          <SmallText>
            🔔 Tip: Use the first preview lessons to hook your audience, then
            stack advanced rounds behind enrollment.
          </SmallText>
        </>
      )}
    </Wrapper>
  );
};

export default CourseLessons;
