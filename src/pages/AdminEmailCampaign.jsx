// src/pages/AdminEmailCampaign.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "../components/Toast";

import {
  fetchEmailCampaigns,
  createEmailCampaign,
  updateEmailCampaign,
  deleteEmailCampaign,
  sendEmailCampaign,
  setSelectedEmailCampaign,
  clearEmailCampaignError,
  resetEmailCampaignSuccess,
} from "../reducers/emailCampaign/emailCampaignActions";

const EMAIL_REGEX = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/i;

const INITIAL_FORM = {
  name: "",
  subject: "",
  previewText: "",
  brandName: "KnockoutCodes",
  headline: "",
  subheadline: "",
  body: "",
  ctaText: "Shop Now",
  ctaUrl: "",
  signature: "Team KnockoutCodes",
  audienceType: "newsletter",
  manualRecipients: "",
  status: "draft",
  scheduledFor: "",
  sendNow: false,
};

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeManualRecipients(value = "") {
  return [
    ...new Set(
      String(value)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function isValidHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function extractCreatedId(result) {
  return (
    result?._id ||
    result?.data?._id ||
    result?.payload?._id ||
    result?.campaign?._id ||
    result?.data?.campaign?._id ||
    null
  );
}

export default function AdminEmailCampaign() {
  const dispatch = useDispatch();
  const toast = useToast();

  const {
    loading = false,
    creating = false,
    updating = false,
    deleting = false,
    sending = false,
    campaigns = [],
    selectedCampaign = null,
    successMessage = "",
    error = "",
  } = useSelector((state) => state?.emailCampaign || {});

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [search, setSearch] = useState("");

  const safeCampaigns = useMemo(
    () => (Array.isArray(campaigns) ? campaigns : []),
    [campaigns]
  );

  const pushToast = useCallback(
    ({ title, description, variant = "info" }) => {
      if (toast?.push) toast.push({ title, description, variant });
      else if (toast?.showToast) toast.showToast(description || title, variant);
    },
    [toast]
  );

  useEffect(() => {
  const savedEmails = localStorage.getItem("selectedCampaignEmails");
  if (!savedEmails) return;

  try {
    const parsedEmails = JSON.parse(savedEmails);

    if (Array.isArray(parsedEmails) && parsedEmails.length > 0) {
      const cleanEmails = [
        ...new Set(
          parsedEmails
            .map((email) => String(email || "").trim().toLowerCase())
            .filter(Boolean)
        ),
      ];

      setFormData({
        ...INITIAL_FORM,
        audienceType: "manual",
        manualRecipients: cleanEmails.join(", "),
      });

      pushToast({
        title: "Subscribers Loaded",
        description: `${cleanEmails.length} subscriber(s) added.`,
        variant: "success",
      });
    }
  } catch {
    localStorage.removeItem("selectedCampaignEmails");
  }
  }, [pushToast]);
  
  useEffect(() => {
  dispatch(fetchEmailCampaigns());
}, [dispatch]);

  useEffect(() => {
  if (!selectedCampaign) {
    const savedEmails = localStorage.getItem("selectedCampaignEmails");

    if (savedEmails) return;

    setFormData({ ...INITIAL_FORM });
    return;
  }

  localStorage.removeItem("selectedCampaignEmails");

  setFormData({
      name: selectedCampaign?.name || "",
      subject: selectedCampaign?.subject || "",
      previewText: selectedCampaign?.previewText || "",
      brandName: selectedCampaign?.brandName || "KnockoutCodes",
      headline: selectedCampaign?.headline || "",
      subheadline: selectedCampaign?.subheadline || "",
      body: selectedCampaign?.body || "",
      ctaText: selectedCampaign?.ctaText || "Shop Now",
      ctaUrl: selectedCampaign?.ctaUrl || "",
      signature: selectedCampaign?.signature || "Team KnockoutCodes",
      audienceType: selectedCampaign?.audienceType || "newsletter",
      manualRecipients: Array.isArray(selectedCampaign?.manualRecipients)
        ? selectedCampaign.manualRecipients.join(", ")
        : "",
      status: selectedCampaign?.status || "draft",
      scheduledFor: toLocalDateTimeInput(selectedCampaign?.scheduledFor),
      sendNow: false,
    });
  }, [selectedCampaign]);

  useEffect(() => {
    if (!error) return;
    pushToast({ title: "Error", description: error, variant: "error" });
    dispatch(clearEmailCampaignError());
  }, [error, dispatch, pushToast]);

  useEffect(() => {
    if (!successMessage) return;
    pushToast({ title: "Success", description: successMessage, variant: "success" });
    dispatch(resetEmailCampaignSuccess());
  }, [successMessage, dispatch, pushToast]);

  const filteredCampaigns = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    if (!keyword) return safeCampaigns;

    return safeCampaigns.filter((campaign) =>
      [
        campaign?.name,
        campaign?.subject,
        campaign?.headline,
        campaign?.audienceType,
        campaign?.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [safeCampaigns, search]);

  const derivedStatus = useMemo(() => {
    if (formData.sendNow) return "draft";
    if (formData.scheduledFor) return "scheduled";
    return formData.status === "sent" ? "sent" : "draft";
  }, [formData]);

  const totals = useMemo(
    () => ({
      total: safeCampaigns.length,
      draft: safeCampaigns.filter((item) => item?.status === "draft").length,
      scheduled: safeCampaigns.filter((item) => item?.status === "scheduled").length,
      sent: safeCampaigns.filter((item) => item?.status === "sent").length,
    }),
    [safeCampaigns]
  );

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleResetForm() {
    dispatch(setSelectedEmailCampaign(null));
    setFormData({ ...INITIAL_FORM });
  }

  function validatePayload(payload) {
    if (!payload.name || !payload.subject || !payload.headline || !payload.body) {
      return "Name, subject, headline, and body are required.";
    }

    if (!isValidHttpUrl(payload.ctaUrl)) {
      return "CTA URL must start with http:// or https://.";
    }

    if (payload.audienceType === "manual") {
      if (!payload.manualRecipients.length) {
        return "Please add at least one manual recipient email.";
      }

      const invalid = payload.manualRecipients.find((email) => !EMAIL_REGEX.test(email));
      if (invalid) return `Invalid recipient email: ${invalid}`;
    }

    if (payload.scheduledFor) {
      const scheduledDate = new Date(payload.scheduledFor);
      if (Number.isNaN(scheduledDate.getTime())) return "Invalid schedule date.";
      if (scheduledDate <= new Date()) return "Schedule date must be in the future.";
    }

    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const manualRecipients =
      formData.audienceType === "manual"
        ? normalizeManualRecipients(formData.manualRecipients)
        : [];

    const payload = {
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      previewText: formData.previewText.trim(),
      brandName: formData.brandName.trim() || "KnockoutCodes",
      headline: formData.headline.trim(),
      subheadline: formData.subheadline.trim(),
      body: formData.body.trim(),
      ctaText: formData.ctaText.trim() || "Shop Now",
      ctaUrl: formData.ctaUrl.trim(),
      signature: formData.signature.trim() || "Team KnockoutCodes",
      audienceType: formData.audienceType,
      status: formData.scheduledFor && !formData.sendNow ? "scheduled" : "draft",
      scheduledFor: formData.sendNow ? null : formData.scheduledFor || null,
      manualRecipients,
    };

    const validationError = validatePayload(payload);
    if (validationError) {
      pushToast({ title: "Fix campaign", description: validationError, variant: "error" });
      return;
    }

    try {
      if (selectedCampaign?._id) {
        await dispatch(updateEmailCampaign(selectedCampaign._id, payload));

        if (formData.sendNow) {
          await dispatch(sendEmailCampaign(selectedCampaign._id));
        }
      } else {
        const result = await dispatch(createEmailCampaign(payload));
        const createdId = extractCreatedId(result);

        if (formData.sendNow && createdId) {
          await dispatch(sendEmailCampaign(createdId));
        }
      }

      await dispatch(fetchEmailCampaigns());
    } catch {
      pushToast({
        title: "Error",
        description: "Something went wrong while saving campaign.",
        variant: "error",
      });
    }
  }

  async function handleDelete(campaign) {
    if (!campaign?._id) return;

    if (campaign.status === "sending") {
      pushToast({
        title: "Blocked",
        description: "A sending campaign cannot be deleted.",
        variant: "error",
      });
      return;
    }

    if (!window.confirm("Delete this campaign permanently?")) return;

    await dispatch(deleteEmailCampaign(campaign._id));
    if (selectedCampaign?._id === campaign._id) handleResetForm();
  }

  async function handleSend(campaign) {
    if (!campaign?._id) return;

    if (["sent", "sending"].includes(campaign.status)) {
      pushToast({
        title: "Blocked",
        description: "This campaign was already sent or is currently sending.",
        variant: "error",
      });
      return;
    }

    if (!window.confirm("Send this campaign now?")) return;

    await dispatch(sendEmailCampaign(campaign._id));
    await dispatch(fetchEmailCampaigns());
  }

  return (
    <Page>
      <Inner>
        <Hero initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <Badge>ADMIN • EMAIL CAMPAIGNS</Badge>
          <Title>
            HIT THE <span>INBOX</span> WITH PRECISION.
          </Title>
          <Sub>
            Create premium campaigns, target the right audience, schedule launches,
            and protect your list like a real brand asset.
          </Sub>

          <HeroRow>
            <HeroStat><HeroStatValue>{totals.total}</HeroStatValue><HeroStatLabel>Total Campaigns</HeroStatLabel></HeroStat>
            <HeroStat><HeroStatValue>{totals.draft}</HeroStatValue><HeroStatLabel>Drafts</HeroStatLabel></HeroStat>
            <HeroStat><HeroStatValue>{totals.scheduled}</HeroStatValue><HeroStatLabel>Scheduled</HeroStatLabel></HeroStat>
            <HeroStat><HeroStatValue>{totals.sent}</HeroStatValue><HeroStatLabel>Sent</HeroStatLabel></HeroStat>
          </HeroRow>
        </Hero>

        <Grid>
          <Left>
            <CardTop>
              <CardTitle>{selectedCampaign ? "Edit Campaign" : "Create Campaign"}</CardTitle>
              <TopActions>
                <SearchInput
                  placeholder="Search campaigns..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <GhostButton type="button" onClick={handleResetForm}>
                  {selectedCampaign ? "Create New" : "Clear"}
                </GhostButton>
              </TopActions>
            </CardTop>

            <Form onSubmit={handleSubmit}>
              <FieldGrid>
                <Field><Label>Campaign Name</Label><Input name="name" value={formData.name} onChange={handleChange} maxLength={120} /></Field>
                <Field><Label>Email Subject</Label><Input name="subject" value={formData.subject} onChange={handleChange} maxLength={200} /></Field>
              </FieldGrid>

              <FieldGrid>
                <Field><Label>Preview Text</Label><Input name="previewText" value={formData.previewText} onChange={handleChange} maxLength={220} /></Field>
                <Field><Label>Brand Name</Label><Input name="brandName" value={formData.brandName} onChange={handleChange} maxLength={80} /></Field>
              </FieldGrid>

              <FieldGrid>
                <Field><Label>Headline</Label><Input name="headline" value={formData.headline} onChange={handleChange} maxLength={180} /></Field>
                <Field><Label>Subheadline</Label><Input name="subheadline" value={formData.subheadline} onChange={handleChange} maxLength={300} /></Field>
              </FieldGrid>

              <Field>
                <Label>Campaign Body</Label>
                <TextArea name="body" value={formData.body} onChange={handleChange} maxLength={12000} />
              </Field>

              <FieldGrid>
                <Field><Label>CTA Text</Label><Input name="ctaText" value={formData.ctaText} onChange={handleChange} maxLength={60} /></Field>
                <Field><Label>CTA URL</Label><Input name="ctaUrl" value={formData.ctaUrl} onChange={handleChange} placeholder="https://..." maxLength={500} /></Field>
              </FieldGrid>

              <FieldGrid>
                <Field><Label>Signature</Label><Input name="signature" value={formData.signature} onChange={handleChange} maxLength={120} /></Field>
                <Field>
                  <Label>Audience Type</Label>
                  <Select name="audienceType" value={formData.audienceType} onChange={handleChange}>
                    <option value="all">all</option>
                    <option value="newsletter">newsletter</option>
                    <option value="customers">customers</option>
                    <option value="manual">manual</option>
                  </Select>
                </Field>
              </FieldGrid>

              {formData.manualRecipients && formData.audienceType !== "manual" && (
                <AudienceWarning>
                  Manual recipients are saved, but audience type is not manual.
                </AudienceWarning>
              )}

              {formData.audienceType === "manual" && (
                <Field>
                  {normalizeManualRecipients(formData.manualRecipients).length > 0 && (
  <SelectedRecipientsBox>
    <h3>Selected Subscribers</h3>

    <p>
      {
        normalizeManualRecipients(formData.manualRecipients).length
      } subscriber(s) loaded from Email Subscribers
    </p>

    <RecipientChips>
      {normalizeManualRecipients(formData.manualRecipients).map((email) => (
        <RecipientChip key={email}>
          {email}
        </RecipientChip>
      ))}
    </RecipientChips>

    <ClearRecipientsButton
      type="button"
      onClick={() =>
        setFormData((prev) => ({
          ...prev,
          manualRecipients: "",
        }))
      }
    >
      Clear Recipients
    </ClearRecipientsButton>
  </SelectedRecipientsBox>
)}
                  <Label>Manual Recipients</Label>
                  <TextArea
                    name="manualRecipients"
                    value={formData.manualRecipients}
                    onChange={handleChange}
                    placeholder="test1@gmail.com, test2@gmail.com"
                    style={{ minHeight: "120px" }}
                  />
                  <RecipientCount>
                    {normalizeManualRecipients(formData.manualRecipients).length} recipient(s)
                  </RecipientCount>
                </Field>
              )}

              <FieldGrid>
                <Field>
                  <Label>Status</Label>
                  <Select value={derivedStatus} disabled>
                    <option value="draft">draft</option>
                    <option value="scheduled">scheduled</option>
                    <option value="sent">sent</option>
                  </Select>
                </Field>

                <Field>
                  <Label>Delivery Type</Label>
                  <Select
                    name="sendNow"
                    value={formData.sendNow ? "true" : "false"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        sendNow: e.target.value === "true",
                        scheduledFor: e.target.value === "true" ? "" : prev.scheduledFor,
                      }))
                    }
                  >
                    <option value="false">Schedule / Save Draft</option>
                    <option value="true">Send Now</option>
                  </Select>
                </Field>
              </FieldGrid>

              <Field>
                <Label>Scheduled For</Label>
                <Input
                  type="datetime-local"
                  name="scheduledFor"
                  value={formData.scheduledFor}
                  onChange={handleChange}
                  disabled={formData.sendNow}
                />
              </Field>

              <ActionRow>
                <PrimaryButton type="submit" disabled={creating || updating || sending}>
                  {creating || updating || sending ? "Working..." : selectedCampaign ? "Update Campaign" : "Save Campaign"}
                </PrimaryButton>

                <SecondaryButton type="button" onClick={handleResetForm}>
                  Reset
                </SecondaryButton>
              </ActionRow>
            </Form>
          </Left>

          <Right>
            <CardTop>
              <CardTitle>All Campaigns</CardTitle>
              <MiniText>{loading ? "Loading..." : `${filteredCampaigns.length} result(s)`}</MiniText>
            </CardTop>

            {loading ? (
              <EmptyState><EmptyTitle>Loading campaigns...</EmptyTitle></EmptyState>
            ) : filteredCampaigns.length ? (
              <CampaignList>
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard key={campaign?._id} $active={selectedCampaign?._id === campaign?._id}>
                    <CampaignHead>
                      <CampaignInfo>
                        <CampaignTitle>{campaign?.name || "Untitled Campaign"}</CampaignTitle>
                        <CampaignSubject>{campaign?.subject || "No subject"}</CampaignSubject>
                      </CampaignInfo>
                      <StatusPill $status={campaign?.status}>{campaign?.status || "draft"}</StatusPill>
                    </CampaignHead>

                    <CampaignMeta>
                      <MetaPill>audience: {campaign?.audienceType || "newsletter"}</MetaPill>
                      <MetaPill>{campaign?.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : "no date"}</MetaPill>
                    </CampaignMeta>

                    <PreviewText>{campaign?.previewText || "No preview text added."}</PreviewText>
                    <CampaignBodyPreview>{campaign?.body || "No campaign content yet."}</CampaignBodyPreview>

                    <CampaignActions>
                      <SmallButton type="button" onClick={() => dispatch(setSelectedEmailCampaign(campaign))}>
                        Edit
                      </SmallButton>

                      <SmallButton
                        type="button"
                        onClick={() => handleSend(campaign)}
                        disabled={sending || ["sent", "sending"].includes(campaign?.status)}
                      >
                        {campaign?.status === "sent" ? "Sent" : sending ? "Sending..." : "Send"}
                      </SmallButton>

                      <DangerButton
                        type="button"
                        onClick={() => handleDelete(campaign)}
                        disabled={deleting || campaign?.status === "sending"}
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </DangerButton>
                    </CampaignActions>
                  </CampaignCard>
                ))}
              </CampaignList>
            ) : (
              <EmptyState>
                <EmptyTitle>No campaigns found.</EmptyTitle>
                <EmptySub>Create your first premium campaign.</EmptySub>
              </EmptyState>
            )}
          </Right>
        </Grid>
      </Inner>
    </Page>
  );
}

/* keep your existing styled-components from Page down */

/* ------------------------------ STYLES ------------------------------ */

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 18px 90px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(circle at 16% 2%, rgba(214,182,159,0.18) 0%, rgba(0,0,0,0) 38%),
    radial-gradient(circle at 86% 8%, rgba(90,56,37,0.30) 0%, rgba(0,0,0,0) 42%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.darkBrown} 0%,
      ${({ theme }) => theme.colors.black} 86%
    );
`;

const Inner = styled.section`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled(motion.section)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
  padding: 26px;
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.34);
  font-size: 12px;
  font-weight: 1000;
  letter-spacing: 0.15em;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Title = styled.h1`
  margin: 14px 0 8px;
  font-size: clamp(28px, 3vw, 44px);
  line-height: 1.03;
  letter-spacing: -0.03em;

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-shadow: 0 12px 36px rgba(0,0,0,0.38);
  }
`;

const Sub = styled.p`
  margin: 0;
  max-width: 72ch;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  line-height: 1.55;
`;

const HeroRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;

  @media (max-width: 860px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const HeroStat = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0,0,0,0.28);
  border: 1px solid rgba(255,255,255,0.10);
  padding: 16px;
`;

const HeroStatValue = styled.div`
  font-size: 28px;
  font-weight: 1100;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const HeroStatLabel = styled.div`
  margin-top: 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 18px;
  margin-top: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Left = styled(motion.section)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
  padding: 18px;
`;

const Right = styled(motion.aside)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
  padding: 18px;
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.01em;
`;

const MiniText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.82;
`;

const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  min-width: 240px;
  height: 46px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.30);
  color: ${({ theme }) => theme.colors.white};
  padding: 0 16px;
  outline: none;

  &::placeholder {
    color: rgba(255,255,255,0.5);
  }

  &:focus {
    border-color: rgba(214,182,159,0.6);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.10);
  }
`;

const Form = styled.form`
  display: grid;
  gap: 14px;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
`;

const Label = styled.span`
  font-size: 13px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Input = styled.input`
  height: 50px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.28);
  color: ${({ theme }) => theme.colors.white};
  padding: 0 14px;
  outline: none;

  &::placeholder {
    color: rgba(255,255,255,0.5);
  }

  &:focus {
    border-color: rgba(214,182,159,0.6);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.10);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  height: 50px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.28);
  color: ${({ theme }) => theme.colors.white};
  padding: 0 14px;
  outline: none;

  &:focus {
    border-color: rgba(214,182,159,0.6);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.10);
  }

  &:disabled {
    opacity: 0.72;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  min-height: 220px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.28);
  color: ${({ theme }) => theme.colors.white};
  padding: 14px;
  outline: none;
  resize: vertical;

  &::placeholder {
    color: rgba(255,255,255,0.5);
  }

  &:focus {
    border-color: rgba(214,182,159,0.6);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.10);
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  min-width: 200px;
  padding: 14px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(90,56,37,0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 1100;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  min-width: 140px;
  padding: 14px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.34);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.5);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
`;

const GhostButton = styled.button`
  height: 46px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.32);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.5);
  }
`;

const CampaignList = styled.div`
  display: grid;
  gap: 12px;
`;

const CampaignCard = styled.div`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214,182,159,0.6)" : "rgba(255,255,255,0.12)"};
  background: ${({ $active }) =>
    $active ? "rgba(214,182,159,0.08)" : "rgba(0,0,0,0.25)"};
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadow.soft : "none")};
`;

const CampaignHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
`;

const CampaignInfo = styled.div`
  display: grid;
  gap: 4px;
`;

const CampaignTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 1000;
`;

const CampaignSubject = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  font-size: 13px;
`;

const StatusPill = styled.div`
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  font-weight: 1000;
  text-transform: uppercase;
  border: 1px solid rgba(255,255,255,0.12);
  color: ${({ theme }) => theme.colors.black};
  background: ${({ $status, theme }) => {
    if ($status === "sent") return theme.colors.lightBrown;
    if ($status === "scheduled") return "#cfa37f";
    return "#f2e1d3";
  }};
`;

const CampaignMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

const MetaPill = styled.div`
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.12);
  font-size: 12px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ivory};
`;

const PreviewText = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  line-height: 1.5;
`;

const CampaignBodyPreview = styled.div`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 14px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CampaignActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const SmallButton = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.34);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.52);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
`;

const DangerButton = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(120, 20, 20, 0.24);
  color: #ffd8d8;
  font-weight: 1000;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(120, 20, 20, 0.4);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none;
  }
`;

const EmptyState = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.24);
  padding: 20px;
`;

const EmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 1000;
`;

const EmptySub = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
`;

const BtnRow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(0,0,0,0.15);
  border-top-color: rgba(0,0,0,0.65);
  display: inline-block;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const SelectedRecipientsBox = styled.div`
  margin-top: 10px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(214, 182, 159, 0.08);
  border: 1px solid rgba(214, 182, 159, 0.22);

  h3 {
    margin: 0 0 6px;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 16px;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 800;
  }
`;

const RecipientChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const RecipientChip = styled.span`
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.22);
  font-size: 12px;
  font-weight: 900;
`;

const ClearRecipientsButton = styled.button`
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.24);
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.52);
  }
`;

const AudienceWarning = styled.div`
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(214, 182, 159, 0.1);
  border: 1px solid rgba(214, 182, 159, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 800;
  line-height: 1.45;
`;

const RecipientCount = styled.div`
  margin-top: -4px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 13px;
  font-weight: 900;
`;