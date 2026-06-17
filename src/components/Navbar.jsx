// src/components/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useAuth } from "../context/AuthContext";

/* ===== Animations ===== */
const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isAdmin, logout } = useAuth();

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  const handleLogout = () => {
    closeMenu();
    logout();
  };

  const profileHref = isAdmin ? "/admin/profile" : "/user-profile";
  const dashboardHref = isAdmin ? "/admin/dashboard" : "/user-dashboard";

  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Dashboard";
  const profileLabel = isAdmin ? "Admin Profile" : "My Profile";

  return (
    <>
      <Bar>
        <div className="container">
          <Inner>
            <Brand to="/" aria-label="Home">
              <LogoBadge>🥊</LogoBadge>

              <BrandText>
                <BrandTitle>KnockoutCodes</BrandTitle>
                <BrandSub>Train. Build. Dominate.</BrandSub>
              </BrandText>
            </Brand>

            <DesktopNav>
              <NavLink to="/contact">Contact</NavLink>
              <NavLink to="/faq">FAQ</NavLink>

              {isAuthenticated ? (
                <>
                  <NavLink to={dashboardHref}>{dashboardLabel}</NavLink>
                  <NavLink to={profileHref}>{profileLabel}</NavLink>

                  <LogoutButton type="button" onClick={handleLogout}>
                    Logout
                  </LogoutButton>
                </>
              ) : (
                <CtaLink to="/login">Login</CtaLink>
              )}
            </DesktopNav>

            <MenuButton
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              data-open={open}
              type="button"
            >
              <span className="bar" />
            </MenuButton>
          </Inner>
        </div>
      </Bar>

      {open && (
        <>
          <Overlay onClick={closeMenu} />

          <Drawer role="dialog" aria-modal="true" aria-label="Navigation Menu">
            <DrawerGlow />

            <DrawerHeader>
              <DrawerBrand>
                <LogoBadge>🥊</LogoBadge>

                <div>
                  <DrawerTitle>KnockoutCodes</DrawerTitle>
                  <DrawerSub>Premium Member Navigation</DrawerSub>
                </div>
              </DrawerBrand>

              <MenuButton
                aria-label="Close menu"
                data-open={true}
                onClick={closeMenu}
                type="button"
              >
                <span className="bar" />
              </MenuButton>
            </DrawerHeader>

            <DrawerLinks onClick={closeMenu}>
              <DrawerLink to="/contact">🥊 Contact</DrawerLink>
              <DrawerLink to="/faq">❓ FAQ</DrawerLink>

              {isAuthenticated ? (
                <>
                  <DrawerLink to={dashboardHref}>
                    📊 {dashboardLabel}
                  </DrawerLink>
                  <DrawerLink to={profileHref}>👤 {profileLabel}</DrawerLink>

                  <DrawerLogoutButton type="button" onClick={handleLogout}>
                    🔐 Logout
                  </DrawerLogoutButton>
                </>
              ) : (
                <DrawerLink to="/login">🔐 Login</DrawerLink>
              )}
            </DrawerLinks>

            <DrawerFooter>
              <FooterLine />
              <FooterText>
                Built for fighters, creators, and winners.
              </FooterText>
            </DrawerFooter>
          </Drawer>
        </>
      )}
    </>
  );
}

/* =========================
   Styles
========================= */

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 80;
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  backdrop-filter: blur(18px);

  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.18),
      transparent 30%
    ),
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.96) 0%,
      ${({ theme }) => theme.colors.darkBrown} 42%,
      rgba(0, 0, 0, 0.96) 100%
    );

  border-bottom: 1px solid rgba(214, 182, 159, 0.22);
  box-shadow:
    0 18px 45px rgba(0, 0, 0, 0.34),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04);
`;

const Inner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 76px;
  gap: 0.9rem;
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.72rem;
  min-width: 0;
  color: inherit;
  text-decoration: none;
`;

const LogoBadge = styled.span`
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  font-size: 1.25rem;

  background: radial-gradient(
    circle at 30% 0%,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.brown} 52%,
    ${({ theme }) => theme.colors.darkBrown}
  );

  border: 1px solid rgba(214, 182, 159, 0.42);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.35),
    0 0 0 4px rgba(214, 182, 159, 0.08);
`;

const BrandText = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;

const BrandTitle = styled.span`
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: clamp(0.95rem, 1.5vw, 1.16rem);
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BrandSub = styled.span`
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.62);

  @media (max-width: 520px) {
    display: none;
  }
`;

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.58rem;

  @media (max-width: 920px) {
    display: none;
  }
`;

const NavLink = styled(Link)`
  position: relative;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.76rem 0.95rem;
  border-radius: 999px;
  text-decoration: none;
  color: rgba(255, 249, 242, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.025);
  transition: 0.22s ease;

  &:hover {
    transform: translateY(-2px);
    color: ${({ theme }) => theme.colors.ivory};
    border-color: rgba(214, 182, 159, 0.55);
    background: radial-gradient(
      circle at top,
      rgba(214, 182, 159, 0.22),
      rgba(0, 0, 0, 0.22)
    );
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
  }
`;

const CtaLink = styled(NavLink)`
  color: ${({ theme }) => theme.colors.black};
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  border-color: rgba(214, 182, 159, 0.78);

  &:hover {
    color: ${({ theme }) => theme.colors.black};
  }
`;

const LogoutButton = styled.button`
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.76rem 0.95rem;
  border-radius: 999px;
  color: rgba(255, 249, 242, 0.86);
  border: 1px solid rgba(214, 182, 159, 0.34);
  background: transparent;
  cursor: pointer;
  transition: 0.22s ease;

  &:hover {
    transform: translateY(-2px);
    color: ${({ theme }) => theme.colors.ivory};
    background: rgba(214, 182, 159, 0.12);
    border-color: rgba(214, 182, 159, 0.7);
  }
`;

const MenuButton = styled.button`
  display: none;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  flex-shrink: 0;
  z-index: 100;
  cursor: pointer;

  border: 1px solid rgba(214, 182, 159, 0.32);
  background: rgba(255, 255, 255, 0.055);
  transition: 0.22s ease;

  @media (max-width: 920px) {
    display: inline-grid;
  }

  &:hover {
    background: rgba(214, 182, 159, 0.13);
    border-color: rgba(214, 182, 159, 0.64);
  }

  .bar,
  .bar::before,
  .bar::after {
    background: ${({ theme }) => theme.colors.ivory};
  }

  .bar {
    position: relative;
    width: 20px;
    height: 2px;
    border-radius: 2px;
    transition: 0.2s ease;
  }

  .bar::before,
  .bar::after {
    content: "";
    position: absolute;
    left: 0;
    width: 20px;
    height: 2px;
    border-radius: 2px;
    transition: 0.2s ease;
  }

  .bar::before {
    top: -6px;
  }

  .bar::after {
    top: 6px;
  }

  &[data-open="true"] .bar {
    background: transparent;
  }

  &[data-open="true"] .bar::before {
    top: 0;
    transform: rotate(45deg);
  }

  &[data-open="true"] .bar::after {
    top: 0;
    transform: rotate(-45deg);
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
  background:
    radial-gradient(
      circle at top right,
      rgba(214, 182, 159, 0.15),
      transparent 34%
    ),
    rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  animation: ${fadeIn} 0.2s ease both;
`;

const Drawer = styled.aside`
  position: fixed;
  inset: 0 0 0 auto;
  width: min(88vw, 420px);
  z-index: 9999;
  overflow: hidden;

  background: linear-gradient(
    145deg,
    rgba(0, 0, 0, 0.98) 0%,
    ${({ theme }) => theme.colors.darkBrown} 38%,
    ${({ theme }) => theme.colors.brown} 78%,
    rgba(0, 0, 0, 0.98) 100%
  );

  border-left: 1px solid rgba(214, 182, 159, 0.3);
  box-shadow:
    -30px 0 70px rgba(0, 0, 0, 0.6),
    inset 1px 0 0 rgba(255, 255, 255, 0.06);

  animation: ${slideIn} 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
  display: grid;
  grid-template-rows: auto 1fr auto;
`;

const DrawerGlow = styled.div`
  position: absolute;
  top: -90px;
  right: -80px;
  width: 230px;
  height: 230px;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.18);
  filter: blur(34px);
  pointer-events: none;
`;

const DrawerHeader = styled.div`
  position: relative;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(214, 182, 159, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
`;

const DrawerBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const DrawerTitle = styled.div`
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
`;

const DrawerSub = styled.div`
  margin-top: 3px;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.62);
`;

const DrawerLinks = styled.nav`
  position: relative;
  padding: 20px 14px 14px;
  display: grid;
  gap: 11px;
  align-content: start;
`;

const DrawerLink = styled(Link)`
  font-size: clamp(1rem, 4.5vw, 1.18rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 15px 14px;
  border-radius: 18px;
  border: 1px solid rgba(214, 182, 159, 0.16);
  background: rgba(0, 0, 0, 0.28);
  text-decoration: none;
  color: rgba(255, 249, 242, 0.88);
  transition: 0.22s ease;

  &:hover {
    transform: translateX(-3px);
    background: linear-gradient(
      135deg,
      rgba(214, 182, 159, 0.24),
      rgba(0, 0, 0, 0.3)
    );
    border-color: rgba(214, 182, 159, 0.66);
    color: ${({ theme }) => theme.colors.ivory};
  }
`;

const DrawerLogoutButton = styled.button`
  text-align: left;
  font-size: clamp(1rem, 4.5vw, 1.18rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 15px 14px;
  border-radius: 18px;
  border: 1px solid rgba(214, 182, 159, 0.22);
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 249, 242, 0.88);
  cursor: pointer;
  transition: 0.22s ease;

  &:hover {
    transform: translateX(-3px);
    background: rgba(214, 182, 159, 0.14);
    border-color: rgba(214, 182, 159, 0.68);
    color: ${({ theme }) => theme.colors.ivory};
  }
`;

const DrawerFooter = styled.div`
  position: relative;
  padding: 16px 14px 20px;
  border-top: 1px solid rgba(214, 182, 159, 0.15);
`;

const FooterLine = styled.div`
  width: 80px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(214, 182, 159, 1),
    rgba(214, 182, 159, 0.1)
  );
  margin-bottom: 12px;
`;

const FooterText = styled.p`
  margin: 0;
  color: rgba(255, 249, 242, 0.66);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;
