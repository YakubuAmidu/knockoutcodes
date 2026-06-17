// src/pages/MyProducts.jsx
import { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";

import ReviewForm from "../components/ReviewForm";
import { useToast } from "../components/Toast";
import { fetchMyProducts } from "../reducers/myProducts/myProductActions";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatCurrency(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function shortText(value, max = 170) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function getMainImage(product) {
  return safeArray(product?.images)[0] || "";
}

function getRating(product) {
  const rating = Number(
    product?.ratingAverage ??
      product?.averageRating ??
      product?.avgRating ??
      product?.rating ??
      product?.ratingsAverage ??
      0,
  );

  return Number.isFinite(rating) ? rating : 0;
}

function getReviewCount(product) {
  const count = Number(
    product?.ratingCount ??
      product?.reviewCount ??
      product?.reviewsCount ??
      product?.totalReviews ??
      product?.numReviews ??
      0,
  );

  return Number.isFinite(count) ? count : 0;
}

export default function MyProducts() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const [activeImage, setActiveImage] = useState({});

  const {
    loading,
    error,
    products = [],
    totalProducts = 0,
    totalQuantity = 0,
    totalSpent = 0,
  } = useSelector((state) => state.myProducts || {});

  useEffect(() => {
    dispatch(fetchMyProducts());
  }, [dispatch]);

  useEffect(() => {
    if (!error) return;

    toast?.push?.({
      title: "Products error",
      description: error,
      variant: "error",
    });
  }, [error, toast]);

  const topProduct = useMemo(() => products[0] || null, [products]);

  function refreshProducts() {
    dispatch(fetchMyProducts());
  }

  function selectedImage(product) {
    return activeImage[product.productId] || getMainImage(product);
  }

  return (
    <Page>
      <GlowOne />
      <GlowTwo />

      <Shell>
        <Hero
          as={motion.header}
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.38 }}
        >
          <HeroText>
            <Badge>
              <LiveDot />
              KNOCKOUTCODES • PURCHASED PRODUCT VAULT
            </Badge>

            <Title>
              Your purchased products.{" "}
              <span>Premium, private, and verified.</span>
            </Title>

            <Subtitle>
              This page shows only products you already purchased. Orders stay
              inside My Orders. Product images, details, ratings, quantity,
              purchase history, and verified reviews stay here.
            </Subtitle>

            <HeroActions>
              <PrimaryButton
                type="button"
                onClick={() => navigate("/products")}
              >
                Browse Products
              </PrimaryButton>

              <GhostButton
                type="button"
                onClick={refreshProducts}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh Products"}
              </GhostButton>

              <GhostLink to="/dashboard/my-orders">My Orders</GhostLink>
              <GhostLink to="/user-dashboard">Dashboard</GhostLink>
            </HeroActions>
          </HeroText>

          <HeroPanel>
            <PanelEyebrow>Product Control</PanelEyebrow>

            <HeroStat>
              <HeroStatValue>{totalProducts}</HeroStatValue>
              <HeroStatLabel>Purchased Products</HeroStatLabel>
            </HeroStat>

            <HeroMiniGrid>
              <HeroMiniCard>
                <MiniValue>{totalQuantity}</MiniValue>
                <MiniLabel>Total Quantity</MiniLabel>
              </HeroMiniCard>

              <HeroMiniCard>
                <MiniValue>
                  {formatCurrency(totalSpent, topProduct?.currency || "USD")}
                </MiniValue>
                <MiniLabel>Total Product Spend</MiniLabel>
              </HeroMiniCard>
            </HeroMiniGrid>
          </HeroPanel>
        </Hero>

        <ProductsPanel>
          <PanelHeader>
            <div>
              <PanelTitle>My Products</PanelTitle>
              <PanelSub>
                {totalProducts} purchased product
                {totalProducts === 1 ? "" : "s"} • Verified paid access
              </PanelSub>
            </div>

            <SmallButton
              type="button"
              onClick={refreshProducts}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </SmallButton>
          </PanelHeader>

          {loading ? (
            <StateBox>
              <Spinner />
              <StateTitle>Loading your purchased products…</StateTitle>
              <StateText>
                Checking paid orders and hydrating full product information.
              </StateText>
            </StateBox>
          ) : error ? (
            <StateBox>
              <StateIcon>!</StateIcon>
              <StateTitle>Products could not load.</StateTitle>
              <StateText>{error}</StateText>
              <PrimaryButton type="button" onClick={refreshProducts}>
                Try Again
              </PrimaryButton>
            </StateBox>
          ) : products.length === 0 ? (
            <StateBox>
              <StateIcon>⌁</StateIcon>
              <StateTitle>No purchased products yet.</StateTitle>
              <StateText>
                When you buy KnockoutCodes products, they will appear here.
              </StateText>
              <PrimaryButton
                type="button"
                onClick={() => navigate("/products")}
              >
                Shop Products
              </PrimaryButton>
            </StateBox>
          ) : (
            <ProductGrid>
              {products.map((product) => {
                const images = safeArray(product.images);
                const mainImage = selectedImage(product);
                const rating = getRating(product);
                const reviewCount = getReviewCount(product);

                return (
                  <ProductCard key={product.productId}>
                    <ImageWrap>
                      {mainImage ? (
                        <ProductImage src={mainImage} alt={product.title} />
                      ) : (
                        <ImageFallback>KC</ImageFallback>
                      )}

                      <ImageBadge>Verified Purchase</ImageBadge>
                    </ImageWrap>

                    {images.length > 1 ? (
                      <ThumbRow>
                        {images.slice(0, 5).map((img, index) => (
                          <ThumbButton
                            key={`${product.productId}-${img}-${index}`}
                            type="button"
                            $active={selectedImage(product) === img}
                            onClick={() =>
                              setActiveImage((prev) => ({
                                ...prev,
                                [product.productId]: img,
                              }))
                            }
                          >
                            <ThumbImage
                              src={img}
                              alt={`${product.title} ${index + 1}`}
                            />
                          </ThumbButton>
                        ))}
                      </ThumbRow>
                    ) : null}

                    <ProductContent>
                      <ProductTop>
                        <div>
                          <ProductTitle>{product.title}</ProductTitle>
                          <ProductMetaLine>
                            {product.brand || "KnockoutCodes"} •{" "}
                            {product.category || "Product"}
                          </ProductMetaLine>
                        </div>

                        <OwnedBadge>Owned</OwnedBadge>
                      </ProductTop>

                      <RatingRow>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star key={index}>
                            {index < Math.round(rating) ? "★" : "☆"}
                          </Star>
                        ))}
                        <RatingText>
                          {rating ? rating.toFixed(1) : "0.0"} / 5 •{" "}
                          {reviewCount} review
                          {reviewCount === 1 ? "" : "s"}
                        </RatingText>
                      </RatingRow>

                      <ProductDesc>
                        {shortText(product.description) ||
                          "You purchased this product. Product details and verified review access are available here."}
                      </ProductDesc>

                      <DetailsGrid>
                        <DetailBox>
                          <DetailLabel>Quantity Owned</DetailLabel>
                          <DetailValue>{product.quantity}</DetailValue>
                        </DetailBox>

                        <DetailBox>
                          <DetailLabel>Unit Price</DetailLabel>
                          <DetailValue>
                            {formatCurrency(
                              product.unitPrice,
                              product.currency,
                            )}
                          </DetailValue>
                        </DetailBox>

                        <DetailBox>
                          <DetailLabel>Total Spent</DetailLabel>
                          <DetailValue>
                            {formatCurrency(
                              product.totalSpent,
                              product.currency,
                            )}
                          </DetailValue>
                        </DetailBox>

                        <DetailBox>
                          <DetailLabel>Last Purchased</DetailLabel>
                          <DetailValue>
                            {formatDate(product.latestPurchasedAt)}
                          </DetailValue>
                        </DetailBox>

                        <DetailBox>
                          <DetailLabel>Orders</DetailLabel>
                          <DetailValue>{product.orderCount}</DetailValue>
                        </DetailBox>

                        <DetailBox>
                          <DetailLabel>SKU</DetailLabel>
                          <DetailValue>{product.sku || "—"}</DetailValue>
                        </DetailBox>

                        <DetailBox>
                          <DetailLabel>Stock</DetailLabel>
                          <DetailValue>{product.stock ?? "—"}</DetailValue>
                        </DetailBox>

                        <DetailBox>
                          <DetailLabel>Status</DetailLabel>
                          <DetailValue>
                            {product.status || "processing"}
                          </DetailValue>
                        </DetailBox>
                      </DetailsGrid>

                      <ReviewSlot>
                        <ReviewForm
                          type="product"
                          productId={product.productId}
                          productTitle={product.title}
                          onSuccess={refreshProducts}
                        />

                        <ReviewNote>
                          Verified purchase review. Only paid customers can
                          submit.
                        </ReviewNote>
                      </ReviewSlot>

                      <CardActions>
                        <PrimaryButton
                          type="button"
                          onClick={() => {
                            const productLinkId =
                              product.slug || product.productId;

                            if (!productLinkId) {
                              toast?.push?.({
                                title: "Product error",
                                description:
                                  "This product is missing a valid link.",
                                variant: "error",
                              });
                              return;
                            }

                            navigate(`/products/${productLinkId}`);
                          }}
                        >
                          View Product
                        </PrimaryButton>

                        <GhostButton
                          type="button"
                          onClick={() => navigate("/dashboard/my-orders")}
                        >
                          View Orders
                        </GhostButton>
                      </CardActions>
                    </ProductContent>
                  </ProductCard>
                );
              })}
            </ProductGrid>
          )}
        </ProductsPanel>
      </Shell>
    </Page>
  );
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: .8; }
  50% { transform: scale(1.35); opacity: 1; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Page = styled.main`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 96px 18px 76px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(
      circle at 15% 6%,
      rgba(214, 182, 159, 0.18),
      transparent 34%
    ),
    radial-gradient(circle at 88% 14%, rgba(90, 56, 37, 0.28), transparent 38%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.darkBrown} 0%,
      ${({ theme }) => theme.colors.black} 88%
    );

  @media (max-width: 520px) {
    padding: 84px 12px 56px;
  }
`;

const GlowOne = styled.div`
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  left: -190px;
  top: 110px;
  background: rgba(214, 182, 159, 0.1);
  filter: blur(18px);
  pointer-events: none;
`;

const GlowTwo = styled.div`
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  right: -210px;
  bottom: 70px;
  background: rgba(90, 56, 37, 0.24);
  filter: blur(22px);
  pointer-events: none;
`;

const Shell = styled.section`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1200px"};
  margin: 0 auto;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 340px);
  gap: 16px;
  align-items: stretch;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const HeroText = styled.div`
  padding: clamp(20px, 3vw, 28px);
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(214, 182, 159, 0.16),
      transparent 34%
    ),
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.075),
      rgba(255, 255, 255, 0.026)
    ),
    rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.11);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.25);
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;

  @media (max-width: 520px) {
    font-size: 10px;
    letter-spacing: 0.1em;
  }
`;

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
  box-shadow: 0 0 0 6px rgba(214, 182, 159, 0.13);
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

const Title = styled.h1`
  margin: 16px 0 10px;
  max-width: 860px;
  font-size: clamp(32px, 5vw, 68px);
  line-height: 0.96;
  letter-spacing: -0.055em;
  color: ${({ theme }) => theme.colors.ivory};

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Subtitle = styled.p`
  margin: 0;
  max-width: 740px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  line-height: 1.75;
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
`;

const PrimaryButton = styled.button`
  border: 0;
  cursor: pointer;
  min-height: 42px;
  padding: 0 15px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  border: 1px solid rgba(255, 249, 242, 0.14);
  cursor: pointer;
  min-height: 42px;
  padding: 0 15px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.24);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;

  &:hover {
    border-color: rgba(214, 182, 159, 0.42);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    transform: none;
  }
`;

const GhostLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 15px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.24);
  color: ${({ theme }) => theme.colors.ivory};
  text-decoration: none;
  font-weight: 950;

  &:hover {
    border-color: rgba(214, 182, 159, 0.42);
    transform: translateY(-1px);
  }
`;

const HeroPanel = styled.aside`
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(214, 182, 159, 0.1), rgba(0, 0, 0, 0.42)),
    ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.15);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  backdrop-filter: blur(18px);
`;

const PanelEyebrow = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const HeroStat = styled.div`
  margin-top: 14px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
`;

const HeroStatValue = styled.div`
  font-size: 42px;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.ivory};
`;

const HeroStatLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const HeroMiniGrid = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 10px;
`;

const HeroMiniCard = styled.div`
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.08);
`;

const MiniValue = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 18px;
  font-weight: 950;
`;

const MiniLabel = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const ProductsPanel = styled.section`
  margin-top: 24px;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 24px;
  letter-spacing: -0.03em;
`;

const PanelSub = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.7;
`;

const SmallButton = styled(GhostButton)`
  min-height: 40px;
  padding: 0 13px;
  font-size: 13px;
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: auto;
  gap: 16px;
  align-items: start;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 880px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const ProductCard = styled.article`
  width: 100%;
  overflow: hidden;
  border-radius: 22px;
  background:
    radial-gradient(
      circle at 20% 0%,
      rgba(214, 182, 159, 0.1),
      transparent 34%
    ),
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.055),
      rgba(255, 255, 255, 0.018)
    ),
    rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.28);
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.25s ease;

  &:hover {
    border-color: rgba(214, 182, 159, 0.22);
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.28);
  }
`;

const ImageWrap = styled.div`
  position: relative;
  height: 180px;
  background: rgba(0, 0, 0, 0.36);
  border-bottom: 1px solid rgba(255, 249, 242, 0.08);

  @media (max-width: 560px) {
    height: 220px;
  }
`;

const ProductImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ImageFallback = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 34px;
  font-weight: 950;
  letter-spacing: 0.12em;
`;

const ImageBadge = styled.div`
  position: absolute;
  left: 10px;
  top: 10px;
  padding: 6px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.62);
  border: 1px solid rgba(214, 182, 159, 0.26);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ThumbRow = styled.div`
  padding: 9px 10px 0;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const ThumbButton = styled.button`
  width: 40px;
  height: 40px;
  padding: 0;
  overflow: hidden;
  border-radius: 11px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214, 182, 159, 0.72)" : "rgba(255, 249, 242, 0.1)"};

  &:hover {
    border-color: rgba(214, 182, 159, 0.5);
  }
`;

const ThumbImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ProductContent = styled.div`
  padding: 12px;
`;

const ProductTop = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: flex-start;
`;

const ProductTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 15.5px;
  line-height: 1.22;
  font-weight: 950;
`;

const ProductMetaLine = styled.div`
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.lightBrown};
  opacity: 0.86;
  font-size: 11px;
  font-weight: 850;
`;

const OwnedBadge = styled.span`
  flex: 0 0 auto;
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.colors.lightBrown};
  background: rgba(214, 182, 159, 0.11);
  border: 1px solid rgba(214, 182, 159, 0.2);
  font-size: 9px;
  font-weight: 950;
  text-transform: uppercase;
`;

const RatingRow = styled.div`
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
`;

const Star = styled.span`
  color: #ffd97a;
  font-size: 14px;
`;

const RatingText = styled.span`
  margin-left: 6px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.7;
  font-size: 11px;
  font-weight: 850;
`;

const ProductDesc = styled.p`
  margin: 9px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  line-height: 1.48;
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const DetailsGrid = styled.div`
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: auto;
  gap: 7px;
`;

const DetailBox = styled.div`
  padding: 8px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(255, 249, 242, 0.075);
`;

const DetailLabel = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 8.5px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const DetailValue = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 11px;
  font-weight: 900;
  word-break: break-word;
`;

const ReviewSlot = styled.div`
  position: relative;
  width: 100%;
  margin-top: 11px;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(214, 182, 159, 0.1);
  overflow: hidden;
  isolation: isolate;
  transform: none !important;
  box-shadow: none !important;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover,
  &:focus,
  &:focus-within,
  &:active {
    transform: none !important;
    box-shadow: none !important;
    background: rgba(0, 0, 0, 0.18);
    border-color: rgba(214, 182, 159, 0.18);
  }

  * {
    max-width: 100%;
    box-sizing: border-box;
  }

  form,
  div,
  section,
  article {
    transform: none !important;
  }

  button {
    max-width: 100%;
  }

  button:hover {
    transform: none !important;
  }

  /* Fix close button overflow */
  button[aria-label="Close"],
  .close-btn,
  .review-close-btn {
    position: absolute !important;
    top: 8px !important;
    right: 8px !important;
    width: 28px !important;
    height: 28px !important;
    min-height: 28px !important;
    padding: 0 !important;
    border-radius: 999px !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(0, 0, 0, 0.55) !important;
    border: 1px solid rgba(214, 182, 159, 0.22) !important;
    z-index: 10;
  }
`;

const ReviewNote = styled.small`
  display: block;
  margin-top: 7px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.56;
  font-size: 10.5px;
  line-height: 1.45;
`;

const CardActions = styled.div`
  margin-top: 11px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  ${PrimaryButton},
  ${GhostButton} {
    width: 100%;
    padding: 0 10px;
    font-size: 11.5px;
    min-height: 39px;
  }
`;

const StateBox = styled.div`
  margin-top: 14px;
  padding: 24px;
  display: grid;
  gap: 10px;
  place-items: center;
  text-align: center;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const StateIcon = styled.div`
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.lightBrown};
  background: rgba(214, 182, 159, 0.12);
  border: 1px solid rgba(214, 182, 159, 0.22);
  font-size: 26px;
  font-weight: 950;
`;

const StateTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
`;

const StateText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  line-height: 1.55;
`;

const Spinner = styled.span`
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 3px solid rgba(214, 182, 159, 0.2);
  border-top-color: ${({ theme }) => theme.colors.lightBrown};
  animation: ${spin} 0.85s linear infinite;
`;
