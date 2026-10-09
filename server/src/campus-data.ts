export interface CampusRoomDef {
  id: string;
  slug: string;
  name: string;
  category: 'clubs' | 'courses' | 'hostels' | 'branches' | 'messes';
  subcategory: string;
  campus?: 'North' | 'South' | 'Both';
  description: string;
  tags: string[];
  courseCode?: string;
  hostelCluster?: string;
  hostelBlock?: string;
}

export interface CampusEvent {
  roomSlug?: string;
  canManage?: boolean;
  updatedAt?: string;
  id: string;
  title: string;
  description: string;
  category: 'Club Workshop' | 'Fest Event' | 'Sports Tournament' | 'Placement & Tech Talk' | 'General';
  organizer: string;
  venue: 'Auditorium A1/A2' | 'A13 Hall' | 'South Campus Grounds' | 'SCEE Seminar Hall' | 'Sports Complex' | 'Other';
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'conflict' | 'completed' | 'cancelled';
  createdBy?: string;
  createdAt: string;
}

export interface CampusTicket {
  roomSlug?: string;
  canManage?: boolean;
  updatedAt?: string;
  history?: Array<{ status: string; createdAt: string }>;
  id: string;
  title: string;
  description: string;
  scope: 'hostel' | 'mess';
  category: string;
  campus: 'North' | 'South';
  clusterOrMess: string;
  specificLocation: string;
  status: 'Reported' | 'Under Investigation' | 'Resolved by Warden/Caretaker';
  upvotes: number;
  upvotedBy: string[];
  createdBy: string;
  creatorName: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface MoodleAssignment {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  type: 'assignment' | 'quiz' | 'lab' | 'grade' | 'announcement';
  dueDate: string;
  weightage?: string;
  moodleUrl: string;
  status: 'pending' | 'submitted' | 'graded';
}

export interface MessDayMenu {
  messName: string;
  day: string;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
  specialNotice?: string;
}

// Full catalogue of IIT Mandi Scoped Rooms according to a.md
export const CAMPUS_ROOMS: CampusRoomDef[] = [
  // 1. CLUBS & SOCIETIES
  // Technical Society (SnTC)
  {
    id: 'club-kamandprompt',
    slug: 'kamandprompt',
    name: 'KamandPrompt',
    category: 'clubs',
    subcategory: 'Technical Society (SnTC)',
    campus: 'Both',
    description: 'Competitive Programming, Algorithms, Data Structures & Full-Stack Web Development Club of IIT Mandi.',
    tags: ['SnTC', 'CP', 'Algorithms', 'WebDev', 'ICPC'],
  },
  {
    id: 'club-robotronics',
    slug: 'robotronics',
    name: 'Robotronics',
    category: 'clubs',
    subcategory: 'Technical Society (SnTC)',
    campus: 'Both',
    description: 'Robotics, Automation, Embedded Systems, ROS, Computer Vision & Microcontrollers.',
    tags: ['SnTC', 'Robotics', 'ROS', 'Hardware', 'Automation'],
  },
  {
    id: 'club-yantrik',
    slug: 'yantrik',
    name: 'Yantrik',
    category: 'clubs',
    subcategory: 'Technical Society (SnTC)',
    campus: 'Both',
    description: 'Mechanical Design, SolidWorks CAD, 3D Printing, Aerodynamics & Prototyping.',
    tags: ['SnTC', 'CAD', '3DPrinting', 'Mechanical', 'Design'],
  },
  {
    id: 'club-sae',
    slug: 'sae',
    name: 'SAE Collegiate Club',
    category: 'clubs',
    subcategory: 'Technical Society (SnTC)',
    campus: 'Both',
    description: 'Automotive Engineering, BAJA SAE, Formula Student, Electric Vehicle Racing.',
    tags: ['SnTC', 'BAJA', 'FormulaStudent', 'Automotive', 'EV'],
  },
  {
    id: 'club-stac',
    slug: 'stac',
    name: 'STAC (Space Technology & Astronomy)',
    category: 'clubs',
    subcategory: 'Technical Society (SnTC)',
    campus: 'North',
    description: 'Astronomy, Astrophysics, Telescope Observation Nights & Space Exploration.',
    tags: ['SnTC', 'Astronomy', 'Astrophotography', 'Physics', 'Cosmology'],
  },
  {
    id: 'club-scri',
    slug: 'scri',
    name: 'SCRI',
    category: 'clubs',
    subcategory: 'Technical Society (SnTC)',
    campus: 'Both',
    description: 'Society for Collaborative Research & Innovation - student research paper publications & patents.',
    tags: ['SnTC', 'Research', 'Publications', 'Innovation', 'Academia'],
  },

  // Cultural Society (SAC)
  {
    id: 'club-music',
    slug: 'music-club',
    name: 'Music Club',
    category: 'clubs',
    subcategory: 'Cultural Society (SAC)',
    campus: 'Both',
    description: 'Vocals, Instrumentalists, Jamming Sessions, Classical, Rock, and Fusion Bands.',
    tags: ['SAC', 'Music', 'Bands', 'Vocals', 'Jamming'],
  },
  {
    id: 'club-vibrance',
    slug: 'dance-vibrance',
    name: 'Dance Club (Vibrance)',
    category: 'clubs',
    subcategory: 'Cultural Society (SAC)',
    campus: 'Both',
    description: 'Hip-Hop, Contemporary, Freestyle, Classical & Western Choreography Club.',
    tags: ['SAC', 'Dance', 'Choreography', 'Vibrance', 'Performances'],
  },
  {
    id: 'club-artgeeks',
    slug: 'drama-artgeeks',
    name: 'Drama Club (ArtGeeks / Thespians)',
    category: 'clubs',
    subcategory: 'Cultural Society (SAC)',
    campus: 'Both',
    description: 'Street Plays (Nukkad Natak), Stage Dramas, Scriptwriting, Method Acting & Mime.',
    tags: ['SAC', 'Dramatics', 'Nukkad', 'Theatre', 'Acting'],
  },
  {
    id: 'club-literary',
    slug: 'literary-society',
    name: 'Literary Society',
    category: 'clubs',
    subcategory: 'Cultural Society (SAC)',
    campus: 'Both',
    description: 'Parliamentary Debating, Campus Quizzing, Creative Writing, Poetry & MUN.',
    tags: ['SAC', 'Debating', 'Quizzing', 'Literature', 'MUN'],
  },
  {
    id: 'club-perception',
    slug: 'perception',
    name: 'Perception',
    category: 'clubs',
    subcategory: 'Cultural Society (SAC)',
    campus: 'Both',
    description: 'Photography, Cinematography, Himalayan Photo-walks, Video Editing & Visual Arts.',
    tags: ['SAC', 'Photography', 'Filmmaking', 'VisualArts', 'Cameras'],
  },
  {
    id: 'club-design-arts',
    slug: 'design-fine-arts',
    name: 'Design & Fine Arts',
    category: 'clubs',
    subcategory: 'Cultural Society (SAC)',
    campus: 'Both',
    description: 'UI/UX Design, Sketching, Painting, Digital Illustration, Calligraphy & Murals.',
    tags: ['SAC', 'Design', 'Painting', 'FineArts', 'UIUX'],
  },

  // Sports Society
  {
    id: 'sports-football',
    slug: 'football',
    name: 'Football Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'North',
    description: 'Inter-IIT Football practice sessions, intramural tournaments & weekend friendlies.',
    tags: ['Sports', 'Football', 'InterIIT', 'Ground'],
  },
  {
    id: 'sports-cricket',
    slug: 'cricket',
    name: 'Cricket Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'South',
    description: 'Leather ball matches, Kamand Premier League (KPL) & nets training.',
    tags: ['Sports', 'Cricket', 'KPL', 'InterIIT'],
  },
  {
    id: 'sports-basketball',
    slug: 'basketball',
    name: 'Basketball Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'North',
    description: 'Floodlit outdoor and indoor basketball court drills, 3v3 and 5v5 tournaments.',
    tags: ['Sports', 'Basketball', 'Court', 'InterIIT'],
  },
  {
    id: 'sports-badminton',
    slug: 'badminton',
    name: 'Badminton Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'Both',
    description: 'Indoor wooden court doubles & singles leagues across North & South sports complexes.',
    tags: ['Sports', 'Badminton', 'Indoor', 'Shuttle'],
  },
  {
    id: 'sports-table-tennis',
    slug: 'table-tennis',
    name: 'Table Tennis Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'Both',
    description: 'Hostel common room and sports complex TT tournaments and practice sessions.',
    tags: ['Sports', 'TableTennis', 'Indoor', 'TT'],
  },
  {
    id: 'sports-lawn-tennis',
    slug: 'lawn-tennis',
    name: 'Lawn Tennis Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'North',
    description: 'Synthetic court matches, coaching camps & Inter-IIT trials.',
    tags: ['Sports', 'Tennis', 'Court'],
  },
  {
    id: 'sports-volleyball',
    slug: 'volleyball',
    name: 'Volleyball Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'Both',
    description: 'North and South campus volleyball courts, evening spikes & tournament practice.',
    tags: ['Sports', 'Volleyball', 'Net'],
  },
  {
    id: 'sports-athletics',
    slug: 'athletics',
    name: 'Athletics & Fitness Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'Both',
    description: 'Track events, marathon running, sprint training & gymnasium workouts.',
    tags: ['Sports', 'Athletics', 'Running', 'Gym'],
  },
  {
    id: 'sports-chess',
    slug: 'chess',
    name: 'Chess Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'Both',
    description: 'Rapid, Blitz, and Classical chess tournaments, tactics study & Lichess team battles.',
    tags: ['Sports', 'Chess', 'Strategy', 'Blitz'],
  },
  {
    id: 'sports-mtb',
    slug: 'mountain-biking',
    name: 'Mountain Biking (MTB) Club',
    category: 'clubs',
    subcategory: 'Sports Society',
    campus: 'North',
    description: 'Himalayan trail rides, downhill mountain biking, Prashar Lake expeditions & cycling tours.',
    tags: ['Sports', 'MTB', 'Cycling', 'Himalayas', 'Trails'],
  },

  // Fests & Special Committees
  {
    id: 'fest-exodia',
    slug: 'exodia',
    name: 'Exodia',
    category: 'clubs',
    subcategory: 'Fests & Special Committees',
    campus: 'Both',
    description: 'Annual Cultural Fest of IIT Mandi — pronites, competitions, EDM night & celebrity artists.',
    tags: ['Fest', 'Cultural', 'Pronite', 'Exodia'],
  },
  {
    id: 'fest-frosthack',
    slug: 'frosthack',
    name: 'Frosthack',
    category: 'clubs',
    subcategory: 'Fests & Special Committees',
    campus: 'Both',
    description: 'Flagship Student Hackathon of IIT Mandi — 36-hour hackathon, mentor sessions & industry sponsor tracks.',
    tags: ['Fest', 'Hackathon', 'Tech', 'Frosthack', 'Dev'],
  },
  {
    id: 'fest-rann-neeti',
    slug: 'rann-neeti',
    name: 'Rann-Neeti',
    category: 'clubs',
    subcategory: 'Fests & Special Committees',
    campus: 'Both',
    description: 'Annual Inter-College Sports Fest with teams participating from across north India.',
    tags: ['Fest', 'Sports', 'RannNeeti', 'InterCollege'],
  },
  {
    id: 'comm-ecell',
    slug: 'e-cell',
    name: 'E-Cell (Entrepreneurship Cell)',
    category: 'clubs',
    subcategory: 'Fests & Special Committees',
    campus: 'Both',
    description: 'Startups, venture incubation (Catalyst), pitch competitions & entrepreneurship summits.',
    tags: ['Fest', 'Startups', 'Catalyst', 'Incubation', 'ECell'],
  },
  {
    id: 'comm-nss',
    slug: 'nss-ruvaab',
    name: 'NSS & Ruvaab',
    category: 'clubs',
    subcategory: 'Fests & Special Committees',
    campus: 'Both',
    description: 'National Service Scheme & Ruvaab — village education drives, blood donation camps & local community development in Kamand valley.',
    tags: ['Committees', 'NSS', 'SocialService', 'Ruvaab', 'Community'],
  },

  // 2. COURSES & ACADEMICS
  // Foundation / Institute Core
  {
    id: 'course-ic110',
    slug: 'ic110',
    name: 'IC110 - Electrical Science',
    category: 'courses',
    subcategory: 'Institute Core / Foundation',
    campus: 'Both',
    description: 'Circuit analysis, network theorems, AC circuits, phasors, magnetic circuits & diodes.',
    courseCode: 'IC110',
    tags: ['Core', 'EE', 'Circuits', 'FirstYear'],
  },
  {
    id: 'course-ic152',
    slug: 'ic152',
    name: 'IC152 - Computing & Data Science',
    category: 'courses',
    subcategory: 'Institute Core / Foundation',
    campus: 'Both',
    description: 'Programming in Python, algorithmic thinking, data structures, data analysis with NumPy/Pandas & ML basics.',
    courseCode: 'IC152',
    tags: ['Core', 'Computing', 'Python', 'DataScience'],
  },
  {
    id: 'course-ic252',
    slug: 'ic252',
    name: 'IC252 - Probability & Statistics',
    category: 'courses',
    subcategory: 'Institute Core / Foundation',
    campus: 'Both',
    description: 'Probability distributions, random variables, hypothesis testing, Bayes theorem & estimation theory.',
    courseCode: 'IC252',
    tags: ['Core', 'Math', 'Probability', 'Statistics'],
  },
  {
    id: 'course-ic160',
    slug: 'ic160',
    name: 'IC160 - Applied Mechanics',
    category: 'courses',
    subcategory: 'Institute Core / Foundation',
    campus: 'Both',
    description: 'Rigid body statics, friction, kinematics, moment of inertia, dynamics of particles & structural systems.',
    courseCode: 'IC160',
    tags: ['Core', 'Mechanics', 'Physics', 'Statics'],
  },
  {
    id: 'course-ic221',
    slug: 'ic221',
    name: 'IC221 - Physics of Materials',
    category: 'courses',
    subcategory: 'Institute Core / Foundation',
    campus: 'Both',
    description: 'Solid state physics, crystal structures, band theory, semiconductors, optical and magnetic materials.',
    courseCode: 'IC221',
    tags: ['Core', 'Physics', 'Materials', 'Semiconductors'],
  },

  // Department Core & Electives
  {
    id: 'course-cs302',
    slug: 'cs302',
    name: 'CS302 - Database Systems',
    category: 'courses',
    subcategory: 'Department Core & Electives',
    campus: 'North',
    description: 'Relational algebra, SQL, normalization, transaction processing, concurrency control, B+ trees & indexing.',
    courseCode: 'CS302',
    tags: ['CSE', 'DBMS', 'SQL', 'Databases', 'Transactions'],
  },
  {
    id: 'course-ee201',
    slug: 'ee201',
    name: 'EE201 - Signals & Systems',
    category: 'courses',
    subcategory: 'Department Core & Electives',
    campus: 'North',
    description: 'Continuous & discrete-time signals, LTI systems, Fourier analysis, Laplace and Z-transforms.',
    courseCode: 'EE201',
    tags: ['EE', 'Signals', 'Fourier', 'Transforms'],
  },
  {
    id: 'course-me301',
    slug: 'me301',
    name: 'ME301 - Fluid Mechanics',
    category: 'courses',
    subcategory: 'Department Core & Electives',
    campus: 'North',
    description: 'Fluid statics, conservation of mass and momentum, Navier-Stokes equations, boundary layers & pipe flow.',
    courseCode: 'ME301',
    tags: ['ME', 'Fluids', 'Thermodynamics', 'Flow'],
  },
  {
    id: 'course-ce301',
    slug: 'ce301',
    name: 'CE301 - Structural Analysis',
    category: 'courses',
    subcategory: 'Department Core & Electives',
    campus: 'North',
    description: 'Analysis of statically indeterminate structures, slope deflection, moment distribution & finite elements.',
    courseCode: 'CE301',
    tags: ['CE', 'Structures', 'Analysis', 'Trusses'],
  },

  // Practicum Courses
  {
    id: 'course-dp201',
    slug: 'dp201-dp301',
    name: 'DP201/DP301 - ISTP & Design Practicum',
    category: 'courses',
    subcategory: 'Practicum Courses',
    campus: 'Both',
    description: 'Interactive Socio-Technical Practicum (ISTP) and Design Practicum — interdisciplinary solutions for Himachal community and technology.',
    courseCode: 'DP201/301',
    tags: ['Practicum', 'ISTP', 'Design', 'Innovation', 'Himachal'],
  },

  // 3. HOSTELS
  // South Campus Hostels
  {
    id: 'hostel-parashar-gen',
    slug: 'parashar-general',
    name: 'Parashar Hostel - General',
    category: 'hostels',
    subcategory: 'South Campus',
    campus: 'South',
    description: 'Master hostel channel for Parashar Hostel in South Campus combining blocks P1, P2, P3, P4.',
    hostelCluster: 'Parashar',
    tags: ['SouthCampus', 'Parashar', 'Cluster'],
  },
  {
    id: 'hostel-p1',
    slug: 'p1-chat',
    name: 'Parashar Block P1',
    category: 'hostels',
    subcategory: 'South Campus',
    campus: 'South',
    description: 'Unit-level wing chat for Parashar Block P1 residents.',
    hostelCluster: 'Parashar',
    hostelBlock: 'P1',
    tags: ['SouthCampus', 'Parashar', 'P1', 'Block'],
  },
  {
    id: 'hostel-p2',
    slug: 'p2-chat',
    name: 'Parashar Block P2',
    category: 'hostels',
    subcategory: 'South Campus',
    campus: 'South',
    description: 'Unit-level wing chat for Parashar Block P2 residents.',
    hostelCluster: 'Parashar',
    hostelBlock: 'P2',
    tags: ['SouthCampus', 'Parashar', 'P2', 'Block'],
  },
  {
    id: 'hostel-p3',
    slug: 'p3-chat',
    name: 'Parashar Block P3',
    category: 'hostels',
    subcategory: 'South Campus',
    campus: 'South',
    description: 'Unit-level wing chat for Parashar Block P3 residents.',
    hostelCluster: 'Parashar',
    hostelBlock: 'P3',
    tags: ['SouthCampus', 'Parashar', 'P3', 'Block'],
  },
  {
    id: 'hostel-p4',
    slug: 'p4-chat',
    name: 'Parashar Block P4',
    category: 'hostels',
    subcategory: 'South Campus',
    campus: 'South',
    description: 'Unit-level wing chat for Parashar Block P4 residents.',
    hostelCluster: 'Parashar',
    hostelBlock: 'P4',
    tags: ['SouthCampus', 'Parashar', 'P4', 'Block'],
  },
  {
    id: 'hostel-nako-gen',
    slug: 'nako-general',
    name: 'Nako Hostel - General',
    category: 'hostels',
    subcategory: 'South Campus',
    campus: 'South',
    description: 'Hostel channel for Nako Hostel residents in South Campus.',
    hostelCluster: 'Nako',
    tags: ['SouthCampus', 'Nako'],
  },

  // North Campus Hostels
  // Suvalsar Cluster
  {
    id: 'hostel-suvalsar-gen',
    slug: 'suvalsar-general',
    name: 'Suvalsar Cluster - General',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Master cluster channel combining Suvalsar constituent blocks B11, B12, B13, B14.',
    hostelCluster: 'Suvalsar',
    tags: ['NorthCampus', 'Suvalsar', 'Cluster'],
  },
  {
    id: 'hostel-b11',
    slug: 'b11-chat',
    name: 'Suvalsar Block B11',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suvalsar B11.',
    hostelCluster: 'Suvalsar',
    hostelBlock: 'B11',
    tags: ['NorthCampus', 'Suvalsar', 'B11'],
  },
  {
    id: 'hostel-b12',
    slug: 'b12-chat',
    name: 'Suvalsar Block B12',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suvalsar B12.',
    hostelCluster: 'Suvalsar',
    hostelBlock: 'B12',
    tags: ['NorthCampus', 'Suvalsar', 'B12'],
  },
  {
    id: 'hostel-b13',
    slug: 'b13-chat',
    name: 'Suvalsar Block B13',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suvalsar B13.',
    hostelCluster: 'Suvalsar',
    hostelBlock: 'B13',
    tags: ['NorthCampus', 'Suvalsar', 'B13'],
  },
  {
    id: 'hostel-b14',
    slug: 'b14-chat',
    name: 'Suvalsar Block B14',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suvalsar B14.',
    hostelCluster: 'Suvalsar',
    hostelBlock: 'B14',
    tags: ['NorthCampus', 'Suvalsar', 'B14'],
  },

  // Suraj Taal Cluster
  {
    id: 'hostel-surajtaal-gen',
    slug: 'suraj-taal-general',
    name: 'Suraj Taal Cluster - General',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Master cluster channel for Suraj Taal combining blocks B15, B16, B17, B18, B19.',
    hostelCluster: 'Suraj Taal',
    tags: ['NorthCampus', 'SurajTaal', 'Cluster'],
  },
  {
    id: 'hostel-b15',
    slug: 'b15-chat',
    name: 'Suraj Taal Block B15',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suraj Taal B15.',
    hostelCluster: 'Suraj Taal',
    hostelBlock: 'B15',
    tags: ['NorthCampus', 'SurajTaal', 'B15'],
  },
  {
    id: 'hostel-b16',
    slug: 'b16-chat',
    name: 'Suraj Taal Block B16',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suraj Taal B16.',
    hostelCluster: 'Suraj Taal',
    hostelBlock: 'B16',
    tags: ['NorthCampus', 'SurajTaal', 'B16'],
  },
  {
    id: 'hostel-b17',
    slug: 'b17-chat',
    name: 'Suraj Taal Block B17',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suraj Taal B17.',
    hostelCluster: 'Suraj Taal',
    hostelBlock: 'B17',
    tags: ['NorthCampus', 'SurajTaal', 'B17'],
  },
  {
    id: 'hostel-b18',
    slug: 'b18-chat',
    name: 'Suraj Taal Block B18',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suraj Taal B18.',
    hostelCluster: 'Suraj Taal',
    hostelBlock: 'B18',
    tags: ['NorthCampus', 'SurajTaal', 'B18'],
  },
  {
    id: 'hostel-b19',
    slug: 'b19-chat',
    name: 'Suraj Taal Block B19',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Suraj Taal B19.',
    hostelCluster: 'Suraj Taal',
    hostelBlock: 'B19',
    tags: ['NorthCampus', 'SurajTaal', 'B19'],
  },

  // Chandrataal Cluster
  {
    id: 'hostel-chandrataal-gen',
    slug: 'chandrataal-general',
    name: 'Prashar / Chandrataal - General',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Master cluster channel combining blocks B20, B21, B22, B23, B24.',
    hostelCluster: 'Chandrataal',
    tags: ['NorthCampus', 'Chandrataal', 'Cluster'],
  },
  {
    id: 'hostel-b20',
    slug: 'b20-chat',
    name: 'Chandrataal Block B20',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Block B20.',
    hostelCluster: 'Chandrataal',
    hostelBlock: 'B20',
    tags: ['NorthCampus', 'Chandrataal', 'B20'],
  },
  {
    id: 'hostel-b21',
    slug: 'b21-chat',
    name: 'Chandrataal Block B21',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Block B21.',
    hostelCluster: 'Chandrataal',
    hostelBlock: 'B21',
    tags: ['NorthCampus', 'Chandrataal', 'B21'],
  },
  {
    id: 'hostel-b22',
    slug: 'b22-chat',
    name: 'Chandrataal Block B22',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Block B22.',
    hostelCluster: 'Chandrataal',
    hostelBlock: 'B22',
    tags: ['NorthCampus', 'Chandrataal', 'B22'],
  },
  {
    id: 'hostel-b23',
    slug: 'b23-chat',
    name: 'Chandrataal Block B23',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Block B23.',
    hostelCluster: 'Chandrataal',
    hostelBlock: 'B23',
    tags: ['NorthCampus', 'Chandrataal', 'B23'],
  },
  {
    id: 'hostel-b24',
    slug: 'b24-chat',
    name: 'Chandrataal Block B24',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Block B24.',
    hostelCluster: 'Chandrataal',
    hostelBlock: 'B24',
    tags: ['NorthCampus', 'Chandrataal', 'B24'],
  },

  // Manimahesh Cluster
  {
    id: 'hostel-manimahesh-gen',
    slug: 'manimahesh-general',
    name: 'Manimahesh Cluster - General',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Master cluster channel for Manimahesh hostel blocks B1 to B6.',
    hostelCluster: 'Manimahesh',
    tags: ['NorthCampus', 'Manimahesh', 'Cluster'],
  },
  {
    id: 'hostel-b1',
    slug: 'b1-chat',
    name: 'Manimahesh Block B1',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Manimahesh B1.',
    hostelCluster: 'Manimahesh',
    hostelBlock: 'B1',
    tags: ['NorthCampus', 'Manimahesh', 'B1'],
  },
  {
    id: 'hostel-b2',
    slug: 'b2-chat',
    name: 'Manimahesh Block B2',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Manimahesh B2.',
    hostelCluster: 'Manimahesh',
    hostelBlock: 'B2',
    tags: ['NorthCampus', 'Manimahesh', 'B2'],
  },
  {
    id: 'hostel-b3',
    slug: 'b3-chat',
    name: 'Manimahesh Block B3',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Manimahesh B3.',
    hostelCluster: 'Manimahesh',
    hostelBlock: 'B3',
    tags: ['NorthCampus', 'Manimahesh', 'B3'],
  },
  {
    id: 'hostel-b4',
    slug: 'b4-chat',
    name: 'Manimahesh Block B4',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Manimahesh B4.',
    hostelCluster: 'Manimahesh',
    hostelBlock: 'B4',
    tags: ['NorthCampus', 'Manimahesh', 'B4'],
  },
  {
    id: 'hostel-b5',
    slug: 'b5-chat',
    name: 'Manimahesh Block B5',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Manimahesh B5.',
    hostelCluster: 'Manimahesh',
    hostelBlock: 'B5',
    tags: ['NorthCampus', 'Manimahesh', 'B5'],
  },
  {
    id: 'hostel-b6',
    slug: 'b6-chat',
    name: 'Manimahesh Block B6',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Manimahesh B6.',
    hostelCluster: 'Manimahesh',
    hostelBlock: 'B6',
    tags: ['NorthCampus', 'Manimahesh', 'B6'],
  },

  // Renuka Girls Hostel Cluster
  {
    id: 'hostel-renuka-gen',
    slug: 'renuka-general',
    name: 'Renuka Girls Hostel - General',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Master hostel channel for Renuka Girls Hostel Cluster (G1, G2, G3 / Dashir).',
    hostelCluster: 'Renuka',
    tags: ['NorthCampus', 'Renuka', 'GirlsHostel', 'Cluster'],
  },
  {
    id: 'hostel-g1',
    slug: 'g1-chat',
    name: 'Renuka Block G1',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Renuka G1 residents.',
    hostelCluster: 'Renuka',
    hostelBlock: 'G1',
    tags: ['NorthCampus', 'Renuka', 'G1'],
  },
  {
    id: 'hostel-g2',
    slug: 'g2-chat',
    name: 'Renuka Block G2',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Renuka G2 residents.',
    hostelCluster: 'Renuka',
    hostelBlock: 'G2',
    tags: ['NorthCampus', 'Renuka', 'G2'],
  },
  {
    id: 'hostel-g3',
    slug: 'g3-dashir',
    name: 'Renuka Block G3 (Dashir)',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Unit-level block chat for Renuka G3 / Dashir residents.',
    hostelCluster: 'Renuka',
    hostelBlock: 'G3',
    tags: ['NorthCampus', 'Renuka', 'Dashir', 'G3'],
  },

  // Beas Kund & Gauri Kund
  {
    id: 'hostel-beas-kund',
    slug: 'beas-kund-chat',
    name: 'Beas Kund Hostel',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Hostel channel for Beas Kund hostel residents.',
    hostelCluster: 'Beas Kund',
    tags: ['NorthCampus', 'BeasKund'],
  },
  {
    id: 'hostel-gauri-kund',
    slug: 'gauri-kund-chat',
    name: 'Gauri Kund Hostel',
    category: 'hostels',
    subcategory: 'North Campus',
    campus: 'North',
    description: 'Hostel channel for Gauri Kund hostel residents.',
    hostelCluster: 'Gauri Kund',
    tags: ['NorthCampus', 'GauriKund'],
  },

  // 4. BRANCHES & DEGREE PROGRAMS
  // Undergraduate B.Tech
  {
    id: 'branch-cse',
    slug: 'btech-cse',
    name: 'B.Tech - Computer Science & Engineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Department of Computer Science & Engineering (SCEE) cohort room.',
    tags: ['BTech', 'CSE', 'SCEE', 'Software'],
  },
  {
    id: 'branch-dsai',
    slug: 'btech-dsai',
    name: 'B.Tech - Data Science & Artificial Intelligence',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Data Science & Artificial Intelligence (SCS) student cohort room.',
    tags: ['BTech', 'DSAI', 'AI', 'MachineLearning', 'DataScience'],
  },
  {
    id: 'branch-ee',
    slug: 'btech-ee',
    name: 'B.Tech - Electrical Engineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Electrical Engineering (SCEE) cohort — Power, Embedded Systems, Communications.',
    tags: ['BTech', 'EE', 'SCEE', 'Circuits'],
  },
  {
    id: 'branch-me',
    slug: 'btech-me',
    name: 'B.Tech - Mechanical Engineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'School of Mechanical and Materials Engineering (SMME) Mechanical cohort.',
    tags: ['BTech', 'ME', 'SMME', 'Mechanics'],
  },
  {
    id: 'branch-ce',
    slug: 'btech-ce',
    name: 'B.Tech - Civil Engineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'School of Civil and Environmental Engineering (SCENE) Civil cohort.',
    tags: ['BTech', 'CE', 'SCENE', 'Structures'],
  },
  {
    id: 'branch-vlsi',
    slug: 'btech-vlsi',
    name: 'B.Tech - Microelectronics & VLSI Engineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Semiconductor design, digital & analog VLSI, FPGA, chip tapeout cohort.',
    tags: ['BTech', 'VLSI', 'Microelectronics', 'Semiconductors'],
  },
  {
    id: 'branch-mse',
    slug: 'btech-mse',
    name: 'B.Tech - Materials Science & Engineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Materials synthesis, nanomaterials, metallurgy and polymer cohort.',
    tags: ['BTech', 'MSE', 'Materials', 'Nanotech'],
  },
  {
    id: 'branch-mnc',
    slug: 'btech-mnc',
    name: 'B.Tech - Mathematics & Computing',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Theoretical CS, cryptography, financial mathematics & scientific computing cohort.',
    tags: ['BTech', 'MnC', 'Math', 'Computing', 'Finance'],
  },
  {
    id: 'branch-ep',
    slug: 'btech-ep',
    name: 'B.Tech - Engineering Physics',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Quantum physics, photonics, optics, laser tech and applied physics cohort.',
    tags: ['BTech', 'EP', 'Physics', 'Photonics', 'Optics'],
  },
  {
    id: 'branch-bioeng',
    slug: 'btech-bioeng',
    name: 'B.Tech - Bioengineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Computational biology, biomedical instrumentation, genetic engineering cohort.',
    tags: ['BTech', 'Bioengineering', 'Biotech', 'SBB'],
  },
  {
    id: 'branch-ge',
    slug: 'btech-ge',
    name: 'B.Tech - General Engineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Interdisciplinary General Engineering: AI & Robotics, Mechatronics, Comm Tech, Data Analytics.',
    tags: ['BTech', 'GeneralEngineering', 'Robotics', 'Mechatronics'],
  },
  {
    id: 'branch-chemanalytics',
    slug: 'btech-chemanalytics',
    name: 'B.Tech - Chemical Engg with Data Analytics',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Chemical process optimization, predictive modeling, computational chemistry.',
    tags: ['BTech', 'Chemical', 'DataAnalytics'],
  },
  {
    id: 'branch-quantum',
    slug: 'btech-quantum',
    name: 'B.Tech - Quantum Science & Engineering',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Quantum algorithms, qubits, quantum cryptography and quantum hardware cohort.',
    tags: ['BTech', 'Quantum', 'Physics', 'Computing'],
  },
  {
    id: 'branch-agrianalytics',
    slug: 'btech-agrianalytics',
    name: 'B.Tech - Agricultural Engg with Data Analytics',
    category: 'branches',
    subcategory: 'Undergraduate Engineering (B.Tech)',
    campus: 'Both',
    description: 'Precision agriculture, IoT sensing, drone analytics and soil modeling.',
    tags: ['BTech', 'Agri', 'DataAnalytics', 'IoT'],
  },

  // Undergraduate Sciences & Dual Degrees
  {
    id: 'branch-bs-chem',
    slug: 'bs-chemical',
    name: 'BS in Chemical Sciences',
    category: 'branches',
    subcategory: 'Undergraduate Sciences & Dual Degrees',
    campus: 'Both',
    description: '4-Year Bachelor of Science in Chemical Sciences (SPS) cohort.',
    tags: ['BS', 'Chemistry', 'SPS'],
  },
  {
    id: 'branch-dual-bioeng',
    slug: 'dual-bioeng',
    name: 'Integrated Dual Degree - Bioengineering',
    category: 'branches',
    subcategory: 'Undergraduate Sciences & Dual Degrees',
    campus: 'Both',
    description: '5-Year B.Tech–M.Tech Integrated Dual Degree in Bio-Engineering.',
    tags: ['DualDegree', 'Bioengineering', 'BTechMTech'],
  },
  {
    id: 'branch-imba',
    slug: 'imba',
    name: 'Integrated MBA (IMBA)',
    category: 'branches',
    subcategory: 'Undergraduate Sciences & Dual Degrees',
    campus: 'Both',
    description: '5-Year Integrated Master of Business Administration cohort (School of Management).',
    tags: ['IMBA', 'Management', 'MBA', 'Finance'],
  },

  // Postgraduate & Doctoral
  {
    id: 'branch-mtech-gen',
    slug: 'mtech-general',
    name: 'M.Tech Postgraduate Cohort',
    category: 'branches',
    subcategory: 'Postgraduate & Doctoral',
    campus: 'Both',
    description: 'M.Tech programs across VLSI, CSE, Structural, Power Electronics, Materials, Robotics.',
    tags: ['MTech', 'Postgrad', 'Engineering'],
  },
  {
    id: 'branch-msc-gen',
    slug: 'msc-general',
    name: 'M.Sc Postgraduate Cohort',
    category: 'branches',
    subcategory: 'Postgraduate & Doctoral',
    campus: 'Both',
    description: 'M.Sc in Applied Mathematics, Chemistry, and Physics.',
    tags: ['MSc', 'Sciences', 'Math', 'Physics', 'Chemistry'],
  },
  {
    id: 'branch-mgmt-humanities',
    slug: 'mgmt-humanities',
    name: 'Management & Humanities (MBA / MA)',
    category: 'branches',
    subcategory: 'Postgraduate & Doctoral',
    campus: 'Both',
    description: 'MBA in Data Science & AI, MA in Development Studies (SHSS / SOM).',
    tags: ['MBA', 'MA', 'Management', 'Humanities'],
  },
  {
    id: 'branch-research-scholars',
    slug: 'research-scholars',
    name: 'Research Scholars (M.S. & Ph.D.)',
    category: 'branches',
    subcategory: 'Postgraduate & Doctoral',
    campus: 'Both',
    description: 'Ph.D. Scholars and M.S. (by Research) students across CAIR, IKSMHA & all academic schools.',
    tags: ['PhD', 'MSResearch', 'Scholars', 'CAIR'],
  },

  // 5. MESSES
  // North Campus Messes
  {
    id: 'mess-pine',
    slug: 'pine-mess',
    name: 'Pine Mess (North Dining 1)',
    category: 'messes',
    subcategory: 'North Campus Messes',
    campus: 'North',
    description: 'Operational dining channel for Pine Mess (Alders / North Dining Hall 1) — menus, feedback & rebate coordination.',
    tags: ['NorthCampus', 'Mess', 'Pine', 'Dining'],
  },
  {
    id: 'mess-oak',
    slug: 'oak-mess',
    name: 'Oak Mess (North Dining 2)',
    category: 'messes',
    subcategory: 'North Campus Messes',
    campus: 'North',
    description: 'Operational dining channel for Oak Mess (North Dining Hall 2) — menus, feedback & rebate coordination.',
    tags: ['NorthCampus', 'Mess', 'Oak', 'Dining'],
  },
  {
    id: 'mess-alder',
    slug: 'alder-mess',
    name: 'Alder Mess',
    category: 'messes',
    subcategory: 'North Campus Messes',
    campus: 'North',
    description: 'Operational dining channel for Alder Mess in North Campus.',
    tags: ['NorthCampus', 'Mess', 'Alder', 'Dining'],
  },
  {
    id: 'mess-cedar',
    slug: 'cedar-mess',
    name: 'Cedar Mess',
    category: 'messes',
    subcategory: 'North Campus Messes',
    campus: 'North',
    description: 'Operational dining channel for Cedar Mess in North Campus.',
    tags: ['NorthCampus', 'Mess', 'Cedar', 'Dining'],
  },

  // South Campus Mess
  {
    id: 'mess-maple',
    slug: 'maple-mess',
    name: 'Maple Mess (South Dining)',
    category: 'messes',
    subcategory: 'South Campus Messes',
    campus: 'South',
    description: 'Operational dining channel for Maple Mess (South Campus Dining Hall) — menus, feedback & rebate coordination.',
    tags: ['SouthCampus', 'Mess', 'Maple', 'Dining'],
  },
];

// Seed Events for Unified Gymkhana Calendar
export const SEED_EVENTS: CampusEvent[] = [
  {
    id: 'event-1',
    title: 'Frosthack 2026: Opening Keynote & Team Formation',
    description: 'Kickoff ceremony for the 36-hour student hackathon, sponsor problem releases, API key distribution & mentorship briefings.',
    category: 'Fest Event',
    organizer: 'Frosthack & KamandPrompt',
    venue: 'Auditorium A1/A2',
    date: '2026-10-12',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    status: 'approved',
    createdAt: '2026-10-09T00:00:00Z',
  },
  {
    id: 'event-2',
    title: 'KamandPrompt: Graph Algorithms & Dynamic Programming Sprint',
    description: 'Intensive competitive programming workshop focusing on shortest paths, max-flow, DP state compression & Codeforces problem solving.',
    category: 'Club Workshop',
    organizer: 'KamandPrompt',
    venue: 'A13 Hall',
    date: '2026-10-13',
    startTime: '05:30 PM',
    endTime: '08:30 PM',
    status: 'approved',
    createdAt: '2026-10-09T00:00:00Z',
  },
  {
    id: 'event-3',
    title: 'Robotronics: Autonomous Mobile Robots with ROS2 & SLAM',
    description: 'Hands-on hardware session with LiDAR sensor integration on TurtleBot platforms and real-time mapping.',
    category: 'Club Workshop',
    organizer: 'Robotronics',
    venue: 'SCEE Seminar Hall',
    date: '2026-10-14',
    startTime: '03:00 PM',
    endTime: '06:00 PM',
    status: 'approved',
    createdAt: '2026-10-09T00:00:00Z',
  },
  {
    id: 'event-4',
    title: 'Exodia 2026: Inter-College Western Band Prelims',
    description: 'Live band showdown across 8 university teams for the Exodia rock battle finals.',
    category: 'Fest Event',
    organizer: 'Music Club & SAC',
    venue: 'South Campus Grounds',
    date: '2026-10-16',
    startTime: '06:00 PM',
    endTime: '10:00 PM',
    status: 'approved',
    createdAt: '2026-10-09T00:00:00Z',
  },
  {
    id: 'event-5',
    title: 'Rann-Neeti Inter-Hostel Football Cup - Semifinals',
    description: 'Suraj Taal Cluster vs. Parashar Hostel - floodlight match on the Kamand sports ground.',
    category: 'Sports Tournament',
    organizer: 'Sports Society',
    venue: 'South Campus Grounds',
    date: '2026-10-17',
    startTime: '04:30 PM',
    endTime: '07:30 PM',
    status: 'approved',
    createdAt: '2026-10-09T00:00:00Z',
  },
];

// Seed Complaints & Maintenance Tickets
export const SEED_TICKETS: CampusTicket[] = [
  {
    id: 'ticket-1',
    title: 'High-loss Wi-Fi dropouts on Suraj Taal B18 2nd Floor',
    description: 'AP-B18-2F disconnects every 5 minutes during peak evening study hours (9 PM - 1 AM). Constant packet loss on academic portals.',
    scope: 'hostel',
    category: 'Wi-Fi Dropouts',
    campus: 'North',
    clusterOrMess: 'Suraj Taal',
    specificLocation: 'Suraj Taal B18 - Corridors 201-220',
    status: 'Under Investigation',
    upvotes: 42,
    upvotedBy: [],
    createdBy: 'b26419',
    creatorName: 'Divyansh Jain',
    createdAt: '2026-10-08T18:00:00Z',
  },
  {
    id: 'ticket-2',
    title: 'Geyser tripping main circuit breaker in Parashar Block P2 Wing A',
    description: 'Central geyser heating coil is shorting out the wing MCB when turned on before 7 AM. No hot water for morning classes.',
    scope: 'hostel',
    category: 'Geyser Issues',
    campus: 'South',
    clusterOrMess: 'Parashar',
    specificLocation: 'Parashar P2 - 1st Floor Washroom Wing A',
    status: 'Reported',
    upvotes: 28,
    upvotedBy: [],
    createdBy: 'b26012',
    creatorName: 'Aarav Sharma',
    createdAt: '2026-10-08T22:30:00Z',
  },
  {
    id: 'ticket-3',
    title: 'Oak Mess: Dinner paneer shortage on Friday and curd freshness',
    description: 'Paneer subzi ran out at 8:40 PM before third-year lab batches arrived. Also curd was slightly sour.',
    scope: 'mess',
    category: 'Food Quality',
    campus: 'North',
    clusterOrMess: 'Oak Mess',
    specificLocation: 'Oak Mess (North Dining 2) - Counter 1',
    status: 'Under Investigation',
    upvotes: 35,
    upvotedBy: [],
    createdBy: 'b26105',
    creatorName: 'Rohan Verma',
    createdAt: '2026-10-08T21:15:00Z',
  },
  {
    id: 'ticket-4',
    title: 'Plumbing leak near washing machine outlet in Suvalsar B12 Ground Floor',
    description: 'Drainage pipe from the laundry room is overflowing into the corridor after heavy rain.',
    scope: 'hostel',
    category: 'Plumbing',
    campus: 'North',
    clusterOrMess: 'Suvalsar',
    specificLocation: 'Suvalsar B12 - Ground Floor Laundry',
    status: 'Resolved by Warden/Caretaker',
    upvotes: 19,
    upvotedBy: [],
    createdBy: 'b26084',
    creatorName: 'Priya Patel',
    createdAt: '2026-10-07T14:00:00Z',
    resolvedAt: '2026-10-08T16:00:00Z',
  },
];

// Seed Moodle Academic Synchronizations
export const SEED_MOODLE_DATA: Record<string, MoodleAssignment[]> = {
  'IC152': [
    {
      id: 'moodle-ic152-1',
      courseCode: 'IC152',
      title: 'Lab 4: Data Analysis with Pandas & Matplotlib',
      description: 'Implement dataframe aggregations, handling missing data, and generate time-series distribution plots for Himalayan meteorological dataset.',
      type: 'assignment',
      dueDate: 'Sunday, 11:59 PM',
      weightage: '5% of Course Total',
      moodleUrl: 'https://moodle.iitmandi.ac.in/mod/assign/view.php?id=49201',
      status: 'pending',
    },
    {
      id: 'moodle-ic152-2',
      courseCode: 'IC152',
      title: 'Quiz 2: Time Complexity & Recursion Trees',
      description: '30-minute online Moodle quiz covering master theorem, binary recursion, and amortized array resizing.',
      type: 'quiz',
      dueDate: 'Thursday, 06:00 PM',
      weightage: '10% of Course Total',
      moodleUrl: 'https://moodle.iitmandi.ac.in/mod/quiz/view.php?id=49205',
      status: 'pending',
    },
  ],
  'CS302': [
    {
      id: 'moodle-cs302-1',
      courseCode: 'CS302',
      title: 'Assignment 2: B+ Tree Index Engine in C++',
      description: 'Implement node splitting, redistribution, and point/range queries for a disk-backed B+ tree index structure.',
      type: 'assignment',
      dueDate: 'Next Friday, 11:59 PM',
      weightage: '12% of Course Total',
      moodleUrl: 'https://moodle.iitmandi.ac.in/mod/assign/view.php?id=51290',
      status: 'pending',
    },
    {
      id: 'moodle-cs302-2',
      courseCode: 'CS302',
      title: 'Mid-Sem Examination Seating Plan & Syllabus',
      description: 'Chapters 1-7 (Relational Algebra, SQL, Normalization to BCNF, Storage Hierarchy). Venue: A1-N1 & A1-N2.',
      type: 'announcement',
      dueDate: 'Exam on Oct 20',
      moodleUrl: 'https://moodle.iitmandi.ac.in/mod/forum/view.php?id=51299',
      status: 'graded',
    },
  ],
  'EE201': [
    {
      id: 'moodle-ee201-1',
      courseCode: 'EE201',
      title: 'Problem Set 3: Continuous-Time Fourier Transforms',
      description: 'Solve problems on duality property, convolution in frequency domain, and ideal lowpass filter impulse responses.',
      type: 'assignment',
      dueDate: 'Friday, 05:00 PM',
      weightage: '4% of Course Total',
      moodleUrl: 'https://moodle.iitmandi.ac.in/mod/assign/view.php?id=38190',
      status: 'pending',
    },
  ],
  'IC110': [
    {
      id: 'moodle-ic110-1',
      courseCode: 'IC110',
      title: 'Lab 3: Thevenin and Norton Equivalent Circuits',
      description: 'Experimental verification of equivalent resistance and open-circuit voltage on hardware breadboards in South Campus lab.',
      type: 'lab',
      dueDate: 'Wednesday, 02:00 PM',
      moodleUrl: 'https://moodle.iitmandi.ac.in/mod/assign/view.php?id=28401',
      status: 'pending',
    },
  ],
};

// Daily Mess Menus
export const SEED_MESS_MENUS: Record<string, MessDayMenu> = {
  'pine-mess': {
    messName: 'Pine Mess (North Dining 1)',
    day: 'Today (Friday)',
    breakfast: 'Aloo Paratha with Butter, Curd, Poha, Boiled Eggs / Omelette, Tea & Coffee',
    lunch: 'Rajma Madra, Steamed Basmati Rice, Jeera Aloo, Mix Dal, Fresh Salad, Boondi Raita, Gulab Jamun',
    snacks: 'Samosa with Mint & Imli Chutney, Masala Chai, Biscuits',
    dinner: 'Paneer Butter Masala / Chicken Curry, Butter Naan & Tandoori Roti, Dal Makhani, Pulao, Kheer',
    specialNotice: 'Special Himachali Dham dinner scheduled for this Sunday night.',
  },
  'oak-mess': {
    messName: 'Oak Mess (North Dining 2)',
    day: 'Today (Friday)',
    breakfast: 'Idli, Medu Vada, Sambar, Coconut Chutney, Bread Jam, Banana, Coffee / Tea',
    lunch: 'Dal Tadka, Dum Aloo Kashmiri, Rice, Phulka, Cucumber Raita, Fresh Cut Papaya',
    snacks: 'Bread Pakora, Hot Tea & Coffee',
    dinner: 'Shahi Paneer / Egg Curry, Chapati, Dal Fry, Jeera Rice, Sewaiyan',
    specialNotice: 'Rebate applications for Diwali vacation open from Monday on the intranet portal.',
  },
  'alder-mess': {
    messName: 'Alder Mess',
    day: 'Today (Friday)',
    breakfast: 'Puri Bhaji, Sprouted Moong, Boiled Eggs, Tea / Coffee',
    lunch: 'Kadhi Pakora, Steamed Rice, Bhindi Masala, Roti, Salad',
    snacks: 'Veg Cutlets with Sauce, Tea',
    dinner: 'Mix Veg, Dal Palak, Phulka, Rice, Moong Dal Halwa',
  },
  'cedar-mess': {
    messName: 'Cedar Mess',
    day: 'Today (Friday)',
    breakfast: 'Gobhi Paratha, Curd, Omelette, Cornflakes with Milk, Tea',
    lunch: 'Chole Bhature, Boondi Raita, Onion Salad, Rice',
    snacks: 'Bhel Puri, Green Tea & Masala Chai',
    dinner: 'Matar Paneer / Chicken Biryani, Raita, Roti, Ice Cream',
  },
  'maple-mess': {
    messName: 'Maple Mess (South Dining)',
    day: 'Today (Friday)',
    breakfast: 'Masala Dosa with Sambar, Coconut & Tomato Chutney, Boiled Eggs, Tea & Filter Coffee',
    lunch: 'Chana Masala, Aloo Gobi, Dal Fry, Steamed Rice, Roti, Curd, Sweet Boondi',
    snacks: 'Pav Bhaji with Butter, Hot Chai',
    dinner: 'Kadai Paneer / Mutton Curry, Dal Tadka, Tandoori Roti, Peas Pulao, Rasgulla',
    specialNotice: 'Breakfast extended by 30 minutes on Saturday & Sunday (8:00 AM - 10:00 AM).',
  },
};

// Coordinator and Admin Registry
// In a full production deployment, this synchronizes with LDAP/Gymkhana Council lists.
export const GYMKHANA_ADMIN_ROLLS = new Set([
  'admin',
  'gymkhana',
  'sntc_secy',
  'sac_secy',
  'sports_secy',
  'warden',
  'caretaker',
]);

// Map of room slugs to designated coordinator roll numbers/usernames
export const ROOM_ADMINS: Record<string, string[]> = {
  // SnTC Clubs
  'kamandprompt': ['b22001', 'b23419', 'admin', 'sntc_secy'],
  'robotronics': ['b22015', 'admin', 'sntc_secy'],
  'yantrik': ['b22080', 'admin', 'sntc_secy'],
  'sae': ['b22095', 'admin', 'sntc_secy'],
  'stac': ['b22110', 'admin', 'sntc_secy'],
  'scri': ['b22120', 'admin', 'sntc_secy'],
  // SAC Clubs
  'music-club': ['b23101', 'admin', 'sac_secy'],
  'dance-vibrance': ['b23112', 'admin', 'sac_secy'],
  'drama-artgeeks': ['b23125', 'admin', 'sac_secy'],
  'literary-society': ['b23130', 'admin', 'sac_secy'],
  'perception': ['b23145', 'admin', 'sac_secy'],
  'design-fine-arts': ['b23150', 'admin', 'sac_secy'],
  // Fests & Committees
  'exodia': ['b22050', 'admin', 'sac_secy'],
  'frosthack': ['b22001', 'b23419', 'admin', 'sntc_secy'],
  'rann-neeti': ['b22070', 'admin', 'sports_secy'],
  'e-cell': ['b22085', 'admin'],
  'nss-ruvaab': ['b22090', 'admin'],
  // Courses
  'ic152': ['faculty_ic152', 'ta_ic152', 'b23419', 'admin'],
  'cs302': ['faculty_cs302', 'ta_cs302', 'admin'],
  'ee201': ['faculty_ee201', 'ta_ee201', 'admin'],
  'ic110': ['faculty_ic110', 'ta_ic110', 'admin'],
  // Hostels (Wardens & Caretakers)
  'b18-chat': ['warden_surajtaal', 'caretaker_b18', 'admin'],
  'suraj-taal-general': ['warden_surajtaal', 'admin'],
  'suvalsar-general': ['warden_suvalsar', 'admin'],
  'p2-chat': ['warden_parashar', 'caretaker_p2', 'admin'],
  'parashar-general': ['warden_parashar', 'admin'],
  // Messes (Dining Wardens & Committee)
  'pine-mess': ['warden_mess_north', 'caretaker_pine', 'admin'],
  'oak-mess': ['warden_mess_north', 'caretaker_oak', 'admin'],
  'maple-mess': ['warden_mess_south', 'caretaker_maple', 'admin'],
};

type CampusActor = { email?: string; username?: string; id?: string; email_confirmed_at?: string; app_metadata?: { [key: string]: unknown; campus_rooms?: string[] } };
export function extractRollFromUser(user?: CampusActor | null): string {
  if (!user) return '';
  // Profile usernames are editable; elevated campus roles require a verified institute address.
  if (!user.email_confirmed_at) return '';
  const match = user.email?.toLowerCase().match(/^([^@]+)@(students\.iitmandi\.ac\.in|iitmandi\.ac\.in)$/);
  if (match) return match[1] || '';
  return '';
}

export function isCampusRoomAdmin(
  roomSlug: string,
  user?: CampusActor | null,
  isConvOwner?: boolean
): boolean {
  if (!user) return false;
  if (user.app_metadata?.campus_rooms?.includes(roomSlug)) return true;
  // If user is conversation owner, they are an admin
  if (isConvOwner && extractRollFromUser(user)) return true;

  const roll = extractRollFromUser(user);
  if (!roll) return false;

  // Gymkhana Council & System Admins have overarching privileges
  if (GYMKHANA_ADMIN_ROLLS.has(roll)) return true;

  // Check specific room registry
  const admins = ROOM_ADMINS[roomSlug];
  if (admins && admins.includes(roll)) return true;

  return false;
}

export function canManageEvents(
  user?: CampusActor | null,
  organizer?: string,
  isConvOwner?: boolean
): boolean {
  if (!user) return false;
  const managedRoom = CAMPUS_ROOMS.find(room => room.name.toLowerCase() === organizer?.toLowerCase() || room.slug === organizer?.toLowerCase());
  if (managedRoom && user.app_metadata?.campus_rooms?.includes(managedRoom.slug)) return true;
  if (isConvOwner && extractRollFromUser(user)) return true;

  const roll = extractRollFromUser(user);
  if (GYMKHANA_ADMIN_ROLLS.has(roll)) return true;

  if (organizer) {
    const slug = CAMPUS_ROOMS.find(room => room.name.toLowerCase() === organizer.toLowerCase() || room.slug === organizer.toLowerCase())?.slug || organizer.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const admins = ROOM_ADMINS[slug];
    if (admins && admins.includes(roll)) return true;
  }
  return false;
}

export function canResolveTickets(
  user?: CampusActor | null,
  scope?: string,
  clusterOrMess?: string,
  isConvOwner?: boolean
): boolean {
  if (!user) return false;
  if (CAMPUS_ROOMS.some(room => user.app_metadata?.campus_rooms?.includes(room.slug) &&
    (scope === 'mess' ? room.category === 'messes' : room.category === 'hostels') &&
    [room.name, room.slug, room.hostelCluster].some(value => value?.toLowerCase().replace(/\s*\(.*/, '') === clusterOrMess?.toLowerCase().replace(/\s*\(.*/, '')))) return true;
  if (isConvOwner && extractRollFromUser(user)) return true;

  const roll = extractRollFromUser(user);
  if (GYMKHANA_ADMIN_ROLLS.has(roll)) return true;

  if (clusterOrMess) {
    const room = CAMPUS_ROOMS.find(room => (room.category === 'messes' ? 'mess' : 'hostel') === scope && (room.name.toLowerCase() === clusterOrMess.toLowerCase() || room.slug === clusterOrMess.toLowerCase() || room.hostelCluster?.toLowerCase() === clusterOrMess.toLowerCase()));
    const slug = room?.slug || clusterOrMess.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const admins = ROOM_ADMINS[slug];
    if (admins && admins.includes(roll)) return true;
  }
  return false;
}

export function canBroadcastMoodle(
  user?: CampusActor | null,
  courseCode?: string,
  isConvOwner?: boolean
): boolean {
  if (!user) return false;
  if (isConvOwner && extractRollFromUser(user)) return true;

  const roll = extractRollFromUser(user);
  if (GYMKHANA_ADMIN_ROLLS.has(roll)) return true;

  if (courseCode) {
    const slug = courseCode.toLowerCase();
    const admins = ROOM_ADMINS[slug];
    if (admins && admins.includes(roll)) return true;
  }
  return false;
}
