import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Phone,
  Key,
  ExternalLink,
  MessageSquare,
  Zap,
  Globe
} from 'lucide-react';

interface SmsGatewaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

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

export const SmsGatewaySettingsModal: React.FC<SmsGatewaySettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [config, setConfig] = useState<SmsGatewayConfig>({
    provider: 'fast2sms',
    fast2smsApiKey: '',
    fast2smsRoute: 'q',
    autoOpenNativeSms: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchConfig();
  }, [isOpen]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sms/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (e) {
      console.warn('Failed to load SMS config', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveSuccess('');
    setSaveError('');
    try {
      const res = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess('SMS Gateway settings safalta-purvak save ho gayi!');
        if (onConfigSaved) onConfigSaved();
        setTimeout(() => setSaveSuccess(''), 4000);
      } else {
        setSaveError(data.error || 'Settings save karne mein error aayi');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestSms = async () => {
    const cleanNumber = testPhone.replace(/\D/g, '').slice(-10);
    if (!cleanNumber || cleanNumber.length !== 10) {
      setTestResult({
        success: false,
        message: 'Kripya 10-digit mobile number dalein (e.g. 9876543210)'
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const testMsg = `🔐 [UDGHOSH PORTAL OTP / VERIFICATION]: udghosh_hjmc_swagtam_by_Aditya\nNamaste! Test Pass QR scan hokar verify ho chuka hai aur Gate Entry allow kar di gayi hai. Swagatam! - udghosh_hjmc_swagtam_by_Aditya`;

      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanNumber,
          message: testMsg,
          configOverride: config
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `✅ Test SMS +91 ${cleanNumber} par safalta-purvak bhej diya gaya! (${data.provider || 'Gateway'})`,
          details: data.details
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || 'SMS send fail hua. Kripya API Key ya phone number check karein.',
          details: data.details
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Network error: ${err.message}`
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-xl rounded-3xl p-5 sm:p-7 border border-emerald-500/40 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚡ Real SMS Gateway Settings</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  udghosh_hjmc_swagtam_by_Aditya
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gate par QR scan hote hi automatic real SMS student ke phone par bhejne ke tareeqe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {saveError && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              SMS Bhejne Ka Method Chunein (Gateway Option):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Fast2SMS */}
              <label
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  config.provider === 'fast2sms'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="fast2sms"
                  checked={config.provider === 'fast2sms'}
                  onChange={() => setConfig({ ...config, provider: 'fast2sms' })}
                  className="mt-1 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-white">Fast2SMS (Recommended)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">
                      Indian Telecom
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    India ke kisi bhi mobile par direct background SMS bhejta hai. Free signup & instant setup.
                  </p>
                </div>
              </label>

              {/* Option 2: Free SIM SMS Mode */}
              <label
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  config.provider === 'free_sim'
                    ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="free_sim"
                  checked={config.provider === 'free_sim'}
                  onChange={() => setConfig({ ...config, provider: 'free_sim' })}
                  className="mt-1 text-purple-500 focus:ring-purple-500"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-white">Free Phone SIM SMS</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                      100% Free
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Gatekeeper ke phone ki Messages app se student ko turant direct SIM SMS bhejta hai.
                  </p>
                </div>
              </label>

              {/* Option 3: Twilio */}
              <label
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  config.provider === 'twilio'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="twilio"
                  checked={config.provider === 'twilio'}
                  onChange={() => setConfig({ ...config, provider: 'twilio' })}
                  className="mt-1 text-indigo-500 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-extrabold text-sm text-white block">Twilio Gateway</span>
                  <p className="text-[11px] text-slate-300 mt-1">
                    International & Indian Twilio account SID aur auth token ke zariye SMS.
                  </p>
                </div>
              </label>

              {/* Option 4: Custom Webhook */}
              <label
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  config.provider === 'custom_webhook'
                    ? 'bg-pink-950/40 border-pink-500 ring-2 ring-pink-500/20 shadow-md'
                    : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="provider"
                  value="custom_webhook"
                  checked={config.provider === 'custom_webhook'}
                  onChange={() => setConfig({ ...config, provider: 'custom_webhook' })}
                  className="mt-1 text-pink-500 focus:ring-pink-500"
                />
                <div>
                  <span className="font-extrabold text-sm text-white block">Custom Webhook / Server</span>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Apne custom SMS gateway URL ya GSM SIM module server par POST request.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Configuration Inputs based on Provider */}
          {config.provider === 'fast2sms' && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Fast2SMS API Key
                </span>
                <a
                  href="https://www.fast2sms.com/dashboard/dev-api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-pink-400 hover:text-pink-300 underline flex items-center gap-1"
                >
                  <span>Fast2SMS Free Key Le</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <input
                type="text"
                value={config.fast2smsApiKey || ''}
                onChange={(e) => setConfig({ ...config, fast2smsApiKey: e.target.value.trim() })}
                placeholder="Yahan Fast2SMS API Key paste karein (e.g. jKL89wXYZ...)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
              />

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="p-2.5 rounded-xl border border-slate-700 bg-slate-950 flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fast2smsRoute"
                    value="q"
                    checked={config.fast2smsRoute === 'q' || !config.fast2smsRoute}
                    onChange={() => setConfig({ ...config, fast2smsRoute: 'q' })}
                    className="text-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-white block">Quick SMS Route (q)</span>
                    <span className="text-[10px] text-slate-400">Standard bulk SMS</span>
                  </div>
                </label>

                <label className="p-2.5 rounded-xl border border-slate-700 bg-slate-950 flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fast2smsRoute"
                    value="otp"
                    checked={config.fast2smsRoute === 'otp'}
                    onChange={() => setConfig({ ...config, fast2smsRoute: 'otp' })}
                    className="text-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-white block">Instant OTP Route (otp)</span>
                    <span className="text-[10px] text-slate-400">100% High priority delivery</span>
                  </div>
                </label>
              </div>

              <p className="text-[11px] text-slate-400">
                * Agar aapke paas Fast2SMS key nahi hai, toh bhi "Free Phone SIM SMS" option se scan karte hi phone ka SMS app khul kar instant send ho jayega.
              </p>
            </div>
          )}

          {config.provider === 'twilio' && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/40 space-y-3 animate-in fade-in text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Twilio Account SID</label>
                <input
                  type="text"
                  value={config.twilioAccountSid || ''}
                  onChange={(e) => setConfig({ ...config, twilioAccountSid: e.target.value.trim() })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Twilio Auth Token</label>
                <input
                  type="password"
                  value={config.twilioAuthToken || ''}
                  onChange={(e) => setConfig({ ...config, twilioAuthToken: e.target.value.trim() })}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Twilio Phone Number (Sender)</label>
                <input
                  type="text"
                  value={config.twilioFromNumber || ''}
                  onChange={(e) => setConfig({ ...config, twilioFromNumber: e.target.value.trim() })}
                  placeholder="+1xxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          )}

          {config.provider === 'custom_webhook' && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-pink-500/40 space-y-2 animate-in fade-in text-xs">
              <label className="block font-semibold text-slate-300">Custom SMS Webhook URL (POST)</label>
              <input
                type="url"
                value={config.customWebhookUrl || ''}
                onChange={(e) => setConfig({ ...config, customWebhookUrl: e.target.value.trim() })}
                placeholder="https://my-sms-api.com/send"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
              <p className="text-[10px] text-slate-400">
                Yeh URL par JSON payload aayega: &#123; phone, message, sender: "udghosh_hjmc_swagtam_by_Aditya" &#125;
              </p>
            </div>
          )}

          {/* Auto-Trigger Device SMS Switch */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                <span>Mobile Device Par Auto-Open SMS Trigger</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Scan hone par gatekeeper ke mobile par automatic Messaging app link trigger hoga.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.autoOpenNativeSms ?? true}
              onChange={(e) => setConfig({ ...config, autoOpenNativeSms: e.target.checked })}
              className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Settings Save Karein</span>
            </button>
          </div>
        </form>

        {/* ========================================================= */}
        {/* LIVE REAL SMS TESTING SECTION                             */}
        {/* ========================================================= */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-extrabold text-white">Live SMS Test Karein (Apne Number Par)</h4>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Apna 10-digit mobile number daal kar check karein ki real SMS phone par deliver ho raha hai ya nahi:
          </p>

          <div className="flex gap-2">
            <input
              type="tel"
              maxLength={10}
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="10 Digit Mobile No. (e.g. 9876543210)"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSendTestSms}
              disabled={isSendingTest}
              className="px-4 py-2.5 rounded-xl gradient-party text-white font-bold text-xs sm:text-sm shrink-0 flex items-center gap-1.5 shadow active:scale-95 transition cursor-pointer"
            >
              {isSendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send Test SMS</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`mt-3 p-3 rounded-xl border text-xs animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                  : 'bg-red-950/80 border-red-500/60 text-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">{testResult.message}</span>
                  {testResult.details && (
                    <pre className="mt-1 text-[10px] opacity-80 overflow-x-auto p-1.5 bg-black/40 rounded">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
