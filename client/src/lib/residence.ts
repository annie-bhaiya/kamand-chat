export interface ResidenceOption {
  id: string;
  name: string;
  campus: 'North' | 'South';
  cluster?: string;
  location?: string;
}

export interface BranchOption {
  id: string;
  name: string;
  degree: string;
}

export const HOSTEL_OPTIONS: ResidenceOption[] = [
  { id: 'Parashar', name: 'Parashar Hostel (Blocks P1–P4)', campus: 'South', cluster: 'Parashar' },
  { id: 'Nako', name: 'Nako Hostel', campus: 'South', cluster: 'Nako' },
  { id: 'Suvalsar', name: 'Suvalsar Hostel (Blocks B11–B14)', campus: 'North', cluster: 'Suvalsar' },
  { id: 'Suraj Taal', name: 'Suraj Taal Hostel (Blocks B15–B19)', campus: 'North', cluster: 'Suraj Taal' },
  { id: 'Chandrataal', name: 'Chandrataal Hostel (Blocks B20–B24)', campus: 'North', cluster: 'Chandrataal' },
  { id: 'Manimahesh', name: 'Manimahesh Hostel (Blocks B1–B6)', campus: 'North', cluster: 'Manimahesh' },
  { id: 'Renuka', name: 'Renuka Hostel (Blocks G1–G3)', campus: 'North', cluster: 'Renuka' },
  { id: 'Beas Kund', name: 'Beas Kund Hostel', campus: 'North', cluster: 'Beas Kund' },
  { id: 'Gauri Kund', name: 'Gauri Kund Hostel', campus: 'North', cluster: 'Gauri Kund' },
];

export const HOSTEL_BLOCK_MAP: Record<string, { id: string; name: string }[]> = {
  'Parashar': [
    { id: 'P1', name: 'Block P1' },
    { id: 'P2', name: 'Block P2' },
    { id: 'P3', name: 'Block P3' },
    { id: 'P4', name: 'Block P4' },
  ],
  'Suvalsar': [
    { id: 'B11', name: 'Block B11' },
    { id: 'B12', name: 'Block B12' },
    { id: 'B13', name: 'Block B13' },
    { id: 'B14', name: 'Block B14' },
  ],
  'Suraj Taal': [
    { id: 'B15', name: 'Block B15' },
    { id: 'B16', name: 'Block B16' },
    { id: 'B17', name: 'Block B17' },
    { id: 'B18', name: 'Block B18' },
    { id: 'B19', name: 'Block B19' },
  ],
  'Chandrataal': [
    { id: 'B20', name: 'Block B20' },
    { id: 'B21', name: 'Block B21' },
    { id: 'B22', name: 'Block B22' },
    { id: 'B23', name: 'Block B23' },
    { id: 'B24', name: 'Block B24' },
  ],
  'Manimahesh': [
    { id: 'B1', name: 'Block B1' },
    { id: 'B2', name: 'Block B2' },
    { id: 'B3', name: 'Block B3' },
    { id: 'B4', name: 'Block B4' },
    { id: 'B5', name: 'Block B5' },
    { id: 'B6', name: 'Block B6' },
  ],
  'Renuka': [
    { id: 'G1', name: 'Block G1' },
    { id: 'G2', name: 'Block G2' },
    { id: 'G3', name: 'Block G3 (Dashir)' },
  ],
  'Nako': [
    { id: 'N1', name: 'Block N1' },
    { id: 'N2', name: 'Block N2' },
    { id: 'Main', name: 'Main Block' },
  ],
  'Beas Kund': [
    { id: 'Main', name: 'Main Hostel Block' },
  ],
  'Gauri Kund': [
    { id: 'Main', name: 'Main Hostel Block' },
  ],
};

export const MESS_OPTIONS: ResidenceOption[] = [
  { id: 'Pine Mess (North Dining 1)', name: 'Pine Mess (North Dining 1)', campus: 'North', location: 'Near Alders (NDH 1)' },
  { id: 'Oak Mess (North Dining 2)', name: 'Oak Mess (North Dining 2)', campus: 'North', location: 'North Dining Hall 2' },
  { id: 'Alder Mess', name: 'Alder Mess', campus: 'North', location: 'Alder Hostel Cluster' },
  { id: 'Cedar Mess', name: 'Cedar Mess', campus: 'North', location: 'Cedar Block Complex' },
  { id: 'Maple Mess (South Dining)', name: 'Maple Mess (South Dining)', campus: 'South', location: 'South Dining Hall' },
];

export const BRANCH_OPTIONS: BranchOption[] = [
  { id: 'btech-cse', name: 'B.Tech - Computer Science & Engineering', degree: 'B.Tech' },
  { id: 'btech-dsai', name: 'B.Tech - Data Science & Artificial Intelligence', degree: 'B.Tech' },
  { id: 'btech-ee', name: 'B.Tech - Electrical Engineering', degree: 'B.Tech' },
  { id: 'btech-me', name: 'B.Tech - Mechanical Engineering', degree: 'B.Tech' },
  { id: 'btech-ce', name: 'B.Tech - Civil Engineering', degree: 'B.Tech' },
  { id: 'btech-vlsi', name: 'B.Tech - Microelectronics & VLSI Engineering', degree: 'B.Tech' },
  { id: 'btech-mse', name: 'B.Tech - Materials Science & Engineering', degree: 'B.Tech' },
  { id: 'btech-mnc', name: 'B.Tech - Mathematics & Computing', degree: 'B.Tech' },
  { id: 'btech-ep', name: 'B.Tech - Engineering Physics', degree: 'B.Tech' },
  { id: 'btech-bioeng', name: 'B.Tech - Bioengineering', degree: 'B.Tech' },
  { id: 'btech-ge', name: 'B.Tech - General Engineering', degree: 'B.Tech' },
  { id: 'btech-chemanalytics', name: 'B.Tech - Chemical Engg with Data Analytics', degree: 'B.Tech' },
  { id: 'btech-quantum', name: 'B.Tech - Quantum Science & Engineering', degree: 'B.Tech' },
  { id: 'btech-agrianalytics', name: 'B.Tech - Agricultural Engg with Data Analytics', degree: 'B.Tech' },
  { id: 'bs-chemical', name: 'BS in Chemical Sciences', degree: 'Dual Degree / BS' },
  { id: 'dual-bioeng', name: 'Integrated Dual Degree - Bioengineering', degree: 'Dual Degree / BS' },
  { id: 'imba', name: 'Integrated MBA (IMBA)', degree: 'Dual Degree / BS' },
  { id: 'mtech-general', name: 'M.Tech Postgraduate Cohort', degree: 'PG / Masters' },
  { id: 'msc-general', name: 'M.Sc Postgraduate Cohort', degree: 'PG / Masters' },
  { id: 'mgmt-humanities', name: 'Management & Humanities (MBA / MA)', degree: 'PG / Masters' },
  { id: 'research-scholars', name: 'Research Scholars (M.S. & Ph.D.)', degree: 'Research' },
];

export function isUserHostelRoom(
  room: { category: string; hostelCluster?: string; hostelBlock?: string; name: string; slug: string },
  userHostel?: string | null,
  userBlock?: string | null
): boolean {
  if (room.category !== 'hostels') return true;
  if (!userHostel) return false;
  const uh = userHostel.toLowerCase().trim();
  const cluster = (room.hostelCluster || '').toLowerCase().trim();
  const name = room.name.toLowerCase().trim();
  const slug = room.slug.toLowerCase().trim();
  const matchesCluster =
    cluster.includes(uh) || uh.includes(cluster) || name.includes(uh) || slug.includes(uh.replace(/\s+/g, '-'));
  if (!matchesCluster) return false;

  // If the room represents a specific hostel block, user must be in that block
  if (room.hostelBlock) {
    if (!userBlock) return false;
    const ub = userBlock.toLowerCase().trim();
    const rb = room.hostelBlock.toLowerCase().trim();
    return rb === ub || name.includes(ub);
  }

  // Cluster general rooms are accessible to all residents of that cluster
  return true;
}

export function isUserBranchRoom(
  room: { category: string; id?: string; name: string; slug: string },
  userBranch?: string | null
): boolean {
  if (room.category !== 'branches') return true;
  if (!userBranch) return false;
  const ub = userBranch.toLowerCase().trim();
  const slug = room.slug.toLowerCase().trim();
  const id = (room.id || '').toLowerCase().trim();
  const name = room.name.toLowerCase().trim();
  return slug === ub || id === ub || name.includes(ub) || ub.includes(slug) || ub.includes(name);
}

export function isUserMessRoom(
  room: { category: string; name: string; slug: string },
  userMess?: string | null
): boolean {
  if (room.category !== 'messes') return true;
  if (!userMess) return false;
  const um = userMess.toLowerCase().trim();
  const name = room.name.toLowerCase().trim();
  const slug = room.slug.toLowerCase().trim();
  const keyword = um.replace(/\s*mess.*$/i, '').trim();
  return name.includes(um) || slug.includes(keyword) || name.includes(keyword);
}
