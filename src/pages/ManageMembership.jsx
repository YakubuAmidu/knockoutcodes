import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchManageMemberships,
  createManageMembership,
  updateManageMembership,
  deleteManageMembership,
} from "../reducers/manageMembership/manageMembershipActions";

import { MANAGE_MEMBERSHIPS_ACTIONS } from "../reducers/manageMembership/manageMembershipActionTypes";

const levels = [
  { value: "foundations", label: "Foundations" },
  { value: "development", label: "Development" },
  { value: "performance", label: "Performance" },
  { value: "elite-fight-camp", label: "Elite Fight Camp" },
];

const initialFormState = {
  _id: "",
  membershipId: "foundations",
  accessLevel: "foundations",
  title: "",
  instructor: "KnockoutCodes Academy",
  priceLabel: "",
  monthlyPriceLabel: "",
  yearlyPriceLabel: "",
  stripePriceId: "",
  stripePriceIdMonthly: "",
  stripePriceIdYearly: "",
  short: "",
  meta: "",
  glyph: "KC",
  badgeLeft: "KnockoutCodes",
  badgeRight: "Membership",
  highlight: false,
  isPublished: true,
  isFeatured: false,
  sortOrder: "",
};

const arrayToText = (value) => (Array.isArray(value) ? value.join(", ") : "");

const textToArray = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);

const buildPayload = (formData) => ({
  membershipId: formData.membershipId,
  accessLevel: formData.accessLevel || formData.membershipId,
  title: String(formData.title || "").trim(),
  instructor: String(formData.instructor || "").trim(),
  priceLabel: String(formData.priceLabel || "").trim(),
  monthlyPriceLabel: String(formData.monthlyPriceLabel || "").trim(),
  yearlyPriceLabel: String(formData.yearlyPriceLabel || "").trim(),
  stripePriceId: String(formData.stripePriceId || "").trim(),
  stripePriceIdMonthly: String(formData.stripePriceIdMonthly || "").trim(),
  stripePriceIdYearly: String(formData.stripePriceIdYearly || "").trim(),
  short: String(formData.short || "").trim(),
  meta: textToArray(formData.meta),
  glyph: String(formData.glyph || "KC").trim(),
  badgeLeft: String(formData.badgeLeft || "").trim(),
  badgeRight: String(formData.badgeRight || "").trim(),
  highlight: Boolean(formData.highlight),
  isPublished: Boolean(formData.isPublished),
  isFeatured: Boolean(formData.isFeatured),
  sortOrder: Number(formData.sortOrder || 0),
});

export default function ManageMembership() {
  const dispatch = useDispatch();

  const {
    memberships = [],
    pagination,
    selectedMembership,
    loading,
    saving,
    deleting,
    error,
    successMessage,
    search = "",
    levelFilter = "all",
    statusFilter = "all",
  } = useSelector((state) => state.manageMemberships || {});

  const [formData, setFormData] = useState(initialFormState);
  const [toast, setToast] = useState(null);

  const safeMemberships = useMemo(
    () => (Array.isArray(memberships) ? memberships : []),
    [memberships],
  );

  const isEditing = Boolean(selectedMembership?._id);

  useEffect(() => {
    dispatch(fetchManageMemberships());
  }, [dispatch]);

  useEffect(() => {
    if (successMessage) setToast({ type: "success", message: successMessage });
  }, [successMessage]);

  useEffect(() => {
    if (error) setToast({ type: "error", message: error });
  }, [error]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => {
      setToast(null);
      dispatch({ type: MANAGE_MEMBERSHIPS_ACTIONS.CLEAR_ERROR });
    }, 4200);

    return () => clearTimeout(timer);
  }, [toast, dispatch]);

  const publishedCount = useMemo(
    () => safeMemberships.filter((item) => item?.isPublished).length,
    [safeMemberships],
  );

  const draftCount = useMemo(
    () => safeMemberships.filter((item) => !item?.isPublished).length,
    [safeMemberships],
  );

  const featuredCount = useMemo(
    () =>
      safeMemberships.filter((item) => item?.isFeatured || item?.highlight)
        .length,
    [safeMemberships],
  );

  const filteredMemberships = useMemo(() => {
    const term = String(search || "")
      .toLowerCase()
      .trim()
      .slice(0, 120);

    return safeMemberships.filter((item) => {
      const matchesSearch =
        !term ||
        String(item?.title || "")
          .toLowerCase()
          .includes(term) ||
        String(item?.membershipId || "")
          .toLowerCase()
          .includes(term) ||
        String(item?.accessLevel || "")
          .toLowerCase()
          .includes(term) ||
        String(item?.short || "")
          .toLowerCase()
          .includes(term) ||
        String(item?.slug || "")
          .toLowerCase()
          .includes(term);

      const matchesLevel =
        levelFilter === "all" ||
        String(item?.membershipId) === String(levelFilter) ||
        String(item?.accessLevel) === String(levelFilter);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && item?.isPublished) ||
        (statusFilter === "draft" && !item?.isPublished) ||
        (statusFilter === "featured" && (item?.isFeatured || item?.highlight));

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [safeMemberships, search, levelFilter, statusFilter]);

  const fillForm = (item) => {
    setFormData({
      _id: item?._id || "",
      membershipId: item?.membershipId || "foundations",
      accessLevel: item?.accessLevel || item?.membershipId || "foundations",
      title: item?.title || "",
      instructor: item?.instructor || "KnockoutCodes Academy",
      priceLabel: item?.priceLabel || "",
      monthlyPriceLabel: item?.monthlyPriceLabel || "",
      yearlyPriceLabel: item?.yearlyPriceLabel || "",
      stripePriceId: item?.stripePriceId || "",
      stripePriceIdMonthly: item?.stripePriceIdMonthly || "",
      stripePriceIdYearly: item?.stripePriceIdYearly || "",
      short: item?.short || "",
      meta: arrayToText(item?.meta),
      glyph: item?.glyph || "KC",
      badgeLeft: item?.badgeLeft || "KnockoutCodes",
      badgeRight: item?.badgeRight || "Membership",
      highlight: Boolean(item?.highlight),
      isPublished: Boolean(item?.isPublished),
      isFeatured: Boolean(item?.isFeatured),
      sortOrder: item?.sortOrder != null ? String(item.sortOrder) : "",
    });
  };

  const handleNew = () => {
    dispatch({ type: MANAGE_MEMBERSHIPS_ACTIONS.CLEAR_SELECTED_MEMBERSHIP });
    setFormData(initialFormState);
  };

  const handleEdit = (item) => {
    dispatch({
      type: MANAGE_MEMBERSHIPS_ACTIONS.SET_SELECTED_MEMBERSHIP,
      payload: item,
    });
    fillForm(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "membershipId") {
        next.accessLevel = value;
      }

      if (name === "monthlyPriceLabel" && !prev.priceLabel) {
        next.priceLabel = value;
      }

      if (name === "stripePriceIdMonthly" && !prev.stripePriceId) {
        next.stripePriceId = value;
      }

      return next;
    });
  };

  const validate = () => {
    const title = String(formData.title || "").trim();
    const short = String(formData.short || "").trim();

    if (!levels.some((level) => level.value === formData.membershipId))
      return "Choose a valid membership ID.";
    if (!levels.some((level) => level.value === formData.accessLevel))
      return "Choose a valid access level.";
    if (title.length < 3) return "Title must be at least 3 characters.";
    if (!String(formData.priceLabel || "").trim())
      return "Price label is required.";
    if (short.length < 10)
      return "Short description must be at least 10 characters.";

    const stripeIds = [
      formData.stripePriceId,
      formData.stripePriceIdMonthly,
      formData.stripePriceIdYearly,
    ].filter(Boolean);

    if (stripeIds.some((id) => !String(id).startsWith("price_"))) {
      return "Stripe price IDs must start with price_.";
    }

    const duplicate = safeMemberships.some(
      (item) =>
        item?._id !== formData._id &&
        String(item?.membershipId || "").toLowerCase() ===
          String(formData.membershipId || "").toLowerCase(),
    );

    if (!isEditing && duplicate) {
      return "A membership with this membership ID already exists.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const message = validate();

    if (message) {
      setToast({ type: "error", message });
      return;
    }

    const payload = buildPayload(formData);

    if (isEditing) {
      await dispatch(updateManageMembership(selectedMembership._id, payload));
    } else {
      await dispatch(createManageMembership(payload));
    }

    handleNew();
  };

  const handleDelete = async (item) => {
    if (!item?._id) {
      setToast({ type: "error", message: "Membership ID is missing." });
      return;
    }

    const ok = window.confirm(
      `Delete "${item.title}"?\n\nThis can affect checkout cards and active membership display.`,
    );

    if (!ok) return;

    await dispatch(deleteManageMembership(item._id));

    if (selectedMembership?._id === item._id) handleNew();
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
          <Eyebrow>KnockoutCodes Membership Control</Eyebrow>
          <Title>Build Premium Plans Students Trust Fast.</Title>
          <Subtitle>
            Create, edit, publish, feature, price, and protect every recurring
            membership plan from one luxury admin dashboard.
          </Subtitle>

          <HeroActions>
            <PrimaryButton type="button" onClick={handleNew}>
              + Create New Membership
            </PrimaryButton>

            <GhostButton
              type="button"
              onClick={() => dispatch(fetchManageMemberships())}
            >
              Refresh Memberships
            </GhostButton>
          </HeroActions>
        </HeroLeft>

        <HeroPanel>
          <PanelLabel>Membership System</PanelLabel>
          <PanelTitle>Keep pricing, access, and Stripe IDs clean.</PanelTitle>
          <PanelList>
            <li>Foundations, Development, Performance, Elite Fight Camp</li>{" "}
            <li>Monthly and yearly Stripe price IDs</li>
            <li>Published, featured, and highlight controls</li>
            <li>Safe admin-only create, edit, and delete</li>
          </PanelList>
        </HeroPanel>
      </Hero>

      <StatsGrid>
        <StatCard>
          <strong>{pagination?.total || safeMemberships.length}</strong>
          <span>Total Plans</span>
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
                {isEditing ? "Edit Membership" : "Create Membership"}
              </SectionEyebrow>
              <SectionTitle>
                {isEditing ? "Upgrade This Plan" : "Build A Premium Plan"}
              </SectionTitle>
            </div>
            <MiniBadge>{isEditing ? "Editing" : "New Plan"}</MiniBadge>
          </PanelTop>

          <Form onSubmit={handleSubmit}>
            <Field>
              <Label>Membership ID *</Label>
              <Select
                name="membershipId"
                value={formData.membershipId}
                onChange={handleChange}
              >
                {levels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label>Access Level *</Label>
              <Select
                name="accessLevel"
                value={formData.accessLevel}
                onChange={handleChange}
              >
                {levels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </Select>
            </Field>

            <WideField>
              <Label>Title *</Label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="KnockoutCodes Foundations Membership"
              />
            </WideField>

            <Field>
              <Label>Instructor</Label>
              <Input
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <Label>Glyph</Label>
              <Input
                name="glyph"
                value={formData.glyph}
                onChange={handleChange}
                placeholder="KC"
              />
            </Field>

            <Field>
              <Label>Price Label *</Label>
              <Input
                name="priceLabel"
                value={formData.priceLabel}
                onChange={handleChange}
                placeholder="$20 / month"
              />
            </Field>

            <Field>
              <Label>Monthly Price Label</Label>
              <Input
                name="monthlyPriceLabel"
                value={formData.monthlyPriceLabel}
                onChange={handleChange}
                placeholder="$20 / month"
              />
            </Field>

            <Field>
              <Label>Yearly Price Label</Label>
              <Input
                name="yearlyPriceLabel"
                value={formData.yearlyPriceLabel}
                onChange={handleChange}
                placeholder="$200 / year"
              />
            </Field>

            <Field>
              <Label>Stripe Default Price ID</Label>
              <Input
                name="stripePriceId"
                value={formData.stripePriceId}
                onChange={handleChange}
                placeholder="price_..."
              />
            </Field>

            <Field>
              <Label>Stripe Monthly Price ID</Label>
              <Input
                name="stripePriceIdMonthly"
                value={formData.stripePriceIdMonthly}
                onChange={handleChange}
                placeholder="price_..."
              />
            </Field>

            <Field>
              <Label>Stripe Yearly Price ID</Label>
              <Input
                name="stripePriceIdYearly"
                value={formData.stripePriceIdYearly}
                onChange={handleChange}
                placeholder="price_..."
              />
            </Field>

            <Field>
              <Label>Sort Order</Label>
              <Input
                type="number"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleChange}
                placeholder="1"
              />
            </Field>

            <WideField>
              <Label>Short Description *</Label>
              <TextArea
                name="short"
                value={formData.short}
                onChange={handleChange}
                placeholder="Explain who this membership is for and why it matters."
              />
            </WideField>

            <WideField>
              <Label>Meta Bullets</Label>
              <Input
                name="meta"
                value={formData.meta}
                onChange={handleChange}
                placeholder="Full beginner access, Monthly training, Protected courses"
              />
            </WideField>

            <Field>
              <Label>Left Badge</Label>
              <Input
                name="badgeLeft"
                value={formData.badgeLeft}
                onChange={handleChange}
              />
            </Field>

            <Field>
              <Label>Right Badge</Label>
              <Input
                name="badgeRight"
                value={formData.badgeRight}
                onChange={handleChange}
              />
            </Field>

            <ToggleGrid>
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

              <CheckboxLabel>
                <input
                  type="checkbox"
                  name="highlight"
                  checked={formData.highlight}
                  onChange={handleChange}
                />
                Highlight
              </CheckboxLabel>
            </ToggleGrid>

            <FormActions>
              <GhostButton type="button" onClick={handleNew}>
                Reset
              </GhostButton>

              <PrimaryButton type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create Membership"}
              </PrimaryButton>
            </FormActions>
          </Form>
        </FormPanel>

        <MembershipsPanel>
          <PanelTop>
            <div>
              <SectionEyebrow>Membership Database</SectionEyebrow>
              <SectionTitle>Manage Live Plans</SectionTitle>
            </div>
          </PanelTop>

          <Filters>
            <Input
              value={search}
              onChange={(e) =>
                dispatch({
                  type: MANAGE_MEMBERSHIPS_ACTIONS.SET_SEARCH,
                  payload: e.target.value,
                })
              }
              placeholder="Search title, level, slug..."
            />

            <Select
              value={levelFilter}
              onChange={(e) =>
                dispatch({
                  type: MANAGE_MEMBERSHIPS_ACTIONS.SET_LEVEL_FILTER,
                  payload: e.target.value,
                })
              }
            >
              <option value="all">All Levels</option>
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(e) =>
                dispatch({
                  type: MANAGE_MEMBERSHIPS_ACTIONS.SET_STATUS_FILTER,
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
            <StateBox>Loading memberships...</StateBox>
          ) : filteredMemberships.length === 0 ? (
            <StateBox>No memberships found.</StateBox>
          ) : (
            <MembershipList>
              {filteredMemberships.map((item) => (
                <MembershipCard key={item?._id || item?.membershipId}>
                  <PlanIcon>{item?.glyph || "KC"}</PlanIcon>

                  <PlanBody>
                    <PlanTop>
                      <PlanTitle>{item?.title}</PlanTitle>
                      <Price>{item?.priceLabel}</Price>
                    </PlanTop>

                    <PlanText>{item?.short}</PlanText>

                    <PlanMeta>
                      <span>{item?.membershipId}</span>
                      <span>Access: {item?.accessLevel}</span>
                      <span>{item?.isPublished ? "Published" : "Draft"}</span>
                      <span>{item?.isFeatured ? "Featured" : "Standard"}</span>
                      <span>⭐ {Number(item?.rating || 0).toFixed(1)}</span>
                      <span>{item?.enrolled || 0} enrolled</span>
                    </PlanMeta>

                    <CardActions>
                      <GhostButton
                        type="button"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </GhostButton>

                      <DangerButton
                        type="button"
                        disabled={deleting || saving}
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </DangerButton>
                    </CardActions>
                  </PlanBody>
                </MembershipCard>
              ))}
            </MembershipList>
          )}
        </MembershipsPanel>
      </DashboardGrid>
    </Page>
  );
}

/* Styles copied to match ManageCourses luxury admin pattern */
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

const MembershipsPanel = styled(FormPanel)``;

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

const ToggleGrid = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
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

const MembershipList = styled.div`
  display: grid;
  gap: 13px;
  max-height: 980px;
  overflow: auto;
  padding-right: 4px;
`;

const MembershipCard = styled.article`
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: 13px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 249, 242, 0.1);
  overflow: hidden;
  padding: 13px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const PlanIcon = styled.div`
  min-height: 86px;
  border-radius: ${({ theme }) => theme.radius.xl};
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 24px;
  font-weight: 950;
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.colors.brown},
    ${({ theme }) => theme.colors.black}
  );
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const PlanBody = styled.div`
  min-width: 0;
`;

const PlanTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
`;

const PlanTitle = styled.h3`
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 17px;
  font-weight: 950;
`;

const Price = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 13px;
  font-weight: 950;
  white-space: nowrap;
`;

const PlanText = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  font-size: 12.5px;
  line-height: 1.55;
`;

const PlanMeta = styled.div`
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
