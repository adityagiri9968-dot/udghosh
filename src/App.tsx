import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
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
  Zap
} from 'lucide-react';
import { EntryAnalytics } from './components/EntryAnalytics.tsx';

interface EntryRecord {
  id: string;
  name: string;
  roll: string;
  scannedAt: string;
  timestamp: number;
}

interface ScanBannerState {
  type: 'success' | 'duplicate' | 'invalid';
  message: string;
  subMessage?: string;
  details?: {
    name?: string;
    roll?: string;
    time?: string;
  };
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
  const [registeredData, setRegisteredData] = useState<{
    id: string;
    name: string;
    roll: string;
    qrUrl: string;
  } | null>(null);
  const [isGeneratingPass, setIsGeneratingPass] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

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

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningLockedRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const entriesRef = useRef<EntryRecord[]>(entries);
  const handleQrCodeSuccessRef = useRef<(text: string) => void>(() => {});
  const isCameraActiveRef = useRef<boolean>(false);
  const autoStopOnScanRef = useRef<boolean>(true);

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
      const payload = {
        name: cleanName,
        roll: cleanRoll,
        id: uniqueId
      };

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

    // Student Info Card
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.fillRect(50, 185, 600, 145);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 185, 600, 145);

    // Name & Roll
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

    // QR Code Image
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.onload = () => {
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

  // QR Scanning Logic with Anti-Repeat Lock & Instant Stop
  const handleNextScan = async () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    try {
      if (html5QrCodeRef.current && (html5QrCodeRef.current as any).resume) {
        (html5QrCodeRef.current as any).resume();
      }
    } catch {}
    isScanningLockedRef.current = false;
    setIsCooldown(false);
    lastScannedCodeRef.current = null;
    lastScannedTimeRef.current = 0;
    setScanBanner(null);

    // If camera was stopped, start camera for next student pass
    if (!isCameraActiveRef.current && autoStopOnScanRef.current) {
      await startCamera();
    }
  };

  const handleQrCodeSuccess = async (decodedText: string) => {
    // 1. If scanner is currently in locked cooldown, drop incoming frame
    if (isScanningLockedRef.current) return;

    // 2. Prevent repeating duplicate alerts if the same QR is still held in front of camera
    if (
      lastScannedCodeRef.current === decodedText &&
      Date.now() - lastScannedTimeRef.current < 8000
    ) {
      return;
    }

    // Immediately lock to prevent concurrent frames from triggering
    isScanningLockedRef.current = true;
    lastScannedCodeRef.current = decodedText;
    lastScannedTimeRef.current = Date.now();
    setIsCooldown(true);

    // USER REQUIREMENT: "ekdam minus second camera qr dekhte hi scan and band"
    // Turn off camera right away so it stops immediately without continuous looping
    if (autoStopOnScanRef.current) {
      await stopCamera();
    } else {
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

      if (existing) {
        // DUPLICATE ENTRY
        playDuplicateWarningSound();
        triggerVibration([300, 100, 300]);
        setScanBanner({
          type: 'duplicate',
          message: '⚠️ Pehle hi entry ho chuki hai!',
          subMessage: `(Scanned at ${existing.scannedAt})`,
          details: {
            name: existing.name,
            roll: existing.roll,
            time: existing.scannedAt
          }
        });
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
          timestamp: Date.now()
        };

        playSuccessSound();
        triggerVibration([100, 50, 100]);
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.5 }
        });

        entriesRef.current = [newRecord, ...entriesRef.current];
        setEntries((prev) => [newRecord, ...prev]);
        setScanBanner({
          type: 'success',
          message: `✅ Entry Confirmed! Welcome, ${studentNameScanned} (${scannedRoll})`,
          details: {
            name: studentNameScanned,
            roll: scannedRoll,
            time: newRecord.scannedAt
          }
        });
      }
    } catch {
      playDuplicateWarningSound();
      setScanBanner({
        type: 'invalid',
        message: '❌ Invalid QR code'
      });
    }

    if (!autoStopOnScanRef.current) {
      // Cooldown 2.5 seconds before unlocking for the next person in continuous mode
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        try {
          if (html5QrCodeRef.current && (html5QrCodeRef.current as any).resume) {
            (html5QrCodeRef.current as any).resume();
          }
        } catch {}
        isScanningLockedRef.current = false;
        setIsCooldown(false);
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
        (decodedText) => handleQrCodeSuccessRef.current(decodedText),
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
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Stop camera failed', e);
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
  const handleSimulateScan = (name: string, roll: string) => {
    const fakePayload = JSON.stringify({
      id: 'FP-TEST-' + Math.floor(Math.random() * 9000 + 1000),
      name,
      roll
    });
    handleQrCodeSuccess(fakePayload);
  };

  // Generate realistic crowd entry flow across recent intervals for testing analytics
  const handleGenerateDemoData = () => {
    const now = Date.now();
    const demoStudents = [
      { name: 'Aarav Mehta', roll: '24ENG042', offsetMin: 28 },
      { name: 'Pooja Verma', roll: '24BCA019', offsetMin: 25 },
      { name: 'Rohan Deshmukh', roll: '24BBA102', offsetMin: 22 },
      { name: 'Ananya Roy', roll: '24COM055', offsetMin: 18 },
      { name: 'Karan Patel', roll: '24CS089', offsetMin: 16 },
      { name: 'Simran Kaur', roll: '24IT031', offsetMin: 13 },
      { name: 'Vikram Aditya', roll: '24ENG077', offsetMin: 12 },
      { name: 'Sneha Gupta', roll: '24BCA063', offsetMin: 7 },
      { name: 'Devendra Joshi', roll: '24CS112', offsetMin: 4 },
      { name: 'Priya Sharma', roll: '24BBA044', offsetMin: 2 },
      { name: 'Manish Kumar', roll: '24ENG015', offsetMin: 1 }
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
        timestamp: entryTimeMs
      };
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
                  <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Student Name</span>
                      <span className="text-lg font-bold text-white">{registeredData.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Roll Number</span>
                      <span className="text-base font-bold text-pink-400">{registeredData.roll}</span>
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
                    <div className="flex items-start gap-3.5">
                      {scanBanner.type === 'duplicate' ? (
                        <AlertTriangle className="w-7 h-7 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                      ) : scanBanner.type === 'success' ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-7 h-7 text-amber-400 shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-extrabold leading-snug">
                          {scanBanner.message}
                        </h4>
                        {scanBanner.subMessage && (
                          <p className="text-sm font-medium opacity-90 mt-0.5">{scanBanner.subMessage}</p>
                        )}
                        {scanBanner.details && (
                          <div className="mt-2 text-xs flex flex-wrap gap-x-4 gap-y-1 opacity-80 font-mono">
                            <span>Roll: {scanBanner.details.roll}</span>
                            <span>Name: {scanBanner.details.name}</span>
                            <span>Time: {scanBanner.details.time}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleNextScan}
                        className="text-slate-400 hover:text-white p-1 rounded-lg"
                        title="Dismiss & Ready Next Scan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] text-slate-200">
                        {autoStopOnScan ? (
                          <span className="text-pink-300 font-semibold flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-pink-400" />
                            <span>⚡ Scan complete! Camera turant band ho gaya hai.</span>
                          </span>
                        ) : isCooldown ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
                            <span>Scan safalta-purvak ho gaya! Agle pass ke liye taiyaar...</span>
                          </>
                        ) : (
                          <span className="text-emerald-300 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready to scan next pass
                          </span>
                        )}
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
                      <Camera className="w-5 h-5 text-pink-400" />
                      <h3 className="font-bold text-white text-base sm:text-lg">Live QR Code Scanner</h3>
                      {isCameraActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Scan & Band Mode Toggle */}
                      <button
                        onClick={() => setAutoStopOnScan(!autoStopOnScan)}
                        title={autoStopOnScan ? 'Scan & Band Mode Active (QR dekhte hi scan aur camera band)' : 'Continuous Mode'}
                        className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition cursor-pointer ${
                          autoStopOnScan
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-pink-400" />
                        <span className="font-semibold">{autoStopOnScan ? '⚡ Scan & Band: ON' : 'Continuous Mode'}</span>
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
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[300px] sm:min-h-[360px] flex items-center justify-center">
                    {/* HTML5-QRCODE Mount Point */}
                    <div id={scannerContainerId} className="w-full h-full" />

                    {/* Laser Overlay when active */}
                    {isCameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-64 h-64 border-2 border-dashed border-pink-500/60 rounded-2xl">
                          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_8px_#ec4899] scanner-laser" />
                          {/* Corner Markers */}
                          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-pink-400" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-pink-400" />
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-pink-400" />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-pink-400" />
                        </div>
                      </div>
                    )}

                    {/* Placeholder when camera is inactive */}
                    {!isCameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 z-10 animate-in fade-in duration-200">
                        {scanBanner ? (
                          <div className="max-w-md w-full flex flex-col items-center">
                            <div
                              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
                                scanBanner.type === 'duplicate'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-red-950/50'
                                  : scanBanner.type === 'success'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-950/50'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-950/50'
                              }`}
                            >
                              {scanBanner.type === 'duplicate' ? (
                                <AlertTriangle className="w-9 h-9 animate-bounce" />
                              ) : scanBanner.type === 'success' ? (
                                <CheckCircle2 className="w-9 h-9" />
                              ) : (
                                <XCircle className="w-9 h-9" />
                              )}
                            </div>

                            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 mb-2">
                              <Zap className="w-3 h-3 text-pink-400" />
                              <span>⚡ Instant Scan Done • Camera Band</span>
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
                              <div className="text-xs text-slate-300 font-mono mb-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
                                <span>Roll: <strong className="text-pink-300">{scanBanner.details.roll}</strong></span>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-400">Time: {scanBanner.details.time}</span>
                              </div>
                            )}

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
                              <CameraOff className="w-8 h-8" />
                            </div>
                            <h4 className="text-base font-bold text-white mb-1">Camera Abhi Off Hai</h4>
                            <p className="text-xs text-slate-400 max-w-sm mb-4">
                              Student ka QR ticket scan karne ke liye camera start karein. QR dekhte hi instant scan ho kar camera auto-band ho jayega.
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
    </div>
  );
}
