import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "../components/Toast";

import {
  fetchAdminReviews,
  approveAdminReview,
  unapproveAdminReview,
  deleteAdminReview,
} from "../reducers/manageReview/manageReviewActions";

const STATUS_OPTIONS = ["all", "pending", "approved"];
const TYPE_OPTIONS = ["all", "course", "product"];
const LIMIT = 24;

function getReviewTargetTitle(review) {
  if (review?.reviewType === "product") {
    return (
      review?.product?.title ||
      review?.product?.name ||
      review?.productTitle ||
      review?.itemTitle ||
      "Unknown Product"
    );
  }

  return review?.course?.title || review?.courseTitle || "Unknown Course";
}

function getReviewerName(review) {
  return review?.user?.name || review?.user?.email || "Unknown Reviewer";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function normalizeStatusLabel(value) {
  if (value === "approved") return "Approved";
  if (value === "pending") return "Pending";
  return "All Reviews";
}

function normalizeTypeLabel(value) {
  if (value === "course") return "Course Reviews";
  if (value === "product") return "Product Reviews";
  return "All Types";
}

export default function ManageReview() {
  const toast = useToast();
  const dispatch = useDispatch();

  const {
    loading,
    error,
    reviews = [],
    meta = {},
  } = useSelector((state) => state.manageReview || {});

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [activeModal, setActiveModal] = useState(null);

  const loadReviews = useCallback(() => {
    dispatch(
      fetchAdminReviews({
        q: query,
        status,
        type,
        page,
        limit: LIMIT,
      })
    );
  }, [dispatch, query, status, type, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && !busyId) {
        setActiveModal(null);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [busyId]);

  const stats = useMemo(() => {
    const metaStats = meta?.stats;

    if (metaStats) {
      return {
        total: Number(metaStats.total || 0),
        approved: Number(metaStats.approved || 0),
        pending: Number(metaStats.pending || 0),
        avg: Number(metaStats.averageRating || 0).toFixed(1),
      };
    }

    const total = reviews.length;
    const approved = reviews.filter((review) => review.isApproved).length;
    const pending = total - approved;

    const avg =
      total > 0
        ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
          total
        : 0;

    return {
      total,
      approved,
      pending,
      avg: avg.toFixed(1),
    };
  }, [reviews, meta]);

  const pages = Math.max(1, Number(meta?.pages || 1));
  const total = Number(meta?.total || stats.total || 0);

  function updateStatus(value) {
    setStatus(value);
    setPage(1);
  }

  function updateType(value) {
    setType(value);
    setPage(1);
  }

  function updateQuery(value) {
    setQuery(value);
    setPage(1);
  }

  async function handleApprove(review) {
    if (!review?._id) return;

    setBusyId(review._id);

    const result = await dispatch(approveAdminReview(review._id));

    toast?.push?.({
      title: result.success ? "Review Approved" : "Approval Failed",
      description: result.message,
      variant: result.success ? "success" : "danger",
    });

    setBusyId("");

    if (result.success) {
      setActiveModal(null);
    }
  }

  async function handleUnapprove(review) {
    if (!review?._id) return;

    setBusyId(review._id);

    const result = await dispatch(unapproveAdminReview(review._id));

    toast?.push?.({
      title: result.success ? "Review Unapproved" : "Unapprove Failed",
      description: result.message,
      variant: result.success ? "success" : "danger",
    });

    setBusyId("");

    if (result.success) {
      setActiveModal(null);
    }
  }

  async function handleDelete(review) {
    if (!review?._id) return;

    setBusyId(review._id);

    const result = await dispatch(deleteAdminReview(review._id));

    toast?.push?.({
      title: result.success ? "Review Deleted" : "Delete Failed",
      description: result.message,
      variant: result.success ? "success" : "danger",
    });

    setBusyId("");

    if (result.success) {
      setActiveModal(null);

      if (reviews.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(currentPage - 1, 1));
      } else {
        loadReviews();
      }
    }
  }

  return (
    <Page>
      <Shell>
        <Hero
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <HeroContent>
            <Eyebrow>KO ADMIN • REVIEW COMMAND CENTER</Eyebrow>
            <Title>Protect the brand. Publish only the reviews that deserve the spotlight.</Title>
            <Sub>
              Approve verified course and product reviews, hold weak feedback for
              moderation, remove unsafe comments, and keep KnockoutCodes looking
              premium, trusted, and enterprise-ready.
            </Sub>
          </HeroContent>

          <HeroActions>
            <RefreshButton type="button" onClick={loadReviews} disabled={loading || Boolean(busyId)}>
              {loading ? "Refreshing..." : "Refresh Reviews"}
            </RefreshButton>
          </HeroActions>
        </Hero>

        <StatsGrid>
          <StatCard>
            <StatLabel>Total Reviews</StatLabel>
            <StatValue>{stats.total}</StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>Approved</StatLabel>
            <StatValue>{stats.approved}</StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>Pending</StatLabel>
            <StatValue>{stats.pending}</StatValue>
          </StatCard>

          <StatCard>
            <StatLabel>Average Rating</StatLabel>
            <StatValue>{stats.avg}★</StatValue>
          </StatCard>
        </StatsGrid>

        <Panel>
          <PanelTop>
            <div>
              <PanelTitle>Review Moderation</PanelTitle>
              <PanelText>
                Showing {reviews.length} of {total} review record{total === 1 ? "" : "s"}.
              </PanelText>
            </div>
          </PanelTop>

          <Toolbar>
            <Search
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="Search title, comment, or review type..."
              autoComplete="off"
            />

            <Select value={status} onChange={(e) => updateStatus(e.target.value)}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {normalizeStatusLabel(item)}
                </option>
              ))}
            </Select>

            <Select value={type} onChange={(e) => updateType(e.target.value)}>
              {TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {normalizeTypeLabel(item)}
                </option>
              ))}
            </Select>
          </Toolbar>

          {loading ? <StatusText>Loading premium reviews...</StatusText> : null}
          {error ? <ErrorText>{error}</ErrorText> : null}

          {!loading && !error && reviews.length === 0 ? (
            <Empty>
              <EmptyTitle>No reviews found.</EmptyTitle>
              <EmptyText>
                Try changing the status, type, or search filter.
              </EmptyText>
            </Empty>
          ) : null}

          {!loading && !error && reviews.length > 0 ? (
            <ReviewGrid>
              {reviews.map((review) => {
                const id = review._id;
                const targetTitle = getReviewTargetTitle(review);
                const reviewer = getReviewerName(review);
                const targetType =
                  review?.reviewType === "product"
                    ? "Product Review"
                    : "Course Review";

                return (
                  <ReviewCard key={id} $approved={review.isApproved}>
                    <CardTop>
                      <div>
                        <CourseName>{targetTitle}</CourseName>
                        <StudentName>
                          {targetType} • {reviewer}
                        </StudentName>
                      </div>

                      <StatusBadge $approved={review.isApproved}>
                        {review.isApproved ? "Approved" : "Pending"}
                      </StatusBadge>
                    </CardTop>

                    <RatingRow>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index}>
                          {index < Number(review.rating || 0) ? "★" : "☆"}
                        </Star>
                      ))}

                      <RatingNumber>{review.rating || 0}/5</RatingNumber>
                    </RatingRow>

                    <ReviewTitle>{review.title || "No title"}</ReviewTitle>

                    <Comment>“{review.comment || "No comment"}”</Comment>

                    <MetaGrid>
                      <MetaItem>
                        <MetaLabel>Submitted</MetaLabel>
                        <MetaValue>{formatDate(review.createdAt)}</MetaValue>
                      </MetaItem>

                      <MetaItem>
                        <MetaLabel>Type</MetaLabel>
                        <MetaValue>{review.reviewType || "course"}</MetaValue>
                      </MetaItem>
                    </MetaGrid>

                    <Actions>
                      <GhostAction
                        type="button"
                        onClick={() => setActiveModal({ type: "details", review })}
                        disabled={busyId === id}
                      >
                        Details
                      </GhostAction>

                      {review.isApproved ? (
                        <UnapproveButton
                          type="button"
                          disabled={busyId === id}
                          onClick={() => setActiveModal({ type: "unapprove", review })}
                        >
                          {busyId === id ? "Working..." : "Unapprove"}
                        </UnapproveButton>
                      ) : (
                        <ApproveButton
                          type="button"
                          disabled={busyId === id}
                          onClick={() => setActiveModal({ type: "approve", review })}
                        >
                          {busyId === id ? "Approving..." : "Approve"}
                        </ApproveButton>
                      )}

                      <DeleteButton
                        type="button"
                        disabled={busyId === id}
                        onClick={() => setActiveModal({ type: "delete", review })}
                      >
                        {busyId === id ? "Working..." : "Delete"}
                      </DeleteButton>
                    </Actions>
                  </ReviewCard>
                );
              })}
            </ReviewGrid>
          ) : null}

          <Pagination>
            <PageButton
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page <= 1 || loading || Boolean(busyId)}
            >
              Previous
            </PageButton>

            <PageInfo>
              Page {page} of {pages}
            </PageInfo>

            <PageButton
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, pages))}
              disabled={page >= pages || loading || Boolean(busyId)}
            >
              Next
            </PageButton>
          </Pagination>
        </Panel>
      </Shell>

      <AnimatePresence>
        {activeModal ? (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !busyId) {
                setActiveModal(null);
              }
            }}
          >
            <ModalCard
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
            >
              {activeModal.type === "details" ? (
                <>
                  <ModalEyebrow>Review Details</ModalEyebrow>
                  <ModalTitle>
                    {getReviewTargetTitle(activeModal.review)}
                  </ModalTitle>

                  <DetailGrid>
                    <Detail>
                      <b>Reviewer:</b> {getReviewerName(activeModal.review)}
                    </Detail>
                    <Detail>
                      <b>Email:</b> {activeModal.review?.user?.email || "—"}
                    </Detail>
                    <Detail>
                      <b>Type:</b> {activeModal.review?.reviewType || "—"}
                    </Detail>
                    <Detail>
                      <b>Status:</b>{" "}
                      {activeModal.review?.isApproved ? "Approved" : "Pending"}
                    </Detail>
                    <Detail>
                      <b>Rating:</b> {activeModal.review?.rating || 0}/5
                    </Detail>
                    <Detail>
                      <b>Title:</b> {activeModal.review?.title || "No title"}
                    </Detail>
                    <Detail>
                      <b>Comment:</b> {activeModal.review?.comment || "No comment"}
                    </Detail>
                    <Detail>
                      <b>Submitted:</b> {formatDate(activeModal.review?.createdAt)}
                    </Detail>
                  </DetailGrid>

                  <ModalActions>
                    <ModalCancel type="button" onClick={() => setActiveModal(null)}>
                      Close
                    </ModalCancel>
                  </ModalActions>
                </>
              ) : null}

              {activeModal.type === "approve" ? (
                <>
                  <ModalEyebrow>Approve Review</ModalEyebrow>
                  <ModalTitle>Publish this review?</ModalTitle>
                  <ModalText>
                    This will make the review visible publicly and include it in
                    the rating average for the course or product.
                  </ModalText>

                  <ModalActions>
                    <ModalCancel
                      type="button"
                      onClick={() => setActiveModal(null)}
                      disabled={Boolean(busyId)}
                    >
                      Cancel
                    </ModalCancel>

                    <ModalConfirm
                      type="button"
                      onClick={() => handleApprove(activeModal.review)}
                      disabled={Boolean(busyId)}
                    >
                      {busyId ? "Approving..." : "Approve Review"}
                    </ModalConfirm>
                  </ModalActions>
                </>
              ) : null}

              {activeModal.type === "unapprove" ? (
                <>
                  <ModalEyebrow>Unapprove Review</ModalEyebrow>
                  <ModalTitle>Hide this review from public view?</ModalTitle>
                  <ModalText>
                    This keeps the review in admin records, but removes it from
                    public display and public rating calculations.
                  </ModalText>

                  <ModalActions>
                    <ModalCancel
                      type="button"
                      onClick={() => setActiveModal(null)}
                      disabled={Boolean(busyId)}
                    >
                      Cancel
                    </ModalCancel>

                    <ModalWarning
                      type="button"
                      onClick={() => handleUnapprove(activeModal.review)}
                      disabled={Boolean(busyId)}
                    >
                      {busyId ? "Working..." : "Unapprove Review"}
                    </ModalWarning>
                  </ModalActions>
                </>
              ) : null}

              {activeModal.type === "delete" ? (
                <>
                  <ModalEyebrow>Delete Review</ModalEyebrow>
                  <ModalTitle>Delete this review permanently?</ModalTitle>
                  <ModalText>
                    This cannot be undone. The review will be removed from admin
                    records and rating stats will be recalculated.
                  </ModalText>

                  <ModalActions>
                    <ModalCancel
                      type="button"
                      onClick={() => setActiveModal(null)}
                      disabled={Boolean(busyId)}
                    >
                      Cancel
                    </ModalCancel>

                    <ModalDelete
                      type="button"
                      onClick={() => handleDelete(activeModal.review)}
                      disabled={Boolean(busyId)}
                    >
                      {busyId ? "Deleting..." : "Delete Review"}
                    </ModalDelete>
                  </ModalActions>
                </>
              ) : null}
            </ModalCard>
          </ModalOverlay>
        ) : null}
      </AnimatePresence>
    </Page>
  );
}

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  min-height: 100vh;
  padding: 112px 16px 80px;
  display: flex;
  justify-content: center;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.2), transparent 34%),
    radial-gradient(circle at 88% 12%, rgba(90, 56, 37, 0.42), transparent 34%),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown},
      ${({ theme }) => theme.colors.black}
    );
`;

const Shell = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1200px"};
  animation: ${fadeUp} 0.35s ease both;
`;

const Hero = styled(motion.section)`
  display: flex;
  justify-content: space-between;
  gap: 24px;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(24px, 4vw, 42px);
  margin-bottom: 18px;
  background:
    linear-gradient(145deg, rgba(61, 38, 26, 0.92), rgba(0, 0, 0, 0.68)),
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.18), transparent 38%);
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  backdrop-filter: blur(18px);

  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

const HeroContent = styled.div`
  max-width: 880px;
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
  max-width: 960px;
  margin: 0;
  font-size: clamp(2rem, 4.6vw, 4.6rem);
  line-height: 0.94;
  font-weight: 950;
  letter-spacing: -0.065em;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Sub = styled.p`
  max-width: 780px;
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.76;
  font-size: 14px;
  line-height: 1.75;
`;

const HeroActions = styled.div`
  display: flex;
  align-items: flex-start;
`;

const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;

  @media (max-width: 850px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.article`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(214, 182, 159, 0.16);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const StatLabel = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const StatValue = styled.h2`
  margin: 8px 0 0;
  font-size: 32px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Panel = styled.section`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 20px;
  background: rgba(61, 38, 26, 0.78);
  border: 1px solid rgba(214, 182, 159, 0.14);
  box-shadow: ${({ theme }) => theme.shadow.hard};
`;

const PanelTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
`;

const PanelText = styled.p`
  margin: 7px 0 0;
  color: rgba(255, 249, 242, 0.66);
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px 190px;
  gap: 10px;
  margin-bottom: 18px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const fieldCss = css`
  min-height: 46px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 249, 242, 0.16);
  background: rgba(0, 0, 0, 0.42);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const Search = styled.input`
  ${fieldCss}

  &::placeholder {
    color: rgba(255, 249, 242, 0.42);
  }
`;

const Select = styled.select`
  ${fieldCss}
`;

const RefreshButton = styled.button`
  min-height: 46px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 18px;
  cursor: pointer;
  white-space: nowrap;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const ReviewGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1050px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const ReviewCard = styled.article`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 18px;
  background:
    radial-gradient(circle at 20% 0%, rgba(214, 182, 159, 0.11), transparent 34%),
    ${({ theme }) => theme.colors.cocoa};
  border: 1px solid
    ${({ $approved }) =>
      $approved ? "rgba(214, 182, 159, 0.28)" : "rgba(255, 210, 122, 0.34)"};
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const CourseName = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 17px;
  line-height: 1.15;
`;

const StudentName = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 850;
`;

const StatusBadge = styled.span`
  height: fit-content;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 7px 10px;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
  white-space: nowrap;
  background: ${({ $approved }) =>
    $approved ? "rgba(214, 182, 159, 0.18)" : "rgba(255, 210, 122, 0.14)"};
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.14);
`;

const RatingRow = styled.div`
  margin: 14px 0 10px;
  display: flex;
  align-items: center;
  gap: 3px;
`;

const Star = styled.span`
  color: #ffd97a;
  font-size: 17px;
`;

const RatingNumber = styled.span`
  margin-left: 8px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.7;
  font-size: 12px;
  font-weight: 850;
`;

const ReviewTitle = styled.h4`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 15px;
`;

const Comment = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.78);
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
`;

const MetaItem = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(255, 249, 242, 0.08);
`;

const MetaLabel = styled.span`
  display: block;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const MetaValue = styled.span`
  display: block;
  margin-top: 4px;
  color: rgba(255, 249, 242, 0.76);
  font-size: 12px;
  font-weight: 800;
  text-transform: capitalize;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
`;

const BaseButton = styled.button`
  flex: 1;
  min-height: 40px;
  border-radius: ${({ theme }) => theme.radius.pill};
  cursor: pointer;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;

const GhostAction = styled(BaseButton)`
  background: rgba(255, 255, 255, 0.045);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(214, 182, 159, 0.24);
`;

const ApproveButton = styled(BaseButton)`
  border: 0;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
`;

const UnapproveButton = styled(BaseButton)`
  background: rgba(255, 210, 122, 0.14);
  color: #ffd97a;
  border: 1px solid rgba(255, 210, 122, 0.32);
`;

const DeleteButton = styled(BaseButton)`
  background: rgba(255, 77, 77, 0.15);
  color: #ffb3b3;
  border: 1px solid rgba(255, 179, 179, 0.32);
`;

const StatusText = styled.p`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 850;
`;

const ErrorText = styled.p`
  color: #ffb3b3;
  font-weight: 850;
`;

const Empty = styled.div`
  padding: 26px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 249, 242, 0.12);
  color: ${({ theme }) => theme.colors.ivory};
`;

const EmptyTitle = styled.h3`
  margin: 0;
`;

const EmptyText = styled.p`
  margin: 8px 0 0;
  color: rgba(255, 249, 242, 0.68);
`;

const Pagination = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 20px;

  @media (max-width: 520px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const PageButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.25);
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 15px;
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: rgba(255, 249, 242, 0.7);
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(12px);
`;

const ModalCard = styled(motion.div)`
  width: min(94vw, 580px);
  max-height: 86vh;
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(214, 182, 159, 0.07)),
    ${({ theme }) => theme.colors.darkBrown};
  border: 1px solid rgba(214, 182, 159, 0.24);
  box-shadow: ${({ theme }) => theme.shadow.hard};
`;

const ModalEyebrow = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.lightBrown};
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.76rem;
  font-weight: 950;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 1.8rem;
  line-height: 1;
`;

const ModalText = styled.p`
  color: rgba(255, 249, 242, 0.76);
  line-height: 1.7;
`;

const DetailGrid = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 18px;
`;

const Detail = styled.div`
  padding: 11px 13px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.28);
  color: rgba(255, 249, 242, 0.82);
  word-break: break-word;

  b {
    color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const ModalCancel = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.25);
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 12px 18px;
  background: transparent;
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const ModalConfirm = styled(ModalCancel)`
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.darkBrown};
  border: 0;
`;

const ModalWarning = styled(ModalConfirm)`
  background: #ffd97a;
  color: #2d2111;
`;

const ModalDelete = styled(ModalConfirm)`
  background: #ffdede;
  color: #3d120f;
`;