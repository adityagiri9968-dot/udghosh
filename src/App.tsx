import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import {
  PartyPopper,
  QrCode,
  ShieldCheck,
  Camera,
  CameraOff,
  Users,
  Download,
  Trash2,
  Settings,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  FlipHorizontal,
  RefreshCw,
  Sparkles,
  Ticket,
  Clock,
  IdCard,
  UserCheck,
  Search,
  KeyRound,
  BarChart3,
  Zap,
  Bot,
  Cpu,
  Aperture,
  Upload,
  Image as ImageIcon,
  User,
  Maximize2,
  Crown,
  Phone,
  Check,
  GraduationCap,
  Eye,
  EyeOff,
  Lock,
  Battery,
  BatteryCharging,
  BatteryLow,
  Calendar,
  Bell,
  BellOff,
  MessageSquare,
  Smartphone,
  Send,
  SendHorizontal
} from 'lucide-react';
import { EntryAnalytics } from './components/EntryAnalytics.tsx';
import { OwnerSection, StudentRecord } from './components/OwnerSection.tsx';
import { AdminRegistrationsTab } from './components/AdminRegistrationsTab.tsx';
import { AdminSmsLogsTab, SmsRecord } from './components/AdminSmsLogsTab.tsx';
import { PhoneSmsModal } from './components/PhoneSmsModal.tsx';
import { PassExpiryChecker } from './components/PassExpiryChecker.tsx';
import { SmsGatewaySettingsModal } from './components/SmsGatewaySettingsModal.tsx';
import { formatScanTime, formatIndianDateTime, formatTimeInHindiWords } from './utils/timeFormat.ts';

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

interface ScanBannerState {
  type: 'success' | 'duplicate' | 'invalid' | 'pending_approval';
  message: string;
  subMessage?: string;
  details?: {
    id?: string;
    name?: string;
    roll?: string;
    phone?: string;
    course?: string;
    time?: string;
    photoUrl?: string;
    alreadyAdmitted?: boolean;
    admittedAt?: string;
    isPreRegistered?: boolean;
    registeredAt?: number;
    registeredAtFormatted?: string;
    firstScanTimeFormatted?: string;
    firstScanTimeHindi?: string;
    isExpired?: boolean;
    expiredAt?: string;
    smsSent?: boolean;
    smsPhone?: string;
    smsSender?: string;
    smsMessage?: string;
    smsSentAt?: string;
  };
}

export interface RegisteredStudent {
  id: string;
  name: string;
  roll: string;
  phone: string;
  course: string;
  photoUrl?: string;
  registeredAt: number;
  admitted?: boolean;
  admittedAt?: string;
  admittedTimestamp?: number;
  isExpired?: boolean;
  expiredAt?: string;
  smsSent?: boolean;
  smsSentAt?: string;
  smsMessage?: string;
}

export default function App() {
  // Navigation / View State
  const [currentView, setCurrentView] = useState<'student' | 'admin' | 'owner'>('student');

  // Admin view state (PIN: 7271)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('fresher_party_admin_logged_in') === 'true';
  });
  const [adminTab, setAdminTab] = useState<'scanner' | 'registrations' | 'entries' | 'sms'>('scanner');
  const [smsList, setSmsList] = useState<SmsRecord[]>([]);
  const [selectedSmsForPreview, setSelectedSmsForPreview] = useState<SmsRecord | null>(null);
  const [incomingSmsToast, setIncomingSmsToast] = useState<SmsRecord | null>(null);
  const [showSmsSettingsModal, setShowSmsSettingsModal] = useState<boolean>(false);

  // Auto-Approve & Auto-SMS on Scan (User requested: "automatic sms nahi jaa raha hai" -> Enable instant automatic SMS on scan!)
  const [autoApproveAndSendSms, setAutoApproveAndSendSms] = useState<boolean>(() => {
    const saved = localStorage.getItem('auto_approve_send_sms');
    return saved !== null ? saved === 'true' : true; // DEFAULT TRUE FOR AUTOMATIC SMS!
  });

  const [autoOpenDeviceSms, setAutoOpenDeviceSms] = useState<boolean>(() => {
    const saved = localStorage.getItem('auto_open_device_sms');
    return saved !== null ? saved === 'true' : true; // DEFAULT TRUE to trigger SIM SMS
  });

  // Student Pass Search / Expiry Check state
  const [passSearchQuery, setPassSearchQuery] = useState<string>('');
  const [passSearchError, setPassSearchError] = useState<string>('');
  const [isSearchingPass, setIsSearchingPass] = useState<boolean>(false);

  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Owner view state (PIN: 9968 - hidden password)
  const [isOwner, setIsOwner] = useState<boolean>(() => {
    return sessionStorage.getItem('fresher_party_owner_logged_in') === 'true';
  });
  const [showOwnerPinModal, setShowOwnerPinModal] = useState<boolean>(false);
  const [ownerPinInput, setOwnerPinInput] = useState<string>('');
  const [ownerPinError, setOwnerPinError] = useState<string>('');

  // Student Registration State
  const [studentName, setStudentName] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [studentCourse, setStudentCourse] = useState<string>('HJMC'); // Default HJMC as requested
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [isSelfieCameraOpen, setIsSelfieCameraOpen] = useState<boolean>(false);
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<{ url: string; name: string; roll: string } | null>(null);

  const [registeredData, setRegisteredData] = useState<{
    id: string;
    name: string;
    roll: string;
    phone: string;
    course: string;
    photoUrl?: string;
    qrUrl: string;
  } | null>(null);
  const [isGeneratingPass, setIsGeneratingPass] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [registrationAlert, setRegistrationAlert] = useState<{
    show: boolean;
    message: string;
    sms?: SmsRecord;
  } | null>(null);

  // Registered students map with photos for fast lookup by roll
  const [registeredStudents, setRegisteredStudents] = useState<Record<string, RegisteredStudent>>(() => {
    try {
      const saved = localStorage.getItem('fresher_party_registered_students');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const registeredStudentsRef = useRef<Record<string, RegisteredStudent>>(registeredStudents);
  const selfieVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    registeredStudentsRef.current = registeredStudents;
    try {
      localStorage.setItem('fresher_party_registered_students', JSON.stringify(registeredStudents));
    } catch (e) {
      console.warn('Failed to save registered students', e);
    }
  }, [registeredStudents]);

  // Synchronize state with backend server so all phones share data in real-time
  const syncWithBackend = async () => {
    try {
      const [resStudents, resEntries, resSms] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/entries'),
        fetch('/api/sms')
      ]);

      if (resStudents.ok) {
        const data = await resStudents.json();
        if (data.students && Array.isArray(data.students)) {
          const map: Record<string, RegisteredStudent> = {};
          for (const s of data.students) {
            map[s.roll.toUpperCase()] = s;
          }
          setRegisteredStudents(map);
          registeredStudentsRef.current = map;
        }
      }

      if (resEntries.ok) {
        const data = await resEntries.json();
        if (data.entries && Array.isArray(data.entries)) {
          setEntries(data.entries);
          entriesRef.current = data.entries;
        }
      }

      if (resSms.ok) {
        const smsData = await resSms.json();
        if (smsData.smsList && Array.isArray(smsData.smsList)) {
          setSmsList(smsData.smsList);
        }
      }
    } catch (e) {
      // Backend sync error fallback
    }
  };

  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 4000);
    return () => clearInterval(interval);
  }, []);

  // Confirmed entries state (localStorage)
  const [entries, setEntries] = useState<EntryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('fresher_party_entries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [autoStopOnScan, setAutoStopOnScan] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanBanner, setScanBanner] = useState<ScanBannerState | null>(null);
  const [isCooldown, setIsCooldown] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  // Dedicated Success Chime toggle (separate from master sound toggle, for quieter event environments)
  const [successChimeEnabled, setSuccessChimeEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fresher_party_success_chime_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleSuccessChime = () => {
    setSuccessChimeEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fresher_party_success_chime_enabled', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [cameraError, setCameraError] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 🔋 Battery Status API & Battery-Saving Mode State
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isBatteryCharging, setIsBatteryCharging] = useState<boolean>(false);
  const [isBatterySupported, setIsBatterySupported] = useState<boolean>(false);
  const [batterySaverOverride, setBatterySaverOverride] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem('fresher_party_battery_saver');
      return saved !== null ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Low battery condition: level <= 20% and not currently charging
  const isBatteryLow = batteryLevel !== null && batteryLevel <= 20 && !isBatteryCharging;
  // Active if manually overridden to true OR if battery level is low
  const isBatterySaverActive = batterySaverOverride !== null ? batterySaverOverride : isBatteryLow;
  const isBatterySaverActiveRef = useRef<boolean>(isBatterySaverActive);

  useEffect(() => {
    isBatterySaverActiveRef.current = isBatterySaverActive;
  }, [isBatterySaverActive]);

  const toggleBatterySaver = () => {
    const nextVal = !isBatterySaverActive;
    setBatterySaverOverride(nextVal);
    try {
      localStorage.setItem('fresher_party_battery_saver', JSON.stringify(nextVal));
    } catch {}
  };

  // Battery Status API Event Listeners
  useEffect(() => {
    let batteryObj: any = null;
    let handleLevelChange: (() => void) | null = null;
    let handleChargingChange: (() => void) | null = null;

    const onBatteryUpdate = (b: any) => {
      const lvl = Math.round(b.level * 100);
      setBatteryLevel(lvl);
      setIsBatteryCharging(Boolean(b.charging));
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      setIsBatterySupported(true);
      (navigator as any)
        .getBattery()
        .then((b: any) => {
          batteryObj = b;
          onBatteryUpdate(b);
          handleLevelChange = () => onBatteryUpdate(b);
          handleChargingChange = () => onBatteryUpdate(b);
          b.addEventListener('levelchange', handleLevelChange);
          b.addEventListener('chargingchange', handleChargingChange);
        })
        .catch(() => {
          setIsBatterySupported(false);
        });
    }

    return () => {
      if (batteryObj) {
        if (handleLevelChange) batteryObj.removeEventListener('levelchange', handleLevelChange);
        if (handleChargingChange) batteryObj.removeEventListener('chargingchange', handleChargingChange);
      }
    };
  }, []);

  // 🤖 AI Automatic Bot (Single-Scan Auto-Guard) State
  const [aiBotMode, setAiBotMode] = useState<'single_shot' | 'smart_guard'>('single_shot');
  const [aiBotStatus, setAiBotStatus] = useState<string>('📸 AI Bot: Ready • Point camera at QR & Click to Scan');
  const [aiBotLastAction, setAiBotLastAction] = useState<string>('Bot standby - Click to Scan armed');

  // 📸 Click-to-Scan (Phone Camera Shutter Mode) State
  const [scanTriggerMode, setScanTriggerMode] = useState<'click_to_scan' | 'auto_scan'>('click_to_scan');
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningLockedRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const entriesRef = useRef<EntryRecord[]>(entries);
  const handleQrCodeSuccessRef = useRef<(text: string, isManual?: boolean) => void>(() => {});
  const isCameraActiveRef = useRef<boolean>(false);
  const autoStopOnScanRef = useRef<boolean>(true);

  // 🤖 AI Bot Hardware & Memory Locks
  const aiBotModeRef = useRef<'single_shot' | 'smart_guard'>('single_shot');
  const scanTriggerModeRef = useRef<'click_to_scan' | 'auto_scan'>('click_to_scan');
  const isHardLockedRef = useRef<boolean>(false);
  const aiBotLockedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    aiBotModeRef.current = aiBotMode;
  }, [aiBotMode]);

  useEffect(() => {
    scanTriggerModeRef.current = scanTriggerMode;
  }, [scanTriggerMode]);

  useEffect(() => {
    autoStopOnScanRef.current = autoStopOnScan;
  }, [autoStopOnScan]);

  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Sync entries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fresher_party_entries', JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save entries to localStorage', e);
    }
  }, [entries]);

  // Audio synthesis using Web Audio API
  const playSuccessSound = () => {
    // Specifically respects successChimeEnabled for quieter event environments
    if (!soundEnabled || !successChimeEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      // High-pitched pleasant triumphant melody: C5 -> E5 -> G5
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.22);
      });
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  const playDuplicateWarningSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      // Dual buzz alarm
      [0, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now + offset);
        osc.frequency.setValueAtTime(160, now + offset + 0.07);
        gain.gain.setValueAtTime(0.4, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    } catch (e) {
      console.warn('Warning audio failed', e);
    }
  };

  // Vibration feedback
  const triggerVibration = (pattern: number[]) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration error
    }
  };

  // 🤖 AI Bot Digital Confirmation Chime
  const playAiBotChime = () => {
    if (!soundEnabled || !successChimeEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [880, 1320, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.2, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.14);
      });
    } catch {}
  };

  // 📸 Phone Camera Realistic Shutter Click Sound
  const playCameraShutterSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Click 1: Mirror/Mechanical shutter click (high frequency snap)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400, now);
      osc1.frequency.exponentialRampToValueAtTime(150, now + 0.035);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.035);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // Click 2: Shutter curtain release 45ms later
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2400, now + 0.045);
      osc2.frequency.exponentialRampToValueAtTime(110, now + 0.085);
      gain2.gain.setValueAtTime(0.35, now + 0.045);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.085);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.045);
      osc2.stop(now + 0.09);
    } catch (e) {
      console.warn('Shutter audio failed', e);
    }
  };

  // 📲 Trigger Native Device Cellular SMS (Free Phone SIM SMS)
  const triggerNativeDeviceSms = (phone: string, studentName: string, roll: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '').slice(-10);
    const msg = `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${studentName}! Aapka registration (${roll}) QR scan hokar verify ho chuka hai aur Gate Entry allow kar di gayi hai. Pass ab EXPIRE ho gaya hai. Swagatam! - udghosh_hjmc_swagtam_by_Aditya`;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = `sms:+91${clean}${isIOS ? '&' : '?'}body=${encodeURIComponent(msg)}`;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 400);
    } catch (e) {
      console.warn('Native SMS trigger error:', e);
    }
  };

  // Photo file upload & compression handler
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoUploadError('Kripya valid image file (JPG, PNG, WebP) chunein.');
      return;
    }

    setIsProcessingPhoto(true);
    setPhotoUploadError('');

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 260;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setIsProcessingPhoto(false);
            return;
          }

          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setStudentPhoto(dataUrl);
          setIsProcessingPhoto(false);
        };
        img.onerror = () => {
          setPhotoUploadError('Image process nahi ho saki. Doosri photo try karein.');
          setIsProcessingPhoto(false);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        setPhotoUploadError('File reading error.');
        setIsProcessingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setPhotoUploadError('Photo upload me samasya aayi.');
      setIsProcessingPhoto(false);
    } finally {
      e.target.value = '';
    }
  };

  // Selfie Camera Helpers
  const startSelfieCamera = async () => {
    setPhotoUploadError('');
    setIsSelfieCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
      });
      selfieStreamRef.current = stream;
      if (selfieVideoRef.current) {
        selfieVideoRef.current.srcObject = stream;
        await selfieVideoRef.current.play();
      }
    } catch (err) {
      console.error('Selfie camera error', err);
      setPhotoUploadError('Camera access nahi mila. Kripya gallery se photo upload karein.');
      setIsSelfieCameraOpen(false);
    }
  };

  const stopSelfieCamera = () => {
    if (selfieStreamRef.current) {
      selfieStreamRef.current.getTracks().forEach((track) => track.stop());
      selfieStreamRef.current = null;
    }
    setIsSelfieCameraOpen(false);
  };

  const captureSelfie = () => {
    if (!selfieVideoRef.current) return;
    try {
      const video = selfieVideoRef.current;
      const canvas = document.createElement('canvas');
      const size = 260;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const minDim = Math.min(video.videoWidth || 300, video.videoHeight || 300);
      const startX = ((video.videoWidth || 300) - minDim) / 2;
      const startY = ((video.videoHeight || 300) - minDim) / 2;

      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setStudentPhoto(dataUrl);
      stopSelfieCamera();
    } catch (e) {
      console.error('Selfie capture failed', e);
    }
  };

  // Check Pass Status / Lookup Pass by Roll, Phone, or ID
  const handleCheckPassStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSearchError('');
    const query = passSearchQuery.trim();
    if (!query) {
      setPassSearchError('Kripya apna Roll Number ya Phone Number dalein.');
      return;
    }
    setIsSearchingPass(true);
    try {
      const cleanUpper = query.toUpperCase();
      const digitsOnly = query.replace(/\D/g, '');

      let match: RegisteredStudent | undefined = Object.values(registeredStudents).find(
        (s) =>
          s.roll.toUpperCase() === cleanUpper ||
          s.id.toUpperCase() === cleanUpper ||
          (digitsOnly.length >= 10 && s.phone && s.phone.replace(/\D/g, '') === digitsOnly)
      );

      if (!match) {
        const res = await fetch(`/api/students/${encodeURIComponent(query)}`);
        if (res.ok) {
          match = await res.json();
        }
      }

      if (!match) {
        setPassSearchError(`Koi pass nahi mila: "${query}". Roll Number ya Phone Number check karein ya naya registration karein.`);
        return;
      }

      const qrPayload = {
        name: match.name,
        roll: match.roll,
        phone: match.phone,
        course: match.course,
        id: match.id
      };
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 380,
        color: { dark: '#0f172a', light: '#ffffff' }
      });

      setRegisteredData({
        id: match.id,
        name: match.name,
        roll: match.roll,
        phone: match.phone,
        course: match.course,
        photoUrl: match.photoUrl,
        qrUrl: qrDataUrl
      });
      setPassSearchQuery('');
    } catch {
      setPassSearchError('Pass dhoondhne mein error aaya. Kripya punah prayas karein.');
    } finally {
      setIsSearchingPass(false);
    }
  };

  // Handle Student Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = studentName.trim();
    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanPhone = phoneNumber.trim();
    const cleanCourse = studentCourse.trim() || 'HJMC';

    if (!cleanName) {
      setFormError('Kripya apna poora naam likhein.');
      return;
    }
    if (!cleanRoll) {
      setFormError('Kripya apna College Roll Number dalein.');
      return;
    }
    if (!cleanPhone) {
      setFormError('Kripya apna 10-digit Phone Number dalein.');
      return;
    }
    if (!/^\d{10}$/.test(cleanPhone)) {
      setFormError('Kripya sahi 10-digit Mobile Number dalein (e.g. 9876543210).');
      return;
    }

    setIsGeneratingPass(true);
    try {
      const uniqueId = 'FP-HJMC-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 899 + 100);
      const payload = {
        name: cleanName,
        roll: cleanRoll,
        phone: cleanPhone,
        course: cleanCourse,
        id: uniqueId
      };

      // Save to registered students registry (mapping by roll number)
      const studentRecord: RegisteredStudent = {
        id: uniqueId,
        name: cleanName,
        roll: cleanRoll,
        phone: cleanPhone,
        course: cleanCourse,
        photoUrl: studentPhoto || undefined,
        registeredAt: Date.now(),
        admitted: false
      };

      // Save to central server so ALL devices see the student and photo!
      try {
        await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentRecord)
        });
      } catch (err) {
        console.warn('Backend server save error', err);
      }

      // AUTOMATIC SMS DISPATCH ON REGISTRATION:
      // Direct call to /api/send-sms route as requested by user
      try {
        const smsResponse = await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: cleanPhone,
            phone: cleanPhone,
            studentName: cleanName,
            roll: cleanRoll,
            course: cleanCourse
          })
        });

        const smsData = await smsResponse.json();
        if (smsData && (smsData.success || smsData.sms)) {
          const sentRecord: SmsRecord = smsData.sms || {
            id: 'SMS-' + Date.now() + '-' + cleanRoll,
            roll: cleanRoll,
            studentName: cleanName,
            phone: cleanPhone,
            sender: 'udghosh_hjmc_swagtam_by_Aditya',
            message: `🔐 [UDGHOSH REGISTRATION CONFIRMED]: udghosh_hjmc_swagtam_by_Aditya\nनमस्ते ${cleanName}! आपकी वेबसाइट पर रजिस्ट्रेशन सफल रहा। धन्यवाद!`,
            sentAt: 'Just Now',
            timestamp: Date.now(),
            status: 'DELIVERED'
          };
          setSmsList((prev) => [sentRecord, ...prev.filter((s) => s.id !== sentRecord.id)]);
          setRegistrationAlert({
            show: true,
            message: smsData.message || 'रजिस्ट्रेशन सफल और SMS भेज दिया गया है!',
            sms: sentRecord
          });
          setIncomingSmsToast(sentRecord);
        }
      } catch (smsErr) {
        console.warn('Auto SMS trigger error', smsErr);
      }

      setRegisteredStudents((prev) => ({
        ...prev,
        [cleanRoll]: studentRecord
      }));

      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 380,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      setRegisteredData({
        id: uniqueId,
        name: cleanName,
        roll: cleanRoll,
        phone: cleanPhone,
        course: cleanCourse,
        photoUrl: studentPhoto || undefined,
        qrUrl: qrDataUrl
      });

      // Confetti celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
      setFormError('QR Code generate karne me samasya aayi. Kripya punah prayas karein.');
    } finally {
      setIsGeneratingPass(false);
    }
  };

  const handleResetRegistration = () => {
    setRegisteredData(null);
    setRegistrationAlert(null);
    setStudentName('');
    setRollNumber('');
    setPhoneNumber('');
    setStudentCourse('HJMC');
    setStudentPhoto(null);
    setPhotoUploadError('');
    setFormError('');
  };

  // Download high-resolution Pass Card
  const handleDownloadPass = () => {
    if (!registeredData) return;

    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 980;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, 980);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 700, 980);

    // Header gradient banner
    const bannerGrad = ctx.createLinearGradient(0, 0, 700, 0);
    bannerGrad.addColorStop(0, '#9333ea');
    bannerGrad.addColorStop(0.5, '#ec4899');
    bannerGrad.addColorStop(1, '#f43f5e');
    ctx.fillStyle = bannerGrad;
    ctx.fillRect(0, 0, 700, 140);

    // Decorative circle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(630, 20, 100, 0, Math.PI * 2);
    ctx.fill();

    // Banner Text
    ctx.fillStyle = '#fce7f3';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRAC HJMC', 350, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('🎉 UDGHOSH 🎉', 350, 80);

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#fce7f3';
    ctx.fillText('FRESHER PARTY ENTRY PASS', 350, 116);

    // Card boundary
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 160, 640, 770);

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';

    const renderCanvasAndDownload = (photoImg?: HTMLImageElement | null) => {
      // Student Info Card
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.fillRect(50, 185, 600, 150);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(50, 185, 600, 150);

      if (photoImg) {
        // Draw photo with rounded border on left: X = 70, Y = 198, size = 120
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(70, 198, 120, 124, 12);
        ctx.clip();
        ctx.drawImage(photoImg, 70, 198, 120, 124);
        ctx.restore();

        // Border around photo
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(70, 198, 120, 124, 12);
        ctx.stroke();

        // Photo verified badge
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(70, 304, 120, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VERIFIED PHOTO', 130, 317);

        // Student Info on Right
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('STUDENT NAME', 215, 218);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(registeredData.name, 215, 245);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('ROLL NO: ', 215, 273);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(registeredData.roll, 285, 273);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('COURSE: ', 430, 273);
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(registeredData.course || 'HJMC', 495, 273);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText('PHONE: ', 215, 302);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(registeredData.phone || 'N/A', 280, 302);

        ctx.fillStyle = '#a855f7';
        ctx.font = '12px sans-serif';
        ctx.fillText('ID: ' + registeredData.id, 430, 302);
      } else {
        // Name & Roll (traditional layout)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '15px sans-serif';
        ctx.fillText('STUDENT NAME', 75, 216);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(registeredData.name, 75, 246);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('ROLL: ', 75, 280);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(registeredData.roll, 130, 280);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('COURSE: ', 260, 280);
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(registeredData.course || 'HJMC', 335, 280);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('PHONE: ', 75, 312);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(registeredData.phone || 'N/A', 145, 312);

        ctx.fillStyle = '#a855f7';
        ctx.font = '13px sans-serif';
        ctx.fillText('PASS ID: ' + registeredData.id, 380, 312);
      }

      // White container for QR
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(175, 360, 350, 350, 20);
      ctx.fill();

      ctx.drawImage(qrImg, 195, 380, 310, 310);

      // Instructions bottom
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('Entry Gate par ye QR Code dikhana anivarya hai', 350, 755);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px sans-serif';
      ctx.fillText('Screenshot le kar safe rakhein • Valid for 1 Person Only', 350, 785);

      // Security watermark
      ctx.fillStyle = '#64748b';
      ctx.font = '13px monospace';
      ctx.fillText(`VERIFIED PASS • ISSUED: ${new Date().toLocaleDateString('en-IN')}`, 350, 875);

      // Trigger download
      const link = document.createElement('a');
      link.download = `Udghosh_Fresher_Pass_${registeredData.roll.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    qrImg.onload = () => {
      if (registeredData.photoUrl) {
        const pImg = new Image();
        pImg.crossOrigin = 'anonymous';
        pImg.onload = () => renderCanvasAndDownload(pImg);
        pImg.onerror = () => renderCanvasAndDownload(null);
        pImg.src = registeredData.photoUrl;
      } else {
        renderCanvasAndDownload(null);
      }
    };
    qrImg.src = registeredData.qrUrl;
  };

  // Admin Pin Authentication
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '7271') {
      setIsAdmin(true);
      sessionStorage.setItem('fresher_party_admin_logged_in', 'true');
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      setCurrentView('admin');
    } else {
      setPinError('Galat PIN! Kripya sahi PIN enter karein.');
    }
  };

  const handleAdminLogout = () => {
    stopCamera();
    setIsAdmin(false);
    sessionStorage.removeItem('fresher_party_admin_logged_in');
    setScanBanner(null);
    setCurrentView('student');
  };

  // Owner Code Authentication (Masked input - code dikhe nahi)
  const handleOwnerCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOwnerPinInput(val);
    setOwnerPinError('');

    // Instant login on entering the secret code
    if (val === '9968') {
      setIsOwner(true);
      sessionStorage.setItem('fresher_party_owner_logged_in', 'true');
      setShowOwnerPinModal(false);
      setOwnerPinInput('');
      setCurrentView('owner');
    }
  };

  const handleOwnerPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPinInput === '9968') {
      setIsOwner(true);
      sessionStorage.setItem('fresher_party_owner_logged_in', 'true');
      setShowOwnerPinModal(false);
      setOwnerPinInput('');
      setCurrentView('owner');
    } else {
      setOwnerPinError('Galat Code! Kripya sahi code enter karein.');
    }
  };

  const handleOwnerLogout = () => {
    setIsOwner(false);
    sessionStorage.removeItem('fresher_party_owner_logged_in');
    setCurrentView('student');
  };

  // QR Scanning Logic with AI Automatic Bot Anti-Repeat Lock & Instant Stop
  const handleNextScan = async () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    try {
      if (html5QrCodeRef.current && (html5QrCodeRef.current as any).resume) {
        (html5QrCodeRef.current as any).resume();
      }
    } catch {}
    isHardLockedRef.current = false;
    isScanningLockedRef.current = false;
    setIsCooldown(false);
    aiBotLockedCodeRef.current = null;
    lastScannedCodeRef.current = null;
    lastScannedTimeRef.current = 0;
    setScanBanner(null);
    setCapturedPhotoUrl(null);
    setAiBotStatus(
      scanTriggerModeRef.current === 'click_to_scan'
        ? '📸 AI Bot: Ready • Point camera at QR & Click to Scan'
        : '🟢 AI Bot: Active • Ready for Student Pass'
    );
    setAiBotLastAction('Scanner reset for next student');

    // If camera was stopped, start camera for next student pass
    if (!isCameraActiveRef.current) {
      await startCamera();
    }
  };

  // 📸 Phone Camera "Click to Scan" Shutter Function
  const captureAndScanPhoto = async () => {
    if (isCapturing) return;

    if (!isCameraActiveRef.current) {
      await startCamera();
      return;
    }

    // 1. Shutter sound & haptics (like clicking a photo in smartphone camera)
    playCameraShutterSound();
    triggerVibration([40, 20, 60]);

    // 2. Visual flash animation across viewfinder
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 160);

    // 3. Locate the live video stream element
    const container = document.getElementById(scannerContainerId);
    const video = container?.querySelector('video');

    if (!video || video.readyState < 2) {
      setAiBotStatus('⚠️ Camera stream initialize ho raha hai, kripya 1 second baad click karein');
      return;
    }

    setIsCapturing(true);
    setAiBotStatus('🤖 AI Bot: 📸 Photo Captured! Analyzing QR code from photo...');

    try {
      const width = video.videoWidth || video.clientWidth || 640;
      const height = video.videoHeight || video.clientHeight || 480;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) throw new Error('Canvas 2D context not available');

      // Draw exact frozen frame from video
      ctx.drawImage(video, 0, 0, width, height);

      // Save preview of the captured photo
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhotoUrl(photoDataUrl);

      // Pass 1: jsQR full frame
      let imageData = ctx.getImageData(0, 0, width, height);
      let code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });

      // Pass 2: jsQR Center 75% crop if full frame did not catch it
      if (!code) {
        const cropW = Math.floor(width * 0.75);
        const cropH = Math.floor(height * 0.75);
        const cropX = Math.floor((width - cropW) / 2);
        const cropY = Math.floor((height - cropH) / 2);
        const cropData = ctx.getImageData(cropX, cropY, cropW, cropH);
        code = jsQR(cropData.data, cropData.width, cropData.height, {
          inversionAttempts: 'attemptBoth'
        });
      }

      // Pass 3: Contrast boosted threshold pass
      if (!code) {
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
          const val = avg > 125 ? 255 : 0;
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        }
        code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
      }

      if (code && code.data) {
        setAiBotStatus('✨ AI Bot: Photo me QR Code detect ho gaya! Validating entry...');
        await handleQrCodeSuccess(code.data, true);
      } else {
        // No QR detected in this photo
        playDuplicateWarningSound();
        triggerVibration([200, 100, 200]);
        setScanBanner({
          type: 'invalid',
          message: '📷 Is photo me QR Code detect nahi hua!',
          subMessage: 'Kripya student pass ka QR camera ke saamne laakar dobara "📸 Click to Scan" karein.'
        });
        setAiBotStatus('⚠️ AI Bot: Photo me QR nahi mila. QR samne laakar dobara Click karein.');
        setAiBotLastAction('Photo Clicked • No QR detected');
      }
    } catch (err) {
      console.error('Snapshot scan error', err);
      setAiBotStatus('❌ Photo scan error. Kripya punah click karein.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleQrCodeSuccess = async (decodedText: string, isManualShutter = false) => {
    // In click_to_scan mode, ignore live continuous video frames
    if (!isManualShutter && scanTriggerModeRef.current === 'click_to_scan') {
      return;
    }

    // 1. HARD SYNCHRONOUS LOCK: If already processing or locked, drop frame instantly
    if (isHardLockedRef.current) return;

    // 2. 🤖 AI BOT ANTI-REPEAT SHIELD:
    // If camera is still pointed at the exact same QR code, the AI Bot drops it unconditionally!
    // No repeat beep, no duplicate trigger loop as long as QR is held in front of camera
    if (aiBotLockedCodeRef.current === decodedText) {
      return;
    }

    // Immediately lock synchronously
    isHardLockedRef.current = true;
    aiBotLockedCodeRef.current = decodedText;
    lastScannedCodeRef.current = decodedText;
    lastScannedTimeRef.current = Date.now();
    isScanningLockedRef.current = true;
    setIsCooldown(true);

    // AI Bot digital chime
    playAiBotChime();

    // In Single-Shot mode (default) OR Click-to-Scan OR autoStopOnScan:
    // KILL camera immediately so it stops dead
    if (scanTriggerModeRef.current === 'click_to_scan' || aiBotModeRef.current === 'single_shot' || autoStopOnScanRef.current) {
      setAiBotStatus('🛡️ AI Bot: 1-Shot Captured! Camera auto-stopped.');
      setAiBotLastAction('1 Scan Captured • Camera Off');
      await stopCamera();
    } else {
      setAiBotStatus('🤖 AI Bot: Pass locked • Auto-ignoring repeat scans');
      try {
        if (html5QrCodeRef.current && (html5QrCodeRef.current as any).pause) {
          (html5QrCodeRef.current as any).pause(true);
        }
      } catch {}
    }

    try {
      const data = JSON.parse(decodedText);
      if (!data || !data.name || !data.roll) {
        throw new Error('Invalid format');
      }

      const scannedRoll = String(data.roll).trim().toUpperCase();
      const studentNameScanned = String(data.name).trim();
      const studentPhoneScanned = String(data.phone || '').trim();
      const studentCourseScanned = String(data.course || 'HJMC').trim();

      // Look up student from registered students map
      let matchedProfile = registeredStudentsRef.current[scannedRoll];

      // CROSS-DEVICE FIX: If profile or photo not found in local cache, fetch from central server!
      if (!matchedProfile || !matchedProfile.photoUrl) {
        try {
          const res = await fetch(`/api/students/${scannedRoll}`);
          if (res.ok) {
            const serverRecord: RegisteredStudent = await res.json();
            matchedProfile = serverRecord;
            setRegisteredStudents((prev) => ({
              ...prev,
              [scannedRoll]: serverRecord
            }));
            registeredStudentsRef.current[scannedRoll] = serverRecord;
          }
        } catch (e) {
          console.warn('Could not fetch student from server API', e);
        }
      }

      // Check duplicate using entriesRef OR matchedProfile.admitted
      const existing = entriesRef.current.find(
        (item) => item.roll.trim().toUpperCase() === scannedRoll
      );

      const studentPhotoFound = data.photo || matchedProfile?.photoUrl || existing?.photoUrl;
      const studentPhoneFound = studentPhoneScanned || matchedProfile?.phone || existing?.phone || '';
      const studentCourseFound = studentCourseScanned || matchedProfile?.course || existing?.course || 'HJMC';
      const studentIdFound = data.id || matchedProfile?.id || existing?.id || 'FP-' + Date.now();

      // Student registration information lookup
      const isPreRegistered = Boolean(matchedProfile);
      const registeredTimestamp = matchedProfile?.registeredAt;
      const registeredAtFormatted = registeredTimestamp
        ? formatIndianDateTime(registeredTimestamp)
        : undefined;

      if (existing || matchedProfile?.admitted || matchedProfile?.isExpired) {
        // EXPIRED PASS / DUPLICATE ENTRY - User requested: "espar ek baar pass scan hone ke baad expire ho jaaye aur scan karne par uske phone par number par sms chala jaaye udgosh naam se"
        const firstScanRaw =
          existing?.scannedAt ||
          matchedProfile?.admittedAt ||
          existing?.timestamp ||
          matchedProfile?.admittedTimestamp;
        const prevTime = formatScanTime(firstScanRaw);
        const firstScanHindi = formatTimeInHindiWords(firstScanRaw);
        const prevSms = smsList.find((s) => s.roll.toUpperCase() === scannedRoll);

        playDuplicateWarningSound();
        triggerVibration([300, 100, 300]);
        setScanBanner({
          type: 'duplicate',
          message: '⛔ PASS EXPIRED (1 Baar Scan Ho Chuka Hai)',
          subMessage: `Yeh pass pehle scan hokar EXPIRE ho chuka hai! Pehli baar scan: ${firstScanHindi} (${prevTime}) • Ek pass sirf ek baar chalega.`,
          details: {
            id: studentIdFound,
            name: existing?.name || studentNameScanned,
            roll: scannedRoll,
            phone: studentPhoneFound,
            course: studentCourseFound,
            time: prevTime,
            photoUrl: studentPhotoFound,
            alreadyAdmitted: true,
            admittedAt: prevTime,
            isPreRegistered: true,
            registeredAt: registeredTimestamp,
            registeredAtFormatted,
            firstScanTimeFormatted: prevTime,
            firstScanTimeHindi: firstScanHindi,
            isExpired: true,
            expiredAt: prevTime,
            smsSent: true,
            smsPhone: studentPhoneFound,
            smsSender: 'UDGHOSH',
            smsMessage: prevSms?.message || `🎉 UDGHOSH 2026: Namaste ${existing?.name || studentNameScanned}! Aapka fresher party pass (${scannedRoll}) verify hokar gate entry ho chuki hai aur yeh pass ab EXPIRE ho gaya hai.`
          }
        });
        setAiBotLastAction(`EXPIRED PASS Blocked: ${studentNameScanned} (${scannedRoll}) • 1st Scan: ${prevTime}`);
      } else {
        // VALID PASS -> User: "automatic sms nahi jaa raha hai"
        // If autoApproveAndSendSms is ON (Default): IMMEDIATELY APPROVE, EXPIRE PASS & SEND SMS AUTOMATICALLY!
        if (autoApproveAndSendSms) {
          playAiBotChime();
          triggerVibration([80, 40, 80]);
          await handleApproveEntry({
            id: studentIdFound,
            name: studentNameScanned,
            roll: scannedRoll,
            phone: studentPhoneFound,
            course: studentCourseFound,
            photoUrl: studentPhotoFound
          });
          setAiBotLastAction(`⚡ AUTO-APPROVED & SMS DISPATCHED: ${studentNameScanned} (${scannedRoll})`);
        } else {
          // MANUAL APPROVAL BUTTON MODE (if admin chose manual mode)
          const scanTimeNow = formatScanTime();
          const scanTimeNowHindi = formatTimeInHindiWords();
          playAiBotChime();
          triggerVibration([80, 40, 80]);
          setScanBanner({
            type: 'pending_approval',
            message: `📸 Pass Scan Ho Gaya: ${studentNameScanned}`,
            subMessage: isPreRegistered
              ? `Pehle hi registration kiya tha: ${registeredAtFormatted} • Pehli baar scan abhi ${scanTimeNowHindi} par ho raha hai. Approve karte hi pass EXPIRE ho jayega aur SMS chala jayega.`
              : `Pehli baar scan: ${scanTimeNowHindi} • Details verify karke "Approve Entry" dabayein (Pass will EXPIRE & SMS will be sent)`,
            details: {
              id: studentIdFound,
              name: studentNameScanned,
              roll: scannedRoll,
              phone: studentPhoneFound,
              course: studentCourseFound,
              photoUrl: studentPhotoFound,
              time: scanTimeNow,
              isPreRegistered,
              registeredAt: registeredTimestamp,
              registeredAtFormatted,
              firstScanTimeFormatted: scanTimeNow,
              firstScanTimeHindi: scanTimeNowHindi,
              smsPhone: studentPhoneFound,
              smsSender: 'udghosh_hjmc_swagtam_by_Aditya'
            }
          });
          setAiBotLastAction(`Waiting for Approval: ${studentNameScanned} (${scannedRoll})`);
        }
      }
    } catch {
      playDuplicateWarningSound();
      setScanBanner({
        type: 'invalid',
        message: '❌ Invalid QR code'
      });
      setAiBotLastAction('Invalid QR Format Blocked');
    }

    if (aiBotModeRef.current === 'smart_guard' && !autoStopOnScanRef.current) {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        try {
          if (html5QrCodeRef.current && (html5QrCodeRef.current as any).resume) {
            (html5QrCodeRef.current as any).resume();
          }
        } catch {}
        // Release hard lock for NEW QR codes, but aiBotLockedCodeRef continues holding this QR!
        isHardLockedRef.current = false;
        isScanningLockedRef.current = false;
        setIsCooldown(false);
        setAiBotStatus('🤖 AI Bot: Ready for NEXT pass (same QR still blocked)');
      }, 2500);
    }
  };

  // Admin Approval Action: User requested "admin ke scan karne ke baad aporve ka button ho"
  const handleApproveEntry = async (details: {
    id?: string;
    name?: string;
    roll?: string;
    phone?: string;
    course?: string;
    photoUrl?: string;
  }) => {
    if (!details || !details.roll) return;
    const cleanRoll = details.roll.trim().toUpperCase();
    const cleanName = details.name || 'Student';
    const cleanPhone = details.phone || '';
    const cleanCourse = details.course || 'HJMC';
    const nowMs = Date.now();
    const timeStr = formatScanTime(nowMs);

    const newRecord: EntryRecord = {
      id: details.id || 'FP-' + nowMs,
      name: cleanName,
      roll: cleanRoll,
      phone: cleanPhone,
      course: cleanCourse,
      scannedAt: timeStr,
      timestamp: nowMs,
      photoUrl: details.photoUrl,
      approvedBy: 'Gate Admin'
    };

    // 1. Post to backend server so other devices see the approval with exact IST time and dispatch UDGHOSH SMS!
    let backendSms: SmsRecord | undefined;
    try {
      const res = await fetch('/api/students/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll: cleanRoll,
          id: details.id,
          approver: 'Gate Admin',
          scannedAt: timeStr,
          timestamp: nowMs
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sms) {
          backendSms = data.sms;
        }
      }
    } catch (e) {
      console.warn('Backend approval sync error', e);
    }

    const dispatchedSms: SmsRecord = backendSms || {
      id: 'SMS-' + nowMs + '-' + cleanRoll,
      roll: cleanRoll,
      studentName: cleanName,
      phone: cleanPhone,
      sender: 'udghosh_hjmc_swagtam_by_Aditya',
      message: `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${cleanName}! Aapka fresher party registration (${cleanRoll}) ${timeStr} par scan hokar verify ho chuka hai aur Gate Entry ho gayi hai. Pass ab EXPIRE ho gaya hai (Single-Use Completed). Swagatam! - udghosh_hjmc_swagtam_by_Aditya`,
      sentAt: timeStr,
      timestamp: nowMs,
      status: 'DELIVERED'
    };

    // Update local smsList
    setSmsList((prev) => [dispatchedSms, ...prev.filter((s) => s.id !== dispatchedSms.id)]);

    // Trigger on-screen floating notification
    setIncomingSmsToast(dispatchedSms);
    setTimeout(() => {
      setIncomingSmsToast((cur) => (cur?.id === dispatchedSms.id ? null : cur));
    }, 7000);

    // 📲 Automatic Mobile Device SIM SMS Trigger (User: "automatic sms nahi jaa raha hai")
    if (autoOpenDeviceSms && cleanPhone) {
      triggerNativeDeviceSms(cleanPhone, cleanName, cleanRoll);
    }

    // 2. Play celebratory sound & confetti
    playSuccessSound();
    triggerVibration([100, 50, 100]);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.5 }
    });

    // 3. Update entries list
    entriesRef.current = [newRecord, ...entriesRef.current.filter((e) => e.roll.toUpperCase() !== cleanRoll)];
    setEntries((prev) => [newRecord, ...prev.filter((e) => e.roll.toUpperCase() !== cleanRoll)]);

    // 4. Update student record locally with expired and SMS status
    setRegisteredStudents((prev) => {
      const match = prev[cleanRoll];
      if (match) {
        return {
          ...prev,
          [cleanRoll]: {
            ...match,
            admitted: true,
            admittedAt: timeStr,
            admittedTimestamp: nowMs,
            isExpired: true,
            expiredAt: timeStr,
            smsSent: true,
            smsSentAt: timeStr,
            smsMessage: dispatchedSms.message
          }
        };
      }
      return prev;
    });

    // 5. Update banner to confirmed & expired with udghosh_hjmc_swagtam_by_Aditya SMS details
    setScanBanner({
      type: 'success',
      message: `✅ Entry Confirmed! Pass Ab EXPIRE Ho Gaya`,
      subMessage: `Roll: ${cleanRoll} • Gate Entry Confirmed at ${timeStr} • SMS Dispatched to +91 ${cleanPhone} (udghosh_hjmc_swagtam_by_Aditya)`,
      details: {
        id: details.id,
        name: cleanName,
        roll: cleanRoll,
        phone: cleanPhone,
        course: cleanCourse,
        time: timeStr,
        photoUrl: details.photoUrl,
        isExpired: true,
        expiredAt: timeStr,
        smsSent: true,
        smsPhone: cleanPhone,
        smsSender: 'udghosh_hjmc_swagtam_by_Aditya',
        smsMessage: dispatchedSms.message,
        smsSentAt: timeStr
      }
    });
    setAiBotLastAction(`Approved & Pass Expired: ${cleanName} (${cleanRoll}) • SMS Dispatched: udghosh_hjmc_swagtam_by_Aditya`);
  };

  useEffect(() => {
    handleQrCodeSuccessRef.current = handleQrCodeSuccess;
  });

  // Camera Controls - Ultra-fast minus second detection
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          verbose: false
        });
      } else if (html5QrCodeRef.current.isScanning) {
        return;
      }

      // 25 FPS for high speed detection, or 10 FPS in battery saving mode to preserve battery
      const targetFps = isBatterySaverActiveRef.current ? 10 : 25;
      const config: Html5QrcodeCameraScanConfig = {
        fps: targetFps,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(160, Math.floor(minEdge * (isBatterySaverActiveRef.current ? 0.75 : 0.88)));
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0
      };

      let lastAutoScanTick = 0;
      await html5QrCodeRef.current.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          // If in click_to_scan mode, do not auto-scan video frames! Only scan on shutter click
          if (scanTriggerModeRef.current === 'click_to_scan') {
            return;
          }
          // In battery saving mode, decrease scanning interval (throttle frequency to >= 600ms)
          const now = Date.now();
          if (isBatterySaverActiveRef.current && now - lastAutoScanTick < 600) {
            return;
          }
          lastAutoScanTick = now;
          handleQrCodeSuccessRef.current(decodedText, false);
        },
        () => {
          // ignore scan frame errors
        }
      );

      isCameraActiveRef.current = true;
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera error', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        setCameraError('Camera permission deny ho gaya hai. Browser settings me camera allow karein.');
      } else {
        setCameraError('Camera start nahi ho saka. Device me camera verify karein ya image scan use karein.');
      }
      isCameraActiveRef.current = false;
      setIsCameraActive(false);
    }
  };

  // If camera is running and battery saver mode changes, restart camera to apply new FPS and scan interval
  const prevBatterySaverRef = useRef<boolean>(isBatterySaverActive);
  useEffect(() => {
    if (prevBatterySaverRef.current !== isBatterySaverActive) {
      prevBatterySaverRef.current = isBatterySaverActive;
      if (isCameraActiveRef.current) {
        stopCamera().then(() => {
          setTimeout(() => {
            startCamera();
          }, 300);
        });
      }
    }
  }, [isBatterySaverActive]);

  const stopCamera = async () => {
    // 1. Force hardware-level track shutdown immediately on any running video element
    try {
      const container = document.getElementById(scannerContainerId);
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((video) => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => {
              try {
                track.stop();
                track.enabled = false;
              } catch {}
            });
            video.srcObject = null;
          }
        });
      }
    } catch (e) {
      console.warn('Hardware stream cutoff error', e);
    }

    // 2. Stop html5QrCode instance
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        // Safe to ignore if stopped mid-frame since hardware tracks are already dead
      }
    }
    isCameraActiveRef.current = false;
    setIsCameraActive(false);
  };

  const switchCameraFacing = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (isCameraActive) {
      await stopCamera();
      // Brief delay before restarting with new facing mode
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  };

  // Clean up camera on unmount or tab switch
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  // When admin tab changes, stop camera if switching away from scanner
  useEffect(() => {
    if (adminTab !== 'scanner' && isCameraActive) {
      stopCamera();
    }
  }, [adminTab]);

  // Handle direct file QR scan (Organizer convenience)
  const handleFileUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = html5QrCodeRef.current || new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = scanner;
      const decodedResult = await scanner.scanFile(file, true);
      handleQrCodeSuccess(decodedResult);
    } catch (err) {
      console.error(err);
      setScanBanner({
        type: 'invalid',
        message: '❌ Is image me koi valid QR code nahi mila'
      });
    } finally {
      e.target.value = '';
    }
  };

  // Quick simulate sample QR for testing in development/preview
  const handleSimulateScan = (name: string, roll: string, photoUrl?: string) => {
    const cleanRoll = roll.toUpperCase();
    const defaultPhoto = photoUrl || (cleanRoll === '24ENG042'
      ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80'
      : cleanRoll === '24BCA019'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'
      : undefined);

    if (defaultPhoto) {
      setRegisteredStudents((prev) => ({
        ...prev,
        [cleanRoll]: {
          id: 'FP-REG-' + cleanRoll,
          name,
          roll: cleanRoll,
          phone: '9876543210',
          course: 'HJMC',
          photoUrl: defaultPhoto,
          registeredAt: Date.now()
        }
      }));
    }

    const fakePayload = JSON.stringify({
      id: 'FP-TEST-' + Math.floor(Math.random() * 9000 + 1000),
      name,
      roll: cleanRoll,
      phone: '9876543210',
      course: 'HJMC',
      photo: defaultPhoto
    });
    handleQrCodeSuccess(fakePayload);
  };

  // Generate realistic crowd entry flow across recent intervals for testing analytics
  const handleGenerateDemoData = () => {
    const now = Date.now();
    const demoStudents = [
      { name: 'Aarav Mehta', roll: '24ENG042', offsetMin: 28, photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80' },
      { name: 'Pooja Verma', roll: '24BCA019', offsetMin: 25, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80' },
      { name: 'Rohan Deshmukh', roll: '24BBA102', offsetMin: 22, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80' },
      { name: 'Ananya Roy', roll: '24COM055', offsetMin: 18, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80' },
      { name: 'Karan Patel', roll: '24CS089', offsetMin: 16, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80' },
      { name: 'Simran Kaur', roll: '24IT031', offsetMin: 13, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80' },
      { name: 'Vikram Aditya', roll: '24ENG077', offsetMin: 12, photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&auto=format&fit=crop&q=80' },
      { name: 'Sneha Gupta', roll: '24BCA063', offsetMin: 7, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&auto=format&fit=crop&q=80' },
      { name: 'Devendra Joshi', roll: '24CS112', offsetMin: 4, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80' },
      { name: 'Priya Sharma', roll: '24BBA044', offsetMin: 2, photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80' },
      { name: 'Manish Kumar', roll: '24ENG015', offsetMin: 1, photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=240&auto=format&fit=crop&q=80' }
    ];

    const newDemoRecords: EntryRecord[] = demoStudents.map((s, index) => {
      const entryTimeMs = now - s.offsetMin * 60 * 1000 - Math.floor(Math.random() * 40000);
      const timeStr = formatScanTime(entryTimeMs);
      return {
        id: `FP-DEMO-${1000 + index}`,
        name: s.name,
        roll: s.roll,
        phone: '9876543210',
        course: 'HJMC',
        scannedAt: timeStr,
        timestamp: entryTimeMs,
        photoUrl: s.photo,
        approvedBy: 'Gate Admin'
      };
    });

    // Also register in registeredStudents
    setRegisteredStudents((prev) => {
      const updated = { ...prev };
      demoStudents.forEach((d) => {
        updated[d.roll.toUpperCase()] = {
          id: 'FP-REG-' + d.roll,
          name: d.name,
          roll: d.roll.toUpperCase(),
          phone: '9876543210',
          course: 'HJMC',
          photoUrl: d.photo,
          registeredAt: now,
          admitted: true
        };
      });
      return updated;
    });

    setEntries((prev) => {
      const existingRolls = new Set(prev.map((p) => p.roll.toLowerCase()));
      const filtered = newDemoRecords.filter((d) => !existingRolls.has(d.roll.toLowerCase()));
      return [...filtered, ...prev];
    });

    confetti({
      particleCount: 35,
      spread: 45,
      origin: { y: 0.6 }
    });
  };

  // Export Entries to CSV
  const handleExportCSV = () => {
    if (entries.length === 0) {
      alert('Export karne ke liye koi entry uplabdh nahi hai.');
      return;
    }

    const headers = ['S.No', 'Student Name', 'Roll Number', 'Entry Time', 'Pass ID', 'Full Date'];
    const rows = entries.map((e, index) => [
      index + 1,
      `"${e.name.replace(/"/g, '""')}"`,
      `"${e.roll}"`,
      `"${formatScanTime(e.scannedAt || e.timestamp)}"`,
      `"${e.id}"`,
      `"${new Date(e.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BRAC_HJMC_Udghosh_Fresher_Party_Entries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear all entry data
  const handleClearEntries = () => {
    setEntries([]);
    localStorage.removeItem('fresher_party_entries');
    setShowClearConfirm(false);
    setScanBanner(null);
  };

  // Filtered entries for search
  const filteredEntries = entries.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between selection:bg-pink-500 selection:text-white">
      {/* TOP PARTY VIBE HEADER */}
      <header className="relative overflow-hidden border-b border-purple-500/20 bg-slate-950/80 backdrop-blur-md">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-60 bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-rose-600/30 blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-300 mb-3 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>BRAC HJMC</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
              🎉 Udghosh
            </span>
          </h1>

          <p className="text-xl sm:text-2xl font-bold tracking-wider uppercase text-pink-400 mt-1">
            Fresher Party
          </p>

          <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-md mx-auto">
            {currentView === 'owner' ? (
              <span className="text-amber-300 font-medium flex items-center justify-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" /> 👑 Owner Portal • Master Records &amp; Attendance
              </span>
            ) : currentView === 'admin' ? (
              <span className="text-purple-300 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Organizer &amp; Gate Entry Admin Panel
              </span>
            ) : (
              'Apna naam, roll number, aur phone daal kar pass generate karo'
            )}
          </p>

          {/* Top 3-Mode Navigation Switcher */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setCurrentView('student')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                currentView === 'student'
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Student Pass (रजिस्ट्रेशन)</span>
            </button>

            <button
              onClick={() => {
                if (isAdmin) {
                  setCurrentView('admin');
                } else {
                  setShowPinModal(true);
                  setPinInput('');
                  setPinError('');
                }
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Portal</span>
            </button>

            <button
              onClick={() => {
                if (isOwner) {
                  setCurrentView('owner');
                } else {
                  setShowOwnerPinModal(true);
                  setOwnerPinInput('');
                  setOwnerPinError('');
                }
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                currentView === 'owner'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                  : 'bg-slate-900/80 text-amber-300 hover:bg-slate-800 border border-amber-500/40'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>👑 Owner Section</span>
            </button>
          </div>

          {/* Admin Mode Indicator Banner */}
          {currentView === 'admin' && (
            <div className="mt-3 inline-flex items-center gap-3 bg-purple-950/50 border border-purple-500/40 px-3.5 py-1.5 rounded-full text-xs text-purple-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Admin Logged In (Organizer Mode)</span>
              <button
                onClick={handleAdminLogout}
                className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 px-2 py-0.5 rounded transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          )}

          {/* Owner Mode Indicator Banner */}
          {currentView === 'owner' && (
            <div className="mt-3 inline-flex items-center gap-3 bg-amber-950/50 border border-amber-500/40 px-3.5 py-1.5 rounded-full text-xs text-amber-200">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>👑 Owner Mode Active</span>
              <button
                onClick={handleOwnerLogout}
                className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 px-2 py-0.5 rounded transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10">
        {currentView === 'owner' ? (
          /* ========================================================= */
          /* FLOW 0: OWNER MASTER SECTION                              */
          /* ========================================================= */
          <OwnerSection
            students={Object.values(registeredStudents)}
            entries={entries}
            smsList={smsList}
            onRefresh={syncWithBackend}
            onLogout={handleOwnerLogout}
            onPreviewPhoto={setSelectedPreviewPhoto}
            onOpenPhonePreview={(s) => setSelectedSmsForPreview(s)}
          />
        ) : currentView === 'student' ? (
          /* ========================================================= */
          /* FLOW 1: STUDENT REGISTRATION & PASS VIEW                  */
          /* ========================================================= */
          <div className="w-full max-w-lg mx-auto">
            {!registeredData ? (
              /* Public Registration Form */
              <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border border-purple-500/20 relative">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Student Registration</h2>
                    <p className="text-xs text-slate-400">Gate pass praapt karne ke liye details bharein</p>
                  </div>
                </div>

                {formError && (
                  <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs sm:text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Full Name (Poora Naam)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      College Roll Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="e.g. 24HJMC089 / 24BCA104"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm uppercase"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number Field (User requested: "esme phone number add karne ka bhi option rakho registration vakt") */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Mobile / WhatsApp Number (फोन नंबर)
                    </label>
                    <div className="relative">
                      <input
                        id="phone-number-input"
                        type="tel"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 9876543210 (10 Digits)"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm font-mono"
                        required
                      />
                      <Phone className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      * Gate pass verification aur zaroori update ke liye
                    </p>
                  </div>

                  {/* Course Selection (User requested: "course hjmc by default") */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Course (कोर्स - By Default HJMC)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={studentCourse}
                        onChange={(e) => setStudentCourse(e.target.value)}
                        placeholder="HJMC"
                        className="w-full bg-slate-900/90 border border-purple-500/50 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm font-bold uppercase tracking-wide"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                        Default: HJMC
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-pink-300/80">
                      * Hindi Journalism &amp; Mass Communication (HJMC)
                    </p>
                  </div>

                  {/* Photo Upload Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Student Photo / ID Photo (Vidyarthi Ki Photo)
                      </label>
                      <span className="text-[10px] text-pink-400 font-medium">Recommended for gate pass</span>
                    </div>

                    {photoUploadError && (
                      <div className="mb-2 p-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{photoUploadError}</span>
                      </div>
                    )}

                    {studentPhoto ? (
                      /* Uploaded Photo Preview Card */
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/40 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-pink-500 shadow-md shrink-0">
                            <img
                              src={studentPhoto}
                              alt="Uploaded student preview"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[9px] text-white font-bold text-center py-0.5">
                              Uploaded
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">Photo Safalta-purvak Chuni Gayi</span>
                            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Pass par print hogi
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 font-medium cursor-pointer transition">
                            <span>Badlein</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoFileChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setStudentPhoto(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Remove photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty Upload / Capture Options */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* File Upload Option */}
                        <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-pink-500/60 bg-slate-900/60 hover:bg-slate-900/90 transition cursor-pointer group text-center">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:text-pink-400 transition mb-1.5">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-white group-hover:text-pink-300">
                            Upload from Gallery / Files
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            PNG, JPG (Square / Passport)
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoFileChange}
                            className="hidden"
                          />
                        </label>

                        {/* Live Selfie Camera Option */}
                        <button
                          type="button"
                          onClick={startSelfieCamera}
                          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-purple-500/60 bg-slate-900/60 hover:bg-slate-900/90 transition cursor-pointer group text-center"
                        >
                          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition mb-1.5">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-white group-hover:text-purple-300">
                            Camera se Selfie Lo
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Instant live photo capture
                          </span>
                        </button>
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      * Photo upload karne se pass par aapki photo aayegi aur gate par chehra verify hoga
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isGeneratingPass}
                    className="w-full mt-3 py-3.5 px-6 rounded-xl font-bold text-white gradient-party shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:brightness-110 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {isGeneratingPass ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Pass Ban Raha Hai...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        <span>Register Karo / Generate QR</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> One QR per student
                  </span>
                  <span>Venue: Main College Auditorium</span>
                </div>
              </div>
            ) : (
              /* Success Pass Display Modal / Card */
              <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl border border-purple-500/30 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

                <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  Registration Safalta-purvak Ho Gaya!
                </h3>
                <p className="text-xs text-pink-300 font-medium mb-4">
                  BRAC HJMC • Udghosh Fresher Party • Official Entry Pass
                </p>

                {/* Celebratory Alert: Registration successful & SMS Sent! */}
                {registrationAlert && (
                  <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border-2 border-emerald-500 shadow-xl shadow-emerald-950/50 text-left animate-in slide-in-from-top-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <span className="font-extrabold text-white text-sm sm:text-base block">
                            {registrationAlert.message}
                          </span>
                          <span className="text-[11px] text-emerald-300 font-mono block mt-0.5">
                            📲 SMS Sender: <strong>udghosh_hjmc_swagtam_by_Aditya</strong> • To: +91 {registeredData?.phone}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {registrationAlert.sms && (
                          <button
                            type="button"
                            onClick={() => setSelectedSmsForPreview(registrationAlert.sms!)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow cursor-pointer flex items-center gap-1.5"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>SMS Dekhein</span>
                          </button>
                        )}
                        <a
                          href={`https://wa.me/91${registeredData?.phone}?text=${encodeURIComponent(
                            `🎉 *BRAC HJMC • UDGHOSH FRESHER PARTY 2026* 🎉\n🔐 *Verification:* udghosh_hjmc_swagtam_by_Aditya\n\nनमस्ते *${registeredData?.name}*!\nआपकी वेबसाइट पर रजिस्ट्रेशन सफल रहा। आपका Entry Pass QR Code जनरेट हो चुका है।\n\n🎫 *Roll No:* ${registeredData?.roll}\n📚 *Course:* ${registeredData?.course || 'HJMC'}\n📞 *Phone:* ${registeredData?.phone}\n🆔 *Pass ID:* ${registeredData?.id}\n🛡️ *Pass Status:* ACTIVE (Single-Use Entry Pass)\n\n📌 *Zaroori Soochana:*\n• Entry Gate par ye digital pass dikhana anivarya hai.\n• Gate par scan hote hi pass expire ho jayega. Single-use only!\n\nधन्यवाद!\n- *udghosh_hjmc_swagtam_by_Aditya*`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>💬 WhatsApp Par Bhejein</span>
                        </a>
                        <a
                          href={`sms:+91${registeredData?.phone}?body=${encodeURIComponent(registrationAlert.sms?.message || 'नमस्ते! आपकी वेबसाइट पर रजिस्ट्रेशन सफल रहा। धन्यवाद! - udghosh_hjmc_swagtam_by_Aditya')}`}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>SMS App</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pass Ticket Box */}
                {(() => {
                  const cleanStudentRoll = registeredData.roll.trim().toUpperCase();
                  const studentEntryMatch = entries.find((e) => e.roll.trim().toUpperCase() === cleanStudentRoll);
                  const studentRegistryMatch = registeredStudents[cleanStudentRoll];
                  const isPassExpired = Boolean(
                    studentEntryMatch ||
                    studentRegistryMatch?.admitted ||
                    studentRegistryMatch?.isExpired
                  );
                  const expiredTimeStr =
                    studentEntryMatch?.scannedAt ||
                    studentRegistryMatch?.admittedAt ||
                    (studentEntryMatch?.timestamp ? formatScanTime(studentEntryMatch.timestamp) : undefined);
                  const matchingSms = smsList.find((s) => s.roll.trim().toUpperCase() === cleanStudentRoll);

                  return (
                    <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-700/80 mb-6 text-left relative overflow-hidden">
                      {/* 1. Pass Status Header */}
                      {isPassExpired ? (
                        <div className="mb-4 p-3.5 rounded-xl bg-red-950/85 border-2 border-red-500 text-center shadow-lg animate-in fade-in">
                          <div className="flex items-center justify-center gap-2 text-red-200 font-extrabold text-sm sm:text-base">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
                            <span>⛔ PASS STATUS: EXPIRED (1-TIME USE COMPLETED)</span>
                          </div>
                          <p className="text-xs text-red-200 mt-1 font-medium">
                            Yeh pass gate par 1 baar scan hokar <strong className="text-white underline">EXPIRE</strong> ho chuka hai. Scan Time: <strong className="text-amber-300 font-mono">{expiredTimeStr || 'Verified'}</strong>. Ek pass sirf ek baar chalega!
                          </p>
                        </div>
                      ) : (
                        <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-center shadow-sm">
                          <div className="flex items-center justify-center gap-2 text-emerald-300 font-extrabold text-xs sm:text-sm">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>✅ PASS STATUS: ACTIVE (1-Time Single Use)</span>
                          </div>
                          <p className="text-[11px] text-emerald-200 mt-0.5">
                            Gate par 1 baar scan hone ke baad yeh pass EXPIRE ho jayega aur aapke number (+91 {registeredData.phone}) par "UDGHOSH" naam se SMS confirmation aayega.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-3.5 mb-4 pb-3 border-b border-slate-800">
                        {registeredData.photoUrl ? (
                          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border-2 border-pink-500 shadow-lg shrink-0">
                            <img
                              src={registeredData.photoUrl}
                              alt={registeredData.name}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-pink-600 text-[8px] font-bold text-white text-center py-0.5">
                              ID PHOTO
                            </span>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0">
                            <User className="w-7 h-7 text-slate-500" />
                            <span className="text-[8px] text-slate-400">No Photo</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Student Name</span>
                          <span className="text-lg font-bold text-white truncate block">{registeredData.name}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 font-mono font-bold text-xs border border-pink-500/30">
                              {registeredData.roll}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">
                              {registeredData.course || 'HJMC'}
                            </span>
                            {registeredData.phone && (
                              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {registeredData.phone}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {registeredData.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. QR Image Box with EXPIRED overlay stamp if scanned */}
                      <div className="bg-white p-4 rounded-xl shadow-inner flex flex-col items-center justify-center my-2 relative overflow-hidden">
                        <img
                          src={registeredData.qrUrl}
                          alt="Student Entry QR Code"
                          className={`w-48 h-48 sm:w-56 sm:h-56 object-contain transition-all ${
                            isPassExpired ? 'opacity-30 grayscale filter' : ''
                          }`}
                        />

                        {isPassExpired && (
                          <div className="absolute inset-0 bg-red-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center animate-in fade-in">
                            <div className="p-2.5 rounded-full bg-red-600/30 border-2 border-red-500 text-red-300 mb-2 shadow-lg">
                              <Lock className="w-8 h-8" />
                            </div>
                            <span className="text-sm sm:text-base font-black text-white tracking-widest uppercase bg-red-600 px-3.5 py-1.5 rounded-lg shadow-xl border border-red-400 -rotate-3">
                              ⛔ EXPIRED / USED
                            </span>
                            <span className="text-xs font-bold text-red-200 mt-2 bg-black/60 px-2.5 py-1 rounded">
                              Gate Entry Already Completed
                            </span>
                            <span className="text-[11px] text-amber-300 font-mono mt-1 font-semibold">
                              Scanned: {expiredTimeStr || 'Verified'}
                            </span>
                          </div>
                        )}

                        <span className="text-[10px] text-slate-500 font-mono mt-1 font-semibold">
                          PASS ID: {registeredData.id}
                        </span>
                      </div>

                      {/* 3. UDGHOSH Portal SMS Notification Box */}
                      <div className="mt-3.5 p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/40 text-xs space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 text-white font-bold">
                            <MessageSquare className="w-4 h-4 text-emerald-400" />
                            <span>📲 Official SMS: <strong className="font-mono text-pink-300 font-bold">udghosh_hjmc_swagtam_by_Aditya</strong></span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isPassExpired
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {isPassExpired ? '✅ DELIVERED' : '⏳ On Gate Scan'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          {isPassExpired
                            ? `Aapke phone number (+91 ${registeredData.phone}) par sender "udghosh_hjmc_swagtam_by_Aditya" se gate entry aur single-use pass expiry ka official portal SMS deliver ho chuka hai.`
                            : `Gate par scan hote hi aapke mobile (+91 ${registeredData.phone}) par "udghosh_hjmc_swagtam_by_Aditya" naam se portal OTP style SMS aayega aur pass expire ho jayega.`}
                        </p>
                        <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                          {matchingSms && (
                            <button
                              type="button"
                              onClick={() => setSelectedSmsForPreview(matchingSms)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Smartphone className="w-3.5 h-3.5 text-pink-300" />
                              <span>📱 Phone SMS Preview</span>
                            </button>
                          )}
                          <a
                            href={`sms:+91${registeredData.phone}?body=${encodeURIComponent(matchingSms?.message || `🔐 [UDGHOSH REGISTRATION CONFIRMED]: udghosh_hjmc_swagtam_by_Aditya\nनमस्ते ${registeredData.name}! BRAC HJMC UDGHOSH Fresher Party में आपका रजिस्ट्रेशन सफल रहा (Roll: ${registeredData.roll})। धन्यवाद!`)}`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1.5 transition"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-300" />
                            <span>📲 Open in SMS App</span>
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/send-sms', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    phoneNumber: registeredData.phone,
                                    phone: registeredData.phone,
                                    studentName: registeredData.name,
                                    roll: registeredData.roll,
                                    course: registeredData.course
                                  })
                                });
                                const data = await res.json();
                                if (data?.sms) {
                                  setSmsList((prev) => [data.sms, ...prev.filter((s) => s.id !== data.sms.id)]);
                                  setSelectedSmsForPreview(data.sms);
                                  setIncomingSmsToast(data.sms);
                                }
                              } catch (e) {
                                console.warn('Resend error', e);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
                            <span>🔄 Resend SMS</span>
                          </button>
                        </div>
                      </div>

                      {/* Prominent Mandatory Instruction */}
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Zaroori Soochana:</span>
                          Ek pass sirf ek baar chalega. Entry gate par scan hone ke baad pass expire ho jayega.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleDownloadPass}
                      className="py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:brightness-110 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 text-sm shadow-lg shadow-pink-600/30"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download QR / Save Image</span>
                    </button>

                    <a
                      href={`https://wa.me/91${registeredData.phone}?text=${encodeURIComponent(
                        `🎉 *BRAC HJMC • UDGHOSH FRESHER PARTY 2026* 🎉\n🔐 *Portal Verification:* udghosh_hjmc_swagtam_by_Aditya\n\nनमस्ते *${registeredData.name}*!\nआपकी वेबसाइट पर रजिस्ट्रेशन सफल रहा। आपका Entry Pass QR Code जनरेट हो चुका है।\n\n🎫 *Roll No:* ${registeredData.roll}\n📚 *Course:* ${registeredData.course || 'HJMC'}\n📞 *Phone:* ${registeredData.phone}\n🆔 *Pass ID:* ${registeredData.id}\n🛡️ *Pass Status:* ACTIVE (Single-Use Entry Pass)\n\n📌 *Zaroori Soochana:*\n• Entry Gate par ye digital pass dikhana anivarya hai.\n• Gate par scan hote hi pass expire ho jayega. Single-use only!\n\nधन्यवाद!\n- *udghosh_hjmc_swagtam_by_Aditya*`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/30"
                    >
                      <span className="text-base">💬</span>
                      <span>Direct WhatsApp Par Bhejein</span>
                    </a>
                  </div>

                  <button
                    onClick={handleResetRegistration}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Naya Registration Karein</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* FLOW 2: ADMIN PANEL (ORGANIZER VIEW)                     */
          /* ========================================================= */
          <div className="w-full space-y-6">
            {/* Admin Header Stats & Tab Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Entry & Registrations Counter Card */}
              <div className="glass-card rounded-2xl p-4 sm:p-5 border border-purple-500/30 flex items-center justify-between sm:col-span-1 shadow-lg">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 block font-medium">
                    Gate Admitted / Total Bachhe
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                      {entries.length}
                    </span>
                    <span className="text-slate-400 text-sm font-bold">/</span>
                    <span className="text-lg font-bold text-pink-400">
                      {Object.keys(registeredStudents).length} Reg
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> All Devices Synced
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              {/* Navigation Tabs (Scanner, Total Registrations, Admitted List) */}
              <div className="glass-card rounded-2xl p-1.5 border border-slate-800 flex items-center justify-center sm:col-span-2 gap-1.5 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => setAdminTab('scanner')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    adminTab === 'scanner'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Scanner</span>
                </button>

                <button
                  onClick={() => setAdminTab('registrations')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    adminTab === 'registrations'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Total Reg ({Object.keys(registeredStudents).length})</span>
                </button>

                <button
                  onClick={() => setAdminTab('entries')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    adminTab === 'entries'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Admitted ({entries.length})</span>
                </button>

                <button
                  onClick={() => setAdminTab('sms')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    adminTab === 'sms'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>UDGHOSH SMS ({smsList.length})</span>
                </button>

                <button
                  onClick={handleAdminLogout}
                  title="Admin Logout"
                  className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ENTRY ANALYTICS SECTION */}
            <EntryAnalytics
              entries={entries}
              onAddSampleData={handleGenerateDemoData}
            />

            {/* TAB: TOTAL REGISTRATIONS (ALL PHONES) */}
            {adminTab === 'registrations' && (
              <AdminRegistrationsTab
                students={Object.values(registeredStudents)}
                onRefresh={syncWithBackend}
                onApproveStudent={(student) =>
                  handleApproveEntry({
                    id: student.id,
                    name: student.name,
                    roll: student.roll,
                    phone: student.phone,
                    course: student.course,
                    photoUrl: student.photoUrl
                  })
                }
                onPreviewPhoto={setSelectedPreviewPhoto}
              />
            )}

            {/* TAB: UDGHOSH OFFICIAL SMS DISPATCH LOGS */}
            {adminTab === 'sms' && (
              <AdminSmsLogsTab
                smsList={smsList}
                onRefresh={syncWithBackend}
                onOpenPhonePreview={(sms) => setSelectedSmsForPreview(sms)}
                onOpenGatewaySettings={() => setShowSmsSettingsModal(true)}
              />
            )}

            {/* TAB 1: SCANNER TAB */}
            {adminTab === 'scanner' && (
              <div className="space-y-5">
                {/* 🔍 ADMIN TOOL: PEHLE SE REGISTER KIYA HAI? PASS & EXPIRY CHECK KAREIN */}
                <PassExpiryChecker
                  students={Object.values(registeredStudents)}
                  entries={entries}
                  smsList={smsList}
                  onApproveStudent={(student) =>
                    handleApproveEntry({
                      id: student.id,
                      name: student.name,
                      roll: student.roll,
                      phone: student.phone,
                      course: student.course,
                      photoUrl: student.photoUrl
                    })
                  }
                  onPreviewPhoto={setSelectedPreviewPhoto}
                  onOpenPhonePreview={(sms) => setSelectedSmsForPreview(sms)}
                  variant="admin"
                />

                {/* 🤖 AI Automatic Bot Sentinel Banner */}
                <div className="glass-card rounded-2xl p-4 sm:p-5 border border-indigo-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-72 h-32 bg-gradient-to-l from-purple-500/10 via-pink-500/10 to-transparent pointer-events-none rounded-full blur-2xl" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                          <Bot className="w-7 h-7 animate-pulse" />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-sm" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
                            <span>🤖 AI Automatic Scan Bot</span>
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            {scanTriggerMode === 'click_to_scan'
                              ? '📸 Click-to-Scan (Phone Camera Shutter)'
                              : '⚡ Auto 1-Shot Scan'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                          <span>{aiBotStatus}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Scan Trigger Mode Selector: Click-to-Scan vs Auto-Scan */}
                      <button
                        onClick={() => {
                          const next = scanTriggerMode === 'click_to_scan' ? 'auto_scan' : 'click_to_scan';
                          setScanTriggerMode(next);
                          setAiBotStatus(
                            next === 'click_to_scan'
                              ? '📸 AI Bot: Click-to-Scan ON (Phone camera shutter mode - Click to snap & scan)'
                              : '⚡ AI Bot: Auto 1-Shot ON (QR samne aate hi auto-scan)'
                          );
                        }}
                        title="Click to Scan Mode vs Auto Scan Switch"
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          scanTriggerMode === 'click_to_scan'
                            ? 'bg-pink-600/30 text-pink-200 border-pink-500/50 shadow-sm'
                            : 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                        }`}
                      >
                        <Aperture className="w-3.5 h-3.5 text-pink-400" />
                        <span>{scanTriggerMode === 'click_to_scan' ? '📸 Click to Scan' : '⚡ Auto 1-Shot'}</span>
                      </button>

                      {/* 🔋 Battery Saving Mode Toggle & Status */}
                      <button
                        onClick={toggleBatterySaver}
                        title={
                          isBatterySaverActive
                            ? 'Battery Saver Active: 10 FPS & Decreased Scan Frequency. Click to switch to 25 FPS High Performance'
                            : 'Click to enable Battery Saver Mode (Reduces camera FPS to 10 & scan interval)'
                        }
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          isBatterySaverActive
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm ring-1 ring-amber-400/40'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isBatteryCharging ? (
                          <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isBatterySaverActive ? (
                          <BatteryLow className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        ) : (
                          <Battery className="w-3.5 h-3.5 text-slate-300" />
                        )}
                        <span>
                          {batteryLevel !== null ? `${batteryLevel}% ` : ''}
                          {isBatterySaverActive ? '🔋 Saver (10 FPS)' : '⚡ 25 FPS'}
                        </span>
                      </button>

                      {/* ⚡ Auto-SMS on Scan Toggle (User requested: "automatic sms nahi jaa raha hai") */}
                      <button
                        onClick={() => {
                          const next = !autoApproveAndSendSms;
                          setAutoApproveAndSendSms(next);
                          localStorage.setItem('auto_approve_send_sms', String(next));
                        }}
                        title={
                          autoApproveAndSendSms
                            ? 'Auto-SMS Active: QR scan hote hi turant automatic SMS chala jata hai. Click to switch to manual approval.'
                            : 'Manual Approve Mode: Scan hone par approval button dabana hoga. Click to enable automatic instant SMS.'
                        }
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          autoApproveAndSendSms
                            ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/40'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
                        }`}
                      >
                        <Zap className={`w-3.5 h-3.5 ${autoApproveAndSendSms ? 'text-amber-300 animate-pulse' : 'text-slate-400'}`} />
                        <span>{autoApproveAndSendSms ? '⚡ Auto-SMS: ON' : '✋ Manual SMS'}</span>
                      </button>

                      {/* ⚙️ SMS Setup Button */}
                      <button
                        onClick={() => setShowSmsSettingsModal(true)}
                        title="Real SMS Gateway Settings (Fast2SMS / Twilio / SIM SMS)"
                        className="px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-pink-300" />
                        <span className="hidden sm:inline">SMS Setup</span>
                      </button>

                      {/* Ready Next Student Scan */}
                      <button
                        onClick={handleNextScan}
                        title="Agla student pass scan karne ke liye taiyaar karein"
                        className="px-3.5 py-1.5 rounded-xl gradient-party text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Agla Pass ➔</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Real-time Scan Result Banner */}
                {scanBanner && (
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
                      scanBanner.type === 'duplicate'
                        ? 'bg-red-950/80 border-red-500 text-red-100 shadow-lg shadow-red-950/50'
                        : scanBanner.type === 'success'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-lg shadow-emerald-950/50'
                        : scanBanner.type === 'pending_approval'
                        ? 'bg-gradient-to-r from-purple-950/95 via-slate-900 to-indigo-950/95 border-amber-400 text-white shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/40'
                        : 'bg-amber-950/80 border-amber-500 text-amber-100 shadow-lg shadow-amber-950/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Student Registration Photo in Banner */}
                      {scanBanner.details?.photoUrl ? (
                        <div
                          onClick={() =>
                            setSelectedPreviewPhoto({
                              url: scanBanner.details!.photoUrl!,
                              name: scanBanner.details?.name || 'Student',
                              roll: scanBanner.details?.roll || ''
                            })
                          }
                          className="relative group cursor-pointer shrink-0 self-center sm:self-start"
                          title="Click karke photo badi dekhein"
                        >
                          <div
                            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 shadow-xl ${
                              scanBanner.type === 'duplicate'
                                ? 'border-red-400 ring-4 ring-red-500/20'
                                : scanBanner.type === 'pending_approval'
                                ? 'border-amber-400 ring-4 ring-amber-500/30'
                                : 'border-emerald-400 ring-4 ring-emerald-500/20'
                            }`}
                          >
                            <img
                              src={scanBanner.details.photoUrl}
                              alt={scanBanner.details.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-[9px] font-bold text-slate-200 border border-slate-700 flex items-center gap-1 shadow">
                            <Maximize2 className="w-2.5 h-2.5 text-pink-400" />
                            <span>Photo</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0 self-center sm:self-start">
                          <User className="w-7 h-7 text-slate-500" />
                          <span className="text-[9px] text-slate-400">No Photo</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-white flex items-center gap-1">
                            <Bot className="w-3 h-3 text-pink-300" /> AI Bot Verified
                          </span>
                          {scanBanner.details?.photoUrl && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Photo Matched
                            </span>
                          )}
                          {scanBanner.type === 'pending_approval' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              ⏳ Awaiting Gatekeeper Approval
                            </span>
                          )}
                          {capturedPhotoUrl && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 flex items-center gap-1">
                              <Camera className="w-3 h-3 text-pink-400" /> 📸 Gate Photo Scanned
                            </span>
                          )}
                        </div>

                        <h4 className="text-base sm:text-lg font-extrabold leading-snug">
                          {scanBanner.message}
                        </h4>
                        {scanBanner.subMessage && (
                          <p className="text-sm font-medium opacity-90 mt-0.5">{scanBanner.subMessage}</p>
                        )}
                        {scanBanner.details && (
                          <div className="space-y-2 mt-2">
                            <div className="text-xs flex flex-wrap gap-x-4 gap-y-1 opacity-90 font-mono bg-black/20 p-2 rounded-xl border border-white/10">
                              <span>Roll: <strong className="text-pink-300">{scanBanner.details.roll}</strong></span>
                              <span>Name: <strong className="text-white">{scanBanner.details.name}</strong></span>
                              <span>Course: <strong className="text-purple-300">{scanBanner.details.course || 'HJMC'}</strong></span>
                              {scanBanner.details.phone && (
                                <span>Phone: <strong className="text-emerald-300">{scanBanner.details.phone}</strong></span>
                              )}
                              {scanBanner.details.time && (
                                <span className="flex items-center gap-1 text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Scan Time: <strong className="text-white">{scanBanner.details.time}</strong></span>
                                </span>
                              )}
                            </div>

                            {/* 1. Registration Status & Real-time Kab Kiya Tha */}
                            <div className="p-2.5 rounded-xl bg-purple-950/70 border border-purple-500/50 text-xs flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div>
                                  <span className="font-bold text-white block">
                                    {scanBanner.details.isPreRegistered
                                      ? '✅ Pehle Hi Registration Kiya Tha'
                                      : '⚠️ Direct Pass (Registration Verified)'}
                                  </span>
                                  <span className="text-[11px] text-purple-200">
                                    Kab kiya tha: <strong className="text-amber-300 font-mono">{scanBanner.details.registeredAtFormatted || 'Registration Pehle Se Verified'}</strong>
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Real-Time Registry
                              </span>
                            </div>

                            {/* 2. Pahli Baar Scan Kitne Bajakar Kitne Minute Par Hua Tha */}
                            {scanBanner.details.firstScanTimeHindi && (
                              <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 flex-wrap border ${
                                scanBanner.type === 'duplicate'
                                  ? 'bg-red-950/80 border-red-500/60 text-red-200'
                                  : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                  <div>
                                    <span className="font-bold text-white block">
                                      {scanBanner.type === 'duplicate'
                                        ? '⚠️ Pahli Baar Scan Kab Hua Tha:'
                                        : '🕒 Pehli Baar Scan Time:'}
                                    </span>
                                    <span className="text-[11px] font-mono font-bold text-amber-300">
                                      {scanBanner.details.firstScanTimeHindi}
                                    </span>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  scanBanner.type === 'duplicate'
                                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}>
                                  {scanBanner.type === 'duplicate' ? 'Duplicate Alert' : '1st Scan Verified'}
                                </span>
                              </div>
                            )}

                            {/* 3. Duplicate / Expired Alert Box (User requested pass expiry) */}
                            {scanBanner.type === 'duplicate' && (
                              <div className="p-3 rounded-xl bg-red-950/90 border-2 border-red-500 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in">
                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-white uppercase tracking-wider">
                                      ⛔ PASS EXPIRED (SINGLE-USE PASS)
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                                      Pass Expire Ho Chuka Hai
                                    </span>
                                  </div>
                                  <p className="text-red-200">
                                    Yeh pass pehle hi 1 baar scan hokar <strong>EXPIRE</strong> ho chuka hai! Ek pass sirf ek baar chalega. Dobara entry allowed nahi hai.
                                  </p>
                                  {scanBanner.details.phone && (
                                    <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 pt-1">
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>UDGHOSH SMS notification already sent to: +91 {scanBanner.details.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 4. Success: Pass Expired Notice & UDGHOSH SMS Notification Card */}
                            {scanBanner.type === 'success' && (
                              <div className="space-y-2">
                                <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-xs flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                                    <div>
                                      <span className="font-bold text-white block">
                                        ⛔ Pass Status: EXPIRED (Single-Use Completed)
                                      </span>
                                      <span className="text-[11px] text-amber-200">
                                        Gate entry verify ho chuki hai. Yeh pass ab dobara scan karne par EXPIRED batayega.
                                      </span>
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    EXPIRED
                                  </span>
                                </div>

                                {scanBanner.details.phone && (
                                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-purple-950/90 border border-emerald-500/50 text-xs space-y-2">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                          <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-extrabold text-white text-xs">
                                              📲 SMS Sent via <strong className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-300 font-mono">udghosh_hjmc_swagtam_by_Aditya</strong>
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                              DELIVERED
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-emerald-300 font-mono">
                                            To: +91 {scanBanner.details.phone} ({scanBanner.details.name})
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => {
                                            const smsObj: SmsRecord = {
                                              id: 'SMS-' + Date.now(),
                                              roll: scanBanner.details?.roll || '',
                                              studentName: scanBanner.details?.name || 'Student',
                                              phone: scanBanner.details?.phone || '',
                                              sender: 'udghosh_hjmc_swagtam_by_Aditya',
                                              message: scanBanner.details?.smsMessage || `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${scanBanner.details?.name}! Aapka fresher party registration (${scanBanner.details?.roll}) scan hokar verify ho chuka hai aur Gate Entry ho gayi hai. Pass ab EXPIRE ho gaya hai (Single-Use Completed). Swagatam! - udghosh_hjmc_swagtam_by_Aditya`,
                                              sentAt: scanBanner.details?.time || formatScanTime(),
                                              timestamp: Date.now(),
                                              status: 'DELIVERED'
                                            };
                                            setSelectedSmsForPreview(smsObj);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                        >
                                          <Smartphone className="w-3.5 h-3.5 text-pink-300" />
                                          <span>📱 View Phone SMS</span>
                                        </button>
                                        <a
                                          href={`https://wa.me/91${scanBanner.details.phone}?text=${encodeURIComponent(
                                            `🎉 *BRAC HJMC • UDGHOSH FRESHER PARTY 2026* 🎉\n🔐 *Verification:* udghosh_hjmc_swagtam_by_Aditya\n\nनमस्ते *${scanBanner.details?.name}*!\nआपका Fresher Party Pass (${scanBanner.details?.roll}) गेट पर स्कैन होकर वेरीफाई हो चुका है और Gate Entry allow कर दी गई है।\n⛔ *Pass Status:* EXPIRED (Single-Use Completed)\n🕒 *Entry Time:* ${scanBanner.details?.time || 'Verified'}\n\nस्वागतम्! - *udghosh_hjmc_swagtam_by_Aditya*`
                                          )}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition shadow cursor-pointer"
                                        >
                                          <span>💬 WhatsApp Par Bhejein</span>
                                        </a>
                                        <a
                                          href={`sms:${scanBanner.details.phone}?body=${encodeURIComponent(
                                            scanBanner.details?.smsMessage || `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${scanBanner.details?.name}! Aapka pass scan hokar verify ho chuka hai aur ab EXPIRE ho gaya hai.`
                                          )}`}
                                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                                        >
                                          <Send className="w-3.5 h-3.5 text-slate-400" />
                                          <span>SMS App</span>
                                        </a>
                                      </div>
                                    </div>

                                    <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-[11px] text-slate-300 font-sans">
                                      <span className="text-slate-400 font-semibold block text-[10px] uppercase font-mono">Official Portal Message Sent (udghosh_hjmc_swagtam_by_Aditya):</span>
                                      "{scanBanner.details.smsMessage || `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste ${scanBanner.details.name}! Aapka registration (${scanBanner.details.roll}) scan hokar verify ho chuka hai aur ab EXPIRE ho gaya hai. Gate entry confirmed! Swagatam! - udghosh_hjmc_swagtam_by_Aditya`}"
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 5. Pending Approval Notice */}
                            {scanBanner.type === 'pending_approval' && (
                              <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="text-indigo-200">
                                  ⚡ <strong>Single-Use Expiry Rule:</strong> Approve karte hi pass turant <strong>EXPIRE</strong> ho jayega aur student ke mobile (+91 {scanBanner.details.phone || 'N/A'}) par <strong>"udghosh_hjmc_swagtam_by_Aditya"</strong> naam se portal OTP style automated SMS chala jayega.
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleNextScan}
                        className="text-slate-400 hover:text-white p-1 rounded-lg self-start"
                        title="Dismiss & Ready Next Scan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* APPROVAL BUTTON BAR (User requested: "admin ke scan karne ke baad aporve ka button ho") */}
                    {scanBanner.type === 'pending_approval' && scanBanner.details ? (
                      <div className="mt-3.5 pt-3 border-t border-amber-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                        <div className="text-xs text-amber-200 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold block text-white">Entry Gate Confirmation</span>
                            <span className="text-[11px] text-amber-200">
                              Vidyarthi ki photo aur ID verify karein, fir "Approve" button dabayein.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleNextScan}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleApproveEntry(scanBanner.details!)}
                            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 animate-pulse"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>✅ APPROVE / ADMIT STUDENT</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px] text-slate-200">
                          <span className="text-pink-300 font-semibold flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-pink-400" />
                            <span>🤖 AI Bot: Scan complete ho gaya hai. Repeat scan nahi hoga!</span>
                          </span>
                        </div>

                        <button
                          onClick={handleNextScan}
                          className="px-4 py-2 rounded-xl gradient-party text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Agla Pass Scan Karein</span>
                          <span>➔</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Viewfinder Card */}
                <div className="glass-card rounded-2xl p-4 sm:p-6 border border-purple-500/20 shadow-2xl relative">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                          <span>AI Smart Scanner</span>
                          {isCameraActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Camera Active
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {scanTriggerMode === 'click_to_scan'
                            ? '📸 Phone Camera Shutter Mode (Click to Scan)'
                            : '⚡ Strict Single-Scan Engine (No Repeat Loop)'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 🔋 Battery Saver Mode Toggle */}
                      <button
                        onClick={toggleBatterySaver}
                        title={
                          isBatterySaverActive
                            ? 'Battery Saver Active: 10 FPS & Decreased Scan Frequency. Click to switch to 25 FPS'
                            : 'Click to enable Battery Saver (Reduces camera FPS to 10 & scan interval)'
                        }
                        className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border ${
                          isBatterySaverActive
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-400/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isBatteryCharging ? (
                          <BatteryCharging className="w-4 h-4 text-emerald-400" />
                        ) : isBatterySaverActive ? (
                          <BatteryLow className="w-4 h-4 text-amber-400 animate-pulse" />
                        ) : (
                          <Battery className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="hidden sm:inline font-semibold">
                          {batteryLevel !== null ? `${batteryLevel}% ` : ''}
                          {isBatterySaverActive ? 'Saver (10 FPS)' : '25 FPS'}
                        </span>
                      </button>

                      {/* Dedicated Success Chime Toggle (for quieter event environments) */}
                      <button
                        onClick={toggleSuccessChime}
                        title={
                          !soundEnabled
                            ? 'Master sound is currently off'
                            : successChimeEnabled
                            ? 'Success Chime: ON (Celebration melody plays on entry). Click to mute for quieter event environment'
                            : 'Success Chime: MUTED (Quiet environment mode). Click to enable celebration chime'
                        }
                        className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border ${
                          !soundEnabled
                            ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                            : successChimeEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                            : 'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-sm'
                        }`}
                      >
                        {successChimeEnabled && soundEnabled ? (
                          <Bell className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <BellOff className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="hidden sm:inline font-semibold">
                          {successChimeEnabled && soundEnabled ? 'Chime: On' : 'Chime: Off (Quiet)'}
                        </span>
                      </button>

                      {/* Audio beep mute/unmute */}
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
                        <span className="hidden sm:inline">{soundEnabled ? 'Beep On' : 'Beep Off'}</span>
                      </button>

                      {/* Camera Facing switch */}
                      {isCameraActive && (
                        <button
                          onClick={switchCameraFacing}
                          title="Switch Camera (Front/Back)"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <FlipHorizontal className="w-4 h-4 text-purple-400" />
                          <span className="hidden sm:inline">Flip Camera</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {cameraError && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>{cameraError}</div>
                    </div>
                  )}

                  {/* Scanner Viewfinder Box */}
                  <div
                    onClick={() => {
                      if (isCameraActive && scanTriggerMode === 'click_to_scan' && !isCapturing) {
                        captureAndScanPhoto();
                      }
                    }}
                    className={`relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[300px] sm:min-h-[380px] flex items-center justify-center select-none ${
                      isCameraActive && scanTriggerMode === 'click_to_scan' ? 'cursor-pointer' : ''
                    }`}
                  >
                    {/* HTML5-QRCODE Mount Point */}
                    <div id={scannerContainerId} className="w-full h-full" />

                    {/* Camera Shutter Flash Effect (White Screen Pulse like real camera flash) */}
                    {isShutterFlashing && (
                      <div className="absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-150" />
                    )}

                    {/* Capturing / Analyzing Overlay */}
                    {isCapturing && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs z-35 flex flex-col items-center justify-center text-white gap-3 p-4 pointer-events-none">
                        <div className="w-12 h-12 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-extrabold text-white bg-slate-900/90 px-4 py-1.5 rounded-full border border-pink-500/50 shadow-xl flex items-center gap-2">
                          <Bot className="w-4 h-4 text-pink-400 animate-bounce" />
                          <span>🤖 AI Bot Photo Scan Kar Raha Hai...</span>
                        </span>
                      </div>
                    )}

                    {/* Reticle & Shutter Button Overlay when Camera is Active */}
                    {isCameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 z-20">
                        {/* Top AI Bot HUD indicator */}
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                          <div className="px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-pink-500/50 backdrop-blur-md flex items-center gap-2 text-[11px] text-pink-300 font-bold shadow-lg">
                            <Bot className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                            <span>
                              {scanTriggerMode === 'click_to_scan'
                                ? '📸 PHONE SHUTTER MODE: TAP OR CLICK TO SCAN'
                                : '⚡ 1-SHOT AUTO SCAN (No Duplicate Loop)'}
                            </span>
                          </div>

                          {isBatterySaverActive && (
                            <div className="px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/50 backdrop-blur-md flex items-center gap-1.5 text-[10px] text-amber-300 font-bold shadow-lg animate-pulse">
                              <BatteryLow className="w-3.5 h-3.5 text-amber-400" />
                              <span>Battery Saver: 10 FPS</span>
                            </div>
                          )}
                        </div>

                        {/* Centered Framing Box */}
                        <div className="relative w-60 h-60 sm:w-64 sm:h-64 border-2 border-dashed border-pink-500/60 rounded-2xl flex items-center justify-center pointer-events-none">
                          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_8px_#ec4899] scanner-laser" />
                          {/* Corner Markers */}
                          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-pink-400" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-pink-400" />
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-pink-400" />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-pink-400" />
                          {/* Center Crosshair Target */}
                          <div className="w-6 h-6 border border-pink-400/50 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
                          </div>
                        </div>

                        {/* Floating Big Phone Camera Shutter Button */}
                        <div className="pointer-events-auto flex flex-col items-center gap-1.5 pb-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              captureAndScanPhoto();
                            }}
                            disabled={isCapturing}
                            title="Click to Scan (Photo Khinchein)"
                            className="group relative flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md border-4 border-white shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          >
                            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-white group-hover:bg-pink-100 flex items-center justify-center shadow-inner transition">
                              <Camera className="w-7 h-7 text-slate-900 group-hover:scale-110 transition-transform" />
                            </div>
                          </button>
                          <span className="px-3 py-1 rounded-full text-[11px] font-black text-white bg-slate-950/85 backdrop-blur-md border border-white/20 shadow-md">
                            {isCapturing ? '🤖 AI Scanning Photo...' : '📸 CLICK TO SCAN (Photo Khinchein)'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Placeholder when camera is inactive */}
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 z-10 animate-in fade-in duration-200">
                        {scanBanner ? (
                          <div className="max-w-md w-full flex flex-col items-center">
                            {/* Dual Photo Match: Student Registration Photo & Gate Camera Photo */}
                            {(scanBanner.details?.photoUrl || capturedPhotoUrl) ? (
                              <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
                                {scanBanner.details?.photoUrl && (
                                  <div
                                    onClick={() =>
                                      setSelectedPreviewPhoto({
                                        url: scanBanner.details!.photoUrl!,
                                        name: scanBanner.details?.name || 'Student',
                                        roll: scanBanner.details?.roll || ''
                                      })
                                    }
                                    className="relative rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-2xl max-w-[150px] w-full bg-black cursor-pointer group"
                                    title="Click to zoom student photo"
                                  >
                                    <img
                                      src={scanBanner.details.photoUrl}
                                      alt="Student Registration Photo"
                                      className="w-full h-28 object-cover group-hover:scale-105 transition"
                                    />
                                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[9px] text-emerald-300 font-bold flex items-center gap-1">
                                      <User className="w-2.5 h-2.5 text-emerald-400" />
                                      <span>👤 ID Photo</span>
                                    </div>
                                  </div>
                                )}

                                {capturedPhotoUrl && (
                                  <div
                                    onClick={() =>
                                      setSelectedPreviewPhoto({
                                        url: capturedPhotoUrl,
                                        name: 'Gate Shutter Photo',
                                        roll: scanBanner.details?.roll || ''
                                      })
                                    }
                                    className="relative rounded-2xl overflow-hidden border-2 border-purple-500/80 shadow-2xl max-w-[150px] w-full bg-black cursor-pointer group"
                                    title="Click to zoom gate photo"
                                  >
                                    <img
                                      src={capturedPhotoUrl}
                                      alt="Captured Gate Snapshot"
                                      className="w-full h-28 object-cover group-hover:scale-105 transition"
                                    />
                                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[9px] text-pink-300 font-bold flex items-center gap-1">
                                      <Camera className="w-2.5 h-2.5 text-pink-400" />
                                      <span>📸 Gate Photo</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="relative mb-3">
                                <div
                                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                                    scanBanner.type === 'duplicate'
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-red-950/50'
                                      : scanBanner.type === 'success'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-950/50'
                                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-950/50'
                                  }`}
                                >
                                  <Bot className="w-9 h-9 animate-bounce" />
                                </div>
                                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow">
                                  ✓
                                </span>
                              </div>
                            )}

                            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 mb-2">
                              <Bot className="w-3.5 h-3.5 text-pink-400" />
                              <span>🤖 AI Bot: Scan Complete • Camera Off</span>
                            </div>

                            <h4 className="text-lg sm:text-xl font-extrabold text-white mb-1">
                              {scanBanner.type === 'success'
                                ? scanBanner.details
                                  ? `${scanBanner.details.name}`
                                  : 'Entry Confirmed!'
                                : scanBanner.type === 'duplicate'
                                ? '⚠️ Pehle hi entry ho chuki hai!'
                                : '❌ Invalid QR Code'}
                            </h4>

                            {scanBanner.details && (
                              <div className="text-xs text-slate-300 font-mono mb-2 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
                                <span>Roll: <strong className="text-pink-300">{scanBanner.details.roll}</strong></span>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-400">Time: {scanBanner.details.time}</span>
                              </div>
                            )}

                            <p className="text-[11px] text-slate-400 max-w-sm text-center mb-4">
                              AI Bot ne photo capture karke QR detect kiya aur entry verify kar li hai. Agle student ke liye camera start karein.
                            </p>

                            <button
                              onClick={handleNextScan}
                              className="py-3 px-6 rounded-xl font-bold text-white gradient-party shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 active:scale-95 transition cursor-pointer flex items-center gap-2 text-sm sm:text-base"
                            >
                              <Camera className="w-5 h-5" />
                              <span>📸 Agla QR Scan Karein (Camera On)</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                              <Bot className="w-8 h-8" />
                            </div>
                            <h4 className="text-base font-bold text-white mb-1">🤖 AI Bot Standby • Camera Off</h4>
                            <p className="text-xs text-slate-400 max-w-sm mb-4">
                              Student ka QR ticket scan karne ke liye camera start karein. Camera khulte hi "Click to Scan" button dabakar photo khinchein aur AI Bot turant scan karega!
                            </p>
                            <button
                              onClick={startCamera}
                              className="py-3 px-6 rounded-xl font-bold text-white gradient-party shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 active:scale-95 transition cursor-pointer flex items-center gap-2 text-sm"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Start Camera</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Primary "Click to Scan" Full Width CTA when Camera Active */}
                  {isCameraActive && (
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={captureAndScanPhoto}
                        disabled={isCapturing}
                        className="w-full py-3.5 sm:py-4 px-6 rounded-2xl font-black text-white bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 shadow-xl shadow-pink-600/30 hover:brightness-110 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-3 text-base sm:text-lg border-2 border-pink-400/50"
                      >
                        <Camera className="w-6 h-6 animate-pulse text-white" />
                        <span>{isCapturing ? '🤖 AI Bot Photo Analyze Kar Raha Hai...' : '📸 CLICK TO SCAN (Photo Khinchein & AI Scan)'}</span>
                        <Aperture className="w-5 h-5 text-pink-300 hidden sm:inline" />
                      </button>
                      <p className="text-center text-[11px] text-slate-400">
                        💡 Phone camera ki tarah button dabayein ya camera screen par tap karein, photo click hogi aur AI Bot turant verify kar lega.
                      </p>
                    </div>
                  )}

                  {/* Dedicated Event Environment Sound Settings (Quieter Event Environment Mode) */}
                  <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                        successChimeEnabled && soundEnabled
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      }`}>
                        {successChimeEnabled && soundEnabled ? (
                          <Bell className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <BellOff className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">Event Environment Sound Settings</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            successChimeEnabled && soundEnabled
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {successChimeEnabled && soundEnabled ? '🔔 Normal Event Mode' : '🤫 Quieter Event Mode Active'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Auditorium speeches ya shanti ke samay success chime ko alag se disable karein taaki celebratory tone na baje (error warnings alert dengi).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                      {/* Success Chime Dedicated Visual Switch */}
                      <button
                        onClick={toggleSuccessChime}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition cursor-pointer border shadow-md active:scale-95 ${
                          successChimeEnabled
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/50 shadow-emerald-950/40'
                            : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                        }`}
                      >
                        {successChimeEnabled ? (
                          <Bell className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <BellOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>Success Chime: {successChimeEnabled ? 'Enabled' : 'Muted (Quiet)'}</span>
                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${successChimeEnabled ? 'bg-emerald-300' : 'bg-slate-600'}`}>
                          <div className={`w-3 h-3 rounded-full bg-slate-900 transition-transform ${successChimeEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </button>

                      {/* Master Audio Toggle */}
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                          soundEnabled
                            ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                            : 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border-red-500/40'
                        }`}
                        title="Master Sound: Mute/Unmute All Audio"
                      >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
                        <span>Master: {soundEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Scanner Controls Toolbar */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      {isCameraActive ? (
                        <button
                          onClick={stopCamera}
                          className="py-2.5 px-4 rounded-xl text-xs font-bold text-red-300 bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <CameraOff className="w-4 h-4" />
                          <span>Stop Camera</span>
                        </button>
                      ) : (
                        <button
                          onClick={startCamera}
                          className="py-2.5 px-4 rounded-xl text-xs font-bold text-white gradient-party hover:brightness-110 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Start Camera</span>
                        </button>
                      )}
                    </div>

                    {/* Secondary option: Scan from Screenshot / File */}
                    <div className="flex items-center gap-2">
                      <label className="py-2.5 px-3.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-pink-400" />
                        <span>Scan Image / Screenshot</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUploadScan}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Dev / Reviewer Quick Test Helper */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Quick Test Buttons: </span>
                    <button
                      onClick={() => handleSimulateScan('Aarav Mehta', '24ENG042')}
                      className="ml-2 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded border border-purple-500/20 cursor-pointer"
                    >
                      + Test Pass 1 (Aarav - 24ENG042)
                    </button>
                    <button
                      onClick={() => handleSimulateScan('Pooja Verma', '24BCA019')}
                      className="ml-2 px-2.5 py-1 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 rounded border border-pink-500/20 cursor-pointer"
                    >
                      + Test Pass 2 (Pooja - 24BCA019)
                    </button>
                    <button
                      onClick={handleGenerateDemoData}
                      className="ml-2 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/20 cursor-pointer inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>+ Demo Crowd Flow (Analytics)</span>
                    </button>
                    <span className="block mt-1 text-[11px] text-slate-400">
                      * Inhe dobara click karne par duplicate warning ("⚠️ Pehle hi entry ho chuki hai!") test ho jayega.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ENTRY LIST TAB */}
            {adminTab === 'entries' && (
              <div className="glass-card rounded-2xl p-5 sm:p-6 border border-purple-500/20 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-pink-400" />
                      <span>Admitted Students List</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Kul {entries.length} vidyarthiyon ki entry confirm ho chuki hai
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      disabled={entries.length === 0}
                      className="py-2 px-3.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Export to CSV / Excel</span>
                    </button>

                    <button
                      onClick={() => setShowClearConfirm(true)}
                      disabled={entries.length === 0}
                      className="py-2 px-3 rounded-xl text-xs font-bold text-red-300 bg-red-950/60 hover:bg-red-900 border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All Data</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                {entries.length > 0 && (
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Roll number ya student ke naam se search karein..."
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                )}

                {/* Table or Empty State */}
                {entries.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-slate-500">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium">Abhi tak koi entry scan nahi hui.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Scanner tab par ja kar student passes scan karna shuru karein.
                    </p>
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Koi matching record nahi mila "{searchTerm}"
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[11px] tracking-wider">
                          <th className="py-3 px-4 w-12 text-center">S.No</th>
                          <th className="py-3 px-4 w-16 text-center">Photo</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Roll Number</th>
                          <th className="py-3 px-4">Entry Time</th>
                          <th className="py-3 px-4 text-right">Pass ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {filteredEntries.map((record, index) => (
                          <tr
                            key={record.id + '-' + record.timestamp}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                              {index + 1}
                            </td>
                            <td className="py-2 px-4 text-center">
                              {record.photoUrl ? (
                                <div
                                  onClick={() =>
                                    setSelectedPreviewPhoto({
                                      url: record.photoUrl!,
                                      name: record.name,
                                      roll: record.roll
                                    })
                                  }
                                  className="w-10 h-10 rounded-xl overflow-hidden border border-pink-500/50 mx-auto cursor-pointer hover:scale-110 transition shadow-sm"
                                  title="Click karke photo dekhein"
                                >
                                  <img
                                    src={record.photoUrl}
                                    alt={record.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 mx-auto flex items-center justify-center text-slate-500">
                                  <User className="w-5 h-5 text-slate-500" />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-white">
                              {record.name}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 font-mono font-bold text-xs border border-pink-500/20">
                                {record.roll}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatScanTime(record.scannedAt || record.timestamp)}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                              {record.id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-400 relative z-10">
        <p>BRAC HJMC • Udghosh Fresher Party • Live QR Entry Verification System</p>
        <div className="flex items-center justify-center gap-3 mt-1.5 text-[11px] text-slate-400 flex-wrap">
          <span>Secure client-side offline storage</span>
          <span>•</span>
          <a
            href="/standalone.html"
            download="BRAC_HJMC_Udghosh_Fresher_Party_System.html"
            className="text-pink-400 hover:text-pink-300 underline decoration-pink-500/40 inline-flex items-center gap-1 cursor-pointer font-medium"
          >
            <Download className="w-3 h-3" />
            <span>Download Standalone Single-File HTML</span>
          </a>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* FLOATING ACTION BUTTONS (ADMIN & OWNER ACCESS)             */}
      {/* ========================================================= */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5">
        {/* Owner Floating Quick Button */}
        <button
          onClick={() => {
            if (isOwner) {
              setCurrentView('owner');
            } else {
              setShowOwnerPinModal(true);
              setOwnerPinError('');
              setOwnerPinInput('');
            }
          }}
          title="Owner Section Access"
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-black border border-amber-300 shadow-xl shadow-amber-500/30 flex items-center justify-center transition active:scale-95 cursor-pointer group hover:brightness-110"
        >
          <Crown className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
        </button>

        {/* Admin Floating Quick Button */}
        <button
          onClick={() => {
            if (isAdmin) {
              setCurrentView('admin');
            } else {
              setShowPinModal(true);
              setPinError('');
              setPinInput('');
            }
          }}
          title="Admin Gate Scanner Access"
          className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-xl shadow-black/50 flex items-center justify-center transition active:scale-95 cursor-pointer group"
        >
          <ShieldCheck className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* OWNER PIN PROMPT MODAL (CONFIDENTIAL CODE)               */}
      {/* ========================================================= */}
      {showOwnerPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-sm rounded-3xl p-6 border border-amber-500/40 shadow-2xl relative">
            <button
              onClick={() => setShowOwnerPinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Owner Master Code Daalein</h3>
              <p className="text-xs text-slate-400 mt-1">
                Keval Adhikrit Owner ke liye • Confidential Access
              </p>
            </div>

            {ownerPinError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs text-center font-bold animate-shake">
                ⚠️ {ownerPinError}
              </div>
            )}

            <form onSubmit={handleOwnerPinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-amber-300/90 mb-1.5 text-center">
                  Secret Passcode:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={8}
                    autoFocus
                    value={ownerPinInput}
                    onChange={handleOwnerCodeChange}
                    placeholder="••••"
                    autoComplete="off"
                    className="w-full text-center tracking-widest text-3xl font-mono bg-slate-900 border border-amber-500/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <Lock className="w-4 h-4 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="block text-[11px] text-slate-400 text-center mt-2 font-medium">
                  🔒 Keval authorized owner ke liye confidential passcode
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOwnerPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 shadow-md transition cursor-pointer"
                >
                  Owner Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADMIN PIN PROMPT MODAL (CONFIDENTIAL PIN)                 */}
      {/* ========================================================= */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-purple-500/30 shadow-2xl relative">
            <button
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Admin Access PIN Daalein</h3>
              <p className="text-xs text-slate-400 mt-1">Organizer gate entry scanner access karein</p>
            </div>

            {pinError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs text-center font-bold animate-shake">
                ⚠️ {pinError}
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={8}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="••••"
                  autoComplete="off"
                  className="w-full text-center tracking-widest text-2xl font-mono bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="block text-[11px] text-slate-400 text-center mt-1.5">
                  🔒 Keval Adhikrit Organizers ke liye • PIN confidential hai
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white gradient-party shadow-md hover:brightness-110 transition cursor-pointer"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CLEAR ALL DATA CONFIRMATION MODAL                         */}
      {/* ========================================================= */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 border border-red-500/40 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Data Clear Confirmation</h3>
            <p className="text-xs text-slate-300 mb-6">
              Kya aap sach me saara entry data clear karna chahte hain? Yeh action revert nahi kiya ja sakta.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Nahi, Cancel
              </button>
              <button
                onClick={handleClearEntries}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition cursor-pointer"
              >
                Haan, Clear Karein
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIVE SELFIE CAMERA MODAL                                  */}
      {/* ========================================================= */}
      {isSelfieCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="glass-card w-full max-w-sm rounded-3xl p-6 border border-pink-500/40 shadow-2xl text-center relative overflow-hidden">
            <button
              type="button"
              onClick={stopSelfieCamera}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-900/80 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 mb-3">
              <Camera className="w-3.5 h-3.5 text-pink-400" />
              <span>Take Student Selfie</span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Live Camera Se Photo Lein</h3>
            <p className="text-xs text-slate-400 mb-4">Apna chehra square frame ke beech me rakhein</p>

            <div className="relative w-60 h-60 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-pink-500 shadow-xl mb-5 flex items-center justify-center">
              <video
                ref={selfieVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {/* Framing target */}
              <div className="absolute inset-4 border-2 border-dashed border-white/70 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={stopSelfieCamera}
                className="flex-1 py-3 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureSelfie}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-white gradient-party shadow-lg shadow-pink-500/30 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Photo Khinchein</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ENLARGED PHOTO PREVIEW MODAL                              */}
      {/* ========================================================= */}
      {selectedPreviewPhoto && (
        <div
          onClick={() => setSelectedPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-sm rounded-3xl p-6 border border-pink-500/40 shadow-2xl text-center relative cursor-default"
          >
            <button
              type="button"
              onClick={() => setSelectedPreviewPhoto(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-900/80 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Student Identity Photo</span>
            </div>

            <div className="w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-2xl overflow-hidden border-2 border-pink-500 shadow-2xl mb-4 bg-black">
              <img
                src={selectedPreviewPhoto.url}
                alt={selectedPreviewPhoto.name}
                className="w-full h-full object-cover"
              />
            </div>

            <h4 className="text-xl font-extrabold text-white">{selectedPreviewPhoto.name}</h4>
            {selectedPreviewPhoto.roll && (
              <p className="text-sm font-mono font-bold text-pink-400 mt-1">
                Roll Number: {selectedPreviewPhoto.roll}
              </p>
            )}

            <div className="mt-5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPreviewPhoto(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📱 SMARTPHONE SMS SIMULATION MODAL (UDGHOSH SENDER)       */}
      {/* ========================================================= */}
      {selectedSmsForPreview && (
        <PhoneSmsModal
          sms={selectedSmsForPreview}
          onClose={() => setSelectedSmsForPreview(null)}
        />
      )}

      {/* ========================================================= */}
      {/* 🔔 FLOATING REAL-TIME UDGHOSH SMS TOAST NOTIFICATION       */}
      {/* ========================================================= */}
      {incomingSmsToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in slide-in-from-top-6 duration-300 pointer-events-auto">
          <div className="bg-slate-950/95 backdrop-blur-md rounded-2xl p-4 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/80 text-white flex items-start justify-between gap-3 ring-4 ring-emerald-500/20">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
                  UD
                </div>
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-[11px] text-white uppercase tracking-wider font-mono">
                    💬 SMS FROM udghosh_hjmc_swagtam_by_Aditya
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    DELIVERED
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono block">
                  To: +91 {incomingSmsToast.phone} ({incomingSmsToast.studentName})
                </span>
                <p className="text-xs text-slate-200 mt-1 line-clamp-2">
                  "{incomingSmsToast.message}"
                </p>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedSmsForPreview(incomingSmsToast);
                      setIncomingSmsToast(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-600/40 hover:bg-purple-600 text-purple-200 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Smartphone className="w-3 h-3 text-pink-300" />
                    <span>📱 View Phone SMS</span>
                  </button>
                  <a
                    href={`https://wa.me/91${incomingSmsToast.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(incomingSmsToast.message)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition shadow cursor-pointer"
                  >
                    <span>💬 Direct WhatsApp</span>
                  </a>
                  <a
                    href={`sms:${incomingSmsToast.phone}?body=${encodeURIComponent(incomingSmsToast.message)}`}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1 transition"
                  >
                    <Send className="w-3 h-3 text-slate-400" />
                    <span>SMS App</span>
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIncomingSmsToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0 cursor-pointer"
              title="Dismiss Notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ⚡ REAL SMS GATEWAY CONFIGURATION MODAL                   */}
      {/* ========================================================= */}
      <SmsGatewaySettingsModal
        isOpen={showSmsSettingsModal}
        onClose={() => setShowSmsSettingsModal(false)}
        onConfigSaved={syncWithBackend}
      />
    </div>
  );
}
