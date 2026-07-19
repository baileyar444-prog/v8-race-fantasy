export type ClassificationStatus = "finished" | "dnf" | "dns" | "dsq";
export type PenaltyType = "none" | "minor" | "major";

export type RaceInput = {
  qualifying_position?: number | null;
  finish_position?: number | null;
  classification?: ClassificationStatus;
  fastest_lap?: boolean;
  penalty?: PenaltyType;
};

export function qualifyingPoints(position?: number | null) {
  if (!position || position < 1) return 0;

  if (position === 1) return 20;
  if (position === 2) return 17;
  if (position === 3) return 15;
  if (position === 4) return 13;
  if (position === 5) return 11;

  if (position >= 6 && position <= 10) return 16 - position; // P6=10, P10=6
  if (position >= 11 && position <= 15) return 16 - position; // P11=5, P15=1

  return 0;
}

export function finishPoints(position?: number | null) {
  if (!position || position < 1) return 0;

  const table: Record<number, number> = {
    1: 60,
    2: 54,
    3: 49,
    4: 45,
    5: 41,
    6: 38,
    7: 35,
    8: 32,
    9: 29,
    10: 26,
    11: 24,
    12: 22,
    13: 20,
    14: 18,
    15: 16,
    16: 14,
    17: 12,
    18: 10,
    19: 8,
    20: 6,
    21: 5,
    22: 4,
    23: 3,
    24: 2
  };

  return table[position] ?? 0;
}

export function calculateRaceFantasyPoints(input: RaceInput) {
  const classification = input.classification ?? "finished";
  const penalty = input.penalty ?? "none";

  let total = 0;

  if (classification !== "dns" && classification !== "dsq") {
    total += qualifyingPoints(input.qualifying_position);
    total += finishPoints(input.finish_position);
  }

  if (input.fastest_lap && classification !== "dns" && classification !== "dsq") {
    total += 5;
  }

  if (penalty === "minor") total -= 5;
  if (penalty === "major") total -= 10;

  if (classification === "dnf") total -= 10;
  if (classification === "dns") total -= 15;
  if (classification === "dsq") total -= 25;

  return total;
}

export function normaliseDriverEventScore(raceScores: number[]) {
  if (!raceScores.length) return 0;
  return Math.round((raceScores.reduce((sum, score) => sum + score, 0) / raceScores.length) * 10) / 10;
}

export function applyCaptaincy(score: number, driverId: string, captainId?: string | null, viceCaptainId?: string | null) {
  if (driverId === captainId) return score * 2;
  if (driverId === viceCaptainId) return score * 1.5;
  return score;
}
