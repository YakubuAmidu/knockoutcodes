// src/pages/Memberships.jsx
import { useEffect, useMemo, useCallback, useRef } from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";

// Redux
import { useDispatch, useSelector } from "react-redux";
import { MEMBERSHIP_ACTIONS } from "../reducers/memberships/membershipActionTypes";

// apiClient reusable
import { getMemberships, createMembershipCheckoutSession } from "../lib/apiClient";

/* =========================
   Styles (same luxury system)
========================= */
const PageWrap = styled.section`
  min-height: 100vh;
  background: radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.22),
      transparent 55%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(61, 38, 26, 0.45),
      ${({ theme }) => theme.colors.black} 70%);
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  justify-content: center;
  padding: 80px 16px 60px;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 32px;
`;

const Eyebrow = styled.p`
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 10px;
`;

const Title = styled.h1`
  font-size: clamp(2.4rem, 3vw, 3rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.white}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  font-size: 15.5px;
  max-width: 720px;
  margin: 0 auto;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 22px;
  flex-wrap: wrap;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const StatusPill = styled.span`
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.35);
`;

const ErrorPill = styled(StatusPill)`
  border-color: rgba(255, 80, 80, 0.55);
  color: ${({ theme }) => theme.colors.ivory};
`;

const Grid = styled.div`
  margin-top: 40px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article`
  background: linear-gradient(
    150deg,
    ${({ theme }) => theme.colors.cocoa},
    ${({ theme }) => theme.colors.darkBrown}
  );
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 249, 242, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, box-shadow 0.25s ease,
    border-color 0.25s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: ${({ theme }) => theme.shadow.hard};
    border-color: rgba(214, 182, 159, 0.75);
  }
`;

const ThumbWrap = styled.div`
  position: relative;
  padding-top: 60%;
  background: ${({ theme }) => theme.colors.black};
  overflow: hidden;
`;

const Thumb = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: radial-gradient(
      800px 240px at 15% 10%,
      rgba(214, 182, 159, 0.22),
      transparent 55%
    ),
    linear-gradient(160deg, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.92));
`;

const HeroGlyph = styled.div`
  width: 88px;
  height: 88px;
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.35);
  box-shadow: ${({ theme }) => theme.shadow.hard};
  display: grid;
  place-items: center;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.ivory};
`;

const BadgeRow = styled.div`
  position: absolute;
  inset: 14px 14px auto 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
`;

const Badge = styled.span`
  padding: 5px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(0, 0, 0, 0.65);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.26);
`;

const BestSellerBadge = styled(Badge)`
  background: rgba(255, 215, 122, 0.9);
  color: ${({ theme }) => theme.colors.black};
`;

const BadgeRightGroup = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const Body = styled.div`
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const CardTitle = styled.h2`
  font-size: 17px;
  font-weight: 800;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Dot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.lightBrown};
  margin: 0 4px;
  display: inline-block;
`;

const StatsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const StatPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  line-height: 1;
`;

const StatLabel = styled.span`
  opacity: 0.85;
`;

const StatValue = styled.span`
  font-weight: 800;
  letter-spacing: 0.02em;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 10px;
`;

const Description = styled.p`
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Footer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: auto;
`;

const Button = styled.button`
  flex: 1;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: transform 0.18s ease, box-shadow 0.18s ease,
    background 0.18s ease, color 0.18s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const OutlineButton = styled(Button)`
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.6);
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:hover {
    background: rgba(255, 249, 242, 0.06);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }
`;

const BtnSpinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(0, 0, 0, 0.18);
  border-top-color: rgba(0, 0, 0, 0.65);
  display: inline-block;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const InfoBar = styled.div`
  margin-top: 14px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  font-size: 13px;
`;

const InlineBtn = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 12px;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.18s ease, background 0.18s ease,
    border-color 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(214, 182, 159, 0.75);
    background: rgba(255, 255, 255, 0.08);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

/* =========================
   Helpers
========================= */
const formatEnrolled = (n) => {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M+`;
  if (num >= 10_000) return `${Math.round(num / 1000)}K+`;
  if (num >= 1_000) return `${(num / 1000).toFixed(1)}K+`;
  return `${num}`;
};

const starText = (rating) => {
  const r = Number(rating);
  if (!Number.isFinite(r) || r <= 0) return "—";
  const full = Math.max(0, Math.min(5, Math.floor(r)));
  const hasHalf = r - full >= 0.5 && full < 5;
  const stars = "★★★★★".slice(0, full) + (hasHalf ? "½" : "");
  return `${stars} ${r.toFixed(1)}`;
};

const normalizePlanSlug = (raw) => {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "advanced") return "advance";
  return s;
};

function resolveCheckoutUrl(res) {
  const payload = res?.data ?? res ?? {};
  const url =
    payload?.url ||
    payload?.checkoutUrl ||
    payload?.checkoutURL ||
    payload?.redirectUrl ||
    payload?.redirectURL ||
    payload?.data?.url ||
    payload?.data?.checkoutUrl;

  if (!url) return "";

  // already absolute
  if (/^https?:\/\//i.test(url)) return String(url);

  // if backend returns relative url
  if (String(url).startsWith("/")) return `${window.location.origin}${url}`;

  return "";
}

/* =========================
   Page
========================= */
const Memberships = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // ✅ prevents double request + flashing
  const checkoutLockRef = useRef(false);

  const { items: memberships, loading, error, startingId } = useSelector(
    (s) => s.membership
  );

  const courseIdFromState = location?.state?.courseId || "";
  const requiredMembershipFromState = location?.state?.requiredMembershipId || "";
  const fromPath = location?.state?.from || "";

  const normalized = useMemo(() => {
    const list = Array.isArray(memberships) ? memberships : [];

    if (loading && list.length === 0) {
      return Array.from({ length: 4 }).map((_, idx) => ({
        __skeleton: true,
        id: `skeleton-${idx}`,
        membershipDbId: "",
        stripePriceId: "",
        glyph: "…",
        badgeLeft: "Loading",
        badgeRight: "…",
        highlight: false,
        title: "Loading membership…",
        instructor: "…",
        price: "…",
        rating: 0,
        enrolled: 0,
        short: "Loading details…",
        meta: ["…", "…", "…", "…"],
      }));
    }

    return list.map((m) => ({
      id: String(m?.slug || m?.membershipId || m?.id || m?._id || ""),
      membershipDbId: String(m?._id || m?.id || m?.membershipId || ""),
      stripePriceId: m?.stripePriceId || m?.priceId || "",
      glyph: m?.glyph || "EC",
      badgeLeft: m?.badgeLeft || "Elite Circle",
      badgeRight: m?.badgeRight || "Access",
      highlight: Boolean(m?.highlight),
      title: m?.title || "Elite Circle Membership",
      instructor: m?.instructor || "Aurora45 • Elite Circle",
      price: m?.priceLabel || m?.price || "$0 / month",
      rating: Number(m?.rating || 0),
      enrolled: Number(m?.enrolled || 0),
      short: m?.short || "",
      meta: Array.isArray(m?.meta) ? m.meta : [],
    }));
  }, [memberships, loading]);

  const fetchMemberships = useCallback(async () => {
    dispatch({ type: MEMBERSHIP_ACTIONS.FETCH_START });
    try {
      const list = await getMemberships("published=true&sort=enrolled");
      dispatch({ type: MEMBERSHIP_ACTIONS.FETCH_SUCCESS, payload: list });
    } catch (err) {
      console.error("fetchMemberships error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load memberships.";
      dispatch({ type: MEMBERSHIP_ACTIONS.FETCH_ERROR, payload: msg });
    }
  }, [dispatch]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const startStripeCheckout = useCallback(
    async (membership) => {
      if (!membership || membership.__skeleton) return;

      if (checkoutLockRef.current) return;
      checkoutLockRef.current = true;

      const checkoutId = membership.membershipDbId || membership.id;

      dispatch({ type: MEMBERSHIP_ACTIONS.START_CHECKOUT, payload: checkoutId });

      try {
        const res = await createMembershipCheckoutSession({
          membershipId: checkoutId,
          priceId: membership.stripePriceId || undefined,
          courseId: courseIdFromState || "",
          kind: "membership",
        });

        const checkoutUrl = resolveCheckoutUrl(res);

        if (!checkoutUrl) {
          console.log("Stripe checkout raw response:", res);
          throw new Error("Stripe checkout URL missing from API response.");
        }

        // ✅ hard redirect
        window.location.assign(checkoutUrl);
      } catch (err) {
        const status = err?.response?.status;
        console.error("startStripeCheckout error:", err);

        dispatch({ type: MEMBERSHIP_ACTIONS.STOP_CHECKOUT });
        checkoutLockRef.current = false;

        if (status === 401 || status === 403) {
          navigate("/login", {
            state: {
              from: "/memberships",
              courseId: courseIdFromState,
              requiredMembershipId: requiredMembershipFromState,
            },
          });
          return;
        }

        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Checkout failed. Please try again.";

        dispatch({ type: MEMBERSHIP_ACTIONS.FETCH_ERROR, payload: msg });
      }
    },
    [dispatch, courseIdFromState, navigate, requiredMembershipFromState]
  );

  const handleJoin = useCallback(
    (membership) => {
      if (!membership || membership.__skeleton) return;

      const rawToken = localStorage.getItem("token");
      const hasRealJwt =
        rawToken &&
        rawToken !== "undefined" &&
        rawToken !== "null" &&
        rawToken.length > 20;

      if (!hasRealJwt) {
        navigate("/login", {
          state: {
            from: "/memberships",
            courseId: courseIdFromState,
            requiredMembershipId: requiredMembershipFromState,
          },
        });
        return;
      }

      startStripeCheckout(membership);
    },
    [navigate, startStripeCheckout, courseIdFromState, requiredMembershipFromState]
  );

  return (
    <PageWrap>
      <Inner>
        <Header>
          <Eyebrow>Elite Circle • Memberships</Eyebrow>
          <Title>Structure. Accountability. Execution.</Title>
          <Subtitle>
            Choose your membership level, follow weekly direction, and upgrade
            when you hit the checkpoint. No confusion. No noise. Just results.
          </Subtitle>

          <StatusBar>
            <StatusPill>Weekly “Do This Next” direction</StatusPill>
            <StatusPill>Private community • Focused rules</StatusPill>
            <StatusPill>
              Upgrade path: Beginner → Intermediate → Advanced → Complete
            </StatusPill>
          </StatusBar>

          <InfoBar>
            <InlineBtn type="button" onClick={fetchMemberships} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </InlineBtn>

            <StatusPill>
              Showing: {loading ? "…" : `${normalized.filter((x) => !x.__skeleton).length}`} memberships
            </StatusPill>

            {requiredMembershipFromState ? (
              <StatusPill>
                Required:{" "}
                <strong style={{ color: "inherit" }}>
                  {requiredMembershipFromState}
                </strong>
              </StatusPill>
            ) : null}

            {fromPath ? (
              <InlineBtn type="button" onClick={() => navigate(fromPath)}>
                Back
              </InlineBtn>
            ) : null}

            {!loading && error ? <ErrorPill>{String(error)}</ErrorPill> : null}
          </InfoBar>
        </Header>

        <Grid>
          {normalized.map((plan, idx) => {
            const key = plan?.id || `row-${idx}`;
            const checkoutId = plan?.membershipDbId || plan?.id || "";
            const isStarting =
              !plan?.__skeleton && String(startingId) === String(checkoutId);

            return (
              <Card key={key} aria-busy={plan?.__skeleton ? "true" : "false"}>
                <ThumbWrap>
                  <Thumb aria-hidden="true">
                    <HeroGlyph>{plan?.glyph || "…"}</HeroGlyph>
                  </Thumb>

                  <BadgeRow>
                    <Badge>{plan?.badgeLeft || "Loading"}</Badge>
                    <BadgeRightGroup>
                      {!plan?.__skeleton && plan?.highlight ? (
                        <BestSellerBadge>Top Choice</BestSellerBadge>
                      ) : null}
                      <Badge>{plan?.badgeRight || "…"}</Badge>
                    </BadgeRightGroup>
                  </BadgeRow>
                </ThumbWrap>

                <Body>
                  <CardTitle>{plan?.title || "Loading membership…"}</CardTitle>

                  <StatsRow>
                    <StatPill>
                      <StatLabel>Instructor</StatLabel>
                      <Dot />
                      <StatValue>{plan?.instructor || "…"}</StatValue>
                    </StatPill>

                    <StatPill>
                      <StatLabel>Price</StatLabel>
                      <Dot />
                      <StatValue>{plan?.price || "…"}</StatValue>
                    </StatPill>

                    <StatPill>
                      <StatLabel>Rating</StatLabel>
                      <Dot />
                      <StatValue>{plan?.__skeleton ? "…" : starText(plan?.rating)}</StatValue>
                    </StatPill>

                    <StatPill>
                      <StatLabel>Enrolled</StatLabel>
                      <Dot />
                      <StatValue>{plan?.__skeleton ? "…" : formatEnrolled(plan?.enrolled)}</StatValue>
                    </StatPill>
                  </StatsRow>

                  <MetaRow>
                    {(Array.isArray(plan?.meta) && plan.meta.length
                      ? plan.meta
                      : plan?.__skeleton
                      ? ["…", "…", "…", "…"]
                      : []
                    ).map((m, i) => (
                      <span key={`${key}-m-${i}`}>
                        {i !== 0 ? <Dot /> : null}
                        {plan?.__skeleton ? "…" : m}
                      </span>
                    ))}
                  </MetaRow>

                  <Description>
                    {plan?.short ||
                      "Premium membership access with structure and accountability."}
                  </Description>

                  <Footer>
                    <OutlineButton
                      type="button"
                      disabled={plan?.__skeleton || isStarting}
                      onClick={() =>
                        navigate(`/memberships/${plan.id}`, {
                          state: { membership: plan },
                        })
                      }
                    >
                      Details
                    </OutlineButton>

                    <PrimaryButton
                      type="button"
                      disabled={plan?.__skeleton || isStarting}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleJoin(plan);
                      }}
                    >
                      {isStarting ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            justifyContent: "center",
                            width: "100%",
                          }}
                        >
                          <BtnSpinner /> Redirecting…
                        </span>
                      ) : (
                        "Join"
                      )}
                    </PrimaryButton>
                  </Footer>

                  {!plan?.__skeleton &&
                  requiredMembershipFromState &&
                  normalizePlanSlug(plan.id) === normalizePlanSlug(requiredMembershipFromState) ? (
                    <div style={{ marginTop: 10 }}>
                      <StatusPill>Recommended for your course selection</StatusPill>
                    </div>
                  ) : null}
                </Body>
              </Card>
            );
          })}
        </Grid>
      </Inner>
    </PageWrap>
  );
};

export default Memberships;