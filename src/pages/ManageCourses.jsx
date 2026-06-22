// src/admin/pages/ManageCourses.jsx
import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchManageCourses,
  createManageCourse,
  updateManageCourse,
  deleteManageCourse,
} from "../reducers/manageCourses/manageCoursesActions";

import { MANAGE_COURSES_ACTIONS } from "../reducers/manageCourses/manageCoursesActionTypes";

const initialFormState = {
  _id: "",
  title: "",
  description: "",
  category: "Boxing Fundamentals",
  focusArea: "",
  level: "foundations",
  requiredMembershipLevel: "foundations",
  stripePriceId: "",
  thumbnail: "",
  promoVideo: "",
  price: "",
  salePrice: "",
  isFree: false,
  durationInMinutes: "",
  totalLessons: "",
  language: "English",
  equipmentNeeded: "",
  requirements: "",
  whatYouWillLearn: "",
  tags: "",
  isFeatured: false,
  isPublished: false,
};

const arrayToText = (value) => (Array.isArray(value) ? value.join(", ") : "");

const textToArray = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const levelOptions = [
  { value: "foundations", label: "Foundations" },
  { value: "development", label: "Development" },
  { value: "performance", label: "Performance" },
  { value: "elite-fight-camp", label: "Elite Fight Camp" },
];

function getLevelLabel(value = "") {
  const match = levelOptions.find((item) => item.value === value);
  return match?.label || String(value || "none");
}

const buildCoursePayload = (formData) => ({
  title: String(formData.title || "").trim(),
  description: String(formData.description || "").trim(),
  category: String(formData.category || "").trim(),
  focusArea: String(formData.focusArea || "").trim(),

  level: formData.level,
  requiredMembershipLevel: formData.isFree ? "none" : formData.level,

  stripePriceId: String(formData.stripePriceId || "").trim(),

  thumbnail: String(formData.thumbnail || "").trim(),
  promoVideo: String(formData.promoVideo || "").trim(),

  price: formData.isFree ? 0 : Number(formData.price || 0),
  salePrice:
    formData.isFree || formData.salePrice === ""
      ? null
      : Number(formData.salePrice),

  isFree: Boolean(formData.isFree),
  durationInMinutes: Number(formData.durationInMinutes || 0),
  totalLessons: Number(formData.totalLessons || 0),
  language: String(formData.language || "English").trim(),

  equipmentNeeded: textToArray(formData.equipmentNeeded),
  requirements: textToArray(formData.requirements),
  whatYouWillLearn: textToArray(formData.whatYouWillLearn),
  tags: textToArray(formData.tags),

  isFeatured: Boolean(formData.isFeatured),
  isPublished: Boolean(formData.isPublished),
});

const ManageCourses = () => {
  const dispatch = useDispatch();

  const {
    courses = [],
    meta,
    selectedCourse,
    loading,
    saving,
    deleting,
    error,
    successMessage,
    search = "",
    levelFilter = "all",
    statusFilter = "all",
  } = useSelector((state) => state.manageCourses || {});

  const safeCourses = useMemo(
    () => (Array.isArray(courses) ? courses : []),
    [courses],
  );

  const [formData, setFormData] = useState(initialFormState);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    dispatch(fetchManageCourses());
  }, [dispatch]);

  useEffect(() => {
    if (!successMessage) return;
    setToast({ type: "success", message: successMessage });
  }, [successMessage]);

  useEffect(() => {
    if (!error) return;
    setToast({ type: "error", message: error });
  }, [error]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
      dispatch({ type: MANAGE_COURSES_ACTIONS.CLEAR_ERROR });
    }, 4200);

    return () => clearTimeout(timer);
  }, [toast, dispatch]);

  const isEditing = Boolean(selectedCourse?._id);

  const publishedCount = useMemo(
    () => safeCourses.filter((course) => course?.isPublished).length,
    [safeCourses],
  );

  const draftCount = useMemo(
    () => safeCourses.filter((course) => !course?.isPublished).length,
    [safeCourses],
  );

  const featuredCount = useMemo(
    () => safeCourses.filter((course) => course?.isFeatured).length,
    [safeCourses],
  );

  const filteredCourses = useMemo(() => {
    const term = String(search || "")
      .toLowerCase()
      .trim()
      .slice(0, 120);

    return safeCourses.filter((course) => {
      const matchesSearch =
        !term ||
        String(course?.title || "")
          .toLowerCase()
          .includes(term) ||
        String(course?.category || "")
          .toLowerCase()
          .includes(term) ||
        String(course?.level || "")
          .toLowerCase()
          .includes(term) ||
        String(course?.requiredMembershipLevel || "")
          .toLowerCase()
          .includes(term);

      const matchesLevel =
        levelFilter === "all" || String(course?.level) === String(levelFilter);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && course?.isPublished) ||
        (statusFilter === "draft" && !course?.isPublished) ||
        (statusFilter === "featured" && course?.isFeatured);

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [safeCourses, search, levelFilter, statusFilter]);

  const fillFormFromCourse = (course) => {
    if (!course) return;

    setFormData({
      _id: course._id || "",
      title: course.title || "",
      description: course.description || "",
      category: course.category || "Boxing Fundamentals",
      focusArea: course.focusArea || "",
      level: course.level || "foundations",
      requiredMembershipLevel: course.isFree
        ? "none"
        : course.level || course.requiredMembershipLevel || "foundations",
      stripePriceId: course.stripePriceId || "",
      thumbnail: course.thumbnail || "",
      promoVideo: course.promoVideo || "",
      price: course.price != null ? String(course.price) : "",
      salePrice: course.salePrice != null ? String(course.salePrice) : "",
      isFree: Boolean(course.isFree),
      durationInMinutes:
        course.durationInMinutes != null
          ? String(course.durationInMinutes)
          : "",
      totalLessons:
        course.totalLessons != null ? String(course.totalLessons) : "",
      language: course.language || "English",
      equipmentNeeded: arrayToText(course.equipmentNeeded),
      requirements: arrayToText(course.requirements),
      whatYouWillLearn: arrayToText(course.whatYouWillLearn),
      tags: arrayToText(course.tags),
      isFeatured: Boolean(course.isFeatured),
      isPublished: Boolean(course.isPublished),
    });
  };

  const handleEdit = (course) => {
    dispatch({
      type: MANAGE_COURSES_ACTIONS.SET_SELECTED_COURSE,
      payload: course,
    });

    fillFormFromCourse(course);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewCourse = () => {
    dispatch({ type: MANAGE_COURSES_ACTIONS.CLEAR_SELECTED_COURSE });
    setFormData(initialFormState);
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "level" && !next.isFree) {
        next.requiredMembershipLevel = value;
      }

      if (name === "isFree" && checked) {
        next.requiredMembershipLevel = "none";
        next.price = "0";
        next.salePrice = "";
        next.stripePriceId = "";
      }

      if (name === "isFree" && !checked) {
        next.requiredMembershipLevel =
          prev.requiredMembershipLevel === "none"
            ? next.level || "foundations"
            : prev.requiredMembershipLevel || "foundations";
      }

      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const title = String(formData.title || "").trim();
    const description = String(formData.description || "").trim();
    const thumbnail = String(formData.thumbnail || "").trim();
    const stripePriceId = String(formData.stripePriceId || "").trim();

    if (!title || !description) {
      setToast({
        type: "error",
        message: "Title and description are required.",
      });
      return;
    }

    if (
      !formData.isFree &&
      formData.requiredMembershipLevel !== formData.level
    ) {
      setToast({
        type: "error",
        message:
          "Protected courses must use the exact matching membership level.",
      });
      return;
    }

    const price = Number(formData.price || 0);
    const salePrice =
      formData.salePrice === "" ? null : Number(formData.salePrice);

    if (!formData.isFree && (!Number.isFinite(price) || price < 0)) {
      setToast({
        type: "error",
        message: "Price must be a valid number.",
      });
      return;
    }

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price)
    ) {
      setToast({
        type: "error",
        message: "Sale price must be valid and cannot be greater than price.",
      });
      return;
    }

    if (
      !formData.isFree &&
      stripePriceId &&
      !stripePriceId.startsWith("price_")
    ) {
      setToast({
        type: "error",
        message: "Stripe Price ID must start with price_.",
      });
      return;
    }

    if (formData.isPublished && !thumbnail) {
      setToast({
        type: "error",
        message: "Published courses require a thumbnail.",
      });
      return;
    }

    if (formData.isPublished && !formData.isFree && price <= 0) {
      setToast({
        type: "error",
        message: "Published paid courses require a price.",
      });
      return;
    }

    const duplicateTitle = safeCourses.some(
      (course) =>
        course?._id !== formData._id &&
        String(course?.title || "")
          .trim()
          .toLowerCase() === title.toLowerCase(),
    );

    if (duplicateTitle) {
      setToast({
        type: "error",
        message: "A course with this title already exists.",
      });
      return;
    }

    if (salePrice !== null && !formData.isFree && price <= salePrice) {
      setToast({
        type: "error",
        message: "Regular price must be greater than sale price.",
      });
      return;
    }

    try {
      const payload = buildCoursePayload(formData);

      if (isEditing) {
        await dispatch(updateManageCourse(selectedCourse._id, payload));
      } else {
        await dispatch(createManageCourse(payload));
      }

      handleNewCourse();
    } catch {
      // Error handled by reducer/toast
    }
  };

  const handleDelete = async (course) => {
    if (!course?._id) {
      setToast({
        type: "error",
        message: "Course ID is missing. Cannot delete this course.",
      });
      return;
    }

    const ok = window.confirm(
      `Delete "${course.title}"?\n\nThis will permanently remove the course and may affect enrolled students.`,
    );

    if (!ok) return;

    try {
      await dispatch(deleteManageCourse(course._id));

      if (selectedCourse?._id === course._id) {
        handleNewCourse();
      }
    } catch {
      // Error handled by reducer/toast
    }
  };

  return (
    <Page>
      {toast ? (
        <Toast $type={toast.type}>
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)}>
            Close
          </button>
        </Toast>
      ) : null}

      <Hero>
        <HeroLeft>
          <Eyebrow>KnockoutCodes Admin Control Room</Eyebrow>
          <Title>Courses That Sell Before The Student Clicks.</Title>
          <Subtitle>
            Create, edit, publish, feature, price, and protect every course from
            one premium admin dashboard.
          </Subtitle>

          <HeroActions>
            <PrimaryButton type="button" onClick={handleNewCourse}>
              + Create New Course
            </PrimaryButton>

            <GhostButton
              type="button"
              onClick={() => dispatch(fetchManageCourses())}
            >
              Refresh Courses
            </GhostButton>
          </HeroActions>
        </HeroLeft>

        <HeroPanel>
          <PanelLabel>First 2 Seconds Hook</PanelLabel>
          <PanelTitle>
            Make every course feel premium before the sale.
          </PanelTitle>
          <PanelList>
            <li>Strong title</li>
            <li>Clear transformation</li>
            <li>Protected access level</li>
            <li>Clean published status</li>
          </PanelList>
        </HeroPanel>
      </Hero>

      <StatsGrid>
        <StatCard>
          <strong>{meta?.total || safeCourses.length}</strong>
          <span>Total Courses</span>
        </StatCard>

        <StatCard>
          <strong>{publishedCount}</strong>
          <span>Published</span>
        </StatCard>

        <StatCard>
          <strong>{draftCount}</strong>
          <span>Drafts</span>
        </StatCard>

        <StatCard>
          <strong>{featuredCount}</strong>
          <span>Featured</span>
        </StatCard>
      </StatsGrid>

      <DashboardGrid>
        <FormPanel>
          <PanelTop>
            <div>
              <SectionEyebrow>
                {isEditing ? "Edit Course" : "Create Course"}
              </SectionEyebrow>
              <SectionTitle>
                {isEditing
                  ? "Upgrade This Course"
                  : "Build A New Premium Course"}
              </SectionTitle>
            </div>

            <MiniBadge>{isEditing ? "Editing" : "New Course"}</MiniBadge>
          </PanelTop>

          <Form onSubmit={handleSubmit}>
            <Field>
              <Label>Course Title *</Label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Foundations Boxing Blueprint"
              />
            </Field>

            <Field>
              <Label>Category</Label>
              <Select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="Boxing Fundamentals">Boxing Fundamentals</option>
                <option value="Conditioning">Conditioning</option>
                <option value="Footwork">Footwork</option>
                <option value="Defense">Defense</option>
                <option value="Power Punching">Power Punching</option>
                <option value="Strategy & Ring IQ">Strategy & Ring IQ</option>
                <option value="Other">Other</option>
              </Select>
            </Field>

            <WideField>
              <Label>Description *</Label>
              <TextArea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Explain the transformation, who this course is for, and why it matters."
              />
            </WideField>

            <Field>
              <Label>Focus Area</Label>
              <Input
                name="focusArea"
                value={formData.focusArea}
                onChange={handleChange}
                placeholder="Footwork, defense, power..."
              />
            </Field>

            <Field>
              <Label>Course Level</Label>
              <Select
                name="level"
                value={formData.level}
                onChange={handleChange}
              >
                {levelOptions.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label>Required Membership</Label>
              <Select
                name="requiredMembershipLevel"
                value={formData.requiredMembershipLevel}
                onChange={handleChange}
                disabled
              >
                {formData.isFree ? (
                  <option value="none">None / Free</option>
                ) : (
                  levelOptions.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))
                )}
              </Select>
            </Field>

            <Field>
              <Label>Stripe Price ID</Label>
              <Input
                name="stripePriceId"
                value={formData.stripePriceId}
                onChange={handleChange}
                placeholder="price_..."
              />
            </Field>

            <Field>
              <Label>Price</Label>
              <Input
                type="number"
                min="0"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="99"
              />
            </Field>

            <Field>
              <Label>Sale Price</Label>
              <Input
                type="number"
                min="0"
                name="salePrice"
                value={formData.salePrice}
                onChange={handleChange}
                placeholder="79"
              />
            </Field>

            <Field>
              <Label>Duration Minutes</Label>
              <Input
                type="number"
                min="0"
                name="durationInMinutes"
                value={formData.durationInMinutes}
                onChange={handleChange}
                placeholder="240"
              />
            </Field>

            <Field>
              <Label>Total Lessons</Label>
              <Input
                type="number"
                min="0"
                name="totalLessons"
                value={formData.totalLessons}
                onChange={handleChange}
                placeholder="24"
              />
            </Field>

            <Field>
              <Label>Thumbnail URL</Label>
              {formData.thumbnail ? (
                <PreviewImage src={formData.thumbnail} alt="Course preview" />
              ) : null}
              <Input
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleChange}
                placeholder="https://..."
              />
            </Field>

            <Field>
              <Label>Promo Video URL</Label>
              {formData.promoVideo ? (
                <PreviewVideo src={formData.promoVideo} controls />
              ) : null}
              <Input
                name="promoVideo"
                value={formData.promoVideo}
                onChange={handleChange}
                placeholder="https://..."
              />
            </Field>

            <WideField>
              <Label>What Students Learn</Label>
              <Input
                name="whatYouWillLearn"
                value={formData.whatYouWillLearn}
                onChange={handleChange}
                placeholder="Clean jab, defense, footwork, confidence"
              />
            </WideField>

            <WideField>
              <Label>Requirements</Label>
              <Input
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                placeholder="No experience needed, boxing gloves recommended"
              />
            </WideField>

            <WideField>
              <Label>Equipment Needed</Label>
              <Input
                name="equipmentNeeded"
                value={formData.equipmentNeeded}
                onChange={handleChange}
                placeholder="Gloves, wraps, heavy bag"
              />
            </WideField>

            <WideField>
              <Label>Tags</Label>
              <Input
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="boxing, beginner, knockoutcodes"
              />
            </WideField>

            <ToggleGrid>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  name="isFree"
                  checked={formData.isFree}
                  onChange={handleChange}
                />
                Free Course
              </CheckboxLabel>

              <CheckboxLabel>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleChange}
                />
                Published
              </CheckboxLabel>

              <CheckboxLabel>
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                />
                Featured
              </CheckboxLabel>
            </ToggleGrid>

            <FormActions>
              <GhostButton type="button" onClick={handleNewCourse}>
                Reset
              </GhostButton>

              <PrimaryButton type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Course"}
              </PrimaryButton>
            </FormActions>
          </Form>
        </FormPanel>

        <CoursesPanel>
          <PanelTop>
            <div>
              <SectionEyebrow>Course Database</SectionEyebrow>
              <SectionTitle>Manage Live Courses</SectionTitle>
            </div>
          </PanelTop>

          <Filters>
            <Input
              value={search}
              onChange={(e) =>
                dispatch({
                  type: MANAGE_COURSES_ACTIONS.SET_SEARCH,
                  payload: e.target.value,
                })
              }
              placeholder="Search title, category, level..."
            />

            <Select
              value={levelFilter}
              onChange={(e) =>
                dispatch({
                  type: MANAGE_COURSES_ACTIONS.SET_LEVEL_FILTER,
                  payload: e.target.value,
                })
              }
            >
              <option value="all">All Levels</option>
              <option value="foundations">Foundations</option>
              <option value="development">Development</option>
              <option value="performance">Performance</option>
              <option value="elite-fight-camp">Elite Fight Camp</option>
            </Select>

            <Select
              value={statusFilter}
              onChange={(e) =>
                dispatch({
                  type: MANAGE_COURSES_ACTIONS.SET_STATUS_FILTER,
                  payload: e.target.value,
                })
              }
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="featured">Featured</option>
            </Select>
          </Filters>

          {loading ? (
            <StateBox>Loading courses...</StateBox>
          ) : filteredCourses.length === 0 ? (
            <StateBox>No courses found.</StateBox>
          ) : (
            <CourseList>
              {filteredCourses.map((course) => (
                <CourseCard key={course?._id || course?.slug || course?.title}>
                  <CourseImageBox>
                    {course?.thumbnail ? (
                      <CourseImage src={course.thumbnail} alt={course.title} />
                    ) : (
                      <ImageFallback>KC</ImageFallback>
                    )}

                    <BadgeRow>
                      <CourseBadge>
                        {getLevelLabel(course?.level || "foundations")}
                      </CourseBadge>{" "}
                      <CourseBadge $light>
                        {course?.isPublished ? "Published" : "Draft"}
                      </CourseBadge>
                    </BadgeRow>
                  </CourseImageBox>

                  <CourseBody>
                    <CourseTitle>{course?.title}</CourseTitle>
                    <CourseText>{course?.description}</CourseText>

                    <CourseMeta>
                      <span>{course?.category}</span>
                      <span>
                        {course?.isFree
                          ? "Free"
                          : `$${Number(
                              course?.salePrice || course?.price || 0,
                            ).toFixed(2)}`}
                      </span>
                      <span>{course?.studentsCount || 0} students</span>
                      <span>
                        Requires:{" "}
                        {getLevelLabel(
                          course?.requiredMembershipLevel || "none",
                        )}
                      </span>
                      <span>
                        {course?.isFree ? "Free Course" : "Protected Course"}
                      </span>
                    </CourseMeta>

                    <CardActions>
                      <GhostButton
                        type="button"
                        onClick={() => handleEdit(course)}
                      >
                        Edit
                      </GhostButton>

                      <DangerButton
                        type="button"
                        disabled={deleting || saving}
                        onClick={() => handleDelete(course)}
                      >
                        Delete
                      </DangerButton>
                    </CardActions>
                  </CourseBody>
                </CourseCard>
              ))}
            </CourseList>
          )}
        </CoursesPanel>
      </DashboardGrid>
    </Page>
  );
};

export default ManageCourses;

/* =======================
   Styles
======================= */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  width: 100%;
  min-height: 100vh;
  padding: 28px 18px 60px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(
      circle at 10% 5%,
      rgba(214, 182, 159, 0.18),
      transparent 34%
    ),
    radial-gradient(circle at 90% 10%, rgba(90, 56, 37, 0.35), transparent 34%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown}
    );
`;

const Toast = styled.div`
  position: fixed;
  right: 18px;
  top: 18px;
  z-index: 9999;
  max-width: 380px;
  padding: 13px 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ $type }) =>
    $type === "error"
      ? "linear-gradient(135deg, rgba(190,40,40,.96), rgba(40,0,0,.96))"
      : "linear-gradient(135deg, rgba(214,182,159,.96), rgba(90,56,37,.96))"};
  color: ${({ theme }) => theme.colors.ivory};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  display: flex;
  align-items: center;
  gap: 12px;

  button {
    border: none;
    border-radius: ${({ theme }) => theme.radius.pill};
    padding: 6px 9px;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.25);
    color: ${({ theme }) => theme.colors.ivory};
  }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.7fr);
  gap: 18px;
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto 18px;
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 940px) {
    grid-template-columns: 1fr;
  }
`;

const HeroLeft = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(24px, 4vw, 42px);
  background:
    linear-gradient(145deg, rgba(61, 38, 26, 0.84), rgba(0, 0, 0, 0.64)),
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
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  max-width: 880px;
  font-size: clamp(2.2rem, 5vw, 5rem);
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

const HeroActions = styled.div`
  display: flex;
  gap: 11px;
  flex-wrap: wrap;
  margin-top: 22px;
`;

const HeroPanel = styled.aside`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 22px;
  background:
    radial-gradient(
      circle at 30% 0%,
      rgba(214, 182, 159, 0.16),
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
  font-size: 27px;
  line-height: 1.05;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const PanelList = styled.ul`
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
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

const StatsGrid = styled.section`
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto 18px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 16px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.16);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 30px;
    font-weight: 950;
  }

  span {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.76;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

const DashboardGrid = styled.section`
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.95fr);
  gap: 18px;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const FormPanel = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background: linear-gradient(
    150deg,
    rgba(61, 38, 26, 0.78),
    rgba(0, 0, 0, 0.62)
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const CoursesPanel = styled(FormPanel)``;

const PanelTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const SectionEyebrow = styled.p`
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.5rem, 2.5vw, 2.25rem);
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.045em;
`;

const MiniBadge = styled.span`
  white-space: nowrap;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 10px;
  background: rgba(214, 182, 159, 0.14);
  border: 1px solid rgba(214, 182, 159, 0.32);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  gap: 7px;
`;

const WideField = styled(Field)`
  grid-column: 1 / -1;
`;

const Label = styled.label`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.09em;
`;

const Input = styled.input`
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 13px;
  outline: none;

  &:focus {
    border-color: rgba(214, 182, 159, 0.72);
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.1);
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.45);
  }
`;

const Select = styled.select`
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.84);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 13px;
  outline: none;

  &:focus {
    border-color: rgba(214, 182, 159, 0.72);
  }
`;

const TextArea = styled.textarea`
  min-height: 108px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 13px;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: rgba(214, 182, 159, 0.72);
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.1);
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.45);
  }
`;

const PreviewImage = styled.img`
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const PreviewVideo = styled.video`
  width: 100%;
  max-height: 220px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(214, 182, 159, 0.18);
  background: #000;
`;

const ToggleGrid = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const CheckboxLabel = styled.label`
  min-height: 44px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 10px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 249, 242, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 850;
  display: flex;
  align-items: center;
  gap: 8px;

  input {
    accent-color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const FormActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const ButtonBase = styled.button`
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  min-height: 43px;
  padding: 0 15px;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(ButtonBase)`
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const GhostButton = styled(ButtonBase)`
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.2);
`;

const DangerButton = styled(ButtonBase)`
  background: rgba(190, 40, 40, 0.18);
  color: #ffd5d5;
  border: 1px solid rgba(255, 120, 120, 0.32);
`;

const Filters = styled.div`
  display: grid;
  grid-template-columns: 1fr 160px 160px;
  gap: 10px;
  margin-bottom: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StateBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 24px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 249, 242, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.8;
`;

const CourseList = styled.div`
  display: grid;
  gap: 13px;
  max-height: 980px;
  overflow: auto;
  padding-right: 4px;
`;

const CourseCard = styled.article`
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 13px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 249, 242, 0.1);
  overflow: hidden;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const CourseImageBox = styled.div`
  position: relative;
  min-height: 150px;
  background: ${({ theme }) => theme.colors.black};
`;

const CourseImage = styled.img`
  width: 100%;
  height: 100%;
  min-height: 150px;
  object-fit: cover;
`;

const ImageFallback = styled.div`
  height: 100%;
  min-height: 150px;
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 28px;
  font-weight: 950;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.brown},
    ${({ theme }) => theme.colors.black}
  );
`;

const BadgeRow = styled.div`
  position: absolute;
  inset: 10px 10px auto 10px;
  display: flex;
  justify-content: space-between;
  gap: 6px;
  flex-wrap: wrap;
`;

const CourseBadge = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 6px 8px;
  background: ${({ $light }) =>
    $light ? "rgba(214, 182, 159, 0.92)" : "rgba(0,0,0,0.72)"};
  color: ${({ $light, theme }) =>
    $light ? theme.colors.black : theme.colors.ivory};
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const CourseBody = styled.div`
  padding: 13px;
`;

const CourseTitle = styled.h3`
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 17px;
  font-weight: 950;
`;

const CourseText = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  font-size: 12.5px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CourseMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;

  span {
    border-radius: ${({ theme }) => theme.radius.pill};
    padding: 6px 8px;
    background: rgba(0, 0, 0, 0.32);
    border: 1px solid rgba(214, 182, 159, 0.14);
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 11px;
    text-transform: capitalize;
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;
