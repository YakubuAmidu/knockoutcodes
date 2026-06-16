// src/pages/MyMessages.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

import {
  socket,
} from "../../utils/socket";

import {
  loadMyTickets,
  openTicket,
  updateMyMessageDraft,
  sendMyReply,
  clearMyMessagesError,
} from "../reducers/myMessages/myMessagesActions";

/* =========================
   Styled Components
========================= */

const Page = styled.main`
  min-height: 100vh;
  padding: 100px 18px 60px;
  background:
    radial-gradient(900px 420px at 18% 0%, rgba(214, 182, 159, 0.2), transparent 62%),
    radial-gradient(850px 480px at 92% 90%, rgba(61, 38, 26, 0.62), transparent 64%),
    linear-gradient(135deg, #000 0%, #080604 48%, #000 100%);
  color: ${({ theme }) => theme?.colors?.ivory || "#FFF9F2"};
`;

const Hero = styled(motion.section)`
  max-width: ${({ theme }) => theme?.layout?.max || "1200px"};
  width: ${({ theme }) => theme?.layout?.gutter || "92vw"};
  margin: 0 auto 18px;
  padding: 22px;
  border-radius: ${({ theme }) => theme?.radius?.lg || "24px"};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background:
    linear-gradient(135deg, rgba(214, 182, 159, 0.13), rgba(0, 0, 0, 0.55)),
    rgba(0, 0, 0, 0.55);
  box-shadow: ${({ theme }) =>
    theme?.shadow?.hard || "0 22px 55px rgba(0,0,0,0.35)"};
  backdrop-filter: blur(16px);
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme?.radius?.pill || "999px"};
  border: 1px solid rgba(214, 182, 159, 0.32);
  background: rgba(214, 182, 159, 0.1);
  color: ${({ theme }) => theme?.colors?.lightBrown || "#D6B69F"};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const HeroTitle = styled.h1`
  margin: 14px 0 8px;
  max-width: 820px;
  font-size: clamp(28px, 4vw, 52px);
  line-height: 0.95;
  letter-spacing: -1.4px;
`;

const HeroText = styled.p`
  margin: 0;
  max-width: 760px;
  color: rgba(214, 182, 159, 0.92);
  font-size: 14px;
  line-height: 1.65;
`;

const Shell = styled.div`
  max-width: ${({ theme }) => theme?.layout?.max || "1200px"};
  width: ${({ theme }) => theme?.layout?.gutter || "92vw"};
  margin: 0 auto;
  display: grid;
  grid-template-columns: 390px 1fr;
  gap: 16px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    width: 100%;
  }
`;

const Card = styled(motion.section)`
  background: rgba(0, 0, 0, 0.62);
  border: 1px solid rgba(255, 249, 242, 0.11);
  border-radius: ${({ theme }) => theme?.radius?.lg || "22px"};
  overflow: hidden;
  box-shadow: ${({ theme }) =>
    theme?.shadow?.hard || "0 18px 44px rgba(0,0,0,0.28)"};
  backdrop-filter: blur(14px) saturate(1.15);
`;

const Head = styled.div`
  padding: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 249, 242, 0.1);
  background: linear-gradient(
    120deg,
    rgba(47, 27, 18, 0.72),
    rgba(0, 0, 0, 0.38)
  );
`;

const Title = styled.h2`
  margin: 0;
  font-size: 15px;
  letter-spacing: 0.18px;
`;

const Sub = styled.p`
  margin: 5px 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme?.colors?.lightBrown || "#D6B69F"};
  opacity: 0.92;
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const Btn = styled.button`
  border: 0;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme?.radius?.md || "16px"};
  cursor: pointer;
  background: ${({ $primary }) =>
    $primary
      ? "linear-gradient(135deg, rgba(214,182,159,0.95), rgba(132,87,55,0.95))"
      : "rgba(214, 182, 159, 0.14)"};
  color: ${({ $primary }) => ($primary ? "#0b0704" : "#FFF9F2")};
  border: 1px solid
    ${({ $primary }) =>
      $primary ? "rgba(255,249,242,0.28)" : "rgba(214,182,159,0.26)"};
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
  font-weight: 800;
  transition: 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
`;

const Toolbar = styled.div`
  padding: 12px;
  display: grid;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 249, 242, 0.08);
`;

const Search = styled.input`
  width: 100%;
  padding: 12px 13px;
  border-radius: ${({ theme }) => theme?.radius?.md || "16px"};
  border: 1px solid rgba(255, 249, 242, 0.13);
  background: rgba(0, 0, 0, 0.42);
  color: #fff9f2;
  outline: none;

  &::placeholder {
    color: rgba(214, 182, 159, 0.68);
  }

  &:focus {
    border-color: rgba(214, 182, 159, 0.7);
    box-shadow: 0 0 0 3px rgba(214, 182, 159, 0.13);
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
`;

const Chip = styled.button`
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214,182,159,0.68)" : "rgba(255,249,242,0.12)"};
  background: ${({ $active }) =>
    $active ? "rgba(214,182,159,0.18)" : "rgba(255,255,255,0.04)"};
  color: #fff9f2;
  padding: 8px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
`;

const List = styled.div`
  max-height: 620px;
  overflow: auto;
`;

const Item = styled.button`
  width: 100%;
  text-align: left;
  border: 0;
  cursor: pointer;
  background: ${({ $active, $new }) =>
    $active
      ? "rgba(214, 182, 159, 0.16)"
      : $new
      ? "rgba(214, 182, 159, 0.08)"
      : "transparent"};
  color: #fff9f2;
  padding: 15px 14px;
  border-bottom: 1px solid rgba(255, 249, 242, 0.08);
  transition: 0.2s ease;

  &:hover {
    background: rgba(255, 249, 242, 0.06);
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
  white-space: nowrap;
`;

const HotBadge = styled(Badge)`
  border-color: rgba(214, 182, 159, 0.58);
  background: rgba(214, 182, 159, 0.24);
`;

const ClosedBadge = styled(Badge)`
  border-color: rgba(255, 176, 176, 0.28);
  background: rgba(255, 80, 80, 0.1);
  color: rgba(255, 210, 210, 0.95);
`;

const ItemTitle = styled.div`
  font-weight: 850;
  font-size: 13px;
  line-height: 1.25;
`;

const ItemMeta = styled.div`
  margin-top: 7px;
  font-size: 12px;
  opacity: 0.84;
  color: ${({ theme }) => theme?.colors?.lightBrown || "#D6B69F"};
  display: flex;
  justify-content: space-between;
  gap: 10px;
`;

const Thread = styled.div`
  padding: 16px;
  min-height: 410px;
  max-height: 535px;
  overflow: auto;
`;

const BubbleRow = styled(motion.div)`
  display: flex;
  justify-content: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  margin: 9px 0;
`;

const Bubble = styled.div`
  max-width: 78%;
  padding: 11px 13px;
  border-radius: ${({ theme }) => theme?.radius?.md || "16px"};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background: ${({ $mine, theme }) =>
    $mine
      ? "linear-gradient(120deg, rgba(214, 182, 159, 0.25), rgba(61, 38, 26, 0.2))"
      : theme?.colors?.glass || "rgba(255,255,255,0.06)"};
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.45;
`;

const BubbleMeta = styled.div`
  margin-top: 7px;
  font-size: 11px;
  opacity: 0.78;
  color: rgba(214, 182, 159, 0.95);
`;

const Composer = styled.div`
  padding: 13px 14px 14px;
  border-top: 1px solid rgba(255, 249, 242, 0.1);
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
  min-height: 48px;
  max-height: 130px;
  resize: vertical;
  padding: 11px 12px;
  border-radius: ${({ theme }) => theme?.radius?.md || "16px"};
  outline: none;
  border: 1px solid rgba(255, 249, 242, 0.14);
  background: rgba(0, 0, 0, 0.45);
  color: #fff9f2;

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
  }
`;

const DisabledHint = styled.div`
  grid-column: 1 / -1;
  font-size: 12px;
  color: rgba(214, 182, 159, 0.9);
`;

const Empty = styled.div`
  padding: 18px;
  font-size: 13px;
  color: ${({ theme }) => theme?.colors?.lightBrown || "#D6B69F"};
  opacity: 0.94;
`;

const LoginWall = styled(Card)`
  max-width: 760px;
  width: 92vw;
  margin: 0 auto;
  padding: 22px;
`;

/* =========================
   Helpers
========================= */

function fmtTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function isLockedTicket(ticket) {
  const status = String(ticket?.status || "").toLowerCase();

  return ["resolved", "complete", "completed", "closed"].includes(status);
}

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

/* =========================
   Component
========================= */

export default function MyMessages() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const threadEndRef = useRef(null);

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

  const authUser = useSelector(
    (s) =>
      s.auth?.user ||
      s.auth?.currentUser ||
      s.user?.user ||
      s.user?.currentUser ||
      null
  );

  const pushToast = useCallback(
    (payload) => {
      if (!payload) return;

      toast?.push?.({
        title:
          payload.title ||
          (payload.type === "success"
            ? "Success"
            : payload.type === "error"
            ? "Error"
            : payload.type === "warning"
            ? "Warning"
            : "Notice"),
        description: payload.message || payload.description || "",
        variant: payload.variant || payload.type || "info",
      });
    },
    [toast]
  );

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const threadMessages = useMemo(() => {
    const msgs = active?.messages;
    return Array.isArray(msgs) ? msgs : [];
  }, [active]);

  const isClosed = useMemo(() => isLockedTicket(active), [active]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return safeItems.filter((t) => {
      const title = String(t?.subject || "").toLowerCase();
      const status = String(t?.status || "").toLowerCase();
      const hasNew = isNewForUser(t);
      const closed = isLockedTicket(t);

      const matchesSearch = !q || title.includes(q) || status.includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "new" && hasNew) ||
        (filter === "open" && !closed) ||
        (filter === "closed" && closed);

      return matchesSearch && matchesFilter;
    });
  }, [safeItems, query, filter]);

  const unreadCount = useMemo(
    () => safeItems.filter((t) => isNewForUser(t)).length,
    [safeItems]
  );

  useEffect(() => {
    dispatch(loadMyTickets());
  }, [dispatch]);

  useEffect(() => {
    if (!error) return;

    pushToast({ type: "error", message: error });
    dispatch(clearMyMessagesError());
  }, [error, pushToast, dispatch]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [threadMessages.length, active?._id]);

  /* =========================
     Socket.IO Real-Time Updates
  ========================= */
  const DEBUG_SOCKET = import.meta.env.DEV;

  useEffect(() => {
  const userId = authUser?._id || authUser?.id;

  if (!socket) return;

  const joinUserRooms = () => {
    if (!userId) return;

    socket.emit("join:user", userId);
    socket.emit("user:join", { userId });
    socket.emit("messages:join", { userId });
    socket.emit("ticket:join-user", { userId });

   if (DEBUG_SOCKET) {
  console.log("✅ MyMessages socket joined:", userId);
}
  };

  joinUserRooms();

  socket.on("connect", joinUserRooms);

  const refreshInbox = async (payload = {}) => {
    if (DEBUG_SOCKET) {
  console.log("🔥 MyMessages real-time event received:", payload);
}

    const ticketId =
      payload?.ticketId ||
      payload?._id ||
      payload?.id ||
      payload?.message?.ticketId ||
      payload?.data?.ticketId;

    await dispatch(loadMyTickets());

    if (
      selectedId &&
      ticketId &&
      String(ticketId) === String(selectedId)
    ) {
      await dispatch(openTicket(selectedId));
    }

    if (
      payload?.lastSender === "admin" ||
      payload?.sender === "admin" ||
      payload?.message?.sender === "admin"
    ) {
      pushToast({
        type: "info",
        message: "New admin reply received.",
      });
    }
  };

  const events = [
    "ticket:new",
    "ticket:updated",
    "ticket:reply",
    "ticket:closed",
    "message:new",
    "messages:updated",
    "myMessages:updated",
    "support:reply",
    "contact:reply",
    "contact:updated",

    // add these stronger names too
    "user:ticket-updated",
    "user:ticket-reply",
    "user:message-received",
    "admin:reply-sent",
  ];

  events.forEach((eventName) => {
    socket.on(eventName, refreshInbox);
  });

  return () => {
    socket.off("connect", joinUserRooms);

    events.forEach((eventName) => {
      socket.off(eventName, refreshInbox);
    });
  };
}, [dispatch, selectedId, authUser, pushToast]);

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

      dispatch(loadMyTickets());
      dispatch(openTicket(selectedId));

      if (res?.ok) {
        pushToast({ type: "success", message: "Message sent." });

        socket?.emit?.("user:message-sent", {
          ticketId: selectedId,
          text,
        });
      } else {
        pushToast({
          type: "error",
          message: res?.message || "Failed to send. Please try again.",
        });
      }
    } catch {
      pushToast({
        type: "error",
        message: "Failed to send. Please try again.",
      });
    }
  };

  if (needsLogin) {
    return (
      <Page>
        <LoginWall initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>Private Support Access</Eyebrow>
          <HeroTitle>Login required to view your messages.</HeroTitle>
          <HeroText>
            Your support conversations are private. Login to view your message
            history, replies, and updates from admin.
          </HeroText>

          <Actions style={{ marginTop: 16, justifyContent: "flex-start" }}>
            <Btn $primary onClick={() => nav("/login")}>
              Go to Login
            </Btn>
            <Btn onClick={() => dispatch(loadMyTickets())}>Try Again</Btn>
          </Actions>
        </LoginWall>
      </Page>
    );
  }

  return (
    <Page>
      <Hero
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Eyebrow>KnockoutCodes Message Center</Eyebrow>
        <HeroTitle>Your private support command room.</HeroTitle>
        <HeroText>
          Track every conversation, see admin replies instantly, continue active
          threads, and keep closed tickets protected like a professional client
          portal.
        </HeroText>
      </Hero>

      <Shell>
        <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Head>
            <div>
              <Title>My Messages</Title>
              <Sub>
                {loadingList
                  ? "Loading your threads…"
                  : `${safeItems.length} thread(s) • ${unreadCount} new`}
              </Sub>
            </div>

            <Actions>
              <Btn onClick={() => nav("/contact")}>New Ticket</Btn>
              <Btn onClick={() => dispatch(loadMyTickets())} disabled={loadingList}>
                Refresh
              </Btn>
            </Actions>
          </Head>

          <Toolbar>
            <Search
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by subject or status..."
            />

            <FilterRow>
              {["all", "new", "open", "closed"].map((f) => (
                <Chip
                  key={f}
                  $active={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === "new" ? "New Replies" : f}
                </Chip>
              ))}
            </FilterRow>
          </Toolbar>

          <List>
            {filteredItems.length === 0 && !loadingList ? (
              <Empty>
                No matching messages found. You can open a new ticket from the
                Contact page.
              </Empty>
            ) : null}

            {filteredItems.map((t) => {
              const hasNew = isNewForUser(t);
              const closed = isLockedTicket(t);

              return (
                <Item
                  key={t._id}
                  $active={String(t._id) === String(selectedId)}
                  $new={hasNew}
                  onClick={() => handleOpen(t._id)}
                >
                  <ItemTop>
                    <ItemTitle>{t.subject || "Support Ticket"}</ItemTitle>

                    {closed ? (
                      <ClosedBadge>Closed</ClosedBadge>
                    ) : hasNew ? (
                      <HotBadge>New Reply</HotBadge>
                    ) : (
                      <Badge>{t.status || "Open"}</Badge>
                    )}
                  </ItemTop>

                  <ItemMeta>
                    <span>
                      {closed
                        ? "Closed by admin"
                        : hasNew
                        ? "Admin replied"
                        : t.replied
                        ? "Admin responded"
                        : "Waiting for admin"}
                    </span>
                    <span>{fmtTime(t.lastMessageAt || t.updatedAt || t.createdAt)}</span>
                  </ItemMeta>
                </Item>
              );
            })}
          </List>
        </Card>

        <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Head>
            <div>
              <Title>{active?.subject || "Conversation"}</Title>
              <Sub>
                {loadingThread
                  ? "Opening thread…"
                  : active
                  ? `Last update: ${fmtTime(
                      active.lastMessageAt || active.updatedAt || active.createdAt
                    )}`
                  : "Select a thread to view messages"}
              </Sub>
            </div>

            {active?._id ? (
              <Actions>
                <Btn
                  onClick={() => {
                    dispatch(openTicket(active._id));
                    dispatch(loadMyTickets());
                  }}
                  disabled={loadingThread}
                >
                  Reload
                </Btn>

                {isClosed ? (
                  <Btn onClick={() => nav("/contact")}>Open New</Btn>
                ) : null}
              </Actions>
            ) : null}
          </Head>

          {!active ? (
            <Empty>Pick a thread on the left to view the full conversation.</Empty>
          ) : (
            <>
              <Thread>
                {threadMessages.length === 0 ? (
                  <Empty>No messages in this thread yet.</Empty>
                ) : (
                  <AnimatePresence initial={false}>
                    {threadMessages.map((m, idx) => {
                      const mine = m?.sender === "user";

                      return (
                        <BubbleRow
                          key={m?._id || idx}
                          $mine={mine}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Bubble $mine={mine}>
                            {m?.text || ""}
                            <BubbleMeta>
                              {mine ? "You" : "Admin"} • {fmtTime(m?.createdAt)}
                            </BubbleMeta>
                          </Bubble>
                        </BubbleRow>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={threadEndRef} />
              </Thread>

              <Composer>
                <Input
                  value={draft}
                  onChange={(e) => dispatch(updateMyMessageDraft(e.target.value))}
                 placeholder={
  isClosed
    ? "This conversation is finished. Messaging is disabled."
    : "Write your reply..."
}
                  disabled={isClosed || loadingThread || sending || !selectedId}
                />

                <Btn
                  $primary={!isClosed}
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
                  {isClosed ? "Closed" : sending ? "Sending..." : "Send"}
                </Btn>

                {isClosed ? (
                  <DisabledHint>
                    Admin closed this thread. You can read the history, but replies are disabled.
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

