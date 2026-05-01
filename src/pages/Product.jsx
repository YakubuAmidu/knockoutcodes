// src/pages/Product.jsx
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";

// ✅ CHANGED: axios import (named export to avoid "no default export" errors)
import axiosInstance from "../../utils/axiosInstance";

import { useToast } from "../components/Toast";

// ✅ ADDED: redux dispatch for cart
import { useDispatch } from "react-redux";

// ✅ ADDED: cart actions
import { CART_ACTIONS } from "../reducers/cart/cartActionTypes";

// ✅ reducer imports (DO NOT create again)
import { PRODUCT_ACTIONS } from "../reducers/products/productActionTypes";
import { productInitialState } from "../reducers/products/productInitialState";
import { productReducer } from "../reducers/products/productReducer";

const LIMIT = 8;

export default function Product() {
  // ✅ reducer state (products page local reducer - ok for now)
  const [state, dispatch] = useReducer(productReducer, productInitialState);
  const { items, loading, error } = state;

  // ✅ ADDED: redux dispatch for cart actions
  const cartDispatch = useDispatch();

  const [page, setPage] = useState(1);

  const [meta, setMeta] = useState({
    total: null,
    totalPages: null,
    hasNextPage: null,
    hasPrevPage: null,
  });

  const toast = useToast();
  const lastToastMsgRef = useRef("");

  const canPrev = useMemo(() => {
    if (meta.hasPrevPage !== null) return meta.hasPrevPage;
    return page > 1;
  }, [meta.hasPrevPage, page]);

  const canNext = useMemo(() => {
    if (meta.hasNextPage !== null) return meta.hasNextPage;
    if (meta.totalPages !== null) return page < meta.totalPages;
    return items.length === LIMIT;
  }, [meta.hasNextPage, meta.totalPages, page, items.length]);

  async function fetchProducts(p) {
    dispatch({ type: PRODUCT_ACTIONS.FETCH_START });

    try {
      const { data } = await axiosInstance.get("/products", {
        params: {
          brand: "knockoutcodes",
          page: p,
          limit: LIMIT,
          sort: "-createdAt",
        },
      });

      const list =
        data?.products ??
        data?.data ??
        data?.items ??
        data?.results ??
        [];

      const m = data?.meta ?? data ?? {};

      dispatch({
        type: PRODUCT_ACTIONS.FETCH_SUCCESS,
        payload: Array.isArray(list) ? list : [],
      });

      setMeta({
        total: typeof m.total === "number" ? m.total : null,
        totalPages: typeof m.totalPages === "number" ? m.totalPages : null,
        hasNextPage: typeof m.hasNextPage === "boolean" ? m.hasNextPage : null,
        hasPrevPage: typeof m.hasPrevPage === "boolean" ? m.hasPrevPage : null,
      });

      lastToastMsgRef.current = "";
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load products. Check your API route.";

      dispatch({ type: PRODUCT_ACTIONS.FETCH_SUCCESS, payload: [] });
      dispatch({ type: PRODUCT_ACTIONS.FETCH_ERROR, payload: msg });

      setMeta({
        total: null,
        totalPages: null,
        hasNextPage: null,
        hasPrevPage: null,
      });

      if (toast?.push && lastToastMsgRef.current !== msg) {
        lastToastMsgRef.current = msg;
        toast.push({
          title: "Couldn’t load products",
          description: msg,
          variant: "error",
        });
      }
    }
  }

  useEffect(() => {
    fetchProducts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <Page>
      <Inner>
        <Hero
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Badge>KO • SHOP</Badge>
          <Title>
            ⚡ <span>GEAR UP</span> — HIT HARDER, TRAIN SMARTER.
          </Title>
          <Sub>
            Premium boxing equipment. Clean design. Real products. Built for
            fighters.
          </Sub>
          <Ctas>
            <Pill as="a" href="#grid">
              Shop Now
            </Pill>
            <Ghost as={Link} to="/">
              Back Home
            </Ghost>
          </Ctas>
        </Hero>

        <TopBar>
          <TopLeft>
            <SectionTitle id="grid">Featured Equipment</SectionTitle>
            <Hint>
              {meta.total !== null ? (
                <>
                  Showing page <b>{page}</b> • Total <b>{meta.total}</b>
                </>
              ) : (
                <>
                  Showing page <b>{page}</b>
                </>
              )}
            </Hint>
          </TopLeft>

          <Pager>
            <NavBtn
              type="button"
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ← Prev
            </NavBtn>

            <PageChip>
              Page {page}
              {meta.totalPages ? ` / ${meta.totalPages}` : ""}
            </PageChip>

            <NavBtn
              type="button"
              disabled={!canNext || loading}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              Next →
            </NavBtn>
          </Pager>
        </TopBar>

        {error ? (
          <ErrorBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <b>Couldn’t load products.</b>
            <div style={{ marginTop: 8, opacity: 0.9 }}>{error}</div>
            <RetryBtn
              type="button"
              onClick={() => fetchProducts(page)}
              disabled={loading}
            >
              Retry
            </RetryBtn>
          </ErrorBox>
        ) : null}

        <Grid>
          {loading
            ? Array.from({ length: LIMIT }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : items.map((p) => (
                <ProductCard
                  key={p?._id || p?.id}
                  p={p}
                  // ✅ ADDED: pass dispatch + toast into card
                  onAddToCart={(payload) => {
                    cartDispatch({ type: CART_ACTIONS.ADD_ITEM, payload });
                    toast?.push?.({
                      title: "Added to cart",
                      description: "Item added ✅",
                      variant: "success",
                    });
                  }}
                />
              ))}
        </Grid>

        <BottomPager>
          <NavBtn
            type="button"
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </NavBtn>

          <NavBtn
            type="button"
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </NavBtn>
        </BottomPager>
      </Inner>
    </Page>
  );
}

/* ------------------------- CARD ------------------------- */

// ✅ CHANGED: accept onAddToCart prop
function ProductCard({ p, onAddToCart }) {
  const id = p?._id || p?.id;
  const title = p?.title || p?.name || "Untitled Product";
  const desc = p?.description || p?.shortDescription || "No description yet.";
  const price = typeof p?.price === "number" ? p.price : Number(p?.price) || 0;

  const img =
    p?.imageUrl ||
    p?.image ||
    (Array.isArray(p?.images) && p.images[0]) ||
    "";
  
  const [busy, setBusy] = useState(false);

async function safeAction(fn) {
  if (busy) return;
  setBusy(true);
  try {
    await fn();
  } finally {
    setBusy(false);
  }
}

  // ✅ ADDED: cart payload builder (keeps it stable + safe)
  function buildCartPayload() {
    // size/color are optional; for now no picker on card, so keep empty.
    const size = "";
    const color = "";

    // This makes duplicates merge correctly:
    const cartItemId = `${id}::${size || "no-size"}::${color || "no-color"}`;

    return {
      cartItemId,
      productId: id,
      title,
      description: desc,
      price,
      image: img,
      qty: 1,
      size,
      color,
      addedAt: new Date().toISOString(),
    };
  }

  return (
    <Card
      as={motion.article}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.18 }}
    >
      <ImgWrap>
        {img ? (
          <Img src={img} alt={title} loading="lazy" />
        ) : (
          <ImgFallback>No Image</ImgFallback>
        )}
        {Number.isFinite(price) ? <PriceTag>${Number(price).toFixed(2)}</PriceTag> : null}
      </ImgWrap>

      <CardBody>
        <CardTitle title={title}>{title}</CardTitle>
        <CardDesc>{desc}</CardDesc>

        {/* ✅ CHANGED: now includes Add To Cart */}
        <CardRow>
          <PrimaryBtn to={`/products/${id}`}>View Details</PrimaryBtn>

          <AddBtn
            type="button"
              onClick={() => safeAction(() => onAddToCart?.(buildCartPayload()))}
            aria-label="Add to cart"
            disabled={busy}
          >
          {busy ? "Adding..." : "Add to Cart"}
          </AddBtn>
        </CardRow>
      </CardBody>
    </Card>
  );
}

/* ------------------------- SKELETON ------------------------- */

function SkeletonCard() {
  return (
    <Card aria-hidden="true">
      <ImgWrap>
        <SkelBlock />
      </ImgWrap>
      <CardBody>
        <SkelLine style={{ width: "70%" }} />
        <SkelLine style={{ width: "92%" }} />
        <SkelLine style={{ width: "84%" }} />
        <SkelBtnRow>
          <SkelBtn />
          <SkelBtn />
        </SkelBtnRow>
      </CardBody>
    </Card>
  );
}

/* ------------------------- STYLES ------------------------- */
/* (everything you already had stays the same, we only add AddBtn) */

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

const Hero = styled(motion.header)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.12);
  padding: 26px 22px;
  margin-bottom: 18px;
  backdrop-filter: blur(18px);
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  font-weight: 800;
  letter-spacing: 0.16em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Title = styled.h1`
  margin: 12px 0 8px;
  font-size: clamp(26px, 3.2vw, 44px);
  line-height: 1.05;
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

const Ctas = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const Pill = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(90,56,37,0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 900;
  text-decoration: none;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  border: 1px solid rgba(255,255,255,0.12);
  transition: transform 0.15s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const Ghost = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.28);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 800;
  text-decoration: none;
  border: 1px solid rgba(255,255,255,0.14);
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.38);
  }
`;

const TopBar = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin: 18px 0 12px;
  flex-wrap: wrap;
`;

const TopLeft = styled.div`
  display: grid;
  gap: 4px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.02em;
`;

const Hint = styled.div`
  font-size: 13px;
  opacity: 0.85;
  color: ${({ theme }) => theme.colors.ivory};

  b {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Pager = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PageChip = styled.div`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 800;
  font-size: 13px;
`;

const NavBtn = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 10px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article`
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
  backdrop-filter: blur(14px);
`;

const ImgWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: rgba(0,0,0,0.45);
  border-bottom: 1px solid rgba(255,255,255,0.10);
  display: grid;
  place-items: center;
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ImgFallback = styled.div`
  font-weight: 900;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.85;
`;

const PriceTag = styled.div`
  position: absolute;
  left: 10px;
  top: 10px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.12);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  font-size: 12px;
`;

const CardBody = styled.div`
  padding: 14px 14px 16px;
`;

const CardTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 15px;
  letter-spacing: 0.01em;
`;

const CardDesc = styled.p`
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.45;
  opacity: 0.88;
  color: ${({ theme }) => theme.colors.ivory};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 54px;
`;

const CardRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const PrimaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  text-decoration: none;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.black};
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(90,56,37,0.95));
  border: 1px solid rgba(255,255,255,0.12);
  transition: transform 0.15s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

// ✅ ADDED: Add-to-cart button style
const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ivory};
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.14);
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.55);
  }
`;

const BottomPager = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
`;

const ErrorBox = styled(motion.div)`
  margin: 12px 0 6px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(90,56,37,0.22);
  border: 1px solid rgba(214,182,159,0.22);
  color: ${({ theme }) => theme.colors.ivory};
`;

const RetryBtn = styled.button`
  margin-top: 12px;
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

const SkelBlock = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04),
    rgba(255,255,255,0.10),
    rgba(255,255,255,0.04)
  );
  animation: shimmer 1.1s infinite linear;
  background-size: 200% 100%;

  @keyframes shimmer {
    0% { background-position: 0% 0; }
    100% { background-position: 200% 0; }
  }
`;

const SkelLine = styled.div`
  height: 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  margin: 10px 0;
  background: rgba(255,255,255,0.08);
`;

const SkelBtnRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
`;

const SkelBtn = styled.div`
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255,255,255,0.07);
`;
