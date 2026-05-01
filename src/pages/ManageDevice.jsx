// src/pages/ManageDevices.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../components/Toast";
import axiosInstance from "../../utils/axiosInstance";

export default function ManageDevices() {
  const toast = useToast();

  const pushToast = useCallback(
  (payload) => {
    toast?.push?.(payload);
  },
  [toast]
);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [confirm, setConfirm] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ baseURL already includes /api/v1
      const { data } = await axiosInstance.get("/auth/sessions");

      const list = Array.isArray(data?.sessions)
  ? data.sessions
  : Array.isArray(data?.items)
  ? data.items
  : Array.isArray(data?.data)
  ? data.data
            : [];
      
      setSessions(list);
      setCurrentSessionId(data?.currentSessionId || null);

      if (!list.length) {
        pushToast({
          title: "Info",
          description: "No active sessions found yet.",
          variant: "info",
        });
      }
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      pushToast({
        title: "Error",
        description: "Could not load devices. Please refresh and try again.",
        variant: "error",
      });
      setSessions([]);
      setCurrentSessionId(null);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const sortedSessions = useMemo(() => {
    const copy = [...sessions];
    copy.sort((a, b) => {
      const aCurrent = a?.id === currentSessionId;
      const bCurrent = b?.id === currentSessionId;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;

      const aTime = new Date(a?.lastActiveAt || 0).getTime();
      const bTime = new Date(b?.lastActiveAt || 0).getTime();
      return bTime - aTime;
    });
    return copy;
  }, [sessions, currentSessionId]);

  const hasOthers = useMemo(() => {
    return sortedSessions.some((s) => s?.id && s.id !== currentSessionId);
  }, [sortedSessions, currentSessionId]);

  function formatTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  }

  function askRevokeOne(session) {
    setConfirm({ type: "one", session });
  }

  function askRevokeOthers() {
    setConfirm({ type: "others", session: null });
  }

  function closeConfirm() {
    setConfirm(null);
  }

  const revokeOne = useCallback(
    async (sessionId) => {
      if (!sessionId) return;

      if (sessionId === currentSessionId) {
        pushToast({
          title: "Info",
          description:
            "This is your current device. Sign out from your account menu instead.",
          variant: "info",
        });
        return;
      }

      setBusyId(sessionId);
      try {
        // ✅ Correct: delete ONE session by id
        await axiosInstance.delete(`/auth/sessions/${encodeURIComponent(sessionId)}`);

        setSessions((curr) => curr.filter((s) => s?.id !== sessionId));

        pushToast({
          title: "Success",
          description: "Device signed out ✅",
          variant: "success",
        });
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        pushToast({
          title: "Error",
          description: "Failed to sign out that device. Please try again.",
          variant: "error",
        });
      } finally {
        setBusyId("");
      }
    },
    [currentSessionId, pushToast]
  );

  const revokeOthers = useCallback(async () => {
    if (!hasOthers) {
      pushToast({
        title: "Info",
        description: "No other devices are currently signed in.",
        variant: "info",
      });
      return;
    }

    setBusyId("ALL_OTHERS");
    try {
      // ✅ Correct: POST revoke-others (NOT DELETE /sessions/others)
      await axiosInstance.post("/auth/sessions/revoke-others");

      setSessions((curr) => curr.filter((s) => s?.id === currentSessionId));

      pushToast({
        title: "Success",
        description: "Signed out of all other devices ✅",
        variant: "success",
      });
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      pushToast({
        title: "Error",
        description: "Could not sign out other devices. Please try again.",
        variant: "error",
      });
    } finally {
      setBusyId("");
    }
  }, [hasOthers, pushToast, currentSessionId]);

  async function confirmAction() {
    if (!confirm) return;

    if (confirm.type === "one") {
      const id = confirm.session?.id;
      closeConfirm();
      await revokeOne(id);
      return;
    }

    if (confirm.type === "others") {
      closeConfirm();
      await revokeOthers();
    }
  }

  return (
    <Page>
      <Inner>
        <Top
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Badge>KO • SECURITY</Badge>

          <Title>
  🔐 <span>SECURITY COMMAND</span> CENTER
</Title>

          <Sub>
  Control every active login like a serious platform. Review devices,
  inspect session details, and remove anything you do not recognize.
</Sub>

          <TopActions>
            <GhostBtn type="button" onClick={fetchSessions} disabled={loading || !!busyId}>
              {loading ? "Refreshing..." : "Refresh"}
            </GhostBtn>

            <DangerBtn
              type="button"
              onClick={askRevokeOthers}
              disabled={loading || !!busyId || !hasOthers}
              title={!hasOthers ? "No other active sessions" : "Sign out other devices"}
            >
              {busyId === "ALL_OTHERS" ? (
                <BtnRow>
                  <BtnSpinner />
                  Signing out…
                </BtnRow>
              ) : (
                "Sign out other devices"
              )}
            </DangerBtn>
          </TopActions>
        </Top>

        <Card
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
        >
          <CardHead>
            <CardTitle>Active Sessions</CardTitle>
            <Small>{sortedSessions.length} total</Small>
          </CardHead>

          {loading ? (
            <List>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </List>
          ) : sortedSessions.length === 0 ? (
            <Empty>
              <EmptyTitle>No devices found.</EmptyTitle>
              <EmptySub>
                If this looks wrong, refresh. If still empty, make sure your backend returns
                sessions and currentSessionId.
              </EmptySub>
            </Empty>
          ) : (
            <List>
              <AnimatePresence initial={false}>
                {sortedSessions.map((s) => {
                  const isCurrent = s?.id === currentSessionId;
                  const isRowBusy = busyId === s?.id || busyId === "ALL_OTHERS";

                  return (
                    <Row
                      key={s?.id || `${s?.deviceName}-${s?.lastActiveAt}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.16 }}
                    >
                      <Left>
                        <Icon>{isCurrent ? "★" : "●"}</Icon>

                        <Info>
                          <NameRow>
                            <Name title={s?.deviceName || "Device"}>
                              {s?.deviceName || "Device"}
                            </Name>

                            {isCurrent ? <Chip>THIS DEVICE</Chip> : null}
                            {s?.isTrusted ? <ChipSoft>TRUSTED</ChipSoft> : null}
                          </NameRow>

                          <Meta>
                            <MetaItem>
                              <MetaLabel>Browser:</MetaLabel>{" "}
                              <MetaValue>{s?.browser || "—"}</MetaValue>
                            </MetaItem>

                            <Dot>•</Dot>

                            <MetaItem>
                              <MetaLabel>OS:</MetaLabel>{" "}
                              <MetaValue>{s?.os || "—"}</MetaValue>
                            </MetaItem>

                            <Dot>•</Dot>

                            <MetaItem>
                              <MetaLabel>Last active:</MetaLabel>{" "}
                              <MetaValue>{formatTime(s?.lastActiveAt)}</MetaValue>
                            </MetaItem>

                            {s?.approxLocation ? (
                              <>
                                <Dot>•</Dot>
                                <MetaItem>
                                  <MetaLabel>Location:</MetaLabel>{" "}
                                  <MetaValue>{s.approxLocation}</MetaValue>
                                </MetaItem>
                              </>
                            ) : null}
                          </Meta>
                        </Info>
                      </Left>

                      <Right>
  {/* 
    MORE INFO BUTTON
    Shows extra security details for this session.
    Big tech apps usually let users inspect browser, OS, IP, and last activity.
  */}
  <RowBtn
    type="button"
    onClick={() =>
      setConfirm({
        type: "info",
        session: s,
      })
    }
  >
    More Info
  </RowBtn>

  {/* 
    SIGN OUT BUTTON
    Deletes/revokes this session from the backend.
    Disabled for the current device because current logout should use normal logout.
  */}
  <RowBtn
    type="button"
    disabled={isCurrent || isRowBusy}
    onClick={() => {
      if (isCurrent) {
        pushToast({
          title: "Current device",
          description: "You’re currently using this device. Use Logout to end it.",
          variant: "info",
        });
        return;
      }

      askRevokeOne(s);
    }}
  >
    {busyId === s?.id ? (
      <BtnRow>
        <BtnSpinner />
        Signing out…
      </BtnRow>
    ) : (
      "Sign Out"
    )}
  </RowBtn>
</Right>
                    </Row>
                  );
                })}
              </AnimatePresence>
            </List>
          )}
        </Card>

        <FootNote>
          Tip: If you see a device you don’t recognize, sign it out immediately and change your password.
        </FootNote>
      </Inner>

      <AnimatePresence>
        {confirm ? (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeConfirm();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm action"
          >
            <Modal
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.99 }}
              transition={{ duration: 0.16 }}
            >
              <ModalTitle>
  {confirm.type === "info"
    ? "Session Details"
    : confirm.type === "others"
    ? "Sign out of other devices?"
    : "Sign out this device?"}
</ModalTitle>

<ModalDesc>
  {confirm.type === "info" ? (
    <SessionDetails>
      <DetailLine>
        <strong>Device:</strong> {confirm.session?.deviceName || "Unknown device"}
      </DetailLine>
      <DetailLine>
        <strong>Browser:</strong> {confirm.session?.browser || "Unknown"}
      </DetailLine>
      <DetailLine>
        <strong>Operating System:</strong> {confirm.session?.os || "Unknown"}
      </DetailLine>
      <DetailLine>
        <strong>IP Address:</strong> {confirm.session?.ip || "Not available"}
      </DetailLine>
      <DetailLine>
        <strong>Location:</strong>{" "}
        {confirm.session?.approxLocation || confirm.session?.location || "Not available"}
      </DetailLine>
      <DetailLine>
        <strong>Created:</strong> {formatTime(confirm.session?.createdAt)}
      </DetailLine>
      <DetailLine>
        <strong>Last Active:</strong> {formatTime(confirm.session?.lastActiveAt)}
      </DetailLine>
      <DetailLine>
        <strong>Status:</strong>{" "}
        {confirm.session?.id === currentSessionId
          ? "Current device"
          : "Active signed-in device"}
      </DetailLine>
    </SessionDetails>
  ) : confirm.type === "others" ? (
    "This will sign your account out everywhere except the device you’re using now."
  ) : (
    `This will remove access for: ${
      confirm.session?.deviceName || "Unknown device"
    }.`
  )}
</ModalDesc>

              <ModalActions>
  <ModalGhost type="button" onClick={closeConfirm} whileTap={{ scale: 0.98 }}>
    {confirm.type === "info" ? "Close" : "Cancel"}
  </ModalGhost>

  {confirm.type !== "info" && (
    <ModalDanger type="button" onClick={confirmAction} whileTap={{ scale: 0.98 }}>
      Confirm Sign Out
    </ModalDanger>
  )}
</ModalActions>
            </Modal>
          </ModalOverlay>
        ) : null}
      </AnimatePresence>
    </Page>
  );
}

/* ------------------------- STYLES ------------------------- */

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 18px 90px;
  color: ${({ theme }) => theme.colors.white};
  background:
    radial-gradient(circle at 18% 8%, rgba(214,182,159,0.20) 0%, rgba(0,0,0,0) 45%),
    radial-gradient(circle at 82% 16%, rgba(90,56,37,0.30) 0%, rgba(0,0,0,0) 46%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.darkBrown} 0%, #000 86%);
`;

const Inner = styled.section`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Top = styled(motion.header)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.12);
  padding: 22px;
  backdrop-filter: blur(18px);
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  font-weight: 900;
  letter-spacing: 0.16em;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Title = styled.h1`
  margin: 12px 0 8px;
  font-size: clamp(26px, 3vw, 42px);
  line-height: 1.05;
  letter-spacing: -0.02em;

  span {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-shadow: 0 14px 38px rgba(0,0,0,0.45);
  }
`;

const Sub = styled.p`
  margin: 0;
  opacity: 0.92;
  color: ${({ theme }) => theme.colors.ivory};
  max-width: 75ch;
`;

const TopActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const GhostBtn = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;

  &:hover { transform: translateY(-2px); background: rgba(0,0,0,0.55); }

  &:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
`;

const DangerBtn = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: linear-gradient(90deg, rgba(90,56,37,0.95), rgba(47,27,18,0.95));
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1100;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover { transform: translateY(-2px); }

  &:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
`;

const Card = styled(motion.section)`
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(18px);
  padding: 16px;
  margin-top: 16px;
`;

const CardHead = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.02em;
`;

const Small = styled.div`
  font-size: 13px;
  opacity: 0.85;
  color: ${({ theme }) => theme.colors.ivory};
`;

const List = styled.div`
  display: grid;
  gap: 12px;
`;

const Row = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 12px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.25);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Left = styled.div`
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
  align-items: start;
`;

const Right = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`;

const Icon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  display: grid;
  place-items: center;
  font-weight: 1100;
`;

const Info = styled.div`
  display: grid;
  gap: 6px;
`;

const NameRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const Name = styled.div`
  font-weight: 1100;
  letter-spacing: -0.01em;
`;

const Chip = styled.div`
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(90deg, rgba(214,182,159,0.95), rgba(255,249,242,0.95));
  color: ${({ theme }) => theme.colors.black};
  font-weight: 1100;
  font-size: 12px;
`;

const ChipSoft = styled.div`
  padding: 7px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.30);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1000;
  font-size: 12px;
`;

const Meta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
  line-height: 1.35;
`;

const MetaItem = styled.div`
  display: inline-flex;
  gap: 6px;
`;

const MetaLabel = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 900;
`;

const MetaValue = styled.span`
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 900;
`;

const Dot = styled.span`
  opacity: 0.65;
`;

const RowBtn = styled.button`
  width: 100%;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1100;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover { transform: translateY(-2px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
`;

const Empty = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.28);
  padding: 18px;
  display: grid;
  gap: 8px;
`;

const EmptyTitle = styled.div`
  font-weight: 1100;
  font-size: 18px;
`;

const EmptySub = styled.div`
  opacity: 0.9;
  color: ${({ theme }) => theme.colors.ivory};
`;

const FootNote = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.8;
`;

const BtnRow = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
`;

const BtnSpinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,0.20);
  border-top-color: rgba(255,255,255,0.85);
  display: inline-block;
  animation: spin 0.8s linear infinite;

  @keyframes spin { to { transform: rotate(360deg); } }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(0,0,0,0.55);
  display: grid;
  place-items: center;
  padding: 18px;
`;

const Modal = styled(motion.div)`
  width: min(520px, 100%);
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.glass};
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: ${({ theme }) => theme.shadow.hard};
  padding: 18px;
`;

const ModalTitle = styled.div`
  font-weight: 1100;
  letter-spacing: 0.2px;
  font-size: 1.05rem;
`;

const ModalDesc = styled.div`
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.9;
  line-height: 1.45;
`;

const ModalActions = styled.div`
  margin-top: 14px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
`;

const ModalGhost = styled(motion.button)`
  padding: 11px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.35);
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1100;
  cursor: pointer;
`;

const ModalDanger = styled(motion.button)`
  padding: 11px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255,255,255,0.14);
  background: linear-gradient(90deg, rgba(90,56,37,0.95), rgba(47,27,18,0.95));
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 1100;
  cursor: pointer;
`;

const SkeletonRow = styled.div`
  height: 86px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05),
    rgba(255, 255, 255, 0.09),
    rgba(255, 255, 255, 0.05)
  );
  background-size: 220% 100%;
  animation: shimmer 1.15s ease-in-out infinite;

  @keyframes shimmer {
    0% { background-position: 0% 0%; }
    100% { background-position: 220% 0%; }
  }
`;

const SessionDetails = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 6px;
`;

const DetailLine = styled.div`
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.1);

  strong {
    color: ${({ theme }) => theme.colors.lightBrown};
    margin-right: 6px;
  }
`;
