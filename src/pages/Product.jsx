// src/pages/Product.jsx
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";

import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

import { CART_ACTIONS } from "../reducers/cart/cartActionTypes";
import { PRODUCT_ACTIONS } from "../reducers/products/productActionTypes";
import { productInitialState } from "../reducers/products/productInitialState";
import { productReducer } from "../reducers/products/productReducer";

const LIMIT = 8;
const BRAND = "knockoutcodes";

function getId(product) {
  return product?._id || product?.id || "";
}

function getImage(product) {
  return (
    product?.imageUrl ||
    product?.image ||
    (Array.isArray(product?.images) ? product.images[0] : "") ||
    ""
  );
}

function formatMoney(value) {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
}

function normalizeProducts(data) {
  return data?.products || data?.data || data?.items || data?.results || [];
}

export default function Product() {
  const [state, dispatch] = useReducer(productReducer, productInitialState);
  const { items, loading, error } = state;

  const cartDispatch = useDispatch();
  const toast = useToast();
  const lastToastMsgRef = useRef("");

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const [meta, setMeta] = useState({
    total: null,
    totalPages: null,
    hasNextPage: null,
    hasPrevPage: null,
  });

  const categories = useMemo(() => {
    const unique = new Set();

    items.forEach((item) => {
      if (item?.category) unique.add(item.category);
    });

    return Array.from(unique);
  }, [items]);

  const canPrev = useMemo(() => {
    if (meta.hasPrevPage !== null) return meta.hasPrevPage;
    return page > 1;
  }, [meta.hasPrevPage, page]);

  const canNext = useMemo(() => {
    if (meta.hasNextPage !== null) return meta.hasNextPage;
    if (meta.totalPages !== null) return page < meta.totalPages;
    return items.length === LIMIT;
  }, [meta.hasNextPage, meta.totalPages, page, items.length]);

  const fetchProducts = useCallback(
    async (nextPage = 1) => {
      dispatch({ type: PRODUCT_ACTIONS.FETCH_START });

      try {
        const { data } = await axiosInstance.get("/products", {
          params: {
            brand: BRAND,
            page: nextPage,
            limit: LIMIT,
            sort: "-createdAt",
            search: query.trim() || undefined,
            category: category || undefined,
          },
        });

        const list = normalizeProducts(data);
        const m = data?.meta || data || {};

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
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load products.";

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
    },
    [category, query, toast]
  );

  useEffect(() => {
    fetchProducts(page);
  }, [fetchProducts, page]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    fetchProducts(1);
  }

  function addToCart(product) {
    const id = getId(product);
    const image = getImage(product);

    if (!id) {
      toast?.push?.({
        title: "Product error",
        description: "This product is missing an ID.",
        variant: "error",
      });
      return;
    }

    if (Number(product?.stock || 0) <= 0) {
      toast?.push?.({
        title: "Out of stock",
        description: "This product is not available right now.",
        variant: "warning",
      });
      return;
    }

    const cartItemId = `${id}::no-size::no-color`;

    cartDispatch({
      type: CART_ACTIONS.ADD_ITEM,
      payload: {
        cartItemId,
        productId: id,
        title: product?.title || "Product",
        description: product?.shortDescription || product?.description || "",
        price: Number(product?.price || 0),
        image,
        qty: 1,
        size: "",
        color: "",
        addedAt: new Date().toISOString(),
      },
    });

    toast?.push?.({
      title: "Added to cart",
      description: `${product?.title || "Product"} added successfully.`,
      variant: "success",
    });
  }

  return (
    <Page>
      <Inner>
        <Hero
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
        >
          <Badge>🥊 KNOCKOUTCODES • PREMIUM FIGHT SHOP</Badge>

          <Title>
            Gear that looks elite in 2 seconds.{" "}
            <span>Built for fighters who train like champions.</span>
          </Title>

          <Sub>
            Shop real KnockoutCodes products pulled directly from your backend:
            boxing gear, training essentials, premium apparel, and performance
            tools built for serious work.
          </Sub>

          <HeroActions>
            <PrimaryAnchor href="#products">Shop Products</PrimaryAnchor>
            <GhostLink to="/cart">View Cart</GhostLink>
          </HeroActions>
        </Hero>

        <Toolbar as="form" onSubmit={handleSearchSubmit}>
          <ToolbarLeft>
            <SectionTitle id="products">Premium Product Vault</SectionTitle>
            <Hint>
              Page <b>{page}</b>
              {meta.totalPages ? <> / <b>{meta.totalPages}</b></> : null}
              {meta.total !== null ? <> • <b>{meta.total}</b> total</> : null}
            </Hint>
          </ToolbarLeft>

          <Controls>
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gloves, wraps, apparel..."
            />

            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>

            <SearchBtn type="submit" disabled={loading}>
              Search
            </SearchBtn>
          </Controls>
        </Toolbar>

        {error ? (
          <ErrorBox>
            <b>Couldn’t load products.</b>
            <p>{error}</p>
            <RetryBtn type="button" onClick={() => fetchProducts(page)} disabled={loading}>
              Retry
            </RetryBtn>
          </ErrorBox>
        ) : null}

        <Grid>
          {loading
            ? Array.from({ length: LIMIT }).map((_, index) => (
                <SkeletonCard key={index} />
              ))
            : items.map((product) => (
                <ProductCard
                  key={getId(product)}
                  product={product}
                  onAddToCart={addToCart}
                />
              ))}
        </Grid>

        {!loading && !items.length && !error ? (
          <EmptyBox>
            <h3>No products found.</h3>
            <p>Try a different search or category.</p>
          </EmptyBox>
        ) : null}

        <Pager>
          <NavBtn
            type="button"
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </NavBtn>

          <PageChip>
            Page {page}
            {meta.totalPages ? ` / ${meta.totalPages}` : ""}
          </PageChip>

          <NavBtn
            type="button"
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </NavBtn>
        </Pager>
      </Inner>
    </Page>
  );
}

function ProductCard({ product, onAddToCart }) {
  const id = getId(product);
  const image = getImage(product);
  const title = product?.title || "Untitled Product";
  const shortDescription =
    product?.shortDescription || product?.description || "Premium KnockoutCodes product.";
  const price = Number(product?.price || 0);
  const compareAtPrice = Number(product?.compareAtPrice || 0);
  const stock = Number(product?.stock || 0);
  const hasDiscount = compareAtPrice > price && price >= 0;
  const productLink = `/products/${product?.slug || id}`;

  return (
    <Card
      as={motion.article}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.18 }}
    >
      <ImageWrap>
        {image ? (
          <Image src={image} alt={title} loading="lazy" />
        ) : (
          <ImageFallback>No Image</ImageFallback>
        )}

        <FloatingBadges>
          {product?.isFeatured ? <MiniBadge>Featured</MiniBadge> : null}
          <MiniBadge>{stock > 0 ? `${stock} in stock` : "Out of stock"}</MiniBadge>
        </FloatingBadges>
      </ImageWrap>

      <CardBody>
        <Category>{product?.category || "KnockoutCodes Gear"}</Category>
        <CardTitle title={title}>{title}</CardTitle>
        <CardDesc>{shortDescription}</CardDesc>

        <PriceRow>
          <Price>{formatMoney(price)}</Price>
          {hasDiscount ? <Compare>{formatMoney(compareAtPrice)}</Compare> : null}
        </PriceRow>

        {Array.isArray(product?.tags) && product.tags.length ? (
          <TagRow>
            {product.tags.slice(0, 3).map((tag) => (
              <Tag key={tag}>#{tag}</Tag>
            ))}
          </TagRow>
        ) : null}

        <ButtonRow>
          <ViewBtn to={productLink}>View Details</ViewBtn>

          <AddBtn
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={stock <= 0}
          >
            {stock <= 0 ? "Sold Out" : "Add To Cart"}
          </AddBtn>
        </ButtonRow>
      </CardBody>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card aria-hidden="true">
      <ImageWrap>
        <SkelBlock />
      </ImageWrap>
      <CardBody>
        <SkelLine style={{ width: "48%" }} />
        <SkelLine style={{ width: "78%" }} />
        <SkelLine style={{ width: "94%" }} />
        <SkelLine style={{ width: "70%" }} />
        <SkelBtnRow>
          <SkelBtn />
          <SkelBtn />
        </SkelBtnRow>
      </CardBody>
    </Card>
  );
}

/* ------------------------- styles ------------------------- */

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 18px 90px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(circle at 18% 8%, rgba(214, 182, 159, 0.22) 0%, rgba(0, 0, 0, 0) 40%),
    radial-gradient(circle at 82% 16%, rgba(90, 56, 37, 0.34) 0%, rgba(0, 0, 0, 0) 46%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.darkBrown} 0%, #000 86%);
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 28px 22px;
  margin-bottom: 18px;
  backdrop-filter: blur(18px);
`;

const Badge = styled.div`
  display: inline-flex;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-weight: 950;
  letter-spacing: 0.14em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Title = styled.h1`
  margin: 14px 0 10px;
  max-width: 980px;
  font-size: clamp(30px, 4.2vw, 58px);
  line-height: 0.98;
  letter-spacing: -0.045em;

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
  }
`;

const Sub = styled.p`
  margin: 0;
  max-width: 82ch;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  line-height: 1.65;
`;

const HeroActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
`;

const PrimaryAnchor = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(90deg, rgba(214, 182, 159, 0.95), rgba(90, 56, 37, 0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  text-decoration: none;
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const GhostLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.32);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.14);
`;

const Toolbar = styled.form`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin: 18px 0 12px;
  flex-wrap: wrap;
`;

const ToolbarLeft = styled.div`
  display: grid;
  gap: 5px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.01em;
`;

const Hint = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.86;

  b {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  min-width: min(320px, 100%);
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;
`;

const Select = styled.select`
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;
`;

const SearchBtn = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(90deg, rgba(214, 182, 159, 0.95), rgba(90, 56, 37, 0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  overflow: hidden;
  backdrop-filter: blur(14px);
`;

const ImageWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
`;

const ImageFallback = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  opacity: 0.8;
`;

const FloatingBadges = styled.div`
  position: absolute;
  left: 10px;
  top: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const MiniBadge = styled.span`
  padding: 7px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
`;

const CardBody = styled.div`
  padding: 14px;
`;

const Category = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const CardTitle = styled.h3`
  margin: 7px 0 7px;
  font-size: 16px;
  letter-spacing: -0.01em;
`;

const CardDesc = styled.p`
  margin: 0 0 12px;
  min-height: 58px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
  line-height: 1.45;
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
`;

const Price = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 20px;
  font-weight: 950;
`;

const Compare = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.58;
  text-decoration: line-through;
  font-weight: 800;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;
`;

const Tag = styled.span`
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 800;
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const ViewBtn = styled(Link)`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.black};
  background: linear-gradient(90deg, rgba(214, 182, 159, 0.95), rgba(90, 56, 37, 0.95));
  font-weight: 950;
`;

const AddBtn = styled.button`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ theme }) => theme.colors.ivory};
  background: rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const Pager = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
`;

const NavBtn = styled.button`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageChip = styled.div`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-weight: 950;
`;

const ErrorBox = styled(motion.div)`
  margin: 12px 0;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(90, 56, 37, 0.22);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};

  p {
    margin: 8px 0 0;
    opacity: 0.9;
  }
`;

const RetryBtn = styled.button`
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  cursor: pointer;
`;

const EmptyBox = styled.div`
  margin-top: 14px;
  padding: 20px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;

  h3 {
    margin: 0 0 6px;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.86;
  }
`;

const SkelBlock = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04),
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.04)
  );
  animation: shimmer 1.1s infinite linear;
  background-size: 200% 100%;

  @keyframes shimmer {
    0% {
      background-position: 0% 0;
    }

    100% {
      background-position: 200% 0;
    }
  }
`;

const SkelLine = styled.div`
  height: 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.08);
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
  background: rgba(255, 255, 255, 0.07);
`;