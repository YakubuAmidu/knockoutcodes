// src/pages/ManageLesson.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

import {
  fetchManageLessons,
  createManageLesson,
  updateManageLesson,
  deleteManageLesson,
  clearManageLessonMessages,
} from "../reducers/manageLesson/manageLessonActions";

const emptyResource = { label: "", url: "" };

const emptyForm = {
  course: "",
  title: "",
  description: "",
  videoUrl: "",
  durationInMinutes: "",
  order: "",
  isPreview: false,
  isPublished: true,
  resources: [],
};

export default function ManageLesson() {
  const dispatch = useDispatch();
  const toast = useToast();
  const isSubmittingRef = useRef(false);

  const {
    lessons,
    loading,
    creating,
    updating,
    deleting,
    error,
    successMessage,
    totalLessons,
    publishedLessons,
    draftLessons,
    previewLessons,
  } = useSelector((state) => state.manageLessons);

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [editingLesson, setEditingLesson] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    dispatch(fetchManageLessons());
    loadCourses();
  }, [dispatch, loadCourses]);

  useEffect(() => {
    if (successMessage) {
      toast.showToast(successMessage, "success");
      dispatch(clearManageLessonMessages());
    }

    if (error) {
      toast.showToast(error, "error");
      dispatch(clearManageLessonMessages());
    }
  }, [successMessage, error, toast, dispatch]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadCourses = async () => {
    try {
      setCoursesLoading(true);

      const { data } = await axiosInstance.get("/courses");

      const list = Array.isArray(data?.courses)
        ? data.courses
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setCourses(list);
    } catch {
      toast.showToast("Courses could not be loaded.", "error");
    } finally {
      setCoursesLoading(false);
    }
  };

  const filteredLessons = useMemo(() => {
    const value = search.toLowerCase().trim();

    return [...(lessons || [])]
      .filter((lesson) => {
        const lessonCourseId =
          lesson.course?._id || lesson.course || lesson.courseId || "";

        if (courseFilter !== "all" && lessonCourseId !== courseFilter) {
          return false;
        }

        if (statusFilter === "published" && lesson.isPublished === false) {
          return false;
        }

        if (statusFilter === "draft" && lesson.isPublished !== false) {
          return false;
        }

        if (statusFilter === "preview" && lesson.isPreview !== true) {
          return false;
        }

        if (!value) return true;

        return (
          lesson.title?.toLowerCase().includes(value) ||
          lesson.description?.toLowerCase().includes(value) ||
          lesson.course?.title?.toLowerCase().includes(value)
        );
      })
      .sort((a, b) => {
        const courseA = a.course?.title || "";
        const courseB = b.course?.title || "";

        if (courseA !== courseB) {
          return courseA.localeCompare(courseB);
        }

        const orderA = typeof a.order === "number" ? a.order : 999999;
        const orderB = typeof b.order === "number" ? b.order : 999999;

        return orderA - orderB;
      });
  }, [lessons, search, courseFilter, statusFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingLesson(null);
    setShowForm(false);
    isSubmittingRef.current = false;
  };

  const openCreateForm = () => {
    setEditingLesson(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleResourceChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.map((resource, resourceIndex) =>
        resourceIndex === index ? { ...resource, [field]: value } : resource,
      ),
    }));
  };

  const addResource = () => {
    setForm((prev) => ({
      ...prev,
      resources: [...prev.resources, emptyResource],
    }));
  };

  const removeResource = (index) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.filter(
        (_, resourceIndex) => resourceIndex !== index,
      ),
    }));
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);

    setForm({
      course: lesson.course?._id || lesson.course || lesson.courseId || "",
      title: lesson.title || "",
      description: lesson.description || "",
      videoUrl: lesson.videoUrl || "",
      durationInMinutes: lesson.durationInMinutes ?? "",
      order: lesson.order ?? "",
      isPreview: Boolean(lesson.isPreview),
      isPublished: lesson.isPublished !== false,
      resources: Array.isArray(lesson.resources) ? lesson.resources : [],
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    if (!form.course) {
      toast.showToast("Please select a course.", "error");
      return false;
    }

    if (!form.title.trim()) {
      toast.showToast("Lesson title is required.", "error");
      return false;
    }

    if (form.title.trim().length < 3) {
      toast.showToast("Lesson title must be at least 3 characters.", "error");
      return false;
    }

    if (Number(form.durationInMinutes || 0) < 0) {
      toast.showToast("Duration cannot be negative.", "error");
      return false;
    }

    if (Number(form.order || 0) < 0) {
      toast.showToast("Order cannot be negative.", "error");
      return false;
    }

    const invalidResource = form.resources.find(
      (resource) => resource.url && !/^https?:\/\//i.test(resource.url.trim()),
    );

    if (invalidResource) {
      toast.showToast(
        "Resource URLs must start with http:// or https://.",
        "error",
      );
      return false;
    }

    if (form.videoUrl && !/^https?:\/\//i.test(form.videoUrl.trim())) {
      toast.showToast(
        "Video URL must start with http:// or https://.",
        "error",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmittingRef.current) return;
    if (!validateForm()) return;

    isSubmittingRef.current = true;

    const payload = {
      course: form.course,
      title: form.title.trim(),
      description: form.description.trim(),
      videoUrl: form.videoUrl.trim(),
      durationInMinutes: Number(form.durationInMinutes || 0),
      order: Number(form.order || 0),
      isPreview: Boolean(form.isPreview),
      isPublished: Boolean(form.isPublished),
      resources: form.resources
        .map((resource) => ({
          label: String(resource.label || "").trim(),
          url: String(resource.url || "").trim(),
        }))
        .filter((resource) => resource.label || resource.url),
    };

    const result = editingLesson?._id
      ? await dispatch(updateManageLesson(editingLesson._id, payload))
      : await dispatch(createManageLesson(payload));

    isSubmittingRef.current = false;

    if (result?.success) {
      resetForm();
    }
  };

  const handleDelete = async (lesson) => {
    const confirmDelete = window.confirm(
      `Delete "${lesson.title}"? This will also remove its progress records.`,
    );

    if (!confirmDelete) return;

    await dispatch(deleteManageLesson(lesson._id));
  };

  return (
    <Page>
      <Hero>
        <HeroContent>
          <Eyebrow>KnockoutCodes Admin Lessons</Eyebrow>
          <Title>Manage Lessons Like a Champion</Title>
          <Text>
            Create, organize, update, publish, preview, and protect every course
            lesson from one premium command center.
          </Text>
        </HeroContent>

        <HeroStats>
          <StatCard>
            <span>Total Lessons</span>
            <strong>{totalLessons ?? lessons.length}</strong>
          </StatCard>

          <StatCard>
            <span>Published</span>
            <strong>{publishedLessons ?? 0}</strong>
          </StatCard>

          <StatCard>
            <span>Drafts</span>
            <strong>{draftLessons ?? 0}</strong>
          </StatCard>

          <StatCard>
            <span>Previews</span>
            <strong>{previewLessons ?? 0}</strong>
          </StatCard>
        </HeroStats>
      </Hero>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lessons, courses, descriptions..."
        />

        <Select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="preview">Preview</option>
        </Select>

        <PrimaryButton type="button" onClick={openCreateForm}>
          + Create Lesson
        </PrimaryButton>
      </Toolbar>

      {showForm && (
        <FormCard onSubmit={handleSubmit}>
          <FormHeader>
            <div>
              <SmallLabel>
                {editingLesson ? "Edit Lesson" : "Create Lesson"}
              </SmallLabel>
              <FormTitle>
                {editingLesson ? "Upgrade this lesson" : "Add a new lesson"}
              </FormTitle>
            </div>

            <CloseButton type="button" onClick={resetForm}>
              ✕
            </CloseButton>
          </FormHeader>

          <Grid>
            <Field>
              <Label>Course *</Label>
              <Select
                name="course"
                value={form.course}
                onChange={handleChange}
                disabled={coursesLoading}
              >
                <option value="">
                  {coursesLoading ? "Loading courses..." : "Select course"}
                </option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label>Lesson Title *</Label>
              <Input
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={160}
                placeholder="Example: Elite Footwork Foundation"
              />
            </Field>

            <Field>
              <Label>Video URL</Label>
              <Input
                name="videoUrl"
                value={form.videoUrl}
                onChange={handleChange}
                maxLength={500}
                placeholder="https://..."
              />
            </Field>

            <Field>
              <Label>Duration Minutes</Label>
              <Input
                type="number"
                min="0"
                name="durationInMinutes"
                value={form.durationInMinutes}
                onChange={handleChange}
                placeholder="15"
              />
            </Field>

            <Field>
              <Label>Order</Label>
              <Input
                type="number"
                min="0"
                name="order"
                value={form.order}
                onChange={handleChange}
                placeholder="1"
              />
            </Field>

            <CheckRow>
              <CheckLabel>
                <input
                  type="checkbox"
                  name="isPreview"
                  checked={form.isPreview}
                  onChange={handleChange}
                />
                Preview Lesson
              </CheckLabel>

              <CheckLabel>
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={form.isPublished}
                  onChange={handleChange}
                />
                Published
              </CheckLabel>
            </CheckRow>
          </Grid>

          <Field>
            <Label>Description</Label>
            <Textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={2000}
              placeholder="Describe what the student will learn..."
            />
            <Counter>{form.description.length}/2000</Counter>
          </Field>

          <ResourceBox>
            <ResourceHeader>
              <div>
                <SmallLabel>Resources</SmallLabel>
                <ResourceTitle>Optional lesson materials</ResourceTitle>
              </div>

              <GhostButton type="button" onClick={addResource}>
                + Add Resource
              </GhostButton>
            </ResourceHeader>

            {form.resources.length === 0 ? (
              <ResourceEmpty>No resources added yet.</ResourceEmpty>
            ) : (
              form.resources.map((resource, index) => (
                <ResourceGrid key={`${index}-${resource.label}`}>
                  <Input
                    value={resource.label}
                    onChange={(e) =>
                      handleResourceChange(index, "label", e.target.value)
                    }
                    maxLength={120}
                    placeholder="Resource label"
                  />

                  <Input
                    value={resource.url}
                    onChange={(e) =>
                      handleResourceChange(index, "url", e.target.value)
                    }
                    maxLength={500}
                    placeholder="https://resource-link.com"
                  />

                  <DangerButton
                    type="button"
                    onClick={() => removeResource(index)}
                  >
                    Remove
                  </DangerButton>
                </ResourceGrid>
              ))
            )}
          </ResourceBox>

          <SubmitRow>
            <GhostButton type="button" onClick={resetForm}>
              Cancel
            </GhostButton>

            <PrimaryButton type="submit" disabled={creating || updating}>
              {creating || updating
                ? "Saving..."
                : editingLesson
                  ? "Update Lesson"
                  : "Create Lesson"}
            </PrimaryButton>
          </SubmitRow>
        </FormCard>
      )}

      <LessonSection>
        {loading ? (
          <StateBox>Loading premium lesson library...</StateBox>
        ) : filteredLessons.length === 0 ? (
          <StateBox>No lessons found. Create your first lesson.</StateBox>
        ) : (
          <LessonGrid>
            {filteredLessons.map((lesson) => (
              <LessonCard key={lesson._id}>
                <LessonTop>
                  <LessonNumber>#{lesson.order ?? "—"}</LessonNumber>
                  <Status $published={lesson.isPublished !== false}>
                    {lesson.isPublished !== false ? "Published" : "Draft"}
                  </Status>
                </LessonTop>

                <LessonTitle>{lesson.title}</LessonTitle>

                <LessonCourse>
                  {lesson.course?.title || "Course not attached"}
                </LessonCourse>

                <LessonText>
                  {lesson.description || "No description added yet."}
                </LessonText>

                <MetaRow>
                  <Meta>{lesson.durationInMinutes || 0} min</Meta>
                  <Meta>{lesson.isPreview ? "Preview" : "Premium"}</Meta>
                  <Meta>
                    {lesson.videoUrl ? "Video Added" : "No Video Yet"}
                  </Meta>
                  <Meta>{lesson.resources?.length || 0} resources</Meta>
                </MetaRow>

                <ActionRow>
                  <GhostButton type="button" onClick={() => handleEdit(lesson)}>
                    Edit
                  </GhostButton>

                  <DangerButton
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDelete(lesson)}
                  >
                    Delete
                  </DangerButton>
                </ActionRow>
              </LessonCard>
            ))}
          </LessonGrid>
        )}
      </LessonSection>
    </Page>
  );
}

/* ============================
   Styles
============================ */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 16px 60px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(
      circle at 10% 5%,
      rgba(214, 182, 159, 0.18),
      transparent 34%
    ),
    radial-gradient(circle at 90% 12%, rgba(90, 56, 37, 0.38), transparent 34%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown}
    );
`;

const Hero = styled.section`
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto 18px;
  display: grid;
  grid-template-columns: 1fr 430px;
  gap: 18px;
  align-items: stretch;
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const HeroContent = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 28px;
  background: linear-gradient(
    145deg,
    rgba(61, 38, 26, 0.82),
    rgba(0, 0, 0, 0.58)
  );
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Eyebrow = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 4.7rem);
  line-height: 0.92;
  font-weight: 950;
  letter-spacing: -0.06em;
  max-width: 780px;
`;

const Text = styled.p`
  max-width: 720px;
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  line-height: 1.7;
`;

const HeroStats = styled.div`
  display: grid;
  gap: 12px;
`;

const StatCard = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 22px;
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(214, 182, 159, 0.16);

  span {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 34px;
    font-weight: 950;
  }
`;

const Toolbar = styled.section`
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto 18px;
  display: grid;
  grid-template-columns: 1fr 190px 160px auto;
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const SearchInput = styled.input`
  min-height: 48px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 18px;
  outline: none;

  &::placeholder {
    color: rgba(255, 249, 242, 0.55);
  }

  &:focus {
    border-color: rgba(214, 182, 159, 0.55);
  }
`;

const PrimaryButton = styled.button`
  min-height: 46px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 18px;
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FormCard = styled.form`
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto 18px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 20px;
  background: linear-gradient(
    180deg,
    rgba(47, 27, 18, 0.96),
    rgba(0, 0, 0, 0.68)
  );
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  animation: ${fadeUp} 0.28s ease both;
`;

const FormHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
`;

const SmallLabel = styled.p`
  margin: 0 0 5px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.13em;
  text-transform: uppercase;
`;

const FormTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 950;
`;

const CloseButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.36);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const Input = styled.input`
  min-height: 46px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background: rgba(0, 0, 0, 0.32);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 14px;
  outline: none;
`;

const Select = styled.select`
  min-height: 46px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background: rgba(0, 0, 0, 0.8);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 14px;
  outline: none;
`;

const Textarea = styled.textarea`
  min-height: 120px;
  resize: vertical;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background: rgba(0, 0, 0, 0.32);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 14px;
  outline: none;
`;

const Counter = styled.span`
  justify-self: end;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 800;
`;

const CheckRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const CheckLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 800;
`;

const ResourceBox = styled.div`
  margin-top: 18px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 16px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const ResourceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;

  @media (max-width: 620px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ResourceTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 950;
`;

const ResourceEmpty = styled.p`
  margin: 14px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.7;
`;

const ResourceGrid = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1.6fr auto;
  gap: 10px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const SubmitRow = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const LessonSection = styled.section`
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto;
`;

const LessonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const LessonCard = styled.article`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background: linear-gradient(
    180deg,
    rgba(47, 27, 18, 0.92),
    rgba(0, 0, 0, 0.66)
  );
  border: 1px solid rgba(255, 249, 242, 0.11);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(214, 182, 159, 0.4);
  }
`;

const LessonTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
`;

const LessonNumber = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 950;
`;

const Status = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 6px 9px;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.black};
  background: ${({ $published, theme }) =>
    $published ? theme.colors.lightBrown : "rgba(255,255,255,0.55)"};
`;

const LessonTitle = styled.h3`
  margin: 14px 0 8px;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.15;
`;

const LessonCourse = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 900;
`;

const LessonText = styled.p`
  min-height: 68px;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  line-height: 1.6;
  font-size: 13px;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`;

const Meta = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 6px 9px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(214, 182, 159, 0.18);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 11px;
  font-weight: 900;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const GhostButton = styled.button`
  min-height: 40px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  padding: 0 14px;
  font-weight: 950;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const DangerButton = styled(GhostButton)`
  border-color: rgba(255, 80, 80, 0.35);
  color: #ffb4b4;
`;

const StateBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 24px;
  text-align: center;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 249, 242, 0.11);
`;
