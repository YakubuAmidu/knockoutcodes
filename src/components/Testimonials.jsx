// src/pages/Testimonials.jsx
import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled, { keyframes, css } from "styled-components";
import TestimonialForm from "./TestimonialForm";
import theme from "../Styles/theme";
import { fetchTestimonials } from "../reducers/testimonial/testimonialActions";

const API_ORIGIN =
  String(import.meta.env.VITE_API_BASE_URL || "")
    .trim()
    .replace(/\/api\/v1\/?$/, "") || "https://knockoutcodes.onrender.com";

function getImageUrl(value) {
  const img = String(value || "").trim();

  if (!img) return "";

  if (img.startsWith("http://") || img.startsWith("https://")) return img;

  if (img.startsWith("/uploads") || img.startsWith("uploads/")) {
    return `${API_ORIGIN}/${img.replace(/^\/+/, "")}`;
  }

  return "";
}

function getInitials(name = "KC") {
  return String(name)
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(date) {
  if (!date) return "Recently shared";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const fallbackTestimonials = [
  {
    id: "fallback-1",
    name: "KnockoutCodes Student",
    comment:
      "Week one with Coach, my jab got sharper, my confidence changed, and the drills finally made boxing feel simple.",
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

  const { user } = useSelector((state) => state.auth || {});

  useEffect(() => {
    dispatch(fetchTestimonials());
  }, [dispatch]);

  const displayItems = useMemo(() => {
  const list = testimonials?.length ? testimonials : fallbackTestimonials;

  return list.map((t, index) => {
    const userData =
      typeof t.user === "object" && t.user !== null
        ? t.user
        : typeof t.createdBy === "object" && t.createdBy !== null
        ? t.createdBy
        : typeof t.postedBy === "object" && t.postedBy !== null
        ? t.postedBy
        : {};

    const firstLastName = `${userData.firstName || ""} ${
      userData.lastName || ""
    }`.trim();

    const name =
  String(
    t.name ||
      t.fullName ||
      t.username ||
      t.clientName ||
      t.customerName ||
      t.displayName ||
      userData.name ||
      userData.fullName ||
      userData.username ||
      userData.displayName ||
      firstLastName ||
      userData.email?.split("@")[0] ||
      ""
  ).trim() || "Verified Member";

    return {
      id: t._id || t.id || `testimonial-${index}`,
      name,
      initials: getInitials(name),
      imageUrl: getImageUrl(
        t.imageUrl ||
          t.image ||
          t.photo ||
          t.avatar ||
          t.profileImage ||
          userData.image ||
          userData.photo ||
          userData.avatar ||
          userData.profileImage
      ),
      comment: String(t.comment || t.message || t.review || "").trim(),
      rating: Math.max(1, Math.min(5, Number(t.rating ?? 5))),
      createdAt: t.createdAt || t.updatedAt || null,
    };
  });
}, [testimonials]);

  const hasLoop = displayItems.length > 1;

  return (
    <Page>
      <LuxuryGlowOne />
      <LuxuryGlowTwo />

      <Wrap>
        <Header>
          <Badge>REAL RESULTS • VERIFIED VOICES • 5 STAR ENERGY</Badge>

          <Hook>
            Proof hits harder
            <span>when real people say it.</span>
          </Hook>

          <Sub>
            See what students, fighters, and customers are saying about
            KnockoutCodes training, courses, and results.
          </Sub>
        </Header>

        {user ? (
          <FormShell>
            <TestimonialForm onSubmitted={() => dispatch(fetchTestimonials())} />
          </FormShell>
        ) : (
          <LoginPrompt>
            <span>MEMBERS ONLY</span>
            <h2>Your result deserves a premium spotlight.</h2>
            <p>
              Login to share your testimonial. Once approved by admin, your story
              can appear on the public KnockoutCodes wall.
            </p>
            <a href="/login">Login to Share Your Result</a>
          </LoginPrompt>
        )}

        {loading && <Status>Loading premium testimonials...</Status>}
        {error && <Status>{error}</Status>}

        <RailMask aria-label="Testimonials">
          <Belt $animate={hasLoop}>
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
      <ImageArea>
        {testimonial.imageUrl ? (
          <Img
            src={testimonial.imageUrl}
            alt={`${testimonial.name} testimonial`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <InitialAvatar>{testimonial.initials}</InitialAvatar>
        )}

        <ImageShade />
        <DateBadge>{formatDate(testimonial.createdAt)}</DateBadge>
      </ImageArea>

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

        <Quote>“{testimonial.comment || "Powerful results. Real discipline. Real progress."}”</Quote>

        <FooterRow>
          <SmallBadge>Premium Review</SmallBadge>
          <Score>{testimonial.rating}.0 / 5</Score>
        </FooterRow>
      </Body>
    </Card>
  );
}

const scrollLeft = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const Page = styled.section`
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: ${theme.colors.white};
  padding: 7rem 2rem;
  background:
    radial-gradient(circle at 18% 10%, rgba(214, 182, 159, 0.24), transparent 34%),
    radial-gradient(circle at 86% 18%, rgba(255, 249, 242, 0.12), transparent 28%),
    linear-gradient(135deg, ${theme.colors.black} 0%, ${theme.colors.darkBrown} 55%, ${theme.colors.black} 100%);
`;

const LuxuryGlowOne = styled.div`
  position: absolute;
  top: -160px;
  left: -140px;
  width: 430px;
  height: 430px;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.17);
  filter: blur(90px);
`;

const LuxuryGlowTwo = styled.div`
  position: absolute;
  right: -160px;
  bottom: -180px;
  width: 540px;
  height: 540px;
  border-radius: 999px;
  background: rgba(90, 56, 37, 0.45);
  filter: blur(100px);
`;

const Wrap = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: ${theme.layout.max};
  margin: 0 auto;
`;

const Header = styled.div`
  max-width: 980px;
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
  margin: 0;
  font-size: clamp(2.4rem, 6vw, 5.6rem);
  line-height: 0.92;
  letter-spacing: -0.065em;
  color: ${theme.colors.ivory};
  font-weight: 950;
  text-shadow: 0 26px 70px rgba(0, 0, 0, 0.52);

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

const FormShell = styled.div`
  margin-bottom: 2.5rem;
`;

const Status = styled.p`
  margin: 0 0 1rem;
  color: ${theme.colors.lightBrown};
  font-weight: 800;
`;

const RailMask = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${theme.radius.xl};
  padding: 1rem 0;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 7%,
    black 93%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    black 7%,
    black 93%,
    transparent 100%
  );

  &:hover > div {
    animation-play-state: paused;
  }
`;

const Belt = styled.div`
  display: flex;
  gap: 1.2rem;
  width: max-content;
  will-change: transform;

  ${({ $animate }) =>
    $animate
      ? css`
          animation: ${scrollLeft} 44s linear infinite;
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
  flex: 0 0 clamp(290px, 31vw, 405px);
  overflow: hidden;
  border-radius: ${theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(255, 249, 242, 0.12), rgba(255, 255, 255, 0.035)),
    ${theme.colors.cocoa};
  color: ${theme.colors.ivory};
  border: 1px solid rgba(255, 255, 255, 0.11);
  box-shadow: ${theme.shadow.glow};
  transform: translateZ(0);
  transition: 500ms ease;

  &:hover {
    transform: translateY(-10px) scale(1.015);
    border-color: rgba(214, 182, 159, 0.5);
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.5),
      inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
`;

const ImageArea = styled.div`
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 20%, rgba(214, 182, 159, 0.28), transparent 36%),
    linear-gradient(135deg, ${theme.colors.black}, ${theme.colors.darkBrown});
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.88) contrast(1.08);
  transform: scale(1.04);
  transition: 700ms ease;

  ${Card}:hover & {
    transform: scale(1.1);
  }
`;

const InitialAvatar = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: ${theme.colors.black};
  background:
    radial-gradient(circle at 35% 20%, rgba(255, 255, 255, 0.78), transparent 26%),
    linear-gradient(135deg, ${theme.colors.lightBrown}, ${theme.colors.ivory});
  font-size: clamp(3rem, 7vw, 5rem);
  font-weight: 950;
  letter-spacing: -0.08em;
`;

const ImageShade = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top, rgba(0, 0, 0, 0.68), transparent 58%),
    radial-gradient(circle at 20% 15%, rgba(214, 182, 159, 0.16), transparent 32%);
  pointer-events: none;
`;

const DateBadge = styled.span`
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  z-index: 2;
  padding: 0.45rem 0.7rem;
  border-radius: ${theme.radius.pill};
  background: rgba(0, 0, 0, 0.54);
  border: 1px solid rgba(255, 255, 255, 0.13);
  color: ${theme.colors.ivory};
  font-size: 0.72rem;
  font-weight: 850;
  backdrop-filter: blur(12px);
`;

const Body = styled.div`
  padding: 1.2rem;
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
  font-size: 1.08rem;
  font-weight: 950;
  letter-spacing: -0.025em;
`;

const Verified = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.58);
  font-size: 0.78rem;
  font-weight: 750;
`;

const Rating = styled.div`
  display: inline-flex;
  flex-shrink: 0;
  gap: 5px;
  align-items: center;
  padding: 0.46rem 0.62rem;
  border-radius: ${theme.radius.pill};
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Star = styled.i`
  color: ${theme.colors.lightBrown};
  font-size: 0.9rem;
  line-height: 1;
`;

const Quote = styled.p`
  min-height: 96px;
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.65;
  color: rgba(255, 249, 242, 0.88);
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1.15rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SmallBadge = styled.span`
  color: ${theme.colors.lightBrown};
  font-size: 0.73rem;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Score = styled.span`
  color: ${theme.colors.ivory};
  font-size: 0.82rem;
  font-weight: 900;
`;

const LoginPrompt = styled.div`
  margin: 0 0 2.5rem;
  padding: 1.6rem;
  border-radius: ${theme.radius.xl};
  background:
    linear-gradient(145deg, rgba(255, 249, 242, 0.11), rgba(255, 255, 255, 0.025)),
    rgba(0, 0, 0, 0.48);
  border: 1px solid rgba(214, 182, 159, 0.24);
  box-shadow: ${theme.shadow.glow};

  span {
    color: ${theme.colors.lightBrown};
    font-size: 0.75rem;
    font-weight: 900;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 0.55rem 0;
    color: ${theme.colors.ivory};
    font-size: clamp(1.5rem, 3vw, 2.4rem);
    line-height: 1;
  }

  p {
    max-width: 720px;
    margin: 0 0 1.2rem;
    color: rgba(255, 249, 242, 0.72);
    line-height: 1.7;
  }

  a {
    display: inline-flex;
    width: fit-content;
    text-decoration: none;
    border-radius: ${theme.radius.pill};
    padding: 0.95rem 1.25rem;
    background: ${theme.colors.lightBrown};
    color: ${theme.colors.black};
    font-weight: 950;
    transition: 250ms ease;
  }

  a:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 45px rgba(214, 182, 159, 0.22);
  }
`;