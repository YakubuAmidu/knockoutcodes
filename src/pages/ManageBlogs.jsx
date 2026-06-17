import React from "react";
import styled from "styled-components";
import AdminBlogForm from "./AdminBlogForm";
import Blog from "./Blog";

const ManageBlogs = () => {
  return (
    <PageWrap>
      <AdminSection>
        <SectionHeader>
          <Kicker>Admin Blog Manager</Kicker>
          <Title>Create, publish, and manage KnockoutCodes articles.</Title>
          <Subtitle>
            Use this area to create premium blog content, then preview the
            published articles below.
          </Subtitle>
        </SectionHeader>

        <AdminBlogForm />
      </AdminSection>

      <PreviewSection>
        <PreviewHeader>
          <Kicker>Published Blog Preview</Kicker>
          <PreviewTitle>Live articles visible to users</PreviewTitle>
        </PreviewHeader>

        <Blog />
      </PreviewSection>
    </PageWrap>
  );
};

export default ManageBlogs;

const PageWrap = styled.main`
  width: 100%;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.black};
  color: ${({ theme }) => theme.colors.white};
`;

const AdminSection = styled.section`
  padding: 100px 20px 50px;
  border-bottom: 1px solid rgba(214, 182, 159, 0.18);
  background:
    radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.16),
      transparent 36%
    ),
    linear-gradient(
      180deg,
      ${({ theme }) => theme.colors.black},
      ${({ theme }) => theme.colors.darkBrown}
    );
`;

const SectionHeader = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto 28px;
`;

const Kicker = styled.p`
  margin: 0 0 10px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  max-width: 850px;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(2rem, 4vw, 4.4rem);
  line-height: 0.95;
  font-weight: 950;
  letter-spacing: -0.06em;
`;

const Subtitle = styled.p`
  margin: 16px 0 0;
  max-width: 760px;
  color: ${({ theme }) => theme.colors.ivory};
  opacity: 0.78;
  font-size: 15px;
  line-height: 1.75;
`;

const PreviewSection = styled.section`
  background: ${({ theme }) => theme.colors.black};
`;

const PreviewHeader = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max || "1180px"};
  margin: 0 auto;
  padding: 50px 20px 0;
`;

const PreviewTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.ivory};
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: 950;
  letter-spacing: -0.04em;
`;
