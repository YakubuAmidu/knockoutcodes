import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

import {
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  setSelectedEmailTemplate,
  clearEmailTemplateError,
  resetEmailTemplateSuccess,
} from "../reducers/emailTemplate/emailTemplateActions";

const emptyForm = {
  name: "",
  subject: "",
  previewText: "",
  headline: "",
  body: "",
  ctaText: "Learn More",
  ctaUrl: "",
  category: "newsletter",
  isActive: true,
};

export default function AdminEmailTemplates() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { user, isAuthenticated, isAdmin, checkingAuth } = useAuth();

  const {
    loading,
    creating,
    updating,
    deleting,
    templates = [],
    selectedTemplate,
    successMessage,
    error,
  } = useSelector((state) => state.emailTemplate || {});

  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const isEditing = Boolean(selectedTemplate?._id);

  useEffect(() => {
    if (!checkingAuth && (!isAuthenticated || !isAdmin)) {
      showToast("Admin access required.", "error");
      navigate("/login", { replace: true });
    }
  }, [checkingAuth, isAuthenticated, isAdmin, navigate, showToast]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      dispatch(fetchEmailTemplates());
    }
  }, [dispatch, isAuthenticated, isAdmin]);

  useEffect(() => {
    if (selectedTemplate) {
      setFormData({
        name: selectedTemplate.name || "",
        subject: selectedTemplate.subject || "",
        previewText: selectedTemplate.previewText || "",
        headline: selectedTemplate.headline || "",
        body: selectedTemplate.body || "",
        ctaText: selectedTemplate.ctaText || "Learn More",
        ctaUrl: selectedTemplate.ctaUrl || "",
        category: selectedTemplate.category || "newsletter",
        isActive: selectedTemplate.isActive ?? true,
      });
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (successMessage) {
      showToast(successMessage, "success");
      dispatch(resetEmailTemplateSuccess());
    }

    if (error) {
      showToast(error, "error");
      dispatch(clearEmailTemplateError());
    }
  }, [successMessage, error, dispatch, showToast]);

  const filteredTemplates = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return templates;

    return templates.filter((template) => {
      return (
        template?.name?.toLowerCase().includes(keyword) ||
        template?.subject?.toLowerCase().includes(keyword) ||
        template?.headline?.toLowerCase().includes(keyword) ||
        template?.category?.toLowerCase().includes(keyword)
      );
    });
  }, [templates, search]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleReset = () => {
    setFormData(emptyForm);
    dispatch(setSelectedEmailTemplate(null));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name || !formData.subject || !formData.headline || !formData.body) {
      showToast("Name, subject, headline, and body are required.", "error");
      return;
    }

    const result = isEditing
      ? await dispatch(updateEmailTemplate(selectedTemplate._id, formData))
      : await dispatch(createEmailTemplate(formData));

    if (result?.success) {
      handleReset();
    }
  };

  const handleEdit = (template) => {
    dispatch(setSelectedEmailTemplate(template));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this email template permanently?"
    );

    if (!confirmDelete) return;

    const result = await dispatch(deleteEmailTemplate(id));

    if (result?.success && selectedTemplate?._id === id) {
      handleReset();
    }
  };

  if (checkingAuth) {
    return (
      <PageShell>
        <LoadingCard>Checking admin protection...</LoadingCard>
      </PageShell>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <PageShell>
      <Hero>
        <HeroBadge>KnockoutCodes Email System</HeroBadge>

        <HeroGrid>
          <div>
            <Eyebrow>Template command center</Eyebrow>
            <Title>Build emails that hit hard before they even open.</Title>
            <Subtitle>
              Create premium campaign templates for launches, newsletters,
              offers, course drops, and brand announcements.
            </Subtitle>
          </div>

          <HeroStats>
            <StatBox>
              <strong>{templates.length}</strong>
              <span>Total Templates</span>
            </StatBox>

            <StatBox>
              <strong>
                {templates.filter((template) => template.isActive).length}
              </strong>
              <span>Active</span>
            </StatBox>

            <StatBox>
              <strong>
                {
                  templates.filter(
                    (template) => template.category === "promotion"
                  ).length
                }
              </strong>
              <span>Promos</span>
            </StatBox>
          </HeroStats>
        </HeroGrid>
      </Hero>

      <ContentGrid>
        <EditorCard>
          <SectionHeader>
            <div>
              <SectionTitle>
                {isEditing ? "Edit Template" : "Create New Template"}
              </SectionTitle>
              <SectionText>
                Keep the subject sharp, the headline powerful, and the CTA
                clear.
              </SectionText>
            </div>

            {isEditing && (
              <GhostButton type="button" onClick={handleReset}>
                Cancel Edit
              </GhostButton>
            )}
          </SectionHeader>

          <Form onSubmit={handleSubmit}>
            <FieldGroup>
              <Label>Template Name</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Black Friday Boxing Offer"
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Email Subject</Label>
              <Input
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Train like a champion today"
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Preview Text</Label>
              <Input
                name="previewText"
                value={formData.previewText}
                onChange={handleChange}
                placeholder="This is your edge before the bell rings..."
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Headline</Label>
              <Input
                name="headline"
                value={formData.headline}
                onChange={handleChange}
                placeholder="Stop training soft. Build champion discipline."
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Email Body</Label>
              <TextArea
                name="body"
                value={formData.body}
                onChange={handleChange}
                placeholder="Write the main message here..."
              />
            </FieldGroup>

            <TwoColumns>
              <FieldGroup>
                <Label>CTA Text</Label>
                <Input
                  name="ctaText"
                  value={formData.ctaText}
                  onChange={handleChange}
                  placeholder="Join Now"
                />
              </FieldGroup>

              <FieldGroup>
                <Label>CTA URL</Label>
                <Input
                  name="ctaUrl"
                  value={formData.ctaUrl}
                  onChange={handleChange}
                  placeholder="https://your-link.com"
                />
              </FieldGroup>
            </TwoColumns>

            <TwoColumns>
              <FieldGroup>
                <Label>Category</Label>
                <Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="newsletter">Newsletter</option>
                  <option value="promotion">Promotion</option>
                  <option value="course">Course</option>
                  <option value="announcement">Announcement</option>
                  <option value="welcome">Welcome</option>
                </Select>
              </FieldGroup>

              <ToggleBox>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>Template is active</span>
              </ToggleBox>
            </TwoColumns>

            <PrimaryButton type="submit" disabled={creating || updating}>
              {isEditing
                ? updating
                  ? "Updating..."
                  : "Update Template"
                : creating
                ? "Creating..."
                : "Create Template"}
            </PrimaryButton>
          </Form>
        </EditorCard>

        <ListCard>
          <SectionHeader>
            <div>
              <SectionTitle>Saved Templates</SectionTitle>
              <SectionText>
                Edit, update, or delete templates instantly.
              </SectionText>
            </div>
          </SectionHeader>

          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates..."
          />

          {loading ? (
            <LoadingCard>Loading templates...</LoadingCard>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState>No email templates found.</EmptyState>
          ) : (
            <TemplateList>
              {filteredTemplates.map((template) => (
                <TemplateItem key={template._id}>
                  <TemplateTop>
                    <div>
                      <TemplateName>{template.name}</TemplateName>
                      <TemplateSubject>{template.subject}</TemplateSubject>
                    </div>

                    <Status $active={template.isActive}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Status>
                  </TemplateTop>

                  <TemplateHeadline>{template.headline}</TemplateHeadline>

                  <TemplateMeta>
                    <span>{template.category}</span>
                    <span>
                      {template.createdAt
                        ? new Date(template.createdAt).toLocaleDateString()
                        : "No date"}
                    </span>
                  </TemplateMeta>

                  <ActionRow>
                    <SmallButton type="button" onClick={() => handleEdit(template)}>
                      Edit
                    </SmallButton>

                    <DangerButton
                      type="button"
                      disabled={deleting}
                      onClick={() => handleDelete(template._id)}
                    >
                      Delete
                    </DangerButton>
                  </ActionRow>
                </TemplateItem>
              ))}
            </TemplateList>
          )}
        </ListCard>
      </ContentGrid>
    </PageShell>
  );
};

const PageShell = styled.main`
  min-height: 100vh;
  padding: 2rem;
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.18), transparent 34%),
    radial-gradient(circle at bottom right, rgba(90, 56, 37, 0.45), transparent 30%),
    ${({ theme }) => theme.colors.darkBrown};
  color: ${({ theme }) => theme.colors.white};
`;

const Hero = styled.section`
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    ${({ theme }) => theme.colors.cocoa};
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 2rem;
  box-shadow: ${({ theme }) => theme.shadow.glow};
  margin-bottom: 1.5rem;
`;

const HeroBadge = styled.div`
  display: inline-flex;
  padding: 0.55rem 0.9rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(214, 182, 159, 0.16);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 1.25rem;
`;

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 1.5rem;
  align-items: end;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Eyebrow = styled.p`
  margin: 0 0 0.5rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 800;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  max-width: 760px;
  font-size: clamp(2.2rem, 5vw, 4.7rem);
  line-height: 0.94;
  letter-spacing: -0.07em;
`;

const Subtitle = styled.p`
  max-width: 720px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  font-size: 1.05rem;
  line-height: 1.7;
`;

const HeroStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StatBox = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);

  strong {
    display: block;
    font-size: 2rem;
    color: ${({ theme }) => theme.colors.lightBrown};
  }

  span {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.76;
    font-size: 0.86rem;
  }
`;

const ContentGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 1.25rem;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

const EditorCard = styled.article`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 1.35rem;
  background: rgba(61, 38, 26, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const ListCard = styled(EditorCard)``;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.45rem;
  letter-spacing: -0.04em;
`;

const SectionText = styled.p`
  margin: 0.35rem 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.7;
  line-height: 1.55;
`;

const Form = styled.form`
  display: grid;
  gap: 0.9rem;
`;

const FieldGroup = styled.label`
  display: grid;
  gap: 0.45rem;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.82rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const inputBase = `
  width: 100%;
  border: 1px solid rgba(255,255,255,0.11);
  outline: none;
  border-radius: 16px;
  background: rgba(0,0,0,0.26);
  color: #fff;
  padding: 0.95rem 1rem;
  transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;

  &:focus {
    border-color: rgba(214,182,159,.75);
    box-shadow: 0 0 0 4px rgba(214,182,159,.12);
    background: rgba(0,0,0,.34);
  }

  &::placeholder {
    color: rgba(255,255,255,.38);
  }
`;

const Input = styled.input`
  ${inputBase}
`;

const SearchInput = styled.input`
  ${inputBase}
  margin-bottom: 1rem;
`;

const Select = styled.select`
  ${inputBase}
`;

const TextArea = styled.textarea`
  ${inputBase}
  min-height: 150px;
  resize: vertical;
`;

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;

  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;

const ToggleBox = styled.label`
  min-height: 52px;
  align-self: end;
  display: flex;
  gap: 0.7rem;
  align-items: center;
  padding: 0.95rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.23);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 800;

  input {
    width: 18px;
    height: 18px;
    accent-color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const PrimaryButton = styled.button`
  width: 100%;
  margin-top: 0.4rem;
  padding: 1rem 1.1rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.lightBrown}, ${({ theme }) => theme.colors.brown});
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  box-shadow: 0 15px 34px rgba(0, 0, 0, 0.28);

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  white-space: nowrap;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
  font-weight: 850;
`;

const TemplateList = styled.div`
  display: grid;
  gap: 0.85rem;
  max-height: 760px;
  overflow: auto;
  padding-right: 0.25rem;
`;

const TemplateItem = styled.article`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background:
    linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.025)),
    rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255,255,255,.1);
`;

const TemplateTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
`;

const TemplateName = styled.h3`
  margin: 0;
  font-size: 1.05rem;
`;

const TemplateSubject = styled.p`
  margin: 0.3rem 0 0;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.9rem;
  font-weight: 800;
`;

const TemplateHeadline = styled.p`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;
  line-height: 1.55;
`;

const Status = styled.span`
  height: fit-content;
  padding: 0.42rem 0.7rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.75rem;
  font-weight: 950;
  color: ${({ $active }) => ($active ? "#07170c" : "#fff")};
  background: ${({ $active }) =>
    $active ? "rgba(139, 255, 174, 0.9)" : "rgba(255, 255, 255, 0.14)"};
`;

const TemplateMeta = styled.div`
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;

  span {
    padding: 0.42rem 0.65rem;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: rgba(214, 182, 159, 0.12);
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 0.78rem;
    font-weight: 850;
    text-transform: capitalize;
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.65rem;
  margin-top: 0.95rem;
`;

const SmallButton = styled.button`
  flex: 1;
  padding: 0.78rem 1rem;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
`;

const DangerButton = styled(SmallButton)`
  background: rgba(255, 75, 75, 0.16);
  color: #ffb8b8;
  border: 1px solid rgba(255, 75, 75, 0.3);

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const LoadingCard = styled.div`
  padding: 1.2rem;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.22);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
`;

const EmptyState = styled(LoadingCard)`
  color: ${({ theme }) => theme.colors.ivory};
`;