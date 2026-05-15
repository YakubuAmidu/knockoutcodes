// src/pages/Testimonials.jsx
import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled, { keyframes, css } from "styled-components";
import theme from "../Styles/theme";
import { fetchTestimonials } from "../reducers/testimonial/testimonialActions";

const fallbackTestimonials = [
  {
    id: "fallback-1",
    name: "KnockoutCodes Student",
    imageUrl:
      "https://images.unsplash.com/photo-1594623930572-5fefcf21c0bb?q=80&w=640&auto=format&fit=crop",
    comment:
      "Week one with Coach, my jab got snappy and my confidence changed. The drills are simple, brutal, and effective.",
    rating: 5,
    createdAt: new Date().toISOString(),
  },
];

export default function Testimonials() {
  const dispatch = useDispatch();

  const {
    testimonials = [],
    loading = false,
    error = null,
  } = useSelector((state) => state.testimonials || {});

  useEffect(() => {
    dispatch(fetchTestimonials());
  }, [dispatch]);

  const displayItems = useMemo(() => {
    const list = testimonials?.length ? testimonials : fallbackTestimonials;

    return list.map((t, index) => ({
      id: t._id || t.id || `testimonial-${index}`,
      name: t.name || t.fullName || t.username || "KnockoutCodes Student",
      imageUrl:
        t.imageUrl ||
        t.image ||
        t.avatar ||
        "https://images.unsplash.com/photo-1594623930572-5fefcf21c0bb?q=80&w=640&auto=format&fit=crop",
      comment: String(t.comment || t.message || t.review || "").trim(),
      rating: Math.max(1, Math.min(5, Number(t.rating ?? 5))),
      createdAt: t.createdAt || null,
    }));
  }, [testimonials]);

  const hasLoop = displayItems.length > 1;

  return (
    <Page>
      <LuxuryGlowOne />
      <LuxuryGlowTwo />

      <Wrap>
        <Badge>REAL RESULTS • REAL FIGHTERS • REAL CONFIDENCE</Badge>

        <Hook>
          “They came in unsure.
          <span>They left looking dangerous.”</span>
        </Hook>

        <Sub>
          Premium boxing coaching, online courses, and training resources built
          for people who want sharper hands, better footwork, and a stronger
          mindset.
        </Sub>

        {loading && <Status>Loading premium testimonials...</Status>}
        {error && <Status>{error}</Status>}

        <RailMask aria-label="Testimonials">
          <Belt $animate={hasLoop} aria-live="polite">
            <Track role="list" aria-label="Testimonial track">
              {displayItems.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} />
              ))}
            </Track>

            {hasLoop && (
              <Track aria-hidden="true">
                {displayItems.map((t) => (
                  <TestimonialCard key={`ghost-${t.id}`} testimonial={t} />
                ))}
              </Track>
            )}
          </Belt>
        </RailMask>
      </Wrap>
    </Page>
  );
}

function TestimonialCard({ testimonial }) {
  return (
    <Card role="listitem" aria-label={`${testimonial.name} testimonial`}>
      <ImgWrap>
        <Img
          src={testimonial.imageUrl}
          alt={`${testimonial.name} testimonial`}
          loading="lazy"
          decoding="async"
        />
        <ImageShade />
      </ImgWrap>

      <Body>
        <TopRow>
          <ClientInfo>
            <Name>{testimonial.name}</Name>
            <Verified>Verified KnockoutCodes Result</Verified>
          </ClientInfo>

          <Rating aria-label={`Rating: ${testimonial.rating} out of 5`}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <Star
                key={idx}
                className={
                  idx < testimonial.rating
                    ? "fa-solid fa-star"
                    : "fa-regular fa-star"
                }
                aria-hidden="true"
              />
            ))}
          </Rating>
        </TopRow>

        <Quote>“{testimonial.comment}”</Quote>
      </Body>
    </Card>
  );
}

// ====== Animation ======
const scrollLeft = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

// ====== Styled ======
const Page = styled.section`
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: ${theme.colors.white};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7rem 2rem;
  background:
    radial-gradient(circle at 18% 10%, rgba(214, 182, 159, 0.2), transparent 34%),
    radial-gradient(circle at 85% 15%, rgba(255, 249, 242, 0.11), transparent 28%),
    linear-gradient(135deg, ${theme.colors.black} 0%, ${theme.colors.darkBrown} 55%, ${theme.colors.black} 100%);
`;

const LuxuryGlowOne = styled.div`
  position: absolute;
  top: -160px;
  left: -140px;
  width: 430px;
  height: 430px;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.16);
  filter: blur(90px);
`;

const LuxuryGlowTwo = styled.div`
  position: absolute;
  right: -160px;
  bottom: -180px;
  width: 540px;
  height: 540px;
  border-radius: 999px;
  background: rgba(90, 56, 37, 0.42);
  filter: blur(100px);
`;

const Wrap = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: ${theme.layout.max};
  perspective: 1200px;
`;

const Badge = styled.div`
  width: fit-content;
  margin-bottom: 1.1rem;
  padding: 0.72rem 1rem;
  border-radius: ${theme.radius.pill};
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: ${theme.colors.lightBrown};
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const Hook = styled.h1`
  max-width: 950px;
  margin: 0;
  font-size: clamp(2.25rem, 5.8vw, 5.2rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
  color: ${theme.colors.ivory};
  text-shadow: 0 24px 60px rgba(0, 0, 0, 0.46);
  font-weight: 900;

  span {
    display: block;
    color: ${theme.colors.lightBrown};
  }
`;

const Sub = styled.p`
  max-width: 760px;
  margin: 1.35rem 0 2.3rem;
  color: rgba(255, 249, 242, 0.78);
  font-size: clamp(1rem, 1.4vw, 1.15rem);
  line-height: 1.75;
`;

const Status = styled.p`
  margin: 0 0 1rem;
  color: ${theme.colors.lightBrown};
  font-weight: 700;
`;

const RailMask = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadow.hard};
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 8%,
    black 92%,
    transparent 100%
  );
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
    rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(255, 255, 255, 0.11);
  padding: 1rem 0;

  &:hover > div {
    animation-play-state: paused;
  }
`;

const Belt = styled.div`
  display: flex;
  gap: 1.2rem;
  will-change: transform;
  transform: rotateX(0.45deg) rotateY(-0.9deg);

  ${({ $animate }) =>
    $animate
      ? css`
          animation: ${scrollLeft} 42s linear infinite;
        `
      : css`
          animation: none;
        `}
`;

const Track = styled.div`
  display: flex;
  gap: 1.2rem;
`;

const Card = styled.article`
  flex: 0 0 clamp(285px, 31vw, 390px);
  overflow: hidden;
  background:
    linear-gradient(145deg, rgba(255, 249, 242, 0.12), rgba(255, 255, 255, 0.035)),
    ${theme.colors.cocoa};
  color: ${theme.colors.ivory};
  border-radius: ${theme.radius.xl};
  box-shadow: ${theme.shadow.glow};
  border: 1px solid rgba(255, 255, 255, 0.11);
  transform: translateZ(0);
  transition:
    transform 600ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 600ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 600ms cubic-bezier(0.22, 1, 0.36, 1);

  &:hover {
    transform: translateY(-10px) translateZ(26px) rotateY(-2deg) scale(1.015);
    border-color: rgba(214, 182, 159, 0.48);
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.45),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
`;

const ImgWrap = styled.div`
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: ${theme.colors.black};
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.82) contrast(1.08);
  transform: scale(1.04);
  transition: transform 700ms ease;

  ${Card}:hover & {
    transform: scale(1.1);
  }
`;

const ImageShade = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top, rgba(0, 0, 0, 0.62), transparent 58%),
    radial-gradient(circle at 20% 15%, rgba(214, 182, 159, 0.16), transparent 32%);
`;

const Body = styled.div`
  padding: 1.15rem 1.15rem 1.25rem;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ClientInfo = styled.div`
  min-width: 0;
`;

const Name = styled.h3`
  margin: 0 0 0.25rem;
  color: ${theme.colors.ivory};
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: -0.02em;
`;

const Verified = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.58);
  font-size: 0.78rem;
  font-weight: 700;
`;

const Quote = styled.p`
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.6;
  color: rgba(255, 249, 242, 0.88);
`;

const Rating = styled.div`
  display: inline-flex;
  flex-shrink: 0;
  gap: 5px;
  align-items: center;
  padding: 0.45rem 0.62rem;
  border-radius: ${theme.radius.pill};
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${theme.shadow.soft};
`;

const Star = styled.i`
  color: ${theme.colors.lightBrown};
  font-size: 0.9rem;
  line-height: 1;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.28));
`;