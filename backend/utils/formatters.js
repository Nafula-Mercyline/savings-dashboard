/**
 * api/utils/formatters.js
 *
 * Reusable formatting utilities for numbers, currency, dates,
 * percentages, and strings used across services and reports.
 *
 * No external dependencies — pure JavaScript.
 */

// ─── Currency & Numbers ───────────────────────────────────────────────────────

/**
 * Formats a number as Uganda Shillings.
 * formatCurrency(1250000)               → "UGX 1,250,000"
 * formatCurrency(1250000, { symbol: "KES" }) → "KES 1,250,000"
 *
 * @param {number} amount
 * @param {Object} options
 * @param {string} options.symbol   — currency symbol (default: "UGX")
 * @param {number} options.decimals — decimal places (default: 0)
 * @param {string} options.locale   — locale string (default: "en-UG")
 */
function formatCurrency(amount, { symbol = "UGX", decimals = 0, locale = "en-UG" } = {}) {
    if (amount === null || amount === undefined || isNaN(amount)) return `${symbol} 0`;
    const formatted = Number(amount).toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${symbol} ${formatted}`;
  }
  
  /**
   * Formats a number with thousand separators.
   * formatNumber(1250000) → "1,250,000"
   *
   * @param {number} value
   * @param {number} decimals — decimal places (default: 0)
   */
  function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined || isNaN(value)) return "0";
    return Number(value).toLocaleString("en-UG", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  
  /**
   * Rounds a number to n decimal places.
   * roundTo(3.14159, 2) → 3.14
   *
   * @param {number} value
   * @param {number} places — default 2
   */
  function roundTo(value, places = 2) {
    if (isNaN(value)) return 0;
    return parseFloat(Number(value).toFixed(places));
  }
  
  /**
   * Formats a decimal as a percentage string.
   * formatPercent(0.125)                        → "12.50%"
   * formatPercent(12.5, { isDecimal: false })   → "12.50%"
   *
   * @param {number} value
   * @param {Object} options
   * @param {boolean} options.isDecimal — true if value is 0–1 (default: true)
   * @param {number}  options.decimals  — decimal places (default: 2)
   */
  function formatPercent(value, { isDecimal = true, decimals = 2 } = {}) {
    if (value === null || value === undefined || isNaN(value)) return "0.00%";
    const pct = isDecimal ? value * 100 : value;
    return `${pct.toFixed(decimals)}%`;
  }
  
  /**
   * Computes percentage change between two values.
   * percentageChange(100, 120) → 20   (+20%)
   * percentageChange(100, 80)  → -20  (-20%)
   *
   * @param {number} previous
   * @param {number} current
   * @returns {number}
   */
  function percentageChange(previous, current) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return roundTo(((current - previous) / Math.abs(previous)) * 100, 2);
  }
  
  // ─── Dates ────────────────────────────────────────────────────────────────────
  
  /**
   * Formats a date to a readable string.
   * formatDate(new Date()) → "15 May 2026"
   *
   * @param {Date|string} date
   * @param {Object} options
   * @param {string} options.locale — default "en-UG"
   * @param {string} options.style  — "long" | "short" | "numeric" (default: "long")
   */
  function formatDate(date, { locale = "en-UG", style = "long" } = {}) {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid date";
    const optionSets = {
      long:    { day: "numeric", month: "long",    year: "numeric" },
      short:   { day: "2-digit", month: "short",   year: "numeric" },
      numeric: { day: "2-digit", month: "2-digit", year: "numeric" },
    };
    return d.toLocaleDateString(locale, optionSets[style] || optionSets.long);
  }
  
  /**
   * Formats a date with time.
   * formatDateTime(new Date()) → "15 May 2026, 10:30 AM"
   *
   * @param {Date|string} date
   * @param {string} locale — default "en-UG"
   */
  function formatDateTime(date, locale = "en-UG") {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleString(locale, {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  }
  
  /**
   * Returns a YYYY-MM-DD string from a Date object.
   * toISODate(new Date()) → "2026-05-15"
   *
   * @param {Date|string} date
   */
  function toISODate(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  }
  
  /**
   * Returns a human-readable relative time string.
   * timeAgo(new Date(Date.now() - 60000)) → "1 minute ago"
   *
   * @param {Date|string} date
   */
  function timeAgo(date) {
    if (!date) return "—";
    const diff = Date.now() - new Date(date).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60)   return `${secs} second${secs !== 1 ? "s" : ""} ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60)   return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    const hrs  = Math.floor(mins / 60);
    if (hrs  < 24)   return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs  / 24);
    if (days < 30)   return `${days} day${days !== 1 ? "s" : ""} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  }
  
  /**
   * Returns the number of days between two dates.
   * daysBetween("2026-01-01", "2026-05-15") → 134
   *
   * @param {Date|string} start
   * @param {Date|string} end — default: today
   */
  function daysBetween(start, end = new Date()) {
    return Math.floor((new Date(end) - new Date(start)) / 86400000);
  }
  
  /**
   * Returns the first and last moment of a given month.
   * monthBounds(2026, 4) → { start: Date(April 1), end: Date(April 30) }
   *
   * @param {number} year
   * @param {number} month — 0-indexed (0=Jan, 11=Dec)
   */
  function monthBounds(year, month) {
    return {
      start: new Date(year, month, 1),
      end:   new Date(year, month + 1, 0, 23, 59, 59),
    };
  }
  
  // ─── Strings ──────────────────────────────────────────────────────────────────
  
  /**
   * Capitalises the first letter of each word.
   * titleCase("john doe") → "John Doe"
   */
  function titleCase(str) {
    if (!str) return "";
    return str.toLowerCase().split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  
  /**
   * Returns initials from a full name (up to 2 letters).
   * initials("Josephine Nalwoga") → "JN"
   */
  function initials(fullName) {
    if (!fullName) return "";
    return fullName.split(" ").filter(Boolean).slice(0, 2)
      .map((n) => n[0].toUpperCase()).join("");
  }
  
  /**
   * Masks a phone number for display.
   * maskPhone("0712345678") → "0712***678"
   */
  function maskPhone(phone) {
    if (!phone || String(phone).length < 7) return "***";
    const s = String(phone);
    return `${s.slice(0, 4)}***${s.slice(-3)}`;
  }
  
  /**
   * Masks an email address for display.
   * maskEmail("josephine@gmail.com") → "jo***@gmail.com"
   */
  function maskEmail(email) {
    if (!email || !email.includes("@")) return "***";
    const [local, domain] = email.split("@");
    return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
  }
  
  /**
   * Truncates a string to maxLength, appending "…" if cut.
   * truncate("This is a long description", 15) → "This is a long…"
   */
  function truncate(str, maxLength = 50) {
    if (!str) return "";
    if (str.length <= maxLength) return str;
    return `${str.slice(0, maxLength - 1)}…`;
  }
  
  /**
   * Slugifies a string for filenames or URLs.
   * slugify("Financial Report May 2026") → "financial-report-may-2026"
   */
  function slugify(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "")
      .trim().replace(/\s+/g, "-");
  }
  
  // ─── Labels ───────────────────────────────────────────────────────────────────
  
  /**
   * Maps a transaction type key to a human-readable label.
   * txTypeLabel("loan_repayment") → "Loan Repayment"
   */
  function txTypeLabel(type) {
    const labels = {
      deposit:           "Deposit",
      withdrawal:        "Withdrawal",
      loan_repayment:    "Loan Repayment",
      loan_disbursement: "Loan Disbursement",
      interest_credit:   "Interest Credit",
      reversal:          "Reversal",
      adjustment:        "Adjustment",
    };
    return labels[type] || titleCase((type || "").replace(/_/g, " "));
  }
  
  /**
   * Maps a status key to a { label, color } badge descriptor.
   * statusBadge("active") → { label: "Active", color: "green" }
   */
  function statusBadge(status) {
    const map = {
      active:    { label: "Active",    color: "green"  },
      inactive:  { label: "Inactive",  color: "gray"   },
      pending:   { label: "Pending",   color: "amber"  },
      approved:  { label: "Approved",  color: "blue"   },
      rejected:  { label: "Rejected",  color: "red"    },
      closed:    { label: "Closed",    color: "gray"   },
      defaulted: { label: "Defaulted", color: "red"    },
      reversed:  { label: "Reversed",  color: "orange" },
      completed: { label: "Completed", color: "green"  },
    };
    return map[status] || { label: titleCase(status || ""), color: "gray" };
  }
  
  // ─── Exports ──────────────────────────────────────────────────────────────────
  
  module.exports = {
    formatCurrency, formatNumber, roundTo, formatPercent, percentageChange,
    formatDate, formatDateTime, toISODate, timeAgo, daysBetween, monthBounds,
    titleCase, initials, maskPhone, maskEmail, truncate, slugify,
    txTypeLabel, statusBadge,
  };
  


