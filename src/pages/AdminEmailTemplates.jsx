import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

import {
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  setSelectedEmailTemplate,
  clearSelectedEmailTemplate,
  setEmailTemplateSearch,
  setEmailTemplateCategory,
  setEmailTemplateStatus,
  setEmailTemplateSort,
  setEmailTemplatePage,
  setEmailTemplateLimit,
  clearEmailTemplateError,
  resetEmailTemplateSuccess,
} from "../reducers/emailTemplate/emailTemplateActions";

const CATEGORIES = [
  "newsletter",
  "promotion",
  "course",
  "announcement",
  "welcome",
  "product",
  "order",
  "membership",
  "coaching",
  "system",
  "custom",
];

const STATUS_OPTIONS = ["all", "draft", "active", "inactive", "archived"];

const emptyForm = {
  name: "",
  subject: "",
  previewText: "",
  headline: "",
  body: "",
  ctaText: "Learn More",
  ctaUrl: "",
  category: "newsletter",
  status: "draft",
  notes: "",
};

const clean = (value = "") => String(value).trim();

const formatDate = (date) => {
  if (!date) return "Never";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Invalid date";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const isValidUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

function AdminEmailTemplate() {
  const dispatch = useDispatch();
  const mountedRef = useRef(true);
  const { showToast } = useToast();
  const { initializing, checkingAuth, isAuthenticated, isAdmin } = useAuth();

  const {
    loading,
    creating,
    updating,
    deleting,
    templates = [],
    selectedTemplate,
    summary = {},
    pagination = {},
    search = "",
    category = "all",
    status = "all",
    sort = "newest",
    success,
    successMessage,
    error,
  } = useSelector((state) => state.emailTemplate || {});

  const [formData, setFormData] = useState(emptyForm);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const authLoading = initializing || checkingAuth;
  const isEditing = Boolean(selectedTemplate?._id);
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const busy = creating || updating || deleting || localSubmitting;

  const page = pagination.page || 1;
  const limit = pagination.limit || 50;
  const totalPages = pagination.pages || 1;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      dispatch(clearEmailTemplateError());
      dispatch(resetEmailTemplateSuccess());
    };
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      dispatch(fetchEmailTemplates());
    }
  }, [dispatch, isAuthenticated, isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && isAdmin) {
        dispatch(fetchEmailTemplates());
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    dispatch,
    isAuthenticated,
    isAdmin,
    search,
    category,
    status,
    sort,
    page,
    limit,
  ]);

  useEffect(() => {
    if (!selectedTemplate) return;

    setFormData({
      name: selectedTemplate.name || "",
      subject: selectedTemplate.subject || "",
      previewText: selectedTemplate.previewText || "",
      headline: selectedTemplate.headline || "",
      body: selectedTemplate.body || "",
      ctaText: selectedTemplate.ctaText || "Learn More",
      ctaUrl: selectedTemplate.ctaUrl || "",
      category: selectedTemplate.category || "newsletter",
      status: selectedTemplate.status || "draft",
      notes: selectedTemplate.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedTemplate]);

  useEffect(() => {
    if (success && successMessage) {
      showToast(successMessage, "success");
      dispatch(resetEmailTemplateSuccess());
    }

    if (error) {
      showToast(error, "error");
      dispatch(clearEmailTemplateError());
    }
  }, [success, successMessage, error, dispatch, showToast]);

  const stats = useMemo(() => {
    return {
      total: summary.totalAll ?? pagination.total ?? safeTemplates.length,
      draft: summary.draft ?? 0,
      active: summary.active ?? 0,
      inactive: summary.inactive ?? 0,
      archived: summary.archived ?? 0,
      usageCount: summary.usageCount ?? 0,
    };
  }, [summary, pagination.total, safeTemplates.length]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReset = () => {
    setFormData(emptyForm);
    dispatch(clearSelectedEmailTemplate());
  };

  const validateForm = () => {
    const name = clean(formData.name);
    const subject = clean(formData.subject);
    const headline = clean(formData.headline);
    const body = clean(formData.body);
    const ctaUrl = clean(formData.ctaUrl);

    if (!name || !subject || !headline || !body) {
      showToast("Name, subject, headline, and body are required.", "error");
      return false;
    }

    if (name.length < 2 || name.length > 120) {
      showToast("Template name must be between 2 and 120 characters.", "error");
      return false;
    }

    if (subject.length < 2 || subject.length > 180) {
      showToast("Subject must be between 2 and 180 characters.", "error");
      return false;
    }

    if (headline.length < 2 || headline.length > 180) {
      showToast("Headline must be between 2 and 180 characters.", "error");
      return false;
    }

    if (body.length < 10 || body.length > 12000) {
      showToast("Email body must be between 10 and 12000 characters.", "error");
      return false;
    }

    if (!CATEGORIES.includes(formData.category)) {
      showToast("Choose a valid template category.", "error");
      return false;
    }

    if (
      !["draft", "active", "inactive", "archived"].includes(formData.status)
    ) {
      showToast("Choose a valid template status.", "error");
      return false;
    }

    if (ctaUrl && !isValidUrl(ctaUrl)) {
      showToast("CTA URL must start with http:// or https://", "error");
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    name: clean(formData.name),
    subject: clean(formData.subject),
    previewText: clean(formData.previewText),
    headline: clean(formData.headline),
    body: clean(formData.body),
    ctaText: clean(formData.ctaText) || "Learn More",
    ctaUrl: clean(formData.ctaUrl),
    category: formData.category,
    status: formData.status,
    isActive: formData.status === "active",
    notes: clean(formData.notes),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (busy) return;
    if (!validateForm()) return;

    setLocalSubmitting(true);

    try {
      const payload = buildPayload();

      const result = isEditing
        ? await dispatch(updateEmailTemplate(selectedTemplate._id, payload))
        : await dispatch(createEmailTemplate(payload));

      if (result?.success) {
        handleReset();
        dispatch(fetchEmailTemplates());
      }
    } finally {
      if (mountedRef.current) setLocalSubmitting(false);
    }
  };

  const handleEdit = (template) => {
    if (!template?._id) return;
    dispatch(setSelectedEmailTemplate(template));
  };

  const handleDuplicate = async (template) => {
    if (!template?._id || busy) return;

    const result = await dispatch(duplicateEmailTemplate(template));

    if (result?.success) {
      dispatch(fetchEmailTemplates());
    }
  };

  const handleToggleStatus = async (template) => {
    if (!template?._id || busy) return;

    const currentStatus = template.status || "draft";
    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    const result = await dispatch(
      updateEmailTemplate(template._id, {
        name: template.name,
        subject: template.subject,
        previewText: template.previewText || "",
        headline: template.headline,
        body: template.body,
        ctaText: template.ctaText || "Learn More",
        ctaUrl: template.ctaUrl || "",
        category: template.category || "newsletter",
        status: nextStatus,
        isActive: nextStatus === "active",
        notes: template.notes || "",
      }),
    );

    if (result?.success) {
      dispatch(fetchEmailTemplates());
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id || busy) return;

    const result = await dispatch(deleteEmailTemplate(deleteTarget._id));

    if (result?.success) {
      if (selectedTemplate?._id === deleteTarget._id) handleReset();
      setDeleteTarget(null);
      dispatch(fetchEmailTemplates());
    }
  };

  const handleRefresh = () => {
    if (!busy) dispatch(fetchEmailTemplates());
  };

  const handleSetSearch = (value) => {
    dispatch(setEmailTemplateSearch(value));
    dispatch(setEmailTemplatePage(1));
  };

  const handleSetCategory = (value) => {
    dispatch(setEmailTemplateCategory(value));
    dispatch(setEmailTemplatePage(1));
  };

  const handleSetStatus = (value) => {
    dispatch(setEmailTemplateStatus(value));
    dispatch(setEmailTemplatePage(1));
  };

  const handleSetSort = (value) => {
    dispatch(setEmailTemplateSort(value));
    dispatch(setEmailTemplatePage(1));
  };

  if (authLoading) {
    return (
      <PageShell>
        <LoadingCard>Checking admin protection...</LoadingCard>
      </PageShell>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;

  return (
    <PageShell>
      <Hero>
        <HeroBadge>KnockoutCodes Email System</HeroBadge>

        <HeroGrid>
          <div>
            <Eyebrow>Template Command Center</Eyebrow>
            <Title>Build premium emails for every campaign flow.</Title>
            <Subtitle>
              Create, edit, preview, duplicate, activate, archive, and manage
              enterprise email templates for campaigns, products, courses,
              memberships, coaching, orders, and system messages.
            </Subtitle>
          </div>

          <HeroStats>
            <StatBox>
              <strong>{stats.total}</strong>
              <span>Total</span>
            </StatBox>
            <StatBox>
              <strong>{stats.active}</strong>
              <span>Active</span>
            </StatBox>
            <StatBox>
              <strong>{stats.draft}</strong>
              <span>Drafts</span>
            </StatBox>
            <StatBox>
              <strong>{stats.inactive}</strong>
              <span>Inactive</span>
            </StatBox>
            <StatBox>
              <strong>{stats.archived}</strong>
              <span>Archived</span>
            </StatBox>
            <StatBox>
              <strong>{stats.usageCount}</strong>
              <span>Total Uses</span>
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
                Keep the subject sharp, body clean, CTA clear, and status
                controlled before sending campaigns.
              </SectionText>
            </div>

            {isEditing && (
              <GhostButton type="button" onClick={handleReset} disabled={busy}>
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
                maxLength={120}
                disabled={busy}
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Email Subject</Label>
              <Input
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Train like a champion today"
                maxLength={180}
                disabled={busy}
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Preview Text</Label>
              <Input
                name="previewText"
                value={formData.previewText}
                onChange={handleChange}
                placeholder="This is your edge before the bell rings..."
                maxLength={220}
                disabled={busy}
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Headline</Label>
              <Input
                name="headline"
                value={formData.headline}
                onChange={handleChange}
                placeholder="Stop training soft. Build champion discipline."
                maxLength={180}
                disabled={busy}
              />
            </FieldGroup>

            <FieldGroup>
              <Label>Email Body</Label>
              <TextArea
                name="body"
                value={formData.body}
                onChange={handleChange}
                placeholder="Write the main email message here..."
                disabled={busy}
              />
              <Counter>{formData.body.length}/12000</Counter>
            </FieldGroup>

            <TwoColumns>
              <FieldGroup>
                <Label>CTA Text</Label>
                <Input
                  name="ctaText"
                  value={formData.ctaText}
                  onChange={handleChange}
                  placeholder="Join Now"
                  maxLength={60}
                  disabled={busy}
                />
              </FieldGroup>

              <FieldGroup>
                <Label>CTA URL</Label>
                <Input
                  name="ctaUrl"
                  value={formData.ctaUrl}
                  onChange={handleChange}
                  placeholder="https://your-link.com"
                  maxLength={500}
                  disabled={busy}
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
                  disabled={busy}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup>
                <Label>Status</Label>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={busy}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </Select>
              </FieldGroup>
            </TwoColumns>

            <FieldGroup>
              <Label>Internal Notes</Label>
              <TextArea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Private admin notes about this template..."
                disabled={busy}
              />
              <Counter>{formData.notes.length}/1000</Counter>
            </FieldGroup>

            <ButtonRow>
              <PrimaryButton type="submit" disabled={busy}>
                {isEditing
                  ? updating || localSubmitting
                    ? "Updating..."
                    : "Update Template"
                  : creating || localSubmitting
                    ? "Creating..."
                    : "Create Template"}
              </PrimaryButton>

              <GhostButton
                type="button"
                disabled={busy}
                onClick={() => {
                  if (validateForm()) setPreviewTemplate(buildPayload());
                }}
              >
                Preview
              </GhostButton>
            </ButtonRow>
          </Form>
        </EditorCard>

        <ListCard>
          <SectionHeader>
            <div>
              <SectionTitle>Saved Templates</SectionTitle>
              <SectionText>
                Search, filter, preview, duplicate, activate, archive, and
                delete templates safely.
              </SectionText>
            </div>

            <GhostButton type="button" onClick={handleRefresh} disabled={busy}>
              Refresh
            </GhostButton>
          </SectionHeader>

          <Toolbar>
            <SearchInput
              value={search}
              onChange={(event) => handleSetSearch(event.target.value)}
              placeholder="Search name, subject, headline..."
            />

            <Select
              value={category}
              onChange={(event) => handleSetCategory(event.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>

            <Select
              value={status}
              onChange={(event) => handleSetStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All Statuses" : item}
                </option>
              ))}
            </Select>

            <Select
              value={sort}
              onChange={(event) => handleSetSort(event.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
              <option value="name">Name A-Z</option>
              <option value="category">Category A-Z</option>
              <option value="mostUsed">Most Used</option>
              <option value="lastUsed">Last Used</option>
            </Select>
          </Toolbar>

          {loading ? (
            <LoadingCard>Loading templates...</LoadingCard>
          ) : safeTemplates.length === 0 ? (
            <EmptyState>No email templates found.</EmptyState>
          ) : (
            <>
              <TemplateList>
                {safeTemplates.map((template) => {
                  const templateStatus = template.status || "draft";

                  return (
                    <TemplateItem key={template._id}>
                      <TemplateTop>
                        <div>
                          <TemplateName>{template.name}</TemplateName>
                          <TemplateSubject>{template.subject}</TemplateSubject>
                        </div>

                        <Status $status={templateStatus}>
                          {templateStatus}
                        </Status>
                      </TemplateTop>

                      <TemplateHeadline>{template.headline}</TemplateHeadline>

                      <TemplateMeta>
                        <span>{template.category || "custom"}</span>
                        <span>Version: {template.version || 1}</span>
                        <span>Used: {template.usageCount || 0}</span>
                        <span>Created: {formatDate(template.createdAt)}</span>
                        <span>Updated: {formatDate(template.updatedAt)}</span>
                        <span>
                          Last Used: {formatDate(template.lastUsedAt)}
                        </span>
                      </TemplateMeta>

                      <ActionRow>
                        <SmallButton
                          type="button"
                          onClick={() => handleEdit(template)}
                          disabled={busy}
                        >
                          Edit
                        </SmallButton>

                        <SmallButton
                          type="button"
                          onClick={() => setPreviewTemplate(template)}
                          disabled={busy}
                        >
                          Preview
                        </SmallButton>

                        <SmallButton
                          type="button"
                          onClick={() => handleDuplicate(template)}
                          disabled={busy}
                        >
                          Duplicate
                        </SmallButton>

                        <SmallButton
                          type="button"
                          onClick={() => handleToggleStatus(template)}
                          disabled={busy}
                        >
                          {templateStatus === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </SmallButton>

                        <SmallButton
                          type="button"
                          onClick={() =>
                            dispatch(
                              updateEmailTemplate(template._id, {
                                ...template,
                                status: "archived",
                                isActive: false,
                              }),
                            ).then(() => dispatch(fetchEmailTemplates()))
                          }
                          disabled={busy || templateStatus === "archived"}
                        >
                          Archive
                        </SmallButton>

                        <DangerButton
                          type="button"
                          disabled={busy}
                          onClick={() => setDeleteTarget(template)}
                        >
                          {deleting ? "Deleting..." : "Delete"}
                        </DangerButton>
                      </ActionRow>
                    </TemplateItem>
                  );
                })}
              </TemplateList>

              <Pagination>
                <span>
                  Page {page} of {totalPages} · {pagination.total || 0} total
                </span>

                <PaginationControls>
                  <Select
                    value={limit}
                    onChange={(event) =>
                      dispatch(
                        setEmailTemplateLimit(Number(event.target.value)),
                      )
                    }
                  >
                    <option value={5}>5 / page</option>
                    <option value={8}>8 / page</option>
                    <option value={12}>12 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </Select>

                  <GhostButton
                    type="button"
                    disabled={page <= 1}
                    onClick={() => dispatch(setEmailTemplatePage(page - 1))}
                  >
                    Prev
                  </GhostButton>

                  <GhostButton
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => dispatch(setEmailTemplatePage(page + 1))}
                  >
                    Next
                  </GhostButton>
                </PaginationControls>
              </Pagination>
            </>
          )}
        </ListCard>
      </ContentGrid>

      {previewTemplate && (
        <ModalBackdrop onClick={() => setPreviewTemplate(null)}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <div>
                <SectionTitle>Email Preview</SectionTitle>
                <SectionText>{previewTemplate.subject}</SectionText>
              </div>

              <GhostButton
                type="button"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </GhostButton>
            </ModalHeader>

            <EmailPreview>
              {previewTemplate.previewText && (
                <PreviewText>{previewTemplate.previewText}</PreviewText>
              )}

              <PreviewHeadline>{previewTemplate.headline}</PreviewHeadline>
              <PreviewBody>{previewTemplate.body}</PreviewBody>

              {previewTemplate.ctaText && previewTemplate.ctaUrl && (
                <PreviewCta
                  href={previewTemplate.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {previewTemplate.ctaText}
                </PreviewCta>
              )}
            </EmailPreview>
          </ModalCard>
        </ModalBackdrop>
      )}

      {deleteTarget && (
        <ModalBackdrop onClick={() => setDeleteTarget(null)}>
          <ConfirmCard onClick={(event) => event.stopPropagation()}>
            <SectionTitle>Delete Template?</SectionTitle>
            <SectionText>
              This will permanently delete <strong>{deleteTarget.name}</strong>.
              This action cannot be undone.
            </SectionText>

            <ConfirmActions>
              <GhostButton
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={busy}
              >
                Cancel
              </GhostButton>

              <DangerButton
                type="button"
                onClick={confirmDelete}
                disabled={busy}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </DangerButton>
            </ConfirmActions>
          </ConfirmCard>
        </ModalBackdrop>
      )}
    </PageShell>
  );
}

export default AdminEmailTemplate;

const PageShell = styled.main`
  min-height: 100vh;
  padding: 2rem;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      transparent 34%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(90, 56, 37, 0.45),
      transparent 30%
    ),
    #1b0d07;
  color: #ffffff;

  @media (max-width: 650px) {
    padding: 1rem;
  }
`;

const Hero = styled.section`
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.03)
    ),
    #3d261a;
  border-radius: 30px;
  padding: 2rem;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
  margin-bottom: 1.5rem;
`;

const HeroBadge = styled.div`
  display: inline-flex;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.16);
  color: #d6b69f;
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
  color: #d6b69f;
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
  color: #fff9f2;
  opacity: 0.84;
  font-size: 1.05rem;
  line-height: 1.7;
`;

const HeroStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.8rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StatBox = styled.div`
  padding: 1rem;
  border-radius: 22px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);

  strong {
    display: block;
    font-size: 2rem;
    color: #d6b69f;
  }

  span {
    color: #fff9f2;
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
  border-radius: 30px;
  padding: 1.35rem;
  background: rgba(61, 38, 26, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ListCard = styled(EditorCard)``;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;

  @media (max-width: 650px) {
    flex-direction: column;
  }
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.45rem;
  letter-spacing: -0.04em;
`;

const SectionText = styled.p`
  margin: 0.35rem 0 0;
  color: #fff9f2;
  opacity: 0.75;
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
  color: #d6b69f;
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

  &:disabled {
    opacity: .6;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  ${inputBase}
`;

const SearchInput = styled.input`
  ${inputBase}
`;

const Select = styled.select`
  ${inputBase}
  text-transform: capitalize;

  option {
    color: #111;
  }
`;

const TextArea = styled.textarea`
  ${inputBase}
  min-height: 150px;
  resize: vertical;
`;

const Counter = styled.small`
  color: rgba(255, 249, 242, 0.55);
  text-align: right;
`;

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;

  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 0.8fr 0.8fr;
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button`
  flex: 1;
  margin-top: 0.4rem;
  padding: 1rem 1.1rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #d6b69f, #5a3825);
  color: #050201;
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  white-space: nowrap;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  color: #fff9f2;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
  border-radius: 22px;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.025)
    ),
    rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  color: #d6b69f;
  font-size: 0.9rem;
  font-weight: 800;
`;

const TemplateHeadline = styled.p`
  color: #fff9f2;
  opacity: 0.82;
  line-height: 1.55;
`;

const Status = styled.span`
  height: fit-content;
  padding: 0.42rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 950;
  text-transform: capitalize;
  color: ${({ $status }) => ($status === "active" ? "#07170c" : "#fff")};
  background: ${({ $status }) => {
    if ($status === "active") return "rgba(139, 255, 174, 0.9)";
    if ($status === "draft") return "rgba(255, 213, 128, 0.24)";
    if ($status === "archived") return "rgba(150, 150, 150, 0.2)";
    return "rgba(255, 255, 255, 0.14)";
  }};
`;

const TemplateMeta = styled.div`
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;

  span {
    padding: 0.42rem 0.65rem;
    border-radius: 999px;
    background: rgba(214, 182, 159, 0.12);
    color: #d6b69f;
    font-size: 0.78rem;
    font-weight: 850;
    text-transform: capitalize;
  }
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.95rem;
  width: 100%;
`;

const SmallButton = styled.button`
  flex: 1 1 120px;
  min-width: 105px;
  padding: 0.72rem 0.85rem;
  border-radius: 999px;
  border: none;
  background: #d6b69f;
  color: #050201;
  font-weight: 950;
  font-size: 0.82rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 500px) {
    flex: 1 1 100%;
  }
`;

const DangerButton = styled(SmallButton)`
  background: rgba(255, 75, 75, 0.16);
  color: #ffb8b8;
  border: 1px solid rgba(255, 75, 75, 0.3);
`;

const LoadingCard = styled.div`
  padding: 1.2rem;
  border-radius: 22px;
  background: rgba(0, 0, 0, 0.22);
  color: #d6b69f;
  font-weight: 900;
`;

const EmptyState = styled(LoadingCard)`
  color: #fff9f2;
`;

const Pagination = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff9f2;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 0.65rem;

  @media (max-width: 500px) {
    flex-direction: column;
  }
`;

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.72);
  display: grid;
  place-items: center;
  padding: 1rem;
`;

const ModalCard = styled.div`
  width: min(760px, 100%);
  max-height: 90vh;
  overflow: auto;
  border-radius: 30px;
  background: #3d261a;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  padding: 1.25rem;
`;

const ConfirmCard = styled(ModalCard)`
  width: min(520px, 100%);
`;

const ModalHeader = styled(SectionHeader)`
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1rem;
`;

const EmailPreview = styled.div`
  margin-top: 1rem;
  padding: 1.25rem;
  border-radius: 22px;
  background: #fff;
  color: #1a1a1a;
`;

const PreviewText = styled.p`
  margin: 0 0 1rem;
  color: #777;
  font-size: 0.9rem;
`;

const PreviewHeadline = styled.h2`
  margin: 0 0 1rem;
  color: #111;
`;

const PreviewBody = styled.p`
  white-space: pre-wrap;
  line-height: 1.75;
`;

const PreviewCta = styled.a`
  display: inline-flex;
  margin-top: 1rem;
  padding: 0.9rem 1.2rem;
  border-radius: 999px;
  background: #111;
  color: #fff;
  text-decoration: none;
  font-weight: 900;
`;

const ConfirmActions = styled.div`
  margin-top: 1.25rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;

  @media (max-width: 500px) {
    flex-direction: column;
  }
`;
