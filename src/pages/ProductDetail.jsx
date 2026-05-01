// src/pages/ProductDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useToast } from "../components/Toast";
import { createProductCheckoutSession } from "../lib/apiClient";

// ✅ CHANGED: axios import (named export to avoid default import errors)
import axiosInstance from "../../utils/axiosInstance";

// ✅ ADDED: redux hooks + cart actions
import { useDispatch } from "react-redux";
import { CART_ACTIONS } from "../reducers/cart/cartActionTypes";

export default function ProductDetail() {
  const { id } = useParams();
  const toast = useToast();

  // ✅ ADDED: redux dispatch
  const dispatch = useDispatch();

  const [product, setProduct] = useState(null);

  const [activeImg, setActiveImg] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ ADDED: Buy Now loading (spinner + fade)
  const [buyingNow, setBuyingNow] = useState(false);

  const [busy, setBusy] = useState(false);

    async function safeAction(fn) {
  if (busy) return;
  setBusy(true);
  try {
    await fn();
  } finally {
    setBusy(false);
  }
  };

  const images = useMemo(() => {
    const list =
      product?.images ||
      (product?.imageUrl ? [product.imageUrl] : []) ||
      (product?.image ? [product.image] : []);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }, [product]);

  const sizes = useMemo(() => {
    const list = product?.sizes || product?.variants?.sizes || [];
    return Array.isArray(list) ? list : [];
  }, [product]);

  const colors = useMemo(() => {
    const list = product?.colors || product?.variants?.colors || [];
    return Array.isArray(list) ? list : [];
  }, [product]);

  const price = useMemo(() => {
    const v = product?.price;
    // ✅ CHANGED: allow string price too (safer)
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, [product]);

  async function fetchProduct() {
    setLoading(true);
    setErr("");

    // ✅ Tiny guard: prevent pointless request
    if (!id || String(id).length < 10) {
      setErr("Invalid product Link...");
      setProduct(null);
      setLoading(false);
      return;
    }

    try {
      // ✅ CHANGED: keep your route, but make it consistent with your API style.
      // If your backend is /api/v1/products/:id, change this ONE line:
      // const { data } = await axiosInstance.get(`/api/v1/products/${id}`);
      const { data } = await axiosInstance.get(`/products/${id}`);

      const p = data?.product ?? data?.data ?? data;

      if (!p || (!p?._id && !p?.id)) {
        setProduct(null);
        setErr("Product not found.");
      } else {
        setProduct(p);

        const firstImg =
          p?.imageUrl ||
          p?.image ||
          (Array.isArray(p?.images) && p.images[0]) ||
          "";
        setActiveImg(firstImg || "");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load product.";
      setErr(msg);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!product) return;
    if (!size && sizes.length) setSize(String(sizes[0]));
    if (!color && colors.length) setColor(String(colors[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, sizes.length, colors.length]);

  function clampQty(n) {
    const safe = Number.isFinite(n) ? n : 1;
    return Math.max(1, Math.min(99, safe));
  }

  // ✅ CHANGED: keep toast helpers
  function toastSuccess(title, description = "") {
    toast?.push?.({ variant: "success", title, description });
  }

  function toastError(title, description = "") {
    toast?.push?.({ variant: "error", title, description });
  }

  // ✅ CHANGED: addToCart now uses Redux (no localStorage functions)
  function addToCart() {
    if (!product) return toastError("Product not ready.");
    if (buyingNow) return; // prevent double actions during checkout

    if (sizes.length && !size) return toastError("Select a size.");
    if (colors.length && !color) return toastError("Select a color.");

    const pid = product?._id || product?.id;
    const title = product?.title || product?.name || "Untitled Product";
    const desc = product?.description || product?.shortDescription || "";
    const img =
      activeImg ||
      product?.imageUrl ||
      product?.image ||
      (Array.isArray(product?.images) && product.images[0]) ||
      "";

    const safeQty = clampQty(Number(qty));

    // ✅ CHANGED: match the cart reducer’s item shape used everywhere
    const payload = {
      cartItemId: `${pid}::${size || "no-size"}::${color || "no-color"}`, // stable merge key
      productId: pid,
      title,
      description: desc,
      image: img,
      price: price ?? 0,
      size: size || "",
      color: color || "",
      qty: safeQty,
      brand: "knockoutcodes",
      updatedAt: new Date().toISOString(),
      addedAt: new Date().toISOString(),
    };

    // ✅ ADDED: single dispatch (your reducer handles merge + persist)
    dispatch({ type: CART_ACTIONS.ADD_ITEM, payload });

    toastSuccess("Added to cart ✅", "Go to cart when you’re ready.");
  }

  // ✅ UPDATED: Buy Now shows spinner + fades while redirecting
  async function buyNow() {
    if (!product) return toastError("Product not ready.");
    if (buyingNow) return;

    // optional: enforce variant selection for consistency
    if (sizes.length && !size) return toastError("Select a size.");
    if (colors.length && !color) return toastError("Select a color.");

    setBuyingNow(true);

    try {
      const pid = product?._id || product?.id;
      const safeQty = clampQty(Number(qty));

      const data = await createProductCheckoutSession([
        { productId: pid, qty: safeQty },
      ]);

      // keep UI in "loading" state while redirect happens
      window.location.href = data.url;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Checkout failed. Please try again.";

      toastError("Checkout failed", msg);
      setBuyingNow(false);
    }
  }

  const title = product?.title || product?.name || "Product";
  const desc = product?.description || product?.shortDescription || "";
  const stock = typeof product?.stock === "number" ? product.stock : null;
  const sku = product?.sku || null;

  const outOfStock = stock === 0;

  return (
    <Page>
      <Inner>
        <TopNav
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Crumb>
            <BackLink to="/products">← Back to Shop</BackLink>
            <Dot />
            <Small>KO • Product</Small>
          </Crumb>

          <RightNav>
            <CartLink to="/cart">
              Cart <CartDot />
            </CartLink>
          </RightNav>

          <Hook>
            ⚡ <b>1–3s HOOK:</b> This isn’t “gear” — it’s your{" "}
            <span>advantage</span>.
          </Hook>
        </TopNav>

        {loading ? (
          <Shell>
            <Media>
              <SkelBig />
              <ThumbRow>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkelThumb key={i} />
                ))}
              </ThumbRow>
            </Media>
            <Info>
              <SkelLine style={{ width: "70%" }} />
              <SkelLine style={{ width: "95%" }} />
              <SkelLine style={{ width: "86%" }} />
              <SkelLine style={{ width: "64%" }} />
              <SkelBtn />
            </Info>
          </Shell>
        ) : err ? (
          <ErrorBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <b>Couldn’t load product.</b>
            <div style={{ marginTop: 8, opacity: 0.9 }}>{err}</div>
            <ErrorRow>
              <RetryBtn type="button" onClick={fetchProduct}>
                Retry
              </RetryBtn>
              <GhostLink to="/products">Go to Shop</GhostLink>
            </ErrorRow>
          </ErrorBox>
        ) : !product ? (
          <ErrorBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <b>Product not found.</b>
            <div style={{ marginTop: 8, opacity: 0.9 }}>
              It may have been removed or the link is wrong.
            </div>
            <ErrorRow>
              <GhostLink to="/products">Go to Shop</GhostLink>
            </ErrorRow>
          </ErrorBox>
        ) : (
          <Shell
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Media>
              <BigImageWrap>
                {activeImg ? (
                  <BigImg src={activeImg} alt={title} />
                ) : (
                  <ImgFallback>No Image</ImgFallback>
                )}

                <MetaPills>
                  {sku ? <Pill>SKU: {sku}</Pill> : null}
                  {stock !== null ? (
                    <Pill>
                      {stock > 0 ? `In Stock: ${stock}` : "Out of Stock"}
                    </Pill>
                  ) : (
                    <Pill>Quality Checked</Pill>
                  )}
                </MetaPills>
              </BigImageWrap>

              <ThumbRow>
                {(images.length ? images : [""]).slice(0, 6).map((src, i) => {
                  const isActive = src && src === activeImg;
                  return (
                    <ThumbBtn
                      key={`${src}_${i}`}
                      type="button"
                      $active={isActive}
                      onClick={() => src && setActiveImg(src)}
                      aria-label={`Select image ${i + 1}`}
                      disabled={!src}
                    >
                      {src ? (
                        <ThumbImg src={src} alt="" />
                      ) : (
                        <ThumbFallback>—</ThumbFallback>
                      )}
                    </ThumbBtn>
                  );
                })}
              </ThumbRow>
            </Media>

            <Info>
              <TitleRow>
                <H1 title={title}>{title}</H1>
                {price !== null ? (
                  <Price>${price.toFixed(2)}</Price>
                ) : (
                  <Price>—</Price>
                )}
              </TitleRow>

              <Desc>{desc || "No description yet — this will be updated soon."}</Desc>

              <Divider />

              <Selectors>
                <SelectGroup>
                  <Label>Size</Label>
                  {sizes.length ? (
                    <Chips>
                      {sizes.map((s) => (
                        <ChipBtn
                          key={String(s)}
                          type="button"
                          $active={String(size) === String(s)}
                          onClick={() => setSize(String(s))}
                          disabled={buyingNow}
                        >
                          {String(s)}
                        </ChipBtn>
                      ))}
                    </Chips>
                  ) : (
                    <Muted>One-size / no size options</Muted>
                  )}
                </SelectGroup>

                <SelectGroup>
                  <Label>Color</Label>
                  {colors.length ? (
                    <Chips>
                      {colors.map((c) => (
                        <ChipBtn
                          key={String(c)}
                          type="button"
                          $active={String(color) === String(c)}
                          onClick={() => setColor(String(c))}
                          disabled={buyingNow}
                        >
                          {String(c)}
                        </ChipBtn>
                      ))}
                    </Chips>
                  ) : (
                    <Muted>No color variants</Muted>
                  )}
                </SelectGroup>

                <SelectGroup>
                  <Label>Quantity</Label>
                  <QtyRow>
                    <QtyBtn
                      type="button"
                      onClick={() => setQty((q) => clampQty(q - 1))}
                      disabled={buyingNow}
                    >
                      −
                    </QtyBtn>
                    <QtyValue
                      value={qty}
                      onChange={(e) => setQty(clampQty(Number(e.target.value)))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label="Quantity"
                      disabled={buyingNow}
                    />
                    <QtyBtn
                      type="button"
                      onClick={() => setQty((q) => clampQty(q + 1))}
                      disabled={buyingNow}
                    >
                      +
                    </QtyBtn>
                  </QtyRow>
                </SelectGroup>
              </Selectors>

              <Actions>
                <BuyBtn
                  type="button"
                  onClick={() => safeAction(addToCart)}
                  disabled={outOfStock || buyingNow || busy }
                >
                  {outOfStock ? "Out of Stock" :  busy ? "Adding..." : "Add To Cart"}
                </BuyBtn>

                <BuyNowBtn
                  type="button"
                  onClick={buyNow}
                  disabled={outOfStock || buyingNow}
                  $loading={buyingNow}
                  aria-busy={buyingNow}
                >
                  {outOfStock ? (
                    "Out of Stock"
                  ) : buyingNow ? (
                    <>
                      <Spin />
                      Redirecting…
                    </>
                  ) : (
                    "Buy Now"
                  )}
                </BuyNowBtn>

                <GhostBtn as={Link} to="/cart">
                  View Cart
                </GhostBtn>
              </Actions>

              <Note>
                Pro tip: if you train 3–5 days/week, upgrade your gear first.
                Technique + quality = confidence.
              </Note>
            </Info>
          </Shell>
        )}
      </Inner>
    </Page>
  );
}

/* ------------------------- STYLES (unchanged) ------------------------- */
/* Keep all your styled-components exactly as you already have them below */

/* ------------------------- STYLES (your theme colors) ------------------------- */

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 18px 90px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(circle at 18% 8%, rgba(214,182,159,0.20) 0%, rgba(0,0,0,0) 45%),
    radial-gradient(circle at 82% 16%, rgba(90,56,37,0.30) 0%, rgba(0,0,0,0) 46%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.darkBrown} 0%, #000 86%);
`;

const Inner = styled.section`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const TopNav = styled(motion.div)`
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
`;

const Crumb = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const RightNav = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const CartLink = styled(Link)`
  color: ${({ theme }) => theme.colors.ivory};
  text-decoration: none;
  font-weight: 1000;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.14);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.5);
  }
`;

const CartDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const BackLink = styled(Link)`
  color: ${({ theme }) => theme.colors.ivory};
  text-decoration: none;
  font-weight: 900;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.14);
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.5);
  }
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const Small = styled.div`
  font-weight: 900;
  letter-spacing: 0.18em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
`;

const Hook = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.12);
  padding: 14px 16px;
  backdrop-filter: blur(16px);
  color: ${({ theme }) => theme.colors.ivory};

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Shell = styled(motion.section)`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 16px;
  margin-top: 12px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Media = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(16px);
  padding: 14px;
`;

const BigImageWrap = styled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.12);
  aspect-ratio: 16 / 10;
  display: grid;
  place-items: center;
`;

const BigImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ImgFallback = styled.div`
  font-weight: 900;
  letter-spacing: 0.12em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.85;
`;

const MetaPills = styled.div`
  position: absolute;
  left: 10px;
  top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Pill = styled.div`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.65);
  border: 1px solid rgba(255,255,255,0.12);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
  font-size: 12px;
`;

const ThumbRow = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;

  @media (max-width: 700px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const ThumbBtn = styled.button`
  padding: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid
    ${({ $active }) => ($active ? "rgba(214,182,159,0.65)" : "rgba(255,255,255,0.12)")};
  background: rgba(0,0,0,0.35);
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  transition: transform 0.15s ease, border-color 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(214,182,159,0.55);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ThumbFallback = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.75;
  font-weight: 900;
`;

const Info = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(16px);
  padding: 18px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

const H1 = styled.h1`
  margin: 0;
  font-size: clamp(22px, 2.4vw, 34px);
  line-height: 1.05;
  letter-spacing: -0.02em;
`;

const Price = styled.div`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.12);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 1000;
  white-space: nowrap;
`;

const Desc = styled.p`
  margin: 10px 0 0;
  opacity: 0.92;
  color: ${({ theme }) => theme.colors.ivory};
  line-height: 1.55;
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.12);
  margin: 14px 0;
`;

const Selectors = styled.div`
  display: grid;
  gap: 14px;
`;

const SelectGroup = styled.div`
  display: grid;
  gap: 8px;
`;

const Label = styled.div`
  font-weight: 900;
  letter-spacing: 0.06em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
`;

const Chips = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ChipBtn = styled.button`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ $active }) => ($active ? "rgba(214,182,159,0.65)" : "rgba(255,255,255,0.14)")};
  background: ${({ $active }) => ($active ? "rgba(214,182,159,0.18)" : "rgba(0,0,0,0.35)")};
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(214,182,159,0.55);
  }
`;

const Muted = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.75;
  font-size: 13px;
`;

const QtyRow = styled.div`
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: 10px;
  align-items: center;
`;

const QtyBtn = styled.button`
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 18px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.55);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const QtyValue = styled.input`
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.30);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 900;
  padding: 0 12px;
  outline: none;

  &:focus {
    border-color: rgba(214,182,159,0.55);
    box-shadow: 0 0 0 4px rgba(214,182,159,0.10);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const BuyBtn = styled.button`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(90,56,37,0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 1000;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// ✅ NEW: Buy Now button with fade + inline spinner
const BuyNowBtn = styled(BuyBtn)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: ${({ $loading }) => ($loading ? 0.72 : 1)};
`;

const Spin = styled.span`
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid rgba(0, 0, 0, 0.25);
  border-top-color: rgba(0, 0, 0, 0.85);
  animation: spin 0.7s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const GhostBtn = styled(Link)`
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, background 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    background: rgba(0,0,0,0.55);
  }
`;

const Note = styled.div`
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.25);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
  line-height: 1.5;
`;

const ErrorBox = styled(motion.div)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(90,56,37,0.22);
  border: 1px solid rgba(214,182,159,0.22);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 16px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const ErrorRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

const RetryBtn = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  cursor: pointer;

  &:hover {
    background: rgba(0,0,0,0.55);
  }
`;

const GhostLink = styled(Link)`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.25);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  text-decoration: none;

  &:hover {
    background: rgba(0,0,0,0.45);
  }
`;

/* Skeletons */
const SkelBig = styled.div`
  width: 100%;
  aspect-ratio: 16/10;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04),
    rgba(255,255,255,0.10),
    rgba(255,255,255,0.04)
  );
  background-size: 200% 100%;
  animation: shimmer 1.1s infinite linear;

  @keyframes shimmer {
    0% {
      background-position: 0% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

const SkelThumb = styled.div`
  aspect-ratio: 1/1;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
`;

const SkelLine = styled.div`
  height: 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255,255,255,0.08);
  margin: 10px 0;
`;

const SkelBtn = styled.div`
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255,255,255,0.07);
  margin-top: 14px;
`;
