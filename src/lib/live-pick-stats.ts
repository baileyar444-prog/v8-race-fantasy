export type LivePickStat = {
  driverId: string;
  pickedCount: number;
  captainCount: number;
  viceCount: number;
  teamCount: number;
  pickedPercent: number;
  captainPercent: number;
  vicePercent: number;
};

export async function fetchEventPickStats(supabase: any, eventId: string) {
  const { data, error } = await supabase.rpc("get_event_driver_pick_stats", {
    target_event_id: eventId
  });

  if (error) throw error;

  const rows: LivePickStat[] = ((data ?? []) as any[]).map((row) => ({
    driverId: String(row.driver_id ?? ""),
    pickedCount: Number(row.picked_count ?? 0),
    captainCount: Number(row.captain_count ?? 0),
    viceCount: Number(row.vice_count ?? 0),
    teamCount: Number(row.team_count ?? 0),
    pickedPercent: Number(row.picked_percent ?? 0),
    captainPercent: Number(row.captain_percent ?? 0),
    vicePercent: Number(row.vice_percent ?? 0)
  }));

  return {
    rows,
    teamCount: rows.length ? rows[0].teamCount : 0
  };
}
