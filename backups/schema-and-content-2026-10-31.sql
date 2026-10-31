-- Sanitized export of rishav-portfolio (schema + public content only).
-- Generated 2026-10-31 from production D1. Personal rows (contact messages,
-- login attempts, AirShare presence/signals/joins) are intentionally omitted.
-- The full local backup is git-ignored and stays at backups/rishav-portfolio-2026-10-31.sql.

PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_init.sql','2026-10-30 19:57:59');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0002_airshare.sql','2026-10-30 20:38:50');
CREATE TABLE site_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  document TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO "site_content" ("id","document","updated_at") VALUES(1,'{"version":1,"socials":[{"label":"GitHub","handle":"@Rishav0523","href":"https://github.com/Rishav0523"},{"label":"LinkedIn","handle":"rishav-prasad","href":"https://www.linkedin.com/in/rishav-prasad-/"},{"label":"Instagram","handle":"@____.rishav","href":"https://www.instagram.com/____.rishav"}],"education":[{"degree":"B.Tech, Computer Science and Engineering","institution":"Cooch Behar Government Engineering College","period":"2024 – 2028 (expected)","score":"8.5 / 10","scoreLabel":"Current CGPA","location":"Cooch Behar, West Bengal","notes":["Third-year undergraduate","Areas of interest: software development, database systems, cybersecurity"],"current":true},{"degree":"Higher Secondary (Class XII)","institution":"Delhi Public School, Siliguri","period":"2023","board":"Central Board of Secondary Education (CBSE)","score":"92.4%","scoreLabel":"Aggregate","location":"Siliguri, West Bengal","notes":["CBSE board examination"]},{"degree":"Secondary (Class X)","institution":"Delhi Public School, Siliguri","period":"2021","board":"Central Board of Secondary Education (CBSE)","score":"69.8%","scoreLabel":"Aggregate","location":"Siliguri, West Bengal","notes":["CBSE board examination"]}],"skillGroups":[{"title":"Programming languages","icon":"code","description":"Languages I have written real coursework and practice programs in.","items":["C","Python","Java"]},{"title":"Web development","icon":"globe","description":"The fundamentals I build interfaces with, without a framework hiding the details.","items":["HTML5","CSS3","JavaScript"]},{"title":"Databases","icon":"database","description":"Where the data behind a project lives, and how I query it.","items":["MySQL"]}],"domains":["Software Development","Full-Stack Web Development","Cybersecurity","Artificial Intelligence","Database Systems","Computer Science and Emerging Technologies"],"leadership":[{"role":"Joint Secretary","org":"Entrepreneurship Cell (E-Cell), Cooch Behar Government Engineering College","period":"2026 – Present","icon":"rocket","summary":"Contributing to the institution''s entrepreneurship ecosystem and coordinating initiatives that encourage innovation and entrepreneurial thinking among students.","points":["Contributed to organising Illuminate 2026, an entrepreneurship workshop run with E-Cell IIT Bombay.","Helped run entrepreneurship-focused events, workshops, competitions and student engagement initiatives.","Contributed to institutional entrepreneurship initiatives and annual report documentation.","Participated in National Entrepreneurship Challenge (NEC) activities organised by E-Cell IIT Bombay.","Coordinated with students, mentors, faculty members and external stakeholders."]},{"role":"Joint Secretary","org":"Institution''s Innovation Council (IIC), Cooch Behar Government Engineering College","period":"2025 – Present","icon":"lightbulb","summary":"Helping run the institution''s innovation and startup-focused programmes, from idea-stage activities to student research initiatives.","points":["Facilitate innovation and startup-related activities within the institution.","Coordinate programmes promoting entrepreneurship, research and student innovation."]},{"role":"In-Charge","org":"Tech-O-Nicks — the official technical club of CGEC","period":"2026 – Present","icon":"terminal","summary":"Working towards a collaborative technical learning environment where students explore technology through practical learning rather than slides.","points":["Coordinating technical activities across robotics, electronics, web development, C++ and Python.","Guiding and coordinating the extended core team.","Contributed to the club''s induction programme and technical workshops.","Supporting recruitment, team development and technical learning initiatives.","Encouraging collaboration, knowledge sharing and practical project development among students."]},{"role":"Overall Coordinator, Smart India Hackathon 2026","org":"Cooch Behar Government Engineering College — institutional level","period":"2026","icon":"megaphone","summary":"Contributed to organising the institutional-level SIH 2026 selection and preliminary pitching round.","points":["Coordinated the preliminary pitching round and related event operations.","Managed communication and coordination with participating teams.","Coordinated with faculty members and evaluators.","Assisted with scheduling, event management and execution.","Helped keep the institutional selection process organised and smooth."]},{"role":"Reporter & Social Media Handler","org":"CGEC Times — Cooch Behar Government Engineering College","period":"2024 – 2026","icon":"newspaper","summary":"Covered campus events and kept the college publication''s social channels updated with timely reporting.","points":["Managed college social media announcements and updates.","Reported campus happenings and ensured timely communication.","Coordinated with team members for content creation."]}],"journey":[{"year":"2021","title":"Class X, CBSE","detail":"Delhi Public School, Siliguri — 69.8%"},{"year":"2023","title":"Class XII, CBSE","detail":"Delhi Public School, Siliguri — 92.4%"},{"year":"2024","title":"Started B.Tech CSE","detail":"Cooch Behar Government Engineering College"},{"year":"2026","title":"Student leadership","detail":"Joint Secretary of E-Cell, In-Charge of Tech-O-Nicks, SIH 2026 coordinator"},{"year":"2028","title":"Graduating (expected)","detail":"B.Tech Computer Science and Engineering — CGPA 8.5 / 10"}],"projects":[{"slug":"online-examination-and-proctoring-system","title":"Online Examination and Proctoring System","status":"In development","summary":"A web-based examination platform with proctoring, built on HTML, CSS, JavaScript and MySQL.","detail":"The backend and final implementation details are still being finalised. Features, screenshots and links will be added here once the build is complete.","stack":["HTML","CSS","JavaScript","MySQL"]},{"slug":"online-learning-platform","title":"Online Learning Platform","status":"Completed","summary":"A web-based learning platform with a login flow, course browsing and structured course material.","detail":"Built a responsive interface for managing courses and delivering organised learning content, with user login and course browsing as the core flows.","stack":["HTML","CSS","JavaScript","Python"]},{"slug":"expense-splitter-app","title":"Expense Splitter App","status":"Completed","summary":"An expense-sharing app that splits costs automatically and tracks who owes what.","detail":"Add shared expenses, split amounts between users and settle balances, with a focus on simple, accurate expense management.","stack":["HTML","CSS","JavaScript","Python"]}],"achievements":[{"title":"Illuminate 2026","category":"Event organising","role":"Joint Secretary · E-Cell CGEC","period":"2026","detail":"Contributed to organising an entrepreneurship workshop run with E-Cell IIT Bombay."},{"title":"Smart India Hackathon 2026 — institutional round","category":"Event organising","role":"Overall Coordinator","period":"2026","detail":"Coordinated the preliminary pitching round, participant communication, scheduling and event operations."},{"title":"Tech-O-Nicks technical programme","category":"Leadership","role":"In-Charge · Tech-O-Nicks","period":"2026 – Present","detail":"Contributed to the club''s induction programme and technical workshops, and guides the extended core team."}],"awards":[{"title":"CGEC Esperanza 2025 — Robosoccer & Robosumo","result":"Winner","period":"2025","team":"Team ROBOMATES"},{"title":"ByteBurst Hackathon 2025","result":"Runner-up","period":"2025","team":"Team THE ERROR"},{"title":"Smart India Hackathon 2024","result":"Participant","period":"2024"},{"title":"Smart India Hackathon 2025","result":"Participant","period":"2025"},{"title":"Ideathon at Inzio, IIIT Guwahati","result":"Participant"}],"certifications":[{"title":"Programming, Data Structures and Algorithms using Python","issuer":"NPTEL","year":"2026","detail":"8-week course · 70% · 3 recommended credits","href":"/certifications/nptel-pdsa-python-2026.pdf"}],"resumeSummary":"Third-year Computer Science and Engineering student at Coochbehar Government Engineering College, building for the web and coordinating technical communities. Currently developing an online examination and proctoring system, and serving as Joint Secretary of E-Cell CGEC, Joint Secretary of the Institution''s Innovation Council and In-Charge of Tech-O-Nicks.","resumePdf":{"href":"/resume/rishav-prasad-resume.pdf","approvedForPublish":true},"profileFacts":[{"label":"Studying","value":"B.Tech. CSE · 3rd year"},{"label":"CGPA","value":"8.5 / 10"},{"label":"Based in","value":"Cooch Behar, West Bengal"},{"label":"Leadership","value":"E-Cell · Tech-O-Nicks · SIH 2026"}]}','2026-10-30T22:16:27.207Z');
CREATE TABLE contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE media (
  key TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
CREATE TABLE airshare_peers (
  room_id TEXT NOT NULL,
  peer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (room_id, peer_id)
);
CREATE TABLE airshare_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  from_peer TEXT NOT NULL,
  to_peer TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE airshare_join_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_contact_messages_created
  ON contact_messages (created_at);
CREATE INDEX idx_contact_messages_ip_created
  ON contact_messages (ip_hash, created_at);
CREATE INDEX idx_login_attempts_ip
  ON login_attempts (ip_hash, attempted_at);
CREATE INDEX idx_airshare_peers_room_seen
  ON airshare_peers (room_id, last_seen);
CREATE INDEX idx_airshare_signals_to
  ON airshare_signals (room_id, to_peer, id);
CREATE INDEX idx_airshare_join_ip
  ON airshare_join_attempts (ip_hash, attempted_at);
