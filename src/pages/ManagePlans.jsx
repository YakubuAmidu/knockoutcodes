// src/pages/admin/ManagePlans.jsx
import { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import axiosInstance from "../utils/axiosInstance";
import { useToast } from "../components/Toast";

const Wrap = styled.div`
  padding: 24px 18px 40px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
`;

const SubTitle = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.lightgray || "#a7a7a7"};
  max-width: 520px;
`;

const Button = styled.button`
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #ffffff;
  background: ${({ theme }) =>
    theme.gradients?.brand || "linear-gradient(120deg, #C71585, #ff5bb1)"};
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
  transition:
    transform 0.14s ease-out,
    box-shadow 0.14s ease-out,
    opacity 0.12s ease-out;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6);
    opacity: 0.95;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
    box-shadow: none;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.1fr);
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.black || "#050505"};
  border-radius: 18px;
  padding: 18px 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6);
`;

const CardTitle = styled.h2`
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
`;

const CardSub = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.lightgray || "#b0b0b0"};
  margin-bottom: 14px;
`;

const Table = styled.div`
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const THead = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.9fr 0.8fr 0.9fr;
  background: rgba(255, 255, 255, 0.04);
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.09em;

  @media (max-width: 840px) {
    display: none;
  }
`;

const TRow = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.9fr 0.8fr 0.9fr;
  padding: 8px 10px;
  font-size: 12px;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: ${({ active }) =>
    active ? "rgba(255, 255, 255, 0.06)" : "transparent"};
  cursor: pointer;
  transition: background 0.16s ease-out;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  @media (max-width: 840px) {
    grid-template-columns: 1.2fr 0.9fr 0.9fr;
    grid-template-rows: auto auto;
    row-gap: 4px;

    & > div:nth-child(3),
    & > div:nth-child(4) {
      display: none;
    }
  }
`;

const TCell = styled.div`
  padding-right: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Tag = styled.span`
  font-size: 10px;
  padding: 3px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  text-transform: uppercase;
  letter-spacing: 0.09em;
`;

const Muted = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.lightgray || "#b0b0b0"};
`;

const Badge = styled.span`
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.gradients?.brand || "linear-gradient(120deg, #C71585, #ff5bb1)"};
  color: #ffffff;
  font-weight: 600;
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
`;

const Hint = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.lightgray || "#a5a5a5"};
`;

const Input = styled.input`
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  font-size: 13px;
  outline: none;
  width: 100%;
  transition:
    border-color 0.14s ease-out,
    background 0.14s ease-out;

  &:focus {
    border-color: rgba(255, 255, 255, 0.38);
    background: rgba(0, 0, 0, 0.96);
  }
`;

const TextArea = styled.textarea`
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  font-size: 13px;
  outline: none;
  min-height: 70px;
  resize: vertical;
  transition:
    border-color 0.14s ease-out,
    background 0.14s ease-out;

  &:focus {
    border-color: rgba(255, 255, 255, 0.38);
    background: rgba(0, 0, 0, 0.96);
  }
`;

const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
`;

const SwitchInput = styled.input`
  accent-color: #c71585;
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const GhostButton = styled.button`
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: transparent;
  color: #ffffff;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.16s ease-out,
    color 0.16s ease-out,
    border-color 0.16s ease-out;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const ManagePlans = () => {
  const toast = useToast();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    price: "",
    currency: "usd",
    stripePriceId: "",
    description: "",
    isActive: true,
  });

  const resetForm = useCallback(() => {
    setSelectedId(null);
    setForm({
      name: "",
      slug: "",
      price: "",
      currency: "usd",
      stripePriceId: "",
      description: "",
      isActive: true,
    });
  }, []);

  const slugify = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/plans");

      if (res.data && res.data.success) {
        setPlans(res.data.data || []);
      } else {
        toast.showToast("Unable to load plans.", "error");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load plans.";
      toast.showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const handleSelectPlan = (plan) => {
    setSelectedId(plan._id);
    setForm({
      name: plan.name || "",
      slug: plan.slug || "",
      price:
        typeof plan.price === "number" ? String(plan.price) : plan.price || "",
      currency: plan.currency || "usd",
      stripePriceId: plan.stripePriceId || "",
      description: plan.description || "",
      isActive: Boolean(plan.isActive),
    });
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      if (field === "name") {
        const maybeSlug = prev.slug || slugify(value);
        return {
          ...prev,
          name: value,
          slug: maybeSlug,
        };
      }
      if (field === "price") {
        const numericValue = value.replace(/[^\d.]/g, "");
        return { ...prev, price: numericValue };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleToggleActive = () => {
    setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.slug.trim() || !form.stripePriceId.trim()) {
      toast.showToast("Name, slug, and Stripe price ID are required.", "error");
      return;
    }

    if (!form.price || Number.isNaN(Number(form.price))) {
      toast.showToast("Please enter a valid numeric price.", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        slug: slugify(form.slug || form.name),
        stripePriceId: form.stripePriceId.trim(),
        price: Number(form.price),
        currency: (form.currency || "usd").toLowerCase(),
        description: form.description.trim() || undefined,
        isActive: form.isActive,
      };

      if (selectedId) {
        const res = await axiosInstance.put(`/plans/${selectedId}`, payload);
        if (res.data && res.data.success) {
          toast.showToast("Plan updated successfully.", "success");
        } else {
          toast.showToast("Failed to update plan.", "error");
        }
      } else {
        const res = await axiosInstance.post("/plans", payload);
        if (res.data && res.data.success) {
          toast.showToast("Plan created successfully.", "success");
        } else {
          toast.showToast("Failed to create plan.", "error");
        }
      }

      await loadPlans();
      resetForm();
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save plan.";
      toast.showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;

    // simple confirmation
    const ok = window.confirm(
      "Are you sure you want to delete this plan? This cannot be undone.",
    );
    if (!ok) return;

    try {
      setDeleting(true);
      const res = await axiosInstance.delete(`/plans/${selectedId}`);

      if (res.data && res.data.success) {
        toast.showToast("Plan deleted.", "success");
      } else {
        toast.showToast("Failed to delete plan.", "error");
      }

      await loadPlans();
      resetForm();
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete plan.";
      toast.showToast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Wrap>
      <HeaderRow>
        <div>
          <Title>Manage Membership Plans</Title>
          <SubTitle>
            Connect your Stripe prices to KnockoutCodes membership tiers. Create
            or edit plans and keep <strong>name / slug / price</strong> in sync
            with Stripe.
          </SubTitle>
        </div>
        <Button type="button" onClick={resetForm}>
          + New Plan
        </Button>
      </HeaderRow>

      <Grid>
        {/* Plans list */}
        <Card>
          <CardTitle>Existing Plans</CardTitle>
          <CardSub>
            Click a row to edit. <strong>Slug</strong> is what the frontend uses
            (e.g. <Muted>basic</Muted>, <Muted>standard</Muted>,{" "}
            <Muted>premium</Muted>).
          </CardSub>

          {loading && <Muted>Loading plans…</Muted>}

          {!loading && plans.length === 0 && (
            <Muted>No plans yet. Create your first membership tier.</Muted>
          )}

          {!loading && plans.length > 0 && (
            <Table>
              <THead>
                <div>Name</div>
                <div>Slug</div>
                <div>Price</div>
                <div>Currency</div>
                <div>Status</div>
              </THead>
              {plans.map((plan) => (
                <TRow
                  key={plan._id}
                  active={selectedId === plan._id}
                  onClick={() => handleSelectPlan(plan)}
                >
                  <TCell>
                    <div>{plan.name}</div>
                    <div>
                      <Muted>
                        {plan.description
                          ? plan.description.slice(0, 72)
                          : "No description"}
                      </Muted>
                    </div>
                  </TCell>
                  <TCell>{plan.slug}</TCell>
                  <TCell>
                    {typeof plan.price === "number"
                      ? `$${plan.price.toFixed(2)}`
                      : plan.price}
                  </TCell>
                  <TCell>{(plan.currency || "usd").toUpperCase()}</TCell>
                  <TCell>
                    {plan.isActive ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Tag>Inactive</Tag>
                    )}
                  </TCell>
                </TRow>
              ))}
            </Table>
          )}
        </Card>

        {/* Form */}
        <Card>
          <CardTitle>{selectedId ? "Edit Plan" : "Create Plan"}</CardTitle>
          <CardSub>
            Grab the <strong>price ID</strong> from your Stripe dashboard (e.g.{" "}
            <Muted>price_123abc</Muted>) and paste it here. Price should match
            Stripe to avoid confusion.
          </CardSub>

          <Form onSubmit={handleSubmit}>
            <Field>
              <LabelRow>
                <Label htmlFor="name">Plan name</Label>
                <Hint>Example: Basic, Standard, Premium</Hint>
              </LabelRow>
              <Input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Premium"
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="slug">Slug</Label>
                <Hint>Lowercase, URL-friendly. Used on frontend.</Hint>
              </LabelRow>
              <Input
                id="slug"
                type="text"
                value={form.slug}
                onChange={(e) => handleChange("slug", slugify(e.target.value))}
                placeholder="premium"
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="price">Price (per billing period)</Label>
                <Hint>In your main currency, e.g. 49</Hint>
              </LabelRow>
              <Input
                id="price"
                type="text"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="49"
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="currency">Currency</Label>
                <Hint>Usually usd</Hint>
              </LabelRow>
              <Input
                id="currency"
                type="text"
                value={form.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                placeholder="usd"
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="stripePriceId">Stripe price ID</Label>
                <Hint>From Stripe → Products → Pricing</Hint>
              </LabelRow>
              <Input
                id="stripePriceId"
                type="text"
                value={form.stripePriceId}
                onChange={(e) => handleChange("stripePriceId", e.target.value)}
                placeholder="price_123abcXYZ"
              />
            </Field>

            <Field>
              <LabelRow>
                <Label htmlFor="description">Description</Label>
                <Hint>Optional. Short marketing copy.</Hint>
              </LabelRow>
              <TextArea
                id="description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Unlock all boxing courses, live Q&A, and more."
              />
            </Field>

            <Field>
              <LabelRow>
                <Label>Status</Label>
                <Hint>Inactive plans won’t appear on subscription page.</Hint>
              </LabelRow>
              <SwitchRow>
                <SwitchInput
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={handleToggleActive}
                />
                <Label htmlFor="isActive">
                  {form.isActive ? "Active" : "Inactive"}
                </Label>
              </SwitchRow>
            </Field>

            <ActionsRow>
              <Button type="submit" disabled={saving}>
                {saving
                  ? selectedId
                    ? "Saving…"
                    : "Creating…"
                  : selectedId
                    ? "Save changes"
                    : "Create plan"}
              </Button>

              {selectedId && (
                <GhostButton
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete plan"}
                </GhostButton>
              )}

              {selectedId && (
                <GhostButton
                  type="button"
                  onClick={resetForm}
                  disabled={saving || deleting}
                >
                  Cancel edit
                </GhostButton>
              )}
            </ActionsRow>
          </Form>
        </Card>
      </Grid>
    </Wrap>
  );
};

export default ManagePlans;
