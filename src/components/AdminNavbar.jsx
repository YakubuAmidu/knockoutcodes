// src/components/AdminNavbar.jsx
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";

const userLinks = [
  { label: "Home", to: "/home" },
  { label: "Courses", to: "/courses" },
  { label: "E-Books", to: "/ebooks" },
  { label: "Train Online", to: "/coachings" },
  { label: "Contact", to: "/contact" },
];

const adminLinks = [
  { label: "Admin Dashboard", to: "/admin/dashboard" },
  { label: "Admin Profile", to: "/admin/profile" },
  { label: "Email Campaigns", to: "/admin/email-campaigns" },
];

const adminSidebarLinks = [
  { label: "Admin Dashboard", to: "/admin/dashboard" },
  { label: "Admin Profile", to: "/admin/profile" },
  { label: "Manage Users", to: "/admin/users" },
  { label: "Manage Orders", to: "/admin/orders" },
  { label: "Manage Contacts", to: "/admin/contacts" },
  { label: "Manage Newsletters", to: "/admin/newsletters" },
  { label: "Manage Courses", to: "/admin/courses" },
  { label: "Manage Blogs", to: "/admin/blogs" },
  { label: "Manage Products", to: "/admin/products" },
  { label: "Manage Coaching", to: "/admin/coachings" },
  { label: "Email Campaigns", to: "/admin/email-campaigns" },
  { label: "Email Segments", to: "/admin/email-segments" },
  { label: "Email Subscribers", to: "/admin/email-subscribers" },
  { label: "Email Templates", to: "/admin/email-templates" },
  { label: "Email Analytics", to: "/admin/email-analytics" },
  { label: "Manage Lessons", to: "/admin/lessons" },
  { label: "Maintenance", to: "/admin/maintenance" },
  { label: "Security Events", to: "/admin/security-events" },
  { label: "Manage Sessions", to: "/admin/sessions" },
];

const MotionLink = motion.create(Link);

const AdminNavbar = ({ currentUser, onLogout }) => {
  const location = useLocation();
  const isAdmin = currentUser?.role === "admin";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const links = useMemo(() => (isAdmin ? adminLinks : userLinks), [isAdmin]);
  const sidebarLinks = useMemo(
    () => (isAdmin ? adminSidebarLinks : userLinks),
    [isAdmin]
  );

  const initials = useMemo(() => {
    if (!currentUser?.name) return "KC";
    return currentUser.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [currentUser]);

  const handleNavClick = () => setIsMenuOpen(false);

  const handleLogoutClick = () => {
    setIsMenuOpen(false);
    if (onLogout) onLogout();
  };

  return (
    <Bar
      as={motion.nav}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Inner>
        <BrandWrapper>
          <Brand to="/home" onClick={handleNavClick}>
            <LogoMark>KC</LogoMark>

            <BrandText>
              <BrandTitle>KNOCKOUTCODES</BrandTitle>
              <BrandSub>
                <span>Pro Boxing Academy</span>
                {isAdmin && <AdminBadge>ADMIN</AdminBadge>}
              </BrandSub>
            </BrandText>
          </Brand>
        </BrandWrapper>

        <NavLinks>
          {links.map((link) => {
            const active = location.pathname === link.to;

            return (
              <NavItem
                key={link.to}
                to={link.to}
                $active={active ? 1 : 0}
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                {link.label}
                {active && <ActiveGlow layoutId="nav-glow" />}
              </NavItem>
            );
          })}
        </NavLinks>

        <RightSide>
          <ProfileArea>
            <AvatarCircle>{initials}</AvatarCircle>

            <ProfileMeta>
              <ProfileName>{currentUser?.name || "Guest Fighter"}</ProfileName>
              <ProfileRole>{isAdmin ? "Admin Coach" : "Athlete"}</ProfileRole>
            </ProfileMeta>

            {onLogout ? (
              <LogoutButton type="button" onClick={onLogout}>
                Logout
              </LogoutButton>
            ) : (
              <ProfileButton to={isAdmin ? "/admin/dashboard" : "/user-profile"}>
                {isAdmin ? "Admin" : "Profile"}
              </ProfileButton>
            )}
          </ProfileArea>

          <MenuButton
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            <MenuIcon $open={isMenuOpen}>
              <span />
              <span />
              <span />
            </MenuIcon>
          </MenuButton>
        </RightSide>
      </Inner>

      <AnimatePresence>
        {isMenuOpen && (
          <SidebarOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <SidebarPanel
              as={motion.aside}
              initial={{ x: 280 }}
              animate={{ x: 0 }}
              exit={{ x: 280 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarHeader>
                <SidebarAvatar>{initials}</SidebarAvatar>

                <SidebarMeta>
                  <SidebarName>{currentUser?.name || "Guest Fighter"}</SidebarName>
                  <SidebarRole>{isAdmin ? "Admin Coach" : "Athlete"}</SidebarRole>
                </SidebarMeta>
              </SidebarHeader>

              <SidebarNav>
                {sidebarLinks.map((link) => {
                  const active = location.pathname === link.to;

                  return (
                    <SidebarNavItem
                      key={link.to}
                      to={link.to}
                      $active={active ? 1 : 0}
                      onClick={handleNavClick}
                    >
                      {link.label}
                    </SidebarNavItem>
                  );
                })}
              </SidebarNav>

              <SidebarFooter>
                {onLogout ? (
                  <SidebarLogoutButton type="button" onClick={handleLogoutClick}>
                    Logout
                  </SidebarLogoutButton>
                ) : (
                  <SidebarProfileLink
                    to={isAdmin ? "/admin/dashboard" : "/user-profile"}
                    onClick={handleNavClick}
                  >
                    {isAdmin ? "Admin Dashboard" : "Profile"}
                  </SidebarProfileLink>
                )}
              </SidebarFooter>
            </SidebarPanel>
          </SidebarOverlay>
        )}
      </AnimatePresence>
    </Bar>
  );
};

export default AdminNavbar;

/* =========================
   STYLES
========================= */

const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  max-width: 100vw;
  overflow-x: clip;
  backdrop-filter: blur(18px);
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.black} 0%,
    ${({ theme }) => theme.colors.cocoa} 40%,
    rgba(0, 0, 0, 0.9) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Inner = styled.div`
  width: min(100%, ${({ theme }) => theme.layout.max});
  margin: 0 auto;
  padding: 12px clamp(12px, 2vw, 24px);
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.4vw, 18px);
  min-width: 0;

  @media (max-width: 640px) {
    padding: 10px 12px;
  }

  @media (max-width: 380px) {
    padding: 9px 10px;
    gap: 8px;
  }
`;

const BrandWrapper = styled.div`
  flex: 0 1 auto;
  min-width: 0;
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  text-decoration: none;

  @media (max-width: 420px) {
    gap: 8px;
  }
`;

const LogoMark = styled.div`
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: radial-gradient(
    circle at 30% 0%,
    ${({ theme }) => theme.colors.lightBrown} 0%,
    ${({ theme }) => theme.colors.brown} 48%,
    ${({ theme }) => theme.colors.darkBrown} 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 800;
  font-size: 15px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  @media (max-width: 380px) {
    width: 31px;
    height: 31px;
    flex-basis: 31px;
    font-size: 13px;
  }
`;

const BrandText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const BrandTitle = styled.div`
  font-size: clamp(11px, 1.2vw, 14px);
  font-weight: 700;
  letter-spacing: clamp(0.12em, 0.9vw, 0.22em);
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;

  @media (max-width: 520px) {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 380px) {
    max-width: 122px;
  }
`;

const BrandSub = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.7);

  span:first-child {
    white-space: nowrap;
  }

  @media (max-width: 700px) {
    span:first-child {
      display: none;
    }
  }
`;

const AdminBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.4);
  background: linear-gradient(
    135deg,
    rgba(214, 182, 159, 0.22),
    rgba(61, 38, 26, 0.9)
  );
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
`;

const NavLinks = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  justify-content: center;
  gap: clamp(5px, 0.7vw, 8px);

  @media (max-width: 1120px) {
    display: none;
  }
`;

const NavItem = styled(MotionLink)`
  position: relative;
  padding: 8px clamp(10px, 1vw, 14px);
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.ivory : "rgba(255,255,255,0.72)"};
  background: ${({ $active }) =>
    $active ? "rgba(214,182,159,0.13)" : "transparent"};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214,182,159,0.6)" : "rgba(255,255,255,0.06)"};
  overflow: hidden;
  white-space: nowrap;

  &:hover {
    border-color: rgba(214, 182, 159, 0.6);
    background: radial-gradient(
      circle at top,
      rgba(214, 182, 159, 0.2),
      rgba(0, 0, 0, 0.4)
    );
  }
`;

const ActiveGlow = styled(motion.div)`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.65),
    0 0 40px rgba(214, 182, 159, 0.36);
  pointer-events: none;
`;

const RightSide = styled.div`
  flex: 0 0 auto;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 14px);
  min-width: 0;
`;

const ProfileArea = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  @media (max-width: 1120px) {
    display: none;
  }
`;

const AvatarCircle = styled.div`
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: radial-gradient(
    circle at 30% 0,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.darkBrown}
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.ivory};
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const ProfileMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 130px;
  min-width: 0;
`;

const ProfileName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProfileRole = styled.div`
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.7);
  white-space: nowrap;
`;

const BaseButton = styled(Link)`
  text-decoration: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 7px 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(214, 182, 159, 0.5);
  background: radial-gradient(
    circle at top left,
    rgba(214, 182, 159, 0.35),
    rgba(45, 27, 18, 0.95)
  );
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadow.soft};
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.hard};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }
`;

const ProfileButton = styled(BaseButton)`
  min-width: 74px;
`;

const LogoutButton = styled.button`
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 7px 12px;
  border: 1px solid rgba(214, 182, 159, 0.4);
  background: transparent;
  color: rgba(255, 249, 242, 0.9);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(214, 182, 159, 0.08);
  }
`;

const MenuButton = styled.button`
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(214, 182, 159, 0.28);
  background: rgba(255, 255, 255, 0.045);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(214, 182, 159, 0.12);
    border-color: rgba(214, 182, 159, 0.55);
  }

  @media (max-width: 380px) {
    width: 38px;
    height: 38px;
    flex-basis: 38px;
  }
`;

const MenuIcon = styled.div`
  width: 22px;
  height: 18px;
  position: relative;

  span {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.ivory};
    transition: transform 0.2s ease, opacity 0.2s ease, top 0.2s ease,
      bottom 0.2s ease;
  }

  span:nth-child(1) {
    top: ${({ $open }) => ($open ? "8px" : "0px")};
    transform-origin: center;
    transform: ${({ $open }) => ($open ? "rotate(45deg)" : "none")};
  }

  span:nth-child(2) {
    top: 8px;
    opacity: ${({ $open }) => ($open ? 0 : 1)};
  }

  span:nth-child(3) {
    bottom: ${({ $open }) => ($open ? "8px" : "0px")};
    transform-origin: center;
    transform: ${({ $open }) => ($open ? "rotate(-45deg)" : "none")};
  }
`;

const SidebarOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.64);
  display: flex;
  justify-content: flex-end;
`;

const SidebarPanel = styled.div`
  width: min(320px, 88vw);
  height: 100dvh;
  background: ${({ theme }) =>
    `linear-gradient(145deg, ${theme.colors.black} 0%, ${theme.colors.cocoa} 40%, rgba(0,0,0,0.96) 100%)`};
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
  padding: 20px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;

  @media (max-width: 420px) {
    width: min(300px, 92vw);
    padding: 18px 14px 16px;
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const SidebarAvatar = styled(AvatarCircle)`
  width: 34px;
  height: 34px;
  flex-basis: 34px;
`;

const SidebarMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const SidebarName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SidebarRole = styled.span`
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.7);
  white-space: nowrap;
`;

const SidebarNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 6px;
`;

const SidebarNavItem = styled(Link)`
  width: 100%;
  padding: 9px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.11em;
  line-height: 1.25;
  text-transform: uppercase;
  text-decoration: none;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.ivory : "rgba(255,255,255,0.78)"};
  background: ${({ $active }) =>
    $active ? "rgba(214,182,159,0.16)" : "rgba(16, 9, 6, 0.96)"};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214,182,159,0.6)" : "rgba(255,255,255,0.12)"};
  overflow-wrap: anywhere;

  &:hover {
    background: rgba(214, 182, 159, 0.2);
    border-color: rgba(214, 182, 159, 0.7);
  }
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SidebarLogoutButton = styled.button`
  width: 100%;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 9px 12px;
  border: 1px solid rgba(214, 182, 159, 0.6);
  background: transparent;
  color: rgba(255, 249, 242, 0.95);
  cursor: pointer;

  &:hover {
    background: rgba(214, 182, 159, 0.12);
  }
`;

const SidebarProfileLink = styled(BaseButton)`
  width: 100%;
  justify-content: center;
`;