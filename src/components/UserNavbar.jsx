import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { useToast } from "../components/Toast";

const userLinks = [
  { label: "Dashboard", to: "/user-dashboard" },
  { label: "My Profile", to: "/user-profile" },
  { label: "Contact", to: "/contact" },
];

const UserNavbar = ({ currentUser, onLogout }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { showToast } = useToast();

  const notificationsCount = useSelector(
    (state) => state?.userDashboard?.stats?.notificationsCount || 0,
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
    onLogout?.();
  };

  return (
    <Bar
      as={motion.nav}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <Inner>
        <Brand to="/home" aria-label="Home">
          <LogoMark>KC</LogoMark>

          <BrandText>
            <BrandTitle>KNOCKOUTCODES</BrandTitle>
            <BrandSub>
              <span>Premium Member Area</span>

              {!!notificationsCount && (
                <Badge title="Unread notifications">
                  {notificationsCount > 99 ? "99+" : notificationsCount}
                </Badge>
              )}
            </BrandSub>
          </BrandText>
        </Brand>

        <LuxuryCenter>
          <CenterLine />
          <CenterText>Member navigation inside sidebar</CenterText>
          <CenterLine />
        </LuxuryCenter>

        <RightSide>
          <ProfileArea>
            <AvatarCircle>{initials}</AvatarCircle>

            <ProfileMeta>
              <ProfileName>{currentUser?.name || "Member"}</ProfileName>
              <ProfileRole>Member Area</ProfileRole>
            </ProfileMeta>

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
              initial={{ x: 340, opacity: 0.96 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0.96 }}
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
                          {notificationsCount > 99 ? "99+" : notificationsCount}
                        </SidebarBadge>
                      ) : null}
                    </SidebarNavItem>
                  );
                })}
              </SidebarNav>

              <SidebarFooter>
                {onLogout ? (
                  <SidebarLogoutButton
                    type="button"
                    onClick={handleLogoutClick}
                  >
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
  overflow-x: clip;
  backdrop-filter: blur(22px);
  background:
    radial-gradient(
      circle at 12% 0%,
      rgba(214, 182, 159, 0.2),
      transparent 34%
    ),
    linear-gradient(
      130deg,
      ${({ theme }) => theme.colors.black} 0%,
      ${({ theme }) => theme.colors.cocoa} 42%,
      rgba(0, 0, 0, 0.94) 100%
    );
  border-bottom: 1px solid rgba(214, 182, 159, 0.14);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Inner = styled.div`
  width: min(100%, ${({ theme }) => theme.layout.max});
  margin: 0 auto;
  padding: 13px clamp(14px, 2vw, 26px);
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.5vw, 22px);
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  text-decoration: none;
`;

const LogoMark = styled.div`
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: radial-gradient(
    circle at 30% 0%,
    ${({ theme }) => theme.colors.lightBrown} 0%,
    ${({ theme }) => theme.colors.brown} 48%,
    ${({ theme }) => theme.colors.darkBrown} 100%
  );
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.ivory};
  font-weight: 950;
  font-size: 15px;
  letter-spacing: 0.12em;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.35),
    0 0 0 4px rgba(214, 182, 159, 0.08);
`;

const BrandText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const BrandTitle = styled.div`
  font-size: clamp(12px, 1.2vw, 15px);
  font-weight: 950;
  letter-spacing: clamp(0.13em, 0.9vw, 0.22em);
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
`;

const BrandSub = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.64);

  @media (max-width: 700px) {
    span:first-child {
      display: none;
    }
  }
`;

const Badge = styled.span`
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(214, 182, 159, 0.5);
  background: rgba(214, 182, 159, 0.16);
  color: ${({ theme }) => theme.colors.ivory};
  font-size: 10px;
  font-weight: 950;
`;

const LuxuryCenter = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  min-width: 0;

  @media (max-width: 1000px) {
    display: none;
  }
`;

const CenterLine = styled.div`
  width: min(90px, 10vw);
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(214, 182, 159, 0.45),
    transparent
  );
`;

const CenterText = styled.div`
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.42);
  white-space: nowrap;
`;

const RightSide = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: clamp(9px, 1vw, 14px);
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
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: radial-gradient(
    circle at 30% 0,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.darkBrown}
  );
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: ${({ theme }) => theme.colors.ivory};
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const ProfileMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 140px;
  min-width: 0;
`;

const ProfileName = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProfileRole = styled.div`
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.62);
`;

const LogoutButton = styled.button`
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 8px 13px;
  border: 1px solid rgba(214, 182, 159, 0.42);
  background: rgba(0, 0, 0, 0.18);
  color: rgba(255, 249, 242, 0.92);
  cursor: pointer;

  &:hover {
    background: rgba(214, 182, 159, 0.1);
    border-color: rgba(214, 182, 159, 0.7);
  }
`;

const MenuButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid rgba(214, 182, 159, 0.35);
  background: rgba(255, 255, 255, 0.045);
  cursor: pointer;
  display: grid;
  place-items: center;

  &:hover {
    background: rgba(214, 182, 159, 0.13);
    border-color: rgba(214, 182, 159, 0.7);
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
    transition: 0.2s ease;
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
  background:
    radial-gradient(
      circle at top right,
      rgba(214, 182, 159, 0.18),
      transparent 35%
    ),
    rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: flex-end;
`;

const SidebarPanel = styled.div`
  position: relative;
  isolation: isolate;
  width: min(350px, 90vw);
  height: 100dvh;
  padding: 22px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;

  background: linear-gradient(
    145deg,
    rgba(0, 0, 0, 0.98),
    rgba(47, 27, 18, 0.98) 44%,
    rgba(0, 0, 0, 0.98)
  );

  border-left: 1px solid rgba(214, 182, 159, 0.3);
  box-shadow:
    -26px 0 70px rgba(0, 0, 0, 0.65),
    inset 1px 0 0 rgba(255, 255, 255, 0.08);
`;

const SidebarLuxuryGlow = styled.div`
  position: absolute;
  top: -90px;
  right: -90px;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background: rgba(214, 182, 159, 0.2);
  filter: blur(36px);
  pointer-events: none;
  z-index: -1;
`;

const SidebarTopLine = styled.div`
  height: 3px;
  width: 86px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(214, 182, 159, 1),
    rgba(214, 182, 159, 0.18)
  );
  box-shadow: 0 0 24px rgba(214, 182, 159, 0.42);
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(214, 182, 159, 0.2);
`;

const SidebarAvatar = styled(AvatarCircle)`
  width: 44px;
  height: 44px;
`;

const SidebarMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const SidebarName = styled.span`
  font-size: 14px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ivory};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SidebarRole = styled.span`
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 249, 242, 0.62);
`;

const SidebarDivider = styled.div`
  height: 1px;
  width: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(214, 182, 159, 0.38),
    transparent
  );
`;

const SidebarNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 9px;
`;

const SidebarNavItem = styled(Link)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 13px;
  border-radius: ${({ theme }) => theme.radius.lg};
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.11em;
  line-height: 1.25;
  text-transform: uppercase;
  text-decoration: none;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.ivory : "rgba(255,255,255,0.76)"};
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(135deg, rgba(214,182,159,0.24), rgba(0,0,0,0.4))"
      : "rgba(0,0,0,0.3)"};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214,182,159,0.66)" : "rgba(255,255,255,0.09)"};

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
  font-weight: 950;
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
  font-weight: 950;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 11px 12px;
  border: 1px solid rgba(214, 182, 159, 0.56);
  background: rgba(0, 0, 0, 0.24);
  color: rgba(255, 249, 242, 0.95);
  cursor: pointer;

  &:hover {
    background: rgba(214, 182, 159, 0.14);
    border-color: rgba(214, 182, 159, 0.78);
  }
`;
