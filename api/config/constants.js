/**
 * api/config/constants.js
 *
 * Application-wide constants.
 * Import from here — never hardcode magic values in services or routes.
 *
 * Usage:
 *   const { LOAN_STATUSES, ROLES, PAGINATION } = require("../config/constants");
 */

// ─── Roles ────────────────────────────────────────────────────────────────────

const ROLES = {
    ADMIN:     "admin",
    TREASURER: "treasurer",
    SECRETARY: "secretary",
    MEMBER:    "member",
  };
  
  /** All valid role strings as an array — useful for Joi validation */
  const ALL_ROLES = Object.values(ROLES);
  
  // ─── Member Statuses ──────────────────────────────────────────────────────────
  
  const MEMBER_STATUSES = {
    ACTIVE:   "active",
    INACTIVE: "inactive",
  };
  
  const ALL_MEMBER_STATUSES = Object.values(MEMBER_STATUSES);
  
  // ─── Saving Account Types ─────────────────────────────────────────────────────
  
  const SAVING_TYPES = {
    REGULAR: "regular",
    FIXED:   "fixed",
    JUNIOR:  "junior",
    GROUP:   "group",
  };
  
  const ALL_SAVING_TYPES = Object.values(SAVING_TYPES);
  
  // ─── Saving Account Statuses ──────────────────────────────────────────────────
  
  const SAVING_STATUSES = {
    ACTIVE:   "active",
    INACTIVE: "inactive",
    CLOSED:   "closed",
  };
  
  const ALL_SAVING_STATUSES = Object.values(SAVING_STATUSES);
  
  // ─── Loan Types ───────────────────────────────────────────────────────────────
  
  const LOAN_TYPES = {
    PERSONAL:  "personal",
    BUSINESS:  "business",
    EMERGENCY: "emergency",
    EDUCATION: "education",
    MORTGAGE:  "mortgage",
  };
  
  const ALL_LOAN_TYPES = Object.values(LOAN_TYPES);
  
  // ─── Loan Statuses ────────────────────────────────────────────────────────────
  
  const LOAN_STATUSES = {
    PENDING:   "pending",
    APPROVED:  "approved",
    ACTIVE:    "active",
    CLOSED:    "closed",
    REJECTED:  "rejected",
    DEFAULTED: "defaulted",
    CANCELLED: "cancelled",
  };
  
  const ALL_LOAN_STATUSES = Object.values(LOAN_STATUSES);
  
  // ─── Transaction Types ────────────────────────────────────────────────────────
  
  const TRANSACTION_TYPES = {
    DEPOSIT:           "deposit",
    WITHDRAWAL:        "withdrawal",
    LOAN_REPAYMENT:    "loan_repayment",
    LOAN_DISBURSEMENT: "loan_disbursement",
    INTEREST_CREDIT:   "interest_credit",
    REVERSAL:          "reversal",
    ADJUSTMENT:        "adjustment",
  };
  
  const ALL_TRANSACTION_TYPES = Object.values(TRANSACTION_TYPES);
  
  // ─── Transaction Statuses ─────────────────────────────────────────────────────
  
  const TRANSACTION_STATUSES = {
    COMPLETED: "completed",
    PENDING:   "pending",
    REVERSED:  "reversed",
    FAILED:    "failed",
  };
  
  const ALL_TRANSACTION_STATUSES = Object.values(TRANSACTION_STATUSES);
  
  // ─── Transaction Sources ──────────────────────────────────────────────────────
  
  const TRANSACTION_SOURCES = {
    SYSTEM: "system",
    MANUAL: "manual",
  };
  
  // ─── Payment Methods ──────────────────────────────────────────────────────────
  
  const PAYMENT_METHODS = {
    CASH:          "cash",
    MOBILE_MONEY:  "mobile_money",
    BANK_TRANSFER: "bank_transfer",
    CHEQUE:        "cheque",
  };
  
  const ALL_PAYMENT_METHODS = Object.values(PAYMENT_METHODS);
  
  // ─── Interest Types ───────────────────────────────────────────────────────────
  
  const INTEREST_TYPES = {
    EARNED:  "earned",   // interest accrued on savings (owed to members)
    CHARGED: "charged",  // interest charged on loans (owed by members)
    PAID:    "paid",     // interest actually disbursed to member accounts
  };
  
  const ALL_INTEREST_TYPES = Object.values(INTEREST_TYPES);
  
  // ─── Interest Sources ─────────────────────────────────────────────────────────
  
  const INTEREST_SOURCES = {
    SYSTEM: "system",  // auto-calculated by the system
    MANUAL: "manual",  // manually entered by admin
  };
  
  // ─── Interest Calculation Periods ────────────────────────────────────────────
  
  const INTEREST_PERIODS = {
    MONTHLY:   "monthly",
    QUARTERLY: "quarterly",
  };
  
  const ALL_INTEREST_PERIODS = Object.values(INTEREST_PERIODS);
  
  // ─── Report Types ─────────────────────────────────────────────────────────────
  
  const REPORT_TYPES = {
    FINANCIAL:    "financial",
    SAVINGS:      "savings",
    LOANS:        "loans",
    INTEREST:     "interest",
    MEMBERS:      "members",
    TRANSACTIONS: "transactions",
    ARREARS:      "arrears",
    BALANCE_SHEET:"balance-sheet",
    CASHFLOW:     "cashflow",
  };
  
  const ALL_REPORT_TYPES = Object.values(REPORT_TYPES);
  
  // ─── Report Formats ───────────────────────────────────────────────────────────
  
  const REPORT_FORMATS = {
    PDF:   "pdf",
    CSV:   "csv",
    EXCEL: "excel",
    JSON:  "json",
  };
  
  const ALL_REPORT_FORMATS = Object.values(REPORT_FORMATS);
  
  // ─── Report Frequencies (for scheduled reports) ───────────────────────────────
  
  const REPORT_FREQUENCIES = {
    DAILY:   "daily",
    WEEKLY:  "weekly",
    MONTHLY: "monthly",
  };
  
  const ALL_REPORT_FREQUENCIES = Object.values(REPORT_FREQUENCIES);
  
  // ─── Gender Options ───────────────────────────────────────────────────────────
  
  const GENDERS = {
    MALE:   "male",
    FEMALE: "female",
    OTHER:  "other",
  };
  
  const ALL_GENDERS = Object.values(GENDERS);
  
  // ─── Query Periods ────────────────────────────────────────────────────────────
  
  const QUERY_PERIODS = {
    TODAY:          "today",
    THIS_WEEK:      "this_week",
    THIS_MONTH:     "this_month",
    LAST_MONTH:     "last_month",
    THIS_QUARTER:   "this_quarter",
    LAST_QUARTER:   "last_quarter",
    YTD:            "ytd",
    CUSTOM:         "custom",
    ALL:            "all",
  };
  
  const ALL_QUERY_PERIODS = Object.values(QUERY_PERIODS);
  
  // ─── Pagination Defaults ──────────────────────────────────────────────────────
  
  const PAGINATION = {
    DEFAULT_PAGE:  1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT:     100,
  };
  
  // ─── Financial Defaults ───────────────────────────────────────────────────────
  
  /**
   * Default interest rates (annual, as decimals).
   * These are defaults — each account/loan stores its own rate.
   */
  const INTEREST_RATES = {
    DEFAULT_SAVINGS_RATE: 0.08,   // 8% per annum on savings
    DEFAULT_LOAN_RATE:    0.12,   // 12% per annum on loans
    MAX_LOAN_RATE:        0.36,   // 36% per annum maximum
    MIN_LOAN_RATE:        0.05,   // 5% per annum minimum
  };
  
  /** Loan term limits (months) */
  const LOAN_TERMS = {
    MIN_MONTHS: 1,
    MAX_MONTHS: 60,  // 5 years
  };
  
  /** Loan amount limits (UGX) */
  const LOAN_AMOUNTS = {
    MIN: 50000,        // UGX 50,000 minimum
    MAX: 50000000,     // UGX 50,000,000 maximum
  };
  
  /** Deposit / withdrawal limits (UGX) */
  const TRANSACTION_LIMITS = {
    MIN_DEPOSIT:    1000,      // UGX 1,000 minimum deposit
    MAX_DEPOSIT:    100000000, // UGX 100,000,000 maximum single deposit
    MIN_WITHDRAWAL: 1000,      // UGX 1,000 minimum withdrawal
  };
  
  // ─── Security ─────────────────────────────────────────────────────────────────
  
  const SECURITY = {
    JWT_EXPIRES_IN:          "8h",     // access token lifetime
    REFRESH_EXPIRES_IN:      "7d",     // refresh token lifetime
    PASSWORD_RESET_EXPIRES:  3600000,  // 1 hour in ms
    BCRYPT_SALT_ROUNDS:      12,
    MAX_LOGIN_ATTEMPTS:      5,
    LOCKOUT_DURATION_MINS:   30,
  };
  
  // ─── Reference Prefixes ───────────────────────────────────────────────────────
  
  const REF_PREFIXES = {
    MEMBER:      "MBR",
    SAVING:      "SAV",
    LOAN:        "LN",
    TRANSACTION: "TXN",
    INTEREST:    "INT",
    REVERSAL:    "REV",
  };
  
  // ─── Arrears Aging Buckets (days) ─────────────────────────────────────────────
  
  const ARREARS_BUCKETS = {
    BUCKET_30:   { label: "1-30 days",   min: 1,  max: 30  },
    BUCKET_60:   { label: "31-60 days",  min: 31, max: 60  },
    BUCKET_90:   { label: "61-90 days",  min: 61, max: 90  },
    BUCKET_90P:  { label: "90+ days",    min: 91, max: Infinity },
  };
  
  // ─── HTTP Status Codes ────────────────────────────────────────────────────────
  
  const HTTP = {
    OK:                   200,
    CREATED:              201,
    NO_CONTENT:           204,
    BAD_REQUEST:          400,
    UNAUTHORIZED:         401,
    FORBIDDEN:            403,
    NOT_FOUND:            404,
    CONFLICT:             409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_ERROR:       500,
    SERVICE_UNAVAILABLE:  503,
  };
  
  // ─── Exports ──────────────────────────────────────────────────────────────────
  
  module.exports = {
    // Roles
    ROLES,
    ALL_ROLES,
  
    // Member
    MEMBER_STATUSES,
    ALL_MEMBER_STATUSES,
    GENDERS,
    ALL_GENDERS,
  
    // Savings
    SAVING_TYPES,
    ALL_SAVING_TYPES,
    SAVING_STATUSES,
    ALL_SAVING_STATUSES,
  
    // Loans
    LOAN_TYPES,
    ALL_LOAN_TYPES,
    LOAN_STATUSES,
    ALL_LOAN_STATUSES,
    LOAN_TERMS,
    LOAN_AMOUNTS,
  
    // Transactions
    TRANSACTION_TYPES,
    ALL_TRANSACTION_TYPES,
    TRANSACTION_STATUSES,
    ALL_TRANSACTION_STATUSES,
    TRANSACTION_SOURCES,
    TRANSACTION_LIMITS,
    PAYMENT_METHODS,
    ALL_PAYMENT_METHODS,
  
    // Interest
    INTEREST_TYPES,
    ALL_INTEREST_TYPES,
    INTEREST_SOURCES,
    INTEREST_PERIODS,
    ALL_INTEREST_PERIODS,
    INTEREST_RATES,
  
    // Reports
    REPORT_TYPES,
    ALL_REPORT_TYPES,
    REPORT_FORMATS,
    ALL_REPORT_FORMATS,
    REPORT_FREQUENCIES,
    ALL_REPORT_FREQUENCIES,
  
    // Query helpers
    QUERY_PERIODS,
    ALL_QUERY_PERIODS,
    PAGINATION,
  
    // Financial
    ARREARS_BUCKETS,
  
    // Security
    SECURITY,
    REF_PREFIXES,
  
    // HTTP
    HTTP,
  };
  


