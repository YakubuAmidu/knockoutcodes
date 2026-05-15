import { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasValidAccess(data) {
  const enrollment = data?.enrollment || data?.data?.enrollment || data?.data;

  const enrollmentPaid =
    enrollment?.paymentStatus === "paid" &&
    ["active", "completed"].includes(enrollment?.status);

  const statusPaid =
    data?.paymentStatus === "paid" &&
    ["active", "completed"].includes(data?.status);

  return Boolean(
    data?.success &&
      (enrollmentPaid ||
        statusPaid ||
        data?.isEnrolled ||
        data?.hasAccess ||
        data?.access?.allowed)
  );
}

export default function Enrollment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Verifying your course access...");

  const courseId = searchParams.get("courseId");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    let cancelled = false;

    const verifyEnrollment = async () => {
      if (!courseId) {
        setStatus("error");
        setMessage("Missing course information. Please return to courses.");
        return;
      }

      try {
        setStatus("checking");
        setMessage("Verifying your course access...");

        for (let attempt = 1; attempt <= 12; attempt += 1) {
          if (cancelled) return;

          let data = null;

          if (sessionId) {
            const res = await axiosInstance.post(
              "/enrollments/verify-stripe-session",
              {
                courseId,
                session_id: sessionId,
              }
            );

            data = res.data;
          } else {
            const res = await axiosInstance.get(
              `/enrollments/status/${encodeURIComponent(courseId)}`
            );

            data = res.data;
          }

          if (hasValidAccess(data)) {
            if (cancelled) return;

            setStatus("success");
            setMessage("Access verified. Opening your course...");
            toast.showToast("Course access verified successfully.", "success");

            setTimeout(() => {
              navigate(`/course-player/${encodeURIComponent(courseId)}`, {
                replace: true,
              });
            }, 700);

            return;
          }

          setMessage(
            sessionId
              ? `Payment received. Finalizing course access... (${attempt}/12)`
              : `Checking membership or enrollment access... (${attempt}/12)`
          );

          await sleep(1200);
        }

        if (cancelled) return;

        setStatus("error");
        setMessage(
          sessionId
            ? "Payment was received, but course access is still finalizing. Please try opening the course again."
            : "You do not have access to this course yet. Please enroll or choose the correct membership level."
        );
      } catch (error) {
        if (cancelled) return;

        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to verify course access.";

        setStatus("error");
        setMessage(msg);
        toast.showToast(msg, "error");
      }
    };

    verifyEnrollment();

    return () => {
      cancelled = true;
    };
  }, [courseId, sessionId, navigate, toast]);

  return (
    <Page>
      <Card>
        <Title>
          {status === "checking"
            ? "Checking Access"
            : status === "success"
            ? "Access Confirmed"
            : "Access Issue"}
        </Title>

        <Text>{message}</Text>

        {status === "error" && (
          <ButtonGroup>
            <Button
              type="button"
              onClick={() =>
                courseId
                  ? navigate(`/course-player/${encodeURIComponent(courseId)}`)
                  : navigate("/courses")
              }
            >
              Try Opening Course
            </Button>

            <Button type="button" onClick={() => navigate("/courses")}>
              Back to Courses
            </Button>
          </ButtonGroup>
        )}
      </Card>
    </Page>
  );
}

const Page = styled.main`
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: 40px 16px;
  background: #000;
  color: #fff;
`;

const Card = styled.section`
  width: min(560px, 100%);
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  padding: 28px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
`;

const Title = styled.h1`
  font-size: 26px;
  margin-bottom: 10px;
`;

const Text = styled.p`
  color: #cfcfcf;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  margin-top: 18px;
  display: grid;
  gap: 10px;
`;

const Button = styled.button`
  padding: 12px 18px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(120deg, #c71585, #ff5bb1);
`;