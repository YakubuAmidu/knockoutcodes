// src/pages/MyMessages.jsx
import React, { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

import {
  loadMyTickets,
  openTicket,
  updateMyMessageDraft,
  sendMyReply,
  clearMyMessagesError,
} from "../reducers/myMessages/myMessagesActions";

const Page = styled.main`
  min-height: 100vh;
  padding: 100px 18px 60px;
  background: radial-gradient(
      1200px 520px at 18% 0%,
      rgba(214, 182, 159, 0.18) 0%,
      rgba(90, 56, 37, 0.35) 40%,
      rgba(0, 0, 0, 1) 78%
    ),
    radial-gradient(
      900px 520px at 92% 88%,
      rgba(61, 38, 26, 0.55) 0%,
      rgba(0, 0, 0, 1) 70%
    );
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};
`;

const Shell = styled.div`
  max-width: ${({ theme }) => theme?.layout?.max || "1200px"};
  width: ${({ theme }) => theme?.layout?.gutter || "92vw"};
  margin: 0 auto;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    width: 100%;
  }
`;

const Card = styled(motion.section)`
  background: rgba(0, 0, 0, 0.58);
  border: 1px solid rgba(255, 249, 242, 0.10);
  border-radius: ${({ theme }) => theme?.radius?.lg || "22px"};
  overflow: hidden;
  box-shadow: ${({ theme }) =>
    theme?.shadow?.hard || "0 18px 44px rgba(0,0,0,0.28)"};
  backdrop-filter: blur(14px) saturate(1.15);
`;

const Head = styled.div`
  padding: 16px 16px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 249, 242, 0.10);
  background: linear-gradient(
    120deg,
    rgba(47, 27, 18, 0.72),
    rgba(0, 0, 0, 0.38)
  );
`;

const Title = styled.h1`
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.18px;
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};
`;

const Sub = styled.p`
  margin: 4px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme?.colors?.lightBrown || "#D6B69F"};
  opacity: 0.9;
`;

const Btn = styled.button`
  border: 0;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme?.radius?.md || "16px"};
  cursor: pointer;
  background: rgba(214, 182, 159, 0.16);
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};
  border: 1px solid rgba(214, 182, 159, 0.28);
  box-shadow: ${({ theme }) =>
    theme?.shadow?.soft || "0 10px 30px rgba(0,0,0,0.18)"};

  &:hover:not(:disabled) {
    background: rgba(214, 182, 159, 0.22);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

const List = styled.div`
  max-height: 640px;
  overflow: auto;
`;

const Item = styled.button`
  width: 100%;
  text-align: left;
  border: 0;
  cursor: pointer;
  background: ${({ $active }) =>
    $active ? "rgba(214, 182, 159, 0.14)" : "transparent"};
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};
  padding: 14px 14px;
  border-bottom: 1px solid rgba(255, 249, 242, 0.08);

  &:hover {
    background: rgba(255, 249, 242, 0.05);
  }
`;

const ItemTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
`;

const Badge = styled.span`
  font-size: 11px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme?.radius?.pill || "999px"};
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(255, 255, 255, 0.06);
  text-transform: capitalize;
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};
`;

const HotBadge = styled(Badge)`
  border-color: rgba(214, 182, 159, 0.55);
  background: rgba(214, 182, 159, 0.22);
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};
`;

const ClosedBadge = styled(Badge)`
  border-color: rgba(255, 176, 176, 0.28);
  background: rgba(255, 80, 80, 0.10);
  color: rgba(255, 210, 210, 0.95);
`;

const ItemTitle = styled.div`
  font-weight: 750;
  font-size: 13px;
  line-height: 1.2;
`;

const ItemMeta = styled.div`
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.82;
  color: ${({ theme }) => theme?.colors?.lightBrown || "#D6B69F"};
  display: flex;
  justify-content: space-between;
  gap: 10px;
`;

const Thread = styled.div`
  padding: 14px;
  max-height: 520px;
  overflow: auto;
`;

const BubbleRow = styled.div`
  display: flex;
  justify-content: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  margin: 8px 0;
`;

const Bubble = styled.div`
  max-width: 78%;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme?.radius?.md || "16px"};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background: ${({ $mine, theme }) =>
    $mine
      ? "linear-gradient(120deg, rgba(214, 182, 159, 0.22), rgba(61, 38, 26, 0.18))"
      : theme?.colors?.glass || "rgba(255,255,255,0.06)"};
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.4;
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};
`;

const Composer = styled.div`
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(255, 249, 242, 0.10);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  background: linear-gradient(
    120deg,
    rgba(47, 27, 18, 0.22),
    rgba(0, 0, 0, 0.35)
  );

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Input = styled.textarea`
  width: 100%;
  min-height: 44px;
  max-height: 120px;
  resize: vertical;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme?.radius?.md || "16px"};
  outline: none;
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.45);
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};

  &::placeholder {
    color: rgba(214, 182, 159, 0.75);
  }

  &:focus {
    border-color: rgba(214, 182, 159, 0.65);
    box-shadow: 0 0 0 3px rgba(214, 182, 159, 0.14);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.35);
  }
`;

const DisabledHint = styled.div`
  grid-column: 1 / -1;
  font-size: 12px;
  color: rgba(214, 182, 159, 0.9);
  opacity: 0.95;
  padding: 2px 2px 0;
`;

const Empty = styled.div`
  padding: 16px;
  font-size: 13px;
  color: ${({ theme }) => theme?.colors?.lightBrown || "#D6B69F"};
  opacity: 0.92;
`;

const LoginWall = styled(Card)`
  grid-column: 1 / -1;
  padding: 18px;
`;

function fmtTime(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

// ✅ detect "new admin reply" reliably
function isNewForUser(ticket) {
  if (!ticket) return false;

  const lastSender = ticket?.lastSender;
  const lastMessageAt = ticket?.lastMessageAt
    ? new Date(ticket.lastMessageAt).getTime()
    : 0;
  const userLastSeenAt = ticket?.userLastSeenAt
    ? new Date(ticket.userLastSeenAt).getTime()
    : 0;

  return lastSender === "admin" && lastMessageAt > userLastSeenAt;
}

export default function MyMessages() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const toast = useToast();

  // ✅ Use Toast exactly like Login.jsx / Cart.jsx (toast.push)
  const pushToast = React.useCallback(
    (payload) => {
      if (!payload) return;

      const hasStandardShape =
        typeof payload.title === "string" || typeof payload.description === "string";

      const normalized = hasStandardShape
        ? {
            title: payload.title || "Notice",
            description: payload.description || "",
            variant: payload.variant || "info",
          }
        : {
            title:
              payload.type === "success"
                ? "Success"
                : payload.type === "error"
                ? "Error"
                : payload.type === "warning"
                ? "Warning"
                : payload.type === "info"
                ? "Info"
                : "Notice",
            description: payload.message || "",
            variant: payload.type || "info",
          };

      toast?.push?.(normalized);
    },
    [toast]
  );

  const {
    items,
    selectedId,
    active,
    loadingList,
    loadingThread,
    sending,
    draft,
    error,
    needsLogin,
  } = useSelector((s) => s.myMessages);

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const threadMessages = useMemo(() => {
    const msgs = active?.messages;
    return Array.isArray(msgs) ? msgs : [];
  }, [active]);

  // ✅ CLOSED behavior (admin closed thread -> user cannot send)
  const isClosed = useMemo(() => {
    const s = String(active?.status || "").toLowerCase();
    return s === "closed";
  }, [active?.status]);

  useEffect(() => {
    dispatch(loadMyTickets());
  }, [dispatch]);

  useEffect(() => {
    if (!error) return;
    pushToast({ type: "error", message: error });
    dispatch(clearMyMessagesError());
  }, [error, pushToast, dispatch]);

  // ✅ lightweight polling so user notices new admin replies
  const pollRef = useRef(null);
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      dispatch(loadMyTickets());
    }, 12_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [dispatch]);

  const handleOpen = async (id) => {
    if (!id) return;
    await dispatch(openTicket(id));
    dispatch(loadMyTickets());
  };

  const handleSend = async () => {
    if (!selectedId) {
      pushToast({ type: "error", message: "Select a message thread first." });
      return;
    }

    if (isClosed) {
      pushToast({
        type: "error",
        message: "This conversation is closed. You can’t send new messages.",
      });
      return;
    }

    const text = String(draft || "").trim();
    if (!text) {
      pushToast({ type: "error", message: "Type a message first." });
      return;
    }

    try {
      const res = await dispatch(sendMyReply(selectedId, text));

      // always refresh so UI reflects backend truth (esp. for closed/forbidden)
      dispatch(loadMyTickets());
      if (selectedId) dispatch(openTicket(selectedId));

      if (res?.ok) {
        pushToast({ type: "success", message: "Sent ✅" });
        dispatch(loadMyTickets());
      } else if (res?.message) {
        // if your backend sends 403/401 messages, you'll now see them
        pushToast({ type: "error", message: res.message });
      } else {
        pushToast({ type: "error", message: "Failed to send. Please try again." });
      }
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      pushToast({ type: "error", message: "Failed to send. Please try again." });
    }
  };

  if (needsLogin) {
    return (
      <Page>
        <LoginWall initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Title>Login Required</Title>
          <Sub>
            To protect your private support thread, you must be logged in to view
            messages and reply.
          </Sub>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn onClick={() => nav("/login")}>Go to Login</Btn>
            <Btn
              onClick={() => dispatch(loadMyTickets())}
              style={{
                background: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              Try Again
            </Btn>
          </div>
        </LoginWall>
      </Page>
    );
  }

  return (
    <Page>
      <Shell>
        {/* LEFT: Threads */}
        <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Head>
            <div>
              <Title>My Messages</Title>
              <Sub>{loadingList ? "Loading…" : `${safeItems.length} thread(s)`}</Sub>
            </div>
            <Btn onClick={() => dispatch(loadMyTickets())} disabled={loadingList}>
              Refresh
            </Btn>
          </Head>

          <List>
            {safeItems.length === 0 && !loadingList ? (
              <Empty>No messages yet. Use the Contact page to open a support ticket.</Empty>
            ) : null}

            {safeItems.map((t) => {
              const hasNew = isNewForUser(t);
              const statusLower = String(t?.status || "").toLowerCase();
              const isTicketClosed = statusLower === "closed";

              return (
                <Item
                  key={t._id}
                  $active={String(t._id) === String(selectedId)}
                  onClick={() => handleOpen(t._id)}
                >
                  <ItemTop>
                    <ItemTitle>{t.subject || "Support Ticket"}</ItemTitle>

                    {isTicketClosed ? (
                      <ClosedBadge>closed</ClosedBadge>
                    ) : hasNew ? (
                      <HotBadge>New Reply</HotBadge>
                    ) : (
                      <Badge>{t.status || "new"}</Badge>
                    )}
                  </ItemTop>

                  <ItemMeta>
                    <span>
                      {isTicketClosed
                        ? "Closed by admin"
                        : hasNew
                        ? "Admin replied (new)"
                        : t.replied
                        ? "Admin replied"
                        : "Waiting…"}
                    </span>
                    <span>{fmtTime(t.lastMessageAt || t.updatedAt || t.createdAt)}</span>
                  </ItemMeta>
                </Item>
              );
            })}
          </List>
        </Card>

        {/* RIGHT: Thread */}
        <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Head>
            <div>
              <Title>{active?.subject || "Thread"}</Title>
              <Sub>
                {loadingThread
                  ? "Opening…"
                  : active
                  ? `Last update: ${fmtTime(active.lastMessageAt || active.updatedAt || active.createdAt)}`
                  : "Select a thread to view messages"}
              </Sub>
            </div>

            {active?._id ? (
              <Btn
                onClick={() => {
                  dispatch(openTicket(active._id));
                  dispatch(loadMyTickets());
                }}
                disabled={loadingThread}
              >
                Reload
              </Btn>
            ) : null}
          </Head>

          {!active ? (
            <Empty>Pick a thread on the left to view the conversation.</Empty>
          ) : (
            <>
              <Thread>
                {threadMessages.length === 0 ? (
                  <Empty>No messages in this thread yet.</Empty>
                ) : (
                  threadMessages.map((m, idx) => {
                    const mine = m?.sender === "user";
                    return (
                      <BubbleRow key={m?._id || idx} $mine={mine}>
                        <Bubble $mine={mine}>
                          {m?.text || ""}
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 11,
                              opacity: 0.78,
                              color: "rgba(214, 182, 159, 0.95)",
                            }}
                          >
                            {mine ? "You" : "Admin"} • {fmtTime(m?.createdAt)}
                          </div>
                        </Bubble>
                      </BubbleRow>
                    );
                  })
                )}
              </Thread>

              <Composer>
                <Input
                  value={draft}
                  onChange={(e) => dispatch(updateMyMessageDraft(e.target.value))}
                  placeholder={
                    isClosed
                      ? "This conversation was closed by admin. Messaging is disabled."
                      : "Write your reply…"
                  }
                  disabled={isClosed || loadingThread || sending || !selectedId}
                />

                <Btn
                  onClick={handleSend}
                  disabled={
                    isClosed ||
                    sending ||
                    loadingThread ||
                    !selectedId ||
                    !String(draft || "").trim()
                  }
                  title={isClosed ? "Closed threads cannot be replied to." : "Send message"}
                >
                  {isClosed ? "Closed" : sending ? "Sending…" : "Send"}
                </Btn>

                {isClosed ? (
                  <DisabledHint>
                    🔒 Admin closed this thread — you can read the history, but you can’t send new messages.
                  </DisabledHint>
                ) : null}
              </Composer>
            </>
          )}
        </Card>
      </Shell>
    </Page>
  );
}

