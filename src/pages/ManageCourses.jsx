// src/admin/pages/ManageCourses.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import styled from "styled-components";
import api from "../lib/apiClient"; // ✅ use shared axios instance

// ========= Toast =========
const ToastWrapper = styled.div`
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 9999;
`;

const ToastBox = styled.div`
  min-width: 260px;
  max-width: 340px;
  padding: 12px 16px;
  margin-bottom: 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $type }) =>
    $type === "error"
      ? `linear-gradient(135deg, #FF4E50 0%, #8B0000 100%)`
      : `linear-gradient(135deg, ${theme.colors.lightBrown} 0%, ${theme.colors.brown} 100%)`};
  color: ${({ theme }) => theme.colors.ivory};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const ToastMessage = styled.span`
  flex: 1;
`;

const ToastClose = styled.button`
  border: none;
  outline: none;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 4px 8px;
  font-size: 12px;
`;

// ========= Layout =========
const PageWrapper = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  padding: 24px 16px 40px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 26px;
  letter-spacing: 0.04em;
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const StatsRow = styled.div`
  margin-top: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.6);
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.2fr);
  gap: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

// ========= Courses Panel =========
const Panel = styled.div`
  background: ${({ theme }) =>
    `radial-gradient(circle at top left, ${theme.colors.cocoa} 0%, ${theme.colors.darkBrown} 40%, #000 100%)`};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 16px 16px 20px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  border: 1px solid rgba(255, 255, 255, 0.07);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const SmallText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const NewButton = styled.button`
  border: none;
  outline: none;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) =>
    `linear-gradient(130deg, ${theme.colors.lightBrown} 0%, ${theme.colors.brown} 50%, ${theme.colors.cocoa} 100%)`};
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  font-weight: 600;
  box-shadow: ${({ theme }) => theme.shadow.glow};
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
    opacity: 0.95;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
  }
`;

const TableWrapper = styled.div`
  max-height: 460px;
  overflow: auto;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(0, 0, 0, 0.45);
`;

const CourseTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.ivory};

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: rgba(0, 0, 0, 0.85);
  }

  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    text-align: left;
  }

  th {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.colors.lightBrown};
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const Badge = styled.span`
  padding: 4px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 500;
  background: ${({ $variant }) =>
    $variant === "published"
      ? `linear-gradient(120deg, #1FA97A 0%, #0C5740 100%)`
      : `linear-gradient(120deg, #444 0%, #111 100%)`};
  color: #f7f7f7;
`;

const ActionButton = styled.button`
  border: none;
  outline: none;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  transition: background 0.15s ease, transform 0.1s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.brown};
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  padding: 14px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

// ========= Form Panel =========
const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
  margin-top: 8px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Input = styled.input`
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.lightBrown};
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.6);
  }
`;

const TextArea = styled.textarea`
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  min-height: 72px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.lightBrown};
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.6);
  }
`;

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
`;

const Checkbox = styled.input.attrs({ type: "checkbox" })`
  accent-color: ${({ theme }) => theme.colors.lightBrown};
`;

const FormActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
`;

const SecondaryButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.1);
  outline: none;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
  }
`;

const PrimaryButton = styled.button`
  border: none;
  outline: none;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) =>
    `linear-gradient(130deg, ${theme.colors.lightBrown} 0%, ${theme.colors.brown} 40%, ${theme.colors.cocoa} 100%)`};
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 13px;
  font-weight: 600;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
  }
`;

const HelperText = styled.p`
  margin: 4px 0 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

// ========= Component =========

const initialFormState = {
  _id: null,
  title: "",
  description: "",
  category: "Boxing Fundamentals",
  focusArea: "",
  level: "all-levels",
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

const ManageCourses = () => {
  const [courses, setCourses] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [toast, setToast] = useState(null); // { message, type }
  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 4000);
  };

  // ✅ Stable fetch function – no infinite loop
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/courses");
      const payload = res.data || {};

      // support different backend shapes
      const list =
        Array.isArray(payload.data) ? payload.data :
        Array.isArray(payload.courses) ? payload.courses :
        Array.isArray(payload) ? payload :
        [];

      setCourses(list);
      setMeta({
        total: payload.total ?? list.length,
        page: payload.page ?? 1,
        pages: payload.pages ?? 1,
      });
      showToast("Courses loaded successfully");
    } catch (error) {
      console.error("fetchCourses error:", error);
      const msg =
        error?.response?.data?.message ||
        "Failed to load courses. Please try again.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleEditClick = (course) => {
    setIsEditing(true);
    setFormData({
      _id: course._id,
      title: course.title || "",
      description: course.description || "",
      category: course.category || "Boxing Fundamentals",
      focusArea: course.focusArea || "",
      level: course.level || "all-levels",
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
      equipmentNeeded: (course.equipmentNeeded || []).join(", "),
      requirements: (course.requirements || []).join(", "),
      whatYouWillLearn: (course.whatYouWillLearn || []).join(", "),
      tags: (course.tags || []).join(", "),
      isFeatured: Boolean(course.isFeatured),
      isPublished: Boolean(course.isPublished),
    });
  };

  const handleNewCourse = () => {
    setIsEditing(false);
    setFormData(initialFormState);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const buildPayload = () => {
    const toArray = (value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    return {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      focusArea: formData.focusArea.trim() || undefined,
      level: formData.level,
      thumbnail: formData.thumbnail.trim() || undefined,
      promoVideo: formData.promoVideo.trim() || undefined,
      price:
        formData.price === "" ? 0 : Number.isNaN(Number(formData.price))
          ? 0
          : Number(formData.price),
      salePrice:
        formData.salePrice === ""
          ? undefined
          : Number.isNaN(Number(formData.salePrice))
          ? undefined
          : Number(formData.salePrice),
      isFree: formData.isFree,
      durationInMinutes:
        formData.durationInMinutes === ""
          ? undefined
          : Number(formData.durationInMinutes),
      totalLessons:
        formData.totalLessons === ""
          ? undefined
          : Number(formData.totalLessons),
      language: formData.language.trim() || "English",
      equipmentNeeded: formData.equipmentNeeded
        ? toArray(formData.equipmentNeeded)
        : [],
      requirements: formData.requirements
        ? toArray(formData.requirements)
        : [],
      whatYouWillLearn: formData.whatYouWillLearn
        ? toArray(formData.whatYouWillLearn)
        : [],
      tags: formData.tags ? toArray(formData.tags).map((t) => t.toLowerCase()) : [],
      isFeatured: formData.isFeatured,
      isPublished: formData.isPublished,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();

    if (!payload.title || !payload.description) {
      showToast("Title and description are required.", "error");
      return;
    }

    try {
      setSaving(true);
      if (isEditing && formData._id) {
        // ✅ Update existing course
        const res = await api.put(`/api/v1/courses/${formData._id}`, payload);
        const updated =
          res.data?.data || res.data?.course || res.data || null;

        if (updated && updated._id) {
          setCourses((prev) =>
            prev.map((course) =>
              course._id === updated._id ? updated : course
            )
          );
        }
        showToast(res.data?.message || "Course updated successfully");
      } else {
        // ✅ Create new course
        const res = await api.post("/api/v1/courses", payload);
        const created =
          res.data?.data || res.data?.course || res.data || null;

        if (created && created._id) {
          setCourses((prev) => [created, ...prev]);
          setMeta((prev) => ({
            ...prev,
            total: (prev.total || 0) + 1,
          }));
        }

        showToast(res.data?.message || "Course created successfully");
        setFormData(initialFormState);
      }
    } catch (error) {
      console.error("handleSubmit error:", error);
      const msg =
        error?.response?.data?.message ||
        "Failed to save course. Please check the data and try again.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false);
    }
    setFormData(initialFormState);
  };

  const filteredCourses = useMemo(() => {
    const term = search.toLowerCase().trim();
    return courses.filter((course) => {
      const matchesSearch =
        !term ||
        course.title?.toLowerCase().includes(term) ||
        course.category?.toLowerCase().includes(term);
      const matchesLevel =
        levelFilter === "all" || course.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [courses, search, levelFilter]);

  const publishedCount = useMemo(
    () => courses.filter((c) => c.isPublished).length,
    [courses]
  );

  return (
    <>
      {toast && (
        <ToastWrapper>
          <ToastBox $type={toast.type}>
            <ToastMessage>{toast.message}</ToastMessage>
            <ToastClose onClick={() => setToast(null)}>Close</ToastClose>
          </ToastBox>
        </ToastWrapper>
      )}

      <PageWrapper>
        <Header>
          <Title>Manage Courses</Title>
          <Subtitle>View, edit, and create your boxing courses.</Subtitle>
          <StatsRow>
            Total: {meta.total} · Published: {publishedCount} · Drafts:{" "}
            {meta.total - publishedCount >= 0
              ? meta.total - publishedCount
              : 0}
          </StatsRow>
        </Header>

        <TopBar>
          <SearchInput
            placeholder="Search by title or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="all-levels">All-levels</option>
          </Select>
        </TopBar>

        <MainContent>
          {/* Courses List */}
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle>Courses</PanelTitle>
                <SmallText>
                  {loading
                    ? "Loading courses..."
                    : `${filteredCourses.length} visible of ${meta.total}`}
                </SmallText>
              </div>
              <NewButton type="button" onClick={handleNewCourse} disabled={saving}>
                + New Course
              </NewButton>
            </PanelHeader>

            <TableWrapper>
              {filteredCourses.length === 0 && !loading ? (
                <EmptyState>No courses found. Create your first course.</EmptyState>
              ) : (
                <CourseTable>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Level</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Students</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => (
                      <tr key={course._id}>
                        <td>{course.title}</td>
                        <td>{course.category}</td>
                        <td>{course.level}</td>
                        <td>
                          {course.isFree
                            ? "Free"
                            : `$${Number(course.price || 0).toFixed(2)}`}
                        </td>
                        <td>
                          <Badge
                            $variant={course.isPublished ? "published" : "draft"}
                          >
                            {course.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </td>
                        <td>{course.studentsCount ?? 0}</td>
                        <td>
                          <ActionButton
                            type="button"
                            onClick={() => handleEditClick(course)}
                          >
                            Edit
                          </ActionButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </CourseTable>
              )}
            </TableWrapper>
          </Panel>

          {/* Form Panel */}
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle>
                  {isEditing ? "Edit Course" : "Create Course"}
                </PanelTitle>
                <SmallText>
                  {isEditing
                    ? "Update course details and save to reflect in the database."
                    : "Fill the form to add a new course to the database."}
                </SmallText>
              </div>
            </PanelHeader>

            <Form onSubmit={handleSubmit}>
              <Field>
                <Label>Title *</Label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Iron Core Boxing Mastery"
                />
              </Field>

              <Field>
                <Label>Category</Label>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="Boxing Fundamentals">Boxing Fundamentals</option>
                  <option value="Conditioning">Conditioning</option>
                  <option value="Footwork">Footwork</option>
                  <option value="Defense">Defense</option>
                  <option value="Power Punching">Power Punching</option>
                  <option value="Strategy & Ring IQ">Strategy &amp; Ring IQ</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>

              <Field>
                <Label>Description *</Label>
                <TextArea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="This course will transform your boxing fundamentals, conditioning, and fight IQ..."
                />
              </Field>

              <Field>
                <Label>Focus Area</Label>
                <Input
                  name="focusArea"
                  value={formData.focusArea}
                  onChange={handleInputChange}
                  placeholder="Core strength, footwork, defense..."
                />
              </Field>

              <Field>
                <Label>Level</Label>
                <Select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                >
                  <option value="all-levels">All levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </Field>

              <Field>
                <Label>Price (USD)</Label>
                <Input
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="79.99"
                />
              </Field>

              <Field>
                <Label>Sale Price (optional)</Label>
                <Input
                  name="salePrice"
                  type="number"
                  value={formData.salePrice}
                  onChange={handleInputChange}
                  placeholder="59.99"
                />
              </Field>

              <Field>
                <Label>Duration (minutes)</Label>
                <Input
                  name="durationInMinutes"
                  type="number"
                  value={formData.durationInMinutes}
                  onChange={handleInputChange}
                  placeholder="240"
                />
              </Field>

              <Field>
                <Label>Total Lessons</Label>
                <Input
                  name="totalLessons"
                  type="number"
                  value={formData.totalLessons}
                  onChange={handleInputChange}
                  placeholder="24"
                />
              </Field>

              <Field>
                <Label>Language</Label>
                <Input
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  placeholder="English"
                />
              </Field>

              <Field>
                <Label>Thumbnail URL</Label>
                <Input
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </Field>

              <Field>
                <Label>Promo Video URL</Label>
                <Input
                  name="promoVideo"
                  value={formData.promoVideo}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </Field>

              <Field>
                <Label>Equipment Needed (comma separated)</Label>
                <Input
                  name="equipmentNeeded"
                  value={formData.equipmentNeeded}
                  onChange={handleInputChange}
                  placeholder="Boxing gloves, hand wraps, heavy bag..."
                />
              </Field>

              <Field>
                <Label>Requirements (comma separated)</Label>
                <Input
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleInputChange}
                  placeholder="Basic fitness level, access to a bag..."
                />
              </Field>

              <Field>
                <Label>What You Will Learn (comma separated)</Label>
                <Input
                  name="whatYouWillLearn"
                  value={formData.whatYouWillLearn}
                  onChange={handleInputChange}
                  placeholder="Perfect jab, tight defense, footwork patterns..."
                />
              </Field>

              <Field>
                <Label>Tags (comma separated)</Label>
                <Input
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="boxing, conditioning, knockoutcodes..."
                />
              </Field>

              <Field>
                <Label>Status & Flags</Label>
                <CheckboxRow>
                  <Checkbox
                    name="isFree"
                    checked={formData.isFree}
                    onChange={handleInputChange}
                  />
                  <span>Free Course</span>
                </CheckboxRow>
                <CheckboxRow>
                  <Checkbox
                    name="isPublished"
                    checked={formData.isPublished}
                    onChange={handleInputChange}
                  />
                  <span>Published</span>
                </CheckboxRow>
                <CheckboxRow>
                  <Checkbox
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleInputChange}
                  />
                  <span>Featured</span>
                </CheckboxRow>
              </Field>

              <FormActions>
                <SecondaryButton type="button" onClick={handleCancel}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={saving}>
                  {saving
                    ? isEditing
                      ? "Saving..."
                      : "Creating..."
                    : isEditing
                    ? "Save Changes"
                    : "Create Course"}
                </PrimaryButton>
              </FormActions>

              <HelperText>
                Title and description are required. Arrays like equipment,
                requirements, and what you will learn are comma separated.
              </HelperText>
            </Form>
          </Panel>
        </MainContent>
      </PageWrapper>
    </>
  );
};

export default ManageCourses;
