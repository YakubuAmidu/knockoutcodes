// src/pages/MyCourses.jsx
import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

const MyCourses = () => {
  const navigate = useNavigate();
  const { push } = useToast();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Optional: simple filters
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    const fetchEnrollments = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/enrollments/my");
        if (!isMounted) return;

        const payload = res.data || {};
        const data = Array.isArray(payload.data) ? payload.data : [];
        setEnrollments(data);
      } catch (error) {
        if (!isMounted) return;

        const message =
          error.response?.data?.message ||
          "Failed to load your courses, please try again.";
        push({
          title: "My Courses",
          description: message,
          variant: "error",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEnrollments();

    return () => {
      isMounted = false;
    };
  }, [push]);

  const filteredEnrollments =
    statusFilter === "all"
      ? enrollments
      : enrollments.filter((item) => item.status === statusFilter);

  const handleContinue = (enrollment) => {
    const course = enrollment.course;
    if (!course || !course._id) {
      push({
        title: "Course not found",
        description: "This enrollment has no linked course document.",
        variant: "error",
      });
      return;
    }

    // Go to Course Player; adjust path if your route is different
    navigate(`/courses/${course._id}/player`, {
      state: {
        courseId: course._id,
        enrollmentId: enrollment._id,
      },
    });
  };

  const formatDate = (value) => {
    if (!value) return "—";
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

  const formatPrice = (course) => {
    if (!course) return "";
    const price =
      typeof course.salePrice === "number"
        ? course.salePrice
        : course.price ?? null;

    if (price == null) return "";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      return `$${price.toFixed(2)}`;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "expired":
        return "Expired";
      default:
        return "Active";
    }
  };

  const getStatusTone = (status) => {
    switch (status) {
      case "completed":
        return "completed";
      case "cancelled":
      case "expired":
        return "danger";
      default:
        return "active";
    }
  };

  return (
    <Wrap>
      <Header>
        <Title>My Courses</Title>
        <Subtitle>
          All the boxing programs you’re enrolled in — pick one and continue
          training.
        </Subtitle>
      </Header>

      <Toolbar>
        <FilterGroup>
          <FilterLabel htmlFor="statusFilter">Status</FilterLabel>
          <Select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </Select>
        </FilterGroup>
      </Toolbar>

      {loading ? (
        <StateText>Loading your courses…</StateText>
      ) : filteredEnrollments.length === 0 ? (
        <StateCard>
          <StateTitle>No courses yet</StateTitle>
          <StateText>
            You haven’t enrolled in any KnockoutCodes programs yet. Explore the
            course library and start your first class.
          </StateText>
        </StateCard>
      ) : (
        <Grid>
          {filteredEnrollments.map((enrollment) => {
            const course = enrollment.course || {};
            const progress =
              typeof enrollment.progressPercent === "number"
                ? Math.min(Math.max(enrollment.progressPercent, 0), 100)
                : 0;
            const tone = getStatusTone(enrollment.status);

            return (
              <Card key={enrollment._id}>
                {course.thumbnail ? (
                  <ThumbWrapper>
                    <Thumb
                      src={course.thumbnail}
                      alt={course.title || "Course thumbnail"}
                    />
                    <ProgressBarOuter>
                      <ProgressBarInner style={{ width: `${progress}%` }} />
                    </ProgressBarOuter>
                    {progress > 0 && (
                      <ProgressLabel>{progress.toFixed(0)}% complete</ProgressLabel>
                    )}
                  </ThumbWrapper>
                ) : (
                  <ThumbPlaceholder>
                    <PlaceholderTitle>
                      {course.title || "Boxing Course"}
                    </PlaceholderTitle>
                    <PlaceholderSubtitle>
                      {course.level || "all-levels"}
                    </PlaceholderSubtitle>
                    <ProgressBarOuter>
                      <ProgressBarInner style={{ width: `${progress}%` }} />
                    </ProgressBarOuter>
                    {progress > 0 && (
                      <ProgressLabel>{progress.toFixed(0)}% complete</ProgressLabel>
                    )}
                  </ThumbPlaceholder>
                )}

                <CardBody>
                  <CourseTitle>{course.title || "Untitled Course"}</CourseTitle>
                  <CourseMeta>
                    <span>{course.level || "All levels"}</span>
                    {course.isFree ? (
                      <span>Free</span>
                    ) : (
                      <span>{formatPrice(course)}</span>
                    )}
                  </CourseMeta>

                  <StatusRow>
                    <StatusBadge data-tone={tone}>
                      {getStatusLabel(enrollment.status)}
                    </StatusBadge>
                    <SmallMeta>
                      Enrolled: {formatDate(enrollment.startedAt)}
                    </SmallMeta>
                  </StatusRow>

                  <ActionsRow>
                    <PrimaryButton
                      type="button"
                      onClick={() => handleContinue(enrollment)}
                    >
                      {progress > 0 ? "Continue training" : "Start course"}
                    </PrimaryButton>
                  </ActionsRow>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}
    </Wrap>
  );
};

export default MyCourses;

/* ============================
   Styled Components
   ============================ */

const Wrap = styled.main`
  width: 100%;
  min-height: 100%;
  padding: 20px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: ${({ theme }) => theme.colors.darkBrown};
  color: ${({ theme }) => theme.colors.ivory};
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.4px;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 13px;
  opacity: 0.92;
`;

const Toolbar = styled.section`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FilterLabel = styled.label`
  font-size: 12px;
  opacity: 0.85;
`;

const Select = styled.select`
  min-width: 150px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.4);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  outline: none;

  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.orange};
  }
`;

const StateCard = styled.section`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 16px 14px;
  background: ${({ theme }) => theme.colors.brown};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  max-width: 480px;
`;

const StateTitle = styled.h2`
  margin: 0 0 6px;
  font-size: 16px;
`;

const StateText = styled.p`
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
`;

const Grid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
`;

const Card = styled.article`
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.brown};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  display: flex;
  flex-direction: column;
`;

const ThumbWrapper = styled.div`
  position: relative;
  overflow: hidden;
`;

const Thumb = styled.img`
  display: block;
  width: 100%;
  height: 160px;
  object-fit: cover;
`;

const ThumbPlaceholder = styled.div`
  height: 160px;
  padding: 12px 12px 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: radial-gradient(
      circle at 10% 0%,
      rgba(255, 255, 255, 0.08) 0,
      transparent 50%
    ),
    radial-gradient(
      circle at 90% 100%,
      rgba(0, 0, 0, 0.9) 0,
      transparent 50%
    ),
    ${({ theme }) => theme.colors.darkBrown};
`;

const PlaceholderTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const PlaceholderSubtitle = styled.div`
  font-size: 11px;
  opacity: 0.85;
  text-transform: uppercase;
`;

const ProgressBarOuter = styled.div`
  position: relative;
  margin-top: 6px;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  overflow: hidden;
`;

const ProgressBarInner = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradients.brand};
  transition: width 0.18s ${({ theme }) => theme.easing};
`;

const ProgressLabel = styled.span`
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.65);
  padding: 2px 6px;
  border-radius: 999px;
`;

const CardBody = styled.div`
  padding: 12px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CourseTitle = styled.h2`
  margin: 0;
  font-size: 15px;
`;

const CourseMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.9;
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-transform: capitalize;

  &[data-tone="active"] {
    background: rgba(46, 204, 113, 0.16);
    border-color: rgba(46, 204, 113, 0.9);
  }

  &[data-tone="completed"] {
    background: rgba(52, 152, 219, 0.16);
    border-color: rgba(52, 152, 219, 0.9);
  }

  &[data-tone="danger"] {
    background: rgba(231, 76, 60, 0.16);
    border-color: rgba(231, 76, 60, 0.9);
  }
`;

const SmallMeta = styled.span`
  font-size: 11px;
  opacity: 0.85;
`;

const ActionsRow = styled.div`
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
`;

const PrimaryButton = styled.button`
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  font-size: 13px;
  cursor: pointer;
  background: ${({ theme }) => theme.gradients.brand};
  color: ${({ theme }) => theme.colors.ivory};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.12s ${({ theme }) => theme.easing},
    box-shadow 0.12s ${({ theme }) => theme.easing}, opacity 0.12s ease-out;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.lg};
    opacity: 0.95;
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${({ theme }) => theme.shadow.soft};
    opacity: 0.9;
  }
`;
