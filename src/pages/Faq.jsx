// src/Pages/Faq.jsx
import React, { useState } from "react";
import styled from "styled-components";

/**
 * Luxurious FAQ
 * - Uses theme colors (darkBrown/brown/lightBrown/ivory/white/black/glass)
 * - Bold 1–3s hook headline
 * - Quick link groups (anchor pills) to jump to sections
 * - Clean accordion with smooth transitions
 * - Big-company feel: tidy layout, soft shadows, rounded corners, subtle glow
 */

const Page = styled.section`
  background: ${({ theme }) => theme.colors.darkBrown};
  min-height: 100vh;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Wrap = styled.div`
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  padding: 56px 20px 100px;
`;

const Hero = styled.header`
  text-align: center;
  margin-bottom: 28px;

  h1 {
    font-size: clamp(32px, 4.6vw, 64px);
    line-height: 1.05;
    letter-spacing: 0.5px;
    margin: 0 0 12px 0;
    /* 1–3s HOOK shimmer to catch attention, then settle */
    background: linear-gradient(
      120deg,
      ${({ theme }) => theme.colors.lightBrown},
      ${({ theme }) => theme.colors.white},
      ${({ theme }) => theme.colors.lightBrown}
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: hookShimmer 2.2s ease forwards;
  }

  p {
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.9;
    font-size: clamp(14px, 1.8vw, 18px);
    margin: 0 auto;
    max-width: 760px;
  }

  @keyframes hookShimmer {
    0% { filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
    20% { filter: drop-shadow(0 10px 30px rgba(0,0,0,0.25)); }
    100% { filter: drop-shadow(0 16px 40px rgba(45, 18, 8, 0.35)); }
  }
`;

const QuickLinks = styled.nav`
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 14px 0 0;
  margin: 28px 0 36px;
  background: linear-gradient(
    to bottom,
    ${({ theme }) => theme.colors.darkBrown} 70%,
    transparent
  );

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: ${({ theme }) => theme.colors.black};
    background: ${({ theme }) => theme.colors.lightBrown};
    border: 1px solid rgba(255,255,255,0.1);
    padding: 10px 14px;
    border-radius: ${({ theme }) => theme.radius.pill};
    box-shadow: ${({ theme }) => theme.shadow.soft};
    transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: ${({ theme }) => theme.shadow.hard};
      background: ${({ theme }) => theme.colors.white};
    }
  }
`;

const Section = styled.section`
  margin: 24px 0 32px;
`;

const SectionCard = styled.div`
  background: ${({ theme }) => theme.colors.brown};
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  overflow: hidden;
`;

const SectionHeader = styled.div`
  padding: 18px 20px;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.cocoa},
    ${({ theme }) => theme.colors.brown}
  );
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: clamp(18px, 2.2vw, 22px);
    color: ${({ theme }) => theme.colors.ivory};
    letter-spacing: 0.3px;
  }

  small {
    color: ${({ theme }) => theme.colors.lightBrown};
    opacity: 0.9;
  }
`;

const QAList = styled.div`
  display: grid;
  grid-template-columns: 1fr;
`;

const QAItem = styled.div`
  border-top: 1px solid rgba(255,255,255,0.06);

  &:first-child {
    border-top: none;
  }
`;

const QuestionBtn = styled.button`
  width: 100%;
  text-align: left;
  padding: 18px 20px;
  background: transparent;
  color: ${({ theme }) => theme.colors.white};
  font-size: 16px;
  line-height: 1.35;
  border: none;
  cursor: pointer;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;

  &:hover {
    background: ${({ theme }) => theme.colors.glass};
  }
`;

const Chevron = styled.span`
  display: inline-block;
  transition: transform 220ms ease;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
`;

const Answer = styled.div`
  max-height: ${({ $open }) => ($open ? "800px" : "0px")};
  overflow: hidden;
  transition: max-height 300ms ease;
  background: rgba(0,0,0,0.15);
  border-top: 1px solid rgba(255,255,255,0.06);

  > div {
    padding: ${({ $open }) => ($open ? "16px 20px 22px" : "0 20px")};
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.95;
  }

  a {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-decoration: underline;
  }

  ul, ol {
    margin: 8px 0 0 20px;
  }
`;

const FooterNote = styled.footer`
  margin-top: 40px;
  text-align: center;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.85;

  a {
    color: ${({ theme }) => theme.colors.lightBrown};
    text-decoration: underline;
  }
`;

const sections = [
  {
    id: "orders-shipping",
    title: "Orders & Shipping",
    items: [
      {
        q: "When will my order ship?",
        a: "We process orders within 1–2 business days. You’ll receive a confirmation email with tracking once it leaves our facility.",
      },
      {
        q: "Do you offer expedited shipping?",
        a: "Yes. At checkout, select an expedited option if available for your region. Prices and delivery windows appear automatically before you pay.",
      },
      {
        q: "Where do you ship?",
        a: "We currently ship domestically across the U.S. and to select international locations. If your address isn’t supported at checkout, contact support for a manual review.",
      },
      {
        q: "Can I change my address after ordering?",
        a: "If the order hasn’t shipped yet, we can help update the address. Reach out ASAP with your order number and the correct address.",
      },
    ],
  },
  {
    id: "payments-pricing",
    title: "Payments & Pricing",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We accept major cards (Visa, MasterCard, AmEx), Apple Pay/Google Pay (where supported), and secure checkout providers displayed during payment.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes. We use encrypted, PCI-compliant processors and never store full card details on our servers.",
      },
      {
        q: "Will I be charged sales tax?",
        a: "Applicable taxes are calculated at checkout based on your shipping address and local regulations.",
      },
      {
        q: "Do you run promotions or discounts?",
        a: "Occasionally. Join our newsletter to be the first to know about limited drops, early access, and exclusive pricing.",
      },
    ],
  },
  {
    id: "returns-refunds",
    title: "Returns & Refunds",
    items: [
      {
        q: "What’s your return policy?",
        a: "Unworn/unused items in original condition can be returned within 14 days of delivery. Certain items (e.g., digital products) may be final sale.",
      },
      {
        q: "How do I start a return?",
        a: "Contact support with your order number and reason for return. We’ll share a prepaid label if your return is eligible.",
      },
      {
        q: "When will I receive my refund?",
        a: "Once your return is received and inspected, refunds typically appear in 3–7 business days depending on your bank.",
      },
      {
        q: "Can I exchange an item?",
        a: "Yes—if the item/size is in stock. Let us know the preferred size or variant when you contact support.",
      },
    ],
  },
  {
    id: "products-sizing",
    title: "Products & Sizing",
    items: [
      {
        q: "How do I find my perfect size?",
        a: "Use the size guide on each product page. If you’re between sizes, we include fit notes to help you decide.",
      },
      {
        q: "Are product photos true to color?",
        a: "We aim for accurate color representation. Slight variations can occur due to screen settings and lighting.",
      },
      {
        q: "Will items restock?",
        a: "Core items restock regularly. Limited drops may not. Join the waitlist on the product page to be notified.",
      },
      {
        q: "How do I care for my item?",
        a: "Follow the care label inside your product. We also include care tips on product pages for convenience.",
      },
    ],
  },
  {
    id: "account-security",
    title: "Account & Security",
    items: [
      {
        q: "Do I need an account to order?",
        a: "No, guest checkout is available. Creating an account lets you track orders, save favorites, and manage returns faster.",
      },
      {
        q: "I forgot my password—what now?",
        a: "Use “Forgot password” on the login page to securely reset. If issues persist, contact support and we’ll verify and assist.",
      },
      {
        q: "How do you protect my data?",
        a: "We follow modern security practices, encrypt sensitive data, and limit access to authorized personnel only.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Submit a request from your account page or contact support. We’ll confirm and process your request.",
      },
    ],
  },
  {
    id: "coaching-courses",
    title: "Coaching & Courses",
    items: [
      {
        q: "How do 1-on-1 sessions work?",
        a: "Pick a slot, receive a confirmation with the call link, and meet at the scheduled time. You’ll get a post-session recap with action steps.",
      },
      {
        q: "Are courses self-paced?",
        a: "Yes—watch anytime. Some include live Q&A windows or community access; details appear on each course page.",
      },
      {
        q: "Do you offer certificates?",
        a: "Select programs include completion certificates. Check the course description for availability and requirements.",
      },
      {
        q: "Can I get a refund on a course?",
        a: "If you haven’t downloaded the materials or consumed a significant portion, you may be eligible within 7 days—see the course page for specifics.",
      },
    ],
  },
  {
    id: "support-contact",
    title: "Support & Contact",
    items: [
      {
        q: "How can I reach support?",
        a: "Email us or use the contact form. Include your order number (if applicable) for faster assistance.",
      },
      {
        q: "What are your response times?",
        a: "Typically within 24 business hours. During launches or holidays, replies may take a bit longer.",
      },
      {
        q: "Do you have a live chat?",
        a: "Live chat is available during business hours on select pages. If we’re offline, leave a message and we’ll email you back.",
      },
      {
        q: "Accessibility & feedback",
        a: "We’re committed to accessibility. If you encounter any barriers, please let us know—we take it seriously and will act quickly.",
      },
    ],
  },
];

export default function Faq() {
  const [openKey, setOpenKey] = useState(null);

  const toggle = (key) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <Page className="Faq">
      <Wrap>
        <Hero>
          <h1>FAQ — QUICK ANSWERS. LUX FEEL. ZERO FUSS.</h1>
          <p>
            The questions real people ask—answered clearly. Browse by category below, dive into details, and get back to building your momentum.
          </p>
        </Hero>

        {/* Groups of Links (Quick Section Jumps) */}
        <QuickLinks aria-label="Quick links to FAQ sections">
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} title={`Jump to ${s.title}`}>#{s.title}</a>
              </li>
            ))}
          </ul>
        </QuickLinks>

        {/* Sections */}
        {sections.map((section) => (
          <Section id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
            <SectionCard>
              <SectionHeader>
                <h2 id={`${section.id}-title`}>{section.title}</h2>
                <small>{section.items.length} Q&As</small>
              </SectionHeader>

              <QAList>
                {section.items.map((item, idx) => {
                  const key = `${section.id}-${idx}`;
                  const isOpen = openKey === key;
                  return (
                    <QAItem key={key}>
                      <QuestionBtn
                        aria-expanded={isOpen}
                        aria-controls={`${key}-answer`}
                        onClick={() => toggle(key)}
                      >
                        <span>{item.q}</span>
                        <Chevron $open={isOpen}>▾</Chevron>
                      </QuestionBtn>

                      <Answer id={`${key}-answer`} $open={isOpen}>
                        <div>{item.a}</div>
                      </Answer>
                    </QAItem>
                  );
                })}
              </QAList>
            </SectionCard>
          </Section>
        ))}

        <FooterNote>
          Didn’t find what you need? Reach out—our team is happy to help.
        </FooterNote>
      </Wrap>
    </Page>
  );
}
