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

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

  const safeCampaigns = useMemo(
    () => (Array.isArray(campaigns) ? campaigns : []),
    [campaigns]
  );

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [search, setSearch] = useState("");

  const pushToast = useCallback(
    (payload) => {
      toast?.push?.(payload);
    },
    [toast]
  );

  useEffect(() => {
  const savedEmails = localStorage.getItem("selectedCampaignEmails");

  if (!savedEmails) return;

  try {
    const parsedEmails = JSON.parse(savedEmails);

    if (Array.isArray(parsedEmails) && parsedEmails.length > 0) {
      setFormData((prev) => ({
        ...prev,
        audienceType: "manual",
        manualRecipients: parsedEmails.join(", "),
      }));

      pushToast({
        title: "Subscribers Loaded",
        description: `${parsedEmails.length} subscriber(s) added to manual recipients.`,
        variant: "success",
      });

      localStorage.removeItem("selectedCampaignEmails");
    }
  } catch {
    localStorage.removeItem("selectedCampaignEmails");
  }
}, [pushToast]);

  useEffect(() => {
    dispatch(fetchEmailCampaigns());
  }, [dispatch]);

  useEffect(() => {
    if (selectedCampaign) {
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
    } else {
      setFormData({ ...INITIAL_FORM });
    }
  }, [selectedCampaign]);

  useEffect(() => {
    if (!error) return;

    pushToast({
      title: "Error",
      description: error,
      variant: "error",
    });

    dispatch(clearEmailCampaignError());
  }, [error, dispatch, pushToast]);

  useEffect(() => {
    if (!successMessage) return;

    pushToast({
      title: "Success",
      description: successMessage,
      variant: "success",
    });

    if (
      successMessage === "Email campaign created successfully" ||
      successMessage === "Email campaign updated successfully" ||
      successMessage === "Campaign created successfully" ||
      successMessage === "Campaign updated successfully"
    ) {
      dispatch(setSelectedEmailCampaign(null));
      setFormData({ ...INITIAL_FORM });
    }

    dispatch(resetEmailCampaignSuccess());
  }, [successMessage, dispatch, pushToast]);

  const filteredCampaigns = useMemo(() => {
    const keyword = String(search || "").toLowerCase().trim();

    if (!keyword) return safeCampaigns;

    return safeCampaigns.filter((campaign) => {
      return (
        String(campaign?.name || "").toLowerCase().includes(keyword) ||
        String(campaign?.subject || "").toLowerCase().includes(keyword) ||
        String(campaign?.headline || "").toLowerCase().includes(keyword) ||
        String(campaign?.audienceType || "").toLowerCase().includes(keyword) ||
        String(campaign?.status || "").toLowerCase().includes(keyword)
      );
    });
  }, [safeCampaigns, search]);

  const derivedStatus = useMemo(() => {
    if (formData.sendNow) return "draft";
    if (formData.scheduledFor) return "scheduled";
    return formData.status === "sent" ? "sent" : "draft";
  }, [formData.sendNow, formData.scheduledFor, formData.status]);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSelectCampaign(campaign) {
    dispatch(setSelectedEmailCampaign(campaign));
  }

  function handleResetForm() {
    dispatch(setSelectedEmailCampaign(null));
    setFormData({ ...INITIAL_FORM });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const normalizedStatus = formData.sendNow
      ? "draft"
      : formData.scheduledFor
      ? "scheduled"
      : "draft";

    const manualRecipients =
      formData.audienceType === "manual"
        ? formData.manualRecipients
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

    const payload = {
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      previewText: formData.previewText.trim(),
      brandName: formData.brandName.trim(),
      headline: formData.headline.trim(),
      subheadline: formData.subheadline.trim(),
      body: formData.body.trim(),
      ctaText: formData.ctaText.trim(),
      ctaUrl: formData.ctaUrl.trim(),
      signature: formData.signature.trim(),
      audienceType: formData.audienceType,
      status: normalizedStatus,
      scheduledFor: formData.sendNow ? null : formData.scheduledFor || null,
      manualRecipients,
    };

    if (!payload.name || !payload.subject || !payload.headline || !payload.body) {
      pushToast({
        title: "Error",
        description: "Name, subject, headline, and body are required.",
        variant: "error",
      });
      return;
    }

    if (
      !formData.sendNow &&
      payload.status === "scheduled" &&
      !payload.scheduledFor
    ) {
      pushToast({
        title: "Error",
        description: "Please choose a schedule date and time.",
        variant: "error",
      });
      return;
    }

    if (
      payload.audienceType === "manual" &&
      (!payload.manualRecipients || payload.manualRecipients.length === 0)
    ) {
      pushToast({
        title: "Error",
        description: "Please add at least one manual recipient email.",
        variant: "error",
      });
      return;
    }

    try {
      if (selectedCampaign?._id) {
        await dispatch(updateEmailCampaign(selectedCampaign._id, payload));

        if (formData.sendNow) {
          await dispatch(sendEmailCampaign(selectedCampaign._id));
        }
      } else {
        const createdCampaign = await dispatch(createEmailCampaign(payload));

if (formData.sendNow && createdCampaign?._id) {
  await dispatch(sendEmailCampaign(createdCampaign._id));
        }
      }
    } catch {
      pushToast({
        title: "Error",
        description: "Something went wrong while saving campaign.",
        variant: "error",
      });
    }
  }

  async function handleDelete(id) {
    if (!id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this campaign?"
    );

    if (!confirmed) return;

    try {
      await dispatch(deleteEmailCampaign(id));

      if (selectedCampaign?._id === id) {
        handleResetForm();
      }
    } catch {
      pushToast({
        title: "Error",
        description: "Failed to delete campaign.",
        variant: "error",
      });
    }
  }

  function handleClearRecipients() {
  setFormData((prev) => ({
    ...prev,
    manualRecipients: "",
  }));

  pushToast({
    title: "Recipients Cleared",
    description: "Manual campaign recipients have been removed.",
    variant: "success",
  });
}

  async function handleSend(id) {
    if (!id) return;

    const confirmed = window.confirm("Send this campaign now?");
    if (!confirmed) return;

    try {
      await dispatch(sendEmailCampaign(id));
    } catch {
      pushToast({
        title: "Error",
        description: "Failed to send campaign.",
        variant: "error",
      });
    }
  }

  const totalCampaigns = safeCampaigns.length;
  const totalDrafts = safeCampaigns.filter((item) => item?.status === "draft").length;
  const totalScheduled = safeCampaigns.filter((item) => item?.status === "scheduled").length;
  const totalSent = safeCampaigns.filter((item) => item?.status === "sent").length;

  return (
    <Page>
      <Inner>
        <Hero
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Badge>ADMIN • EMAIL CAMPAIGNS</Badge>

          <Title>
            HIT THE <span>INBOX</span> WITH PRECISION.
          </Title>

          <Sub>
            Create luxury campaigns, control premium messaging, target the right
            audience, and schedule powerful launches that drive clicks,
            conversions, and revenue.
          </Sub>

          <HeroRow>
            <HeroStat>
              <HeroStatValue>{totalCampaigns}</HeroStatValue>
              <HeroStatLabel>Total Campaigns</HeroStatLabel>
            </HeroStat>

            <HeroStat>
              <HeroStatValue>{totalDrafts}</HeroStatValue>
              <HeroStatLabel>Drafts</HeroStatLabel>
            </HeroStat>

            <HeroStat>
              <HeroStatValue>{totalScheduled}</HeroStatValue>
              <HeroStatLabel>Scheduled</HeroStatLabel>
            </HeroStat>

            <HeroStat>
              <HeroStatValue>{totalSent}</HeroStatValue>
              <HeroStatLabel>Sent</HeroStatLabel>
            </HeroStat>
          </HeroRow>
        </Hero>

        <Grid>
          <Left
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <CardTop>
              <CardTitle>
                {selectedCampaign ? "Edit Campaign" : "Create Campaign"}
              </CardTitle>

              <TopActions>
                <SearchInput
                  type="text"
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
                <Field>
                  <Label>Campaign Name</Label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="VIP DROP – KnockoutCodes Elite Collection"
                  />
                </Field>

                <Field>
                  <Label>Email Subject</Label>
                  <Input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="You’re Early. The Drop Just Went Live."
                  />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field>
                  <Label>Preview Text</Label>
                  <Input
                    type="text"
                    name="previewText"
                    value={formData.previewText}
                    onChange={handleChange}
                    placeholder="Private access. Premium gear. Limited window."
                  />
                </Field>

                <Field>
                  <Label>Brand Name</Label>
                  <Input
                    type="text"
                    name="brandName"
                    value={formData.brandName}
                    onChange={handleChange}
                    placeholder="KnockoutCodes"
                  />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field>
                  <Label>Headline</Label>
                  <Input
                    type="text"
                    name="headline"
                    value={formData.headline}
                    onChange={handleChange}
                    placeholder="STEP INTO ELITE MODE"
                  />
                </Field>

                <Field>
                  <Label>Subheadline</Label>
                  <Input
                    type="text"
                    name="subheadline"
                    value={formData.subheadline}
                    onChange={handleChange}
                    placeholder="This is not for everyone. Only those who move first win."
                  />
                </Field>
              </FieldGrid>

              <Field>
                <Label>Campaign Body</Label>
                <TextArea
                  name="body"
                  value={formData.body}
                  onChange={handleChange}
                  placeholder="Write the campaign body here..."
                />
              </Field>

              <FieldGrid>
                <Field>
                  <Label>CTA Text</Label>
                  <Input
                    type="text"
                    name="ctaText"
                    value={formData.ctaText}
                    onChange={handleChange}
                    placeholder="Shop Now"
                  />
                </Field>

                <Field>
                  <Label>CTA URL</Label>
                  <Input
                    type="text"
                    name="ctaUrl"
                    value={formData.ctaUrl}
                    onChange={handleChange}
                    placeholder="https://aurora45.gumroad.com"
                  />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field>
                  <Label>Signature</Label>
                  <Input
                    type="text"
                    name="signature"
                    value={formData.signature}
                    onChange={handleChange}
                    placeholder="Team KnockoutCodes"
                  />
                </Field>

                <Field>
                  <Label>Audience Type</Label>
                  <Select
                    name="audienceType"
                    value={formData.audienceType}
                    onChange={handleChange}
                  >
                    <option value="all">all</option>
                    <option value="newsletter">newsletter</option>
                    <option value="customers">customers</option>
                    <option value="manual">manual</option>
                  </Select>
                </Field>
              </FieldGrid>

              {formData.manualRecipients && formData.audienceType !== "manual" && (
  <AudienceWarning>
    You have manual recipients saved, but audience type is not set to manual.
    Switch to manual if you want to send to selected subscribers.
  </AudienceWarning>
)}

              {formData.audienceType === "manual" && (
                <Field>
                  <Label>Manual Recipients</Label>
                  <TextArea
                    name="manualRecipients"
                    value={formData.manualRecipients}
                    onChange={handleChange}
                    placeholder="test1@gmail.com, test2@gmail.com"
                    style={{ minHeight: "120px" }}
                  />

                  <RecipientCount>
  {
    formData.manualRecipients
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean).length
  }{" "}
  recipient(s) entered
</RecipientCount>

                   {formData.audienceType === "manual" && formData.manualRecipients && (
  <SelectedRecipientsBox>
    <h3>Selected Subscribers</h3>

    <p>
      {
        formData.manualRecipients
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean).length
      }{" "}
      subscriber(s) ready for this campaign.
    </p>

    <RecipientChips>
      {formData.manualRecipients
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
        .map((email) => (
          <RecipientChip key={email}>{email}</RecipientChip>
        ))}
                      </RecipientChips>
                      
                      <ClearRecipientsButton type="button" onClick={handleClearRecipients}>
  Clear Recipients
</ClearRecipientsButton>
  </SelectedRecipientsBox>
)}
                </Field>
              )}

              <FieldGrid>
                <Field>
                  <Label>Status</Label>
                  <Select name="status" value={derivedStatus} disabled>
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
                    onChange={(e) => {
                      const isNow = e.target.value === "true";

                      setFormData((prev) => ({
                        ...prev,
                        sendNow: isNow,
                        scheduledFor: isNow ? "" : prev.scheduledFor,
                        status: isNow
                          ? "draft"
                          : prev.scheduledFor
                          ? "scheduled"
                          : prev.status === "sent"
                          ? "sent"
                          : "draft",
                      }));
                    }}
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
                <PrimaryButton type="submit" disabled={creating || updating}>
                  {creating || updating ? (
                    <BtnRow>
                      <Spinner />
                      {selectedCampaign ? "Updating..." : "Saving..."}
                    </BtnRow>
                  ) : selectedCampaign ? (
                    "Update Campaign"
                  ) : (
                    "Save Campaign"
                  )}
                </PrimaryButton>

                <SecondaryButton
                  type="button"
                  onClick={handleResetForm}
                  disabled={creating || updating}
                >
                  Reset
                </SecondaryButton>
              </ActionRow>
            </Form>
          </Left>

          <Right
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <CardTop>
              <CardTitle>All Campaigns</CardTitle>
              <MiniText>
                {loading ? "Loading..." : `${filteredCampaigns.length} result(s)`}
              </MiniText>
            </CardTop>

            {loading ? (
              <EmptyState>
                <EmptyTitle>Loading campaigns...</EmptyTitle>
                <EmptySub>
                  Please wait while your premium control room loads.
                </EmptySub>
              </EmptyState>
            ) : filteredCampaigns.length ? (
              <CampaignList>
                {filteredCampaigns.map((campaign) => {
                  const active = selectedCampaign?._id === campaign?._id;

                  return (
                    <CampaignCard key={campaign?._id} $active={active}>
                      <CampaignHead>
                        <CampaignInfo>
                          <CampaignTitle>
                            {campaign?.name || "Untitled Campaign"}
                          </CampaignTitle>

                          <CampaignSubject>
                            {campaign?.subject || "No subject"}
                          </CampaignSubject>
                        </CampaignInfo>

                        <StatusPill $status={campaign?.status}>
                          {campaign?.status || "draft"}
                        </StatusPill>
                      </CampaignHead>

                      <CampaignMeta>
                        <MetaPill>
                          audience: {campaign?.audienceType || "newsletter"}
                        </MetaPill>

                        <MetaPill>
                          {campaign?.createdAt
                            ? new Date(campaign.createdAt).toLocaleDateString()
                            : "no date"}
                        </MetaPill>

                        {campaign?.scheduledFor ? (
                          <MetaPill>
                            scheduled:{" "}
                            {new Date(campaign.scheduledFor).toLocaleString()}
                          </MetaPill>
                        ) : null}
                      </CampaignMeta>

                      <PreviewText>
                        {campaign?.previewText || "No preview text added."}
                      </PreviewText>

                      <CampaignBodyPreview>
                        {campaign?.body || "No campaign content yet."}
                      </CampaignBodyPreview>

                      <CampaignActions>
                        <SmallButton
                          type="button"
                          onClick={() => handleSelectCampaign(campaign)}
                        >
                          Edit
                        </SmallButton>

                        <SmallButton
                          type="button"
                          onClick={() => handleSend(campaign?._id)}
                          disabled={sending}
                        >
                          {sending ? "Sending..." : "Send"}
                        </SmallButton>

                        <DangerButton
                          type="button"
                          onClick={() => handleDelete(campaign?._id)}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting..." : "Delete"}
                        </DangerButton>
                      </CampaignActions>
                    </CampaignCard>
                  );
                })}
              </CampaignList>
            ) : (
              <EmptyState>
                <EmptyTitle>No campaigns found.</EmptyTitle>
                <EmptySub>
                  Create your first premium campaign and start owning the inbox.
                </EmptySub>
              </EmptyState>
            )}
          </Right>
        </Grid>
      </Inner>
    </Page>
  );
}

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