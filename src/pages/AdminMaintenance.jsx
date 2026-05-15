// src/pages/AdminMaintenance.jsx
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { useToast } from "../components/Toast";

import {
  fetchSystemStatus,
  updateMaintenanceMode,
  clearSystemSettingMessages,
} from "../reducers/systemSettings/systemSettingActions";

const AdminMaintenance = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  const {
    loading,
    updating,
    maintenanceMode,
    maintenanceTitle,
    maintenanceMessage,
    allowAdminAccess,
    updatedAt,
    successMessage,
    error,
  } = useSelector((state) => state.systemSettings);

  const [form, setForm] = useState({
    maintenanceMode: false,
    maintenanceTitle: "",
    maintenanceMessage: "",
    allowAdminAccess: true,
  });

  useEffect(() => {
    dispatch(fetchSystemStatus());
  }, [dispatch]);

  useEffect(() => {
    setForm({
      maintenanceMode,
      maintenanceTitle,
      maintenanceMessage,
      allowAdminAccess,
    });
  }, [maintenanceMode, maintenanceTitle, maintenanceMessage, allowAdminAccess]);

  useEffect(() => {
    if (successMessage) {
      toast?.push?.({
        title: "System Updated",
        description: successMessage,
        variant: "success",
      });
      dispatch(clearSystemSettingMessages());
    }

    if (error) {
      toast?.push?.({
        title: "System Error",
        description: error,
        variant: "error",
      });
      dispatch(clearSystemSettingMessages());
    }
  }, [successMessage, error, toast, dispatch]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await dispatch(
      updateMaintenanceMode({
        maintenanceMode: Boolean(form.maintenanceMode),
        maintenanceTitle: form.maintenanceTitle,
        maintenanceMessage: form.maintenanceMessage,
        allowAdminAccess: Boolean(form.allowAdminAccess),
      })
    );
  };

  const quickTurnOff = () => {
    dispatch(
      updateMaintenanceMode({
        ...form,
        maintenanceMode: false,
      })
    );
  };

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleString()
    : "Not updated yet";

  return (
    <Page>
      <Shell>
        <Hero>
          <HeroCopy>
            <Eyebrow>KnockoutCodes System Control</Eyebrow>
            <Title>Maintenance Command Room</Title>
            <Subtitle>
              Control platform availability with a premium admin-only maintenance
              switch. Protect users during upgrades while keeping admin access
              open for emergency work.
            </Subtitle>
          </HeroCopy>

          <StatusCard $active={maintenanceMode}>
            <StatusLabel>Current Status</StatusLabel>
            <StatusValue>
              {maintenanceMode ? "Maintenance Active" : "Platform Live"}
            </StatusValue>
            <StatusText>
              {maintenanceMode
                ? "Visitors are seeing the maintenance experience."
                : "The full app is open to users."}
            </StatusText>
          </StatusCard>
        </Hero>

        <Grid>
          <FormCard onSubmit={handleSubmit}>
            <CardHeader>
              <div>
                <SmallLabel>Admin Settings</SmallLabel>
                <CardTitle>Update Maintenance Mode</CardTitle>
              </div>

              <ModePill $active={form.maintenanceMode}>
                {form.maintenanceMode ? "On" : "Off"}
              </ModePill>
            </CardHeader>

            {loading ? (
              <LoadingBox>Loading system settings...</LoadingBox>
            ) : (
              <>
                <SwitchPanel>
                  <SwitchText>
                    <strong>Maintenance Mode</strong>
                    <span>
                      When enabled, normal visitors see the luxury maintenance
                      page instead of the app.
                    </span>
                  </SwitchText>

                  <Switch>
                    <input
                      type="checkbox"
                      name="maintenanceMode"
                      checked={form.maintenanceMode}
                      onChange={handleChange}
                    />
                    <span />
                  </Switch>
                </SwitchPanel>

                <SwitchPanel>
                  <SwitchText>
                    <strong>Allow Admin Access</strong>
                    <span>
                      Keep this on so admins can enter the dashboard while the
                      public app is offline.
                    </span>
                  </SwitchText>

                  <Switch>
                    <input
                      type="checkbox"
                      name="allowAdminAccess"
                      checked={form.allowAdminAccess}
                      onChange={handleChange}
                    />
                    <span />
                  </Switch>
                </SwitchPanel>

                <Field>
                  <Label>Maintenance Title</Label>
                  <Input
                    name="maintenanceTitle"
                    value={form.maintenanceTitle}
                    onChange={handleChange}
                    placeholder="KnockoutCodes Is Upgrading"
                    maxLength={120}
                  />
                </Field>

                <Field>
                  <Label>Maintenance Message</Label>
                  <Textarea
                    name="maintenanceMessage"
                    value={form.maintenanceMessage}
                    onChange={handleChange}
                    placeholder="We are sharpening the platform and preparing a better training experience."
                    maxLength={500}
                  />
                </Field>

                <Actions>
                  <GhostButton
                    type="button"
                    onClick={quickTurnOff}
                    disabled={updating || !maintenanceMode}
                  >
                    Turn Off Now
                  </GhostButton>

                  <PrimaryButton type="submit" disabled={updating}>
                    {updating ? "Saving..." : "Save Settings"}
                  </PrimaryButton>
                </Actions>
              </>
            )}
          </FormCard>

          <PreviewCard>
            <SmallLabel>Live Preview</SmallLabel>
            <PreviewBox>
              <PreviewBadge>Maintenance Mode</PreviewBadge>
              <PreviewTitle>
                {form.maintenanceTitle || "KnockoutCodes Is Upgrading"}
              </PreviewTitle>
              <PreviewText>
                {form.maintenanceMessage ||
                  "We are improving the training room. Please check back shortly."}
              </PreviewText>
            </PreviewBox>

            <InfoList>
              <InfoItem>
                <span>Admin Access</span>
                <strong>{form.allowAdminAccess ? "Allowed" : "Blocked"}</strong>
              </InfoItem>

              <InfoItem>
                <span>Last Updated</span>
                <strong>{formattedDate}</strong>
              </InfoItem>

              <InfoItem>
                <span>Protection</span>
                <strong>Backend Controlled</strong>
              </InfoItem>
            </InfoList>
          </PreviewCard>
        </Grid>
      </Shell>
    </Page>
  );
};

export default AdminMaintenance;

/* ============================
   Styles
============================ */

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.main`
  min-height: 100vh;
  padding: 96px 16px 60px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.2), transparent 34%),
    radial-gradient(circle at 86% 16%, rgba(90, 56, 37, 0.38), transparent 38%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
`;

const Shell = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 18px;
  margin-bottom: 18px;
  animation: ${fadeUp} 0.35s ease both;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const HeroCopy = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: clamp(24px, 4vw, 42px);
  background: linear-gradient(
    145deg,
    rgba(61, 38, 26, 0.84),
    rgba(0, 0, 0, 0.64)
  );
  border: 1px solid rgba(255, 249, 242, 0.12);
  box-shadow: ${({ theme }) => theme.shadow.glow};
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(2.2rem, 5vw, 4.8rem);
  line-height: 0.92;
  font-weight: 950;
  letter-spacing: -0.07em;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.ivory},
    ${({ theme }) => theme.colors.lightBrown}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  max-width: 760px;
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  line-height: 1.75;
`;

const StatusCard = styled.aside`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 22px;
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(145deg, rgba(90, 56, 37, 0.82), rgba(0, 0, 0, 0.66))"
      : "linear-gradient(145deg, rgba(47, 27, 18, 0.84), rgba(0, 0, 0, 0.6))"};
  border: 1px solid
    ${({ $active }) =>
      $active ? "rgba(214, 182, 159, 0.42)" : "rgba(255, 249, 242, 0.12)"};
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const StatusLabel = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const StatusValue = styled.h2`
  margin: 0;
  font-size: 30px;
  line-height: 1;
  font-weight: 950;
`;

const StatusText = styled.p`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.72;
  line-height: 1.55;
  font-size: 13px;
`;

const Grid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 18px;

  @media (max-width: 940px) {
    grid-template-columns: 1fr;
  }
`;

const FormCard = styled.form`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 20px;
  background: linear-gradient(
    180deg,
    rgba(47, 27, 18, 0.96),
    rgba(0, 0, 0, 0.7)
  );
  border: 1px solid rgba(255, 249, 242, 0.1);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const PreviewCard = styled.aside`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 20px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(214, 182, 159, 0.16);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const SmallLabel = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 950;
  letter-spacing: -0.04em;
`;

const ModePill = styled.span`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 12px;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.black : theme.colors.ivory};
  background: ${({ theme, $active }) =>
    $active
      ? `linear-gradient(130deg, ${theme.colors.lightBrown}, ${theme.colors.ivory})`
      : "rgba(0,0,0,0.35)"};
  border: 1px solid rgba(214, 182, 159, 0.18);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
`;

const SwitchPanel = styled.div`
  margin-bottom: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 14px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(214, 182, 159, 0.14);
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
`;

const SwitchText = styled.div`
  strong {
    display: block;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 14px;
    font-weight: 950;
  }

  span {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.ivory};
    opacity: 0.68;
    font-size: 12px;
    line-height: 1.45;
  }
`;

const Switch = styled.label`
  position: relative;
  width: 58px;
  height: 32px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    inset: 0;
    cursor: pointer;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: rgba(255, 249, 242, 0.14);
    border: 1px solid rgba(255, 249, 242, 0.16);
    transition: 0.2s ease;
  }

  span::before {
    content: "";
    position: absolute;
    width: 24px;
    height: 24px;
    left: 4px;
    top: 3px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.ivory};
    transition: 0.2s ease;
  }

  input:checked + span {
    background: ${({ theme }) => theme.colors.lightBrown};
  }

  input:checked + span::before {
    transform: translateX(26px);
    background: ${({ theme }) => theme.colors.black};
  }
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
  margin-top: 14px;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const Input = styled.input`
  min-height: 48px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 0 14px;
  outline: none;

  &:focus {
    border-color: rgba(214, 182, 159, 0.65);
  }
`;

const Textarea = styled.textarea`
  min-height: 130px;
  resize: vertical;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid rgba(255, 249, 242, 0.12);
  background: rgba(0, 0, 0, 0.34);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 14px;
  outline: none;

  &:focus {
    border-color: rgba(214, 182, 159, 0.65);
  }
`;

const Actions = styled.div`
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  @media (max-width: 560px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button`
  min-height: 46px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 0 18px;
  cursor: pointer;
  background: linear-gradient(
    130deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: ${({ theme }) => theme.shadow.soft};

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const GhostButton = styled(PrimaryButton)`
  background: rgba(0, 0, 0, 0.3);
  color: ${({ theme }) => theme.colors.ivory};
  border: 1px solid rgba(255, 249, 242, 0.2);
`;

const PreviewBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.xl};
  padding: 24px;
  text-align: center;
  background: linear-gradient(
    145deg,
    rgba(61, 38, 26, 0.84),
    rgba(0, 0, 0, 0.66)
  );
  border: 1px solid rgba(255, 249, 242, 0.12);
`;

const PreviewBadge = styled.div`
  width: fit-content;
  margin: 0 auto 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.lightBrown};
  color: ${({ theme }) => theme.colors.black};
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.13em;
  text-transform: uppercase;
`;

const PreviewTitle = styled.h3`
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 3rem);
  line-height: 0.95;
  font-weight: 950;
  letter-spacing: -0.06em;
`;

const PreviewText = styled.p`
  margin: 16px auto 0;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  line-height: 1.65;
  font-size: 13px;
`;

const InfoList = styled.div`
  margin-top: 14px;
  display: grid;
  gap: 10px;
`;

const InfoItem = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 12px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.14);

  span {
    display: block;
    color: ${({ theme }) => theme.colors.lightBrown};
    font-size: 10px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  strong {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.ivory};
    font-size: 13px;
    font-weight: 950;
  }
`;

const LoadingBox = styled.div`
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 18px;
  background: rgba(0, 0, 0, 0.28);
  color: ${({ theme }) => theme.colors.ivory};
`;