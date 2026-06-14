import { useEffect, useMemo, useReducer, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import {
  FaCheckCircle,
  FaEdit,
  FaSave,
  FaSearch,
  FaStar,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import { useToast } from "../components/Toast";

import { manageTestimonialReducer } from "../reducers/manageTestimonials/manageTestimonialReducer";
import { manageTestimonialInitialState } from "../reducers/manageTestimonials/manageTestimonialInitialState";

import {
  fetchAdminTestimonials,
  updateAdminTestimonial,
  approveAdminTestimonial,
  deleteAdminTestimonial,
} from "../reducers/manageTestimonials/manageTestimonialActions";

const FALLBACK_AVATAR = "https://www.gravatar.com/avatar/?d=mp";

function getApproved(item) {
  return (
    item?.approved === true ||
    item?.isApproved === true ||
    item?.status === "approved"
  );
}

function getName(item) {
  return (
    item?.name ||
    item?.user?.name ||
    item?.user?.fullName ||
    item?.user?.username ||
    "Anonymous Client"
  );
}

function getMessage(item) {
  return item?.message || item?.review || item?.comment || "No message";
}

function getImage(item) {
  return item?.imageUrl || item?.image || item?.user?.image || FALLBACK_AVATAR;
}

function getRating(item) {
  return Math.max(1, Math.min(5, Number(item?.rating || 5)));
}

export default function ManageTestimonial() {
  const [state, dispatch] = useReducer(
    manageTestimonialReducer,
    manageTestimonialInitialState
  );

  const { showToast } = useToast();

  const { loading, actionLoading, testimonials, error } = state;

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchAdminTestimonials(dispatch);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const stats = useMemo(() => {
    const total = testimonials?.length || 0;
    const approved = testimonials?.filter(getApproved).length || 0;
    const pending = total - approved;

    const avgRating =
      total > 0
        ? (
            testimonials.reduce((sum, item) => sum + getRating(item), 0) / total
          ).toFixed(1)
        : "0.0";

    return { total, approved, pending, avgRating };
  }, [testimonials]);

  const filteredTestimonials = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = [...(testimonials || [])].filter((item) => {
      const approved = getApproved(item);

      if (statusFilter === "approved" && !approved) return false;
      if (statusFilter === "pending" && approved) return false;

      if (!q) return true;

      const haystack = `${getName(item)} ${getMessage(item)} ${
        item?.title || ""
      } ${item?.user?.email || ""}`.toLowerCase();

      return haystack.includes(q);
    });

    list.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }

      if (sortBy === "highest") {
        return getRating(b) - getRating(a);
      }

      if (sortBy === "lowest") {
        return getRating(a) - getRating(b);
      }

      if (sortBy === "approved") {
        return Number(getApproved(b)) - Number(getApproved(a));
      }

      if (sortBy === "pending") {
        return Number(getApproved(a)) - Number(getApproved(b));
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return list;
  }, [testimonials, search, statusFilter, sortBy]);

  const startEdit = (item) => {
    if (actionLoading) return;

    setEditingId(item._id);

    setForm({
      name: getName(item),
      message: getMessage(item),
      rating: getRating(item),
      imageUrl: item.imageUrl || item.image || "",
    });
  };

  const cancelEdit = () => {
    if (actionLoading) return;

    setEditingId(null);
    setForm({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const cleaned = typeof value === "string" ? value.replace(/\s{2,}/g, " ") : value;

    setForm((prev) => ({
      ...prev,
      [name]: name === "rating" ? Number(cleaned) : cleaned,
    }));
  };

  const handleSave = async (id) => {
    if (actionLoading) return;

    const payload = {
      name: String(form.name || "").trim(),
      message: String(form.message || "").trim(),
      rating: Number(form.rating || 5),
      imageUrl: String(form.imageUrl || "").trim(),
    };

    if (!payload.name || payload.name.length < 2) {
      showToast("Name must be at least 2 characters.", "warning");
      return;
    }

    if (!payload.message || payload.message.length < 3) {
      showToast("Message must be at least 3 characters.", "warning");
      return;
    }

    if (payload.message.length > 1200) {
      showToast("Message must be at most 1200 characters.", "warning");
      return;
    }

    if (payload.imageUrl && !/^https?:\/\/.+|^\/?uploads\//i.test(payload.imageUrl)) {
      showToast("Please enter a valid image URL.", "warning");
      return;
    }

    const ok = await updateAdminTestimonial(dispatch, id, payload);

    if (ok) {
      showToast("Testimonial updated successfully.", "success");
      cancelEdit();
    }
  };

  const handleApproveToggle = async (item) => {
    if (actionLoading) return;

    const currentApproved = getApproved(item);

    const ok = await approveAdminTestimonial(
      dispatch,
      item._id,
      !currentApproved
    );

    if (ok) {
      showToast(
        !currentApproved ? "Testimonial approved." : "Testimonial unapproved.",
        !currentApproved ? "success" : "warning"
      );
    }
  };

  const handleDelete = async (id) => {
    if (actionLoading) return;

    const confirmDelete = window.confirm(
      "Delete this testimonial permanently? This action cannot be undone."
    );

    if (!confirmDelete) return;

    const ok = await deleteAdminTestimonial(dispatch, id);

    if (ok) {
      showToast("Testimonial deleted successfully.", "success");

      if (editingId === id) {
        cancelEdit();
      }
    }
  };

  return (
    <Page>
      <Hero
        as={motion.div}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <span>ADMIN TESTIMONIAL COMMAND CENTER</span>
        <h1>Control Trust. Approve Proof. Build Luxury Credibility.</h1>
        <p>
          Manage every testimonial with premium control — edit, approve,
          unapprove, and delete safely from one powerful dashboard.
        </p>
      </Hero>

      <StatsGrid>
        <StatCard>
          <span>Total</span>
          <strong>{stats.total}</strong>
        </StatCard>

        <StatCard>
          <span>Approved</span>
          <strong>{stats.approved}</strong>
        </StatCard>

        <StatCard>
          <span>Pending</span>
          <strong>{stats.pending}</strong>
        </StatCard>

        <StatCard>
          <span>Average Rating</span>
          <strong>{stats.avgRating}</strong>
        </StatCard>
      </StatsGrid>

      <TopBar>
        <div>
          <h2>Testimonials</h2>
          <p>
            Showing {filteredTestimonials.length} of {testimonials?.length || 0}
          </p>
        </div>

        <RefreshButton
          type="button"
          onClick={() => fetchAdminTestimonials(dispatch)}
          disabled={loading || actionLoading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </RefreshButton>
      </TopBar>

      <Toolbar>
        <SearchBox>
          <FaSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or message..."
            maxLength={80}
          />
        </SearchBox>

        <SelectControl
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter testimonials"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </SelectControl>

        <SelectControl
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort testimonials"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
          <option value="approved">Approved First</option>
          <option value="pending">Pending First</option>
        </SelectControl>
      </Toolbar>

      {loading && <Status>Loading testimonials...</Status>}

      {!loading && filteredTestimonials.length === 0 && (
        <Status>No testimonials found.</Status>
      )}

      <Grid>
        {filteredTestimonials.map((item) => {
          const isEditing = editingId === item._id;
          const approved = getApproved(item);
          const rating = getRating(item);

          return (
            <Card
              as={motion.article}
              key={item._id}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <CardHeader>
                <Avatar
                  src={getImage(item)}
                  alt={getName(item)}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_AVATAR;
                  }}
                />

                <HeaderText>
                  {isEditing ? (
                    <Input
                      name="name"
                      value={form.name || ""}
                      onChange={handleChange}
                      placeholder="Client name"
                      maxLength={80}
                      disabled={actionLoading}
                    />
                  ) : (
                    <h3>{getName(item)}</h3>
                  )}

                  <Badge $approved={approved}>
                    {approved ? "Approved" : "Pending"}
                  </Badge>
                </HeaderText>
              </CardHeader>

              {isEditing ? (
                <>
                  <Input
                    name="imageUrl"
                    value={form.imageUrl || ""}
                    onChange={handleChange}
                    placeholder="Image URL optional"
                    maxLength={500}
                    disabled={actionLoading}
                  />

                  <Textarea
                    name="message"
                    value={form.message || ""}
                    onChange={handleChange}
                    placeholder="Testimonial message"
                    maxLength={1200}
                    disabled={actionLoading}
                  />

                  <Counter $danger={(form.message || "").length > 1100}>
                    {(form.message || "").length}/1200 characters
                  </Counter>

                  <Select
                    name="rating"
                    value={form.rating || 5}
                    onChange={handleChange}
                    disabled={actionLoading}
                  >
                    {[5, 4, 3, 2, 1].map((num) => (
                      <option key={num} value={num}>
                        {num} Star{num > 1 ? "s" : ""}
                      </option>
                    ))}
                  </Select>
                </>
              ) : (
                <>
                  <Title>Premium Client Experience</Title>

                  <Stars>
                    {Array.from({ length: rating }).map((_, index) => (
                      <FaStar key={index} />
                    ))}
                  </Stars>

                  <Message>“{getMessage(item)}”</Message>
                </>
              )}

              <Actions>
                {isEditing ? (
                  <>
                    <SaveBtn
                      type="button"
                      onClick={() => handleSave(item._id)}
                      disabled={actionLoading}
                      aria-label="Save testimonial"
                    >
                      <FaSave /> {actionLoading ? "Saving..." : "Save"}
                    </SaveBtn>

                    <CancelBtn
                      type="button"
                      onClick={cancelEdit}
                      disabled={actionLoading}
                      aria-label="Cancel testimonial edit"
                    >
                      <FaTimesCircle /> Cancel
                    </CancelBtn>
                  </>
                ) : (
                  <>
                    <EditBtn
                      type="button"
                      onClick={() => startEdit(item)}
                      disabled={actionLoading}
                      aria-label="Edit testimonial"
                    >
                      <FaEdit /> Edit
                    </EditBtn>

                    <ApproveBtn
                      type="button"
                      onClick={() => handleApproveToggle(item)}
                      disabled={actionLoading}
                      aria-label={
                        approved ? "Unapprove testimonial" : "Approve testimonial"
                      }
                    >
                      <FaCheckCircle />
                      {approved ? "Unapprove" : "Approve"}
                    </ApproveBtn>

                    <DeleteBtn
                      type="button"
                      onClick={() => handleDelete(item._id)}
                      disabled={actionLoading}
                      aria-label="Delete testimonial"
                    >
                      <FaTrash /> Delete
                    </DeleteBtn>
                  </>
                )}
              </Actions>
            </Card>
          );
        })}
      </Grid>
    </Page>
  );
}

const Page = styled.section`
  min-height: 100vh;
  padding: 2rem;
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.16), transparent 34%),
    #000;
  color: #fff;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Hero = styled.div`
  padding: 2rem;
  border-radius: 28px;
  background: linear-gradient(135deg, #2f1b12, #000);
  border: 1px solid rgba(214, 182, 159, 0.25);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  margin-bottom: 2rem;

  span {
    color: #d6b69f;
    font-weight: 900;
    letter-spacing: 0.15em;
    font-size: 0.78rem;
  }

  h1 {
    max-width: 900px;
    font-size: clamp(2rem, 5vw, 4.5rem);
    line-height: 0.95;
    margin: 0.8rem 0;
  }

  p {
    max-width: 760px;
    color: #d8d8d8;
    font-size: 1rem;
    line-height: 1.7;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  border: 1px solid rgba(214, 182, 159, 0.18);
  border-radius: 22px;
  padding: 1rem;
  background: rgba(17, 17, 17, 0.88);

  span {
    display: block;
    color: #b9b9b9;
    font-size: 0.82rem;
    font-weight: 800;
    margin-bottom: 0.45rem;
  }

  strong {
    color: #d6b69f;
    font-size: 1.8rem;
  }
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;

  h2 {
    font-size: 1.6rem;
    margin: 0;
  }

  p {
    color: #aaa;
    margin-top: 0.3rem;
  }

  @media (max-width: 650px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Toolbar = styled.div`
  display: grid;
  grid-template-columns: 1fr 180px 190px;
  gap: 0.8rem;
  margin-bottom: 1.5rem;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: rgba(5, 5, 5, 0.9);
  color: #d6b69f;
  border-radius: 999px;
  padding: 0 1rem;

  input {
    width: 100%;
    border: 0;
    background: transparent;
    color: #fff;
    padding: 0.95rem 0;
    outline: none;
    font: inherit;
  }
`;

const RefreshButton = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.9rem 1.4rem;
  background: #d6b69f;
  color: #000;
  font-weight: 900;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.2rem;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article`
  background: rgba(17, 17, 17, 0.96);
  border: 1px solid rgba(214, 182, 159, 0.18);
  border-radius: 24px;
  padding: 1.2rem;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
`;

const HeaderText = styled.div`
  min-width: 0;

  h3 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    word-break: break-word;
  }
`;

const Avatar = styled.img`
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #d6b69f;
  flex: 0 0 auto;
`;

const Badge = styled.span`
  display: inline-flex;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 900;
  color: ${({ $approved }) => ($approved ? "#041b0b" : "#2f1b12")};
  background: ${({ $approved }) => ($approved ? "#8affaa" : "#d6b69f")};
`;

const Title = styled.h4`
  margin: 1rem 0 0.6rem;
  font-size: 1.15rem;
  color: #fff9f2;
`;

const Stars = styled.div`
  display: flex;
  gap: 0.25rem;
  color: #d6b69f;
  margin-bottom: 0.8rem;
`;

const Message = styled.p`
  color: #d6d6d6;
  line-height: 1.7;
  min-height: 100px;
  word-break: break-word;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;

  button {
    border: none;
    border-radius: 999px;
    padding: 0.75rem 0.9rem;
    font-weight: 900;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EditBtn = styled.button`
  background: #fff;
  color: #000;
`;

const ApproveBtn = styled.button`
  background: #d6b69f;
  color: #000;
`;

const DeleteBtn = styled.button`
  background: #3d0f0f;
  color: #fff;
`;

const SaveBtn = styled.button`
  background: #8affaa;
  color: #000;
`;

const CancelBtn = styled.button`
  background: #333;
  color: #fff;
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: #050505;
  color: #fff;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  margin-bottom: 0.8rem;
  outline: none;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 130px;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: #050505;
  color: #fff;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  margin-bottom: 0.35rem;
  resize: vertical;
  outline: none;
`;

const Select = styled.select`
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: #050505;
  color: #fff;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  outline: none;
`;

const SelectControl = styled.select`
  width: 100%;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: #050505;
  color: #fff;
  padding: 0.95rem 1rem;
  border-radius: 999px;
  outline: none;
`;

const Counter = styled.small`
  display: block;
  margin-bottom: 0.8rem;
  color: ${({ $danger }) => ($danger ? "#ffb4a8" : "#aaa")};
  font-weight: 800;
`;

const Status = styled.div`
  padding: 1.2rem;
  border-radius: 18px;
  background: rgba(214, 182, 159, 0.1);
  border: 1px solid rgba(214, 182, 159, 0.2);
  color: #d6b69f;
  margin-bottom: 1rem;
  font-weight: 800;
`;