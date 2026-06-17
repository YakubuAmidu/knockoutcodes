import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

import {
  fetchEmailSegments,
  createEmailSegment,
  updateEmailSegment,
  deleteEmailSegment,
  setSelectedEmailSegment,
  clearEmailSegmentError,
  resetEmailSegmentSuccess,
} from "../reducers/emailSegment/emailSegmentActions";

const emptyForm = {
  name: "",
  description: "",
  type: "newsletter",
  status: "active",
  rules: {
    source: "all",
    minOrders: 0,
    tags: "",
  },
};

function AdminEmailSegment() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { initializing, checkingAuth, isAuthenticated, isAdmin } = useAuth();

  const {
    loading,
    creating,
    updating,
    deleting,
    segments = [],
    selectedSegment,
    successMessage,
    error,
  } = useSelector((state) => state.emailSegment || {});

  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const authLoading = initializing || checkingAuth;

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      dispatch(fetchEmailSegments());
    }
  }, [dispatch, isAuthenticated, isAdmin]);

  useEffect(() => {
    if (error) {
      toast.showToast(error, "error");
      dispatch(clearEmailSegmentError());
    }
  }, [error, toast, dispatch]);

  useEffect(() => {
    if (successMessage) {
      toast.showToast(successMessage, "success");
      dispatch(resetEmailSegmentSuccess());
    }
  }, [successMessage, toast, dispatch]);

  useEffect(() => {
    if (selectedSegment) {
      setForm({
        name: selectedSegment.name || "",
        description: selectedSegment.description || "",
        type: selectedSegment.type || "newsletter",
        status: selectedSegment.status || "active",
        rules: {
          source: selectedSegment.rules?.source || "all",
          minOrders: selectedSegment.rules?.minOrders || 0,
          tags: Array.isArray(selectedSegment.rules?.tags)
            ? selectedSegment.rules.tags.join(", ")
            : "",
        },
      });
    }
  }, [selectedSegment]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safeSegments = Array.isArray(segments) ? segments : [];

  const filteredSegments = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return safeSegments;

    return safeSegments.filter((segment) => {
      return (
        segment?.name?.toLowerCase().includes(keyword) ||
        segment?.description?.toLowerCase().includes(keyword) ||
        segment?.type?.toLowerCase().includes(keyword) ||
        segment?.status?.toLowerCase().includes(keyword) ||
        segment?.rules?.source?.toLowerCase().includes(keyword)
      );
    });
  }, [safeSegments, search]);

  const stats = useMemo(() => {
    return {
      total: safeSegments.length,
      active: safeSegments.filter((item) => item.status === "active").length,
      buyers: safeSegments.filter((item) => item.type === "buyers").length,
      vip: safeSegments.filter((item) => item.type === "vip").length,
    };
  }, [safeSegments]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name.startsWith("rules.")) {
      const key = name.split(".")[1];

      setForm((prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          [key]: value,
        },
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    dispatch(setSelectedEmailSegment(null));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.showToast("Segment name is required.", "error");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      status: form.status,
      rules: {
        source: form.rules.source,
        minOrders: Math.max(0, Number(form.rules.minOrders) || 0),
        tags: String(form.rules.tags || "")
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      },
    };

    const result = selectedSegment?._id
      ? await dispatch(updateEmailSegment(selectedSegment._id, payload))
      : await dispatch(createEmailSegment(payload));

    if (result?.success !== false) {
      resetForm();
    }
  };

  const handleEdit = (segment) => {
    dispatch(setSelectedEmailSegment(segment));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!id) return;

    const confirmed = window.confirm(
      "Delete this email segment? This action cannot be undone.",
    );

    if (!confirmed) return;

    const result = await dispatch(deleteEmailSegment(id));

    if (result?.success !== false && selectedSegment?._id === id) {
      resetForm();
    }
  };

  if (authLoading) {
    return <EmptyState>Checking admin access...</EmptyState>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return (
    <Page>
      <Shell>
        <Hero>
          <HeroContent>
            <Kicker>Email Segmentation Engine</Kicker>
            <Title>Turn Your Audience Into Buyer Groups</Title>
            <Subtitle>
              Build clean customer segments for coaching offers, course
              launches, product drops, newsletters, VIP buyers, and inactive
              subscribers.
            </Subtitle>
          </HeroContent>

          <HeroPanel>
            <PanelLabel>Revenue Logic</PanelLabel>
            <PanelText>
              Right person. Right offer. Right time. That is how professional
              email systems turn attention into sales.
            </PanelText>
          </HeroPanel>
        </Hero>

        <StatsGrid>
          <StatCard>
            <StatNumber>{stats.total}</StatNumber>
            <StatLabel>Total Segments</StatLabel>
          </StatCard>

          <StatCard>
            <StatNumber>{stats.active}</StatNumber>
            <StatLabel>Active Segments</StatLabel>
          </StatCard>

          <StatCard>
            <StatNumber>{stats.buyers}</StatNumber>
            <StatLabel>Buyer Groups</StatLabel>
          </StatCard>

          <StatCard>
            <StatNumber>{stats.vip}</StatNumber>
            <StatLabel>VIP Groups</StatLabel>
          </StatCard>
        </StatsGrid>

        <MainGrid>
          <FormCard onSubmit={handleSubmit}>
            <SectionHeader>
              <Kicker>
                {selectedSegment ? "Update Segment" : "Create Segment"}
              </Kicker>
              <SectionTitle>
                {selectedSegment
                  ? "Refine This Buyer Group"
                  : "Create A Money Segment"}
              </SectionTitle>
            </SectionHeader>

            <Field>
              <Label>Segment Name</Label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: VIP Course Buyers"
              />
            </Field>

            <Field>
              <Label>Description</Label>
              <Textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Explain who belongs in this segment."
              />
            </Field>

            <TwoColumns>
              <Field>
                <Label>Segment Type</Label>
                <Select name="type" value={form.type} onChange={handleChange}>
                  <option value="newsletter">Newsletter</option>
                  <option value="buyers">Buyers</option>
                  <option value="coaching">Coaching Leads</option>
                  <option value="vip">VIP Customers</option>
                  <option value="inactive">Inactive Users</option>
                  <option value="manual">Manual List</option>
                </Select>
              </Field>

              <Field>
                <Label>Status</Label>
                <Select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </Select>
              </Field>
            </TwoColumns>

            <TwoColumns>
              <Field>
                <Label>Rule Source</Label>
                <Select
                  name="rules.source"
                  value={form.rules.source}
                  onChange={handleChange}
                >
                  <option value="all">All</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="orders">Orders</option>
                  <option value="coaching">Coaching</option>
                  <option value="manual">Manual</option>
                </Select>
              </Field>

              <Field>
                <Label>Minimum Orders</Label>
                <Input
                  type="number"
                  min="0"
                  name="rules.minOrders"
                  value={form.rules.minOrders}
                  onChange={handleChange}
                  placeholder="0"
                />
              </Field>
            </TwoColumns>

            <Field>
              <Label>Tags</Label>
              <Input
                name="rules.tags"
                value={form.rules.tags}
                onChange={handleChange}
                placeholder="boxing, course-buyer, vip"
              />
            </Field>

            <ButtonRow>
              <PrimaryButton type="submit" disabled={creating || updating}>
                {creating || updating
                  ? "Saving..."
                  : selectedSegment
                    ? "Update Segment"
                    : "Create Segment"}
              </PrimaryButton>

              {selectedSegment && (
                <GhostButton type="button" onClick={resetForm}>
                  Cancel Edit
                </GhostButton>
              )}
            </ButtonRow>
          </FormCard>

          <ListCard>
            <SectionHeader>
              <Kicker>Segment Vault</Kicker>
              <SectionTitle>Your Audience Groups</SectionTitle>
            </SectionHeader>

            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search segments..."
            />

            {loading ? (
              <EmptyState>Loading premium segments...</EmptyState>
            ) : filteredSegments.length === 0 ? (
              <EmptyState>No email segments found yet.</EmptyState>
            ) : (
              <SegmentList>
                {filteredSegments.map((segment) => (
                  <SegmentItem key={segment._id}>
                    <SegmentTop>
                      <div>
                        <SegmentName>{segment.name}</SegmentName>
                        <SegmentDescription>
                          {segment.description || "No description added."}
                        </SegmentDescription>
                      </div>

                      <Badge>{segment.status || "active"}</Badge>
                    </SegmentTop>

                    <MetaRow>
                      <Meta>{segment.type || "newsletter"}</Meta>
                      <Meta>{segment.rules?.source || "all"}</Meta>
                      <Meta>
                        Min Orders: {Number(segment.rules?.minOrders || 0)}
                      </Meta>
                      <Meta>
                        {segment.createdAt
                          ? new Date(segment.createdAt).toLocaleDateString()
                          : "No date"}
                      </Meta>
                    </MetaRow>

                    {Array.isArray(segment.rules?.tags) &&
                      segment.rules.tags.length > 0 && (
                        <TagsRow>
                          {segment.rules.tags.map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                        </TagsRow>
                      )}

                    <ActionRow>
                      <SmallButton
                        type="button"
                        onClick={() => handleEdit(segment)}
                      >
                        Edit
                      </SmallButton>

                      <DangerButton
                        type="button"
                        disabled={deleting}
                        onClick={() => handleDelete(segment._id)}
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </DangerButton>
                    </ActionRow>
                  </SegmentItem>
                ))}
              </SegmentList>
            )}
          </ListCard>
        </MainGrid>
      </Shell>
    </Page>
  );
}

export default AdminEmailSegment;

const colors = {
  darkBrown: "#2F1B12",
  brown: "#5A3825",
  lightBrown: "#D6B69F",
  black: "#000000",
  white: "#FFFFFF",
  ivory: "#FFF9F2",
  cocoa: "#3D261A",
  glass: "rgba(255,255,255,0.06)",
};

const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      transparent 34%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(90, 56, 37, 0.24),
      transparent 38%
    ),
    ${colors.black};
  color: ${colors.ivory};
  padding: 3rem 1.25rem;
`;

const Shell = styled.div`
  width: min(1200px, 92vw);
  margin: 0 auto;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: 1.6fr 0.8fr;
  gap: 1.5rem;
  align-items: stretch;
  margin-bottom: 1.5rem;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

const HeroContent = styled.div`
  padding: 3rem;
  border-radius: 28px;
  background: linear-gradient(
    135deg,
    rgba(255, 249, 242, 0.08),
    rgba(61, 38, 26, 0.46)
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);

  @media (max-width: 600px) {
    padding: 2rem;
  }
`;

const HeroPanel = styled.aside`
  padding: 2rem;
  border-radius: 28px;
  background: ${colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 16px 40px rgba(45, 18, 8, 0.35);
`;

const Kicker = styled.p`
  margin: 0 0 0.75rem;
  color: ${colors.lightBrown};
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  max-width: 850px;
  color: ${colors.white};
  font-size: clamp(2.4rem, 6vw, 5.4rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
`;

const Subtitle = styled.p`
  max-width: 760px;
  margin: 1.25rem 0 0;
  color: ${colors.lightBrown};
  font-size: 1.04rem;
  line-height: 1.8;
`;

const PanelLabel = styled.h3`
  margin: 0;
  color: ${colors.white};
  font-size: 1.2rem;
`;

const PanelText = styled.p`
  color: ${colors.lightBrown};
  line-height: 1.8;
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 850px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  padding: 1.5rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.16);
`;

const StatNumber = styled.h2`
  margin: 0;
  color: ${colors.white};
  font-size: 2rem;
`;

const StatLabel = styled.p`
  margin: 0.4rem 0 0;
  color: ${colors.lightBrown};
`;

const MainGrid = styled.section`
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 1.5rem;

  @media (max-width: 950px) {
    grid-template-columns: 1fr;
  }
`;

const FormCard = styled.form`
  padding: 2rem;
  border-radius: 28px;
  background: rgba(47, 27, 18, 0.72);
  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
`;

const ListCard = styled.div`
  padding: 2rem;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const SectionHeader = styled.div`
  margin-bottom: 1.25rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  color: ${colors.white};
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  letter-spacing: -0.04em;
`;

const Field = styled.label`
  display: grid;
  gap: 0.45rem;
  margin-bottom: 1rem;
`;

const Label = styled.span`
  color: ${colors.ivory};
  font-size: 0.88rem;
  font-weight: 800;
`;

const inputBase = `
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.22);
  outline: none;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.35);
  color: ${colors.white};
  padding: 0.95rem 1rem;
  font-size: 0.98rem;
`;

const Input = styled.input`
  ${inputBase}
`;

const SearchInput = styled.input`
  ${inputBase}
  margin-bottom: 1rem;
`;

const Textarea = styled.textarea`
  ${inputBase}
  min-height: 130px;
  resize: vertical;
`;

const Select = styled.select`
  ${inputBase}
`;

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  border: none;
  border-radius: 999px;
  background: ${colors.lightBrown};
  color: ${colors.black};
  padding: 0.95rem 1.3rem;
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.3);
  border-radius: 999px;
  background: transparent;
  color: ${colors.ivory};
  padding: 0.95rem 1.3rem;
  font-weight: 900;
  cursor: pointer;
`;

const SegmentList = styled.div`
  display: grid;
  gap: 1rem;
`;

const SegmentItem = styled.article`
  padding: 1.25rem;
  border-radius: 22px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.15);
`;

const SegmentTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
`;

const SegmentName = styled.h3`
  margin: 0;
  color: ${colors.white};
`;

const SegmentDescription = styled.p`
  margin: 0.45rem 0 0;
  color: ${colors.lightBrown};
  line-height: 1.6;
`;

const Badge = styled.span`
  height: fit-content;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: rgba(214, 182, 159, 0.16);
  color: ${colors.ivory};
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`;

const Meta = styled.span`
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: rgba(255, 255, 255, 0.06);
  color: ${colors.lightBrown};
  font-size: 0.8rem;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.7rem;
  margin-top: 1rem;
`;

const SmallButton = styled.button`
  border: none;
  border-radius: 999px;
  background: ${colors.ivory};
  color: ${colors.darkBrown};
  padding: 0.65rem 1rem;
  font-weight: 900;
  cursor: pointer;
`;

const DangerButton = styled.button`
  border: 1px solid rgba(255, 120, 120, 0.25);
  border-radius: 999px;
  background: rgba(255, 80, 80, 0.1);
  color: #ffd1d1;
  padding: 0.65rem 1rem;
  font-weight: 900;
  cursor: pointer;
`;

const EmptyState = styled.div`
  padding: 2rem;
  border-radius: 22px;
  background: rgba(0, 0, 0, 0.24);
  color: ${colors.lightBrown};
  text-align: center;
`;

const TagsRow = styled.div`
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  margin-top: 0.85rem;
`;

const Tag = styled.span`
  border-radius: 999px;
  padding: 0.32rem 0.65rem;
  background: rgba(214, 182, 159, 0.12);
  color: ${colors.lightBrown};
  font-size: 0.75rem;
  font-weight: 850;
`;
