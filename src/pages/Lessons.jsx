import { useEffect, useMemo, useState, useCallback } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { useToast } from "../components/Toast";

/* =========================
   Luxury Styles (theme-based)
========================= */
const Page = styled.main`
  min-height: 100vh;
  padding: 92px 16px 70px;
  background: ${({ theme }) =>
    `radial-gradient(1200px 520px at 18% 0%, ${theme.colors.lightBrown}22 0%, transparent 60%),
     radial-gradient(900px 520px at 82% 10%, ${theme.colors.cocoa}55 0%, transparent 55%),
     linear-gradient(180deg, ${theme.colors.black} 0%, ${theme.colors.darkBrown} 120%)`};
  color: ${({ theme }) => theme.colors.white};
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Header = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
`;

const KickerRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const Badge = styled.span`
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  font-size: 26px;
  line-height: 1.15;
  margin: 0;
`;

const Sub = styled.p`
  margin: 0;
  max-width: 70ch;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr);
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  overflow: hidden;
`;

const CardHead = styled.div`
  padding: 14px 14px 10px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.02em;
`;

const Meta = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
`;

const List = styled.ul`
  margin: 0;
  padding: 10px 12px 12px;
  list-style: none;
  display: grid;
  gap: 10px;
`;

const LessonRow = styled.li`
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"};
  background: ${({ $active }) =>
    $active ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.18)"};
  padding: 12px;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.58 : 1)};
  transition:
    transform 0.18s ease-out,
    border-color 0.18s ease-out,
    background 0.18s ease-out;

  &:hover {
    transform: ${({ $disabled }) => ($disabled ? "none" : "translateY(-1px)")};
    border-color: ${({ $disabled }) =>
      $disabled ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.22)"};
    background: ${({ $disabled }) =>
      $disabled ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.07)"};
  }
`;

const LessonTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
`;

const LessonName = styled.div`
  font-weight: 700;
  font-size: 13px;
`;

const LessonTime = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
`;

const LessonDesc = styled.div`
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.35;
`;

const TagRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const Tag = styled.span`
  padding: 5px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.18);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const SideBody = styled.div`
  padding: 14px;
  display: grid;
  gap: 10px;
`;

const CTA = styled.button`
  width: 100%;
  border: 0;
  padding: 12px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.ivory};
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.brown},
    ${({ theme }) => theme.colors.cocoa}
  );
  box-shadow: ${({ theme }) => theme.shadow.hard};
  transition:
    transform 0.18s ease-out,
    opacity 0.18s ease-out;

  &:hover {
    transform: translateY(-1px);
    opacity: 0.96;
  }
`;

const Note = styled.p`
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.45;
`;

const Tiny = styled.p`
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
`;

export default function Lessons() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);

  const [access, setAccess] = useState({ allowed: false, mode: "preview" });

  const countText = useMemo(() => {
    const n = lessons.length;
    return `${n} lesson${n === 1 ? "" : "s"}`;
  }, [lessons]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [cRes, lRes] = await Promise.all([
        axiosInstance.get(`/courses/${courseId}`),
        axiosInstance.get(`/lessons/by-course/${courseId}`),
      ]);

      if (cRes.data?.success && cRes.data?.course) {
        setCourse(cRes.data.course);
      } else {
        toast.showToast("Unable to load course.", "error");
      }

      if (lRes.data?.success) {
        const list = Array.isArray(lRes.data.data) ? lRes.data.data : [];
        setLessons(list);
        setAccess(lRes.data.access || { allowed: false, mode: "preview" });
        if (list[0]?._id) setActiveId(list[0]._id);
      } else {
        toast.showToast("Unable to load lessons.", "error");
      }
    } catch (err) {
      toast.showToast(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load lessons.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openPlayer = (lesson) => {
    if (!lesson?._id) return;

    // If preview mode and user clicked non-preview (shouldn't be returned by backend, but safe)
    if (access?.mode === "preview" && !lesson.isPreview && !course?.isFree) {
      toast.showToast(
        "This lesson is locked. Unlock membership to watch.",
        "error",
      );
      return;
    }

    setActiveId(lesson._id);
    navigate(`/course-player/${courseId}`, { replace: false });
  };

  const goMembership = () => {
    navigate(`/subscription?courseId=${courseId}`, { replace: false });
  };

  if (loading && !course) {
    return (
      <Page>
        <Inner>
          <Note>Loading lessons…</Note>
        </Inner>
      </Page>
    );
  }

  return (
    <Page>
      <Inner>
        <Header>
          <KickerRow>
            <Badge>Lessons</Badge>
            <Badge>
              {access?.mode === "unlocked" || course?.isFree
                ? "Unlocked"
                : "Preview"}
            </Badge>
            <Badge>{countText}</Badge>
          </KickerRow>

          <Title>{course?.title || "Course"}</Title>

          <Sub>
            {course?.isFree
              ? "This is a free course. Enjoy full access to all published lessons."
              : access?.mode === "unlocked"
                ? "You have access. Pick a lesson and continue learning."
                : "Preview mode: you can watch preview lessons. Unlock membership to watch the full course."}
          </Sub>
        </Header>

        <Grid>
          <Card>
            <CardHead>
              <CardTitle>Lesson list</CardTitle>
              <Meta>{loading ? "Loading…" : countText}</Meta>
            </CardHead>

            <List>
              {!loading && lessons.length === 0 ? (
                <Note style={{ padding: 12 }}>
                  No lessons have been added yet.
                </Note>
              ) : (
                lessons.map((lesson) => {
                  const disabled =
                    !course?.isFree &&
                    access?.mode === "preview" &&
                    !lesson.isPreview;
                  return (
                    <LessonRow
                      key={lesson._id}
                      $active={activeId === lesson._id}
                      $disabled={disabled}
                      onClick={() => !disabled && openPlayer(lesson)}
                      role="button"
                      tabIndex={0}
                    >
                      <LessonTop>
                        <LessonName>{lesson.title}</LessonName>
                        <LessonTime>
                          {typeof lesson.durationInMinutes === "number"
                            ? `${lesson.durationInMinutes} min`
                            : "—"}
                        </LessonTime>
                      </LessonTop>

                      {lesson.description ? (
                        <LessonDesc>{lesson.description}</LessonDesc>
                      ) : (
                        <LessonDesc style={{ opacity: 0.7 }}>
                          No description yet.
                        </LessonDesc>
                      )}

                      <TagRow>
                        {lesson.isPreview && <Tag>Preview</Tag>}
                        {lesson.isPublished ? (
                          <Tag>Published</Tag>
                        ) : (
                          <Tag>Draft</Tag>
                        )}
                        {typeof lesson.order === "number" && (
                          <Tag>Lesson {lesson.order + 1}</Tag>
                        )}
                      </TagRow>
                    </LessonRow>
                  );
                })
              )}
            </List>
          </Card>

          <Card>
            <CardHead>
              <CardTitle>Access</CardTitle>
              <Meta>
                {course?.isFree
                  ? "Free"
                  : access?.mode === "unlocked"
                    ? "Active"
                    : "Locked"}
              </Meta>
            </CardHead>

            <SideBody>
              {!course?.isFree && access?.mode !== "unlocked" ? (
                <>
                  <Note>
                    You’re currently in <b>Preview Mode</b>. Unlock membership
                    to access the full lesson library and start watching inside
                    the player.
                  </Note>
                  <CTA onClick={goMembership}>Unlock Membership</CTA>
                  <Tiny>
                    After payment, you’ll be redirected to the course player
                    automatically.
                  </Tiny>
                </>
              ) : (
                <>
                  <Note>
                    You have full access. Open the course player to start
                    watching and your progress will continue from your last
                    lesson.
                  </Note>
                  <CTA onClick={() => navigate(`/course-player/${courseId}`)}>
                    Go to Course Player
                  </CTA>
                  <Tiny>
                    Tip: preview lessons are marked clearly so users always
                    understand what’s unlocked.
                  </Tiny>
                </>
              )}
            </SideBody>
          </Card>
        </Grid>
      </Inner>
    </Page>
  );
}
