// src/pages/AdminSystemCleanup.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import axiosInstance from "../../utils/axiosInstance";
import {
  socket,
  joinSystemSocketRoom,
  leaveSystemSocketRoom,
} from "../../utils/socket";

const DEFAULT_TITLE = "KnockoutCodes is upgrading";
const DEFAULT_MESSAGE =
  "We are improving the training room. Please check back shortly.";

export default function AdminSystemCleanup() {
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [settings, setSettings] = useState([]);
  const [activeSetting, setActiveSetting] = useState(null);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    maintenanceTitle: DEFAULT_TITLE,
    maintenanceMessage: DEFAULT_MESSAGE,
    allowAdminAccess: true,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cleanupLockRef = useRef(false);
  const maintenanceLockRef = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = Array.isArray(result?.results) ? result.results : [];

  const maintenanceOn = Boolean(activeSetting?.maintenanceMode);

  const stats = useMemo(
    () => ({
      total: rows.length,
      dropped: rows.filter((r) => r?.action === "dropped").length,
      created: rows.filter((r) => r?.action === "created_or_confirmed").length,
      skipped: rows.filter((r) => r?.action === "not_found").length,
      failed: rows.filter((r) => String(r?.action || "").includes("failed"))
        .length,
    }),
    [rows]
  );

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      setError("");

      const res = await axiosInstance.get("/system/admin/settings");
      const data = Array.isArray(res.data?.data) ? res.data.data : [];

      setSettings(data);

      const current = data[0] || null;
      setActiveSetting(current);

      setForm({
        maintenanceTitle: current?.maintenanceTitle || DEFAULT_TITLE,
        maintenanceMessage: current?.maintenanceMessage || DEFAULT_MESSAGE,
        allowAdminAccess: current?.allowAdminAccess !== false,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load system settings."
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
  joinSystemSocketRoom();

  const handleMaintenanceUpdate = (payload) => {
    if (!payload?._id) return;

    setActiveSetting(payload);

    setSettings((prev) => {
      const exists = prev.some((item) => item._id === payload._id);

      if (!exists) {
        return [payload, ...prev];
      }

      return prev.map((item) =>
        item._id === payload._id ? payload : item
      );
    });

    setForm({
      maintenanceTitle:
        payload.maintenanceTitle || DEFAULT_TITLE,
      maintenanceMessage:
        payload.maintenanceMessage || DEFAULT_MESSAGE,
      allowAdminAccess:
        payload.allowAdminAccess !== false,
    });
  };

  socket.on(
    "system:maintenance-updated",
    handleMaintenanceUpdate
  );

  return () => {
    socket.off(
      "system:maintenance-updated",
      handleMaintenanceUpdate
    );

    leaveSystemSocketRoom();
  };
}, []);

  const updateMaintenance = async (nextMode) => {
    if (maintenanceLoading || maintenanceLockRef.current) return;

    const confirmText = nextMode
      ? "Turn ON maintenance mode? Public pages will show the maintenance page. Admin pages will stay available."
      : "Turn OFF maintenance mode? Public pages will become available again.";

    if (!window.confirm(confirmText)) return;

    try {
      maintenanceLockRef.current = true;
      setMaintenanceLoading(true);
      setError("");
      setSuccess("");

      const res = await axiosInstance.put("/system/maintenance", {
        maintenanceMode: Boolean(nextMode),
        maintenanceTitle: form.maintenanceTitle || DEFAULT_TITLE,
        maintenanceMessage: form.maintenanceMessage || DEFAULT_MESSAGE,
        allowAdminAccess: form.allowAdminAccess !== false,
      });

      const updated = res.data?.data || null;

      if (updated?._id) {
        setActiveSetting(updated);
        setSettings((prev) => {
          const exists = prev.some((item) => item._id === updated._id);
          if (!exists) return [updated, ...prev];

          return prev.map((item) => (item._id === updated._id ? updated : item));
        });
      }

      setSuccess(
        res.data?.message ||
          (nextMode
            ? "Maintenance mode has been enabled."
            : "Maintenance mode has been disabled.")
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to update maintenance mode."
      );
    } finally {
      setMaintenanceLoading(false);
      maintenanceLockRef.current = false;
    }
  };

  const runCleanup = async () => {
    if (loading || cleanupLockRef.current) return;

    const confirmRun = window.confirm(
      "Run system cleanup? This safely repairs old database indexes."
    );

    if (!confirmRun) return;

    try {
      cleanupLockRef.current = true;
      setLoading(true);
      setError("");
      setSuccess("");
      setResult(null);

      const res = await axiosInstance.post("/system-cleanup/database-indexes", {});

      setResult({
        success: Boolean(res.data?.success),
        message: res.data?.message || "System cleanup completed.",
        results: Array.isArray(res.data?.results) ? res.data.results : [],
      });

      setSuccess(res.data?.message || "System cleanup completed.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Cleanup failed."
      );
    } finally {
      setLoading(false);
      cleanupLockRef.current = false;
    }
  };

  const deleteSetting = async (setting) => {
    if (!setting?._id || deletingId) return;

    if (settings.length <= 1) {
  setError("The main system setting is protected. You can only delete duplicate old records.");
  return;
}

    const confirmDelete = window.confirm(
      "Delete this system setting from the database? The system will safely recreate the default setting if needed."
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(setting._id);
      setError("");
      setSuccess("");

      const res = await axiosInstance.delete(`/system/admin/settings/${setting._id}`, {
  data: {},
});

      setSettings((prev) => prev.filter((item) => item._id !== setting._id));
      setSuccess(res.data?.message || "System setting deleted successfully.");

    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to delete system setting."
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <Page>
      <Shell>
        <Hero>
          <HeroContent>
            <Eyebrow>KnockoutCodes Admin Command Center</Eyebrow>
            <Title>System Control</Title>
            <Text>
              Control maintenance mode, keep admin access safe, and clean old
              database indexes from one protected enterprise page.
            </Text>

            <Actions>
              <PrimaryButton
                type="button"
                onClick={() => updateMaintenance(!maintenanceOn)}
                disabled={maintenanceLoading || settingsLoading}
              >
                {maintenanceLoading
                  ? "Updating..."
                  : maintenanceOn
                  ? "Turn Maintenance Off"
                  : "Turn Maintenance On"}
              </PrimaryButton>

              <CleanButton type="button" onClick={runCleanup} disabled={loading}>
                {loading ? "Cleaning..." : "Clean System"}
              </CleanButton>

              <GhostButton
                type="button"
                onClick={loadSettings}
                disabled={settingsLoading}
              >
                {settingsLoading ? "Refreshing..." : "Refresh"}
              </GhostButton>
            </Actions>
          </HeroContent>

          <StatusPanel>
            <StatusBadge $active={maintenanceOn}>
              {maintenanceOn ? "Maintenance On" : "System Live"}
            </StatusBadge>
            <StatusNumber>{result ? stats.total : settings.length}</StatusNumber>
            <StatusText>
              {result ? "Cleanup Operations" : "Setting Records"}
            </StatusText>
          </StatusPanel>
        </Hero>

        {error ? <ErrorBox role="alert">{error}</ErrorBox> : null}
        {success ? <SuccessBox>{success}</SuccessBox> : null}

        <ControlCard>
          <ResultHeader>
            <div>
              <ResultKicker>Maintenance Control</ResultKicker>
              <ResultTitle>Public page protection</ResultTitle>
            </div>

            <ActionPill $failed={maintenanceOn}>
              {maintenanceOn ? "Public Pages Locked" : "Public Pages Open"}
            </ActionPill>
          </ResultHeader>

          <FormGrid>
            <Field>
              <label htmlFor="maintenanceTitle">Title</label>
              <input
                id="maintenanceTitle"
                type="text"
                maxLength={120}
                value={form.maintenanceTitle}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maintenanceTitle: e.target.value,
                  }))
                }
              />
              <small>{form.maintenanceTitle.length}/120</small>
            </Field>

            <Field>
              <label htmlFor="maintenanceMessage">Message</label>
              <textarea
                id="maintenanceMessage"
                maxLength={500}
                value={form.maintenanceMessage}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    maintenanceMessage: e.target.value,
                  }))
                }
              />
              <small>{form.maintenanceMessage.length}/500</small>
            </Field>

            <CheckRow>
              <input
                id="allowAdminAccess"
                type="checkbox"
                checked={form.allowAdminAccess}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    allowAdminAccess: e.target.checked,
                  }))
                }
              />
              <label htmlFor="allowAdminAccess">
                Keep admin pages accessible during maintenance
              </label>
            </CheckRow>
          </FormGrid>
        </ControlCard>

        <ResultCard>
          <ResultHeader>
            <div>
              <ResultKicker>System Settings</ResultKicker>
              <ResultTitle>Database records</ResultTitle>
            </div>
          </ResultHeader>

          {settingsLoading ? (
            <EmptyState>Loading system settings...</EmptyState>
          ) : settings.length ? (
            <TableWrap>
              <Table>
                <TableHead>
                  <span>Title</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span>Action</span>
                </TableHead>

                {settings.map((setting) => (
                  <SettingRow key={setting._id}>
                    <strong>{setting.maintenanceTitle || "Untitled setting"}</strong>

                    <ActionPill $failed={setting.maintenanceMode}>
                      {setting.maintenanceMode
                        ? "Maintenance On"
                        : "Maintenance Off"}
                    </ActionPill>

                    <span>
                      {setting.updatedAt
                        ? new Date(setting.updatedAt).toLocaleString()
                        : "Not updated"}
                    </span>

                    <DangerButton
  type="button"
  onClick={() => deleteSetting(setting)}
  disabled={Boolean(deletingId) || settings.length <= 1}
>
  {deletingId === setting._id
    ? "Deleting..."
    : settings.length <= 1
    ? "Protected"
    : "Delete"}
</DangerButton>
                  </SettingRow>
                ))}
              </Table>
            </TableWrap>
          ) : (
            <EmptyState>No system setting records found.</EmptyState>
          )}
        </ResultCard>

        {result ? (
          <ResultCard>
            <ResultHeader>
              <div>
                <ResultKicker>Cleanup Report</ResultKicker>
                <ResultTitle>{result.message}</ResultTitle>
              </div>

              <StatWrap>
                <Stat>
                  <strong>{stats.dropped}</strong>
                  <span>Dropped</span>
                </Stat>
                <Stat>
                  <strong>{stats.created}</strong>
                  <span>Created</span>
                </Stat>
                <Stat>
                  <strong>{stats.skipped}</strong>
                  <span>Skipped</span>
                </Stat>
                <Stat $danger={stats.failed > 0}>
                  <strong>{stats.failed}</strong>
                  <span>Failed</span>
                </Stat>
              </StatWrap>
            </ResultHeader>

            {rows.length ? (
              <TableWrap>
                <Table>
                  <TableHead>
                    <span>Collection</span>
                    <span>Index</span>
                    <span>Status</span>
                    <span>Error</span>
                  </TableHead>

                  {rows.map((item, index) => {
                    const action = String(item?.action || "unknown");
                    const failed = action.includes("failed");

                    return (
                      <SettingRow key={`${item?.index || "index"}-${index}`}>
                        <span>{item?.collection || "Unknown"}</span>
                        <strong>{item?.index || "Unknown index"}</strong>
                        <ActionPill $failed={failed}>{action}</ActionPill>
                        <span>{item?.error || "—"}</span>
                      </SettingRow>
                    );
                  })}
                </Table>
              </TableWrap>
            ) : (
              <EmptyState>No cleanup operations were returned.</EmptyState>
            )}
          </ResultCard>
        ) : null}
      </Shell>
    </Page>
  );
}

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 0 rgba(214, 182, 159, 0); }
  50% { box-shadow: 0 0 46px rgba(214, 182, 159, 0.38); }
`;

const Page = styled.main`
  min-height: 100vh;
  padding: clamp(22px, 4vw, 48px);
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.22), transparent 34%),
    radial-gradient(circle at 85% 15%, rgba(255, 249, 242, 0.08), transparent 28%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
`;

const Shell = styled.div`
  max-width: 1180px;
  margin: 0 auto;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: 1.5fr 0.7fr;
  gap: 22px;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

const HeroContent = styled.div`
  border: 1px solid rgba(255, 249, 242, 0.14);
  border-radius: 34px;
  padding: clamp(28px, 5vw, 56px);
  background:
    linear-gradient(145deg, rgba(0, 0, 0, 0.72), rgba(54, 33, 22, 0.76)),
    radial-gradient(circle at 20% 0%, rgba(214, 182, 159, 0.22), transparent 35%);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Eyebrow = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2.8rem, 7vw, 6.7rem);
  line-height: 0.88;
  letter-spacing: -0.08em;
  font-weight: 950;
`;

const Text = styled.p`
  max-width: 700px;
  margin: 22px 0 30px;
  color: rgba(255, 249, 242, 0.76);
  font-size: 15px;
  line-height: 1.85;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
`;

const BaseButton = styled.button`
  min-height: 52px;
  border-radius: 999px;
  padding: 0 24px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: 0.2s ease;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(BaseButton)`
  border: none;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
`;

const CleanButton = styled(PrimaryButton)`
  animation: ${glow} 2.2s ease-in-out infinite;
`;

const GhostButton = styled(BaseButton)`
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(255, 249, 242, 0.06);
  color: ${({ theme }) => theme.colors.ivory};
`;

const DangerButton = styled(BaseButton)`
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(255, 80, 80, 0.34);
  background: rgba(255, 80, 80, 0.13);
  color: #ffd1d1;
`;

const StatusPanel = styled.aside`
  border-radius: 34px;
  padding: 28px;
  display: grid;
  place-items: center;
  text-align: center;
  border: 1px solid rgba(255, 249, 242, 0.14);
  background:
    radial-gradient(circle at 50% 0%, rgba(214, 182, 159, 0.24), transparent 42%),
    rgba(0, 0, 0, 0.42);
  box-shadow: ${({ theme }) => theme.shadow.hard};
  animation: ${float} 4s ease-in-out infinite;
`;

const StatusBadge = styled.div`
  border-radius: 999px;
  padding: 9px 14px;
  color: ${({ $active }) => ($active ? "#ffd1d1" : "#111")};
  background: ${({ $active, theme }) =>
    $active ? "rgba(255, 80, 80, 0.18)" : theme.colors.lightBrown};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(255, 80, 80, 0.28)" : "rgba(214, 182, 159, 0.3)"};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
`;

const StatusNumber = styled.div`
  margin-top: 24px;
  font-size: 5rem;
  font-weight: 950;
`;

const StatusText = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.65);
  font-weight: 800;
`;

const ErrorBox = styled.div`
  margin-top: 22px;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255, 80, 80, 0.12);
  border: 1px solid rgba(255, 80, 80, 0.28);
  color: #ffd1d1;
  font-weight: 850;
`;

const SuccessBox = styled(ErrorBox)`
  background: rgba(78, 255, 166, 0.1);
  border-color: rgba(78, 255, 166, 0.24);
  color: #c8ffe1;
`;

const ControlCard = styled.section`
  margin-top: 22px;
  padding: clamp(22px, 4vw, 34px);
  border-radius: 30px;
  background:
    linear-gradient(145deg, rgba(0, 0, 0, 0.52), rgba(54, 33, 22, 0.42)),
    rgba(0, 0, 0, 0.46);
  border: 1px solid rgba(255, 249, 242, 0.14);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const ResultCard = styled(ControlCard)``;

const ResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 22px;

  @media (max-width: 750px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const ResultKicker = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
`;

const ResultTitle = styled.h2`
  margin: 0;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 18px;
`;

const Field = styled.div`
  display: grid;
  gap: 8px;

  label {
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 12px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  input,
  textarea {
    width: 100%;
    border-radius: 18px;
    border: 1px solid rgba(255, 249, 242, 0.14);
    background: rgba(0, 0, 0, 0.32);
    color: ${({ theme }) => theme.colors.ivory};
    padding: 15px 16px;
    outline: none;
    font: inherit;
  }

  textarea {
    min-height: 130px;
    resize: vertical;
    line-height: 1.7;
  }

  small {
    color: rgba(255, 249, 242, 0.55);
    font-weight: 800;
    text-align: right;
  }
`;

const CheckRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 249, 242, 0.06);
  border: 1px solid rgba(255, 249, 242, 0.1);

  input {
    width: 18px;
    height: 18px;
    accent-color: ${({ theme }) => theme.colors.lightBrown};
  }

  label {
    color: rgba(255, 249, 242, 0.78);
    font-weight: 850;
  }
`;

const StatWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Stat = styled.div`
  min-width: 86px;
  padding: 14px;
  border-radius: 18px;
  text-align: center;
  background: ${({ $danger }) =>
    $danger ? "rgba(255, 80, 80, 0.1)" : "rgba(255, 249, 242, 0.06)"};
  border: 1px solid
    ${({ $danger }) =>
      $danger ? "rgba(255, 80, 80, 0.28)" : "rgba(255, 249, 242, 0.1)"};

  strong {
    display: block;
    font-size: 1.6rem;
    color: ${({ theme }) => theme.colors.lightBrown};
  }

  span {
    font-size: 11px;
    font-weight: 850;
    color: rgba(255, 249, 242, 0.58);
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: 22px;
`;

const Table = styled.div`
  min-width: 820px;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.5fr 1fr;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(214, 182, 159, 0.13);
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
`;

const SettingRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.5fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 16px 18px;
  border-top: 1px solid rgba(255, 249, 242, 0.08);
  background: rgba(0, 0, 0, 0.18);

  strong {
    color: ${({ theme }) => theme.colors.ivory};
    word-break: break-word;
  }

  span {
    color: rgba(255, 249, 242, 0.65);
    font-size: 13px;
    font-weight: 800;
    word-break: break-word;
  }
`;

const ActionPill = styled.em`
  width: fit-content;
  border-radius: 999px;
  padding: 8px 12px;
  font-style: normal;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  color: ${({ $failed }) => ($failed ? "#ffd1d1" : "#111")};
  background: ${({ $failed, theme }) =>
    $failed ? "rgba(255, 80, 80, 0.18)" : theme.colors.lightBrown};
  border: 1px solid
    ${({ $failed }) =>
      $failed ? "rgba(255, 80, 80, 0.28)" : "rgba(214, 182, 159, 0.25)"};
`;

const EmptyState = styled.div`
  padding: 22px;
  border-radius: 22px;
  border: 1px dashed rgba(255, 249, 242, 0.18);
  color: rgba(255, 249, 242, 0.66);
  font-weight: 800;
`;