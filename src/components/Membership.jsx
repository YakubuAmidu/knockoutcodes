import { useEffect, useMemo, useCallback, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MEMBERSHIP_ACTIONS } from "../reducers/memberships/membershipActionTypes";
import {
  getMemberships,
  getMySubscription,
  switchMembershipPlan,
  cancelMyMembership,
  createMembershipCheckoutSession,
} from "../lib/apiClient";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const normalizePlanSlug = (raw) => {
  const value = String(raw || "")
    .toLowerCase()
    .trim();

  if (!value) return "";

  if (value === "beginner" || value.includes("foundation")) {
    return "foundations";
  }

  if (value === "intermediate" || value.includes("development")) {
    return "development";
  }

  if (
    value === "advance" ||
    value === "advanced" ||
    value.includes("performance")
  ) {
    return "performance";
  }

  if (
    value === "complete" ||
    value.includes("elite") ||
    value.includes("fight-camp") ||
    value.includes("fight camp")
  ) {
    return "elite-fight-camp";
  }

  return value;
};

const getPlanLabel = (raw) => {
  const level = normalizePlanSlug(raw);

  if (level === "foundations") return "Foundations";
  if (level === "development") return "Development";
  if (level === "performance") return "Performance";
  if (level === "elite-fight-camp") return "Elite Fight Camp";

  return raw || "Membership";
};

const formatEnrolled = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number <= 0) return "New";
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M+`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K+`;

  return `${Math.floor(number)}`;
};

const starText = (rating, reviewCount = 0) => {
  const number = Number(rating || 0);
  const reviews = Number(reviewCount || 0);

  if (!Number.isFinite(number) || number <= 0 || reviews <= 0) {
    return "New";
  }

  return `★ ${number.toFixed(1)}`;
};

const getArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const getSubscriptionPayload = (payload) => {
  if (payload?.data?.data) return payload.data.data;
  if (payload?.data) return payload.data;
  if (payload?.subscription) return payload.subscription;
  return payload || {};
};

const resolveCheckoutUrl = (res) => {
  const payload = res?.data ?? res ?? {};

  const url =
    payload?.url ||
    payload?.checkoutUrl ||
    payload?.checkoutURL ||
    payload?.redirectUrl ||
    payload?.redirectURL ||
    payload?.data?.url ||
    payload?.data?.checkoutUrl ||
    payload?.data?.checkoutURL;

  if (!url) return "";

  const cleanUrl = String(url).trim();

  if (/^https?:\/\//i.test(cleanUrl)) return cleanUrl;
  if (cleanUrl.startsWith("/")) return `${window.location.origin}${cleanUrl}`;

  return "";
};

const Memberships = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();

  const { isAuthenticated, user, currentUser, authUser } = useAuth();

  const loggedInUser = user || currentUser || authUser || {};

  const isAdmin =
    ["admin", "superadmin"].includes(
      String(
        loggedInUser?.role || loggedInUser?.user?.role || "",
      ).toLowerCase(),
    ) || loggedInUser?.isAdmin === true;

  const [billingPeriod, setBillingPeriod] = useState("monthly");

  const {
    items: memberships,
    loading,
    error,
    startingId,
    switchingId,
    canceling,
    mySubscription,
    mySubscriptionLoading,
  } = useSelector((state) => state.membership);

  const courseIdFromState = location?.state?.courseId || "";
  const requiredMembershipFromState =
    location?.state?.requiredMembershipId || "";
  const fromPath = location?.state?.from || "";

  const activeMembershipId = normalizePlanSlug(mySubscription?.membershipId);
  const activeBillingPeriod = String(
    mySubscription?.billingPeriod || "",
  ).toLowerCase();

  const hasActiveSubscription =
    Boolean(mySubscription?.hasSubscription) &&
    Boolean(mySubscription?.isActive);

  const fetchMemberships = useCallback(async () => {
    dispatch({ type: MEMBERSHIP_ACTIONS.FETCH_START });

    try {
      const result = await getMemberships("published=true&sort=enrolled");

      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_SUCCESS,
        payload: getArrayPayload(result),
      });
    } catch (err) {
      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_ERROR,
        payload:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load memberships.",
      });
    }
  }, [dispatch]);

  const fetchMySubscription = useCallback(async () => {
    if (!isAuthenticated) return;

    dispatch({ type: MEMBERSHIP_ACTIONS.FETCH_MY_SUBSCRIPTION_START });

    try {
      const subscription = await getMySubscription();

      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_MY_SUBSCRIPTION_SUCCESS,
        payload: getSubscriptionPayload(subscription),
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
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    fetchMemberships();
    fetchMySubscription();
  }, [fetchMemberships, fetchMySubscription]);

  const normalized = useMemo(() => {
    const list = Array.isArray(memberships) ? memberships : [];

    if (loading && list.length === 0) {
      return Array.from({ length: 4 }).map((_, index) => ({
        __skeleton: true,
        id: `skeleton-${index}`,
        membershipId: `skeleton-${index}`,
        title: "Loading membership...",
        instructor: "KnockoutCodes Academy",
        price: "Loading...",
        monthlyPrice: "Loading...",
        yearlyPrice: "Loading...",
        short: "Preparing membership details...",
        rating: 0,
        enrolled: 0,
        reviewCount: 0,
        meta: [
          "Exact level-specific access",
          "Structured premium training",
          "Serious student progression",
        ],
      }));
    }

    return list.map((membership) => {
      const membershipId = normalizePlanSlug(
        membership?.membershipId || membership?.accessLevel,
      );

      const accessLevel = normalizePlanSlug(
        membership?.accessLevel || membership?.membershipId,
      );

      const monthlyPrice =
        membership?.monthlyPriceLabel ||
        membership?.monthlyPrice ||
        membership?.priceLabel ||
        membership?.price ||
        "$0 / month";

      const yearlyPrice =
        membership?.yearlyPriceLabel ||
        membership?.annualPriceLabel ||
        membership?.yearlyPrice ||
        membership?.annualPrice ||
        "Yearly option";

      const id = String(
        membership?.slug ||
          membership?.membershipId ||
          membership?.id ||
          membership?._id ||
          "",
      );

      return {
        id,
        membershipId,
        accessLevel,
        membershipDbId: String(membership?._id || membership?.id || ""),
        stripePriceId: membership?.stripePriceId || membership?.priceId || "",
        glyph: membership?.glyph || "KC",
        badgeLeft: membership?.badgeLeft || "KnockoutCodes",
        badgeRight: membership?.badgeRight || "Membership",
        highlight: Boolean(membership?.highlight || membership?.isFeatured),
        title: membership?.title || "KnockoutCodes Membership",
        instructor: membership?.instructor || "KnockoutCodes Academy",
        monthlyPrice,
        yearlyPrice,
        price: billingPeriod === "yearly" ? yearlyPrice : monthlyPrice,
        rating: Number(
          membership?.ratingAverage ||
            membership?.averageRating ||
            membership?.rating ||
            0,
        ),
        enrolled: Number(membership?.enrolled || membership?.studentCount || 0),
        reviewCount: Number(
          membership?.ratingCount ||
            membership?.reviewCount ||
            membership?.totalReviews ||
            0,
        ),
        short:
          membership?.short ||
          membership?.description ||
          "A premium boxing training membership built for disciplined students who want clear structure, serious skill development, and exact access to the level they are training for.",
        meta: Array.isArray(membership?.meta)
          ? membership.meta
          : [
              "Exact level-specific course access",
              "Monthly or yearly billing options",
              "Structured premium boxing progression",
            ],
      };
    });
  }, [memberships, loading, billingPeriod]);

  const handleJoin = useCallback(
    async (membership) => {
      if (!membership || membership.__skeleton) return;

      const membershipId = normalizePlanSlug(
        membership.membershipId ||
          membership.accessLevel ||
          membership.membershipDbId,
      );

      if (!membershipId) {
        toast?.push?.({
          title: "Membership unavailable",
          description: "This membership is missing its access level.",
          variant: "danger",
        });
        return;
      }

      if (!isAuthenticated) {
        navigate("/login", {
          state: {
            from: "/memberships",
            membershipId,
            courseId: courseIdFromState,
            requiredMembershipId: requiredMembershipFromState,
            billingPeriod,
          },
        });
        return;
      }

      if (isAdmin) {
        toast?.push?.({
          title: "Admins cannot subscribe",
          description:
            "Admin accounts are blocked from buying courses, products, or memberships. Please use a regular user account.",
          variant: "danger",
        });
        return;
      }

      dispatch({
        type: MEMBERSHIP_ACTIONS.START_CHECKOUT,
        payload: membershipId,
      });

      try {
        const res = await createMembershipCheckoutSession({
          membershipId,
          billingPeriod,
          courseId: courseIdFromState || "",
        });

        const checkoutUrl = resolveCheckoutUrl(res);

        if (!checkoutUrl) {
          throw new Error("Stripe checkout URL was not returned.");
        }

        window.location.href = checkoutUrl;
      } catch (err) {
        dispatch({
          type: MEMBERSHIP_ACTIONS.FETCH_ERROR,
          payload:
            err?.response?.data?.message ||
            err?.message ||
            "Unknown error occurred",
        });

        toast?.push?.({
          title: "Checkout failed",
          description:
            err?.response?.data?.message ||
            err?.message ||
            "Unable to open Stripe checkout.",
          variant: "danger",
        });
      } finally {
        dispatch({ type: MEMBERSHIP_ACTIONS.STOP_CHECKOUT });
      }
    },
    [
      isAuthenticated,
      isAdmin,
      dispatch,
      navigate,
      courseIdFromState,
      requiredMembershipFromState,
      billingPeriod,
      toast,
    ],
  );

  const handleSwitchPlan = useCallback(
    async (membership) => {
      if (!membership || membership.__skeleton) return;

      if (isAdmin) {
        toast?.push?.({
          title: "Admins cannot manage subscriptions",
          description:
            "Admin accounts cannot subscribe, switch, or purchase memberships.",
          variant: "danger",
        });
        return;
      }

      const membershipId = normalizePlanSlug(
        membership.membershipId ||
          membership.accessLevel ||
          membership.membershipDbId,
      );

      if (!membershipId) {
        toast?.push?.({
          title: "Membership unavailable",
          description: "This membership is missing its access level.",
          variant: "danger",
        });
        return;
      }

      dispatch({
        type: MEMBERSHIP_ACTIONS.START_SWITCH,
        payload: membershipId,
      });

      try {
        await switchMembershipPlan({
          membershipId,
          billingPeriod,
        });

        await fetchMySubscription();
        await fetchMemberships();

        toast?.push?.({
          title: "Membership updated",
          description: `Your plan was switched to ${membership.title}.`,
          variant: "success",
        });
      } catch (err) {
        dispatch({
          type: MEMBERSHIP_ACTIONS.FETCH_ERROR,
          payload:
            err?.response?.data?.message ||
            err?.message ||
            "Failed to switch membership.",
        });

        toast?.push?.({
          title: "Switch failed",
          description:
            err?.response?.data?.message ||
            err?.message ||
            "Failed to switch membership.",
          variant: "danger",
        });
      } finally {
        dispatch({ type: MEMBERSHIP_ACTIONS.STOP_SWITCH });
      }
    },
    [
      isAdmin,
      dispatch,
      toast,
      billingPeriod,
      fetchMySubscription,
      fetchMemberships,
    ],
  );

  const handleCancelMembership = useCallback(async () => {
    if (isAdmin) {
      toast?.push?.({
        title: "Admins cannot manage subscriptions",
        description:
          "Admin accounts cannot subscribe, switch, cancel, or purchase memberships.",
        variant: "danger",
      });
      return;
    }

    const ok = window.confirm(
      "Cancel membership? Your access will stay active until the end of your billing period.",
    );

    if (!ok) return;

    try {
      dispatch({ type: MEMBERSHIP_ACTIONS.START_CANCEL });

      await cancelMyMembership();
      await fetchMySubscription();

      toast?.push?.({
        title: "Membership cancellation scheduled",
        description:
          "Your access should remain active until the end of the billing period.",
        variant: "success",
      });
    } catch (err) {
      dispatch({
        type: MEMBERSHIP_ACTIONS.FETCH_ERROR,
        payload:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to cancel membership.",
      });

      toast?.push?.({
        title: "Cancel failed",
        description:
          err?.response?.data?.message ||
          err?.message ||
          "Failed to cancel membership.",
        variant: "danger",
      });
    } finally {
      dispatch({ type: MEMBERSHIP_ACTIONS.STOP_CANCEL });
    }
  }, [dispatch, fetchMySubscription, isAdmin, toast]);

  const hasPlans = normalized.some((plan) => !plan.__skeleton);

  return (
    <PageWrap>
      <Inner>
        <Hero>
          <Eyebrow>KnockoutCodes Memberships</Eyebrow>
          <Title>Train Like You Belong Here.</Title>
          <Subtitle>
            Choose the exact membership level you want to train at. Every plan
            is its own lane with its own course access, structure, progression,
            and premium student experience. No bloated bundles. No confusing
            overlap. Just clean, serious boxing education built for real
            improvement.
          </Subtitle>

          <HeroGrid>
            <HeroPoint>
              <strong>Protected Access</strong>
              <span>
                Courses unlock only after successful verified payment and active
                membership status.
              </span>
            </HeroPoint>

            <HeroPoint>
              <strong>Real Student Proof</strong>
              <span>
                Ratings and student counts come from real database activity, not
                fake card numbers.
              </span>
            </HeroPoint>

            <HeroPoint>
              <strong>Level-Specific Access</strong>
              <span>
                Foundations, Development, Performance, and Elite Fight Camp are
                separate memberships. Each one unlocks its own exact training
                level only.
              </span>
            </HeroPoint>
          </HeroGrid>

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

          <StatusBar>
            <StatusPill>Choose your exact training level</StatusPill>
            <StatusPill>
              Activate access through secure Stripe checkout
            </StatusPill>
            <StatusPill>Unlock the matching course library</StatusPill>
          </StatusBar>

          <InfoBar>
            <InlineBtn
              type="button"
              onClick={fetchMemberships}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh Plans"}
            </InlineBtn>

            <StatusPill>
              Showing{" "}
              {loading
                ? "..."
                : normalized.filter((item) => !item.__skeleton).length}{" "}
              memberships
            </StatusPill>

            {mySubscriptionLoading ? (
              <StatusPill>Checking subscription...</StatusPill>
            ) : null}

            {hasActiveSubscription ? (
              <StatusPill>
                Active Membership: {getPlanLabel(mySubscription?.membershipId)}{" "}
                /{" "}
                {mySubscription?.billingPeriod ||
                  activeBillingPeriod ||
                  "billing"}
              </StatusPill>
            ) : null}

            {fromPath ? (
              <InlineBtn type="button" onClick={() => navigate(fromPath)}>
                Back
              </InlineBtn>
            ) : null}

            {!loading && error ? <ErrorPill>{String(error)}</ErrorPill> : null}
          </InfoBar>
        </Hero>

        <TrustStrip>
          <TrustItem>
            <strong>1</strong>
            <span>Choose your level</span>
          </TrustItem>

          <TrustItem>
            <strong>2</strong>
            <span>Pick monthly or yearly billing</span>
          </TrustItem>

          <TrustItem>
            <strong>3</strong>
            <span>Complete secure Stripe checkout</span>
          </TrustItem>

          <TrustItem>
            <strong>4</strong>
            <span>Unlock the exact training library</span>
          </TrustItem>
        </TrustStrip>

        {!loading && !hasPlans ? (
          <EmptyState>
            <strong>No memberships available yet.</strong>
            <span>
              Publish a membership from the admin dashboard and it will appear
              here.
            </span>
          </EmptyState>
        ) : null}

        <Grid>
          {normalized.map((plan, index) => {
            const key = plan?.id || `membership-${index}`;
            const planMembershipId = normalizePlanSlug(plan.membershipId);

            const isRequired =
              requiredMembershipFromState &&
              (normalizePlanSlug(plan.id) ===
                normalizePlanSlug(requiredMembershipFromState) ||
                planMembershipId ===
                  normalizePlanSlug(requiredMembershipFromState));

            const isCurrentPlan =
              hasActiveSubscription && activeMembershipId === planMembershipId;

            const isCurrentBillingPeriod =
              activeBillingPeriod === billingPeriod;

            const isSwitching = switchingId === planMembershipId;
            const isStarting = startingId === planMembershipId;

            const shouldDisableJoin =
              plan.__skeleton || isStarting || isCurrentPlan;

            return (
              <Card
                key={key}
                $highlight={plan.highlight || isRequired || isCurrentPlan}
                aria-busy={plan?.__skeleton ? "true" : "false"}
              >
                <ThumbWrap>
                  <Thumb>
                    <HeroGlyph>{plan?.glyph || "KC"}</HeroGlyph>
                    <ThumbText>
                      <span>{plan.badgeLeft}</span>
                      <strong>{plan.title}</strong>
                    </ThumbText>
                  </Thumb>

                  <BadgeRow>
                    <Badge>
                      {isCurrentPlan
                        ? "Current Plan"
                        : isRequired
                          ? "Required"
                          : plan.badgeLeft}
                    </Badge>

                    <BadgeRightGroup>
                      {plan.highlight ? (
                        <BestSellerBadge>Top Choice</BestSellerBadge>
                      ) : null}
                      <Badge>{plan.badgeRight}</Badge>
                    </BadgeRightGroup>
                  </BadgeRow>
                </ThumbWrap>

                <Body>
                  <CardTitle>{plan.title}</CardTitle>

                  <PriceRow>
                    <Price>{plan.price}</Price>
                    <PriceNote>
                      {billingPeriod === "yearly"
                        ? "Billed yearly"
                        : "Billed monthly"}
                    </PriceNote>
                  </PriceRow>

                  <StatsRow>
                    <StatPill>
                      <StatLabel>Coach</StatLabel>
                      <Dot />
                      <StatValue>{plan.instructor}</StatValue>
                    </StatPill>

                    <StatPill>
                      <StatLabel>Rating</StatLabel>
                      <Dot />
                      <StatValue>
                        {plan.__skeleton
                          ? "..."
                          : starText(plan.rating, plan.reviewCount)}
                      </StatValue>
                    </StatPill>

                    <StatPill>
                      <StatLabel>Students</StatLabel>
                      <Dot />
                      <StatValue>
                        {plan.__skeleton
                          ? "..."
                          : formatEnrolled(plan.enrolled)}
                      </StatValue>
                    </StatPill>

                    {Number(plan.reviewCount || 0) > 0 ? (
                      <StatPill>
                        <StatLabel>Reviews</StatLabel>
                        <Dot />
                        <StatValue>{Number(plan.reviewCount || 0)}</StatValue>
                      </StatPill>
                    ) : null}

                    {isCurrentPlan ? (
                      <StatPill>
                        <StatLabel>Status</StatLabel>
                        <Dot />
                        <StatValue>Current Plan</StatValue>
                      </StatPill>
                    ) : null}
                  </StatsRow>

                  <Description>{plan.short}</Description>

                  <FeatureList>
                    {(plan.meta.length
                      ? plan.meta
                      : [
                          "Exact level-specific course access",
                          "Structured boxing progression",
                          "Premium training experience",
                        ]
                    )
                      .slice(0, 5)
                      .map((item, i) => (
                        <li key={`${key}-feature-${i}`}>{item}</li>
                      ))}
                  </FeatureList>

                  <SecurityNote>
                    {isCurrentPlan && isCurrentBillingPeriod
                      ? "You are already subscribed to this membership and billing option. Your access is active."
                      : hasActiveSubscription
                        ? isCurrentPlan
                          ? "You already have this training level. Switching here will update only the billing option for this membership."
                          : "Switching replaces your current active membership with this exact training level through Stripe."
                        : "Choose this membership and complete secure Stripe checkout to activate the matching training library."}
                  </SecurityNote>

                  <Footer>
                    <OutlineButton
                      type="button"
                      disabled={plan.__skeleton}
                      onClick={() =>
                        navigate(`/memberships/${plan.id}`, {
                          state: {
                            membership: plan,
                            courseId: courseIdFromState,
                            requiredMembershipId: requiredMembershipFromState,
                            billingPeriod,
                          },
                        })
                      }
                    >
                      Details
                    </OutlineButton>

                    {hasActiveSubscription ? (
                      isCurrentPlan && isCurrentBillingPeriod ? (
                        <PrimaryButton type="button" disabled>
                          Current Plan
                        </PrimaryButton>
                      ) : (
                        <PrimaryButton
                          type="button"
                          disabled={plan.__skeleton || isSwitching}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleSwitchPlan(plan);
                          }}
                        >
                          {isSwitching
                            ? "Switching..."
                            : isCurrentPlan
                              ? `Switch to ${billingPeriod}`
                              : `Move to ${billingPeriod}`}
                        </PrimaryButton>
                      )
                    ) : (
                      <PrimaryButton
                        type="button"
                        disabled={shouldDisableJoin}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleJoin(plan);
                        }}
                      >
                        {isStarting
                          ? "Opening Stripe..."
                          : `Choose ${billingPeriod}`}
                      </PrimaryButton>
                    )}
                  </Footer>
                </Body>
              </Card>
            );
          })}
        </Grid>

        {hasActiveSubscription ? (
          <InfoBar style={{ marginTop: "28px" }}>
            <StatusPill>
              Current Membership: {getPlanLabel(mySubscription?.membershipId)}
            </StatusPill>

            {mySubscription?.cancelAtPeriodEnd ? (
              <ErrorPill>
                Membership ends on{" "}
                {mySubscription?.currentPeriodEnd
                  ? new Date(
                      mySubscription.currentPeriodEnd,
                    ).toLocaleDateString()
                  : "billing end"}
              </ErrorPill>
            ) : (
              <InlineBtn
                type="button"
                disabled={canceling}
                onClick={handleCancelMembership}
              >
                {canceling ? "Canceling..." : "Cancel Membership"}
              </InlineBtn>
            )}
          </InfoBar>
        ) : null}
      </Inner>
    </PageWrap>
  );
};

export default Memberships;

/* =========================
   Styles
========================= */

const shine = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
`;

const PageWrap = styled.section`
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.22),
      transparent 55%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(61, 38, 26, 0.45),
      ${({ theme }) => theme.colors.black} 70%
    );
  color: ${({ theme }) => theme.colors.white};
  display: flex;
  justify-content: center;
  padding: 90px 16px 70px;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
`;

const Hero = styled.header`
  text-align: center;
  margin-bottom: 28px;
  padding: clamp(28px, 4vw, 52px);
  border-radius: ${({ theme }) => theme.radius.xl};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background: linear-gradient(
    145deg,
    rgba(61, 38, 26, 0.76),
    rgba(0, 0, 0, 0.58)
  );
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Eyebrow = styled.p`
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin: 0 0 12px;
  font-weight: 950;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2.6rem, 6vw, 5.8rem);
  line-height: 0.9;
  font-weight: 950;
  letter-spacing: -0.075em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  font-size: 16px;
  max-width: 850px;
  margin: 18px auto 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.88;
  line-height: 1.75;
`;

const HeroGrid = styled.div`
  margin: 26px auto 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 960px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const HeroPoint = styled.div`
  text-align: left;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.16);

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.ivory};
    font-weight: 950;
    margin-bottom: 6px;
  }

  span {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.72;
    font-size: 13px;
    line-height: 1.55;
  }
`;

const BillingBox = styled.div`
  width: fit-content;
  margin: 26px auto 0;
  padding: 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(214, 182, 159, 0.22);
  display: inline-flex;
  gap: 6px;
`;

const BillingButton = styled.button`
  min-width: 120px;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 11px 16px;
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

const StatusBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
  flex-wrap: wrap;
`;

const StatusPill = styled.span`
  padding: 8px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
  font-weight: 800;
`;

const ErrorPill = styled(StatusPill)`
  border-color: rgba(255, 80, 80, 0.55);
`;

const InfoBar = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const InlineBtn = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: ${({ theme }) => theme.colors.glass};
  color: ${({ theme }) => theme.colors.ivory};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 12px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const TrustStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 26px;

  @media (max-width: 780px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const TrustItem = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 249, 242, 0.1);
  display: flex;
  gap: 10px;
  align-items: center;

  strong {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: ${({ theme }) => theme.colors.lightBrown};
    color: ${({ theme }) => theme.colors.black};
  }

  span {
    color: ${({ theme }) => theme.colors.ivory};
    font-weight: 850;
    font-size: 13px;
  }
`;

const EmptyState = styled.div`
  margin-bottom: 26px;
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.xl};
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(0, 0, 0, 0.32);
  text-align: center;
  color: ${({ theme }) => theme.colors.ivory};

  strong {
    display: block;
    font-size: 18px;
    margin-bottom: 8px;
  }

  span {
    opacity: 0.76;
    font-size: 14px;
  }
`;

const Grid = styled.div`
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
  position: relative;
  background: linear-gradient(
    150deg,
    ${({ theme }) => theme.colors.cocoa},
    ${({ theme }) => theme.colors.darkBrown}
  );
  border-radius: ${({ theme }) => theme.radius.xl};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid
    ${({ $highlight }) =>
      $highlight ? "rgba(214, 182, 159, 0.78)" : "rgba(255, 249, 242, 0.09)"};
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 45%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06),
      transparent
    );
    animation: ${shine} 4.8s linear infinite;
    pointer-events: none;
  }
`;

const ThumbWrap = styled.div`
  position: relative;
  padding-top: 62%;
  background: ${({ theme }) => theme.colors.black};
  overflow: hidden;
`;

const Thumb = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background:
    radial-gradient(
      800px 240px at 15% 10%,
      rgba(214, 182, 159, 0.22),
      transparent 55%
    ),
    linear-gradient(160deg, rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0.94));
`;

const HeroGlyph = styled.div`
  width: 92px;
  height: 92px;
  border-radius: 28px;
  background: ${({ theme }) => theme.colors.glass};
  border: 1px solid rgba(214, 182, 159, 0.35);
  box-shadow: ${({ theme }) => theme.shadow.hard};
  display: grid;
  place-items: center;
  font-weight: 950;
  letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.ivory};
`;

const ThumbText = styled.div`
  text-align: center;
  margin-top: 12px;

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.15em;
    font-weight: 950;
  }

  strong {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.ivory};
  }
`;

const BadgeRow = styled.div`
  position: absolute;
  inset: 14px 14px auto 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Badge = styled.span`
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: rgba(0, 0, 0, 0.68);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const BestSellerBadge = styled(Badge)`
  background: rgba(255, 215, 122, 0.95);
  color: ${({ theme }) => theme.colors.black};
`;

const BadgeRightGroup = styled.div`
  display: flex;
  gap: 6px;
`;

const Body = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const CardTitle = styled.h2`
  font-size: 21px;
  font-weight: 950;
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const PriceRow = styled.div`
  margin-bottom: 14px;
`;

const Price = styled.div`
  font-size: 26px;
  font-weight: 950;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const PriceNote = styled.div`
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.6;
  font-size: 12px;
`;

const StatsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
`;

const StatPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(214, 182, 159, 0.2);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 12px;
`;

const StatLabel = styled.span`
  opacity: 0.72;
`;

const StatValue = styled.span`
  font-weight: 900;
`;

const Dot = styled.span`
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.lightBrown};
`;

const Description = styled.p`
  font-size: 13.5px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.88;
  margin: 0 0 14px;
`;

const FeatureList = styled.ul`
  padding: 0;
  margin: 0 0 14px;
  list-style: none;
  display: grid;
  gap: 9px;

  li {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.86;
    font-size: 13px;
    line-height: 1.5;

    &::before {
      content: "✓";
      color: ${({ theme }) => theme.colors.lightBrown};
      font-weight: 950;
      margin-right: 8px;
    }
  }
`;

const SecurityNote = styled.div`
  margin-top: auto;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.14);
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 12px;
  line-height: 1.45;
`;

const Footer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 14px;
`;

const Button = styled.button`
  flex: 1;
  border: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 11px 12px;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.06em;
  text-transform: uppercase;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

const OutlineButton = styled(Button)`
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.5);
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};
`;
