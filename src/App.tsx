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
  Maximize2
} from 'lucide-react';
import { EntryAnalytics } from './components/EntryAnalytics.tsx';

export interface EntryRecord {
  id: string;
  name: string;
  roll: string;
  scannedAt: string;
  timestamp: number;
  photoUrl?: string;
}

interface ScanBannerState {
  type: 'success' | 'duplicate' | 'invalid';
  message: string;
  subMessage?: string;
  details?: {
    name?: string;
    roll?: string;
    time?: string;
    photoUrl?: string;
  };
}

interface RegisteredStudent {
  id: string;
  name: string;
  roll: string;
  photoUrl?: string;
  registeredAt: number;
}

export default function App() {
  // App view state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('fresher_party_admin_logged_in') === 'true';
  });
  const [adminTab, setAdminTab] = useState<'scanner' | 'entries'>('scanner');
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Student Registration State
  const [studentName, setStudentName] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<string>('');
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [isSelfieCameraOpen, setIsSelfieCameraOpen] = useState<boolean>(false);
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<{ url: string; name: string; roll: string } | null>(null);

  const [registeredData, setRegisteredData] = useState<{
    id: string;
    name: string;
    roll: string;
    photoUrl?: string;
    qrUrl: string;
  } | null>(null);
  const [isGeneratingPass, setIsGeneratingPass] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

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
  const [cameraError, setCameraError] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

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
    if (!soundEnabled) return;
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
    if (!soundEnabled) return;
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

  // Handle Student Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = studentName.trim();
    const cleanRoll = rollNumber.trim().toUpperCase();

    if (!cleanName) {
      setFormError('Kripya apna poora naam likhein.');
      return;
    }
    if (!cleanRoll) {
      setFormError('Kripya apna College Roll Number dalein.');
      return;
    }

    setIsGeneratingPass(true);
    try {
      const uniqueId = 'FP-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 899 + 100);
      const payload: { name: string; roll: string; id: string; photo?: string } = {
        name: cleanName,
        roll: cleanRoll,
        id: uniqueId
      };

      // Save to registered students registry (mapping by roll number)
      const studentRecord: RegisteredStudent = {
        id: uniqueId,
        name: cleanName,
        roll: cleanRoll,
        photoUrl: studentPhoto || undefined,
        registeredAt: Date.now()
      };

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
    setStudentName('');
    setRollNumber('');
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
        ctx.font = '15px sans-serif';
        ctx.fillText('STUDENT NAME', 215, 222);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(registeredData.name, 215, 252);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '15px sans-serif';
        ctx.fillText('ROLL NUMBER', 215, 280);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(registeredData.roll, 340, 280);

        ctx.fillStyle = '#a855f7';
        ctx.font = '13px sans-serif';
        ctx.fillText('PASS ID: ' + registeredData.id, 215, 314);
      } else {
        // Name & Roll (traditional layout)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('STUDENT NAME / VIDYARTHI KA NAAM', 75, 220);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(registeredData.name, 75, 255);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('ROLL NUMBER', 430, 220);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(registeredData.roll, 430, 255);

        ctx.fillStyle = '#a855f7';
        ctx.font = '14px sans-serif';
        ctx.fillText('PASS ID: ' + registeredData.id, 75, 305);
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
    } else {
      setPinError('Galat Pin!');
    }
  };

  const handleAdminLogout = () => {
    stopCamera();
    setIsAdmin(false);
    sessionStorage.removeItem('fresher_party_admin_logged_in');
    setScanBanner(null);
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

      // Check duplicate using entriesRef to prevent stale closure
      const existing = entriesRef.current.find(
        (item) => item.roll.trim().toUpperCase() === scannedRoll
      );

      // Look up student photo from registered students map, payload, or existing entry
      const matchedProfile = registeredStudentsRef.current[scannedRoll];
      const studentPhotoFound = data.photo || matchedProfile?.photoUrl || existing?.photoUrl;

      if (existing) {
        // DUPLICATE ENTRY
        playDuplicateWarningSound();
        triggerVibration([300, 100, 300]);
        setScanBanner({
          type: 'duplicate',
          message: '⚠️ Pehle hi entry ho chuki hai!',
          subMessage: `(Scanned at ${existing.scannedAt}) • 🤖 AI Bot duplicate guard`,
          details: {
            name: existing.name,
            roll: existing.roll,
            time: existing.scannedAt,
            photoUrl: existing.photoUrl || studentPhotoFound
          }
        });
        setAiBotLastAction(`Duplicate Blocked: ${existing.name} (${existing.roll})`);
      } else {
        // NEW VALID ENTRY
        const newRecord: EntryRecord = {
          id: data.id || 'FP-' + Date.now(),
          name: studentNameScanned,
          roll: scannedRoll,
          scannedAt: new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          timestamp: Date.now(),
          photoUrl: studentPhotoFound
        };

        playSuccessSound();
        triggerVibration([100, 50, 100]);
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.5 }
        });

        entriesRef.current = [newRecord, ...entriesRef.current];
        setEntries((prev) => [newRecord, ...prev]);
        setScanBanner({
          type: 'success',
          message: `✅ Entry Confirmed! Welcome, ${studentNameScanned} (${scannedRoll})`,
          subMessage: `Roll: ${scannedRoll} • Verified & Admitted`,
          details: {
            name: studentNameScanned,
            roll: scannedRoll,
            time: newRecord.scannedAt,
            photoUrl: studentPhotoFound
          }
        });
        setAiBotLastAction(`Entry Confirmed: ${studentNameScanned} (${scannedRoll})`);
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

      // 25 FPS for sub-second rapid detection + responsive scanning area
      const config: Html5QrcodeCameraScanConfig = {
        fps: 25,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(160, Math.floor(minEdge * 0.88));
          return { width: edge, height: edge };
        },
        aspectRatio: 1.0
      };

      await html5QrCodeRef.current.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          // If in click_to_scan mode, do not auto-scan video frames! Only scan on shutter click
          if (scanTriggerModeRef.current === 'click_to_scan') {
            return;
          }
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
          photoUrl: defaultPhoto,
          registeredAt: Date.now()
        }
      }));
    }

    const fakePayload = JSON.stringify({
      id: 'FP-TEST-' + Math.floor(Math.random() * 9000 + 1000),
      name,
      roll: cleanRoll,
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
      const timeStr = new Date(entryTimeMs).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return {
        id: `FP-DEMO-${1000 + index}`,
        name: s.name,
        roll: s.roll,
        scannedAt: timeStr,
        timestamp: entryTimeMs,
        photoUrl: s.photo
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
          photoUrl: d.photo,
          registeredAt: now
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
      `"${e.scannedAt}"`,
      `"${e.id}"`,
      `"${new Date(e.timestamp).toLocaleString('en-IN')}"`
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
            {isAdmin ? (
              <span className="text-amber-300 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Organizer &amp; Gate Entry Admin Panel
              </span>
            ) : (
              'Apna naam aur roll number daal kar register karo'
            )}
          </p>

          {/* Admin Mode Indicator Banner */}
          {isAdmin && (
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
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10">
        {!isAdmin ? (
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

                <form onSubmit={handleRegister} className="space-y-5">
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
                        placeholder="e.g. 23BCA104 / 2024CS089"
                        className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition text-sm uppercase"
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      * Yeh roll number entry ke samay verify kiya jayega
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
                <p className="text-xs text-pink-300 font-medium mb-6">
                  BRAC HJMC • Udghosh Fresher Party • Official Entry Pass
                </p>

                {/* Pass Ticket Box */}
                <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-700/80 mb-6 text-left relative">
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 font-mono font-bold text-xs border border-pink-500/30">
                          {registeredData.roll}
                        </span>
                        <span className="text-[10px] text-purple-300 font-mono">
                          ID: {registeredData.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Image Box */}
                  <div className="bg-white p-4 rounded-xl shadow-inner flex flex-col items-center justify-center my-2">
                    <img
                      src={registeredData.qrUrl}
                      alt="Student Entry QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                    <span className="text-[10px] text-slate-500 font-mono mt-1 font-semibold">
                      PASS ID: {registeredData.id}
                    </span>
                  </div>

                  {/* Prominent Mandatory Instruction */}
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Zaroori Soochana:</span>
                      Is QR code ka screenshot le lein, auditorium entry gate par yehi dikhana hoga.
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleDownloadPass}
                    className="py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:brightness-110 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 text-sm shadow-lg shadow-pink-600/30"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download QR / Save Image</span>
                  </button>

                  <button
                    onClick={handleResetRegistration}
                    className="py-3 px-4 rounded-xl font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Naya Registration</span>
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
              {/* Total Entry Live Counter Card */}
              <div className="glass-card rounded-2xl p-5 border border-purple-500/30 flex items-center justify-between sm:col-span-1 shadow-lg">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 block font-medium">Total Entry</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      {entries.length}
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> Live
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="glass-card rounded-2xl p-2 border border-slate-800 flex items-center justify-center sm:col-span-2 gap-2">
                <button
                  onClick={() => setAdminTab('scanner')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    adminTab === 'scanner'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Scanner Tab</span>
                </button>

                <button
                  onClick={() => setAdminTab('entries')}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    adminTab === 'entries'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Entry List Tab ({entries.length})</span>
                </button>

                <button
                  onClick={handleAdminLogout}
                  title="Admin Logout"
                  className="p-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
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

            {/* TAB 1: SCANNER TAB */}
            {adminTab === 'scanner' && (
              <div className="space-y-5">
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
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Student Photo Matched
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
                          <div className="mt-2 text-xs flex flex-wrap gap-x-4 gap-y-1 opacity-90 font-mono bg-black/20 p-2 rounded-xl border border-white/10">
                            <span>Roll: <strong className="text-pink-300">{scanBanner.details.roll}</strong></span>
                            <span>Name: <strong className="text-white">{scanBanner.details.name}</strong></span>
                            <span>Time: {scanBanner.details.time}</span>
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
                        <div className="px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-pink-500/50 backdrop-blur-md flex items-center gap-2 text-[11px] text-pink-300 font-bold shadow-lg">
                          <Bot className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                          <span>
                            {scanTriggerMode === 'click_to_scan'
                              ? '📸 PHONE SHUTTER MODE: TAP OR CLICK TO SCAN'
                              : '⚡ 1-SHOT AUTO SCAN (No Duplicate Loop)'}
                          </span>
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
                              <span>{record.scannedAt}</span>
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
      {/* FLOATING SETTINGS BUTTON (ADMIN ACCESS PIN)               */}
      {/* ========================================================= */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => {
            if (isAdmin) {
              // If already logged in as admin, clicking switches view
              setIsAdmin(true);
            } else {
              setShowPinModal(true);
              setPinError('');
              setPinInput('');
            }
          }}
          title="Admin Access Pin (Organizer Gate Entry)"
          className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-xl shadow-black/50 flex items-center justify-center transition active:scale-95 cursor-pointer group"
        >
          <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform duration-300" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* ADMIN PIN PROMPT MODAL (PIN: 7271)                        */}
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
              <h3 className="text-lg font-bold text-white">Admin Access Pin Daalein</h3>
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
                  maxLength={6}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="Secret PIN daalein"
                  className="w-full text-center tracking-widest text-2xl font-mono bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="block text-[11px] text-slate-500 text-center mt-1.5">
                  Keval Adhikrit Organizers ke liye
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
    </div>
  );
}
