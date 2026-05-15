// src/pages/ManageUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import api from "../lib/apiClient";
import theme from "../Styles/theme";
import { useToast } from "../components/Toast";
import Footer from "../components/Footer";

/**
 * ManageUsers
 * Admin-only page (rendered inside <AdminRoute />)
 * - Fetch all users (GET /api/v1/users)
 * - Search + filter
 * - Select + edit a user
 * - Save updates (PATCH /api/v1/users/:id)
 * - Delete user (DELETE /api/v1/users/:id)
 * - Deactivate / activate user (isActive toggle in payload)
 */

export default function ManageUsers() {
  const toastCtx = useToast();

  // Normalize toast so we don't crash if the hook returns an object or function
  const showToast =
    typeof toastCtx === "function"
      ? toastCtx
      : toastCtx?.showToast || toastCtx?.addToast || toastCtx?.pushToast;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  // ===== Helper: normalize name so we never show "Unnamed" =====
  const getSafeName = (u) => {
    const raw =
      typeof u?.name === "string"
        ? u.name
        : typeof u?.fullName === "string"
        ? u.fullName
        : "";
    const trimmed = raw.trim();

    if (trimmed.length > 0) return trimmed;

    const email = typeof u?.email === "string" ? u.email.trim() : "";

    if (email.length > 0) {
      // use the part before @ as a readable fallback
      return email.split("@")[0] || email;
    }

    // final fallback – should almost never be used
    return "User";
  };

  // ===== Load users on mount =====
  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await api.get("/users");
        const responseData = response.data;

        // Expected backend shape:
        // { success: true, data: { users: [...], results: number } }
        let list = [];

        if (Array.isArray(responseData?.data?.users)) {
          list = responseData.data.users;
        } else if (Array.isArray(responseData?.users)) {
          // fallback shape: { users: [...] }
          list = responseData.users;
        } else if (Array.isArray(responseData?.data)) {
          // fallback shape: { data: [...] }
          list = responseData.data;
        } else if (Array.isArray(responseData?.allUsers)) {
          // fallback shape: { allUsers: [...] }
          list = responseData.allUsers;
        } else if (Array.isArray(responseData)) {
          // raw array
          list = responseData;
        } else if (responseData?.user && typeof responseData.user === "object") {
          list = [responseData.user];
        } else if (
          responseData?.data &&
          typeof responseData.data === "object" &&
          !Array.isArray(responseData.data)
        ) {
          // fallback single object inside data
          list = [responseData.data];
        } else if (responseData && typeof responseData === "object") {
          list = [responseData];
        }

        const safe = (list || []).filter(Boolean).map((u, idx) => {
          const safeName = getSafeName(u);

          return {
            id: u._id || u.id || String(idx),
            _id: u._id || u.id || String(idx),
            name: safeName,
            email: String(u.email || "").trim(),
            role: u.role || "user",
            isActive:
              typeof u.isActive === "boolean"
                ? u.isActive
                : u.active === false
                ? false
                : true,
            createdAt: u.createdAt ? new Date(u.createdAt) : null,
          };
        });

        if (!isMounted) return;
        setUsers(safe);

        if (showToast) {
          showToast({
            type: "info",
            message: `Loaded ${safe.length} registered fighters.`,
          });
        }
      } catch (error) {
        if (!isMounted) return;
        if (showToast) {
          showToast({
            type: "error",
            message:
              error?.response?.data?.message ||
              "Could not load users. Please try again.",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // ===== Derived stats + filtered list =====
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [users, search]);

  const totalUsers = users.length;
  const adminCount = users.filter(
    (u) => (u.role || "").toLowerCase() === "admin"
  ).length;
  const activeCount = users.filter((u) => u.isActive).length;

  const handleSelect = (user) => {
    if (!user) {
      setSelected(null);
      return;
    }

    // make sure name + email are always strings when editing
    const safeUser = {
      ...user,
      name: user.name || getSafeName(user),
      email: user.email || "",
    };

    setSelected(safeUser);
  };

  const handleFieldChange = (field, value) => {
    setSelected((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!selected?._id) return;
    setSaving(true);
    try {
      const payload = {
        name: selected.name,
        email: selected.email,
        role: selected.role,
        isActive: selected.isActive,
      };

      const response = await api.patch(
        `/users/${selected._id}`,
        payload
      );
      const responseData = response.data;

      // Expected backend shape:
      // { success: true, message: 'User successfully updated', data: user }
      let updatedUserRaw = null;

      if (responseData?.data && typeof responseData.data === "object") {
        updatedUserRaw = responseData.data;
      } else if (
        responseData?.user &&
        typeof responseData.user === "object"
      ) {
        updatedUserRaw = responseData.user;
      } else if (responseData && typeof responseData === "object") {
        updatedUserRaw = responseData;
      } else {
        updatedUserRaw = selected;
      }

      const safeName = getSafeName(updatedUserRaw || selected);

      const updatedUser = {
        id:
          updatedUserRaw._id ||
          updatedUserRaw.id ||
          selected.id ||
          selected._id,
        _id:
          updatedUserRaw._id ||
          updatedUserRaw.id ||
          selected._id ||
          selected.id,
        name: safeName,
        email: String(
          updatedUserRaw.email || selected.email || ""
        ).trim(),
        role: updatedUserRaw.role || selected.role || "user",
        isActive:
          typeof updatedUserRaw.isActive === "boolean"
            ? updatedUserRaw.isActive
            : updatedUserRaw.active === false
            ? false
            : selected.isActive,
        createdAt: updatedUserRaw.createdAt
          ? new Date(updatedUserRaw.createdAt)
          : selected.createdAt || null,
      };

      setUsers((prev) =>
        prev.map((u) =>
          (u._id || u.id) === updatedUser._id ? updatedUser : u
        )
      );
      setSelected(updatedUser);

      if (showToast) {
        showToast({
          type: "success",
          message: "User updated successfully.",
        });
      }
    } catch (error) {
      if (showToast) {
        showToast({
          type: "error",
          message:
            error?.response?.data?.message ||
            "Failed to save changes. Please try again.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!user?._id && !user?.id) return;

    const ok = window.confirm(
      `Delete ${user.name || user.email || "this user"}? This action cannot be undone.`
    );
    if (!ok) return;

    const id = user._id || user.id;
    setDeletingId(id);
    try {
      await api.delete(`/users/${id}`);

      setUsers((prev) =>
        prev.filter((u) => (u._id || u.id) !== id)
      );
      if (selected && (selected._id || selected.id) === id) {
        setSelected(null);
      }

      if (showToast) {
        showToast({
          type: "success",
          message: "User deleted permanently.",
        });
      }
    } catch (error) {
      if (showToast) {
        showToast({
          type: "error",
          message:
            error?.response?.data?.message ||
            "Failed to delete user. Please try again.",
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Page>
        <Inner>
          <HeaderRow>
            <Title>
              Manage The Knockout Crowd <span>🥊</span>
            </Title>
            <Subtitle>
              Every email here is a potential champion. Refine, protect, and
              manage your fighters like a 5-star coach.
            </Subtitle>
          </HeaderRow>

          <TopBar>
            <StatsRow>
              <StatCard>
                <StatLabel>Total Users</StatLabel>
                <StatValue>{totalUsers}</StatValue>
                <StatHint>All registered fighters in KnockoutCodes.</StatHint>
              </StatCard>
              <StatCard>
                <StatLabel>Active</StatLabel>
                <StatValue>{activeCount}</StatValue>
                <StatHint>Ready to punch in at any time.</StatHint>
              </StatCard>
              <StatCard>
                <StatLabel>Admins</StatLabel>
                <StatValue>{adminCount}</StatValue>
                <StatHint>Your elite corner crew.</StatHint>
              </StatCard>
            </StatsRow>

            <SearchWrap>
              <SearchInput
                type="text"
                placeholder="Search by name, email, or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </SearchWrap>
          </TopBar>

          <Content>
            <LeftPane>
              <ListHeader>
                <ListTitle>
                  Registered Fighters
                  {loading ? " (loading…)" : ` (${filteredUsers.length})`}
                </ListTitle>
              </ListHeader>

              <ListBody>
                {loading ? (
                  <SkeletonList aria-label="Loading users">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <SkeletonRow key={idx} />
                    ))}
                  </SkeletonList>
                ) : filteredUsers.length === 0 ? (
                  <Empty>
                    No users found. Try adjusting your search.
                  </Empty>
                ) : (
                  <UserList role="list" aria-label="Users">
                    {filteredUsers.map((u) => {
                      const isSelected =
                        selected &&
                        (selected._id || selected.id) ===
                          (u._id || u.id);
                      const displayName =
                        u.name || u.email || "User";
                      const avatarInitial = (displayName || "?")
                        .trim()
                        .charAt(0)
                        .toUpperCase();

                      return (
                        <UserRow
                          key={u._id || u.id}
                          role="listitem"
                          onClick={() => handleSelect(u)}
                          $active={isSelected}
                        >
                          <AvatarCircle>
                            {avatarInitial}
                          </AvatarCircle>
                          <UserMeta>
                            <UserName>{displayName}</UserName>
                            <UserEmail>{u.email}</UserEmail>
                            <UserBadges>
                              <Badge
                                $variant={
                                  u.role === "admin" ? "admin" : "user"
                                }
                              >
                                {u.role || "user"}
                              </Badge>
                              <Badge
                                $variant={
                                  u.isActive ? "active" : "inactive"
                                }
                              >
                                {u.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </UserBadges>
                          </UserMeta>
                          <UserEdge>
                            {u.createdAt && (
                              <SmallText>
                                Joined{" "}
                                {u.createdAt.toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </SmallText>
                            )}
                          </UserEdge>
                        </UserRow>
                      );
                    })}
                  </UserList>
                )}
              </ListBody>
            </LeftPane>

            <RightPane>
              {!selected ? (
                <EmptyDetail>
                  <EmptyTitle>Select a user</EmptyTitle>
                  <EmptyText>
                    Click a fighter on the left to inspect, edit, promote, or
                    remove them from your KnockoutCodes roster.
                  </EmptyText>
                </EmptyDetail>
              ) : (
                <DetailCard>
                  <DetailHeader>
                    <DetailTitle>
                      Edit Fighter Profile
                      <span>✨</span>
                    </DetailTitle>
                    <DetailSub>
                      Fine-tune access, fix typos, and keep your house
                      clean.
                    </DetailSub>
                  </DetailHeader>

                  <DetailForm
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!saving) handleSave();
                    }}
                  >
                    <FormRow>
                      <FormLabel htmlFor="name">
                        Full Name
                      </FormLabel>
                      <FormInput
                        id="name"
                        type="text"
                        value={selected.name || ""}
                        onChange={(e) =>
                          handleFieldChange("name", e.target.value)
                        }
                        placeholder="Enter full name"
                      />
                    </FormRow>

                    <FormRow>
                      <FormLabel htmlFor="email">
                        Email
                      </FormLabel>
                      <FormInput
                        id="email"
                        type="email"
                        value={selected.email || ""}
                        onChange={(e) =>
                          handleFieldChange("email", e.target.value)
                        }
                        placeholder="Email address"
                      />
                    </FormRow>

                    <FormRowColumns>
                      <FormCol>
                        <FormLabel htmlFor="role">
                          Role
                        </FormLabel>
                        <Select
                          id="role"
                          value={selected.role}
                          onChange={(e) =>
                            handleFieldChange(
                              "role",
                              e.target.value
                            )
                          }
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </FormCol>
                      <FormCol>
                        <FormLabel>Status</FormLabel>
                        <ToggleWrap
                          onClick={() =>
                            handleFieldChange(
                              "isActive",
                              !selected.isActive
                            )
                          }
                          $active={selected.isActive}
                          type="button"
                        >
                          <ToggleKnob />
                          <ToggleText>
                            {selected.isActive
                              ? "Active"
                              : "Inactive"}
                          </ToggleText>
                        </ToggleWrap>
                      </FormCol>
                    </FormRowColumns>

                    <FormFooter>
                      <FooterLeft>
                        <DangerText>
                          Deleting is permanent. No second chances.
                        </DangerText>
                      </FooterLeft>
                      <ButtonsRow>
                        <DeleteButton
                          type="button"
                          disabled={
                            deletingId ===
                            (selected._id || selected.id)
                          }
                          onClick={() => handleDelete(selected)}
                        >
                          {deletingId ===
                          (selected._id || selected.id)
                            ? "Deleting…"
                            : "Delete User"}
                        </DeleteButton>
                        <SaveButton
                          type="submit"
                          disabled={saving}
                        >
                          {saving ? "Saving…" : "Save Changes"}
                        </SaveButton>
                      </ButtonsRow>
                    </FormFooter>
                  </DetailForm>
                </DetailCard>
              )}
            </RightPane>
          </Content>
        </Inner>
      </Page>

      <Footer />
    </>
  );
}

// ====== Animations & styled components ======

const fadeUp = keyframes`
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
`;

const Page = styled.div`
  min-height: 100dvh;
  padding: 2.5rem 1.5rem 3rem;
  background:
    radial-gradient(1200px 600px at 80% -10%, ${theme.colors.ivory}0a, transparent 60%),
    linear-gradient(180deg, ${theme.colors.darkBrown} 0%, ${theme.colors.cocoa} 100%);
  color: ${theme.colors.ivory};
  display: flex;
  justify-content: center;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${theme.layout.max};
  animation: ${fadeUp} 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
`;

const HeaderRow = styled.header`
  margin-bottom: 1.75rem;
`;

const Title = styled.h1`
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  letter-spacing: 0.03em;
  font-weight: 800;
  margin: 0 0 0.4rem 0;
  text-shadow: ${theme.shadow.glow};
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span {
    font-size: 1.4em;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  max-width: 640px;
  font-size: 0.98rem;
  color: ${theme.colors.lightBrown};
  opacity: 0.9;
`;

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: stretch;
  margin-bottom: 1.75rem;
`;

const StatsRow = styled.div`
  flex: 2;
  min-width: 260px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: linear-gradient(145deg, ${theme.colors.brown}, ${theme.colors.cocoa});
  border-radius: ${theme.radius.lg};
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: ${theme.shadow.soft};
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${theme.colors.lightBrown};
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.15rem;
  color: ${theme.colors.ivory};
`;

const StatHint = styled.div`
  font-size: 0.8rem;
  color: ${theme.colors.lightBrown};
  opacity: 0.9;
`;

const SearchWrap = styled.div`
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: stretch;
`;

const SearchInput = styled.input`
  width: 100%;
  border-radius: ${theme.radius.lg};
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: ${theme.colors.black};
  color: ${theme.colors.ivory};
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  outline: none;
  box-shadow: ${theme.shadow.soft};
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;

  &::placeholder {
    color: rgba(255, 249, 242, 0.4);
  }

  &:focus {
    border-color: ${theme.colors.lightBrown};
    background: #120a07;
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.4), ${theme.shadow.soft};
  }
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.2fr);
  gap: 1.4rem;

  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const LeftPane = styled.section`
  background: ${theme.colors.black};
  border-radius: ${theme.radius.xl};
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: ${theme.shadow.hard};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ListHeader = styled.div`
  padding: 0.9rem 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(
    145deg,
    rgba(214, 182, 159, 0.06),
    rgba(0, 0, 0, 0.9)
  );
`;

const ListTitle = styled.h2`
  margin: 0;
  font-size: 0.98rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${theme.colors.lightBrown};
`;

const ListBody = styled.div`
  padding: 0.4rem 0.3rem 0.3rem;
  max-height: 540px;
  overflow: auto;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(214, 182, 159, 0.35);
    border-radius: 999px;
  }
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const UserRow = styled.button`
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  background: ${({ $active }) =>
    $active ? "rgba(214,182,159,0.09)" : "transparent"};
  border-radius: ${theme.radius.md};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214,182,159,0.4)" : "rgba(255,255,255,0.06)"};
  cursor: pointer;
  text-align: left;
  color: ${theme.colors.ivory};
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 140ms ease,
    box-shadow 140ms ease;

  &:hover {
    background: rgba(214, 182, 159, 0.12);
    border-color: rgba(214, 182, 159, 0.55);
    transform: translateY(-1px);
    box-shadow: ${theme.shadow.soft};
  }
`;

const AvatarCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 0%, #fff9f2, ${theme.colors.brown});
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  color: ${theme.colors.black};
`;

const UserMeta = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const UserName = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

const UserEmail = styled.div`
  font-size: 0.8rem;
  color: ${theme.colors.lightBrown};
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

const UserBadges = styled.div`
  margin-top: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
`;

const Badge = styled.span`
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: ${theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.18);
  ${({ $variant }) =>
    $variant === "admin"
      ? css`
          background: linear-gradient(
            135deg,
            rgba(214, 182, 159, 0.25),
            rgba(255, 249, 242, 0.08)
          );
          color: ${theme.colors.ivory};
        `
      : $variant === "active"
      ? css`
          background: rgba(116, 196, 124, 0.12);
          color: #b8f5c0;
          border-color: rgba(184, 245, 192, 0.4);
        `
      : $variant === "inactive"
      ? css`
          background: rgba(255, 85, 85, 0.05);
          color: #ffb0b0;
          border-color: rgba(255, 176, 176, 0.5);
        `
      : css`
          background: rgba(255, 255, 255, 0.04);
          color: ${theme.colors.lightBrown};
        `}
`;

const UserEdge = styled.div`
  display: flex;
  align-items: flex-end;
`;

const SmallText = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 249, 242, 0.7);
  white-space: nowrap;
`;

const Empty = styled.div`
  padding: 1.4rem 1rem 1.2rem;
  font-size: 0.9rem;
  color: ${theme.colors.lightBrown};
`;

const SkeletonList = styled.div`
  padding: 0.3rem 0.4rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const SkeletonRow = styled.div`
  height: 52px;
  border-radius: ${theme.radius.md};
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.09) 50%,
    rgba(255, 255, 255, 0.04) 100%
  );
  background-size: 200px 100%;
  animation: ${shimmer} 1.2s linear infinite;
`;

const RightPane = styled.section`
  background: radial-gradient(circle at 0% 0%, rgba(214, 182, 159, 0.12), #050302);
  border-radius: ${theme.radius.xl};
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${theme.shadow.hard};
  padding: 1.2rem 1.25rem 1.4rem;
  min-height: 260px;
  display: flex;
`;

const EmptyDetail = styled.div`
  margin: auto;
  max-width: 320px;
  text-align: center;
`;

const EmptyTitle = styled.h3`
  margin: 0 0 0.4rem 0;
  font-size: 1.1rem;
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${theme.colors.lightBrown};
`;

const DetailCard = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const DetailHeader = styled.div`
  margin-bottom: 1rem;
`;

const DetailTitle = styled.h3`
  margin: 0 0 0.35rem 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;

  span {
    font-size: 1.2em;
  }
`;

const DetailSub = styled.p`
  margin: 0;
  font-size: 0.88rem;
  color: ${theme.colors.lightBrown};
`;

const DetailForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FormRowColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 0.75rem;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const FormCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FormLabel = styled.label`
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${theme.colors.lightBrown};
`;

const baseInputCss = css`
  width: 100%;
  border-radius: ${theme.radius.md};
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.85);
  color: ${theme.colors.ivory};
  padding: 0.7rem 0.8rem;
  font-size: 0.92rem;
  outline: none;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    background 150ms ease;

  &::placeholder {
    color: rgba(255, 249, 242, 0.42);
  }

  &:focus {
    border-color: ${theme.colors.lightBrown};
    background: #120a07;
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.4), ${theme.shadow.soft};
  }
`;

const FormInput = styled.input`
  ${baseInputCss}
`;

const Select = styled.select`
  ${baseInputCss}
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #d6b69f 50%),
    linear-gradient(135deg, #d6b69f 50%, transparent 50%);
  background-position: calc(100% - 18px) 50%, calc(100% - 12px) 50%;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
`;

const ToggleWrap = styled.button`
  border-radius: 999px;
  border: 1px solid
    ${({ $active }) =>
      $active
        ? "rgba(184, 245, 192, 0.7)"
        : "rgba(255, 255, 255, 0.18)"};
  background: ${({ $active }) =>
    $active ? "rgba(184, 245, 192, 0.15)" : "rgba(0,0,0,0.8)"};
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.25rem;
  gap: 0.35rem;
  cursor: pointer;
  transition:
    background 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;
`;

const ToggleKnob = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 0, #fff9f2, #5ac06a);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25),
    0 8px 16px rgba(0, 0, 0, 0.5);
`;

const ToggleText = styled.span`
  font-size: 0.8rem;
  color: ${theme.colors.ivory};
  padding-right: 0.55rem;
`;

const FormFooter = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: center;
  justify-content: space-between;
`;

const FooterLeft = styled.div`
  flex: 1;
  min-width: 180px;
`;

const DangerText = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: #ffb0b0;
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const BaseButton = styled.button`
  border-radius: ${theme.radius.pill};
  padding: 0.6rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease,
    transform 120ms ease,
    border-color 150ms ease;

  &:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
    box-shadow: none;
  }

  &:not(:disabled):active {
    transform: translateY(1px);
    box-shadow: none;
  }
`;

const SaveButton = styled(BaseButton)`
  background: linear-gradient(
    135deg,
    ${theme.colors.lightBrown},
    ${theme.colors.ivory}
  );
  color: ${theme.colors.black};
  box-shadow: ${theme.shadow.soft};
  border-color: rgba(255, 249, 242, 0.7);

  &:hover:not(:disabled) {
    box-shadow: ${theme.shadow.hard};
  }
`;

const DeleteButton = styled(BaseButton)`
  background: rgba(255, 84, 84, 0.14);
  color: #ffb0b0;
  border-color: rgba(255, 176, 176, 0.5);

  &:hover:not(:disabled) {
    background: rgba(255, 84, 84, 0.22);
  }
`;
