import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { useToast } from "../components/Toast";

const userLinks = [
  { label: "Dashboard", to: "/user-dashboard" },
  { label: "My Profile", to: "/user-profile" },
];

const UserNavbar = ({ currentUser, onLogout }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { showToast } = useToast();

  const notificationsCount = useSelector(
    (state) => state?.userDashboard?.stats?.notificationsCount || 0
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
    showToast("Logged out successfully", "success");
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
          <Brand to="/home" aria-label="Home">
            <LogoMark>KC</LogoMark>

            <BrandText>
              <BrandTitle>KNOCKOUTCODES</BrandTitle>
              <BrandSub>
                <span>Member Area</span>

                {!!notificationsCount && (
                  <Badge title="Unread notifications">
                    {notificationsCount > 99 ? "99+" : notificationsCount}
                  </Badge>
                )}
              </BrandSub>
            </BrandText>
          </Brand>
        </BrandWrapper>

        <NavLinks>
          {userLinks.map((link) => {
            const active = location.pathname === link.to;
            const isNotifLink = link.to === "/user-dashboard";

            return (
              <NavItem
                key={link.to}
                to={link.to}
                $active={active ? 1 : 0}
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18 }}
                onClick={handleNavClick}
              >
                {link.label}
                {isNotifLink && notificationsCount > 0 && <Dot />}
                {active && <ActiveGlow layoutId="user-nav-glow" />}
              </NavItem>
            );
          })}
        </NavLinks>

        <RightSide>
          <ProfileArea>
            <AvatarCircle>{initials}</AvatarCircle>

            <ProfileMeta>
              <ProfileName>{currentUser?.name || "Member"}</ProfileName>
              <ProfileRole>Member Area</ProfileRole>
            </ProfileMeta>

            <ProfileButton to="/user-profile" onClick={handleNavClick}>
              Profile
            </ProfileButton>

            {onLogout ? (
              <LogoutButton type="button" onClick={handleLogoutClick}>
                Logout
              </LogoutButton>
            ) : null}
          </ProfileArea>

          <MenuButton
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
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
              initial={{ x: 320, opacity: 0.98 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0.98 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarLuxuryGlow />

              <SidebarTopLine />

              <SidebarHeader>
                <SidebarAvatar>{initials}</SidebarAvatar>

                <SidebarMeta>
                  <SidebarName>{currentUser?.name || "Member"}</SidebarName>
                  <SidebarRole>Premium Member Area</SidebarRole>
                </SidebarMeta>
              </SidebarHeader>

              <SidebarDivider />

              <SidebarNav>
                {userLinks.map((link) => {
                  const active = location.pathname === link.to;

                  return (
                    <SidebarNavItem
                      key={link.to}
                      to={link.to}
                      $active={active ? 1 : 0}
                      onClick={handleNavClick}
                    >
                      <span>{link.label}</span>

                      {link.to === "/user-dashboard" &&
                      notificationsCount > 0 ? (
                        <SidebarBadge>
                          {notificationsCount > 99
                            ? "99+"
                            : notificationsCount}
                        </SidebarBadge>
                      ) : null}
                    </SidebarNavItem>
                  );
                })}
              </SidebarNav>

              <SidebarFooter>
                <SidebarProfileLink to="/user-profile" onClick={handleNavClick}>
                  Profile
                </SidebarProfileLink>

                {onLogout ? (
                  <SidebarLogoutButton type="button" onClick={handleLogoutClick}>
                    Logout
                  </SidebarLogoutButton>
                ) : null}
              </SidebarFooter>
            </SidebarPanel>
          </SidebarOverlay>
        )}
      </AnimatePresence>
    </Bar>
  );
};

export default UserNavbar;

/* -------------------- styles -------------------- */

const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
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
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 18px;

  @media (max-width: 768px) {
    padding: 10px 16px;
    gap: 12px;
  }
`;

const BrandWrapper = styled.div`
  flex: 0 0 auto;
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
`;

const LogoMark = styled.div`
  width: 34px;
  height: 34px;
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
`;

const BrandText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const BrandTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};

  @media (max-width: 420px) {
    font-size: 12px;
    letter-spacing: 0.16em;
  }
`;

const BrandSub = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.7);

  @media (max-width: 420px) {
    font-size: 9px;
  }
`;

const Badge = styled.span`
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.45);
  background: linear-gradient(
    135deg,
    rgba(214, 182, 159, 0.22),
    rgba(61, 38, 26, 0.9)
  );
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 10px;
  font-weight: 800;
`;

const NavLinks = styled.div`
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  gap: 8px;

  @media (max-width: 900px) {
    display: none;
  }
`;

const MotionLink = motion.create(Link);

const NavItem = styled(MotionLink)`
  position: relative;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.14em;
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

const Dot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.lightBrown};
  box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.12);
`;

const RightSide = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
`;

const ProfileArea = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 900px) {
    display: none;
  }
`;

const AvatarCircle = styled.div`
  width: 32px;
  height: 32px;
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
`;

const ProfileName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.ivory};
`;

const ProfileRole = styled.div`
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.7);
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
  transition: 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.hard};
    transform: translateY(-1px);
  }
`;

const ProfileButton = styled(BaseButton)`
  min-width: 84px;
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
  transition: 0.2s ease;

  &:hover {
    background: rgba(214, 182, 159, 0.08);
  }
`;

const MenuButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.25);
  background: rgba(255, 255, 255, 0.04);
  padding: 8px;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s ease;

  &:hover {
    background: rgba(214, 182, 159, 0.12);
    border-color: rgba(214, 182, 159, 0.55);
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
    transform: ${({ $open }) => ($open ? "rotate(45deg)" : "none")};
  }

  span:nth-child(2) {
    top: 8px;
    opacity: ${({ $open }) => ($open ? 0 : 1)};
  }

  span:nth-child(3) {
    bottom: ${({ $open }) => ($open ? "8px" : "0px")};
    transform: ${({ $open }) => ($open ? "rotate(-45deg)" : "none")};
  }
`;

const SidebarOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  background: radial-gradient(
      circle at top right,
      rgba(214, 182, 159, 0.16),
      transparent 34%
    ),
    rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: flex-end;
`;

const SidebarPanel = styled.div`
  position: relative;
  isolation: isolate;
  width: 320px;
  max-width: 86%;
  min-height: 100vh;
  overflow: hidden;
  padding: 22px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  background:
    linear-gradient(
      145deg,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(47, 27, 18, 0.98) 42%,
      rgba(90, 56, 37, 0.94) 72%,
      rgba(0, 0, 0, 0.98) 100%
    );

  border-left: 1px solid rgba(214, 182, 159, 0.3);
  box-shadow:
    -24px 0 60px rgba(0, 0, 0, 0.58),
    inset 1px 0 0 rgba(255, 255, 255, 0.08);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -2;
    background:
      radial-gradient(
        circle at 20% 10%,
        rgba(214, 182, 159, 0.22),
        transparent 34%
      ),
      radial-gradient(
        circle at 95% 45%,
        rgba(214, 182, 159, 0.14),
        transparent 38%
      ),
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.07),
        transparent 28%,
        rgba(0, 0, 0, 0.22)
      );
    pointer-events: none;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 12px;
    z-index: -1;
    border-radius: 26px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    pointer-events: none;
  }

  @media (max-width: 480px) {
    width: 290px;
    max-width: 88%;
    padding: 20px 16px 16px;
  }
`;

const SidebarLuxuryGlow = styled.div`
  position: absolute;
  top: -90px;
  right: -90px;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  background: rgba(214, 182, 159, 0.18);
  filter: blur(34px);
  pointer-events: none;
  z-index: -1;
`;

const SidebarTopLine = styled.div`
  height: 3px;
  width: 76px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(214, 182, 159, 1),
    rgba(214, 182, 159, 0.18)
  );
  box-shadow: 0 0 22px rgba(214, 182, 159, 0.36);
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.18);
`;

const SidebarAvatar = styled(AvatarCircle)`
  width: 42px;
  height: 42px;
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.3),
    0 0 0 4px rgba(214, 182, 159, 0.08);
`;

const SidebarMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const SidebarName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SidebarRole = styled.span`
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.66);
`;

const SidebarDivider = styled.div`
  height: 1px;
  width: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(214, 182, 159, 0.36),
    transparent
  );
`;

const SidebarNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SidebarNavItem = styled(Link)`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 13px;
  border-radius: ${({ theme }) => theme.radius.lg};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.ivory : "rgba(255,255,255,0.78)"};

  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, rgba(214,182,159,0.24), rgba(0,0,0,0.38))"
      : "rgba(0,0,0,0.3)"};

  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214,182,159,0.62)" : "rgba(255,255,255,0.09)"};

  box-shadow: ${({ $active }) =>
    $active ? "0 16px 34px rgba(0,0,0,0.28)" : "none"};

  transition: 0.22s ease;

  &:hover {
    transform: translateX(-2px);
    background: linear-gradient(
      135deg,
      rgba(214, 182, 159, 0.22),
      rgba(0, 0, 0, 0.42)
    );
    border-color: rgba(214, 182, 159, 0.72);
  }
`;

const SidebarBadge = styled.span`
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.5);
  background: rgba(214, 182, 159, 0.16);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 11px;
  font-weight: 900;
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid rgba(214, 182, 159, 0.16);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SidebarLogoutButton = styled.button`
  width: 100%;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 10px 12px;
  border: 1px solid rgba(214, 182, 159, 0.54);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 249, 242, 0.95);
  cursor: pointer;
  transition: 0.2s ease;

  &:hover {
    background: rgba(214, 182, 159, 0.14);
    border-color: rgba(214, 182, 159, 0.78);
  }
`;

const SidebarProfileLink = styled(BaseButton)`
  width: 100%;
  justify-content: center;
  padding: 10px 12px;
`;