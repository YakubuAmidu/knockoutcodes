import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

// Redux
import { useDispatch, useSelector } from "react-redux";
import { MEMBERSHIP_ACTIONS } from "../reducers/memberships/membershipActionTypes";

// apiClient
import {
  createMembershipCheckoutSession,
  getMembershipById,
} from "../lib/apiClient";

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 16px 70px;
  color: ${({ theme }) => theme.colors.white};
  background: radial-gradient(
      circle at 18% 10%,
      rgba(214, 182, 159, 0.18),
      transparent 55%
    ),
    radial-gradient(
      circle at 80% 90%,
      rgba(61, 38, 26, 0.55),
      ${({ theme }) => theme.colors.black} 70%
    );
  display: flex;
  justify-content: center;
`;

const Wrap = styled.section`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
`;

const Card = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    160deg,
    rgba(61, 38, 26, 0.78),
    rgba(47, 27, 18, 0.92)
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 22px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const BackBtn = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  font-weight: 900;
  cursor: pointer;
  &:hover {
    background: rgba(0, 0, 0, 0.55);
  }
`;

const Title = styled.h1`
  margin: 14px 0 8px;
  font-size: clamp(22px, 2.5vw, 34px);
  font-weight: 900;
  letter-spacing: 0.02em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Sub = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.92;
  line-height: 1.65;
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(214, 182, 159, 0.35),
    transparent
  );
  margin: 16px 0;
`;

const PillRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

const Pill = styled.span`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 900;
  font-size: 12px;
`;

const ErrorPill = styled(Pill)`
  border-color: rgba(255, 80, 80, 0.55);
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
`;

const PrimaryBtn = styled.button`
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 12.5px;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const OutlineBtn = styled.button`
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px 14px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 12.5px;
  border: 1px solid rgba(255, 249, 242, 0.55);
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  box-shadow: ${({ theme }) => theme.shadow.soft};
  cursor: pointer;
  &:hover {
    background: rgba(255, 249, 242, 0.06);
  }
`;

const Spinner = styled.span`
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

export default function MembershipDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // ✅ same reducer used by Memberships.jsx
  const { startingId, error } = useSelector((s) => s.membership);

  const stateMembership = location?.state?.membership || null;

  const [membership, setMembership] = useState(stateMembership);
  const [loading, setLoading] = useState(!stateMembership);

  // carry-through
  const courseIdFromState = location?.state?.courseId || "";
  const requiredMembershipFromState =
    location?.state?.requiredMembershipId || "";

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (stateMembership) return;
      setLoading(true);
      try {
        const data = await getMembershipById(id);
        if (!ignore) setMembership(data);
      } catch (e) {
        console.error("MembershipDetails load error:", e);
        if (!ignore) setMembership(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id, stateMembership]);

  const view = useMemo(() => {
    const m = membership || {};
    return {
      id: String(m.slug || m.membershipId || m.id || m._id || id), // UI/route
      membershipDbId: String(m._id || m.id || m.membershipId || ""), // ✅ REAL DB id
      stripePriceId: m.stripePriceId || m.priceId || "", // ✅ optional

      title: m.title || "Membership",
      instructor: m.instructor || "Aurora45 • Elite Circle",
      price: m.priceLabel || m.price || "$0 / month",
      short: m.short || m.description || "",
      meta: Array.isArray(m.meta) ? m.meta : [],
      enrolled: m.enrolled,
      rating: m.rating,
    };
  }, [membership, id]);

  // ✅ IMPORTANT: compare startingId against the SAME id you dispatch
  const checkoutId = view.membershipDbId || view.id;
  const isStarting = !loading && String(startingId) === String(checkoutId);

  const startStripeCheckout = useCallback(async () => {
    try {
      if (!checkoutId) return;

      dispatch({ type: MEMBERSHIP_ACTIONS.START_CHECKOUT, payload: checkoutId });

      const res = await createMembershipCheckoutSession({
        membershipId: checkoutId,
        priceId: view.stripePriceId || undefined,
        courseId: courseIdFromState || "",
        kind: "membership",
      });

      // ✅ support BOTH shapes:
      //   - { url: "https://..." }
      //   - axios response: { data: { url: "https://..." } }
      const checkoutUrl = res?.url || res?.data?.url;

      if (!checkoutUrl || !/^https?:\/\//i.test(checkoutUrl)) {
        console.log("Stripe checkout raw response:", res);
        throw new Error("Stripe checkout URL missing from API response.");
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      const status = err?.response?.status;
      console.error("MembershipDetails checkout error:", err);

      dispatch({ type: MEMBERSHIP_ACTIONS.STOP_CHECKOUT });

      if (status === 401 || status === 403) {
        navigate("/login", {
          state: {
            from: `/memberships/${view.id}`,
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
  }, [
    checkoutId,
    dispatch,
    navigate,
    view.id,
    view.stripePriceId,
    courseIdFromState,
    requiredMembershipFromState,
  ]);

  const handleJoin = useCallback(
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      const rawToken = localStorage.getItem("token");
      const hasRealJwt =
        rawToken &&
        rawToken !== "undefined" &&
        rawToken !== "null" &&
        rawToken.length > 20;

      if (!hasRealJwt) {
        navigate("/login", {
          state: {
            from: `/memberships/${view.id}`,
            courseId: courseIdFromState,
            requiredMembershipId: requiredMembershipFromState,
          },
        });
        return;
      }

      startStripeCheckout();
    },
    [
      navigate,
      startStripeCheckout,
      view.id,
      courseIdFromState,
      requiredMembershipFromState,
    ]
  );

  return (
    <Page>
      <Wrap>
        <Card>
          <TopRow>
            <BackBtn type="button" onClick={() => navigate(-1)}>
              ← Back
            </BackBtn>
            <Pill>Aurora45 • Elite Circle</Pill>
          </TopRow>

          {loading ? (
            <>
              <Title>Loading…</Title>
              <Sub>Getting membership details.</Sub>
            </>
          ) : !membership ? (
            <>
              <Title>Not found</Title>
              <Sub>This membership could not be loaded.</Sub>
              <Divider />
              <Actions>
                <OutlineBtn
                  type="button"
                  onClick={() => navigate("/memberships", { replace: true })}
                >
                  Back to Memberships
                </OutlineBtn>
              </Actions>
            </>
          ) : (
            <>
              <Title>{view.title}</Title>
              <Sub>
                {view.short ||
                  "Premium membership access with structure and accountability."}
              </Sub>

              <PillRow>
                <Pill>Instructor: {view.instructor}</Pill>
                <Pill>Price: {view.price}</Pill>

                {Number.isFinite(Number(view.rating)) ? (
                  <Pill>Rating: {Number(view.rating).toFixed(1)}</Pill>
                ) : null}

                {Number.isFinite(Number(view.enrolled)) ? (
                  <Pill>Enrolled: {Number(view.enrolled)}</Pill>
                ) : null}

                {!!error && !isStarting ? (
                  <ErrorPill>{String(error)}</ErrorPill>
                ) : null}
              </PillRow>

              {view.meta?.length ? (
                <>
                  <Divider />
                  <Sub
                    style={{
                      opacity: 0.98,
                      fontWeight: 900,
                      letterSpacing: "0.03em",
                    }}
                  >
                    What’s inside
                  </Sub>
                  <ul
                    style={{
                      marginTop: 10,
                      color: "rgba(255,249,242,0.92)",
                      lineHeight: 1.7,
                    }}
                  >
                    {view.meta.map((x, i) => (
                      <li key={`${checkoutId}-meta-${i}`}>{x}</li>
                    ))}
                  </ul>
                </>
              ) : null}

              <Divider />

              <Actions>
                <PrimaryBtn type="button" onClick={handleJoin} disabled={isStarting}>
                  {isStarting ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Spinner /> Redirecting…
                    </span>
                  ) : (
                    "Join"
                  )}
                </PrimaryBtn>

                <OutlineBtn
                  type="button"
                  onClick={() => navigate("/memberships", { replace: true })}
                >
                  All Memberships
                </OutlineBtn>
              </Actions>
            </>
          )}
        </Card>
      </Wrap>
    </Page>
  );
}