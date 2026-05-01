// src/pages/Testimonials.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import theme from "../Styles/theme";
import { getAllTestimonials } from "../lib/apiClient";

export default function Testimonials() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const list = await getAllTestimonials();

        // 1) sanitize + exclude anything that looks deleted/hidden/unapproved
        const base = (Array.isArray(list) ? list : [])
          .filter(Boolean)
          .filter(
            (t) =>
              !t?.isDeleted &&
              !t?.deleted &&
              !t?.deletedAt &&
              t?.status !== "deleted" &&
              t?.active !== false &&
              t?.visible !== false &&
              t?.isApproved !== false
          )
          .map((t, i) => ({
            // prefer backend id; only fall back if absolutely missing
            id: t._id || t.id || String(i),
            imageUrl: t.imageUrl || t.image || "",
            message: String(t.message || "").trim(),
            rating: Math.max(1, Math.min(5, Number(t.rating ?? 5))),
            createdAt: t.createdAt ? new Date(t.createdAt) : null,
          }))
          // drop totally empty messages to avoid blank cards
          .filter((t) => t.message.length > 0);

        // 2) de-dupe by id ONLY (never by message/rating)
        const seenIds = new Set();
        const deduped = [];
        for (const t of base) {
          if (seenIds.has(t.id)) continue;
          seenIds.add(t.id);
          deduped.push(t);
        }

        // 3) sort newest -> oldest (fallback puts unknown dates last)
        deduped.sort((a, b) => {
          const aTime = a.createdAt instanceof Date && !isNaN(a.createdAt) ? a.createdAt.getTime() : -1;
          const bTime = b.createdAt instanceof Date && !isNaN(b.createdAt) ? b.createdAt.getTime() : -1;
          return bTime - aTime;
        });

        if (isMounted) setItems(deduped);
      } catch {
        if (isMounted) {
          setItems([
            {
              id: "fallback-1",
              imageUrl:
                "https://images.unsplash.com/photo-1594623930572-5fefcf21c0bb?q=80&w=640&auto=format&fit=crop",
              message:
                "“Week one with Coach, my jab got SNAPPY and my DMs lit up for 1-on-1s. The drills are simple, brutal, effective. 🥊🔥”",
              rating: 5,
              createdAt: new Date(),
            },
          ]);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const hasLoop = items.length > 1;
  const displayItems = useMemo(() => items, [items]);

  return (
    <Page>
      <Wrap>
        <Hook>“Week one and my punches sounded different.” 🥊</Hook>
        <Sub>
          Real boxers. Real results. Book <strong>1-on-1 coaching</strong>, take{" "}
          <strong>online courses</strong>, or <strong>download the e-book</strong> to level up. 💥📕
        </Sub>

        <RailMask aria-label="Testimonials">
          <Belt $animate={hasLoop} aria-live="polite">
            <Track role="list" aria-label="Testimonial track">
              {displayItems.map((t) => (
                <Card role="listitem" key={t.id} aria-label="Testimonial card">
                  <ImgWrap>
                    <Img
                      src={t.imageUrl}
                      alt="Boxing client result preview"
                      loading="lazy"
                      decoding="async"
                    />
                  </ImgWrap>
                  <Body>
                    <Quote>{t.message}</Quote>
                    <Rating aria-label={`Rating: ${t.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={idx < t.rating ? "fa-solid fa-star" : "fa-regular fa-star"}
                          aria-hidden="true"
                        />
                      ))}
                    </Rating>
                  </Body>
                </Card>
              ))}
            </Track>

            {hasLoop && (
              <Track aria-hidden="true">
                {displayItems.map((t) => (
                  <Card key={`ghost-${t.id}`}>
                    <ImgWrap>
                      <Img src={t.imageUrl} alt="" loading="lazy" decoding="async" />
                    </ImgWrap>
                    <Body>
                      <Quote>{t.message}</Quote>
                      <Rating>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={idx < t.rating ? "fa-solid fa-star" : "fa-regular fa-star"}
                            aria-hidden="true"
                          />
                        ))}
                      </Rating>
                    </Body>
                  </Card>
                ))}
              </Track>
            )}
          </Belt>
        </RailMask>
      </Wrap>
    </Page>
  );
}

// ====== Animation ======
const scrollLeft = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

// ====== Styled ======
const Page = styled.div`
  min-height: 100dvh;
  background:
    radial-gradient(1200px 600px at 80% -10%, ${theme.colors.ivory}0a, transparent 60%),
    linear-gradient(180deg, ${theme.colors.lightBrown} 0%, ${theme.colors.darkBrown} 100%);
  color: ${theme.colors.white};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem;
`;

const Wrap = styled.div`
  width: 100%;
  max-width: ${theme.layout.max};
  perspective: 1200px;
`;

const Hook = styled.h1`
  font-size: clamp(1.8rem, 3.6vw, 3rem);
  line-height: 1.1;
  margin: 0 0 1.25rem 0;
  letter-spacing: 0.02em;
  color: ${theme.colors.ivory};
  text-shadow: ${theme.shadow.glow};
  font-weight: 800;
`;

const Sub = styled.p`
  font-size: clamp(0.95rem, 1.2vw, 1.05rem);
  color: ${theme.colors.lightBrown};
  margin: 0 0 2.2rem 0;
  opacity: 0.9;
`;

const RailMask = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadow.hard};
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
  background: ${theme.colors.cocoa};
  padding: 1rem 0;
`;

const Belt = styled.div`
  display: flex;
  gap: 1.2rem;
  will-change: transform;
  transform: rotateX(0.6deg) rotateY(-1.2deg);
  ${({ $animate }) => ($animate ? css`animation: ${scrollLeft} 38s linear infinite;` : css`animation: none;`)}
`;

const Track = styled.div`
  display: flex;
  gap: 1.2rem;
`;

const Card = styled.article`
  flex: 0 0 clamp(260px, 30vw, 360px);
  background: linear-gradient(145deg, ${theme.colors.brown}, ${theme.colors.cocoa});
  color: ${theme.colors.ivory};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadow.glow};
  border: 1px solid rgba(255, 255, 255, 0.08);
  transform: translateZ(0);
  transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 600ms cubic-bezier(0.22, 1, 0.36, 1);
  &:hover {
    transform: translateZ(26px) rotateY(-2deg) rotateX(1deg) scale(1.02);
    box-shadow: 0 28px 60px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
`;

const ImgWrap = styled.div`
  position: relative;
  aspect-ratio: 16/10;
  border-top-left-radius: ${theme.radius.lg};
  border-top-right-radius: ${theme.radius.lg};
  overflow: hidden;
  background: ${theme.colors.black};
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.7) contrast(1.05);
  transform: scale(1.02);
`;

const Body = styled.div`
  padding: 1rem 1rem 1.2rem;
`;

const Quote = styled.p`
  margin: 0 0 0.9rem 0;
  font-size: 0.98rem;
  line-height: 1.45;
  color: ${theme.colors.ivory};
`;

const Rating = styled.div`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 0.45rem 0.7rem;
  border-radius: ${theme.radius.pill};
  background: ${theme.colors.glass};
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${theme.shadow.soft};
`;

const Star = styled.i`
  font-size: 1.05rem;
  line-height: 1;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
`;
