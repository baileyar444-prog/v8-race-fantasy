export function normaliseDriverEventScore(raceScores: number[]) {
  if (!raceScores.length) return 0;
  return Math.round((raceScores.reduce((sum, score) => sum + score, 0) / raceScores.length) * 10) / 10;
}

export function calculateTeamScore(params: {
  driverScores: Record<string, number>;
  picks: string[];
  captainDriverId: string;
  viceCaptainDriverId: string;
  eventMultiplier: number;
}) {
  const { driverScores, picks, captainDriverId, viceCaptainDriverId, eventMultiplier } = params;
  let total = 0;

  for (const driverId of picks) {
    const base = driverScores[driverId] ?? 0;
    if (driverId === captainDriverId) total += base * 2;
    else if (driverId === viceCaptainDriverId) total += base * 1.5;
    else total += base;
  }

  return Math.round(total * eventMultiplier);
}
