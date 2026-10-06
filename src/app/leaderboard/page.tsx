import { Suspense } from "react";
import { LeaderboardClient } from "./LeaderboardClient";

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="card">Loading leaderboard...</div>}>
      <LeaderboardClient />
    </Suspense>
  );
}
