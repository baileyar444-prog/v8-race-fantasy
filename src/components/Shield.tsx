type ShieldProps = {
  baseColour?: string;
  patternColour?: string;
  pattern?: string;
  number?: number | string;
  size?: number;
};

function patternBackground(baseColour: string, patternColour: string, pattern: string) {
  if (pattern === "stripe") {
    return `linear-gradient(135deg, ${baseColour} 0 38%, ${patternColour} 38% 58%, ${baseColour} 58%)`;
  }

  if (pattern === "half") {
    return `linear-gradient(90deg, ${baseColour} 0 50%, ${patternColour} 50%)`;
  }

  if (pattern === "v") {
    return `linear-gradient(135deg, ${baseColour} 0 35%, ${patternColour} 35% 50%, ${baseColour} 50% 65%, ${patternColour} 65%)`;
  }

  if (pattern === "chevron-wide") {
    return `linear-gradient(135deg, ${baseColour} 0 32%, ${patternColour} 32% 62%, ${baseColour} 62%)`;
  }

  if (pattern === "chevron-double") {
    return `linear-gradient(135deg, ${baseColour} 0 28%, ${patternColour} 28% 38%, ${baseColour} 38% 52%, ${patternColour} 52% 62%, ${baseColour} 62%)`;
  }

  if (pattern === "chevron-triple") {
    return `repeating-linear-gradient(135deg, ${baseColour} 0 18%, ${patternColour} 18% 25%, ${baseColour} 25% 36%)`;
  }

  if (pattern === "chevron-left") {
    return `linear-gradient(45deg, ${baseColour} 0 42%, ${patternColour} 42% 56%, ${baseColour} 56%)`;
  }

  if (pattern === "chevron-right") {
    return `linear-gradient(135deg, ${baseColour} 0 42%, ${patternColour} 42% 56%, ${baseColour} 56%)`;
  }

  if (pattern === "chevron-centre") {
    return `linear-gradient(135deg, ${baseColour} 0 30%, ${patternColour} 30% 40%, ${baseColour} 40% 60%, ${patternColour} 60% 70%, ${baseColour} 70%)`;
  }

  return `linear-gradient(135deg, ${baseColour} 0 45%, ${patternColour} 45% 58%, ${baseColour} 58%)`;
}

export function Shield({
  baseColour = "#ff7a1a",
  patternColour = "#111827",
  pattern = "chevron",
  number = "88",
  size = 48
}: ShieldProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        clipPath: "polygon(50% 0%, 92% 14%, 84% 78%, 50% 100%, 16% 78%, 8% 14%)",
        background: patternBackground(baseColour, patternColour, pattern)
      }}
      className="grid place-items-center border border-white/20 shadow-glow"
    >
      <span className="font-black text-white drop-shadow">{String(number).slice(0, 3)}</span>
    </div>
  );
}
