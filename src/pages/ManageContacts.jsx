// src/pages/ManageContacts.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { socket, connectUserSocket } from "../../utils/socket";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../components/Toast";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchManageContacts,
  saveManageContact,
  selectManageContact,
  updateManageContactField,
  clearManageContactError,
  deleteManageContact,
  markAllContactsSeen,
  sendAdminReply,
  updateReplyDraft,
} from "../reducers/manageContact/manageContactActions";

const STATUS = {
  NEW: "new",
  OPEN: "open",
  PENDING: "pending",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

const isOngoing = (s) => s === STATUS.OPEN || s === STATUS.PENDING;
const isComplete = (s) => s === STATUS.RESOLVED || s === STATUS.CLOSED;

const statusLabel = (s) => {
  if (s === STATUS.NEW) return "New";
  if (s === STATUS.OPEN) return "Open";
  if (s === STATUS.PENDING) return "Pending";
  if (s === STATUS.RESOLVED) return "Resolved";
  if (s === STATUS.CLOSED) return "Closed";
  return String(s || "Unknown");
};

const statusTone = (s) => {
  if (s === STATUS.NEW) return "new";
  if (isOngoing(s)) return "ongoing";
  if (isComplete(s)) return "complete";
  return "default";
};

const convoLabel = (c) => {
  const seen = !!c?.isSeen;
  const s = c?.status;
  if (!seen && s === STATUS.NEW) return "NEW";
  if (isOngoing(s)) return "CURRENT";
  if (seen && isComplete(s)) return "OLD";
  if (seen) return "OLD";
  return "CURRENT";
};

const normalizeThread = (contact) => {
  const msgs = Array.isArray(contact?.messages) ? contact.messages : [];
  if (msgs.length > 0) return msgs;

  // fallback for old docs with only message field
  const fallback = String(contact?.message || "").trim();
  return fallback
    ? [
        {
          sender: "user",
          text: fallback,
          createdAt: contact?.createdAt || null,
        },
      ]
    : [];
};

export default function ManageContacts() {
  const { push } = useToast();
  const dispatch = useDispatch();

  const authUser = useSelector(
    (state) => state.auth?.user || state.auth?.currentUser || null,
  );

  const store = useSelector((state) => state.manageContacts || {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contacts = store.contacts || [];
  const loading = !!store.loading;
  const saving = !!store.saving;
  const deleting = !!store.deleting;
  const bulkUpdating = !!store.bulkUpdating;
  const replying = !!store.replying;
  const error = store.error || "";
  const selectedId = store.selectedId || null;
  const form = store.form || {};
  const replyDraft = store.replyDraft || "";
  const lastFetchedAt = store.lastFetchedAt || null;
  const lastSavedAt = store.lastSavedAt || null;

  const selectedContact = useMemo(() => {
    if (!selectedId) return null;
    return contacts.find((c) => c._id === selectedId) || null;
  }, [contacts, selectedId]);

  const thread = useMemo(() => {
    return selectedContact ? normalizeThread(selectedContact) : [];
  }, [selectedContact]);

  const selectedUpdatedAt = selectedContact?.updatedAt || "";

  const unseenCount = useMemo(
    () => contacts.filter((c) => !c.isSeen).length,
    [contacts],
  );
  const newUnseenCount = useMemo(
    () => contacts.filter((c) => c.status === STATUS.NEW && !c.isSeen).length,
    [contacts],
  );
  const currentCount = useMemo(
    () => contacts.filter((c) => isOngoing(c.status)).length,
    [contacts],
  );
  const completeCount = useMemo(
    () => contacts.filter((c) => isComplete(c.status)).length,
    [contacts],
  );

  useEffect(() => {
    dispatch(fetchManageContacts({ silent: false }));
  }, [dispatch]);

  useEffect(() => {
    const adminId = authUser?._id || authUser?.id;

    if (adminId) {
      connectUserSocket(adminId);
    } else if (!socket.connected) {
      socket.connect();
    }

    const handleContactsRefresh = ({ action }) => {
      dispatch(fetchManageContacts({ silent: true }));

      if (action === "created") {
        push({
          title: "New contact received",
          description: "A new support request just arrived.",
          variant: "success",
        });
      }

      if (action === "user-replied") {
        push({
          title: "User replied",
          description: "A contact thread has a new user reply.",
          variant: "info",
        });
      }

      if (action === "admin-replied") {
        push({
          title: "Reply synced",
          description: "Admin reply updated in real time.",
          variant: "success",
        });
      }
    };

    socket.on("admin:contacts-refresh", handleContactsRefresh);

    return () => {
      socket.off("admin:contacts-refresh", handleContactsRefresh);
    };
  }, [authUser?._id, authUser?.id, dispatch, push]);

  // ✅ Scroll thread to bottom when thread updates (null-safe)
  const threadEndRef = useRef(null);
  useEffect(() => {
    if (!selectedContact) return;
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedId, selectedUpdatedAt, thread.length, selectedContact]);

  // Toast controls (no spam)
  const initialFetchRef = useRef(true);
  const lastFetchedToastRef = useRef(null);
  const lastSavedToastRef = useRef(null);
  const lastErrorToastRef = useRef(null);

  useEffect(() => {
    if (!lastFetchedAt) return;
    if (lastFetchedToastRef.current === lastFetchedAt) return;
    lastFetchedToastRef.current = lastFetchedAt;

    if (!initialFetchRef.current) return;
    initialFetchRef.current = false;

    push({
      title: "Inbox ready",
      description: contacts.length
        ? `Loaded ${contacts.length} contact${contacts.length === 1 ? "" : "s"}.`
        : "No contacts yet. New messages will appear here.",
      variant: "success",
    });
  }, [lastFetchedAt, contacts.length, push]);

  useEffect(() => {
    if (!lastSavedAt) return;
    if (lastSavedToastRef.current === lastSavedAt) return;
    lastSavedToastRef.current = lastSavedAt;

    push({
      title: "Synced",
      description: "Saved + updated.",
      variant: "success",
    });
  }, [lastSavedAt, push]);

  useEffect(() => {
    if (!error) return;
    if (lastErrorToastRef.current === error) return;
    lastErrorToastRef.current = error;

    push({
      title: "Action failed",
      description: error,
      variant: "error",
    });
  }, [error, push]);

  // ✅ 5-star behavior:
  // When admin opens a ticket, auto-mark Seen, and if it was New -> Open.
  const autoMarkOpenedRef = useRef({});
  const handleSelect = (contact) => {
    dispatch(selectManageContact(contact));

    const busy = saving || deleting || bulkUpdating || replying;
    if (busy) return;

    const id = contact?._id;
    if (!id) return;

    // prevent re-firing auto-save over and over for same selection
    if (autoMarkOpenedRef.current[id]) return;

    const needsSeen = !contact?.isSeen;
    const needsOpen = contact?.status === STATUS.NEW;

    if (!needsSeen && !needsOpen) return;

    autoMarkOpenedRef.current[id] = true;

    dispatch(clearManageContactError());
    dispatch(
      saveManageContact(id, {
        ...contact,
        isSeen: true,
        status: needsOpen ? STATUS.OPEN : contact.status,
      }),
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    dispatch(updateManageContactField(name, value));
  };

  const handleCheckbox = (e) => {
    const { name, checked } = e.target;
    dispatch(updateManageContactField(name, checked));
  };

  const handleSave = () => {
    if (!selectedId) return;
    dispatch(clearManageContactError());
    dispatch(saveManageContact(selectedId, form));
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const ok = window.confirm(
      "Delete this contact permanently? This cannot be undone.",
    );
    if (!ok) return;

    dispatch(clearManageContactError());
    dispatch(deleteManageContact(selectedId));
    push({
      title: "Deleting…",
      description: "Removing contact.",
      variant: "info",
    });
  };

  const handleMarkAllSeen = () => {
    if (!contacts.length) return;
    const ok = window.confirm("Mark ALL contacts as seen?");
    if (!ok) return;
    dispatch(clearManageContactError());
    dispatch(markAllContactsSeen());
    push({
      title: "Updating…",
      description: "Marking all seen.",
      variant: "info",
    });
  };

  // Quick shortcuts
  const shortcutMarkCurrent = () => {
    dispatch(updateManageContactField("status", STATUS.OPEN));
    dispatch(updateManageContactField("isSeen", true));
  };
  const shortcutMarkOngoing = () => {
    dispatch(updateManageContactField("status", STATUS.PENDING));
    dispatch(updateManageContactField("isSeen", true));
  };
  const shortcutMarkComplete = () => {
    dispatch(updateManageContactField("status", STATUS.RESOLVED));
    dispatch(updateManageContactField("isSeen", true));
    dispatch(updateManageContactField("replied", true));
  };

  const handleSendReply = () => {
    if (!selectedId) return;
    const clean = String(replyDraft || "").trim();
    if (!clean) {
      push({
        title: "Empty reply",
        description: "Type a message first.",
        variant: "info",
      });
      return;
    }
    dispatch(clearManageContactError());

    // ✅ pro behavior: sending reply also marks seen + replied in workflow
    // the backend action should append to thread + send email.
    dispatch(sendAdminReply(selectedId, clean));

    // ✅ clear input immediately (feels instant, reduces duplicate sends)
    dispatch(updateReplyDraft(""));

    // ✅ also reflect status/flags locally so admin sees it immediately
    dispatch(updateManageContactField("isSeen", true));
    dispatch(updateManageContactField("replied", true));
    if (form?.status === STATUS.NEW) {
      dispatch(updateManageContactField("status", STATUS.OPEN));
    }
  };

  return (
    <Page>
      <Hero
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <HeroLeft>
          <Kicker>ADMIN CONTACT COMMAND CENTER</Kicker>
          <Title>
            Threaded Support Inbox.<span> Reply Like a Real Helpdesk.</span>
          </Title>
          <Subtitle>
            View full message threads and reply from the admin panel with
            premium workflow control.
          </Subtitle>

          <HeroMeta>
            <Badge $tone="primary">
              ✨ New / Unseen: <strong>{newUnseenCount}</strong>
            </Badge>
            <Badge $tone="soft">
              👁 Unseen Total: <strong>{unseenCount}</strong>
            </Badge>
            <Badge $tone="soft">
              💬 Current: <strong>{currentCount}</strong>
            </Badge>
            <Badge $tone="soft">
              ✅ Complete: <strong>{completeCount}</strong>
            </Badge>
            <Badge $tone="soft">
              📨 Total: <strong>{contacts.length}</strong>
            </Badge>

            <HeroActions>
              <MiniButton
                type="button"
                onClick={handleMarkAllSeen}
                disabled={loading || bulkUpdating || !contacts.length}
              >
                {bulkUpdating ? "Updating…" : "Mark All Seen"}
              </MiniButton>

              <MiniButton
                type="button"
                onClick={() => dispatch(fetchManageContacts({ silent: false }))}
                disabled={
                  loading || saving || deleting || bulkUpdating || replying
                }
              >
                {loading ? "Refreshing…" : "Refresh"}
              </MiniButton>

              <PollPill>
                {saving || deleting || bulkUpdating || replying
                  ? "LIVE: PAUSED"
                  : "LIVE: ON"}
              </PollPill>
            </HeroActions>
          </HeroMeta>
        </HeroLeft>

        <HeroRight>
          <Stars>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n}>★</Star>
            ))}
          </Stars>
          <HeroNote>
            Premium Workflow • Threaded Replies • Instant Handling
          </HeroNote>
        </HeroRight>
      </Hero>

      <MainGrid>
        {/* LEFT LIST */}
        <ListColumn>
          <ColumnTitle>All Contacts</ColumnTitle>

          {loading && (
            <SkeletonList>
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </SkeletonList>
          )}

          {!loading && contacts.length === 0 && (
            <EmptyState>
              <EmptyTitle>No contacts yet</EmptyTitle>
              <EmptyText>
                When a visitor submits your contact form, messages land here.
              </EmptyText>
            </EmptyState>
          )}

          <AnimatePresence>
            {!loading &&
              contacts.map((c) => {
                const convo = convoLabel(c);
                const msgCount = Array.isArray(c?.messages)
                  ? c.messages.length
                  : 0;

                return (
                  <ContactCard
                    key={c._id}
                    as={motion.button}
                    type="button"
                    layout
                    onClick={() => handleSelect(c)}
                    $active={c._id === selectedId}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <CardHeader>
                      <Name>{c.name}</Name>
                      <RightHeader>
                        <ConvoBadge $kind={convo}>{convo}</ConvoBadge>
                        <Email title={c.email}>{c.email}</Email>
                      </RightHeader>
                    </CardHeader>

                    <CardBody>
                      <Subject title={c.subject}>
                        {c.subject || "No subject"}
                      </Subject>
                      <StatusPill $tone={statusTone(c.status)}>
                        ● {statusLabel(c.status)}
                      </StatusPill>
                    </CardBody>

                    <CardFooter>
                      <MetaText>
                        {c.isSeen ? "👁 Seen" : "✨ Unseen"} •{" "}
                        {c.replied ? "✅ Replied" : "⏳ No reply"} •{" "}
                        {msgCount ? `💬 ${msgCount} msgs` : "💬 1 msg"}
                      </MetaText>
                      <MetaText>
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleString()
                          : "Just now"}
                      </MetaText>
                    </CardFooter>
                  </ContactCard>
                );
              })}
          </AnimatePresence>
        </ListColumn>

        {/* RIGHT PANEL */}
        <DetailColumn>
          <ColumnTitle>Thread + Workflow</ColumnTitle>

          {!selectedContact && (
            <EmptyEditor>
              <EmptyEditorTitle>Select a contact</EmptyEditorTitle>
              <EmptyEditorText>
                Click a message on the left to view the conversation thread and
                reply.
              </EmptyEditorText>
            </EmptyEditor>
          )}

          {selectedContact && (
            <EditorCard
              as={motion.div}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TopRow>
                <MetaPills>
                  <SmallPill $kind={convoLabel(selectedContact)}>
                    {convoLabel(selectedContact)}
                  </SmallPill>
                  <SmallPill $kind={selectedContact.isSeen ? "SEEN" : "UNSEEN"}>
                    {selectedContact.isSeen ? "SEEN" : "UNSEEN"}
                  </SmallPill>
                  <SmallPill
                    $kind={selectedContact.replied ? "REPLIED" : "NOREPLY"}
                  >
                    {selectedContact.replied ? "REPLIED" : "NO REPLY"}
                  </SmallPill>
                  <SmallPill
                    $kind={
                      isOngoing(selectedContact.status)
                        ? "ONGOING"
                        : isComplete(selectedContact.status)
                          ? "COMPLETE"
                          : "ACTIVE"
                    }
                  >
                    {isOngoing(selectedContact.status)
                      ? "ONGOING"
                      : isComplete(selectedContact.status)
                        ? "COMPLETE"
                        : "ACTIVE"}
                  </SmallPill>
                </MetaPills>

                <ShortcutRow>
                  <ShortcutBtn
                    type="button"
                    onClick={shortcutMarkCurrent}
                    disabled={saving || deleting || bulkUpdating || replying}
                  >
                    Mark Current
                  </ShortcutBtn>
                  <ShortcutBtn
                    type="button"
                    onClick={shortcutMarkOngoing}
                    disabled={saving || deleting || bulkUpdating || replying}
                  >
                    Mark Ongoing
                  </ShortcutBtn>
                  <ShortcutBtn
                    type="button"
                    onClick={shortcutMarkComplete}
                    disabled={saving || deleting || bulkUpdating || replying}
                  >
                    Mark Complete
                  </ShortcutBtn>
                </ShortcutRow>
              </TopRow>

              {/* THREAD */}
              <ThreadBox>
                {thread.length === 0 ? (
                  <ThreadEmpty>No messages in this thread yet.</ThreadEmpty>
                ) : (
                  thread.map((m, idx) => {
                    const isAdmin = m?.sender === "admin";
                    const when = m?.createdAt
                      ? new Date(m.createdAt).toLocaleString()
                      : "";
                    return (
                      <BubbleRow
                        key={m?._id || `msg-${idx}`}
                        $side={isAdmin ? "right" : "left"}
                      >
                        <Bubble $side={isAdmin ? "right" : "left"}>
                          <BubbleTop>
                            <BubbleSender>
                              {isAdmin ? "Admin" : "User"}
                            </BubbleSender>
                            <BubbleTime>{when}</BubbleTime>
                          </BubbleTop>
                          <BubbleText>{m?.text || ""}</BubbleText>
                        </Bubble>
                      </BubbleRow>
                    );
                  })
                )}
                <div ref={threadEndRef} />
              </ThreadBox>

              {/* REPLY */}
              <ReplyWrap>
                <ReplyLabel>Admin Reply</ReplyLabel>
                <ReplyArea
                  value={replyDraft}
                  onChange={(e) => dispatch(updateReplyDraft(e.target.value))}
                  placeholder="Type your reply… (saved into the conversation thread)"
                  rows={3}
                  disabled={replying || deleting || bulkUpdating}
                />
                <ReplyActions>
                  <SendBtn
                    type="button"
                    onClick={handleSendReply}
                    disabled={replying || !String(replyDraft).trim()}
                  >
                    {replying ? "Sending…" : "Send Reply"}
                  </SendBtn>

                  <ShortcutBtn
                    type="button"
                    onClick={() => dispatch(updateReplyDraft(""))}
                    disabled={replying || !String(replyDraft).trim()}
                  >
                    Clear Reply
                  </ShortcutBtn>

                  <MiniInfo>
                    Reply sends into thread + marks Seen + marks Replied.
                  </MiniInfo>
                </ReplyActions>
              </ReplyWrap>

              {/* WORKFLOW */}
              <Grid2>
                <EditorRow>
                  <Label>Status</Label>
                  <Select
                    name="status"
                    value={form?.status ?? STATUS.NEW}
                    onChange={handleChange}
                  >
                    <option value={STATUS.NEW}>New</option>
                    <option value={STATUS.OPEN}>Open (Current)</option>
                    <option value={STATUS.PENDING}>Pending (Ongoing)</option>
                    <option value={STATUS.RESOLVED}>Resolved (Complete)</option>
                    <option value={STATUS.CLOSED}>Closed</option>
                  </Select>
                </EditorRow>

                <EditorRow>
                  <Label>Reply / Internal Note</Label>
                  <TextArea
                    name="replyNote"
                    value={form?.replyNote ?? ""}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Internal notes (optional)…"
                  />
                </EditorRow>
              </Grid2>

              <ToggleRow>
                <ToggleItem>
                  <input
                    id="isSeen"
                    type="checkbox"
                    name="isSeen"
                    checked={!!form?.isSeen}
                    onChange={handleCheckbox}
                  />
                  <ToggleLabel htmlFor="isSeen">
                    Mark as <strong>Seen</strong>
                  </ToggleLabel>
                </ToggleItem>

                <ToggleItem>
                  <input
                    id="replied"
                    type="checkbox"
                    name="replied"
                    checked={!!form?.replied}
                    onChange={handleCheckbox}
                  />
                  <ToggleLabel htmlFor="replied">
                    Mark as <strong>Replied</strong>
                  </ToggleLabel>
                </ToggleItem>
              </ToggleRow>

              {error && <ErrorText>{error}</ErrorText>}

              <ActionsRow>
                <SaveButton
                  type="button"
                  onClick={handleSave}
                  disabled={saving || deleting || bulkUpdating || replying}
                >
                  {saving ? "Saving…" : "Save Workflow"}
                </SaveButton>

                <DeleteButton
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving || bulkUpdating || replying}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </DeleteButton>

                <SaveButton
                  as="a"
                  href={`mailto:${selectedContact?.email || ""}`}
                  disabled={!selectedContact?.email}
                >
                  Email User
                </SaveButton>

                <HintText>Thread updates live. No reload needed.</HintText>
              </ActionsRow>
            </EditorCard>
          )}
        </DetailColumn>
      </MainGrid>
    </Page>
  );
}

/* ================================
   Styles (Luxury / Dark)
================================ */
const Page = styled.div`
  min-height: 100vh;
  padding: 26px 24px 40px;
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.16),
      transparent 55%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(90, 56, 37, 0.5),
      ${({ theme }) => theme.colors.black} 65%
    );
  color: ${({ theme }) => theme.colors.ivory};
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Hero = styled(motion.header)`
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 22px;
  padding: 22px 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(
    120deg,
    rgba(47, 27, 18, 0.96),
    rgba(61, 38, 26, 0.98)
  );
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 249, 242, 0.08);

  @media (max-width: 880px) {
    flex-direction: column;
  }
`;

const HeroLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Kicker = styled.div`
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Title = styled.h1`
  font-size: clamp(1.8rem, 2.4vw, 2.2rem);
  font-weight: 800;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.ivory};
  text-transform: uppercase;

  span {
    display: block;
    font-size: 0.9em;
    background: linear-gradient(
      120deg,
      #fdd5a5,
      ${({ theme }) => theme.colors.lightBrown}
    );
    -webkit-background-clip: text;
    color: transparent;
  }
`;

const Subtitle = styled.p`
  max-width: 720px;
  font-size: 0.97rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  line-height: 1.5;
`;

const HeroMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  align-items: center;
`;

const Badge = styled.div`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 6px 14px;
  font-size: 0.86rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 249, 242, 0.22);

  ${({ $tone, theme }) =>
    $tone === "primary"
      ? `
    background: linear-gradient(135deg, ${theme.colors.lightBrown}, ${theme.colors.cocoa});
    color: ${theme.colors.black};
  `
      : `
    background: rgba(255, 255, 255, 0.04);
    color: ${theme.colors.ivory};
  `}

  strong {
    font-weight: 700;
  }
`;

const HeroActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const MiniButton = styled.button`
  border: 1px solid rgba(255, 249, 242, 0.18);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 7px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const PollPill = styled.span`
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.78);
`;

const HeroRight = styled.div`
  min-width: 220px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: radial-gradient(
    circle at top,
    rgba(255, 249, 242, 0.09),
    rgba(0, 0, 0, 0.3)
  );
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid rgba(255, 249, 242, 0.1);
`;

const Stars = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 10px;
`;

const Star = styled.span`
  font-size: 1rem;
  text-shadow: 0 0 10px rgba(255, 215, 160, 0.9);
  color: #ffd9a0;
`;

const HeroNote = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  text-align: right;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.5fr);
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const ListColumn = styled.section`
  background: rgba(0, 0, 0, 0.5);
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  backdrop-filter: blur(16px) saturate(1.2);
`;

const DetailColumn = styled.section`
  background: rgba(0, 0, 0, 0.7);
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 16px 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  backdrop-filter: blur(18px) saturate(1.3);
`;

const ColumnTitle = styled.h2`
  font-size: 0.98rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const SkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SkeletonCard = styled.div`
  height: 80px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05),
    rgba(255, 255, 255, 0.12),
    rgba(255, 255, 255, 0.05)
  );
  background-size: 200% 100%;
  animation: shimmer 1.3s linear infinite;

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
`;

const EmptyState = styled.div`
  padding: 18px 14px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(61, 38, 26, 0.6);
  border: 1px dashed rgba(255, 249, 242, 0.24);
`;

const EmptyTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const EmptyText = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const ContactCard = styled.button`
  width: 100%;
  text-align: left;
  border: 0;
  outline: 0;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 10px 11px 9px;
  background: ${({ theme }) => theme.colors.glass};
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 4px;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(255, 217, 160, 0.9)" : "rgba(255, 255, 255, 0.06)"};
  position: relative;
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
`;

const RightHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 62%;
`;

const ConvoBadge = styled.span`
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.14);

  ${({ $kind }) => {
    if ($kind === "NEW")
      return `background: rgba(255, 217, 160, 0.16); color: #ffd9a0;`;
    if ($kind === "CURRENT")
      return `background: rgba(214, 182, 159, 0.16); color: #f4cfb1;`;
    return `background: rgba(0,0,0,.35); color: rgba(255,255,255,.72);`;
  }}
`;

const Name = styled.div`
  font-size: 0.97rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Email = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  text-align: right;
  min-width: 0;
`;

const CardBody = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
`;

const Subject = styled.div`
  font-size: 0.86rem;
  color: ${({ theme }) => theme.colors.ivory};
  max-width: 70%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const StatusPill = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 3px 9px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border: 1px solid rgba(255, 255, 255, 0.12);

  ${({ $tone }) => {
    if ($tone === "new")
      return `background: rgba(255, 217, 160, 0.16); color: #ffd9a0;`;
    if ($tone === "ongoing")
      return `background: rgba(214, 182, 159, 0.16); color: #f4cfb1;`;
    if ($tone === "complete")
      return `background: rgba(120, 255, 180, 0.10); color: rgba(170,255,210,.95); border-color: rgba(170,255,210,.18);`;
    return `background: rgba(0,0,0,.35); color: rgba(255,255,255,.7);`;
  }}
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const MetaText = styled.div`
  opacity: 0.85;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const EmptyEditor = styled.div`
  padding: 18px 16px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(61, 38, 26, 0.7);
  border: 1px dashed rgba(255, 249, 242, 0.28);
`;

const EmptyEditorTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const EmptyEditorText = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const EditorCard = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px 14px 16px;
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.hard};
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TopRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const MetaPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ShortcutRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ShortcutBtn = styled.button`
  border: 1px solid rgba(255, 249, 242, 0.16);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const SmallPill = styled.span`
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.12);

  ${({ $kind }) => {
    if ($kind === "NEW")
      return `background: rgba(255,217,160,.14); color:#ffd9a0;`;
    if ($kind === "CURRENT")
      return `background: rgba(214,182,159,.14); color:#f4cfb1;`;
    if ($kind === "OLD")
      return `background: rgba(0,0,0,.35); color: rgba(255,255,255,.72);`;
    if ($kind === "SEEN")
      return `background: rgba(120,255,180,.10); color: rgba(170,255,210,.95); border-color: rgba(170,255,210,.18);`;
    if ($kind === "UNSEEN")
      return `background: rgba(255,217,160,.14); color:#ffd9a0;`;
    if ($kind === "REPLIED")
      return `background: rgba(120,255,180,.10); color: rgba(170,255,210,.95); border-color: rgba(170,255,210,.18);`;
    if ($kind === "NOREPLY")
      return `background: rgba(255, 180, 180, 0.10); color: #ffb0b0; border-color: rgba(255,176,176,.18);`;
    if ($kind === "ONGOING")
      return `background: rgba(214,182,159,.14); color:#f4cfb1;`;
    if ($kind === "COMPLETE")
      return `background: rgba(120,255,180,.10); color: rgba(170,255,210,.95); border-color: rgba(170,255,210,.18);`;
    return `background: rgba(0,0,0,.35); color: rgba(255,255,255,.72);`;
  }}
`;

const ThreadBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px;
  max-height: 340px;
  overflow: auto;
`;

const ThreadEmpty = styled.div`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 0.9rem;
`;

const BubbleRow = styled.div`
  display: flex;
  justify-content: ${({ $side }) =>
    $side === "right" ? "flex-end" : "flex-start"};
  margin: 8px 0;
`;

const Bubble = styled.div`
  width: min(520px, 92%);
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  ${({ $side, theme }) =>
    $side === "right"
      ? `
        background: linear-gradient(120deg, rgba(255,217,160,.14), rgba(214,182,159,.10));
        color: ${theme.colors.ivory};
      `
      : `
        background: rgba(255,255,255,0.05);
        color: ${theme.colors.ivory};
      `}
`;

const BubbleTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  opacity: 0.9;
`;

const BubbleSender = styled.div`
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const BubbleTime = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

const BubbleText = styled.div`
  font-size: 0.93rem;
  line-height: 1.45;
  white-space: pre-wrap;
`;

const ReplyWrap = styled.div`
  padding: 10px 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const ReplyLabel = styled.div`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.lightBrown};
  margin-bottom: 8px;
`;

const ReplyArea = styled.textarea`
  width: 100%;
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.7);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 0.92rem;
  resize: vertical;

  &:focus {
    outline: 0;
    border-color: #ffd9a0;
    box-shadow: 0 0 0 1px rgba(255, 217, 160, 0.7);
  }

  &:disabled {
    opacity: 0.75;
    cursor: not-allowed;
  }
`;

const ReplyActions = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const SendBtn = styled.button`
  border: 0;
  outline: 0;
  padding: 9px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  background: linear-gradient(120deg, #ffd9a0, #f4cfb1);
  color: #2f1b12;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const MiniInfo = styled.div`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const EditorRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const TextArea = styled.textarea`
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 8px 9px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.7);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 0.9rem;
  resize: vertical;

  &:focus {
    outline: 0;
    border-color: #ffd9a0;
    box-shadow: 0 0 0 1px rgba(255, 217, 160, 0.7);
  }
`;

const Select = styled.select`
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 8px 9px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.8);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 0.9rem;

  &:focus {
    outline: 0;
    border-color: #ffd9a0;
    box-shadow: 0 0 0 1px rgba(255, 217, 160, 0.7);
  }
`;

const ToggleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  input[type="checkbox"] {
    margin-right: 6px;
    accent-color: #ffd9a0;
    cursor: pointer;
  }
`;

const ToggleItem = styled.label`
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.lightBrown};
  cursor: pointer;
`;

const ToggleLabel = styled.span``;

const ErrorText = styled.div`
  font-size: 0.82rem;
  color: #ffb0b0;
`;

const ActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const SaveButton = styled.button`
  border: 0;
  outline: 0;
  padding: 8px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.18);

  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
`;

const DeleteButton = styled.button`
  border: 0;
  outline: 0;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  background: rgba(255, 80, 80, 0.14);
  color: #ffb0b0;
  border: 1px solid rgba(255, 176, 176, 0.35);

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const HintText = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.lightBrown};
`;
