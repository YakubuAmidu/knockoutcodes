// src/pages/ProductDetail.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import ReviewForm from "../components/ReviewForm";

import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";
import { createProductCheckoutSession } from "../lib/apiClient";
import { CART_ACTIONS } from "../reducers/cart/cartActionTypes";

function formatMoney(value) {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
}

function getRatingAverage(product) {
  return Number(
    product?.ratingAverage ??
      product?.averageRating ??
      product?.avgRating ??
      product?.rating ??
      0
  );
}

function getReviewCount(product) {
  return Number(
    product?.ratingCount ??
      product?.reviewCount ??
      product?.reviewsCount ??
      product?.totalReviews ??
      product?.numReviews ??
      0
  );
}

function renderStars(ratingAverage) {
  const rating = Number(ratingAverage) || 0;
  const fullStars = Math.max(0, Math.min(5, Math.round(rating)));

  return Array.from({ length: 5 }, (_, index) =>
    index + 1 <= fullStars ? "★" : "☆"
  ).join("");
}

function clampQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(99, Math.floor(n)));
}

function getProductId(product) {
  return product?._id || product?.id || "";
}

function getImages(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const fallback = product?.imageUrl || product?.image || "";
  return [...images, fallback].filter(Boolean);
}

export default function ProductDetail() {
  const { idOrSlug, id, slug } = useParams();
const productIdOrSlug = idOrSlug || id || slug;

  const toast = useToast();
  const dispatch = useDispatch();

  const [product, setProduct] = useState(null);
  const [activeImg, setActiveImg] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

  const ratingAverage = getRatingAverage(product);
const reviewCount = getReviewCount(product);

const isBestSeller =
  Boolean(product?.isFeatured) || (ratingAverage >= 4.7 && reviewCount >= 20);

  const images = useMemo(() => getImages(product), [product]);

  const sizes = useMemo(() => {
    const list = product?.sizes || product?.variants?.sizes || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }, [product]);

  const colors = useMemo(() => {
    const list = product?.colors || product?.variants?.colors || [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }, [product]);

  const price = Number(product?.price || 0);
  const compareAtPrice = Number(product?.compareAtPrice || 0);
  const hasDiscount = compareAtPrice > price;
  const stock = Number(product?.stock || 0);
  const outOfStock = stock <= 0;
  const productId = getProductId(product);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setErr("");

    if (!productIdOrSlug) {
      setErr("Invalid product link.");
      setProduct(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await axiosInstance.get(`/products/${productIdOrSlug}`);
      const nextProduct = data?.product || data?.data || data;

      if (!nextProduct || !getProductId(nextProduct)) {
        throw new Error("Product not found.");
      }

      setProduct(nextProduct);

      const firstImg = getImages(nextProduct)[0] || "";
      setActiveImg(firstImg);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load product.";

      setErr(msg);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productIdOrSlug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (!product) return;
    if (!size && sizes.length) setSize(String(sizes[0]));
    if (!color && colors.length) setColor(String(colors[0]));
  }, [product, sizes, colors, size, color]);

  function pushToast(payload) {
    toast?.push?.(payload);
  }

  function buildCartPayload() {
    return {
      cartItemId: `${productId}::${size || "no-size"}::${color || "no-color"}`,
      productId,
      title: product?.title || "Product",
      description: product?.shortDescription || product?.description || "",
      image: activeImg || images[0] || "",
      price,
      size: size || "",
      color: color || "",
      qty: clampQty(qty),
      brand: product?.brand || "knockoutcodes",
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function validateSelection() {
    if (!product) {
      pushToast({
        title: "Product not ready",
        description: "Please wait for the product to load.",
        variant: "error",
      });
      return false;
    }

    if (!productId) {
      pushToast({
        title: "Product error",
        description: "This product is missing an ID.",
        variant: "error",
      });
      return false;
    }

    if (outOfStock) {
      pushToast({
        title: "Out of stock",
        description: "This product is not available right now.",
        variant: "warning",
      });
      return false;
    }

    if (sizes.length && !size) {
      pushToast({
        title: "Select a size",
        description: "Choose your size before adding this product.",
        variant: "warning",
      });
      return false;
    }

    if (colors.length && !color) {
      pushToast({
        title: "Select a color",
        description: "Choose your color before adding this product.",
        variant: "warning",
      });
      return false;
    }

    return true;
  }

  function addToCart() {
    if (busy || buyingNow) return;
    if (!validateSelection()) return;

    setBusy(true);

    dispatch({
      type: CART_ACTIONS.ADD_ITEM,
      payload: buildCartPayload(),
    });

    pushToast({
      title: "Added to cart",
      description: `${product?.title || "Product"} is ready in your cart.`,
      variant: "success",
    });

    setBusy(false);
  }

  async function buyNow() {
    if (buyingNow) return;
    if (!validateSelection()) return;

    try {
      setBuyingNow(true);

      const data = await createProductCheckoutSession([
        {
          productId,
          qty: clampQty(qty),
        },
      ]);

      if (!data?.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Checkout failed. Please try again.";

      pushToast({
        title: "Checkout failed",
        description: msg,
        variant: "error",
      });

      setBuyingNow(false);
    }
  }

  const title = product?.title || "Premium Product";
  const description =
    product?.description ||
    product?.shortDescription ||
    "This premium KnockoutCodes product is built for training, confidence, and performance.";

  return (
    <Page>
      <Inner>
        <TopNav
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Crumbs>
            <BackLink to="/products">← Back To Shop</BackLink>
            <Dot />
            <Small>🥊 KNOCKOUTCODES PRODUCT</Small>
          </Crumbs>

          <CartLink to="/cart">View Cart</CartLink>
        </TopNav>

        {loading ? (
          <Shell>
            <Media>
              <SkelBig />
              <ThumbRow>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkelThumb key={i} />
                ))}
              </ThumbRow>
            </Media>

            <Info>
              <SkelLine style={{ width: "70%" }} />
              <SkelLine style={{ width: "95%" }} />
              <SkelLine style={{ width: "82%" }} />
              <SkelLine style={{ width: "60%" }} />
              <SkelBtn />
            </Info>
          </Shell>
        ) : err ? (
          <ErrorBox>
            <b>Couldn’t load product.</b>
            <p>{err}</p>
            <ErrorActions>
              <RetryBtn type="button" onClick={fetchProduct}>
                Retry
              </RetryBtn>
              <GhostLink to="/products">Go To Shop</GhostLink>
            </ErrorActions>
          </ErrorBox>
        ) : (
          <Shell
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Media>
              <ImageStage>
                {activeImg ? (
                  <BigImg src={activeImg} alt={title} />
                ) : (
                  <ImageFallback>No Image</ImageFallback>
                )}

                <ImageBadges>
  {isBestSeller ? <Pill>Best Seller</Pill> : null}

  <Pill>{outOfStock ? "Out Of Stock" : `${stock} In Stock`}</Pill>
</ImageBadges>
              </ImageStage>

              <ThumbRow>
                {(images.length ? images : [""]).slice(0, 6).map((src, index) => (
                  <ThumbBtn
                    key={`${src}_${index}`}
                    type="button"
                    $active={src === activeImg}
                    onClick={() => src && setActiveImg(src)}
                    disabled={!src}
                  >
                    {src ? <ThumbImg src={src} alt="" /> : <ThumbFallback>—</ThumbFallback>}
                  </ThumbBtn>
                ))}
              </ThumbRow>
            </Media>

            <Info>
              <HookBadge>1–2 SECOND HOOK</HookBadge>

              <Title>
                This is not just gear. <span>It is your training advantage.</span>
              </Title>

                  <ProductName>{title}</ProductName>

<RatingRow>
  <Stars>{renderStars(ratingAverage)}</Stars>

  <RatingText>
    {ratingAverage > 0 ? `${ratingAverage.toFixed(1)}/5` : "New Product"}
    {reviewCount > 0
      ? ` • ${reviewCount} reviews`
      : " • No reviews yet"}
  </RatingText>
</RatingRow>

              <PriceRow>
                <Price>{formatMoney(price)}</Price>
                {hasDiscount ? <Compare>{formatMoney(compareAtPrice)}</Compare> : null}
              </PriceRow>

              <Description>{description}</Description>

              <DetailGrid>
                <DetailCard>
                  <DetailLabel>Brand</DetailLabel>
                  <DetailValue>{product?.brand || "KnockoutCodes"}</DetailValue>
                </DetailCard>

                <DetailCard>
                  <DetailLabel>Category</DetailLabel>
                  <DetailValue>{product?.category || "Premium Gear"}</DetailValue>
                </DetailCard>

                <DetailCard>
                  <DetailLabel>SKU</DetailLabel>
                  <DetailValue>{product?.sku || "Not listed"}</DetailValue>
                </DetailCard>

                <DetailCard>
                  <DetailLabel>Status</DetailLabel>
                  <DetailValue>{outOfStock ? "Sold Out" : "Ready To Ship"}</DetailValue>
                    </DetailCard>
                    
                   <DetailCard>
  <DetailLabel>Rating</DetailLabel>
  <DetailValue>
    {ratingAverage > 0 ? `${ratingAverage.toFixed(1)} / 5` : "New"}
  </DetailValue>
</DetailCard>

<DetailCard>
  <DetailLabel>Reviews</DetailLabel>
  <DetailValue>{reviewCount}</DetailValue>
</DetailCard>
              </DetailGrid>

              <Divider />

              <OptionBlock>
                <Label>Choose Size</Label>
                {sizes.length ? (
                  <ChipRow>
                    {sizes.map((item) => (
                      <ChipBtn
                        key={String(item)}
                        type="button"
                        $active={String(size) === String(item)}
                        onClick={() => setSize(String(item))}
                        disabled={buyingNow}
                      >
                        {String(item)}
                      </ChipBtn>
                    ))}
                  </ChipRow>
                ) : (
                  <Muted>No size selection required.</Muted>
                )}
              </OptionBlock>

              <OptionBlock>
                <Label>Choose Color</Label>
                {colors.length ? (
                  <ChipRow>
                    {colors.map((item) => (
                      <ChipBtn
                        key={String(item)}
                        type="button"
                        $active={String(color) === String(item)}
                        onClick={() => setColor(String(item))}
                        disabled={buyingNow}
                      >
                        {String(item)}
                      </ChipBtn>
                    ))}
                  </ChipRow>
                ) : (
                  <Muted>No color selection required.</Muted>
                )}
              </OptionBlock>

              <OptionBlock>
                <Label>Quantity</Label>
                <QtyRow>
                  <QtyBtn
                    type="button"
                    onClick={() => setQty((q) => clampQty(q - 1))}
                    disabled={buyingNow || qty <= 1}
                  >
                    −
                  </QtyBtn>

                  <QtyInput
                    value={qty}
                    onChange={(e) => setQty(clampQty(e.target.value))}
                    inputMode="numeric"
                    pattern="[0-9]*"
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
              </OptionBlock>

              {Array.isArray(product?.tags) && product.tags.length ? (
                <TagRow>
                  {product.tags.slice(0, 8).map((tag) => (
                    <Tag key={tag}>#{tag}</Tag>
                  ))}
                </TagRow>
              ) : null}

              <Actions>
                <PrimaryBtn
                  type="button"
                  onClick={addToCart}
                  disabled={outOfStock || busy || buyingNow}
                >
                  {outOfStock ? "Out Of Stock" : busy ? "Adding..." : "Add To Cart"}
                </PrimaryBtn>

                <BuyNowBtn
                  type="button"
                  onClick={buyNow}
                  disabled={outOfStock || buyingNow}
                >
                  {buyingNow ? (
                    <>
                      <Spin />
                      Redirecting…
                    </>
                  ) : outOfStock ? (
                    "Out Of Stock"
                  ) : (
                    "Buy Now"
                  )}
                </BuyNowBtn>

                <GhostButton as={Link} to="/cart">
                  View Cart
                </GhostButton>
              </Actions>

              <TrustNote>
                The cart shows your estimate. Checkout verifies the real product
                price from the backend before Stripe payment.
                  </TrustNote>
                  
                  <ReviewSection>
  <ReviewHeader>
    <ReviewEyebrow>Verified Product Review</ReviewEyebrow>
    <ReviewTitle>Purchased this product? Share your experience.</ReviewTitle>
    <ReviewText>
      Only logged-in customers who purchased this product should be allowed to
      leave a review. The backend must verify the user, purchase record, and
      prevent duplicate reviews.
    </ReviewText>
  </ReviewHeader>

  <ReviewForm
    type="product"
    productId={productId}
    productTitle={title}
    onSuccess={fetchProduct}
  />
</ReviewSection>
            </Info>
          </Shell>
        )}
      </Inner>
    </Page>
  );
}

/* ------------------------- styles ------------------------- */

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 18px 90px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(circle at 18% 8%, rgba(214, 182, 159, 0.22) 0%, rgba(0, 0, 0, 0) 42%),
    radial-gradient(circle at 82% 16%, rgba(90, 56, 37, 0.34) 0%, rgba(0, 0, 0, 0) 46%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.darkBrown} 0%, #000 86%);
`;

const Inner = styled.section`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const TopNav = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const Crumbs = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const BackLink = styled(Link)`
  color: ${({ theme }) => theme.colors.ivory};
  text-decoration: none;
  font-weight: 950;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.14);
`;

const CartLink = styled(Link)`
  color: ${({ theme }) => theme.colors.black};
  text-decoration: none;
  font-weight: 950;
  padding: 11px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(90deg, rgba(214, 182, 159, 0.95), rgba(90, 56, 37, 0.95));
`;

const Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
`;

const Small = styled.div`
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.16em;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Shell = styled(motion.section)`
  display: grid;
  grid-template-columns: 1.08fr 0.92fr;
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Media = styled.section`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
`;

const ImageStage = styled.div`
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const BigImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ImageFallback = styled.div`
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.8;
`;

const ImageBadges = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const Pill = styled.div`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.64);
  color: ${({ theme }) => theme.colors.lightBrown};
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 950;
`;

const ThumbRow = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 700px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const ThumbBtn = styled.button`
  padding: 0;
  aspect-ratio: 1 / 1;
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214, 182, 159, 0.72)" : "rgba(255, 255, 255, 0.12)"};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ThumbFallback = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.75;
  font-weight: 950;
`;

const Info = styled.section`
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
`;

const HookBadge = styled.div`
  display: inline-flex;
  padding: 9px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.36);
  color: ${({ theme }) => theme.colors.lightBrown};
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-weight: 950;
  font-size: 12px;
  letter-spacing: 0.13em;
`;

const Title = styled.h1`
  margin: 12px 0 10px;
  font-size: clamp(28px, 3.6vw, 52px);
  line-height: 0.98;
  letter-spacing: -0.045em;

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const ProductName = styled.h2`
  margin: 0;
  font-size: 20px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 10px;
`;

const RatingRow = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Stars = styled.span`
  color: #ffd97a;
  font-size: 17px;
  letter-spacing: 1px;
`;

const RatingText = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  font-size: 13px;
  font-weight: 850;
`;

const Price = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 28px;
  font-weight: 950;
`;

const Compare = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.58;
  text-decoration: line-through;
  font-weight: 850;
`;

const Description = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  line-height: 1.65;
`;

const DetailGrid = styled.div`
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const DetailCard = styled.div`
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.27);
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const DetailLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const DetailValue = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 850;
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
  margin: 14px 0;
`;

const OptionBlock = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 12px;
`;

const Label = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ChipBtn = styled.button`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214, 182, 159, 0.7)" : "rgba(255, 255, 255, 0.14)"};
  background: ${({ $active }) =>
    $active ? "rgba(214, 182, 159, 0.18)" : "rgba(0, 0, 0, 0.35)"};
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  cursor: pointer;
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
`;

const QtyBtn = styled.button`
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-size: 18px;
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const QtyInput = styled.input`
  height: 44px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 950;
  outline: none;
`;

const TagRow = styled.div`
  margin-top: 14px;
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  padding: 7px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 850;
`;

const Actions = styled.div`
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const PrimaryBtn = styled.button`
  padding: 13px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(90deg, rgba(214, 182, 159, 0.95), rgba(90, 56, 37, 0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const BuyNowBtn = styled(PrimaryBtn)`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
`;

const GhostButton = styled(Link)`
  grid-column: 1 / -1;
  padding: 13px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  text-decoration: none;
  text-align: center;
`;

const Spin = styled.span`
  width: 15px;
  height: 15px;
  border-radius: 999px;
  border: 2px solid rgba(0, 0, 0, 0.25);
  border-top-color: rgba(0, 0, 0, 0.85);
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const TrustNote = styled.div`
  margin-top: 14px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.27);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.12);
  opacity: 0.9;
  line-height: 1.5;
`;

const ErrorBox = styled(motion.div)`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(90, 56, 37, 0.22);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};

  p {
    margin: 8px 0 0;
    opacity: 0.9;
  }
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const RetryBtn = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 950;
  cursor: pointer;
`;

const GhostLink = styled(Link)`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.25);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 950;
  text-decoration: none;
`;

const SkelBig = styled.div`
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.08);
`;

const SkelThumb = styled.div`
  aspect-ratio: 1 / 1;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.07);
`;

const SkelLine = styled.div`
  height: 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.08);
  margin: 10px 0;
`;

const SkelBtn = styled.div`
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.07);
  margin-top: 14px;
`;

const ReviewSection = styled.section`
  margin-top: 18px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const ReviewHeader = styled.div`
  margin-bottom: 14px;
`;

const ReviewEyebrow = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const ReviewTitle = styled.h3`
  margin: 8px 0 6px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  line-height: 1.1;
`;

const ReviewText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  line-height: 1.55;
  font-size: 13px;
`;
