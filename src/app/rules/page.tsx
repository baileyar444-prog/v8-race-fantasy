import { PageHeader } from "@/components/PageHeader";

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fantasy rules" title="How V8 Race Fantasy works">
        The simple guide for new players before they pick their garage.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-2xl font-black">Team selection</h2>
          <div className="mt-4 space-y-3 text-track-muted">
            <p>Pick one driver from each category: A, B, C, D, E and F.</p>
            <p>Your captain scores double points. Your vice-captain scores 1.5x points.</p>
            <p>Captain and vice-captain must be different drivers.</p>
          </div>
        </section>

        <section className="card">
          <h2 className="text-2xl font-black">Lockout</h2>
          <div className="mt-4 space-y-3 text-track-muted">
            <p>Each round has a lockout countdown.</p>
            <p>Once lockout hits, your team becomes view-only for that event.</p>
            <p>If you miss lockout, that event scores 0 for your garage.</p>
          </div>
        </section>

        <section className="card">
          <h2 className="text-2xl font-black">Scoring</h2>
          <div className="mt-4 space-y-3 text-track-muted">
            <p>Drivers earn fantasy points from qualifying, race finish, fastest laps and penalties.</p>
            <p>Events with multiple races are normalised so one, two and three-race weekends stay fair.</p>
            <p>Bathurst and Adelaide use double event points.</p>
          </div>
        </section>

        <section className="card">
          <h2 className="text-2xl font-black">Leagues</h2>
          <div className="mt-4 space-y-3 text-track-muted">
            <p>Create a private league, share the code with mates and view a league-only ladder.</p>
            <p>The Community page also includes the official V8 Race Fantasy Community League.</p>
            <p>Scores are saved event-by-event so your history stays permanent.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
