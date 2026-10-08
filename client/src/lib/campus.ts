import usersData from '../../users.json';

export interface CampusDirectoryUser {
  id: string; // e.g. "B26001"
  name: string; // e.g. "AARTI"
}

export interface ParsedRollNumber {
  isValid: boolean;
  normalizedRoll: string; // e.g. "B26419"
  username: string; // e.g. "b26419"
  email: string; // e.g. "b26419@students.iitmandi.ac.in"
  hierarchy: string; // e.g. "B", "IM"
  hierarchyName: string; // e.g. "B.Tech", "IMBA"
  year: string; // e.g. "26" -> 2026
  rollNumber: string; // e.g. "419"
}

const HIERARCHY_NAMES: Record<string, string> = {
  B: 'B.Tech',
  IM: 'Integrated MBA',
  M: 'M.Tech',
  MS: 'M.S. (Research)',
  P: 'Ph.D.',
  T: 'M.Sc.',
  D: 'Dual Degree',
  MBA: 'MBA',
};

// Fast lookup map by uppercase roll number
const directoryMap = new Map<string, CampusDirectoryUser>();
const directoryList: CampusDirectoryUser[] = usersData as CampusDirectoryUser[];

for (const u of directoryList) {
  if (u && u.id) {
    directoryMap.set(u.id.toUpperCase().trim(), {
      id: u.id.toUpperCase().trim(),
      name: u.name.trim(),
    });
  }
}

/**
 * Validates and parses an IIT Mandi roll number of format XYYZZZ
 * X = Hierarchy (1-4 letters: B, IM, M, etc.)
 * YY = 2-digit year of enrollment (e.g. 26)
 * ZZZ = 2-4 digit serial roll number (e.g. 419, 001)
 */
export function parseRollNumber(input: string): ParsedRollNumber {
  const clean = input.trim().replace(/\s+/g, '');
  const match = clean.match(/^([a-zA-Z]{1,4})(\d{2})(\d{2,4})$/);

  if (!match) {
    return {
      isValid: false,
      normalizedRoll: clean.toUpperCase(),
      username: clean.toLowerCase(),
      email: `${clean.toLowerCase()}@students.iitmandi.ac.in`,
      hierarchy: '',
      hierarchyName: '',
      year: '',
      rollNumber: '',
    };
  }

  const hierarchy = match[1].toUpperCase();
  const year = match[2];
  const rollNumber = match[3];
  const normalizedRoll = `${hierarchy}${year}${rollNumber}`;
  const username = normalizedRoll.toLowerCase();
  const email = `${username}@students.iitmandi.ac.in`;

  return {
    isValid: true,
    normalizedRoll,
    username,
    email,
    hierarchy,
    hierarchyName: HIERARCHY_NAMES[hierarchy] || hierarchy,
    year,
    rollNumber,
  };
}

/**
 * Check if input matches XYYZZZ format
 */
export function isValidRollNumber(input: string): boolean {
  return parseRollNumber(input).isValid;
}

/**
 * Lookup student in client/users.json by roll number
 */
export function lookupCampusUser(rollNumber: string): CampusDirectoryUser | null {
  const clean = rollNumber.trim().toUpperCase();
  return directoryMap.get(clean) || null;
}

/**
 * Search students in campus directory by name or roll number
 */
export function searchCampusDirectory(query: string, limit = 25): CampusDirectoryUser[] {
  const q = query.trim().toUpperCase();
  if (!q) return directoryList.slice(0, limit);

  const results: CampusDirectoryUser[] = [];
  for (const u of directoryList) {
    if (u.id.includes(q) || u.name.toUpperCase().includes(q)) {
      results.push(u);
      if (results.length >= limit) break;
    }
  }
  return results;
}
