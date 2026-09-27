/**
 * Utility to format scan and admission timestamps consistently in Indian Standard Time (IST / Asia/Kolkata).
 * Ensures correct 12-hour format with AM/PM (e.g. "02:15:45 PM") across all devices and servers.
 */

export const formatScanTime = (dateInput?: number | string | Date): string => {
  if (!dateInput) {
    return getNowIndianTime();
  }

  // If string already matches time format (e.g. "09:15:30 AM" or "02:30 PM"), normalize and return
  if (typeof dateInput === 'string' && /^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|am|pm)$/i.test(dateInput.trim())) {
    return dateInput.trim().toUpperCase();
  }

  const date = typeof dateInput === 'string' && !isNaN(Number(dateInput))
    ? new Date(Number(dateInput))
    : new Date(dateInput);

  if (isNaN(date.getTime())) {
    return getNowIndianTime();
  }

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date).toUpperCase();
  } catch {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).toUpperCase();
  }
};

export const getNowIndianTime = (): string => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date()).toUpperCase();
  } catch {
    return new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).toUpperCase();
  }
};

export const formatAnalyticsTime = (ms: number): string => {
  const date = new Date(ms);
  if (isNaN(date.getTime())) return '--:--';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date).toUpperCase();
  } catch {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
};
