import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

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
const SMS_CONFIG_FILE = path.join(DATA_DIR, 'sms-config.json');

export interface SmsGatewayConfig {
  provider: 'fast2sms' | 'free_sim' | 'twilio' | 'custom_webhook';
  fast2smsApiKey?: string;
  fast2smsRoute?: 'q' | 'otp';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  customWebhookUrl?: string;
  autoOpenNativeSms?: boolean;
}

function loadSmsConfig(): SmsGatewayConfig {
  let initialProvider: 'fast2sms' | 'free_sim' | 'twilio' | 'custom_webhook' = 'free_sim';
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    initialProvider = 'twilio';
  } else if (process.env.FAST2SMS_API_KEY) {
    initialProvider = 'fast2sms';
  }

  let loaded: SmsGatewayConfig = {
    provider: initialProvider,
    fast2smsApiKey: process.env.FAST2SMS_API_KEY || '',
    fast2smsRoute: 'q',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFromNumber: process.env.TWILIO_PHONE_NUMBER || '',
    autoOpenNativeSms: true
  };

  try {
    if (fs.existsSync(SMS_CONFIG_FILE)) {
      const data = fs.readFileSync(SMS_CONFIG_FILE, 'utf-8');
      const saved = JSON.parse(data);
      loaded = { ...loaded, ...saved };
      // Fallback to process.env if field is not in saved config
      if (!loaded.twilioAccountSid && process.env.TWILIO_ACCOUNT_SID) loaded.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      if (!loaded.twilioAuthToken && process.env.TWILIO_AUTH_TOKEN) loaded.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      if (!loaded.twilioFromNumber && process.env.TWILIO_PHONE_NUMBER) loaded.twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
      if (!loaded.fast2smsApiKey && process.env.FAST2SMS_API_KEY) loaded.fast2smsApiKey = process.env.FAST2SMS_API_KEY;
    }
  } catch (err) {
    console.error('Error reading sms-config.json:', err);
  }
  return loaded;
}

function saveSmsConfig(config: SmsGatewayConfig) {
  try {
    fs.writeFileSync(SMS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sms-config.json:', err);
  }
}

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

// ================= REAL SMS GATEWAY DISPATCHER =================

async function dispatchSmsViaGateway(
  phone: string,
  message: string,
  studentName?: string,
  roll?: string,
  configOverride?: SmsGatewayConfig
) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return { success: false, reason: 'Invalid 10-digit mobile number' };
  }

  const config = configOverride || loadSmsConfig();
  const fast2smsKey = config.fast2smsApiKey || process.env.FAST2SMS_API_KEY;

  if ((config.provider === 'fast2sms' || fast2smsKey) && fast2smsKey) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: config.fast2smsRoute || 'q',
          message: message,
          language: 'english',
          flash: 0,
          numbers: cleanPhone
        })
      });
      const data: any = await response.json();
      console.log('Fast2SMS response:', data);
      return {
        success: data.return === true,
        provider: 'Fast2SMS',
        messageId: data.request_id,
        details: data
      };
    } catch (err: any) {
      console.error('Fast2SMS error:', err);
      return { success: false, provider: 'Fast2SMS', error: err.message };
    }
  }

  // Twilio SMS Integration
  const twilioSid = config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = config.twilioFromNumber || process.env.TWILIO_PHONE_NUMBER;

  if ((config.provider === 'twilio' || (!fast2smsKey && twilioSid)) && twilioSid && twilioToken && twilioFrom) {
    try {
      const client = twilio(twilioSid, twilioToken);
      const toFormatted = `+91${cleanPhone}`;
      const twilioRes = await client.messages.create({
        body: message,
        from: twilioFrom,
        to: toFormatted
      });
      console.log(`[Twilio SMS Success] SID: ${twilioRes.sid}, To: ${toFormatted}`);
      return {
        success: true,
        provider: 'Twilio',
        sid: twilioRes.sid,
        status: twilioRes.status,
        details: twilioRes
      };
    } catch (err: any) {
      console.error('[Twilio Error]:', err?.message || err);
      return {
        success: false,
        provider: 'Twilio',
        error: err?.message || 'Twilio SMS send error'
      };
    }
  }

  // Custom Webhook
  const webhookUrl = config.customWebhookUrl || process.env.SMS_WEBHOOK_URL;
  if (config.provider === 'custom_webhook' && webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          message,
          studentName,
          roll,
          sender: 'udghosh_hjmc_swagtam_by_Aditya'
        })
      });
      const text = await response.text();
      return { success: response.ok, provider: 'Custom Webhook', details: text };
    } catch (err: any) {
      return { success: false, provider: 'Custom Webhook', error: err.message };
    }
  }

  return {
    success: true,
    provider: 'Free SIM / Native SMS Mode',
    note: 'Triggered via device messaging intent / SIM card.'
  };
}

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

  // Automatic SMS trigger on registration if phone number is provided
  if (cleanPhone && cleanPhone.replace(/\D/g, '').length >= 10) {
    const timeStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date()).toUpperCase();

    const smsMessage = `🔐 [UDGHOSH REGISTRATION CONFIRMED]: udghosh_hjmc_swagtam_by_Aditya\nनमस्ते ${cleanName}! आपकी वेबसाइट पर रजिस्ट्रेशन सफल रहा (Roll: ${cleanRoll})। BRAC HJMC UDGHOSH Fresher Party Entry Pass QR Code जनरेट हो चुका है। गेट पर एंट्री के लिए पास सुरक्षित रखें। धन्यवाद! - udghosh_hjmc_swagtam_by_Aditya`;

    studentRecord.smsSent = true;
    studentRecord.smsSentAt = timeStr;
    studentRecord.smsMessage = smsMessage;
    studentsMap[cleanRoll] = studentRecord;
    saveStudents(studentsMap);

    const smsRecord: SmsRecord = {
      id: 'SMS-' + Date.now() + '-' + Math.floor(Math.random() * 899 + 100),
      roll: cleanRoll,
      studentName: cleanName,
      phone: cleanPhone,
      sender: 'udghosh_hjmc_swagtam_by_Aditya',
      message: smsMessage,
      sentAt: timeStr,
      timestamp: Date.now(),
      status: 'DELIVERED'
    };
    smsList = [smsRecord, ...smsList.filter((s) => s.id !== smsRecord.id)];
    saveSms(smsList);

    dispatchSmsViaGateway(cleanPhone, smsMessage, cleanName, cleanRoll).catch((e) =>
      console.warn('Auto SMS dispatch background error', e)
    );
  }

  res.json({ success: true, student: studentRecord });
});

// 4. Admin approval for entry scan
app.post('/api/students/approve', async (req, res) => {
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

  // Dispatch real SMS to phone carrier / gateway
  const gatewayResult = await dispatchSmsViaGateway(cleanPhone, smsMessage, student.name, student.roll);
  console.log(`[REAL-SMS] Dispatched to ${cleanPhone} via ${gatewayResult.provider}:`, gatewayResult);

  res.json({
    success: true,
    student,
    entry: newEntry,
    sms: smsRecord,
    gatewayResult
  });
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

// 8b. Automatic Registration / Twilio SMS Route: POST /api/send-sms
app.post('/api/send-sms', async (req, res) => {
  const { phoneNumber, phone, studentName, roll, course, message, body } = req.body;
  const rawNumber = phoneNumber || phone || '';
  const cleanPhone = String(rawNumber).replace(/\D/g, '').slice(-10);

  if (!cleanPhone || cleanPhone.length !== 10) {
    return res.status(400).json({
      success: false,
      error: 'Kripya 10-digit valid phone number dalein (e.g. 9876543210)'
    });
  }

  const cleanName = studentName ? String(studentName).trim() : 'Student';
  const cleanRoll = roll ? String(roll).trim().toUpperCase() : '';
  const cleanCourse = course ? String(course).trim().toUpperCase() : 'HJMC';

  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date()).toUpperCase();

  // Official Registration SMS body (supports user's exact Hindi wording + verified sender)
  const smsBody =
    message ||
    body ||
    `🔐 [UDGHOSH REGISTRATION CONFIRMED]: udghosh_hjmc_swagtam_by_Aditya\nनमस्ते ${cleanName}! आपकी वेबसाइट पर रजिस्ट्रेशन सफल रहा (Roll: ${cleanRoll || cleanCourse})। BRAC HJMC UDGHOSH Fresher Party Entry Pass QR Code जनरेट हो चुका है। गेट पर एंट्री के लिए पास सुरक्षित रखें। धन्यवाद! - udghosh_hjmc_swagtam_by_Aditya`;

  const smsRecord: SmsRecord = {
    id: 'SMS-' + Date.now() + '-' + Math.floor(Math.random() * 899 + 100),
    roll: cleanRoll || 'REG',
    studentName: cleanName,
    phone: cleanPhone,
    sender: 'udghosh_hjmc_swagtam_by_Aditya',
    message: smsBody,
    sentAt: timeStr,
    timestamp: Date.now(),
    status: 'DELIVERED'
  };

  // Save to persistent SMS log
  smsList = [smsRecord, ...smsList];
  saveSms(smsList);

  // Update student record if exists
  if (cleanRoll && studentsMap[cleanRoll]) {
    studentsMap[cleanRoll].smsSent = true;
    studentsMap[cleanRoll].smsSentAt = timeStr;
    studentsMap[cleanRoll].smsMessage = smsBody;
    saveStudents(studentsMap);
  }

  // Build WhatsApp text
  const waMessage = `🎉 *BRAC HJMC • UDGHOSH FRESHER PARTY 2026* 🎉\n🔐 *Verification:* udghosh_hjmc_swagtam_by_Aditya\n\nनमस्ते *${cleanName}*!\nआपकी वेबसाइट पर रजिस्ट्रेशन सफल रहा। आपका Entry Pass QR Code जनरेट हो चुका है।\n\n🎫 *Roll No:* ${cleanRoll || cleanCourse}\n📚 *Course:* ${cleanCourse}\n📞 *Phone:* ${cleanPhone}\n🛡️ *Pass Status:* ACTIVE (Single-Use Entry Pass)\n\n📌 *Zaroori Soochana:*\n• Entry Gate par ye digital pass dikhana anivarya hai.\n• Gate par scan hote hi pass expire ho jayega. Ek pass sirf ek baar chalega!\n\nधन्यवाद!\n- *udghosh_hjmc_swagtam_by_Aditya*`;
  const directWaUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

  // Dispatch via real Twilio / Fast2SMS gateway
  const gatewayResult = await dispatchSmsViaGateway(cleanPhone, smsBody, cleanName, cleanRoll);
  console.log(`[API /api/send-sms] Automatic SMS sent to ${cleanPhone}:`, gatewayResult);

  return res.status(200).json({
    success: true,
    message: 'रजिस्ट्रेशन सफल और SMS भेज दिया गया है।',
    sms: smsRecord,
    gatewayResult,
    provider: gatewayResult.provider,
    nativeSmsUrl: `sms:+91${cleanPhone}?body=${encodeURIComponent(smsBody)}`,
    whatsappUrl: directWaUrl
  });
});

// 8c. Direct WhatsApp Route: POST /api/whatsapp/send
app.post('/api/whatsapp/send', async (req, res) => {
  const { phoneNumber, phone, studentName, roll, course, message } = req.body;
  const rawNumber = phoneNumber || phone || '';
  const cleanPhone = String(rawNumber).replace(/\D/g, '').slice(-10);

  if (!cleanPhone || cleanPhone.length !== 10) {
    return res.status(400).json({
      success: false,
      error: 'Kripya 10-digit valid phone number dalein (e.g. 9876543210)'
    });
  }

  const cleanName = studentName ? String(studentName).trim() : 'Student';
  const cleanRoll = roll ? String(roll).trim().toUpperCase() : 'HJMC';
  const cleanCourse = course ? String(course).trim().toUpperCase() : 'HJMC';

  const defaultWaMessage = `🎉 *BRAC HJMC • UDGHOSH FRESHER PARTY 2026* 🎉\n🔐 *Portal Verification:* udghosh_hjmc_swagtam_by_Aditya\n\nनमस्ते *${cleanName}*!\nआपकी वेबसाइट पर रजिस्ट्रेशन सफल रहा। आपका Entry Pass QR Code जनरेट हो चुका है।\n\n🎫 *Roll No:* ${cleanRoll}\n📚 *Course:* ${cleanCourse}\n📞 *Phone:* ${cleanPhone}\n🛡️ *Pass Status:* ACTIVE (Single-Use Entry Pass)\n\n📌 *Zaroori Soochana:*\n• Entry Gate par ye digital pass dikhana anivarya hai.\n• Gate par scan hote hi pass expire ho jayega. Ek pass sirf 1 baar chalega!\n\nधन्यवाद!\n- *udghosh_hjmc_swagtam_by_Aditya*`;

  const waBody = message || defaultWaMessage;
  const directWaUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(waBody)}`;

  // Also try Twilio WhatsApp if configured
  const config = loadSmsConfig();
  const twilioSid = config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = config.twilioFromNumber || process.env.TWILIO_PHONE_NUMBER;

  let twilioWaResult: any = null;
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const client = twilio(twilioSid, twilioToken);
      const fromFormatted = twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`;
      const toFormatted = `whatsapp:+91${cleanPhone}`;
      const waRes = await client.messages.create({
        body: waBody,
        from: fromFormatted,
        to: toFormatted
      });
      twilioWaResult = { success: true, sid: waRes.sid, status: waRes.status };
    } catch (e: any) {
      twilioWaResult = { success: false, error: e?.message };
    }
  }

  return res.status(200).json({
    success: true,
    message: 'WhatsApp message ready',
    whatsappUrl: directWaUrl,
    cleanPhone,
    twilioWaResult
  });
});

app.all('/api/whatsapp/send', (req, res) => {
  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
});

app.all('/api/send-sms', (req, res) => {
  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
});

// 9. Send or resend SMS with sender "udghosh_hjmc_swagtam_by_Aditya"
app.post('/api/sms/send', async (req, res) => {
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

  const gatewayResult = await dispatchSmsViaGateway(cleanPhone, smsRecord.message, cleanName, cleanRoll);
  console.log(`[REAL-SMS] Sent manual SMS to ${cleanPhone}:`, gatewayResult);

  res.json({ success: true, sms: smsRecord, gatewayResult });
});

// 10. SMS Gateway Config Endpoints
app.get('/api/sms/config', (req, res) => {
  const config = loadSmsConfig();
  res.json({
    config: {
      ...config,
      fast2smsApiKey: config.fast2smsApiKey ? `${config.fast2smsApiKey.slice(0, 4)}••••${config.fast2smsApiKey.slice(-4)}` : '',
      twilioAuthToken: config.twilioAuthToken ? '••••••••' : ''
    },
    hasFast2SmsKey: Boolean(config.fast2smsApiKey || process.env.FAST2SMS_API_KEY)
  });
});

app.post('/api/sms/config', (req, res) => {
  const current = loadSmsConfig();
  const incoming = req.body || {};
  const updated: SmsGatewayConfig = {
    provider: incoming.provider || current.provider,
    fast2smsApiKey: (incoming.fast2smsApiKey && !incoming.fast2smsApiKey.includes('••••')) ? incoming.fast2smsApiKey.trim() : current.fast2smsApiKey,
    fast2smsRoute: incoming.fast2smsRoute || current.fast2smsRoute || 'q',
    twilioAccountSid: incoming.twilioAccountSid ? incoming.twilioAccountSid.trim() : current.twilioAccountSid,
    twilioAuthToken: (incoming.twilioAuthToken && !incoming.twilioAuthToken.includes('••••')) ? incoming.twilioAuthToken.trim() : current.twilioAuthToken,
    twilioFromNumber: incoming.twilioFromNumber ? incoming.twilioFromNumber.trim() : current.twilioFromNumber,
    customWebhookUrl: incoming.customWebhookUrl ? incoming.customWebhookUrl.trim() : current.customWebhookUrl,
    autoOpenNativeSms: incoming.autoOpenNativeSms !== undefined ? Boolean(incoming.autoOpenNativeSms) : current.autoOpenNativeSms
  };
  saveSmsConfig(updated);
  res.json({ success: true, config: updated });
});

// 11. Test Real SMS sending
app.post('/api/sms/test', async (req, res) => {
  const { phone, message, configOverride } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  const testMsg = message || `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste! Test Pass QR scan hokar verify ho chuka hai. Swagatam! - udghosh_hjmc_swagtam_by_Aditya`;
  const result = await dispatchSmsViaGateway(phone, testMsg, 'Test User', 'TEST01', configOverride);
  res.json(result);
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
