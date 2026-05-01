import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";

import { useToast } from "../components/Toast";

import {
  fetchEmailSubscribers,
  updateEmailSubscriber,
  deleteEmailSubscriber,
  blockEmailSubscriber,
  setSelectedEmailSubscriber,
  clearSelectedEmailSubscriber,
  setEmailSubscriberSearch,
  setEmailSubscriberFilter,
  clearEmailSubscriberError,
  resetEmailSubscriberSuccess,
} from "../reducers/emailSubscriber/emailSubscriberActions";

const AdminEmailSubscribers = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const {
    loading,
    subscribers,
    selectedSubscriber,
    search,
    error,
    filter,
    success,
    updating, 
    deleting,
    successMessage,
  } = useSelector((state) => state.emailSubscribers);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const subscribersPerPage = 9;

  // ================= FETCH =================
  useEffect(() => {
    dispatch(fetchEmailSubscribers());
  }, [dispatch]);

  // ================= TOAST =================
  useEffect(() => {
  if (error) {
    showToast(error, "error");
    dispatch(clearEmailSubscriberError());
  }

  if (success) {
    showToast(successMessage || "Success", "success");
    dispatch(resetEmailSubscriberSuccess());
  }
  }, [error, success, successMessage, showToast, dispatch]);
  
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, filter]);

  // ================= SELECT =================
  const handleSelect = (subscriber) => {
    dispatch(setSelectedEmailSubscriber(subscriber));
    setFormData({
      email: subscriber.email || "",
      name: subscriber.name || "",
    });
  };

  const handleClear = () => {
    dispatch(clearSelectedEmailSubscriber());
    setFormData({ email: "", name: "" });
  };

  // ================= UPDATE =================
  const handleUpdate = () => {
  if (!selectedSubscriber?._id) {
    showToast("No subscriber selected", "error");
    return;
  }

  const cleanEmail = formData.email.trim().toLowerCase();
  const cleanName = formData.name.trim();

  if (!cleanEmail) {
    showToast("Subscriber email is required", "error");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(cleanEmail)) {
    showToast("Enter a valid email address", "error");
    return;
  }

  dispatch(
    updateEmailSubscriber(selectedSubscriber._id, {
      email: cleanEmail,
      name: cleanName,
    })
  );
};

  // ================= DELETE =================
 const handleDelete = (subscriber) => {
  if (!subscriber?._id) return;

  const confirmed = window.confirm(
    `Delete this subscriber?\n\n${subscriber.email}\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  dispatch(deleteEmailSubscriber(subscriber._id));
};

  // ================= BLOCK =================
  const handleBlock = (subscriber) => {
    dispatch(
      blockEmailSubscriber(subscriber._id, !subscriber.isBlocked)
    );
  };

  // ================= SEARCH =================
 const filteredSubscribers = subscribers.filter((subscriber) => {
  const emailMatch = subscriber.email
    ?.toLowerCase()
    .includes(search.toLowerCase());

  const nameMatch = subscriber.name
    ?.toLowerCase()
    .includes(search.toLowerCase());

  const statusMatch =
    filter === "all" ||
    (filter === "active" && !subscriber.isBlocked) ||
    (filter === "blocked" && subscriber.isBlocked);

  return (emailMatch || nameMatch) && statusMatch;
 });
  
const totalPages = Math.max(
  1,
  Math.ceil(filteredSubscribers.length / subscribersPerPage)
);

const paginatedSubscribers = filteredSubscribers.slice(
  (currentPage - 1) * subscribersPerPage,
  currentPage * subscribersPerPage
);

  const totalSubscribers = subscribers.length;

const blockedSubscribers = subscribers.filter(
  (subscriber) => subscriber.isBlocked
).length;

const activeSubscribers = subscribers.filter(
  (subscriber) => !subscriber.isBlocked
).length;

  const searchResultsCount = filteredSubscribers.length;
  
  const toggleSelectSubscriber = (id) => {
  setSelectedIds((prev) =>
    prev.includes(id)
      ? prev.filter((selectedId) => selectedId !== id)
      : [...prev, id]
  );
};

const toggleSelectAll = () => {
  const pageIds = paginatedSubscribers.map((subscriber) => subscriber._id);

  const allPageSelected = pageIds.every((id) => selectedIds.includes(id));

  if (allPageSelected) {
    setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
  } else {
    setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
  }
};

const handleBulkDelete = () => {
  if (selectedIds.length === 0) {
    showToast("Select at least one subscriber", "error");
    return;
  }

  if (!window.confirm(`Delete ${selectedIds.length} subscribers?`)) return;

  selectedIds.forEach((id) => {
    dispatch(deleteEmailSubscriber(id));
  });

  setSelectedIds([]);
};
  
  const handleBulkBlock = () => {
  if (selectedIds.length === 0) {
    showToast("Select at least one subscriber", "error");
    return;
  }

  selectedIds.forEach((id) => {
    dispatch(blockEmailSubscriber(id, true));
  });

  setSelectedIds([]);
};

const handleBulkUnblock = () => {
  if (selectedIds.length === 0) {
    showToast("Select at least one subscriber", "error");
    return;
  }

  selectedIds.forEach((id) => {
    dispatch(blockEmailSubscriber(id, false));
  });

  setSelectedIds([]);
};
  
  const selectedEmails = subscribers
  .filter((s) => selectedIds.includes(s._id))
    .map((s) => s.email);
  
  const handleSendToCampaign = () => {
  if (selectedEmails.length === 0) {
    showToast("Select subscribers first", "error");
    return;
  }

  // Save to localStorage (temporary bridge)
  localStorage.setItem(
    "selectedCampaignEmails",
    JSON.stringify(selectedEmails)
  );

  showToast("Subscribers added to campaign", "success");

  // Navigate to campaign page
  window.location.href = "/admin/email-campaigns/create";
};
  
  const handleExportCSV = () => {
  if (!filteredSubscribers.length) {
    showToast("No subscribers to export", "error");
    return;
  }

  const headers = ["Email", "Name", "Status", "Created At"];

  const rows = filteredSubscribers.map((subscriber) => [
    subscriber.email || "",
    subscriber.name || "",
    subscriber.isBlocked ? "Blocked" : "Active",
    subscriber.createdAt
      ? new Date(subscriber.createdAt).toLocaleDateString()
      : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", "email-subscribers.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  showToast("CSV exported successfully", "success");
};

  return (
    <Container>
      <Header>EMAIL SUBSCRIBERS</Header>
      <SubHeader>Manage filter, and control your subscribers securely.
      This is your audience  - treat it like an asset.</SubHeader>
      <StatsGrid>
  <StatCard>
    <span>Total Subscribers</span>
    <strong>{totalSubscribers}</strong>
  </StatCard>

  <StatCard>
    <span>Active</span>
    <strong>{activeSubscribers}</strong>
  </StatCard>

  <StatCard>
    <span>Blocked</span>
    <strong>{blockedSubscribers}</strong>
  </StatCard>

  <StatCard>
    <span>Search Results</span>
    <strong>{searchResultsCount}</strong>
  </StatCard>
</StatsGrid>

      {/* SEARCH */}
      <SearchInput
        placeholder="Search subscribers..."
        value={search}
        onChange={(e) =>
          dispatch(setEmailSubscriberSearch(e.target.value))
        }
      />

      <FilterRow>
  <FilterButton
  $active={filter === "all"}
  onClick={() => dispatch(setEmailSubscriberFilter("all"))}
>
  All
</FilterButton>

  <FilterButton
  $active={filter === "active"}
  onClick={() => dispatch(setEmailSubscriberFilter("active"))}
>
  Active
</FilterButton>

<FilterButton
  $active={filter === "blocked"}
  onClick={() => dispatch(setEmailSubscriberFilter("blocked"))}
>
  Blocked
</FilterButton>
</FilterRow>

      <BulkBar>
  <label>
    <input
      type="checkbox"
      checked={
  paginatedSubscribers.length > 0 &&
  paginatedSubscribers.every((subscriber) =>
    selectedIds.includes(subscriber._id)
  )
}
      onChange={toggleSelectAll}
    />
    Select All
  </label>

  <span>
  {selectedIds.length} selected • Showing {paginatedSubscribers.length}
</span>

  <BulkDeleteButton onClick={handleBulkDelete}>
    Delete Selected
        </BulkDeleteButton>
        
        <BulkBlockButton onClick={handleBulkBlock}>
  Block Selected
</BulkBlockButton>

<BulkUnblockButton onClick={handleBulkUnblock}>
  Unblock Selected
        </BulkUnblockButton>
        
        <ExportButton onClick={handleExportCSV}>
  Export CSV
        </ExportButton>
        
        <SendCampaignButton onClick={() => handleSendToCampaign()}>
  Send To Campaign
</SendCampaignButton>
</BulkBar>

      {/* LIST */}
      <Grid>
        {loading ? (
          <LoadingState>
            <LoaderDot>
              <h3>Loading subscribers...</h3>
              <p>Checking your protected email list.</p>
            </LoaderDot>
          </LoadingState>
        ) : filteredSubscribers.length === 0 ? (
          <EmptyState>
  <h3>No subscribers found</h3>
  <p>When people join your email list, they will appear here.</p>
</EmptyState>
        ) : (
          filteredSubscribers.map((subscriber) => (
            <Card key={subscriber._id}>
  <CheckboxRow>
    <input
      type="checkbox"
      checked={selectedIds.includes(subscriber._id)}
      onChange={() => toggleSelectSubscriber(subscriber._id)}
    />
  </CheckboxRow>

              <Email>{subscriber.email}</Email>
              <Meta>
  {subscriber.name ? subscriber.name : "No name saved"} •{" "}
  {subscriber.createdAt
    ? new Date(subscriber.createdAt).toLocaleDateString()
    : "No date"}
              </Meta>
              
              <Status blocked={subscriber.isBlocked}>
                {subscriber.isBlocked ? "BLOCKED" : "ACTIVE"}
              </Status>

              <ButtonRow>
                <Button onClick={() => handleSelect(subscriber)}>
                  Edit
                </Button>

             <Button
  danger
  disabled={deleting}
  onClick={() => handleDelete(subscriber)}
>
  {deleting ? "Deleting..." : "Delete"}
</Button>

                <Button
  warn
  disabled={updating}
  onClick={() => handleBlock(subscriber)}
>
  {updating
    ? "Working..."
    : subscriber.isBlocked
    ? "Unblock"
    : "Block"}
</Button>
              </ButtonRow>
            </Card>
          ))
        )}
      </Grid>

      <PaginationRow>
  <PageButton
    disabled={currentPage === 1}
    onClick={() => setCurrentPage((page) => page - 1)}
  >
    Previous
  </PageButton>

  <PageText>
    Page {currentPage} of {totalPages || 1}
  </PageText>

  <PageButton
  disabled={currentPage >= totalPages}
  onClick={() => setCurrentPage((page) => page + 1)}
>
  Next
</PageButton>
</PaginationRow>

      {/* EDIT PANEL */}
      {selectedSubscriber && (
        <EditBox>
          <h3>Edit Subscriber</h3>

          <Input
  type="email"
  placeholder="Email"
  value={formData.email}
  onChange={(e) =>
    setFormData({ ...formData, email: e.target.value })
  }
/>

          <Input
            placeholder="Name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />

          <ButtonRow>
            <Button onClick={handleUpdate} disabled={updating}>
  {updating ? "Updating..." : "Update"}
</Button>
            <Button onClick={handleClear}>Cancel</Button>
          </ButtonRow>
        </EditBox>
      )}
    </Container>
  );
};

export default AdminEmailSubscribers;

/* =========================
   STYLES (BOTTOM)
========================= */

const Container = styled.div`
  padding: 34px;
  min-height: 100vh;
  color: #fff9f2;
  background:
    radial-gradient(circle at top left, rgba(214, 182, 159, 0.18), transparent 30%),
    radial-gradient(circle at top right, rgba(90, 56, 37, 0.32), transparent 28%),
    linear-gradient(135deg, #000000, #2f1b12 48%, #3d261a);
`;

const Header = styled.h1`
  font-size: clamp(30px, 4vw, 54px);
  font-weight: 900;
  margin-bottom: 22px;
  letter-spacing: -0.05em;
  text-transform: uppercase;

  background: linear-gradient(135deg, #ffffff, #fff9f2, #d6b69f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 15px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.25);
  color: #fff9f2;
  margin-bottom: 18px;
  border-radius: 16px;
  outline: none;

  &::placeholder {
    color: rgba(255, 249, 242, 0.6);
  }

  &:focus {
    border-color: #d6b69f;
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.12);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 15px;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.06);
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
  transition: 0.25s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(214, 182, 159, 0.46);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.08),
      0 16px 40px rgba(45, 18, 8, 0.35);
  }
`;

const Email = styled.p`
  font-size: 14px;
  margin-bottom: 10px;
  color: #fff9f2;
`;

const Status = styled.p`
  font-size: 12px;
  color: ${(p) => (p.blocked ? "#d6b69f" : "#fff9f2")};
  margin-bottom: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 8px 12px;
  background: ${(p) =>
    p.danger
      ? "#2f1b12"
      : p.warn
      ? "#5a3825"
      : "linear-gradient(135deg, #d6b69f, #5a3825)"};
  color: #ffffff;
  border: 1px solid
    ${(p) =>
      p.danger
        ? "rgba(214, 182, 159, 0.25)"
        : "rgba(214, 182, 159, 0.35)"};
  border-radius: 10px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};
  font-weight: 800;

  &:hover {
    opacity: ${({ disabled }) => (disabled ? 0.55 : 0.88)};
    transform: ${({ disabled }) => (disabled ? "none" : "translateY(-1px)")};
  }
`;

const EditBox = styled.div`
  margin-top: 32px;
  background: rgba(255, 255, 255, 0.06);
  padding: 24px;
  border-radius: 22px;
  border: 1px solid rgba(214, 182, 159, 0.22);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);

  h3 {
    margin-bottom: 16px;
    font-size: 22px;
    color: #fff9f2;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 13px 14px;
  margin-bottom: 12px;
  background: #2f1b12;
  border: 1px solid rgba(214, 182, 159, 0.25);
  color: #fff9f2;
  border-radius: 16px;
  outline: none;

  &::placeholder {
    color: rgba(255, 249, 242, 0.6);
  }

  &:focus {
    border-color: #d6b69f;
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.1);
  }
`;

const Text = styled.p`
  opacity: 0.75;
  color: #d6b69f;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 22px;
`;

const StatCard = styled.div`
  background: linear-gradient(145deg, #2f1b12, #3d261a);
  border: 1px solid rgba(214, 182, 159, 0.18);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);

  span {
    display: block;
    font-size: 12px;
    color: #d6b69f;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  strong {
    font-size: 28px;
    color: #ffffff;
  }
`;

const BulkBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.18);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff9f2;
  }

  span {
    color: #d6b69f;
    font-size: 14px;
  }

  input {
    accent-color: #d6b69f;
  }
`;

const BulkDeleteButton = styled.button`
  padding: 9px 14px;
  border: 1px solid rgba(214, 182, 159, 0.3);
  border-radius: 10px;
  background: #2f1b12;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;

  &:hover {
    background: #3d261a;
  }
`;

const CheckboxRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;

  input {
    cursor: pointer;
    transform: scale(1.2);
    accent-color: #d6b69f;
  }
`;

const BulkBlockButton = styled.button`
  padding: 9px 14px;
  border: 1px solid rgba(214, 182, 159, 0.3);
  border-radius: 10px;
  background: #5a3825;
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;

  &:hover {
    background: #3d261a;
  }
`;

const BulkUnblockButton = styled.button`
  padding: 9px 14px;
  border: 1px solid rgba(214, 182, 159, 0.4);
  border-radius: 10px;
  background: linear-gradient(135deg, #d6b69f, #5a3825);
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;

  &:hover {
    opacity: 0.88;
  }
`;

const ExportButton = styled.button`
  padding: 9px 14px;
  border: 1px solid rgba(214, 182, 159, 0.4);
  border-radius: 10px;
  background: linear-gradient(135deg, #fff9f2, #d6b69f, #5a3825);
  color: #2f1b12;
  cursor: pointer;
  font-weight: 900;

  &:hover {
    opacity: 0.88;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 18px;
`;

const FilterButton = styled.button`
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) =>
    $active ? "#d6b69f" : "rgba(214, 182, 159, 0.22)"};
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, #d6b69f, #5a3825)"
      : "rgba(255, 255, 255, 0.06)"};
  color: ${({ $active }) => ($active ? "#ffffff" : "#d6b69f")};
  cursor: pointer;
  font-weight: 800;

  &:hover {
    border-color: #d6b69f;
    color: #ffffff;
  }
`;

const Meta = styled.p`
  font-size: 13px;
  color: #d6b69f;
  margin-bottom: 12px;
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  padding: 40px 24px;
  text-align: center;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.18);

  h3 {
    font-size: 24px;
    margin-bottom: 8px;
    color: #fff9f2;
  }

  p {
    color: #d6b69f;
  }
`;

const PaginationRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  margin-top: 28px;
`;

const PageButton = styled.button`
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: ${({ disabled }) =>
    disabled
      ? "rgba(255, 255, 255, 0.04)"
      : "linear-gradient(135deg, #d6b69f, #5a3825)"};
  color: ${({ disabled }) => (disabled ? "rgba(255, 249, 242, 0.4)" : "#fff")};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  font-weight: 900;
`;

const PageText = styled.span`
  color: #d6b69f;
  font-weight: 800;
`;

const LoadingState = styled.div`
  grid-column: 1 / -1;
  padding: 46px 24px;
  text-align: center;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(214, 182, 159, 0.18);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);

  h3 {
    margin-top: 14px;
    margin-bottom: 8px;
    color: #fff9f2;
  }

  p {
    color: #d6b69f;
  }
`;

const LoaderDot = styled.div`
  width: 18px;
  height: 18px;
  margin: 0 auto;
  border-radius: 999px;
  background: #d6b69f;
  box-shadow: 0 0 24px rgba(214, 182, 159, 0.75);
  animation: pulseDot 0.9s ease-in-out infinite alternate;

  @keyframes pulseDot {
    from {
      transform: scale(0.75);
      opacity: 0.45;
    }

    to {
      transform: scale(1.2);
      opacity: 1;
    }
  }
`;

const SubHeader = styled.p`
  margin-bottom: 26px;
  max-width: 680px;
  font-size: 15px;
  line-height: 1.6;
  color: #d6b69f;
  opacity: 0.9;
`;

const SendCampaignButton = styled.button`
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid rgba(214, 182, 159, 0.4);
  background: linear-gradient(135deg, #fff9f2, #d6b69f, #5a3825);
  color: #2f1b12;
  cursor: pointer;
  font-weight: 900;

  &:hover {
    opacity: 0.88;
  }
`;