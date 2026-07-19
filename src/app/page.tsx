import Link from "next/link";
import { HomeDashboard } from "@/components/HomeDashboard";
import { PageHeader } from "@/components/PageHeader";
import { fallbackEvents } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-track-orange/25 via-white/5 to-black p-6 shadow-2xl lg:p-10">
        <div className="absolute right-[-5rem] top-[-5rem] h-64 w-64 rounded-full bg-track-orange/20 blur-3xl" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <img
                src="/v8-race-fantasy-logo.png"
                alt="V8 Race Fantasy"
                className="h-24 w-24 rounded-3xl border border-white/10 object-cover shadow-glow"
              />
              <div>
                <div className="pill mb-2">Free-to-play V8 Race Fantasy</div>
                <h1 className="text-4xl font-black tracking-tight md:text-6xl">Pick your garage. Beat your mates. Own the run home.</h1>
              </div>
            </div>
            <p className="mb-6 max-w-3xl text-lg text-track-muted">
              Choose one driver from each category, lock in a captain and vice-captain, join private leagues and chase the V8 Race Fantasy ladder from Perth to Adelaide.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="btn btn-primary" href="/login">Create account</Link>
              <Link className="btn" href="/pick-team">Pick team</Link>
              <Link className="btn" href="/team-history">My Team</Link>
              <Link className="btn" href="/leaderboard">View leaderboard</Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-black uppercase tracking-[.22em] text-track-muted">How it works</div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-white/5 p-4"><strong>1.</strong> Pick one driver from each category A–F.</div>
              <div className="rounded-2xl bg-white/5 p-4"><strong>2.</strong> Captain scores 2x. Vice-captain scores 1.5x.</div>
              <div className="rounded-2xl bg-white/5 p-4"><strong>3.</strong> Save your team before the round lockout countdown hits zero.</div>
              <div className="rounded-2xl bg-white/5 p-4"><strong>4.</strong> After Race Control publishes scores, your picks and points are saved forever in My Team.</div>
            </div>
          </div>
        </div>
      </section>

      <HomeDashboard />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card"><div className="text-sm font-black text-track-muted">Categories</div><div className="mt-2 text-4xl font-black">A–F</div><p className="mt-2 text-sm text-track-muted">Four drivers per category, based on the current championship order.</p></div>
        <div className="card"><div className="text-sm font-black text-track-muted">Captain</div><div className="mt-2 text-4xl font-black">2x</div><p className="mt-2 text-sm text-track-muted">Vice-captain scores 1.5x and must be a different driver.</p></div>
        <div className="card"><div className="text-sm font-black text-track-muted">History</div><div className="mt-2 text-4xl font-black">Saved</div><p className="mt-2 text-sm text-track-muted">Every event remembers picks, captaincy and points snapshots.</p></div>
      </div>

      <section className="card">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="pill mb-3">Upcoming rounds</div>
            <h2 className="text-3xl font-black">Simple location names</h2>
            <p className="mt-2 text-track-muted">The app uses clean location labels for the remaining rounds.</p>
          </div>
          <Link className="btn" href="/pick-team">Pick for the open round</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {fallbackEvents.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xl font-black">{event.name}</div>
              <div className="mt-1 text-sm text-track-muted">{event.number_of_races} race{event.number_of_races === 1 ? "" : "s"}{event.event_multiplier === 2 ? " · double points" : ""}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="card">
        <h2 className="text-2xl font-black">Scoring principle</h2>
        <p className="mt-3 text-track-muted">
          A three-race weekend should not be worth three times more than Bathurst. Each driver’s event score is the average of their race scores. Then captaincy and event multipliers are applied. Once Race Control publishes, the app stores a permanent team-history snapshot for that event.
        </p>
      </div>
    </div>
  );
}
