/**
 * lib/saccoData.ts
 *
 * Nurses Quatres Savings Group — the group's real figures (from the savings workbook),
 * how they are saved in the browser, and every calculation the dashboard shows.
 * The page file (dashboard) only draws what this file computes.
 *
 * How the group works (same rules as the workbook):
 *   - Each member buys "shares" every month. 1 share = UGX 50,000 (settings.shareValue).
 *   - Every member also paid an opening balance once when joining (UGX 350,000).
 *   - The group lends the pool to members at a flat monthly rate (4% or 6%).
 *   - Interest collected from loans each month is shared between members in
 *     proportion to the shares they hold: member's share of the group's shares x interest.
 *   - Net position = opening balance + savings + interest share - loans still owed.
 *   - Projected payout = the larger of (opening + savings) and (net position x payout rate),
 *     so nobody is paid less than they put in.
 *
 * Everything the client adds or edits is kept in this browser (localStorage). The data
 * can be downloaded as a backup file and restored from the dashboard's "Data" menu.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Member = {
    id: string;
    name: string;
    opening: number;          // opening balance paid on joining (UGX)
    joined: string | null;    // "YYYY-MM-DD"
    phone: string;
};

export type Loan = {
    id: string;
    memberId: string;
    month: string | null;     // "YYYY-MM" the loan was given (null = not recorded yet)
    date: string | null;      // "YYYY-MM-DD" optional exact date
    principal: number;        // amount lent (UGX)
    rate: number;             // monthly flat rate as a decimal: 0.04 or 0.06
    interest: number;         // total interest on the loan (UGX)
    repayable: number;        // total to be repaid, principal + interest (UGX)
    repaid: number;           // paid back so far (UGX)
};

export type SaccoSettings = {
    name: string;
    shareValue: number;       // UGX per share
    openingBalance: number;   // default opening balance for a new member
    payoutRate: number;       // 1 = 100% of net position
    cycleStart: string;       // "YYYY-MM" first month of the saving cycle
    cycleMonths: number;      // length of the cycle in months
};

export type SaccoData = {
    version: 1;
    settings: SaccoSettings;
    members: Member[];
    savings: Record<string, Record<string, number>>;   // memberId -> "YYYY-MM" -> shares bought
    interest: Record<string, number>;                  // "YYYY-MM" -> interest collected (UGX)
    loans: Loan[];
};

// ─── The group's data (taken from the workbook) ───────────────────────────────

export const SEED_DATA: SaccoData = {
    version: 1,
    settings: { name: "Nurses Quatres Savings Group", shareValue: 50000, openingBalance: 350000, payoutRate: 1, cycleStart: "2024-08", cycleMonths: 25 },
    members: [
        { id: "m01", name: "ISAAC CHELIMO", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m02", name: "Sister BENINIAH", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m03", name: "HUSSEIN SHIFA", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m04", name: "CHEBET HAWA", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m05", name: "CHEGE RAEL", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m06", name: "CHEPTOYEK STELLA", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m07", name: "CHEMUTAI AKWINO", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m08", name: "SISTER ACEN", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m09", name: "NATHAN", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m10", name: "NATHANEL", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m11", name: "NYMPHA", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m12", name: "CHEPTENGAN JACKLINE", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m13", name: "NAIGAGA AMRAH", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m14", name: "MUTEESI HAMISA", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m15", name: "MANGUSHO EMMANUEL", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m16", name: "FANIS", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m17", name: "CHELANGAT BRENDA", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m18", name: "SOYEKWO OMEX", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m19", name: "ROBERT", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m20", name: "FEBIA", opening: 350000, joined: "2024-07-30", phone: "" },
        { id: "m21", name: "GRACE", opening: 350000, joined: "2024-07-30", phone: "" },
    ],
    // shares bought per member per month (1 share = UGX 50,000)
    savings: {
        m01: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 5, "2024-12": 5, "2025-01": 5, "2025-02": 5, "2025-03": 5, "2025-04": 5, "2025-05": 5, "2025-06": 4, "2025-07": 3, "2025-08": 2, "2025-09": 5, "2025-10": 5, "2025-11": 5, "2025-12": 5, "2026-01": 5, "2026-02": 5, "2026-03": 5 },
        m02: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 5, "2024-12": 5, "2025-01": 5, "2025-02": 5, "2025-03": 5, "2025-04": 5, "2025-05": 5, "2025-06": 2, "2025-07": 2, "2025-08": 2, "2025-09": 4, "2025-10": 4, "2025-11": 3, "2025-12": 3, "2026-01": 4, "2026-02": 5, "2026-03": 4 },
        m03: { "2024-08": 4, "2024-09": 3, "2024-10": 4, "2024-11": 2, "2024-12": 5, "2025-01": 5, "2025-02": 4, "2025-03": 4, "2025-04": 2, "2025-05": 4, "2025-06": 2, "2025-07": 4, "2025-08": 2, "2025-09": 2, "2025-10": 1, "2025-12": 2, "2026-01": 2, "2026-02": 2, "2026-03": 2, "2026-04": 2, "2026-05": 2 },
        m04: { "2024-08": 2, "2024-09": 2, "2024-10": 2, "2024-11": 2, "2024-12": 2, "2025-01": 2, "2025-02": 2, "2025-03": 2, "2025-04": 2, "2025-05": 2, "2025-06": 2, "2025-07": 2, "2025-08": 2, "2025-09": 2, "2025-10": 2, "2025-11": 2, "2025-12": 2, "2026-01": 2, "2026-02": 2, "2026-03": 2, "2026-04": 2 },
        m05: { "2024-08": 4, "2024-09": 4, "2024-10": 4, "2024-12": 4, "2025-01": 5, "2025-02": 2, "2025-03": 3, "2025-04": 3, "2025-05": 4, "2025-06": 1, "2025-07": 1, "2025-08": 1, "2025-09": 1, "2025-10": 2, "2025-11": 2, "2025-12": 2, "2026-01": 2, "2026-02": 1, "2026-03": 1, "2026-04": 1, "2026-05": 1 },
        m06: { "2024-08": 5, "2024-09": 1, "2024-10": 3, "2024-11": 2, "2024-12": 3, "2025-01": 2, "2025-02": 2, "2025-03": 4, "2025-04": 4, "2025-05": 4, "2025-06": 4, "2025-07": 4, "2025-08": 3, "2025-09": 3, "2025-10": 2, "2025-11": 2, "2025-12": 5, "2026-01": 4, "2026-02": 1, "2026-04": 2, "2026-05": 1 },
        m07: { "2024-08": 4, "2024-09": 3, "2024-10": 4, "2024-11": 3, "2024-12": 3, "2025-01": 2, "2025-02": 2, "2025-03": 2, "2025-04": 3, "2025-05": 2, "2025-06": 2, "2025-07": 3, "2025-08": 2, "2025-09": 3, "2025-10": 2, "2025-11": 2, "2025-12": 2, "2026-01": 2, "2026-02": 2, "2026-03": 1, "2026-04": 3, "2026-05": 1 },
        m08: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 5, "2024-12": 1, "2025-01": 5, "2025-03": 5, "2025-04": 1, "2025-05": 1, "2025-06": 1, "2025-07": 1, "2025-08": 1, "2025-09": 1, "2025-10": 1, "2026-01": 4, "2026-02": 2, "2026-03": 5, "2026-04": 2, "2026-05": 1 },
        m09: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 5, "2024-12": 1, "2025-01": 5, "2025-02": 5, "2025-03": 1, "2025-04": 1, "2025-05": 1, "2025-06": 1, "2025-07": 1, "2025-08": 1, "2025-09": 1, "2025-12": 2, "2026-01": 2, "2026-02": 5, "2026-03": 2, "2026-04": 1 },
        m10: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 5, "2024-12": 1, "2025-01": 5, "2025-02": 5, "2025-03": 1, "2025-04": 1, "2025-05": 1, "2025-06": 1, "2025-07": 1, "2025-08": 1, "2025-09": 1, "2025-12": 2, "2026-01": 2, "2026-02": 5, "2026-03": 2, "2026-04": 1 },
        m11: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 3, "2025-01": 5, "2025-02": 5, "2025-03": 1, "2025-04": 1, "2025-05": 1, "2025-06": 1, "2025-07": 1, "2025-08": 1, "2025-09": 1, "2025-12": 3, "2026-01": 2, "2026-02": 5, "2026-03": 2, "2026-04": 1 },
        m12: { "2024-08": 3, "2024-09": 3, "2024-10": 3, "2024-11": 4, "2024-12": 3, "2025-01": 2, "2025-02": 3, "2025-03": 4, "2025-04": 4, "2025-05": 4, "2025-06": 3, "2025-07": 3, "2025-08": 3, "2025-09": 4, "2025-10": 4, "2025-11": 5, "2025-12": 5, "2026-01": 5, "2026-02": 4, "2026-03": 4, "2026-04": 4, "2026-05": 4 },
        m13: { "2024-08": 3, "2024-09": 1, "2024-10": 2, "2024-11": 5, "2024-12": 5, "2025-01": 5, "2025-02": 5, "2025-03": 5, "2025-04": 5, "2025-05": 5, "2025-06": 5, "2025-07": 5, "2025-08": 5, "2025-09": 1, "2025-10": 1, "2025-11": 1, "2025-12": 1, "2026-01": 1, "2026-02": 1, "2026-03": 1, "2026-04": 1, "2026-05": 1 },
        m14: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 1, "2024-12": 1, "2025-01": 1, "2025-02": 1, "2025-03": 1, "2025-04": 1, "2025-05": 1, "2025-06": 1, "2025-07": 1, "2025-08": 1, "2025-09": 1, "2025-10": 1, "2025-11": 1, "2025-12": 1, "2026-02": 1, "2026-03": 1, "2026-04": 1, "2026-05": 1 },
        m15: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 5, "2024-12": 5, "2025-01": 5, "2025-02": 2, "2025-03": 2, "2025-04": 2, "2025-05": 2, "2025-06": 2, "2025-07": 4, "2025-08": 5, "2025-09": 3, "2025-10": 2, "2025-11": 2, "2025-12": 5, "2026-01": 5, "2026-02": 5, "2026-03": 2, "2026-04": 5, "2026-05": 2 },
        m16: { "2024-08": 5, "2024-09": 5, "2024-10": 5, "2024-11": 5, "2024-12": 5, "2025-01": 5, "2025-02": 5, "2025-03": 5, "2025-04": 5, "2025-05": 1, "2025-06": 3, "2025-07": 2, "2025-08": 2, "2025-09": 4, "2025-10": 4, "2025-11": 2, "2025-12": 2, "2026-01": 4, "2026-02": 5, "2026-03": 3 },
        m17: { "2024-08": 2, "2024-09": 2, "2024-10": 2, "2024-11": 2, "2024-12": 2, "2025-01": 2, "2025-02": 2, "2025-03": 2, "2025-04": 2, "2025-05": 2, "2025-06": 2, "2025-07": 2, "2025-08": 2, "2025-09": 2, "2025-10": 2, "2025-11": 2, "2025-12": 2, "2026-01": 2, "2026-02": 2, "2026-03": 2, "2026-04": 2 },
        m18: { "2024-08": 2, "2024-09": 2, "2024-10": 2, "2024-11": 2, "2024-12": 2, "2025-01": 2, "2025-02": 2, "2025-03": 2, "2025-04": 2, "2025-05": 2, "2025-06": 2, "2025-07": 2, "2025-08": 2, "2025-09": 2, "2025-10": 2, "2025-11": 2, "2025-12": 2, "2026-01": 2, "2026-02": 2, "2026-03": 2, "2026-04": 2 },
        m19: { "2024-08": 5, "2024-09": 5, "2024-10": 4, "2024-11": 4, "2025-01": 5, "2025-02": 5, "2025-03": 5, "2025-04": 5, "2025-05": 5, "2025-06": 5, "2025-07": 5, "2025-08": 5, "2025-09": 5, "2025-10": 5, "2025-11": 5, "2025-12": 5, "2026-01": 5, "2026-02": 5, "2026-03": 5, "2026-04": 5, "2026-05": 5 },
        m20: { "2024-08": 2, "2024-09": 2, "2024-10": 2, "2024-11": 5, "2024-12": 2, "2025-01": 4, "2025-02": 3, "2025-03": 5, "2025-04": 4, "2025-05": 4, "2025-06": 4, "2025-07": 5, "2025-08": 3, "2025-09": 4, "2025-10": 5, "2025-11": 5, "2025-12": 5, "2026-01": 5, "2026-02": 5, "2026-03": 4, "2026-04": 2, "2026-05": 3 },
        m21: { "2024-08": 1, "2024-09": 1, "2024-10": 2, "2024-11": 2, "2024-12": 2, "2025-01": 2, "2025-02": 1, "2025-03": 2, "2025-04": 4, "2025-05": 4, "2025-06": 3, "2025-07": 4, "2025-08": 2, "2025-09": 4, "2025-10": 4, "2025-11": 3, "2025-12": 2, "2026-01": 2, "2026-02": 1, "2026-04": 2, "2026-05": 1 },
    },
    // interest collected from loans each month (UGX)
    interest: { "2024-08": 2370000, "2024-09": 2532000, "2024-10": 1982880, "2024-11": 12870000, "2025-01": 690000, "2025-02": 3960000, "2025-03": 1928000, "2025-04": 120000, "2025-06": 1020000, "2025-07": 840000, "2025-08": 2400000, "2025-09": 546000, "2025-10": 2508000, "2026-01": 1204000, "2026-02": 200000 },
    loans: [
        { id: "l001", memberId: "m01", month: "2024-09", date: "2024-09-25", principal: 2000000, rate: 0.06, interest: 240000, repayable: 2240000, repaid: 2240000 },
        { id: "l002", memberId: "m01", month: "2024-11", date: "2024-11-26", principal: 12100000, rate: 0.06, interest: 11616000, repayable: 25168000, repaid: 11616000 },
        { id: "l003", memberId: "m02", month: "2024-10", date: "2024-10-02", principal: 3672000, rate: 0.06, interest: 1710400, repayable: 5382400, repaid: 5382400 },
        { id: "l004", memberId: "m02", month: "2025-08", date: "2025-08-01", principal: 10000000, rate: 0.04, interest: 3200000, repayable: 14000000, repaid: 3200000 },
        { id: "l005", memberId: "m03", month: "2024-08", date: "2024-08-01", principal: 3000000, rate: 0.06, interest: 900000, repayable: 3900000, repaid: 3900000 },
        { id: "l006", memberId: "m03", month: "2025-01", date: "2025-01-24", principal: 1500000, rate: 0.06, interest: 180000, repayable: 1680000, repaid: 1680000 },
        { id: "l007", memberId: "m03", month: "2025-03", date: "2025-03-07", principal: 3500000, rate: 0.06, interest: 420000, repayable: 3920000, repaid: 3920000 },
        { id: "l008", memberId: "m03", month: null, date: null, principal: 2000000, rate: 0.06, interest: 210000, repayable: 2210000, repaid: 2210000 },
        { id: "l009", memberId: "m03", month: null, date: null, principal: 8500000, rate: 0.04, interest: 1856000, repayable: 10356000, repaid: 7156000 },
        { id: "l010", memberId: "m04", month: "2024-08", date: "2024-08-16", principal: 2000000, rate: 0.06, interest: 630000, repayable: 2630000, repaid: 2630000 },
        { id: "l011", memberId: "m04", month: "2025-05", date: "2025-05-02", principal: 12000000, rate: 0.04, interest: 2170000, repayable: 14170000, repaid: 14170000 },
        { id: "l012", memberId: "m04", month: "2025-10", date: "2025-10-01", principal: 5000000, rate: 0.04, interest: 1600000, repayable: 6600000, repaid: 3600000 },
        { id: "l013", memberId: "m05", month: null, date: null, principal: 1900000, rate: 0.06, interest: 450000, repayable: 2350000, repaid: 950000 },
        { id: "l014", memberId: "m06", month: "2024-09", date: "2024-09-25", principal: 1000000, rate: 0.06, interest: 129000, repayable: 1129000, repaid: 1129000 },
        { id: "l015", memberId: "m06", month: null, date: null, principal: 1000000, rate: 0.06, interest: 0, repayable: 0, repaid: 0 },
        { id: "l016", memberId: "m06", month: null, date: null, principal: 7200000, rate: 0.04, interest: 608000, repayable: 8064000, repaid: 1208000 },
        { id: "l017", memberId: "m07", month: "2024-09", date: "2024-11-29", principal: 1500000, rate: 0.06, interest: 552000, repayable: 2052000, repaid: 2052000 },
        { id: "l018", memberId: "m07", month: null, date: null, principal: 3000000, rate: 0.04, interest: 940000, repayable: 3980000, repaid: 1990000 },
        { id: "l019", memberId: "m08", month: "2024-09", date: "2024-09-25", principal: 5370000, rate: 0.06, interest: 1611000, repayable: 6981000, repaid: 6981000 },
        { id: "l020", memberId: "m08", month: "2025-07", date: null, principal: 1000000, rate: 0.06, interest: 120000, repayable: 1120000, repaid: 1120000 },
        { id: "l021", memberId: "m08", month: "2025-09", date: "2025-09-01", principal: 1000000, rate: 0.04, interest: 80000, repayable: 1080000, repaid: 1080000 },
        { id: "l022", memberId: "m08", month: "2026-02", date: "2026-02-09", principal: 5000000, rate: 0.04, interest: 200000, repayable: 5200000, repaid: 5200000 },
        { id: "l023", memberId: "m10", month: "2025-02", date: "2025-05-02", principal: 8000000, rate: 0.06, interest: 2400000, repayable: 10400000, repaid: 10400000 },
        { id: "l024", memberId: "m10", month: "2025-10", date: "2025-10-01", principal: 10000000, rate: 0.04, interest: 1600000, repayable: 11600000, repaid: 11600000 },
        { id: "l025", memberId: "m11", month: "2025-02", date: "2025-02-10", principal: 2000000, rate: 0.06, interest: 120000, repayable: 2120000, repaid: 2120000 },
        { id: "l026", memberId: "m11", month: "2025-03", date: "2025-03-07", principal: 2000000, rate: 0.06, interest: 1148000, repayable: 3148000, repaid: 3148000 },
        { id: "l027", memberId: "m12", month: "2025-01", date: "2025-01-25", principal: 1500000, rate: 0.06, interest: 510000, repayable: 2010000, repaid: 2010000 },
        { id: "l028", memberId: "m12", month: "2025-09", date: "2025-09-01", principal: 300000, rate: 0.06, interest: 18000, repayable: 318000, repaid: 318000 },
        { id: "l029", memberId: "m12", month: "2025-09", date: "2025-09-01", principal: 5000000, rate: 0.04, interest: 1160000, repayable: 6160000, repaid: 3160000 },
        { id: "l030", memberId: "m13", month: "2024-07", date: "2024-07-01", principal: 2000000, rate: 0.06, interest: 840000, repayable: 2840000, repaid: 2840000 },
        { id: "l031", memberId: "m13", month: "2025-03", date: "2025-03-26", principal: 1500000, rate: 0.06, interest: 360000, repayable: 1860000, repaid: 1860000 },
        { id: "l032", memberId: "m13", month: "2025-07", date: "2025-07-04", principal: 6000000, rate: 0.06, interest: 720000, repayable: 6720000, repaid: 6720000 },
        { id: "l033", memberId: "m13", month: "2025-10", date: "2025-10-06", principal: 5000000, rate: 0.04, interest: 908000, repayable: 5908000, repaid: 4908000 },
        { id: "l034", memberId: "m14", month: "2025-04", date: "2025-04-04", principal: 1000000, rate: 0.06, interest: 120000, repayable: 1120000, repaid: 1120000 },
        { id: "l035", memberId: "m14", month: "2025-06", date: "2025-06-03", principal: 3000000, rate: 0.06, interest: 1020000, repayable: 4020000, repaid: 4020000 },
        { id: "l036", memberId: "m14", month: "2026-01", date: "2026-01-24", principal: 6000000, rate: 0.04, interest: 744000, repayable: 6744000, repaid: 2544000 },
        { id: "l037", memberId: "m15", month: "2026-01", date: "2026-01-02", principal: 3000000, rate: 0.04, interest: 460000, repayable: 3460000, repaid: 3460000 },
        { id: "l038", memberId: "m16", month: "2025-02", date: "2025-02-05", principal: 500000, rate: 0.06, interest: 90000, repayable: 590000, repaid: 590000 },
        { id: "l039", memberId: "m16", month: "2025-05", date: "2025-05-05", principal: 6550000, rate: 0.06, interest: 4824000, repayable: 11656000, repaid: 4824000 },
        { id: "l040", memberId: "m17", month: "2024-11", date: "2025-11-26", principal: 3000000, rate: 0.06, interest: 1470000, repayable: 4470000, repaid: 4470000 },
        { id: "l041", memberId: "m18", month: "2025-02", date: "2025-02-05", principal: 3000000, rate: 0.06, interest: 990000, repayable: 3990000, repaid: 3990000 },
        { id: "l042", memberId: "m18", month: "2025-08", date: "2025-08-08", principal: 10000000, rate: 0.04, interest: 1808000, repayable: 11808000, repaid: 11808000 },
        { id: "l043", memberId: "m19", month: null, date: null, principal: 1000000, rate: 0.06, interest: 360000, repayable: 1360000, repaid: 1360000 },
        { id: "l044", memberId: "m19", month: null, date: null, principal: 2000000, rate: 0.04, interest: 160000, repayable: 2160000, repaid: 2160000 },
        { id: "l045", memberId: "m19", month: null, date: null, principal: 800000, rate: 0.04, interest: 228000, repayable: 1028000, repaid: 228000 },
        { id: "l046", memberId: "m20", month: "2025-02", date: "2025-02-05", principal: 500000, rate: 0.06, interest: 360000, repayable: 860000, repaid: 710000 },
        { id: "l047", memberId: "m21", month: "2025-09", date: "2025-09-01", principal: 1000000, rate: 0.04, interest: 248000, repayable: 1248000, repaid: 1248000 },
    ],
};

// ─── Small helpers ────────────────────────────────────────────────────────────

export const STORAGE_KEY = "village-savings-sacco:data:v1";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-05" -> "May 2026" */
export function monthLabel(m: string): string {
    const [y, mo] = m.split("-");
    return `${MONTH_NAMES[Number(mo) - 1] ?? mo} ${y}`;
}

/** "2026-05" -> "May-26" */
export function monthShort(m: string): string {
    const [y, mo] = m.split("-");
    return `${MONTH_NAMES[Number(mo) - 1] ?? mo}-${y.slice(2)}`;
}

/** Adds (or subtracts) months to a "YYYY-MM" string. */
export function addMonths(m: string, n: number): string {
    const [y, mo] = m.split("-").map(Number);
    const idx = y * 12 + (mo - 1) + n;
    return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

/** Every month from `from` to `to` inclusive. */
export function monthRange(from: string, to: string): string[] {
    const out: string[] = [];
    for (let m = from; m <= to && out.length < 600; m = addMonths(m, 1)) out.push(m);
    return out;
}

/** Excel-style ROUND (halves go away from zero) so figures match the workbook exactly. */
export function xlRound(x: number): number {
    return (x < 0 ? -1 : 1) * Math.floor(Math.abs(x) + 0.5);
}

/** 4700000 -> "4,700,000" (same on server and browser). */
export function money(n: number): string {
    const r = Math.round(n);
    return (r < 0 ? "-" : "") + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function uid(prefix: string): string {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export const cloneSeed = (): SaccoData => clone(SEED_DATA);

/** Amount still owed on a loan (same rule as the ledger: repayable - repaid). */
export const loanBalance = (l: Loan): number => (l.principal ? l.repayable - l.repaid : 0);

// ─── Saving & loading (browser only) ──────────────────────────────────────────

/** Checks data from storage or a backup file and fills any missing parts. Returns null if unusable. */
export function normalizeData(raw: unknown): SaccoData | null {
    const r = raw as Partial<SaccoData> | null;
    if (!r || typeof r !== "object") return null;
    if (!Array.isArray(r.members) || !Array.isArray(r.loans)) return null;
    if (!r.savings || typeof r.savings !== "object" || !r.interest || typeof r.interest !== "object") return null;
    return {
        version: 1,
        settings: { ...SEED_DATA.settings, ...(r.settings ?? {}) },
        members: r.members as Member[],
        savings: r.savings as SaccoData["savings"],
        interest: r.interest as SaccoData["interest"],
        loans: r.loans as Loan[],
    };
}

export function loadData(): SaccoData {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const ok = normalizeData(JSON.parse(raw));
            if (ok) return ok;
        }
    } catch {
        /* storage blocked or unreadable - fall back to the workbook figures */
    }
    return cloneSeed();
}

/** Returns false when the browser would not save (private window, storage full...). */
export function saveData(d: SaccoData): boolean {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
        return true;
    } catch {
        return false;
    }
}

export function clearSavedData(): void {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

// ─── Calculations ─────────────────────────────────────────────────────────────

export type ChartPoint = { month: string; label: string; savings: number; loans: number; interest: number };

export type MemberRow = {
    id: string;
    name: string;
    phone: string;
    opening: number;
    shares: number;
    saved: number;       // shares x share value
    interest: number;    // this member's share of the interest collected
    owed: number;        // loans still owed
    net: number;         // opening + saved + interest - owed
    payout: number;      // projected payout at the end of the cycle
};

export type LoanRow = Loan & { memberName: string; balance: number; open: boolean; paidPct: number };

export type Dashboard = {
    period: string;                 // "all" or a year such as "2025"
    years: string[];
    chart: ChartPoint[];
    kpi: {
        savings: number;
        shares: number;
        opening: number;
        members: number;
        loansGiven: number;
        loanCount: number;
        owed: number;
        openLoans: number;
        interest: number;
    };
    members: MemberRow[];
    memberTotals: { opening: number; shares: number; saved: number; interest: number; owed: number; net: number; payout: number };
    loans: LoanRow[];
    rateSplit: { rate: number; principal: number }[];
    monthOptions: string[];         // months the "Record month" and loan forms offer
    defaultMonth: string;           // the next month that has no figures yet
};

/** First and last month that have any savings, interest or loan recorded. */
function activeRange(d: SaccoData): { first: string; last: string } {
    let first = "";
    let last = "";
    const see = (m: string) => {
        if (!first || m < first) first = m;
        if (!last || m > last) last = m;
    };
    for (const per of Object.values(d.savings)) for (const [m, v] of Object.entries(per)) if (v > 0) see(m);
    for (const [m, v] of Object.entries(d.interest)) if (v > 0) see(m);
    for (const l of d.loans) if (l.month) see(l.month);
    return { first, last };
}

function bounds(d: SaccoData) {
    const { first, last } = activeRange(d);
    const cycleEnd = addMonths(d.settings.cycleStart, Math.max(1, d.settings.cycleMonths) - 1);
    const start = first && first < d.settings.cycleStart ? first : d.settings.cycleStart;
    const lastMonth = last || start;
    return { start, lastMonth, cycleEnd, last };
}

/** Years shown as tabs: every year the cycle (or any recorded month) touches. */
export function cycleYears(d: SaccoData): string[] {
    const { start, lastMonth, cycleEnd } = bounds(d);
    const end = lastMonth > cycleEnd ? lastMonth : cycleEnd;
    return Array.from(new Set(monthRange(start, end).map((m) => m.slice(0, 4))));
}

export function computeDashboard(d: SaccoData, period: string): Dashboard {
    const { shareValue, payoutRate } = d.settings;
    const { start, lastMonth, cycleEnd, last } = bounds(d);
    const inPeriod = (m: string | null) => period === "all" || (!!m && m.startsWith(period));

    // ── the whole cycle, per member (matches the workbook's payout projection) ──
    const sharesOf = (id: string) => Object.values(d.savings[id] ?? {}).reduce((a, b) => a + (b || 0), 0);
    const totalShares = d.members.reduce((a, m) => a + sharesOf(m.id), 0);
    const interestMonths = Object.values(d.interest).filter((v) => v > 0);

    const owedBy: Record<string, number> = {};
    for (const l of d.loans) owedBy[l.memberId] = (owedBy[l.memberId] ?? 0) + loanBalance(l);

    const members: MemberRow[] = d.members.map((m) => {
        const shares = sharesOf(m.id);
        const saved = shares * shareValue;
        // each month's interest is split by share of all shares, rounded per month like the workbook
        const interest = totalShares > 0 ? interestMonths.reduce((a, c) => a + xlRound((shares / totalShares) * c), 0) : 0;
        const owed = owedBy[m.id] ?? 0;
        const net = xlRound(m.opening + saved + interest - owed);
        const payout = xlRound(Math.max(m.opening + saved, net * payoutRate));
        return { id: m.id, name: m.name, phone: m.phone, opening: m.opening, shares, saved, interest, owed, net, payout };
    });

    const memberTotals = members.reduce(
        (t, r) => ({
            opening: t.opening + r.opening,
            shares: t.shares + r.shares,
            saved: t.saved + r.saved,
            interest: t.interest + r.interest,
            owed: t.owed + r.owed,
            net: t.net + r.net,
            payout: t.payout + r.payout,
        }),
        { opening: 0, shares: 0, saved: 0, interest: 0, owed: 0, net: 0, payout: 0 }
    );

    // ── the chosen period ──
    let sharesInPeriod = 0;
    for (const per of Object.values(d.savings)) {
        for (const [m, v] of Object.entries(per)) if (inPeriod(m)) sharesInPeriod += v || 0;
    }
    let interestInPeriod = 0;
    for (const [m, v] of Object.entries(d.interest)) if (inPeriod(m)) interestInPeriod += v || 0;

    const nameOf = new Map(d.members.map((m) => [m.id, m.name]));
    const periodLoans: LoanRow[] = d.loans
        .filter((l) => inPeriod(l.month))
        .map((l) => {
            const balance = loanBalance(l);
            return {
                ...l,
                memberName: nameOf.get(l.memberId) ?? "Unknown member",
                balance,
                open: balance > 0,
                paidPct: l.repayable > 0 ? Math.max(0, Math.min(100, Math.round((l.repaid / l.repayable) * 100))) : 0,
            };
        })
        .sort((a, b) => {
            if (a.open !== b.open) return a.open ? -1 : 1;
            if (a.open) return b.balance - a.balance;
            return (b.month ?? "").localeCompare(a.month ?? "");
        });

    const byRate = new Map<number, number>();
    for (const l of periodLoans) byRate.set(l.rate, (byRate.get(l.rate) ?? 0) + l.principal);
    const rateSplit = Array.from(byRate.entries())
        .map(([rate, principal]) => ({ rate, principal }))
        .sort((a, b) => a.rate - b.rate);

    // ── chart: one point per month, up to the latest month with any figures ──
    const chart: ChartPoint[] = monthRange(start, lastMonth)
        .filter((m) => inPeriod(m))
        .map((m) => {
            let shares = 0;
            for (const per of Object.values(d.savings)) shares += per[m] || 0;
            const loans = d.loans.reduce((a, l) => a + (l.month === m ? l.principal : 0), 0);
            return { month: m, label: monthShort(m), savings: shares * shareValue, loans, interest: d.interest[m] || 0 };
        });

    const optionsEnd = addMonths(lastMonth > cycleEnd ? lastMonth : cycleEnd, 3);
    const next = last ? addMonths(last, 1) : d.settings.cycleStart;

    return {
        period,
        years: cycleYears(d),
        chart,
        kpi: {
            savings: sharesInPeriod * shareValue,
            shares: sharesInPeriod,
            opening: memberTotals.opening,
            members: d.members.length,
            loansGiven: periodLoans.reduce((a, l) => a + l.principal, 0),
            loanCount: periodLoans.length,
            owed: periodLoans.reduce((a, l) => a + l.balance, 0),
            openLoans: periodLoans.filter((l) => l.open).length,
            interest: interestInPeriod,
        },
        members,
        memberTotals,
        loans: periodLoans,
        rateSplit,
        monthOptions: monthRange(start, optionsEnd),
        defaultMonth: next > optionsEnd ? optionsEnd : next,
    };
}

// ─── Changes (each returns a new copy of the data) ────────────────────────────

/** Saves one month: shares bought by each member, plus the interest collected that month. */
export function setMonthEntries(
    d: SaccoData,
    month: string,
    sharesByMember: Record<string, number>,
    interestCollected: number
): SaccoData {
    const next = clone(d);
    for (const m of next.members) {
        const v = sharesByMember[m.id];
        const row = next.savings[m.id] ?? (next.savings[m.id] = {});
        if (v && v > 0) row[month] = v;
        else delete row[month];
    }
    if (interestCollected > 0) next.interest[month] = interestCollected;
    else delete next.interest[month];
    return next;
}

export function upsertMember(d: SaccoData, member: Member): SaccoData {
    const next = clone(d);
    const i = next.members.findIndex((m) => m.id === member.id);
    if (i >= 0) next.members[i] = member;
    else {
        next.members.push(member);
        next.savings[member.id] = {};
    }
    return next;
}

export function upsertLoan(d: SaccoData, loan: Loan): SaccoData {
    const next = clone(d);
    const i = next.loans.findIndex((l) => l.id === loan.id);
    if (i >= 0) next.loans[i] = loan;
    else next.loans.push(loan);
    return next;
}

export function removeLoan(d: SaccoData, id: string): SaccoData {
    const next = clone(d);
    next.loans = next.loans.filter((l) => l.id !== id);
    return next;
}

export function addRepayment(d: SaccoData, loanId: string, amount: number): SaccoData {
    const next = clone(d);
    const l = next.loans.find((x) => x.id === loanId);
    if (l) l.repaid += amount;
    return next;
}
