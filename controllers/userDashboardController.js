/**
 * GET /api/v1/dashboard?range=7d
 * Returns dashboard payload in the exact shape the frontend expects.
 */
export const getUserDashboard = async (req, res) => {
  try {
    // ✅ read time range from query (optional)
    const range = req.query.range || "7d";

    // ✅ you can use req.user (from protect middleware) if you want personalization
    // Example: const userId = req.user?._id;

    // ✅ TEMP: return mock-style data from backend (so fetch works immediately)
    // Later, we replace this with real database aggregation.
    const payload = {
      stats: {
        streakDays: 6,
        completedCount: 14,
        savedCount: 5,
        notificationsCount: 2,
        progressPercent: range === "7d" ? 62 : range === "30d" ? 71 : 80,
      },
      nextSteps: [
        {
          id: "ns1",
          title: "Complete your profile",
          hint: "Unlock personalized recommendations.",
        },
        {
          id: "ns2",
          title: "Continue your blueprint",
          hint: "Pick up where you left off.",
        },
        {
          id: "ns3",
          title: "Save your first goal",
          hint: "Goals keep you locked in.",
        },
      ],
      recentActivity: [
        {
          id: "ra1",
          title: "Completed: Career intro module",
          time: "Today • 2:18 PM",
        },
        {
          id: "ra2",
          title: "Saved: Financial discipline checklist",
          time: "Yesterday • 9:40 PM",
        },
        {
          id: "ra3",
          title: "Updated profile headline",
          time: "2 days ago • 7:12 AM",
        },
      ],
      notifications: [
        {
          id: "n1",
          title: "New update available",
          desc: "Fresh tips added to your roadmap.",
          read: false,
        },
        {
          id: "n2",
          title: "You’re on a streak",
          desc: "Keep going. Consistency is power.",
          read: false,
        },
        {
          id: "n3",
          title: "Saved item reminder",
          desc: "Review your saved items today.",
          read: true,
        },
      ],
    };

    return res.status(200).json(payload);
  } catch {
    return res.status(500).json({
      message: "Failed to load dashboard.",
    });
  }
};
