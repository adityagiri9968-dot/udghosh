import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High limits for base64 photo uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ENTRIES_FILE = path.join(DATA_DIR, 'entries.json');
const SMS_FILE = path.join(DATA_DIR, 'sms.json');

export interface StudentRecord {
  id: string;
  name: string;
  roll: string;
  phone: string;
  course: string;
  photoUrl?: string;
  registeredAt: number;
  admitted: boolean;
  admittedAt?: string;
  admittedTimestamp?: number;
  isExpired?: boolean;
  expiredAt?: string;
  smsSent?: boolean;
  smsSentAt?: string;
  smsMessage?: string;
}

export interface EntryRecord {
  id: string;
  name: string;
  roll: string;
  phone?: string;
  course?: string;
  scannedAt: string;
  timestamp: number;
  photoUrl?: string;
  approvedBy?: string;
}

export interface SmsRecord {
  id: string;
  roll: string;
  studentName: string;
  phone: string;
  sender: 'udghosh_hjmc_swagtam_by_Aditya' | 'UDGHOSH' | string;
  message: string;
  sentAt: string;
  timestamp: number;
  status: 'DELIVERED';
}

// Initial demo students (with default course: HJMC)
const INITIAL_DEMO_STUDENTS: StudentRecord[] = [
  {
    id: 'FP-HJMC-001',
    name: 'Aarav Sharma',
    roll: '24HJMC01',
    phone: '9876543210',
    course: 'HJMC',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    registeredAt: Date.now() - 3600000 * 5,
    admitted: true,
    admittedAt: '09:15:30 AM',
    admittedTimestamp: Date.now() - 3600000 * 2
  },
  {
    id: 'FP-HJMC-002',
    name: 'Pooja Verma',
    roll: '24HJMC02',
    phone: '9812345678',
    course: 'HJMC',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    registeredAt: Date.now() - 3600000 * 4,
    admitted: true,
    admittedAt: '09:30:12 AM',
    admittedTimestamp: Date.now() - 3600000 * 1.5
  },
  {
    id: 'FP-HJMC-003',
    name: 'Rohan Mehra',
    roll: '24HJMC03',
    phone: '9988776655',
    course: 'HJMC',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    registeredAt: Date.now() - 3600000 * 3,
    admitted: false
  },
  {
    id: 'FP-HJMC-004',
    name: 'Ananya Gupta',
    roll: '24HJMC04',
    phone: '9765432109',
    course: 'HJMC',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    registeredAt: Date.now() - 3600000 * 2,
    admitted: false
  },
  {
    id: 'FP-HJMC-005',
    name: 'Karan Singhania',
    roll: '24HJMC05',
    phone: '9123456780',
    course: 'HJMC',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    registeredAt: Date.now() - 3600000 * 1,
    admitted: false
  }
];

function loadStudents(): Record<string, StudentRecord> {
  try {
    if (fs.existsSync(STUDENTS_FILE)) {
      const data = fs.readFileSync(STUDENTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading students file:', err);
  }
  const initialMap: Record<string, StudentRecord> = {};
  for (const s of INITIAL_DEMO_STUDENTS) {
    initialMap[s.roll.toUpperCase()] = s;
  }
  saveStudents(initialMap);
  return initialMap;
}

function saveStudents(students: Record<string, StudentRecord>) {
  try {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving students file:', err);
  }
}

function loadEntries(): EntryRecord[] {
  try {
    if (fs.existsSync(ENTRIES_FILE)) {
      const data = fs.readFileSync(ENTRIES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading entries file:', err);
  }
  const initialEntries: EntryRecord[] = INITIAL_DEMO_STUDENTS.filter((s) => s.admitted).map((s) => ({
    id: s.id,
    name: s.name,
    roll: s.roll,
    phone: s.phone,
    course: s.course,
    scannedAt: s.admittedAt || '09:00:00 AM',
    timestamp: s.admittedTimestamp || Date.now(),
    photoUrl: s.photoUrl,
    approvedBy: 'Admin (Gate 1)'
  }));
  saveEntries(initialEntries);
  return initialEntries;
}

function saveEntries(entries: EntryRecord[]) {
  try {
    fs.writeFileSync(ENTRIES_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving entries file:', err);
  }
}

function loadSms(): SmsRecord[] {
  try {
    if (fs.existsSync(SMS_FILE)) {
      const data = fs.readFileSync(SMS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error reading sms file:', err);
  }
  const initialSms: SmsRecord[] = INITIAL_DEMO_STUDENTS.filter((s) => s.admitted).map((s) => ({
    id: 'SMS-' + (s.admittedTimestamp || Date.now()) + '-' + s.roll,
    roll: s.roll,
    studentName: s.name,
    phone: s.phone,
    sender: 'udghosh_hjmc_swagtam_by_Aditya',
    message: `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${s.name}! Aapka registration (${s.roll}) QR scan hokar ${s.admittedAt || '09:15:30 AM'} par safalta-purvak verify ho chuka hai aur Gate Entry allow kar di gayi hai. Aapka single-use pass ab EXPIRE ho gaya hai. Swagatam! - udghosh_hjmc_swagtam_by_Aditya`,
    sentAt: s.admittedAt || '09:15:30 AM',
    timestamp: s.admittedTimestamp || Date.now(),
    status: 'DELIVERED'
  }));
  saveSms(initialSms);
  return initialSms;
}

function saveSms(sms: SmsRecord[]) {
  try {
    fs.writeFileSync(SMS_FILE, JSON.stringify(sms, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sms file:', err);
  }
}

let studentsMap = loadStudents();
let entriesList = loadEntries();
let smsList = loadSms();

// ================= API ROUTES =================

// 1. Get all registered students
app.get('/api/students', (req, res) => {
  res.json({
    students: Object.values(studentsMap),
    totalCount: Object.keys(studentsMap).length
  });
});

// 2. Lookup single student by roll, ID or Phone number
app.get('/api/students/:rollOrId', (req, res) => {
  const raw = req.params.rollOrId.trim();
  const query = raw.toUpperCase();
  const digitsOnly = raw.replace(/\D/g, '');
  let student: StudentRecord | undefined = studentsMap[query];
  if (!student) {
    student = Object.values(studentsMap).find((s) => {
      if (s.id.toUpperCase() === query || s.roll.toUpperCase() === query) return true;
      if (digitsOnly && digitsOnly.length >= 10 && s.phone && s.phone.replace(/\D/g, '') === digitsOnly) {
        return true;
      }
      return false;
    });
  }
  if (!student) {
    return res.status(404).json({ error: 'Student not found in registry' });
  }
  res.json(student);
});

// 3. Register a new student (from any mobile phone or device)
app.post('/api/students', (req, res) => {
  const { name, roll, phone, course, photoUrl } = req.body;
  if (!name || !roll) {
    return res.status(400).json({ error: 'Name and Roll number are required' });
  }
  const cleanRoll = String(roll).trim().toUpperCase();
  const cleanName = String(name).trim();
  const cleanPhone = String(phone || '').trim();
  const cleanCourse = String(course || 'HJMC').trim();

  const id = 'FP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 899 + 100);

  const existing = studentsMap[cleanRoll];
  const studentRecord: StudentRecord = {
    id: existing ? existing.id : id,
    name: cleanName,
    roll: cleanRoll,
    phone: cleanPhone,
    course: cleanCourse,
    photoUrl: photoUrl !== undefined ? photoUrl : existing?.photoUrl,
    registeredAt: existing ? existing.registeredAt : Date.now(),
    admitted: existing ? existing.admitted : false,
    admittedAt: existing?.admittedAt,
    admittedTimestamp: existing?.admittedTimestamp
  };

  studentsMap[cleanRoll] = studentRecord;
  saveStudents(studentsMap);

  res.json({ success: true, student: studentRecord });
});

// 4. Admin approval for entry scan
app.post('/api/students/approve', (req, res) => {
  const { roll, id, approver } = req.body;
  const cleanRoll = roll ? String(roll).trim().toUpperCase() : '';
  const searchId = id ? String(id).trim() : '';

  let student: StudentRecord | undefined = cleanRoll ? studentsMap[cleanRoll] : undefined;
  if (!student && searchId) {
    student = Object.values(studentsMap).find((s) => s.id === searchId);
  }

  if (!student) {
    return res.status(404).json({ error: 'Student not found in registry' });
  }

  if (student.admitted) {
    return res.status(400).json({
      error: 'Student already admitted!',
      student,
      admittedAt: student.admittedAt
    });
  }

  // Format in Indian Standard Time (Asia/Kolkata) with 12-hour AM/PM format
  const istTimeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date()).toUpperCase();

  const clientTime = typeof req.body.scannedAt === 'string' && req.body.scannedAt.trim()
    ? req.body.scannedAt.trim()
    : istTimeStr;
  const entryTimestamp = Number(req.body.timestamp) || Date.now();

  student.admitted = true;
  student.admittedAt = clientTime;
  student.admittedTimestamp = entryTimestamp;
  student.isExpired = true;
  student.expiredAt = clientTime;

  // Auto-generate and send official SMS under sender name "udghosh_hjmc_swagtam_by_Aditya"
  const cleanPhone = student.phone || '';
  const smsMessage = `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${student.name}! Aapka registration (${student.roll}) QR scan hokar ${clientTime} par safalta-purvak verify ho chuka hai aur Gate Entry allow kar di gayi hai. Aapka single-use pass ab EXPIRE ho gaya hai. Swagatam! - udghosh_hjmc_swagtam_by_Aditya`;

  const smsRecord: SmsRecord = {
    id: 'SMS-' + Date.now() + '-' + Math.floor(Math.random() * 899 + 100),
    roll: student.roll,
    studentName: student.name,
    phone: cleanPhone,
    sender: 'udghosh_hjmc_swagtam_by_Aditya',
    message: smsMessage,
    sentAt: clientTime,
    timestamp: entryTimestamp,
    status: 'DELIVERED'
  };

  student.smsSent = true;
  student.smsSentAt = clientTime;
  student.smsMessage = smsMessage;

  smsList = [smsRecord, ...smsList];
  saveSms(smsList);

  studentsMap[student.roll.toUpperCase()] = student;
  saveStudents(studentsMap);

  const newEntry: EntryRecord = {
    id: student.id,
    name: student.name,
    roll: student.roll,
    phone: student.phone,
    course: student.course,
    scannedAt: clientTime,
    timestamp: entryTimestamp,
    photoUrl: student.photoUrl,
    approvedBy: approver || 'Gate Admin'
  };

  entriesList = [newEntry, ...entriesList.filter((e) => e.roll.toUpperCase() !== student!.roll.toUpperCase())];
  saveEntries(entriesList);

  res.json({ success: true, student, entry: newEntry, sms: smsRecord });
});

// 5. Get all admitted entries
app.get('/api/entries', (req, res) => {
  res.json({ entries: entriesList });
});

// 6. Reset all entries
app.delete('/api/entries', (req, res) => {
  entriesList = [];
  for (const key of Object.keys(studentsMap)) {
    studentsMap[key].admitted = false;
    delete studentsMap[key].admittedAt;
    delete studentsMap[key].admittedTimestamp;
    studentsMap[key].isExpired = false;
    delete studentsMap[key].expiredAt;
    studentsMap[key].smsSent = false;
    delete studentsMap[key].smsSentAt;
    delete studentsMap[key].smsMessage;
  }
  saveStudents(studentsMap);
  saveEntries(entriesList);
  res.json({ success: true, message: 'All entries reset successfully' });
});

// 7. Get live stats
app.get('/api/stats', (req, res) => {
  const all = Object.values(studentsMap);
  const totalRegistered = all.length;
  const totalAdmitted = all.filter((s) => s.admitted).length;
  const totalPending = totalRegistered - totalAdmitted;

  res.json({
    totalRegistered,
    totalAdmitted,
    totalPending,
    entriesCount: entriesList.length,
    smsSentCount: smsList.length
  });
});

// 8. Get all sent SMS logs
app.get('/api/sms', (req, res) => {
  res.json({ smsList, totalSent: smsList.length });
});

// 9. Send or resend SMS with sender "UDGHOSH"
app.post('/api/sms/send', (req, res) => {
  const { phone, studentName, roll, message, scannedAt } = req.body;
  const timeStr = scannedAt || new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date()).toUpperCase();

  const cleanPhone = phone ? String(phone).trim() : '';
  const cleanRoll = roll ? String(roll).trim().toUpperCase() : 'N/A';
  const cleanName = studentName ? String(studentName).trim() : 'Student';

  const smsRecord: SmsRecord = {
    id: 'SMS-' + Date.now() + '-' + Math.floor(Math.random() * 899 + 100),
    roll: cleanRoll,
    studentName: cleanName,
    phone: cleanPhone,
    sender: 'udghosh_hjmc_swagtam_by_Aditya',
    message: message || `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${cleanName}! Aapka registration (${cleanRoll}) ${timeStr} par scan hokar verify ho chuka hai aur Gate Entry ho gayi hai. Pass ab EXPIRE ho gaya hai. Swagatam! - udghosh_hjmc_swagtam_by_Aditya`,
    sentAt: timeStr,
    timestamp: Date.now(),
    status: 'DELIVERED'
  };

  smsList = [smsRecord, ...smsList];
  saveSms(smsList);

  res.json({ success: true, sms: smsRecord });
});

// ================= VITE DEV / PROD SERVER =================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
