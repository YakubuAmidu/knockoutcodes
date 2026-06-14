import React, { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { fetchMyEnrollments } from "../reducers/enrollment/enrollmentActions";
import { useToast } from "../components/Toast";

import {
  userDashboardRequest,
  userDashboardSuccess,
  userDashboardFail,
  setDashboardTimeRange,
  markNotificationRead,
} from "../reducers/userDashboard/userDashboardActions";

import axiosInstance from "../../utils/axiosInstance";

const clampPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const fallbackNextSteps = [
  {
    title: "Continue your strongest lesson",
    desc: "Open your course library and finish the next lesson today.",
    action: "Continue Training",
    to: "/courses",
  },
  {
    title: "Build your boxing IQ",
    desc: "Review technique, footwork, defense, and champion habits.",
    action: "View Courses",
    to: "/courses",
  },
  {
    title: "Ask for support",
    desc: "Need help with access, payments, or a course? Contact the team.",
    action: "Contact Support",
    to: "/contact",
  },
];

const fallbackActivity = [
  {
    title: "Dashboard opened",
    desc: "Your KnockoutCodes training command center is ready.",
  },
  {
    title: "Progress tracking active",
    desc: "Your streak, lessons, saved items, and updates will appear here.",
  },
];

const quickActions = [
  { title: "Courses", desc: "Continue or explore training.", to: "/courses" },
  { title: "Lessons", desc: "Jump into your next lesson.", to: "/lessons" },
  { title: "Curriculum", desc: "View your full learning path.", to: "/curriculum" },
  { title: "Coaching", desc: "Book or view coaching.", to: "/coachings" },
  { title: "E-Books", desc: "Open premium guides.", to: "/ebooks" },
  { title: "Products", desc: "View training products.", to: "/products" },
];

const recommendedItems = [
  {
    title: "Footwork Before Power",
    type: "Training Blog",
    desc: "Improve balance before trying to hit harder.",
    to: "/blog",
  },
  {
    title: "Beginner Boxer Blueprint",
    type: "E-Book",
    desc: "A clean roadmap for building boxing discipline.",
    to: "/ebooks",
  },
  {
    title: "1-on-1 Coaching",
    type: "Coaching",
    desc: "Get direct help sharpening your training plan.",
    to: "/coachings",
  },
];

export default function UserDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const hasFetchedEnrollments = useRef(false);

  const {
    loading,
    error,
    timeRange,
    stats = {},
    notifications = [],
    recentActivity = [],
    nextSteps = [],
  } = useSelector((state) => state.userDashboard || {});

  const {
    myEnrollments = [],
    loading: enrollLoading,
    error: enrollError,
  } = useSelector((state) => state.enrollment || {});

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const progressPercent = clampPercent(stats?.progressPercent);

  const unreadNotifications = useMemo(
    () => safeArray(notifications).filter((n) => !n?.read).length,
    [notifications]
  );

  const activeEnrollments = useMemo(
    () =>
      safeArray(myEnrollments).filter((en) => {
        const status = String(en?.status || "active").toLowerCase();
        return status !== "cancelled" && status !== "expired";
      }),
    [myEnrollments]
  );

  const premiumNextSteps = useMemo(() => {
    const list = safeArray(nextSteps);
    return list.length ? list : fallbackNextSteps;
  }, [nextSteps]);

  const premiumActivity = useMemo(() => {
    const list = safeArray(recentActivity);
    return list.length ? list : fallbackActivity;
  }, [recentActivity]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      dispatch(userDashboardRequest());

      try {
        const res = await axiosInstance.get(`/dashboard?range=${timeRange}`, {
          signal: controller.signal,
        });

        dispatch(userDashboardSuccess(res.data));

        if (!hasFetchedRef.current) {
          showToast("Dashboard loaded", "success");
          hasFetchedRef.current = true;
        }
      } catch (err) {
        const canceled =
          err?.name === "CanceledError" || err?.code === "ERR_CANCELED";
        if (canceled) return;

        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard.";

        dispatch(userDashboardFail(message));
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchDashboard();

    return () => controller.abort();
  }, [dispatch, showToast, timeRange]);

  useEffect(() => {
    const handleAuthExpired = (e) => {
      showToast(e.detail?.message || "Session expired", "error");
      navigate("/login");
    };

    window.addEventListener("kc:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("kc:auth-expired", handleAuthExpired);
  }, [navigate, showToast]);

  useEffect(() => {
    if (hasFetchedEnrollments.current) return;
    hasFetchedEnrollments.current = true;
    dispatch(fetchMyEnrollments());
  }, [dispatch]);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  useEffect(() => {
    if (enrollError) showToast(enrollError, "error");
  }, [enrollError, showToast]);

  const onChangeRange = (range) => {
    if (range === timeRange) return;
    dispatch(setDashboardTimeRange(range));
  };

  const getCourseFromEnrollment = (en) =>
    en?.course || en?.courseId || en?.courseRef || null;

  const getCourseId = (en) => {
    const course = getCourseFromEnrollment(en);
    return course?._id || course?.id || en?.courseId || en?.course?._id || "";
  };

  const continueCourse = (en) => {
    const courseId = getCourseId(en);

    if (!courseId) {
      showToast("Course id missing. Please contact support.", "error");
      return;
    }

    navigate(`/course-player/${courseId}`);
  };

  const openFirstCourse = () => {
    if (activeEnrollments.length) {
      continueCourse(activeEnrollments[0]);
      return;
    }

    navigate("/courses");
  };

  const onOpenNotification = (item) => {
    const id = item?.id || item?._id;
    if (id) dispatch(markNotificationRead(id));
    showToast("Marked as read", "success");
  };

  return (
    <Page>
      <Shell>
        <Hero
          as={motion.section}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <HeroContent>
            <Eyebrow>KNOCKOUTCODES MEMBER COMMAND CENTER</Eyebrow>
            <Title>
              {greeting}. Train sharper, move cleaner, and keep building champion
              discipline.
            </Title>
            <Subtitle>
              Your courses, lessons, curriculum, coaching, purchases, saved items,
              updates, and support are organized in one premium dashboard.
            </Subtitle>

            <HeroActions>
              <PrimaryButton type="button" onClick={openFirstCourse}>
                Continue Training
              </PrimaryButton>
              <GhostButton
  type="button"
  onClick={() => navigate("/my-courses")}
>
  My Courses
              </GhostButton>
              <GhostButton type="button" onClick={() => navigate("/dashboard/products")}>
  My Products
              </GhostButton>
              <GhostButton
  type="button"
  onClick={() => navigate("/my-messages")}
>
  My Messages
</GhostButton>
              <GhostButton type="button" onClick={() => navigate("/courses")}>
                Explore Courses
              </GhostButton>
              <GhostButton type="button" onClick={() => navigate("/contact")}>
                Contact Support
              </GhostButton>
            </HeroActions>
          </HeroContent>

          <HeroPanel>
            <PanelLabel>Progress Control</PanelLabel>

            <RangeRow>
              {["7d", "30d", "90d"].map((range) => (
                <RangeButton
                  key={range}
                  type="button"
                  $active={timeRange === range}
                  onClick={() => onChangeRange(range)}
                >
                  {range.toUpperCase()}
                </RangeButton>
              ))}
            </RangeRow>

            <ProgressBox>
              <ProgressHead>
                <span>Training Progress</span>
                <strong>{progressPercent}%</strong>
              </ProgressHead>

              <ProgressTrack>
                <ProgressFill style={{ width: `${progressPercent}%` }} />
              </ProgressTrack>

              <ProgressMeta>
                <MetaPill>{stats?.streakDays ?? 0} Day Streak</MetaPill>
                <MetaPill>{stats?.completedCount ?? 0} Completed</MetaPill>
              </ProgressMeta>
            </ProgressBox>
          </HeroPanel>
        </Hero>

        <StatsGrid>
          <StatCard>
            <StatLabel>Streak</StatLabel>
            <StatValue>{stats?.streakDays ?? 0}</StatValue>
            <StatText>Days of discipline</StatText>
          </StatCard>

          <StatCard>
            <StatLabel>Completed</StatLabel>
            <StatValue>{stats?.completedCount ?? 0}</StatValue>
            <StatText>Lessons, drills, or tasks</StatText>
          </StatCard>

          <StatCard>
            <StatLabel>Saved</StatLabel>
            <StatValue>{stats?.savedCount ?? 0}</StatValue>
            <StatText>Favorites and saved items</StatText>
          </StatCard>

          <StatCard>
            <StatLabel>Unread</StatLabel>
            <StatValue>{unreadNotifications}</StatValue>
            <StatText>Important updates</StatText>
          </StatCard>
        </StatsGrid>

        <QuickActionsGrid>
          {quickActions.map((item) => (
            <QuickActionCard key={item.title} onClick={() => navigate(item.to)}>
              <QuickTitle>{item.title}</QuickTitle>
              <QuickDesc>{item.desc}</QuickDesc>
            </QuickActionCard>
          ))}
        </QuickActionsGrid>

        <MainGrid>
          <LeftColumn>
            <Panel>
              <PanelHeader>
                <div>
                  <PanelTitle>Purchased Courses</PanelTitle>
                  <PanelSub>Your unlocked KnockoutCodes training library.</PanelSub>
                </div>

                <SmallButton type="button" onClick={() => dispatch(fetchMyEnrollments())}>
                  Refresh
                </SmallButton>
              </PanelHeader>

              {enrollLoading ? <EmptyState>Loading your courses...</EmptyState> : null}

              {!enrollLoading && enrollError ? (
                <EmptyState>Could not load enrollments. Try refreshing.</EmptyState>
              ) : null}

              {!enrollLoading && !enrollError && !activeEnrollments.length ? (
                <EmptyState>
                  No purchased courses yet. Start with one powerful course today.
                </EmptyState>
              ) : null}

              {!enrollLoading && !enrollError && activeEnrollments.length ? (
                <CourseGrid>
                  {activeEnrollments.map((en, idx) => {
                    const course = getCourseFromEnrollment(en);
                    const key =
                      en?._id ||
                      course?._id ||
                      `${en?.user || "user"}-${getCourseId(en) || "course"}-${idx}`;

                    return (
                      <CourseCard key={key}>
                        <CourseTop>
                          <CourseTitle>
                            {course?.title || "KnockoutCodes Course"}
                          </CourseTitle>
                          <CourseBadge>Owned</CourseBadge>
                        </CourseTop>

                        <CourseDesc>
                          {course?.description
                            ? `${String(course.description).slice(0, 135)}...`
                            : "Open your training and continue where you left off."}
                        </CourseDesc>

                        <CourseMeta>
                          <CoursePill>
                            Plan: {en?.plan || course?.plan || "Standard"}
                          </CoursePill>
                          <CoursePill>Status: {en?.status || "Active"}</CoursePill>
                        </CourseMeta>

                        <CourseActions>
                          <PrimaryButton type="button" onClick={() => continueCourse(en)}>
                            Continue
                          </PrimaryButton>
                          <GhostButton type="button" onClick={() => navigate("/courses")}>
                            View More
                          </GhostButton>
                        </CourseActions>
                      </CourseCard>
                    );
                  })}
                </CourseGrid>
              ) : null}
            </Panel>

            <Panel>
              <PanelTitle>Lessons & Curriculum Progress</PanelTitle>
              <PanelSub>
                Track your learning path without turning the dashboard into a full
                curriculum page.
              </PanelSub>

              <InfoGrid>
                <InfoCard>
                  <InfoLabel>Next Lesson</InfoLabel>
                  <InfoValue>{stats?.nextLessonTitle || "Start your next lesson"}</InfoValue>
                  <SmallButton type="button" onClick={() => navigate("/lessons")}>
                    Open Lessons
                  </SmallButton>
                </InfoCard>

                <InfoCard>
                  <InfoLabel>Curriculum</InfoLabel>
                  <InfoValue>{stats?.curriculumProgress || progressPercent}% complete</InfoValue>
                  <SmallButton type="button" onClick={() => navigate("/curriculum")}>
                    View Path
                  </SmallButton>
                </InfoCard>

                <InfoCard>
                  <InfoLabel>Completed Lessons</InfoLabel>
                  <InfoValue>{stats?.completedLessonsCount ?? stats?.completedCount ?? 0}</InfoValue>
                  <SmallButton type="button" onClick={() => navigate("/lessons")}>
                    Continue
                  </SmallButton>
                </InfoCard>
              </InfoGrid>
            </Panel>

            <Panel>
              <PanelTitle>My Purchases</PanelTitle>
              <PanelSub>
                Quick access to products, ebooks, and order-related items.
              </PanelSub>

              <InfoGrid>
                <InfoCard>
                  <InfoLabel>E-Books</InfoLabel>
                  <InfoValue>{stats?.ebooksCount ?? 0} available</InfoValue>
                  <SmallButton type="button" onClick={() => navigate("/ebooks")}>
                    Open E-Books
                  </SmallButton>
                </InfoCard>

                <InfoCard>
                  <InfoLabel>Products</InfoLabel>
                  <InfoValue>{stats?.productsCount ?? 0} items</InfoValue>
                  <SmallButton type="button" onClick={() => navigate("/dashboard/products")}>
  My Products
</SmallButton>
                </InfoCard>

                <InfoCard>
                  <InfoLabel>Orders</InfoLabel>
                  <InfoValue>{stats?.ordersCount ?? 0} orders</InfoValue>
                  <SmallButton type="button" onClick={() => navigate("/dashboard/orders")}>
                    View Orders
                  </SmallButton>
                </InfoCard>
              </InfoGrid>
            </Panel>

            <Panel>
              <PanelTitle>Next Champion Moves</PanelTitle>
              <PanelSub>Simple actions that keep your momentum alive.</PanelSub>

              <ActionGrid>
                {premiumNextSteps.map((step, idx) => (
                  <ActionCard key={`${step?.title || "step"}-${idx}`}>
                    <ActionNumber>{String(idx + 1).padStart(2, "0")}</ActionNumber>
                    <ActionTitle>{step?.title || "Next step"}</ActionTitle>
                    <ActionDesc>
                      {step?.desc || step?.description || "Keep moving forward."}
                    </ActionDesc>
                    <SmallButton
                      type="button"
                      onClick={() => navigate(step?.to || "/courses")}
                    >
                      {step?.action || "Open"}
                    </SmallButton>
                  </ActionCard>
                ))}
              </ActionGrid>
            </Panel>

            <Panel>
              <PanelTitle>Recommended For You</PanelTitle>
              <PanelSub>
                A clean mix of courses, blogs, ebooks, coaching, and products.
              </PanelSub>

              <RecommendationGrid>
                {recommendedItems.map((item) => (
                  <RecommendationCard key={item.title}>
                    <CourseBadge>{item.type}</CourseBadge>
                    <ActionTitle>{item.title}</ActionTitle>
                    <ActionDesc>{item.desc}</ActionDesc>
                    <SmallButton type="button" onClick={() => navigate(item.to)}>
                      Open
                    </SmallButton>
                  </RecommendationCard>
                ))}
              </RecommendationGrid>
            </Panel>
          </LeftColumn>

          <RightColumn>
            <Panel>
              <PanelTitle>Notifications</PanelTitle>
              <PanelSub>Important updates without the noise.</PanelSub>

              <NotificationList>
                {safeArray(notifications).map((n, idx) => (
                  <NotificationCard
                    key={`notif-${n?._id || n?.id || idx}`}
                    $unread={!n?.read}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenNotification(n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenNotification(n);
                      }
                    }}
                  >
                    <NotifTitle>{n?.title || "KnockoutCodes Update"}</NotifTitle>
                    <NotifDesc>
                      {n?.desc || n?.message || "You have a new update."}
                    </NotifDesc>
                    {!n?.read ? <UnreadDot /> : null}
                  </NotificationCard>
                ))}

                {!safeArray(notifications).length && !loading ? (
                  <EmptyState>No notifications right now.</EmptyState>
                ) : null}
              </NotificationList>
            </Panel>

            <Panel>
              <PanelTitle>Coaching</PanelTitle>
              <PanelSub>Your private growth and training support area.</PanelSub>

              <SideList>
                <SideItem>
                  <SideTitle>Next Session</SideTitle>
                  <SideText>{stats?.nextCoachingSession || "No session booked yet."}</SideText>
                </SideItem>

                <SideItem>
                  <SideTitle>Coaching Status</SideTitle>
                  <SideText>{stats?.coachingStatus || "Available when you are ready."}</SideText>
                </SideItem>
              </SideList>

              <ButtonStack>
                <PrimaryButton type="button" onClick={() => navigate("/coachings")}>
                  Book Coaching
                </PrimaryButton>
              </ButtonStack>
            </Panel>

            <Panel>
              <PanelTitle>Saved & Wishlist</PanelTitle>
              <PanelSub>Your favorite courses, products, ebooks, and blogs.</PanelSub>

              <SideList>
                <SideItem>
                  <SideTitle>Saved Items</SideTitle>
                  <SideText>{stats?.savedCount ?? 0} saved for later.</SideText>
                </SideItem>
                <SideItem>
                  <SideTitle>Wishlist</SideTitle>
                  <SideText>{stats?.wishlistCount ?? 0} items waiting.</SideText>
                </SideItem>
              </SideList>

              <ButtonStack>
                <GhostButton type="button" onClick={() => navigate("/courses")}>
                  Browse Courses
                </GhostButton>
                <GhostButton type="button" onClick={() => navigate("/products")}>
                  Browse Products
                </GhostButton>
              </ButtonStack>
            </Panel>

            <Panel>
              <PanelTitle>Newsletter Preferences</PanelTitle>
              <PanelSub>
                Keep receiving useful boxing, training, course, and product updates.
              </PanelSub>

              <SideList>
                <SideItem>
                  <SideTitle>Status</SideTitle>
                  <SideText>
                    {stats?.newsletterStatus || "Subscribed / preference not loaded yet."}
                  </SideText>
                </SideItem>
              </SideList>

              <ButtonStack>
                <GhostButton type="button" onClick={() => navigate("/newsletter")}>
                  Manage Newsletter
                </GhostButton>
              </ButtonStack>
            </Panel>

            <Panel>
              <PanelTitle>Recent Activity</PanelTitle>
              <PanelSub>Your latest movement inside KnockoutCodes.</PanelSub>

              <ActivityList>
                {premiumActivity.map((item, idx) => (
                  <ActivityItem key={`${item?.title || "activity"}-${idx}`}>
                    <ActivityDot />
                    <div>
                      <ActivityTitle>{item?.title || "Activity"}</ActivityTitle>
                      <ActivityDesc>
                        {item?.desc || item?.description || "Progress updated."}
                      </ActivityDesc>
                    </div>
                  </ActivityItem>
                ))}
              </ActivityList>
            </Panel>

            <SupportPanel>
              <SupportTitle>Need help?</SupportTitle>
              <SupportText>
                If anything feels blocked, reach out. FAQ, contact, privacy, and terms
                are always one tap away.
              </SupportText>

              <ButtonStack>
                <PrimaryButton type="button" onClick={() => navigate("/contact")}>
                  Contact Support
                </PrimaryButton>
                <GhostButton type="button" onClick={() => navigate("/faq")}>
                  FAQ
                </GhostButton>
                <GhostButton type="button" onClick={() => navigate("/privacy")}>
                  Privacy
                </GhostButton>
                <GhostButton type="button" onClick={() => navigate("/terms")}>
                  Terms
                </GhostButton>
              </ButtonStack>
            </SupportPanel>
          </RightColumn>
        </MainGrid>
      </Shell>
    </Page>
  );
}

/* styles: keep all your existing styles, then add these new ones at the bottom */

const QuickActionsGrid = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 1050px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const QuickActionCard = styled.button`
  text-align: left;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.32);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(214, 182, 159, 0.42);
    box-shadow: ${({ theme }) => theme.shadow.glow};
  }
`;

const QuickTitle = styled.div`
  font-weight: 950;
`;

const QuickDesc = styled.div`
  margin-top: 6px;
  color: rgba(255, 249, 242, 0.66);
  line-height: 1.35;
  font-size: 0.88rem;
`;

const InfoGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.09);
`;

const InfoLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.78rem;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const InfoValue = styled.div`
  margin: 8px 0 12px;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.ivory};
`;

const RecommendationGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const RecommendationCard = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.09);
`;

const SideList = styled.div`
  margin-top: 13px;
  display: grid;
  gap: 10px;
`;

const SideItem = styled.div`
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const SideTitle = styled.div`
  font-weight: 950;
`;

const SideText = styled.div`
  margin-top: 5px;
  color: rgba(255, 249, 242, 0.68);
  line-height: 1.4;
`;

const ButtonStack = styled.div`
  margin-top: 13px;
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
`;

const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(900px 520px at 15% 8%, rgba(214, 182, 159, 0.14), transparent 58%),
    radial-gradient(900px 520px at 88% 18%, rgba(90, 56, 37, 0.22), transparent 60%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown}
    );
  color: ${({ theme }) => theme.colors.ivory};
`;

const Shell = styled.div`
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
  padding: 30px 0 70px;

  @media (max-width: 520px) {
    width: min(100% - 22px, 1200px);
    padding-top: 20px;
  }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 18px;
  padding: 22px;
  border-radius: ${({ theme }) => theme.radius.xl};

  background: linear-gradient(
    145deg,
    rgba(214, 182, 159, 0.09),
    rgba(0, 0, 0, 0.58)
  );

  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: ${({ theme }) => theme.shadow.glow};

  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);

  @media (max-width: 950px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 520px) {
    padding: 16px;
    gap: 14px;
  }
`;

const HeroContent = styled.div`
  display: grid;
  gap: 12px;
  align-content: center;

  @media (max-width: 520px) {
    gap: 10px;
  }
`;

const HeroActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const HeroPanel = styled.div`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const RangeRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

/* ================= HERO TEXT ================= */

const Eyebrow = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.18em;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 950;
  line-height: 1.1;
`;

const Subtitle = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.75);
  line-height: 1.6;
`;

/* ================= HERO ACTIONS ================= */

const PanelLabel = styled.div`
  font-weight: 900;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 10px;
`;

/* ================= RANGE ================= */

const RangeButton = styled.button`
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214,182,159,0.7)" : "rgba(255,255,255,0.12)"};
  background: ${({ $active }) =>
    $active ? "rgba(214,182,159,0.16)" : "rgba(255,255,255,0.04)"};
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 9px 13px;
  font-weight: 900;
  cursor: pointer;
`;

/* ================= PROGRESS ================= */

const ProgressBox = styled.div`
  margin-top: 14px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.05);
`;

const ProgressHead = styled.div`
  display: flex;
  justify-content: space-between;
  font-weight: 900;
  margin-bottom: 10px;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const ProgressTrack = styled.div`
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radius.pill};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
`;

const ProgressMeta = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaPill = styled.div`
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.4);
  font-size: 0.85rem;
`;

/* ================= BUTTONS ================= */

const PrimaryButton = styled.button`
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  font-weight: 900;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};

  &:hover {
    transform: translateY(-1px);
  }
`;

const GhostButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  font-weight: 900;
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};

  &:hover {
    border-color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const StatsGrid = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
`;

const StatValue = styled.div`
  margin-top: 6px;
  font-size: 1.8rem;
  font-weight: 950;
`;

const StatText = styled.div`
  margin-top: 4px;
  color: rgba(255, 249, 242, 0.7);
  font-size: 0.9rem;
`;

const MainGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 14px;

  @media (max-width: 950px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div`
  display: grid;
  gap: 14px;
`;

const RightColumn = styled.div`
  display: grid;
  gap: 14px;
`;

const Panel = styled.div`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const PanelTitle = styled.div`
  font-weight: 950;
  font-size: 1.1rem;
`;

const PanelSub = styled.div`
  margin-top: 6px;
  color: rgba(255, 249, 242, 0.7);
  font-size: 0.95rem;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
`;

const CourseGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const CourseCard = styled.article`
  padding: 15px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const CourseTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
`;

const CourseTitle = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 950;
`;

const CourseBadge = styled.span`
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(214, 182, 159, 0.13);
  border: 1px solid rgba(214, 182, 159, 0.25);
  font-weight: 900;
`;

const CourseDesc = styled.p`
  color: rgba(255, 249, 242, 0.72);
  line-height: 1.5;
`;

const CourseMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const CoursePill = styled.span`
  padding: 7px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 249, 242, 0.78);
  font-size: 0.88rem;
`;

const CourseActions = styled.div`
  margin-top: 12px;
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
`;

const SmallButton = styled(GhostButton)`
  padding: 9px 12px;
  font-size: 0.88rem;
`;

const EmptyState = styled.div`
  margin-top: 13px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.26);
  color: rgba(255, 249, 242, 0.72);
`;

const ActionGrid = styled.div`
  margin-top: 14px;
  display: grid;
  gap: 10px;
`;

const ActionCard = styled.div`
  padding: 13px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.18);
  }
`;

const ActionNumber = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 950;
`;

const ActionTitle = styled.div`
  margin-top: 5px;
  font-weight: 950;
`;

const ActionDesc = styled.div`
  margin: 6px 0 12px;
  color: rgba(255, 249, 242, 0.68);
  line-height: 1.45;
`;

/* ================= NOTIFICATIONS ================= */

const NotificationList = styled.div`
  margin-top: 13px;
  display: grid;
  gap: 10px;
`;

const NotificationCard = styled.div`
  position: relative;
  cursor: pointer;
  padding: 13px 34px 13px 13px;
  border-radius: ${({ theme }) => theme.radius.lg};

  background: ${({ $unread }) =>
    $unread ? "rgba(214,182,159,0.10)" : "rgba(0,0,0,0.3)"};

  border: 1px solid
    ${({ $unread }) =>
      $unread ? "rgba(214,182,159,0.28)" : "rgba(255,255,255,0.08)"};

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.18);
  }
`;

const NotifTitle = styled.div`
  font-weight: 950;
`;

const NotifDesc = styled.div`
  margin-top: 6px;
  color: rgba(255, 249, 242, 0.68);
  line-height: 1.4;
`;

const UnreadDot = styled.div`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
  box-shadow: 0 0 0 5px rgba(214, 182, 159, 0.12);
`;

/* ================= ACTIVITY ================= */

const ActivityList = styled.div`
  margin-top: 13px;
  display: grid;
  gap: 12px;
`;

const ActivityItem = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
`;

const ActivityDot = styled.div`
  width: 11px;
  height: 11px;
  margin-top: 5px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
`;

const ActivityTitle = styled.div`
  font-weight: 950;
`;

const ActivityDesc = styled.div`
  margin-top: 4px;
  color: rgba(255, 249, 242, 0.66);
`;

/* ================= SUPPORT ================= */

const SupportPanel = styled.div`
  padding: 17px;
  border-radius: ${({ theme }) => theme.radius.xl};

  background: linear-gradient(
    145deg,
    rgba(214, 182, 159, 0.12),
    rgba(0, 0, 0, 0.48)
  );

  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const SupportTitle = styled.div`
  font-size: 1.1rem;
  font-weight: 950;
`;

const SupportText = styled.div`
  margin-top: 6px;
  color: rgba(255, 249, 242, 0.72);
  line-height: 1.5;
`;