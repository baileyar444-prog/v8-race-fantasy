export const categories = ["A", "B", "C", "D", "E", "F"] as const;

export const upcomingEventSlugs = [
  "perth",
  "ipswich",
  "the-bend",
  "bathurst",
  "gold-coast",
  "sandown",
  "adelaide"
] as const;

export const fallbackEvents = [
  {
    id: "perth",
    slug: "perth",
    name: "Perth",
    full_name: "Perth",
    location: "Perth, WA",
    lockout_at: "2026-07-31T09:00:00+08:00",
    manual_lock: false,
    number_of_races: 3,
    event_multiplier: 1,
    is_open_event: true,
    sort_order: 1
  },
  {
    id: "ipswich",
    slug: "ipswich",
    name: "Ipswich",
    full_name: "Ipswich",
    location: "Ipswich, QLD",
    lockout_at: "2026-08-21T09:00:00+10:00",
    manual_lock: false,
    number_of_races: 3,
    event_multiplier: 1,
    is_open_event: false,
    sort_order: 2
  },
  {
    id: "the-bend",
    slug: "the-bend",
    name: "The Bend",
    full_name: "The Bend",
    location: "Tailem Bend, SA",
    lockout_at: "2026-09-11T09:00:00+09:30",
    manual_lock: false,
    number_of_races: 1,
    event_multiplier: 1,
    is_open_event: false,
    sort_order: 3
  },
  {
    id: "bathurst",
    slug: "bathurst",
    name: "Bathurst",
    full_name: "Bathurst",
    location: "Bathurst, NSW",
    lockout_at: "2026-10-08T09:00:00+11:00",
    manual_lock: false,
    number_of_races: 1,
    event_multiplier: 2,
    is_open_event: false,
    sort_order: 4
  },
  {
    id: "gold-coast",
    slug: "gold-coast",
    name: "Gold Coast",
    full_name: "Gold Coast",
    location: "Surfers Paradise, QLD",
    lockout_at: "2026-10-23T09:00:00+10:00",
    manual_lock: false,
    number_of_races: 2,
    event_multiplier: 1,
    is_open_event: false,
    sort_order: 5
  },
  {
    id: "sandown",
    slug: "sandown",
    name: "Sandown",
    full_name: "Sandown",
    location: "Melbourne, VIC",
    lockout_at: "2026-11-06T09:00:00+11:00",
    manual_lock: false,
    number_of_races: 2,
    event_multiplier: 1,
    is_open_event: false,
    sort_order: 6
  },
  {
    id: "adelaide",
    slug: "adelaide",
    name: "Adelaide",
    full_name: "Adelaide",
    location: "Adelaide, SA",
    lockout_at: "2026-11-26T09:00:00+10:30",
    manual_lock: false,
    number_of_races: 3,
    event_multiplier: 2,
    is_open_event: false,
    sort_order: 7
  }
];

export const fallbackDrivers = [
  { id: "matthew-payne", car_number: "19", driver_name: "Matthew Payne", team_name: "Penrite Racing", category: "A", points_position: 1, championship_points: 1656, wins: 3 },
  { id: "broc-feeney", car_number: "88", driver_name: "Broc Feeney", team_name: "Red Bull Ampol Racing", category: "A", points_position: 2, championship_points: 1564, wins: 4 },
  { id: "brodie-kostecki", car_number: "17", driver_name: "Brodie Kostecki", team_name: "Shell V-Power Racing Team", category: "A", points_position: 3, championship_points: 1469, wins: 6 },
  { id: "cam-waters", car_number: "6", driver_name: "Cam Waters", team_name: "Monster Castrol Racing", category: "A", points_position: 4, championship_points: 1461, wins: 2 },

  { id: "kai-allen", car_number: "26", driver_name: "Kai Allen", team_name: "Penrite Racing", category: "B", points_position: 5, championship_points: 1339, wins: 2 },
  { id: "anton-de-pasquale", car_number: "18", driver_name: "Anton De Pasquale", team_name: "DEWALT Racing", category: "B", points_position: 6, championship_points: 1314, wins: 2 },
  { id: "will-brown", car_number: "888", driver_name: "Will Brown", team_name: "Red Bull Ampol Racing", category: "B", points_position: 7, championship_points: 1239, wins: 0 },
  { id: "ryan-wood", car_number: "2", driver_name: "Ryan Wood", team_name: "Mobil1 Truck Assist Racing", category: "B", points_position: 8, championship_points: 1116, wins: 1 },

  { id: "chaz-mostert", car_number: "1", driver_name: "Chaz Mostert", team_name: "Mobil1 Optus Racing", category: "C", points_position: 9, championship_points: 1092, wins: 1 },
  { id: "jack-le-brocq", car_number: "4", driver_name: "Jack Le Brocq", team_name: "Sherrin Rentals Racing", category: "C", points_position: 10, championship_points: 987, wins: 0 },
  { id: "james-golding", car_number: "7", driver_name: "James Golding", team_name: "CoolDrive Racing", category: "C", points_position: 11, championship_points: 976, wins: 0 },
  { id: "jayden-ojeda", car_number: "31", driver_name: "Jayden Ojeda", team_name: "PremiAir Racing", category: "C", points_position: 12, championship_points: 850, wins: 0 },

  { id: "thomas-randle", car_number: "55", driver_name: "Thomas Randle", team_name: "Monster Castrol Racing", category: "D", points_position: 13, championship_points: 831, wins: 0 },
  { id: "andre-heimgartner", car_number: "8", driver_name: "Andre Heimgartner", team_name: "R&J Batteries Racing", category: "D", points_position: 14, championship_points: 812, wins: 1 },
  { id: "david-reynolds", car_number: "20", driver_name: "David Reynolds", team_name: "Snowy River Caravans Racing", category: "D", points_position: 15, championship_points: 757, wins: 0 },
  { id: "cameron-hill", car_number: "14", driver_name: "Cameron Hill", team_name: "Brad Jones Racing", category: "D", points_position: 16, championship_points: 697, wins: 0 },

  { id: "zach-bates", car_number: "10", driver_name: "Zach Bates", team_name: "Bendix Racing", category: "E", points_position: 17, championship_points: 605, wins: 0 },
  { id: "declan-fraser", car_number: "777", driver_name: "Declan Fraser", team_name: "PremiAir Racing", category: "E", points_position: 18, championship_points: 557, wins: 0 },
  { id: "rylan-gray", car_number: "38", driver_name: "Rylan Gray", team_name: "Shell V-Power Racing Team", category: "E", points_position: 19, championship_points: 543, wins: 0 },
  { id: "macauley-jones", car_number: "96", driver_name: "Macauley Jones", team_name: "Brad Jones Racing", category: "E", points_position: 20, championship_points: 542, wins: 0 },

  { id: "aaron-cameron", car_number: "3", driver_name: "Aaron Cameron", team_name: "LIQUI MOLY BLAHST Racing", category: "F", points_position: 21, championship_points: 516, wins: 0 },
  { id: "cooper-murray", car_number: "99", driver_name: "Cooper Murray", team_name: "Erebus Motorsport", category: "F", points_position: 22, championship_points: 510, wins: 0 },
  { id: "jackson-walls", car_number: "11", driver_name: "Jackson Walls", team_name: "Objective Racing", category: "F", points_position: 23, championship_points: 447, wins: 0 },
  { id: "jobe-stewart", car_number: "9", driver_name: "Jobe Stewart", team_name: "Erebus Motorsport", category: "F", points_position: 24, championship_points: 422, wins: 0 }
];
