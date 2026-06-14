// src/pages/ManageUsers.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import theme from "../Styles/theme";
import { useToast } from "../components/Toast";

import {
  fetchManageUsers,
  fetchManageUserById,
  updateManageUser,
  updateManageUserStatus,
  forceLogoutManageUser,
  softDeleteManageUser,
  restoreManageUser,
  deleteManageUser,
  setSelectedManageUser,
  setManageUserSearch,
  setManageUserFilter,
} from "../reducers/manageUsers/manageUserActions";

export default function ManageUsers() {
  const dispatch = useDispatch();
  const toastCtx = useToast();

  const showToast =
    typeof toastCtx === "function"
      ? toastCtx
      : toastCtx?.showToast || toastCtx?.addToast || toastCtx?.pushToast;

  const manageUsersState = useSelector((state) => state.manageUsers || {});
  const currentAdmin = useSelector(
    (state) => state.auth?.user || state.user?.user || null
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const users = Array.isArray(manageUsersState.users)
  ? manageUsersState.users
  : [];

  const selected = manageUsersState.selectedUser || null;
  const loading = Boolean(manageUsersState.loading);
  const saving = Boolean(manageUsersState.updating);
  const changingStatus = Boolean(manageUsersState.changingStatus);
  const forceLoggingOut = Boolean(manageUsersState.forceLoggingOut);
  const softDeleting = Boolean(manageUsersState.softDeleting);
  const deleting = Boolean(manageUsersState.deleting);
  const restoring = Boolean(manageUsersState.restoring);

  const search = manageUsersState.search || "";
  const filter = manageUsersState.filter || "all";
  const analytics =
  manageUsersState.analytics &&
  typeof manageUsersState.analytics === "object"
    ? manageUsersState.analytics
    : {};

  const [localSelected, setLocalSelected] = useState(null);
  const [statusReason, setStatusReason] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

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

    if (email.length > 0) return email.split("@")[0] || email;

    return "User";
  };

  const getUserId = (u) => u?._id || u?.id || null;

  const isSameUser = (a, b) => {
    const first = getUserId(a);
    const second = getUserId(b);

    return Boolean(first && second && String(first) === String(second));
  };

  const selectedIsCurrentAdmin = isSameUser(localSelected, currentAdmin);

  useEffect(() => {
    dispatch(fetchManageUsers({ includeDeleted }));
  }, [dispatch, includeDeleted]);

  useEffect(() => {
    if (selected) {
      setLocalSelected(selected);
      setStatusReason(selected.statusReason || "");
    }
  }, [selected]);

  const totalUsers = analytics.total || users.length || 0;
  const activeCount = analytics.active || 0;
  const adminCount = analytics.admins || 0;

  const handleSelect = async (user) => {
    const id = getUserId(user);

    if (!id) {
      dispatch(setSelectedManageUser(null));
      setLocalSelected(null);
      return;
    }

    const res = await dispatch(fetchManageUserById(id));

    if (res?.ok) {
      dispatch(setSelectedManageUser(res.user));
      setLocalSelected(res.user);
      setStatusReason(res.user?.statusReason || "");
      return;
    }

    showToast?.({
      type: "error",
      message: res?.message || "Failed to load user details.",
    });
  };

  const handleFieldChange = (field, value) => {
    setLocalSelected((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (saving) return;
    
    const id = getUserId(localSelected);
    if (!id) return;

    const payload = {
      name: localSelected.name,
      email: localSelected.email,
      role: localSelected.role,
      phone: localSelected.phone,
      location: localSelected.location,
      website: localSelected.website,
      instagram: localSelected.instagram,
      tiktok: localSelected.tiktok,
      youtube: localSelected.youtube,
      xhandle: localSelected.xhandle,
      headline: localSelected.headline,
      bio: localSelected.bio,
      notifications: localSelected.notifications,
      adminNotes: localSelected.adminNotes,
      statusReason,
    };

    const res = await dispatch(updateManageUser(id, payload));

    showToast?.({
      type: res?.ok ? "success" : "error",
      message:
        res?.message ||
        (res?.ok ? "User updated successfully." : "Failed to update user."),
    });
  };

  const handleStatusChange = async (nextStatus) => {
    if (changingStatus) return;
    
    const id = getUserId(localSelected);
    if (!id) return;

    const reason =
      statusReason || `Account status changed to ${nextStatus} by admin.`;

    const res = await dispatch(
      updateManageUserStatus(id, {
        accountStatus: nextStatus,
        statusReason: reason,
      })
    );

    showToast?.({
      type: res?.ok ? "success" : "error",
      message:
        res?.message ||
        (res?.ok ? "User status updated." : "Failed to update user status."),
    });
  };

  const handleForceLogout = async () => {
    const id = getUserId(localSelected);
    if (!id) return;

    const ok = window.confirm(
      `Force logout ${
  getSafeName(localSelected) || localSelected.email || "this user"
}?`
    );

    if (!ok) return;

    const res = await dispatch(forceLogoutManageUser(id));

    showToast?.({
      type: res?.ok ? "success" : "error",
      message:
        res?.message ||
        (res?.ok
          ? "User logged out from all devices."
          : "Failed to force logout user."),
    });
  };

  const handleSoftDelete = async () => {
    const id = getUserId(localSelected);
    if (!id || selectedIsCurrentAdmin) return;

    const ok = window.confirm(
      `Deactivate and archive ${
  getSafeName(localSelected) || localSelected.email || "this user"
}?`
    );

    if (!ok) return;

    const res = await dispatch(
      softDeleteManageUser(id, {
        statusReason:
          statusReason || "Account deactivated and archived by admin.",
      })
    );

    showToast?.({
      type: res?.ok ? "success" : "error",
      message:
        res?.message ||
        (res?.ok ? "User archived successfully." : "Failed to archive user."),
    });
  };

  const handleRestoreUser = async () => {
  const id = getUserId(localSelected);
  if (!id || selectedIsCurrentAdmin) return;

  const ok = window.confirm(
    `Restore ${
  getSafeName(localSelected) || localSelected.email || "this user"
} back to active access?`
  );

  if (!ok) return;

  const res = await dispatch(
    restoreManageUser(id, {
      statusReason: statusReason || "Account restored by admin.",
    })
  );

  showToast?.({
    type: res?.ok ? "success" : "error",
    message:
      res?.message ||
      (res?.ok ? "User restored successfully." : "Failed to restore user."),
  });
};

  const handleDelete = async (user) => {
    const id = getUserId(user);
    if (!id || selectedIsCurrentAdmin) return;

    const ok = window.confirm(
      `Permanently delete ${
        getSafeName(user) || user.email || "this user"
      }? This cannot be undone.`
    );

    if (!ok) return;

    const res = await dispatch(deleteManageUser(id));

    if (res?.ok) {
      dispatch(setSelectedManageUser(null));
      setLocalSelected(null);

      showToast?.({
        type: "success",
        message: res.message || "User permanently deleted.",
      });
      return;
    }

    showToast?.({
      type: "error",
      message: res?.message || "Failed to delete user.",
    });
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((u) => {
      const name = String(u.name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();
      const status = String(u.accountStatus || "active").toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        status.includes(q);

      const matchesFilter =
        filter === "all"
          ? !u.isDeleted
          : filter === "admin"
          ? role === "admin"
          : filter === "deleted"
          ? u.isDeleted === true
          : status === filter && !u.isDeleted;

      return matchesSearch && matchesFilter;
    });
  }, [users, search, filter]);

  const filterOptions = useMemo(() => [
    { value: "all", label: "All Active" },
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On Hold" },
    { value: "suspended", label: "Suspended" },
    { value: "banned", label: "Banned" },
    { value: "deactivated", label: "Deactivated" },
    { value: "admin", label: "Admins" },
    { value: "deleted", label: "Deleted" },
  ], []);

  return (
    <>
      <Page>
        <Inner>
          <HeaderRow>
            <Kicker>10/10 Admin Protection • User Control • Elite Security</Kicker>

            <Title>
              Stop Risky Accounts Before They Damage The Platform <span>🛡️</span>
            </Title>

            <Subtitle>
              Search, inspect, edit, suspend, ban, force logout, archive, and
              permanently remove users from one luxury-grade admin command center.
            </Subtitle>
          </HeaderRow>

          <TopBar>
           <StatsRow>
  <StatCard>
    <StatLabel>Total Users</StatLabel>
    <StatValue>{totalUsers}</StatValue>
    <StatHint>All registered users.</StatHint>
  </StatCard>

  <StatCard>
    <StatLabel>Active</StatLabel>
    <StatValue>{activeCount}</StatValue>
    <StatHint>Clean accounts with full access.</StatHint>
  </StatCard>

  <StatCard>
    <StatLabel>Admins</StatLabel>
    <StatValue>{adminCount}</StatValue>
    <StatHint>Elevated internal accounts.</StatHint>
  </StatCard>

  <StatCard>
    <StatLabel>Verified</StatLabel>
    <StatValue>{analytics.verifiedUsers || 0}</StatValue>
    <StatHint>Users with verified accounts.</StatHint>
  </StatCard>

  <StatCard>
    <StatLabel>Unverified</StatLabel>
    <StatValue>{analytics.unverifiedUsers || 0}</StatValue>
    <StatHint>Accounts needing verification.</StatHint>
  </StatCard>

  <StatCard>
    <StatLabel>Archived</StatLabel>
    <StatValue>{analytics.deleted || 0}</StatValue>
    <StatHint>Soft-deleted user records.</StatHint>
  </StatCard>
</StatsRow>

            <SearchWrap>
              <SearchInput
                type="text"
                placeholder="Search by name, email, role, or status…"
                value={search}
                onChange={(e) => dispatch(setManageUserSearch(e.target.value))}
              />
            </SearchWrap>

            <FilterBar>
              {filterOptions.map((item) => (
                <FilterButton
                  key={item.value}
                  type="button"
                  $active={filter === item.value}
                  onClick={() => dispatch(setManageUserFilter(item.value))}
                >
                  {item.label}
                </FilterButton>
              ))}

              <ArchiveToggle
  type="button"
  $active={includeDeleted}
  onClick={() => {
    const next = !includeDeleted;

    setIncludeDeleted(next);

    if (next) {
      dispatch(setManageUserFilter("deleted"));
    } else {
      dispatch(setManageUserFilter("all"));

      if (localSelected?.isDeleted) {
        dispatch(setSelectedManageUser(null));
        setLocalSelected(null);
      }
    }
  }}
>
  {includeDeleted ? "Hide Archive" : "Show Archive"}
</ArchiveToggle>
            </FilterBar>
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
                  <Empty>No users found. Try adjusting your search.</Empty>
                ) : (
                  <UserList role="list" aria-label="Users">
                    {filteredUsers.map((u) => {
                      const isSelected =
                        selected &&
                        String(getUserId(selected)) === String(getUserId(u));

                      const displayName = getSafeName(u);
                      const avatarInitial = displayName
                        .trim()
                        .charAt(0)
                        .toUpperCase();

                      return (
                        <UserRow
                          key={getUserId(u)}
                          role="listitem"
                          type="button"
                          onClick={() => handleSelect(u)}
                          $active={isSelected}
                        >
                          <AvatarCircle>{avatarInitial}</AvatarCircle>

                          <UserMeta>
                            <UserName>{displayName}</UserName>
                            <UserEmail>{u.email || "No email"}</UserEmail>

                            <UserBadges>
                              <Badge
                                $variant={u.role === "admin" ? "admin" : "user"}
                              >
                                {u.role || "user"}
                              </Badge>

                              <Badge $variant={u.accountStatus || "active"}>
                                {String(u.accountStatus || "active").replaceAll("_", " ")}
                              </Badge>

                              {u.isDeleted ? (
                                <Badge $variant="inactive">Archived</Badge>
                              ) : null}
                            </UserBadges>
                          </UserMeta>

                          <UserEdge>
                            {u.createdAt ? (
                              <SmallText>
                                Joined{" "}
                                {new Date(u.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </SmallText>
                            ) : null}
                          </UserEdge>
                        </UserRow>
                      );
                    })}
                  </UserList>
                )}
              </ListBody>
            </LeftPane>

            <RightPane>
              {!localSelected ? (
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
                      User Control Room <span>✨</span>
                    </DetailTitle>
                    <DetailSub>
                      Full profile, access control, moderation status, and
                      security actions in one premium admin panel.
                    </DetailSub>
                  </DetailHeader>

                  <ProfileStrip>
                    <BigAvatar>
                      {getSafeName(localSelected).trim().charAt(0).toUpperCase()}
                    </BigAvatar>

                    <ProfileMeta>
                      <strong>{getSafeName(localSelected)}</strong>
                      <span>{localSelected.email || "No email"}</span>

                      <BadgeRow>
                        <Badge
                          $variant={
                            localSelected.role === "admin" ? "admin" : "user"
                          }
                        >
                          {localSelected.role || "user"}
                        </Badge>

                        <Badge
                          $variant={localSelected.accountStatus || "active"}
                        >
                          {String(
                            localSelected.accountStatus || "active"
                          ).replace("_", " ")}
                        </Badge>

                        {localSelected.isDeleted ? (
                          <Badge $variant="inactive">Archived</Badge>
                        ) : null}
                      </BadgeRow>
                    </ProfileMeta>
                  </ProfileStrip>

                  <DetailForm
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!saving) handleSave();
                    }}
                  >
                    <FormRowColumns>
                      <FormCol>
                        <FormLabel htmlFor="name">Full Name</FormLabel>
                        <FormInput
                          id="name"
                          type="text"
                          value={localSelected.name || ""}
                          onChange={(e) =>
                            handleFieldChange("name", e.target.value)
                          }
                          placeholder="Enter full name"
                        />
                      </FormCol>

                      <FormCol>
                        <FormLabel htmlFor="email">Email</FormLabel>
                        <FormInput
                          id="email"
                          type="email"
                          value={localSelected.email || ""}
                          onChange={(e) =>
                            handleFieldChange("email", e.target.value)
                          }
                          placeholder="Email address"
                        />
                      </FormCol>
                    </FormRowColumns>

                    <FormRowColumns>
                      <FormCol>
                        <FormLabel htmlFor="role">Role</FormLabel>
                        <Select
                          id="role"
                          value={localSelected.role || "user"}
                          onChange={(e) =>
                            handleFieldChange("role", e.target.value)
                          }
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </FormCol>

                      <FormCol>
                        <FormLabel htmlFor="headline">Headline</FormLabel>
                        <FormInput
                          id="headline"
                          type="text"
                          value={localSelected.headline || ""}
                          onChange={(e) =>
                            handleFieldChange("headline", e.target.value)
                          }
                          placeholder="Short profile headline"
                        />
                      </FormCol>
                    </FormRowColumns>

                    <FormRowColumns>
                      <FormCol>
                        <FormLabel htmlFor="phone">Phone</FormLabel>
                        <FormInput
                          id="phone"
                          type="text"
                          value={localSelected.phone || ""}
                          onChange={(e) =>
                            handleFieldChange("phone", e.target.value)
                          }
                          placeholder="Phone number"
                        />
                      </FormCol>

                      <FormCol>
                        <FormLabel htmlFor="location">Location</FormLabel>
                        <FormInput
                          id="location"
                          type="text"
                          value={localSelected.location || ""}
                          onChange={(e) =>
                            handleFieldChange("location", e.target.value)
                          }
                          placeholder="City, State, Country"
                        />
                      </FormCol>
                    </FormRowColumns>

                    <FormRowColumns>
                      <FormCol>
                        <FormLabel htmlFor="website">Website</FormLabel>
                        <FormInput
                          id="website"
                          type="text"
                          value={localSelected.website || ""}
                          onChange={(e) =>
                            handleFieldChange("website", e.target.value)
                          }
                          placeholder="Website URL"
                        />
                      </FormCol>

                      <FormCol>
                        <FormLabel htmlFor="instagram">Instagram</FormLabel>
                        <FormInput
                          id="instagram"
                          type="text"
                          value={localSelected.instagram || ""}
                          onChange={(e) =>
                            handleFieldChange("instagram", e.target.value)
                          }
                          placeholder="@instagram"
                        />
                      </FormCol>
                    </FormRowColumns>

                    <FormRowColumns>
                      <FormCol>
                        <FormLabel htmlFor="tiktok">TikTok</FormLabel>
                        <FormInput
                          id="tiktok"
                          type="text"
                          value={localSelected.tiktok || ""}
                          onChange={(e) =>
                            handleFieldChange("tiktok", e.target.value)
                          }
                          placeholder="@tiktok"
                        />
                      </FormCol>

                      <FormCol>
                        <FormLabel htmlFor="youtube">YouTube</FormLabel>
                        <FormInput
                          id="youtube"
                          type="text"
                          value={localSelected.youtube || ""}
                          onChange={(e) =>
                            handleFieldChange("youtube", e.target.value)
                          }
                          placeholder="YouTube link"
                        />
                      </FormCol>
                    </FormRowColumns>

                    <FormRow>
                      <FormLabel htmlFor="bio">Bio</FormLabel>
                      <TextArea
                        id="bio"
                        value={localSelected.bio || ""}
                        onChange={(e) =>
                          handleFieldChange("bio", e.target.value)
                        }
                        placeholder="User profile bio"
                      />
                    </FormRow>

                    <FormRow>
                      <FormLabel htmlFor="adminNotes">
                        Private Admin Notes
                      </FormLabel>
                      <TextArea
                        id="adminNotes"
                        value={localSelected.adminNotes || ""}
                        onChange={(e) =>
                          handleFieldChange("adminNotes", e.target.value)
                        }
                        placeholder="Internal notes only visible to admins..."
                      />
                    </FormRow>

                    <FormRow>
                      <FormLabel htmlFor="statusReason">
                        Status Reason
                      </FormLabel>
                      <TextArea
                        id="statusReason"
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="Why is this user being held, suspended, banned, or reactivated?"
                      />
                    </FormRow>

                    <SecurityGrid>
                      <SecurityBox>
                        <strong>Joined</strong>
                        <span>
                          {localSelected.createdAt
                            ? new Date(
                                localSelected.createdAt
                              ).toLocaleDateString()
                            : "—"}
                        </span>
                      </SecurityBox>

                      <SecurityBox>
                        <strong>Last Login</strong>
                        <span>
                          {localSelected.lastLoginAt
                            ? new Date(
                                localSelected.lastLoginAt
                              ).toLocaleString()
                            : "—"}
                        </span>
                      </SecurityBox>

                      <SecurityBox>
                        <strong>Login Count</strong>
                        <span>{localSelected.loginCount || 0}</span>
                      </SecurityBox>

                      <SecurityBox>
                        <strong>Last IP</strong>
                        <span>{localSelected.lastLoginIp || "—"}</span>
                      </SecurityBox>
                    </SecurityGrid>

                    {selectedIsCurrentAdmin ? (
                      <SelfProtectionNotice>
                        You are viewing your own admin account. Archive and hard
                        delete are locked to prevent accidental platform lockout.
                      </SelfProtectionNotice>
                    ) : null}

                    <ActionPanel>
                      <ActionTitle>Account Actions</ActionTitle>

                      <ActionGrid>
                        <ActionButton
                          type="button"
                          disabled={changingStatus}
                          onClick={() => handleStatusChange("active")}
                        >
                          Activate
                        </ActionButton>

                        <ActionButton
                          type="button"
                          disabled={changingStatus}
                          onClick={() => handleStatusChange("on_hold")}
                        >
                          Put On Hold
                        </ActionButton>

                        <ActionButton
                          type="button"
                          disabled={changingStatus}
                          onClick={() => handleStatusChange("suspended")}
                        >
                          Suspend
                        </ActionButton>

                        <DangerActionButton
                          type="button"
                          disabled={changingStatus}
                          onClick={() => handleStatusChange("banned")}
                        >
                          Ban
                        </DangerActionButton>

                        <DangerActionButton
                          type="button"
                          disabled={softDeleting || selectedIsCurrentAdmin}
                          onClick={handleSoftDelete}
                        >
                          {softDeleting ? "Archiving..." : "Soft Delete"}
                        </DangerActionButton>
                           {localSelected.isDeleted ? (
  <ActionButton
    type="button"
    disabled={restoring || selectedIsCurrentAdmin}
    onClick={handleRestoreUser}
  >
    {restoring ? "Restoring..." : "Restore User"}
  </ActionButton>
) : null}
                        <ActionButton
                          type="button"
                          disabled={forceLoggingOut}
                          onClick={handleForceLogout}
                        >
                          {forceLoggingOut ? "Logging Out..." : "Force Logout"}
                        </ActionButton>
                      </ActionGrid>
                    </ActionPanel>

                    <FormFooter>
                      <FooterLeft>
                        <DangerText>
                          Hard delete should only be used when you are sure.
                          Soft delete is safer for professional platforms.
                        </DangerText>
                      </FooterLeft>

                      <ButtonsRow>
                        <DeleteButton
                          type="button"
                          disabled={deleting || selectedIsCurrentAdmin}
                          onClick={() => handleDelete(localSelected)}
                        >
                          {deleting ? "Deleting…" : "Hard Delete"}
                        </DeleteButton>

                        <SaveButton type="submit" disabled={saving}>
                          {saving ? "Saving…" : "Save Profile"}
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
    </>
  );
}

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
    radial-gradient(
      1200px 600px at 80% -10%,
      ${theme.colors.ivory}0a,
      transparent 60%
    ),
    linear-gradient(
      180deg,
      ${theme.colors.darkBrown} 0%,
      ${theme.colors.cocoa} 100%
    );
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

const Kicker = styled.div`
  margin-bottom: 0.65rem;
  font-size: 0.78rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${theme.colors.lightBrown};
  font-weight: 900;
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
  max-width: 760px;
  font-size: 0.98rem;
  color: ${theme.colors.lightBrown};
  opacity: 0.92;
  line-height: 1.7;
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
  grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
  gap: 0.8rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: linear-gradient(
    145deg,
    ${theme.colors.brown},
    ${theme.colors.cocoa}
  );
  border-radius: ${theme.radius.lg};
  padding: 0.95rem 1rem;
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
  font-size: 1.45rem;
  font-weight: 800;
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
  transition: border-color 160ms ease, box-shadow 160ms ease,
    background 160ms ease;

  &::placeholder {
    color: rgba(255, 249, 242, 0.4);
  }

  &:focus {
    border-color: ${theme.colors.lightBrown};
    background: #120a07;
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.4),
      ${theme.shadow.soft};
  }
`;

const FilterBar = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
`;

const FilterButton = styled.button`
  border-radius: ${theme.radius.pill};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214, 182, 159, 0.75)" : "rgba(255,255,255,0.12)"};
  background: ${({ $active }) =>
    $active
      ? `linear-gradient(135deg, ${theme.colors.lightBrown}, ${theme.colors.ivory})`
      : "rgba(0,0,0,0.58)"};
  color: ${({ $active }) =>
    $active ? theme.colors.black : theme.colors.ivory};
  padding: 0.55rem 0.9rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: ${({ $active }) => ($active ? theme.shadow.soft : "none")};
  transition: transform 140ms ease, box-shadow 140ms ease,
    border-color 140ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${theme.shadow.soft};
    border-color: rgba(214, 182, 159, 0.65);
  }
`;

const ArchiveToggle = styled(FilterButton)`
  margin-left: auto;
  border-color: ${({ $active }) =>
    $active ? "rgba(255,176,176,0.65)" : "rgba(214,182,159,0.35)"};
  background: ${({ $active }) =>
    $active ? "rgba(255,84,84,0.16)" : "rgba(0,0,0,0.62)"};
  color: ${({ $active }) => ($active ? "#ffb0b0" : theme.colors.ivory)};

  @media (max-width: 700px) {
    margin-left: 0;
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
  transition: background 160ms ease, border-color 160ms ease,
    transform 140ms ease, box-shadow 140ms ease;

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
  background: radial-gradient(
    circle at 30% 0%,
    #fff9f2,
    ${theme.colors.brown}
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
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
  font-weight: 700;
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
  text-transform: capitalize;
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
      : $variant === "on_hold"
      ? css`
          background: rgba(250, 204, 21, 0.12);
          color: #fde68a;
          border-color: rgba(253, 230, 138, 0.45);
        `
      : $variant === "suspended"
      ? css`
          background: rgba(251, 146, 60, 0.12);
          color: #fed7aa;
          border-color: rgba(254, 215, 170, 0.48);
        `
      : $variant === "banned"
      ? css`
          background: rgba(239, 68, 68, 0.14);
          color: #fecaca;
          border-color: rgba(254, 202, 202, 0.5);
        `
      : $variant === "deactivated"
      ? css`
          background: rgba(148, 163, 184, 0.12);
          color: #cbd5e1;
          border-color: rgba(203, 213, 225, 0.42);
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
  background: radial-gradient(
    circle at 0% 0%,
    rgba(214, 182, 159, 0.12),
    #050302
  );
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
  line-height: 1.6;
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
  line-height: 1.6;
`;

const ProfileStrip = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: ${theme.radius.lg};
  background: linear-gradient(
    135deg,
    rgba(214, 182, 159, 0.12),
    rgba(0, 0, 0, 0.72)
  );
  border: 1px solid rgba(214, 182, 159, 0.22);
`;

const BigAvatar = styled.div`
  width: 62px;
  height: 62px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 950;
  color: ${theme.colors.black};
  background: radial-gradient(
    circle at 28% 0%,
    #fff9f2,
    ${theme.colors.lightBrown}
  );
  box-shadow: ${theme.shadow.glow};
  flex: 0 0 auto;
`;

const ProfileMeta = styled.div`
  min-width: 0;

  strong {
    display: block;
    font-size: 1.05rem;
    color: ${theme.colors.ivory};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    display: block;
    margin-top: 0.2rem;
    color: ${theme.colors.lightBrown};
    font-size: 0.88rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const BadgeRow = styled.div`
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
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
  transition: border-color 150ms ease, box-shadow 150ms ease,
    background 150ms ease;

  &::placeholder {
    color: rgba(255, 249, 242, 0.42);
  }

  &:focus {
    border-color: ${theme.colors.lightBrown};
    background: #120a07;
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.4),
      ${theme.shadow.soft};
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

const TextArea = styled.textarea`
  ${baseInputCss}
  min-height: 92px;
  resize: vertical;
  line-height: 1.5;
`;

const SecurityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SecurityBox = styled.div`
  padding: 0.8rem;
  border-radius: ${theme.radius.md};
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(214, 182, 159, 0.16);

  strong {
    display: block;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: ${theme.colors.lightBrown};
    margin-bottom: 0.35rem;
  }

  span {
    display: block;
    color: ${theme.colors.ivory};
    font-size: 0.84rem;
    overflow-wrap: anywhere;
  }
`;

const SelfProtectionNotice = styled.div`
  padding: 0.85rem 1rem;
  border-radius: ${theme.radius.lg};
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(253, 230, 138, 0.35);
  color: #fde68a;
  font-size: 0.86rem;
  line-height: 1.5;
`;

const ActionPanel = styled.div`
  margin-top: 0.3rem;
  padding: 1rem;
  border-radius: ${theme.radius.lg};
  background: radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.12),
      transparent 48%
    ),
    rgba(0, 0, 0, 0.58);
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const ActionTitle = styled.h4`
  margin: 0 0 0.8rem;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: ${theme.colors.lightBrown};
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
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
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease,
    transform 120ms ease, border-color 150ms ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

const ActionButton = styled(BaseButton)`
  background: rgba(214, 182, 159, 0.1);
  color: ${theme.colors.ivory};
  border-color: rgba(214, 182, 159, 0.32);

  &:hover:not(:disabled) {
    background: rgba(214, 182, 159, 0.18);
    box-shadow: ${theme.shadow.soft};
  }
`;

const DangerActionButton = styled(BaseButton)`
  background: rgba(255, 84, 84, 0.12);
  color: #ffb0b0;
  border-color: rgba(255, 176, 176, 0.46);

  &:hover:not(:disabled) {
    background: rgba(255, 84, 84, 0.2);
  }
`;
