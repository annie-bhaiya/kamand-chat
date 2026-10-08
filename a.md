We now have to add campus-specific features. The app will be organized into the following scoped rooms:

### 1. CLUBS & SOCIETIES

Organized under the **Student Gymkhana** councils and student bodies:

* **Technical Society (SnTC):**
* *KamandPrompt* (Competitive Programming, Algorithms & Web Dev)
* *Robotronics* (Robotics, Automation & Embedded Systems)
* *Yantrik* (Mechanical Design, 3D Printing & CAD)
* *SAE* (Automotive Engineering & Racing)
* *STAC* (Astronomy, Astrophysics & Physics)
* *SCRI* (Society for Collaborative Research and Innovation)


* **Cultural Society (SAC):**
* *Music Club*
* *Dance Club (Vibrance)*
* *Drama Club (ArtGeeks / Thespians)*
* *Literary Society* (Debating, Quizzing, Creative Writing)
* *Perception* (Photography & Cinematography)
* *Design & Fine Arts*


* **Sports Society:** Dedicated rooms for *Football, Cricket, Basketball, Badminton, Table Tennis, Lawn Tennis, Volleyball, Athletics, Chess, and Mountain Biking (MTB)*.
* **Fests & Special Committees:**
* *Exodia* (Annual Cultural Fest)
* *Frosthack* (Flagship Student Hackathon)
* *Rann-Neeti* (Annual Inter-College Sports Fest)
* *E-Cell* (Entrepreneurship Cell)
* *NSS (National Service Scheme)* & *Ruvaab*



---

### 2. COURSES

Dynamic, semester-specific channels auto-enrolled by course registration code:

* **Institute Core / Foundation:** *IC110 (Electrical Science)*, *IC152 (Computing & Data Science)*, *IC252 (Probability & Statistics)*, *IC160*, *IC221*.
* **Department Core & Electives:** e.g., *CS302 (Database Systems)*, *EE201 (Signals & Systems)*, *ME301 (Fluid Mechanics)*, *CE301 (Structural Analysis)*.
* **Practicum Courses:** *DP201/DP301 (Interactive Socio-Technical Practicum - ISTP / Design Practicum)*.

---

### 3. HOSTELS

Organized hierarchically across **North Campus** and **South Campus** by **Hostel Blocks** and **Hostel Clusters**:

* **South Campus:**
* *Parashar Hostel* (Blocks: P1, P2, P3, P4)
* *Nako Hostel*


* **North Campus:**
* *Suvalsar Cluster* (Blocks: B11, B12, B13, B14)
* *Suraj Taal Cluster* (Blocks: B15, B16, B17, B18, B19)
* *Prashar / Chandrataal Cluster* (Blocks: B20, B21, B22, B23, B24)
* *Manimahesh Cluster* (Blocks: B1, B2, B3, B4, B5, B6)
* *Renuka Girls Hostel Cluster* (Blocks: G1, G2, G3 / Dashir)
* *Beas Kund & Gauri Kund Hostels*


* **Chat Structure:**
* **Unit-level:** Individual block channels (e.g., `#B18-chat`, `#B15-chat`, `#P2-chat`).
* **Cluster-level:** Master hostel channels combining constituent blocks (e.g., `#Suraj-Taal-General`, `#Suvalsar-General`, `#Chandrataal-General`).



---

### 4. BRANCHES & DEGREE PROGRAMS

Organized by academic cohorts across schools (SCEE, SMME, SCENE, SBB, SPS, SCS, SMSS, and SHSS):

* **Undergraduate Engineering & Technology (B.Tech):**
* *Computer Science & Engineering (CSE)*
* *Data Science & Artificial Intelligence (DSAI)*
* *Electrical Engineering (EE)*
* *Mechanical Engineering (ME)*
* *Civil Engineering (CE)*
* *Microelectronics & VLSI Engineering*
* *Materials Science & Engineering (MSE)*
* *Mathematics & Computing (MnC)*
* *Engineering Physics (EP)*
* *Bioengineering*
* *General Engineering (GE)* (Specialization tracks: AI & Robotics, Mechatronics, Communication Tech, Data Analytics for Management & Finance)
* *Chemical Engineering with Data Analytics*
* *Quantum Science & Engineering*
* *Agricultural Engineering with Data Analytics*


* **Undergraduate Sciences & Dual Degrees:**
* *BS in Chemical Sciences* (4-Year)
* *B.Tech–M.Tech Integrated Dual Degree in Bio-Engineering* (5-Year)
* *Integrated Master of Business Administration (IMBA)*


* **Postgraduate & Doctoral:**
* *M.Tech:* VLSI, Computer Science & Engineering, Structural Engineering, Power Electronics & Drives, Materials & Energy Engineering, Biotechnology, Robotics.
* *M.Sc:* Applied Mathematics, Chemistry, Physics.
* *Management & Humanities:* MBA (Data Science & AI), MA (Development Studies).
* *Research Scholars:* M.Tech (Research), M.S. (by Research), and Ph.D. scholars across academic schools and research centers (CAIR, IKSMHA).



---

### 5. MESSES

Operational channels split across campuses for daily menus, rebate coordination, and feedback:

* **North Campus:**
* *Pine Mess* (Alders / North Dining Hall 1)
* *Oak Mess* (North Dining Hall 2)
* *Alder Mess*
* *Cedar Mess*


* **South Campus:**
* *Maple Mess* (South Dining Hall)



---

### SPECIAL FUNCTIONAL REQUIREMENTS

* **Clubs, Fests & Branches (Event Management System):**
* **In-App Event Booking Forms:** Society heads and branch representatives can submit event proposals directly within their room, reserving venues (*Auditorium A1/A2*, *A13 Hall*, *South Campus Grounds*, *SCEE Seminar Hall*).
* **Unified Gymkhana Calendar:** A centralized calendar view visible to all students, preventing scheduling conflicts across club workshops, fests (*Exodia*, *Frosthack*), sports tournaments, and placement talks.


* **Hostels & Messes (Problem + Solution / Ticket Management):**
* **Maintenance & Complaint Ticketing:** Threaded issue tracking for infrastructure faults (Wi-Fi dropouts, geyser issues, plumbing, carpentry) and mess complaints (food quality, menu adjustments, shortage).
* **Status Tracking & Upvoting:** Real-time statuses (`Reported`, `Under Investigation`, `Resolved by Warden/Caretaker`) with an upvote mechanism so common wing/block complaints aggregate higher on administrative dashboards.


* **Courses & Academics (Moodle Integration):**
* **LMS Synchronization:** Automated webhook integration with the **IIT Mandi Moodle** instance (`moodle.iitmandi.ac.in`).
* **Automated Academic Broadcasts:** Course channels automatically receive bot alerts for newly assigned submissions, quiz reminders, lab schedule updates, and grade postings.
