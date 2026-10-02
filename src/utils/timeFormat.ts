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

/**
 * Format registration or scan timestamp into full Indian Date & Time string.
 * e.g., "02 Oct 2026, 02:15:30 PM"
 */
export const formatIndianDateTime = (dateInput?: number | string | Date): string => {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' && !isNaN(Number(dateInput))
    ? new Date(Number(dateInput))
    : new Date(dateInput);

  if (isNaN(date.getTime())) {
    return String(dateInput);
  }

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date).toUpperCase();
  } catch {
    return date.toLocaleString('en-IN');
  }
};

/**
 * Formats time in Hindi phrasing: "[hour] bajkar [minute] minute par ([HH:MM:SS AM/PM])"
 * Exact fulfillment of user request: "pahli baar scan kitne bajakar jitne mint par huaa tha"
 */
export const formatTimeInHindiWords = (dateInput?: number | string | Date): string => {
  const formattedTime = formatScanTime(dateInput);
  const match = formattedTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (match) {
    const rawHour = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const meridiem = match[3] ? match[3].toUpperCase() : '';
    const hourStr = rawHour < 10 ? `0${rawHour}` : `${rawHour}`;
    const minStr = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hourStr} bajkar ${minStr} minute par (${formattedTime})`;
  }
  return formattedTime;
};
