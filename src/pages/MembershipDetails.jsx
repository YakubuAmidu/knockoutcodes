// src/pages/MembershipDetails.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { MEMBERSHIP_ACTIONS } from "../reducers/memberships/membershipActionTypes";
import {
  createMembershipCheckoutSession,
  getMembershipById,
  getMySubscription,
  switchMembershipPlan,
  cancelMyMembership,
  getReviews,
  createReview,
} from "../lib/apiClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const normalizePlanSlug = (raw) => {
  const value = String(raw || "").toLowerCase().trim();

  if (value === "advanced") return "advance";
  if (value.includes("beginner")) return "beginner";
  if (value.includes("intermediate")) return "intermediate";
  if (value.includes("advance") || value.includes("advanced")) return "advance";
  if (value.includes("complete") || value.includes("elite")) return "complete";

  return value;
};

const formatEnrolled = (n) => {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M+`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K+`;
  return `${num}`;
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
  if (/^https?:\/\//i.test(url)) return String(url);
  if (String(url).startsWith("/")) return `${window.location.origin}${url}`;
  return "";
}

const getSubscriptionPayload = (payload) => {
  if (payload?.data?.data) return payload.data.data;
  if (payload?.data) return payload.data;
  if (payload?.subscription) return payload.subscription;
  return payload || {};
};

export default function MembershipDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const {
  isAuthenticated,
  loading: authLoading,
  user,
  currentUser,
  authUser,
} = useAuth();

const toast = useToast();

const loggedInUser = user || currentUser || authUser || {};

const isAdmin =
  ["admin", "superadmin"].includes(
    String(loggedInUser?.role || loggedInUser?.user?.role || "").toLowerCase()
  ) || loggedInUser?.isAdmin === true;

  const { startingId, switchingId, canceling, mySubscription, error } =
    useSelector((s) => s.membership);

  const stateMembership = location?.state?.membership || null;
  const stateBillingPeriod = location?.state?.billingPeriod || "monthly";

  const [membership, setMembership] = useState(stateMembership);
  const [loading, setLoading] = useState(!stateMembership);
  const [billingPeriod, setBillingPeriod] = useState(stateBillingPeriod);

  const [reviews, setReviews] = useState([]);
const [reviewStats, setReviewStats] = useState({
  totalReviews: 0,
  averageRating: 0,
});
const [reviewLoading, setReviewLoading] = useState(false);
const [reviewSubmitting, setReviewSubmitting] = useState(false);
const [reviewForm, setReviewForm] = useState({
  rating: 5,
  title: "",
  comment: "",
});

  const courseIdFromState = location?.state?.courseId || "";
  const requiredMembershipFromState = location?.state?.requiredMembershipId || "";

  const fetchMySubscription = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;

    dispatch({ type: MEMBERSHIP_ACTIONS.FETCH_MY_SUBSCRIPTION_START });

    try {
      const sub = await getMySubscription();

      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_MY_SUBSCRIPTION_SUCCESS,
        payload: getSubscriptionPayload(sub),
      });
    } catch (err) {
      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_MY_SUBSCRIPTION_ERROR,
        payload:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load subscription.",
      });
    }
  }, [dispatch, isAuthenticated, authLoading]);

  const fetchMembershipReviews = useCallback(async () => {
  const membershipObjectId =
  membership?._id ||
  (String(membership?.id || "").match(/^[0-9a-fA-F]{24}$/)
    ? membership.id
    : "");

  if (!membershipObjectId) return;

  setReviewLoading(true);

  try {
    const result = await getReviews(
      `membershipId=${encodeURIComponent(membershipObjectId)}&page=1&limit=10`
    );

    const payload = result?.data || {};
    const list = Array.isArray(payload?.reviews) ? payload.reviews : [];

    setReviews(list);
    setReviewStats({
      totalReviews: Number(payload?.totalReviews || 0),
      averageRating: Number(payload?.averageRating || 0),
    });
  } catch (err) {
    console.error("Membership reviews load error:", err);
    setReviews([]);
    setReviewStats({
      totalReviews: 0,
      averageRating: 0,
    });
  } finally {
    setReviewLoading(false);
  }
  }, [membership?._id, membership?.id]);
  
  const handleReviewChange = useCallback((event) => {
  const { name, value } = event.target;

  setReviewForm((prev) => ({
    ...prev,
    [name]: value,
  }));
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadMembership() {
      if (stateMembership) return;

      setLoading(true);

      try {
        const data = await getMembershipById(id);
        if (!ignore) setMembership(data);
      } catch (err) {
        console.error("MembershipDetails load error:", err);
        if (!ignore) setMembership(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

   loadMembership();
    fetchMySubscription();

    return () => {
      ignore = true;
    };
  }, [id, stateMembership, fetchMySubscription]);

  useEffect(() => {
  fetchMembershipReviews();
}, [fetchMembershipReviews]);

  const view = useMemo(() => {
    const m = membership || {};

    const monthlyPrice =
      m?.monthlyPriceLabel ||
      m?.monthlyPrice ||
      m?.priceLabel ||
      m?.price ||
      "$0 / month";

    const yearlyPrice =
      m?.yearlyPriceLabel ||
      m?.annualPriceLabel ||
      m?.yearlyPrice ||
      m?.annualPrice ||
      "Yearly option";

    const meta = Array.isArray(m?.meta)
      ? m.meta
      : [
          "Protected course access",
          "Monthly or yearly membership",
          "Premium student dashboard",
          "Progress-based learning path",
          "Secure Stripe checkout",
        ];

    return {
      id: String(m.slug || m.membershipId || m.id || m._id || id),
      membershipId: String(m.membershipId || m.accessLevel || m.slug || id || ""),
      accessLevel: String(m.accessLevel || m.membershipId || m.slug || id || ""),
      membershipDbId: String(m._id || m.id || ""),
      stripePriceId: m.stripePriceId || m.priceId || "",
      glyph: m.glyph || "KC",
      title: m.title || "KnockoutCodes Membership",
      instructor: m.instructor || "KnockoutCodes Academy",
      monthlyPrice,
      yearlyPrice,
      price: billingPeriod === "yearly" ? yearlyPrice : monthlyPrice,
      short:
        m.short ||
        m.description ||
        "Premium membership access built to unlock protected KnockoutCodes course training, structured learning, accountability, and a serious student experience.",
      meta,
      enrolled: m.enrolled || 0,
      rating: m.rating || 0,
      badgeLeft: m.badgeLeft || "KnockoutCodes",
      badgeRight: m.badgeRight || "Membership",
      highlight: Boolean(m.highlight),
    };
  }, [membership, id, billingPeriod]);

  const checkoutId = normalizePlanSlug(
  view.membershipId || view.accessLevel || view.id
  );
  
const isStarting =
  !loading && normalizePlanSlug(startingId) === normalizePlanSlug(checkoutId);

const isSwitching =
  !loading && normalizePlanSlug(switchingId) === normalizePlanSlug(checkoutId);

  const isRequired =
    requiredMembershipFromState &&
    normalizePlanSlug(view.id) === normalizePlanSlug(requiredMembershipFromState);

  const activeMembershipId = normalizePlanSlug(mySubscription?.membershipId || "");
  const activeBillingPeriod = String(mySubscription?.billingPeriod || "").toLowerCase();

  const hasActiveSubscription =
    Boolean(mySubscription?.hasSubscription) && Boolean(mySubscription?.isActive);

  const currentMembershipSlug = normalizePlanSlug(
    view.membershipId || view.accessLevel || view.id
  );

  const isCurrentPlan =
    hasActiveSubscription &&
    activeMembershipId === currentMembershipSlug &&
    activeBillingPeriod === billingPeriod;
  
    const handleSubmitReview = useCallback(
  async (event) => {
    event.preventDefault();

    const membershipObjectId =
  membership?._id ||
  (String(membership?.id || "").match(/^[0-9a-fA-F]{24}$/)
    ? membership.id
    : "");

    if (!membershipObjectId) {
      toast?.push?.({
        title: "Membership unavailable",
        description: "This membership cannot be reviewed right now.",
        variant: "danger",
      });
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/memberships/${id}`,
          billingPeriod,
        },
      });
      return;
    }

    if (!hasActiveSubscription || !isCurrentPlan) {
      toast?.push?.({
        title: "Review locked",
        description:
          "You must have this active membership before leaving a review.",
        variant: "danger",
      });
      return;
    }

    const cleanComment = String(reviewForm.comment || "").trim();

    if (cleanComment.length < 10) {
      toast?.push?.({
        title: "Review too short",
        description: "Please write at least 10 characters.",
        variant: "danger",
      });
      return;
    }

    setReviewSubmitting(true);

    try {
      await createReview({
        reviewType: "membership",
        membershipId: membershipObjectId,
        rating: Number(reviewForm.rating || 5),
        title: String(reviewForm.title || "").trim(),
        comment: cleanComment,
      });

      setReviewForm({
        rating: 5,
        title: "",
        comment: "",
      });

      await fetchMembershipReviews();

      toast?.push?.({
        title: "Review submitted",
        description:
          "Your membership review was submitted and will appear after admin approval.",
        variant: "success",
      });
    } catch (err) {
      toast?.push?.({
        title: "Review failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Could not submit your review.",
        variant: "danger",
      });
    } finally {
      setReviewSubmitting(false);
    }
  },
  [membership?._id, membership?.id, isAuthenticated, hasActiveSubscription, isCurrentPlan, reviewForm.comment, reviewForm.rating, reviewForm.title, toast, navigate, id, billingPeriod, fetchMembershipReviews]
);

  const startStripeCheckout = useCallback(async () => {
    try {
      if (!checkoutId) return;

      dispatch({
        type: MEMBERSHIP_ACTIONS.START_CHECKOUT,
        payload: checkoutId,
      });

      const res = await createMembershipCheckoutSession({
        membershipId: checkoutId,
        priceId: view.stripePriceId || undefined,
        courseId: courseIdFromState || "",
        billingPeriod,
        kind: "membership",
      });

      const checkoutUrl = resolveCheckoutUrl(res);

      if (!checkoutUrl) {
        throw new Error("Stripe checkout URL missing from API response.");
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      const status = err?.response?.status;

      dispatch({ type: MEMBERSHIP_ACTIONS.STOP_CHECKOUT });

      if (status === 401 || status === 403) {
        navigate("/login", {
          state: {
            from: `/memberships/${view.id}`,
            courseId: courseIdFromState,
            requiredMembershipId: requiredMembershipFromState,
            billingPeriod,
          },
        });
        return;
      }

      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_ERROR,
        payload:
          err?.response?.data?.message ||
          err?.message ||
          "Checkout failed. Please try again.",
      });
    }
  }, [
    checkoutId,
    dispatch,
    navigate,
    view.id,
    view.stripePriceId,
    courseIdFromState,
    requiredMembershipFromState,
    billingPeriod,
  ]);

  const handleJoin = useCallback(
    (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (isAdmin) {
  toast?.push?.({
    title: "Admins cannot subscribe",
    description:
      "Admin accounts are blocked from buying courses, products, or memberships.",
    variant: "danger",
  });
  return;
}

      if (!isAuthenticated) {
        navigate("/login", {
          state: {
            from: `/memberships/${view.id}`,
            courseId: courseIdFromState,
            requiredMembershipId: requiredMembershipFromState,
            billingPeriod,
          },
        });
        return;
      }

      startStripeCheckout();
    },
    [isAdmin, isAuthenticated, startStripeCheckout, toast, navigate, view.id, courseIdFromState, requiredMembershipFromState, billingPeriod]
  );

  const handleSwitchPlan = useCallback(async () => {
    if (isAdmin) {
  toast?.push?.({
    title: "Admins cannot manage subscriptions",
    description:
      "Admin accounts cannot subscribe, switch, or purchase memberships.",
    variant: "danger",
  });
  return;
    }
    
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: `/memberships/${view.id}`,
          courseId: courseIdFromState,
          requiredMembershipId: requiredMembershipFromState,
          billingPeriod,
        },
      });
      return;
    }

    try {
      dispatch({
        type: MEMBERSHIP_ACTIONS.START_SWITCH,
        payload: checkoutId,
      });

      await switchMembershipPlan({
        membershipId: checkoutId,
        billingPeriod,
      });

      await fetchMySubscription();
    } catch (err) {
      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_ERROR,
        payload:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to switch membership.",
      });
    } finally {
      dispatch({ type: MEMBERSHIP_ACTIONS.STOP_SWITCH });
    }
  }, [isAdmin, isAuthenticated, toast, navigate, view.id, courseIdFromState, requiredMembershipFromState, billingPeriod, dispatch, checkoutId, fetchMySubscription]);

  const handleCancelMembership = useCallback(async () => {
    if (mySubscription?.cancelAtPeriodEnd) return;

    const ok = window.confirm(
      "Cancel membership? Your access remains active until your billing period ends."
    );

    if (!ok) return;

    try {
      dispatch({ type: MEMBERSHIP_ACTIONS.START_CANCEL });

      await cancelMyMembership();
      await fetchMySubscription();
    } catch (err) {
      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_ERROR,
        payload:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to cancel membership.",
      });
    } finally {
      dispatch({ type: MEMBERSHIP_ACTIONS.STOP_CANCEL });
    }
  }, [dispatch, fetchMySubscription, mySubscription?.cancelAtPeriodEnd]);

  const renderMainAction = () => {
    if (authLoading) {
      return (
        <PrimaryBtn type="button" disabled>
          Checking...
        </PrimaryBtn>
      );
    }

    if (isCurrentPlan) {
      return (
        <PrimaryBtn type="button" disabled>
          Current Plan
        </PrimaryBtn>
      );
    }

    if (hasActiveSubscription) {
      return (
        <PrimaryBtn type="button" onClick={handleSwitchPlan} disabled={isSwitching}>
          {isSwitching ? "Switching..." : `Switch to ${billingPeriod}`}
        </PrimaryBtn>
      );
    }

    return (
      <PrimaryBtn type="button" onClick={handleJoin} disabled={isStarting}>
        {isStarting ? (
          <ButtonContent>
            <Spinner /> Redirecting
          </ButtonContent>
        ) : (
          `Join ${billingPeriod}`
        )}
      </PrimaryBtn>
    );
  };

  return (
    <Page>
      <Wrap>
        <TopBar>
          <BackBtn type="button" onClick={() => navigate(-1)}>
            ← Back
          </BackBtn>

          <TopPills>
            <Pill>Secure Stripe Checkout</Pill>
            <Pill>Protected Access</Pill>
            {hasActiveSubscription ? (
              <Pill>
                Active: {mySubscription?.membershipId} /{" "}
                {mySubscription?.billingPeriod || activeBillingPeriod}
              </Pill>
            ) : null}
          </TopPills>
        </TopBar>

        {loading ? (
          <StateCard>
            <SpinnerDark />
            <StateTitle>Loading membership...</StateTitle>
            <StateText>Preparing your premium membership room.</StateText>
          </StateCard>
        ) : !membership ? (
          <StateCard>
            <StateTitle>Membership not found</StateTitle>
            <StateText>This membership could not be loaded.</StateText>
            <OutlineBtn type="button" onClick={() => navigate("/memberships", { replace: true })}>
              Back to Memberships
            </OutlineBtn>
          </StateCard>
        ) : (
          <>
            <HeroCard $highlight={view.highlight || isRequired || isCurrentPlan}>
              <HeroLeft>
                <Eyebrow>{view.badgeLeft} • Membership Detail</Eyebrow>
                <Title>{view.title}</Title>

                <Sub>{view.short}</Sub>

                <BillingBox>
                  <BillingButton
                    type="button"
                    $active={billingPeriod === "monthly"}
                    onClick={() => setBillingPeriod("monthly")}
                  >
                    Monthly
                  </BillingButton>

                  <BillingButton
                    type="button"
                    $active={billingPeriod === "yearly"}
                    onClick={() => setBillingPeriod("yearly")}
                  >
                    Yearly
                  </BillingButton>
                </BillingBox>

                <PillRow>
                  <Pill>Instructor: {view.instructor}</Pill>
                  <Pill>Price: {view.price}</Pill>
                  <Pill>Rating: {Number(view.rating || 0).toFixed(1)}</Pill>
                  <Pill>Students: {formatEnrolled(view.enrolled)}</Pill>
                  {isCurrentPlan ? <RecommendedPill>Current Plan</RecommendedPill> : null}
                  {isRequired ? <RecommendedPill>Required for selected course</RecommendedPill> : null}
                  {!!error && !isStarting ? <ErrorPill>{String(error)}</ErrorPill> : null}
                </PillRow>

                <Actions>
                  {renderMainAction()}

                  <OutlineBtn type="button" onClick={() => navigate("/memberships", { replace: true })}>
                    All Memberships
                  </OutlineBtn>
                </Actions>
              </HeroLeft>

              <HeroRight>
                <Glyph>{view.glyph}</Glyph>
                <AccessCard>
                  <span>Access Level</span>
                  <strong>{view.badgeRight}</strong>
                </AccessCard>
              </HeroRight>
            </HeroCard>

            <ContentGrid>
              <MainColumn>
                <InfoCard>
                  <SectionLabel>What You Unlock</SectionLabel>
                  <SectionTitle>Membership Benefits</SectionTitle>

                  <FeatureGrid>
                    {view.meta.map((item, i) => (
                      <FeatureItem key={`${checkoutId}-meta-${i}`}>
                        <Check>✓</Check>
                        <span>{item}</span>
                      </FeatureItem>
                    ))}
                  </FeatureGrid>
                    </InfoCard>
                    
                    <InfoCard>
  <SectionLabel>Member Proof</SectionLabel>
  <SectionTitle>Membership Reviews</SectionTitle>

  <ReviewSummary>
    <strong>
      {reviewStats.averageRating > 0
        ? `★ ${reviewStats.averageRating.toFixed(1)}`
        : "New"}
    </strong>
    <span>
      {reviewStats.totalReviews > 0
        ? `${reviewStats.totalReviews} approved review${
            reviewStats.totalReviews === 1 ? "" : "s"
          }`
        : "No approved reviews yet."}
    </span>
  </ReviewSummary>

  {isCurrentPlan ? (
    <ReviewForm onSubmit={handleSubmitReview}>
      <ReviewGrid>
        <ReviewField>
          <label htmlFor="rating">Rating</label>
          <select
            id="rating"
            name="rating"
            value={reviewForm.rating}
            onChange={handleReviewChange}
            disabled={reviewSubmitting}
          >
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </ReviewField>

        <ReviewField>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            value={reviewForm.title}
            onChange={handleReviewChange}
            maxLength={80}
            placeholder="Example: Worth every dollar"
            disabled={reviewSubmitting}
          />
        </ReviewField>
      </ReviewGrid>

      <ReviewField>
        <label htmlFor="comment">Review</label>
        <textarea
          id="comment"
          name="comment"
          value={reviewForm.comment}
          onChange={handleReviewChange}
          minLength={10}
          maxLength={1000}
          placeholder="Share what this membership helped you improve..."
          disabled={reviewSubmitting}
          required
        />
      </ReviewField>

      <PrimaryBtn type="submit" disabled={reviewSubmitting}>
        {reviewSubmitting ? "Submitting..." : "Submit Review"}
      </PrimaryBtn>

      <ReviewNote>
        Reviews appear publicly after admin approval.
      </ReviewNote>
    </ReviewForm>
  ) : (
    <ReviewLock>
      You can review this membership after you become an active member of this
      plan.
    </ReviewLock>
  )}

  <ReviewList>
    {reviewLoading ? (
      <ReviewLock>Loading reviews...</ReviewLock>
    ) : reviews.length > 0 ? (
      reviews.map((review) => (
        <ReviewCard key={review._id}>
          <strong>
            ★ {Number(review.rating || 0).toFixed(1)}{" "}
            {review.title ? `— ${review.title}` : ""}
          </strong>
          <p>{review.comment}</p>
          <span>
            {review.user?.name || "Verified Member"} •{" "}
            {review.createdAt
              ? new Date(review.createdAt).toLocaleDateString()
              : "Recent"}
          </span>
        </ReviewCard>
      ))
    ) : (
      <ReviewLock>No approved reviews yet.</ReviewLock>
    )}
  </ReviewList>
</InfoCard>

                <InfoCard>
                  <SectionLabel>How It Works</SectionLabel>
                  <SectionTitle>Protected Professional Flow</SectionTitle>

                  <StepGrid>
                    <Step>
                      <strong>01</strong>
                      <span>Choose monthly or yearly billing.</span>
                    </Step>

                    <Step>
                      <strong>02</strong>
                      <span>Login or create your secure account.</span>
                    </Step>

                    <Step>
                      <strong>03</strong>
                      <span>Complete payment through Stripe checkout.</span>
                    </Step>

                    <Step>
                      <strong>04</strong>
                      <span>Backend verifies payment and unlocks access.</span>
                    </Step>
                  </StepGrid>
                </InfoCard>
              </MainColumn>

              <SideColumn>
                <CheckoutCard>
                  <SectionLabel>Checkout Summary</SectionLabel>
                  <SummaryTitle>{view.title}</SummaryTitle>

                  <SummaryPrice>{view.price}</SummaryPrice>
                  <SummaryNote>
                    {billingPeriod === "yearly"
                      ? "Yearly membership billing selected."
                      : "Monthly membership billing selected."}
                  </SummaryNote>

                  <SummaryList>
                    <li>Login required before checkout</li>
                    <li>Stripe verifies the payment</li>
                    <li>Access unlocks only after server confirmation</li>
                    <li>Membership can be checked before protected course access</li>
                  </SummaryList>

                  {hasActiveSubscription ? (
                    <OutlineBtn
                      type="button"
                      onClick={handleCancelMembership}
                      disabled={canceling || Boolean(mySubscription?.cancelAtPeriodEnd)}
                      style={{ width: "100%", marginBottom: "14px" }}
                    >
                      {canceling
                        ? "Canceling..."
                        : mySubscription?.cancelAtPeriodEnd
                        ? "Membership Ends At Billing End"
                        : "Cancel Membership"}
                    </OutlineBtn>
                  ) : null}

                  {renderMainAction()}
                </CheckoutCard>
              </SideColumn>
            </ContentGrid>
          </>
        )}
      </Wrap>
    </Page>
  );
};

/* =========================
   Styles
========================= */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

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

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const TopPills = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const BackBtn = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  font-weight: 950;
  cursor: pointer;
`;

const HeroCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) 340px;
  gap: 22px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    160deg,
    rgba(61, 38, 26, 0.84),
    rgba(0, 0, 0, 0.7)
  );
  border: 1px solid
    ${({ $highlight }) =>
      $highlight ? "rgba(214, 182, 159, 0.72)" : "rgba(255, 249, 242, 0.12)"};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: clamp(24px, 4vw, 44px);
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const HeroLeft = styled.div``;

const HeroRight = styled.aside`
  border-radius: ${({ theme }) => theme.radius.xl};
  min-height: 320px;
  display: grid;
  place-items: center;
  gap: 16px;
  padding: 22px;
  background: radial-gradient(
      circle at 20% 10%,
      rgba(214, 182, 159, 0.22),
      transparent 48%
    ),
    rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.16);
`;

const Glyph = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 32px;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.36);
  box-shadow: ${({ theme }) => theme.shadow.hard};
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  font-size: 28px;
  letter-spacing: 0.14em;
`;

const AccessCard = styled.div`
  width: 100%;
  text-align: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 18px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 249, 242, 0.1);

  span {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
    font-weight: 950;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 22px;
  }
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
  font-size: clamp(2.3rem, 5vw, 5rem);
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

const Sub = styled.p`
  max-width: 820px;
  margin: 18px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.84;
  line-height: 1.75;
`;

const BillingBox = styled.div`
  width: fit-content;
  margin-top: 22px;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(214, 182, 159, 0.22);
  display: inline-flex;
  gap: 6px;
`;

const BillingButton = styled.button`
  min-width: 112px;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.black : theme.colors.ivory};
  background: ${({ $active, theme }) =>
    $active
      ? `linear-gradient(130deg, ${theme.colors.lightBrown}, ${theme.colors.ivory})`
      : "transparent"};
`;

const PillRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
`;

const Pill = styled.span`
  padding: 8px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 850;
  font-size: 12px;
`;

const RecommendedPill = styled(Pill)`
  background: rgba(214, 182, 159, 0.18);
  border-color: rgba(214, 182, 159, 0.62);
`;

const ErrorPill = styled(Pill)`
  border-color: rgba(255, 80, 80, 0.55);
  color: #ffdede;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 22px;
`;

const PrimaryBtn = styled.button`
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 13px 16px;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-size: 12.5px;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
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
  padding: 13px 16px;
  font-weight: 950;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  font-size: 12.5px;
  border: 1px solid rgba(255, 249, 242, 0.5);
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
`;

const ContentGrid = styled.section`
  margin-top: 22px;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 360px;
  gap: 22px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const MainColumn = styled.div`
  display: grid;
  gap: 18px;
`;

const SideColumn = styled.aside``;

const InfoCard = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    160deg,
    rgba(61, 38, 26, 0.72),
    rgba(0, 0, 0, 0.54)
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
  padding: 22px;
`;

const SectionLabel = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 11px;
  font-weight: 950;
`;

const SectionTitle = styled.h2`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.4rem, 2.5vw, 2.3rem);
  font-weight: 950;
`;

const FeatureGrid = styled.div`
  display: grid;
  gap: 10px;
`;

const FeatureItem = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 13px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.14);

  span {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.86;
    line-height: 1.55;
  }
`;

const Check = styled.strong`
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const StepGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const Step = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.14);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 20px;
    margin-bottom: 8px;
  }

  span {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.82;
    font-size: 13px;
    line-height: 1.55;
  }
`;

const CheckoutCard = styled.section`
  position: sticky;
  top: 92px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: linear-gradient(
    160deg,
    rgba(61, 38, 26, 0.86),
    rgba(0, 0, 0, 0.7)
  );
  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 22px;
`;

const SummaryTitle = styled.h3`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 22px;
  font-weight: 950;
`;

const SummaryPrice = styled.div`
  font-size: 30px;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const SummaryNote = styled.p`
  margin: 6px 0 14px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.66;
  font-size: 13px;
`;

const SummaryList = styled.ul`
  padding: 0;
  margin: 0 0 18px;
  list-style: none;
  display: grid;
  gap: 9px;

  li {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.82;
    font-size: 13px;
    line-height: 1.45;

    &::before {
      content: "✓";
      color: ${({ theme }) => theme.colors.lightBrown};
      font-weight: 950;
      margin-right: 8px;
    }
  }
`;

const ButtonContent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

const SpinnerDark = styled.span`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid rgba(255, 249, 242, 0.14);
  border-top-color: ${({ theme }) => theme.colors.lightBrown};
  display: inline-block;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const StateCard = styled.section`
  max-width: 620px;
  margin: 90px auto 0;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 34px 22px;
  text-align: center;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const StateTitle = styled.h2`
  margin: 12px 0 8px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const StateText = styled.p`
  margin: 0 0 16px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
`;

const ReviewSummary = styled.div`
  margin-bottom: 16px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.16);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 22px;
    font-weight: 950;
  }

  span {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.82;
    font-weight: 800;
  }
`;

const ReviewForm = styled.form`
  display: grid;
  gap: 12px;
  margin-bottom: 18px;
`;

const ReviewGrid = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ReviewField = styled.div`
  display: grid;
  gap: 7px;

  label {
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  input,
  select,
  textarea {
    width: 100%;
    border-radius: ${({ theme }) => theme.radius.md};
    border: 1px solid rgba(214, 182, 159, 0.24);
    background: rgba(0, 0, 0, 0.32);
    color: ${({ theme }) => theme.colors.ivory};
    padding: 12px;
    outline: none;
  }

  textarea {
    min-height: 130px;
    resize: vertical;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: rgba(214, 182, 159, 0.72);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const ReviewNote = styled.p`
  margin: -4px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.62;
  font-size: 12px;
`;

const ReviewLock = styled.div`
  padding: 13px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.14);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 13px;
  line-height: 1.55;
`;

const ReviewList = styled.div`
  display: grid;
  gap: 10px;
`;

const ReviewCard = styled.article`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.14);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-weight: 950;
    margin-bottom: 7px;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.84;
    line-height: 1.6;
  }

  span {
    display: block;
    margin-top: 9px;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.54;
    font-size: 12px;
  }
`;