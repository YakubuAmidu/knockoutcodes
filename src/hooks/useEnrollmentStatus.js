// src/hooks/useEnrollmentStatus.js
import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance.js";
import { useToast } from "../components/Toast";

const useEnrollmentStatus = (courseId) => {
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      setIsEnrolled(false);
      setMeta(null);
      return;
    }

    let isMounted = true;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/enrollments/status/${courseId}`);
        if (!isMounted) return;

        const data = res.data || {};
        setIsEnrolled(Boolean(data.isEnrolled));
        setMeta(data);
      } catch (error) {
        if (!isMounted) return;

        setIsEnrolled(false);
        setMeta(null);

        // Small warning, but not too aggressive
        const message =
          error.response?.data?.message ||
          "Could not check enrollment status. Some lessons may be locked.";

        push({
          title: "Enrollment check failed",
          description: message,
          variant: "warning",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [courseId, push]);

  return { loading, isEnrolled, meta };
};

export default useEnrollmentStatus;
