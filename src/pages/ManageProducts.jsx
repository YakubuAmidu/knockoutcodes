import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

import { PRODUCT_ACTIONS } from "../reducers/products/productActionTypes";
import { productInitialState } from "../reducers/products/productInitialState";
import { productReducer } from "../reducers/products/productReducer";

const LS_KEY = "admin_products_cache_knockoutcodes";

const emptyForm = {
  _id: null,
  brand: "knockoutcodes",
  title: "",
  shortDescription: "",
  description: "",
  price: "",
  compareAtPrice: "",
  imagesText: "",
  category: "",
  tagsText: "",
  sizesText: "",
  colorsText: "",
  stock: 0,
  sku: "",
  isActive: true,
  isFeatured: false,
};

function parseCsv(text) {
  if (!text) return [];
  return String(text)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLines(text) {
  if (!text) return [];
  return String(text)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toEditForm(p) {
  return {
    _id: p?._id || p?.id || null,
    brand: p?.brand || "knockoutcodes",
    title: p?.title || "",
    shortDescription: p?.shortDescription || "",
    description: p?.description || "",
    price: p?.price ?? "",
    compareAtPrice: p?.compareAtPrice ?? "",
    imagesText: Array.isArray(p?.images) ? p.images.join("\n") : "",
    category: p?.category || "",
    tagsText: Array.isArray(p?.tags) ? p.tags.join(", ") : "",
    sizesText: Array.isArray(p?.sizes) ? p.sizes.join(", ") : "",
    colorsText: Array.isArray(p?.colors) ? p.colors.join(", ") : "",
    stock: p?.stock ?? 0,
    sku: p?.sku || "",
    isActive: !!p?.isActive,
    isFeatured: !!p?.isFeatured,
  };
}

export default function ManageProducts() {
  const { push } = useToast();
  const [state, dispatch] = useReducer(productReducer, productInitialState);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");

  const writeCache = (items) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), items }));
    } catch {
      // ignore
    }
  };

  const readCache = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.items) ? parsed.items : null;
    } catch {
      return null;
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.items;
    return state.items.filter((p) => {
      const t = `${p?.title || ""} ${p?.category || ""} ${(p?.tags || []).join(" ")}`.toLowerCase();
      return t.includes(q);
    });
  }, [query, state.items]);

  const fetchProducts = useCallback(async () => {
    dispatch({ type: PRODUCT_ACTIONS.FETCH_START });

    const cached = readCache();
    if (cached && cached.length) {
      dispatch({ type: PRODUCT_ACTIONS.FETCH_SUCCESS, payload: cached });
    }

    try {
      const [activeRes, inactiveRes] = await Promise.all([
        axiosInstance.get("/products", {
          params: { brand: "knockoutcodes", limit: 50, page: 1, sort: "-createdAt", active: "true" },
        }),
        axiosInstance.get("/products", {
          params: { brand: "knockoutcodes", limit: 50, page: 1, sort: "-createdAt", active: "false" },
        }),
      ]);

      const a = activeRes?.data?.products ?? [];
      const b = inactiveRes?.data?.products ?? [];

      const map = new Map();
      [...a, ...b].forEach((p) => {
        const id = p?._id || p?.id;
        if (id) map.set(id, p);
      });

      const merged = Array.from(map.values()).sort((x, y) => {
        const dx = new Date(x?.createdAt || 0).getTime();
        const dy = new Date(y?.createdAt || 0).getTime();
        return dy - dx;
      });

      dispatch({ type: PRODUCT_ACTIONS.FETCH_SUCCESS, payload: merged });
      writeCache(merged);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load products.";
      dispatch({ type: PRODUCT_ACTIONS.FETCH_ERROR, payload: msg });
      push({ title: "Couldn’t load products", description: msg, variant: "error" });
    }
  }, [push]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function resetForm() {
    setForm(emptyForm);
  }

  function onEdit(p) {
    setForm(toEditForm(p));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e) {
    e.preventDefault();

    const payload = {
      brand: "knockoutcodes",
      title: String(form.title).trim(),
      shortDescription: String(form.shortDescription || "").trim(),
      description: String(form.description || "").trim(),
      price: safeNumber(form.price, NaN),
      compareAtPrice: form.compareAtPrice === "" ? undefined : safeNumber(form.compareAtPrice, 0),
      images: parseLines(form.imagesText),
      category: String(form.category || "").trim(),
      tags: parseCsv(form.tagsText),
      sizes: parseCsv(form.sizesText),
      colors: parseCsv(form.colorsText),
      stock: safeNumber(form.stock, 0),
      sku: String(form.sku || "").trim(),
      isActive: !!form.isActive,
      isFeatured: !!form.isFeatured,
    };

    if (!payload.title || payload.title.length < 2) {
      push({ title: "Missing title", description: "Title must be at least 2 characters.", variant: "warning" });
      return;
    }
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      push({ title: "Invalid price", description: "Price must be a number ≥ 0.", variant: "warning" });
      return;
    }

    dispatch({ type: PRODUCT_ACTIONS.SAVE_START });

    try {
      let res;
      if (form._id) {
        res = await axiosInstance.put(`/products/${form._id}`, payload);
      } else {
        res = await axiosInstance.post(`/products`, payload);
      }

      const product = res?.data?.product;
      if (!product) throw new Error("Server did not return a product.");

      dispatch({ type: PRODUCT_ACTIONS.SAVE_SUCCESS, payload: product });

      const updatedId = product?._id || product?.id;
      const exists = state.items.some((p) => (p?._id || p?.id) === updatedId);
      const nextCache = exists
        ? state.items.map((p) => ((p?._id || p?.id) === updatedId ? product : p))
        : [product, ...state.items];

      writeCache(nextCache);

      push({
        title: form._id ? "Product updated" : "Product created",
        description: `${product.title}`,
        variant: "success",
      });

      resetForm();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Save failed.";
      dispatch({ type: PRODUCT_ACTIONS.SAVE_ERROR, payload: msg });
      push({ title: "Save failed", description: msg, variant: "error" });
    }
  }

  async function onDelete(id, title) {
    const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!ok) return;

    dispatch({ type: PRODUCT_ACTIONS.DELETE_START, payload: id });

    try {
      await axiosInstance.delete(`/products/${id}`);
      dispatch({ type: PRODUCT_ACTIONS.DELETE_SUCCESS, payload: id });

      const next = state.items.filter((p) => (p?._id || p?.id) !== id);
      writeCache(next);

      push({ title: "Product deleted", description: title, variant: "success" });

      if (form._id === id) resetForm();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Delete failed.";
      dispatch({ type: PRODUCT_ACTIONS.DELETE_ERROR, payload: msg });
      push({ title: "Delete failed", description: msg, variant: "error" });
    }
  }

  return (
    <Page>
      <Inner>
        <Hero
          as={motion.section}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Badge>ADMIN • PRODUCTS</Badge>
          <H1>
            ⚡ <span>CONTROL THE SHOP</span> — ADD GEAR, MOVE UNITS.
          </H1>
          <Sub>Luxury admin management for KnockoutCodes. Create. Edit. Update. Delete. Instantly.</Sub>
        </Hero>

        <TwoCol>
          <Panel>
            <PanelTitle>{form._id ? "Edit Product" : "Create New Product"}</PanelTitle>
            <PanelSub>Everything you save updates the database + admin cache.</PanelSub>

            <Form onSubmit={onSubmit}>
              <Row2>
                <Field>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="12oz Boxing Gloves — Pro Grip"
                    required
                  />
                </Field>

                <Field>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Gloves / Wraps / Headgear / Shoes..."
                  />
                </Field>
              </Row2>

              <Row2>
                <Field>
                  <Label>Price *</Label>
                  <Input
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="79.99"
                    inputMode="decimal"
                  />
                </Field>

                <Field>
                  <Label>Compare At</Label>
                  <Input
                    value={form.compareAtPrice}
                    onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                    placeholder="99.99"
                    inputMode="decimal"
                  />
                </Field>
              </Row2>

              <Row2>
                <Field>
                  <Label>Stock</Label>
                  <Input
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </Field>

                <Field>
                  <Label>SKU</Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    placeholder="KO-GLOVE-12OZ-BLK"
                  />
                </Field>
              </Row2>

              <Field>
                <Label>Short Description</Label>
                <Input
                  value={form.shortDescription}
                  onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                  placeholder="Premium gloves with pro wrist support and shock absorption."
                />
              </Field>

              <Field>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Write a strong product story..."
                />
              </Field>

              <Row2>
                <Field>
                  <Label>Tags (comma)</Label>
                  <Input
                    value={form.tagsText}
                    onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
                    placeholder="boxing, training, pro, shock-absorb"
                  />
                </Field>

                <Field>
                  <Label>Sizes (comma)</Label>
                  <Input
                    value={form.sizesText}
                    onChange={(e) => setForm((f) => ({ ...f, sizesText: e.target.value }))}
                    placeholder="10oz, 12oz, 14oz, 16oz"
                  />
                </Field>
              </Row2>

              <Field>
                <Label>Colors (comma)</Label>
                <Input
                  value={form.colorsText}
                  onChange={(e) => setForm((f) => ({ ...f, colorsText: e.target.value }))}
                  placeholder="Black, White, Red"
                />
              </Field>

              <Field>
                <Label>Images (one URL per line)</Label>
                <Textarea
                  value={form.imagesText}
                  onChange={(e) => setForm((f) => ({ ...f, imagesText: e.target.value }))}
                  placeholder={"https://...\nhttps://...\nhttps://..."}
                />
              </Field>

              <Row2>
                <Toggle>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span>Active (shows in shop)</span>
                </Toggle>

                <Toggle>
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                  />
                  <span>Featured</span>
                </Toggle>
              </Row2>

              <Buttons>
                <SaveBtn type="submit" disabled={state.saving}>
                  {state.saving ? "Saving..." : form._id ? "Update Product" : "Create Product"}
                </SaveBtn>

                <GhostBtn type="button" onClick={resetForm} disabled={state.saving}>
                  Clear
                </GhostBtn>
              </Buttons>
            </Form>
          </Panel>

          <Panel>
            <ListTop>
              <div>
                <PanelTitle>All Products</PanelTitle>
                <PanelSub>{state.loading ? "Loading..." : `${filtered.length} items • KnockoutCodes`}</PanelSub>
              </div>

              <RefreshBtn type="button" onClick={fetchProducts} disabled={state.loading}>
                {state.loading ? "Refreshing..." : "Refresh"}
              </RefreshBtn>
            </ListTop>

            <Search
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, category, tags..."
            />

            {state.error ? <ErrorText>{state.error}</ErrorText> : null}

            <List>
              {filtered.map((p) => {
                const id = p?._id || p?.id;
                const img = Array.isArray(p?.images) && p.images[0] ? p.images[0] : "";
                const deleting = state.deletingId === id;

                return (
                  <Item key={id} as={motion.div} layout>
                    <Thumb>
                      {img ? <img src={img} alt={p?.title || "product"} /> : <ThumbEmpty>No Image</ThumbEmpty>}
                    </Thumb>

                    <Info>
                      <NameRow>
                        <Name title={p?.title || ""}>{p?.title || "Untitled"}</Name>
                        <Chips>
                          <Chip $on={p?.isActive}>{p?.isActive ? "Active" : "Hidden"}</Chip>
                          {p?.isFeatured ? <Chip $on>Featured</Chip> : null}
                        </Chips>
                      </NameRow>

                      <Meta>
                        <b>${Number(p?.price ?? 0).toFixed(2)}</b> • Stock: <b>{p?.stock ?? 0}</b>
                        {p?.category ? <> • {p.category}</> : null}
                      </Meta>

                      <Actions>
                        <MiniBtn type="button" onClick={() => onEdit(p)}>
                          Edit
                        </MiniBtn>
                        <MiniDanger
                          type="button"
                          onClick={() => onDelete(id, p?.title || "product")}
                          disabled={deleting}
                          title="Delete product"
                        >
                          {deleting ? "Deleting..." : "Delete"}
                        </MiniDanger>
                      </Actions>
                    </Info>
                  </Item>
                );
              })}

              {!state.loading && filtered.length === 0 ? (
                <EmptyBox>No products found. Create your first product above.</EmptyBox>
              ) : null}
            </List>
          </Panel>
        </TwoCol>
      </Inner>
    </Page>
  );
}

/* ------------------------- styles ------------------------- */

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 18px 80px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(circle at 18% 8%, rgba(214,182,159,0.22) 0%, rgba(0,0,0,0) 40%),
    radial-gradient(circle at 82% 14%, rgba(90,56,37,0.35) 0%, rgba(0,0,0,0) 44%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.darkBrown} 0%, #000 85%);
`;

const Inner = styled.section`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.12);
  padding: 22px 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(18px);
`;

const Badge = styled.div`
  display: inline-flex;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  font-weight: 900;
  letter-spacing: 0.16em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const H1 = styled.h1`
  margin: 10px 0 8px;
  font-size: clamp(24px, 3vw, 40px);
  line-height: 1.06;
  letter-spacing: -0.02em;

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-shadow: 0 14px 38px rgba(0,0,0,0.45);
  }
`;

const Sub = styled.p`
  margin: 0;
  opacity: 0.9;
  color: ${({ theme }) => theme.colors.ivory};
  max-width: 70ch;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 14px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 16px;
  backdrop-filter: blur(16px);
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.01em;
`;

const PanelSub = styled.div`
  margin-top: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.85;
`;

const Form = styled.form`
  margin-top: 14px;
  display: grid;
  gap: 12px;
`;

const Row2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
`;

const Label = styled.span`
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.ivory};
  text-transform: uppercase;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;

  &:focus {
    border-color: rgba(214,182,159,0.6);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.12);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 110px;
  padding: 12px 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;
  resize: vertical;

  &:focus {
    border-color: rgba(214,182,159,0.6);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.12);
  }
`;

const Toggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.28);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 800;

  input {
    width: 18px;
    height: 18px;
    accent-color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Buttons = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const SaveBtn = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(90,56,37,0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const GhostBtn = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ListTop = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`;

const RefreshBtn = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Search = styled.input`
  margin-top: 12px;
  width: 100%;
  padding: 12px 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;

  &:focus {
    border-color: rgba(214,182,159,0.6);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.12);
  }
`;

const ErrorText = styled.div`
  margin-top: 10px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(90,56,37,0.22);
  border: 1px solid rgba(214,182,159,0.22);
  color: ${({ theme }) => theme.colors.ivory};
`;

const List = styled.div`
  margin-top: 12px;
  display: grid;
  gap: 10px;
`;

/* ✅ FIX: prevent “scattered/overlapping” by making the item a solid grid
   that responsively stacks on smaller widths, and keeping actions inside the flow. */
const Item = styled.div`
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 10px;
  align-items: start;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.28);

  @media (max-width: 520px) {
    grid-template-columns: 56px 1fr;
  }
`;

const Thumb = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.10);
  overflow: hidden;
  display: grid;
  place-items: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  @media (max-width: 520px) {
    width: 56px;
    height: 56px;
  }
`;

const ThumbEmpty = styled.div`
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.8;
`;

const Info = styled.div`
  min-width: 0;
  display: grid;
  gap: 8px;
`;

const NameRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`;

const Name = styled.div`
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`;

const Meta = styled.div`
  font-size: 13px;
  opacity: 0.9;
  color: ${({ theme }) => theme.colors.lightBrown};

  b {
    color: ${({ theme }) => theme.colors.ivory};
  }
`;

const Chips = styled.div`
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const Chip = styled.div`
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: ${(p) => (p.$on ? "rgba(214,182,159,0.18)" : "rgba(0,0,0,0.28)")};
  color: ${(p) => (p.$on ? p.theme.colors.ivory : "rgba(255,255,255,0.8)")};
  font-weight: 900;
  font-size: 12px;
`;

/* ✅ FIX: actions always stay in-flow, wrap nicely, never overlap */
const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const MiniBtn = styled.button`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 900;
  cursor: pointer;
`;

const MiniDanger = styled.button`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(90,56,37,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmptyBox = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0,0,0,0.28);
  border: 1px solid rgba(255,255,255,0.12);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
  text-align: center;
`;
