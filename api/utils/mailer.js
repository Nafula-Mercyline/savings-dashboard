/**
 * api/utils/mailer.js
 *
 * Email Service — powered by Nodemailer.
 * Supports SMTP (Gmail, custom) and Mailtrap for development.
 *
 * Provides ready-made email templates for:
 *   - Welcome / account confirmation
 *   - Password reset
 *   - Deposit confirmation
 *   - Withdrawal confirmation
 *   - Loan approval / rejection / disbursement
 *   - Loan repayment receipt
 *   - Interest credit notification
 *   - Overdue loan reminder
 *   - Monthly statement
 *   - Scheduled report delivery
 *
 * Requires:  npm install nodemailer
 *
 * .env variables needed:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   SMTP_FROM_NAME, SMTP_FROM_EMAIL
 *   APP_NAME, APP_URL
 *   NODE_ENV
 */

const nodemailer = require("nodemailer");
const { formatCurrency, formatDate, formatDateTime } = require("./formatters");

// ─── Transport ────────────────────────────────────────────────────────────────

/**
 * Creates the Nodemailer transporter.
 * In development, uses Mailtrap (or Ethereal) for safe preview.
 * In production, uses the SMTP credentials from .env.
 */
function createTransporter() {
  if (process.env.NODE_ENV === "production") {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development — Mailtrap
  return nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: process.env.MAILTRAP_USER || "your_mailtrap_user",
      pass: process.env.MAILTRAP_PASS || "your_mailtrap_pass",
    },
  });
}

const transporter = createTransporter();

// ─── Shared Helpers ───────────────────────────────────────────────────────────

const APP_NAME = process.env.APP_NAME  || "UmojaSave";
const APP_URL  = process.env.APP_URL   || "http://localhost:3000";
const FROM     = `"${process.env.SMTP_FROM_NAME || APP_NAME}" <${process.env.SMTP_FROM_EMAIL || "no-reply@umojasave.com"}>`;

/**
 * Wraps email content in the shared branded HTML layout.
 *
 * @param {string} title   — email subject / heading
 * @param {string} body    — inner HTML content
 * @param {string} pretext — plain-text preview line
 */
function layout(title, body, pretext = "") {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:#f4f3f0;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .header{background:#1a1a2e;padding:24px 32px;text-align:center}
    .header h1{margin:0;color:#93c5fd;font-size:22px;letter-spacing:-.3px}
    .header p{margin:4px 0 0;color:rgba(255,255,255,.5);font-size:12px}
    .body{padding:32px}
    .body h2{margin:0 0 16px;font-size:18px;color:#1a1a2e}
    .body p{margin:0 0 14px;font-size:14px;line-height:1.6;color:#3d3d5c}
    .amount-box{background:#f0f7ff;border-left:4px solid #2563eb;border-radius:6px;padding:14px 18px;margin:20px 0}
    .amount-box .label{font-size:11px;font-weight:600;color:#8888aa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
    .amount-box .value{font-size:26px;font-weight:700;color:#1a1a2e}
    .info-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
    .info-table td{padding:8px 0;border-bottom:1px solid #f0eeea;color:#3d3d5c}
    .info-table td:first-child{color:#8888aa;width:45%}
    .btn{display:inline-block;margin:20px 0 0;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500}
    .footer{background:#f9f8f6;padding:20px 32px;text-align:center;border-top:1px solid #ece9e4}
    .footer p{margin:0;font-size:11px;color:#8888aa;line-height:1.6}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-green{background:#d1fae5;color:#065f46}
    .badge-red{background:#fee2e2;color:#991b1b}
    .badge-amber{background:#fef3c7;color:#92400e}
  </style>
</head>
<body>
  <span style="display:none;max-height:0;overflow:hidden">${pretext}</span>
  <div class="wrap">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>Member Savings & Loans Platform</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>
        This email was sent by ${APP_NAME}.<br/>
        If you have questions, contact your SACCO administrator.<br/>
        &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Core send function — all template functions call this.
 *
 * @param {Object} options
 * @param {string|string[]} options.to      — recipient(s)
 * @param {string}          options.subject
 * @param {string}          options.html
 * @param {string}          options.text    — plain-text fallback
 * @param {Array}           options.attachments — Nodemailer attachment objects
 */
async function sendMail({ to, subject, html, text, attachments }) {
  const recipients = Array.isArray(to) ? to.join(", ") : to;

  const info = await transporter.sendMail({
    from:    FROM,
    to:      recipients,
    subject,
    html,
    text:    text || subject,
    attachments: attachments || [],
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`📧 Email sent → ${recipients} | ID: ${info.messageId}`);
  }

  return info;
}

// ─── Email Templates ──────────────────────────────────────────────────────────

/**
 * 1. Welcome Email
 * Sent when a new member is registered.
 *
 * @param {Object} member — { firstName, lastName, email, memberNumber }
 */
async function sendWelcome(member) {
  const subject = `Welcome to ${APP_NAME}, ${member.firstName}!`;
  const html = layout(subject, `
    <h2>Welcome aboard, ${member.firstName}! 🎉</h2>
    <p>Your membership has been successfully created. Here are your account details:</p>
    <table class="info-table">
      <tr><td>Full Name</td><td><strong>${member.firstName} ${member.lastName}</strong></td></tr>
      <tr><td>Member Number</td><td><strong>${member.memberNumber}</strong></td></tr>
      <tr><td>Email</td><td>${member.email}</td></tr>
      <tr><td>Date Joined</td><td>${formatDate(new Date())}</td></tr>
    </table>
    <p>You can now make deposits, apply for loans, and track your savings through the platform.</p>
    <a href="${APP_URL}" class="btn">Visit Your Dashboard</a>
    <p style="margin-top:20px">If you have any questions, please contact your SACCO administrator.</p>
  `, `Welcome to ${APP_NAME} — your account is ready.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 2. Password Reset Email
 *
 * @param {Object} user    — { firstName, email }
 * @param {string} resetUrl — full reset link with token
 */
async function sendPasswordReset(user, resetUrl) {
  const subject = `Password Reset — ${APP_NAME}`;
  const html = layout(subject, `
    <h2>Reset Your Password</h2>
    <p>Hello ${user.firstName},</p>
    <p>We received a request to reset your password. Click the button below to set a new one. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset Password</a>
    <p style="margin-top:20px;font-size:12px;color:#8888aa">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will not be changed.
    </p>
  `, "Reset your password — link expires in 1 hour.");

  return sendMail({ to: user.email, subject, html });
}

/**
 * 3. Deposit Confirmation
 *
 * @param {Object} member      — { firstName, email, memberNumber }
 * @param {Object} transaction — { amount, reference, paymentMethod, createdAt }
 * @param {Object} saving      — { accountNumber, balance }
 */
async function sendDepositConfirmation(member, transaction, saving) {
  const subject = `Deposit Received — ${formatCurrency(transaction.amount)}`;
  const html = layout(subject, `
    <h2>Deposit Confirmed ✅</h2>
    <p>Hello ${member.firstName}, your deposit has been successfully recorded.</p>
    <div class="amount-box">
      <div class="label">Amount Deposited</div>
      <div class="value">${formatCurrency(transaction.amount)}</div>
    </div>
    <table class="info-table">
      <tr><td>Reference</td><td><strong>${transaction.reference}</strong></td></tr>
      <tr><td>Account Number</td><td>${saving.accountNumber}</td></tr>
      <tr><td>New Balance</td><td><strong>${formatCurrency(saving.balance)}</strong></td></tr>
      <tr><td>Payment Method</td><td>${transaction.paymentMethod || "Cash"}</td></tr>
      <tr><td>Date & Time</td><td>${formatDateTime(transaction.createdAt)}</td></tr>
    </table>
    <p>Keep saving — every shilling counts! 💪</p>
  `, `Your deposit of ${formatCurrency(transaction.amount)} was received.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 4. Withdrawal Confirmation
 *
 * @param {Object} member      — { firstName, email }
 * @param {Object} transaction — { amount, reference, paymentMethod, createdAt }
 * @param {Object} saving      — { accountNumber, balance }
 */
async function sendWithdrawalConfirmation(member, transaction, saving) {
  const subject = `Withdrawal Processed — ${formatCurrency(transaction.amount)}`;
  const html = layout(subject, `
    <h2>Withdrawal Processed</h2>
    <p>Hello ${member.firstName}, your withdrawal has been processed successfully.</p>
    <div class="amount-box" style="border-color:#dc2626">
      <div class="label">Amount Withdrawn</div>
      <div class="value" style="color:#dc2626">${formatCurrency(transaction.amount)}</div>
    </div>
    <table class="info-table">
      <tr><td>Reference</td><td><strong>${transaction.reference}</strong></td></tr>
      <tr><td>Account Number</td><td>${saving.accountNumber}</td></tr>
      <tr><td>Remaining Balance</td><td><strong>${formatCurrency(saving.balance)}</strong></td></tr>
      <tr><td>Payment Method</td><td>${transaction.paymentMethod || "Cash"}</td></tr>
      <tr><td>Date & Time</td><td>${formatDateTime(transaction.createdAt)}</td></tr>
    </table>
    <p>If you did not authorise this withdrawal, please contact your administrator immediately.</p>
  `, `Your withdrawal of ${formatCurrency(transaction.amount)} was processed.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 5. Loan Application Received
 *
 * @param {Object} member — { firstName, email }
 * @param {Object} loan   — { reference, principal, termMonths, loanType }
 */
async function sendLoanApplicationReceived(member, loan) {
  const subject = `Loan Application Received — ${loan.reference}`;
  const html = layout(subject, `
    <h2>Loan Application Received 📋</h2>
    <p>Hello ${member.firstName}, your loan application has been submitted and is pending review.</p>
    <table class="info-table">
      <tr><td>Reference</td><td><strong>${loan.reference}</strong></td></tr>
      <tr><td>Amount Requested</td><td><strong>${formatCurrency(loan.principal)}</strong></td></tr>
      <tr><td>Loan Type</td><td>${loan.loanType || "Personal"}</td></tr>
      <tr><td>Term</td><td>${loan.termMonths} months</td></tr>
      <tr><td>Status</td><td><span class="badge badge-amber">Pending Review</span></td></tr>
    </table>
    <p>You will receive an email notification once your application has been reviewed. This typically takes 1–3 business days.</p>
  `, `Your loan application ${loan.reference} is under review.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 6. Loan Approval
 *
 * @param {Object} member — { firstName, email }
 * @param {Object} loan   — { reference, principal, termMonths, monthlyPayment, totalPayable }
 */
async function sendLoanApproval(member, loan) {
  const subject = `Loan Approved — ${loan.reference} 🎉`;
  const html = layout(subject, `
    <h2>Your Loan Has Been Approved! 🎉</h2>
    <p>Congratulations ${member.firstName}! Your loan application has been approved.</p>
    <div class="amount-box">
      <div class="label">Approved Amount</div>
      <div class="value">${formatCurrency(loan.principal)}</div>
    </div>
    <table class="info-table">
      <tr><td>Reference</td><td><strong>${loan.reference}</strong></td></tr>
      <tr><td>Term</td><td>${loan.termMonths} months</td></tr>
      <tr><td>Monthly Repayment</td><td><strong>${formatCurrency(loan.monthlyPayment)}</strong></td></tr>
      <tr><td>Total Payable</td><td>${formatCurrency(loan.totalPayable)}</td></tr>
      <tr><td>Status</td><td><span class="badge badge-green">Approved</span></td></tr>
    </table>
    <p>Disbursement will be processed shortly. You will receive another notification when the funds are released.</p>
  `, `Your loan of ${formatCurrency(loan.principal)} has been approved.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 7. Loan Rejection
 *
 * @param {Object} member — { firstName, email }
 * @param {Object} loan   — { reference, principal }
 * @param {string} reason — rejection reason
 */
async function sendLoanRejection(member, loan, reason) {
  const subject = `Loan Application Update — ${loan.reference}`;
  const html = layout(subject, `
    <h2>Loan Application Update</h2>
    <p>Hello ${member.firstName},</p>
    <p>We regret to inform you that your loan application has not been approved at this time.</p>
    <table class="info-table">
      <tr><td>Reference</td><td><strong>${loan.reference}</strong></td></tr>
      <tr><td>Amount Requested</td><td>${formatCurrency(loan.principal)}</td></tr>
      <tr><td>Status</td><td><span class="badge badge-red">Not Approved</span></td></tr>
      <tr><td>Reason</td><td>${reason}</td></tr>
    </table>
    <p>You are welcome to reapply in the future. Please speak with your SACCO administrator for guidance on improving your eligibility.</p>
  `, `Update on your loan application ${loan.reference}.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 8. Loan Disbursement
 *
 * @param {Object} member — { firstName, email }
 * @param {Object} loan   — { reference, principal, disbursedAt, dueDate, monthlyPayment }
 */
async function sendLoanDisbursement(member, loan) {
  const subject = `Loan Disbursed — ${formatCurrency(loan.principal)} Released`;
  const html = layout(subject, `
    <h2>Loan Funds Disbursed 💰</h2>
    <p>Hello ${member.firstName}, your loan funds have been released.</p>
    <div class="amount-box">
      <div class="label">Amount Disbursed</div>
      <div class="value">${formatCurrency(loan.principal)}</div>
    </div>
    <table class="info-table">
      <tr><td>Reference</td><td><strong>${loan.reference}</strong></td></tr>
      <tr><td>Disbursed On</td><td>${formatDate(loan.disbursedAt)}</td></tr>
      <tr><td>Final Due Date</td><td>${formatDate(loan.dueDate)}</td></tr>
      <tr><td>Monthly Repayment</td><td><strong>${formatCurrency(loan.monthlyPayment)}</strong></td></tr>
    </table>
    <p>Please ensure your monthly repayments are made on time to avoid penalties. 
       Contact your administrator if you need a repayment schedule.</p>
  `, `Your loan funds of ${formatCurrency(loan.principal)} have been released.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 9. Loan Repayment Receipt
 *
 * @param {Object} member    — { firstName, email }
 * @param {Object} loan      — { reference }
 * @param {Object} repayment — { amount, balanceAfter, reference, createdAt }
 */
async function sendRepaymentReceipt(member, loan, repayment) {
  const fullyRepaid = repayment.balanceAfter <= 0;
  const subject     = fullyRepaid
    ? `Loan Fully Repaid — ${loan.reference} 🎉`
    : `Repayment Received — ${formatCurrency(repayment.amount)}`;

  const html = layout(subject, `
    <h2>${fullyRepaid ? "🎉 Congratulations — Loan Fully Repaid!" : "Repayment Received ✅"}</h2>
    <p>Hello ${member.firstName}, ${fullyRepaid
      ? "your loan has been fully repaid. Well done!"
      : "your repayment has been received and recorded."
    }</p>
    <div class="amount-box" style="border-color:${fullyRepaid ? "#059669" : "#2563eb"}">
      <div class="label">Amount Paid</div>
      <div class="value">${formatCurrency(repayment.amount)}</div>
    </div>
    <table class="info-table">
      <tr><td>Loan Reference</td><td><strong>${loan.reference}</strong></td></tr>
      <tr><td>Receipt Ref</td><td>${repayment.reference}</td></tr>
      <tr><td>Remaining Balance</td><td><strong>${formatCurrency(repayment.balanceAfter)}</strong></td></tr>
      <tr><td>Date & Time</td><td>${formatDateTime(repayment.createdAt)}</td></tr>
    </table>
    ${fullyRepaid ? "<p>Your credit record has been updated. Thank you for your timely repayments!</p>" : ""}
  `, `Repayment of ${formatCurrency(repayment.amount)} received for ${loan.reference}.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 10. Interest Credit Notification
 *
 * @param {Object} member  — { firstName, email }
 * @param {Object} interest — { amount, period }
 * @param {Object} saving  — { accountNumber, balance }
 */
async function sendInterestCredit(member, interest, saving) {
  const subject = `Interest Credited — ${formatCurrency(interest.amount)}`;
  const html = layout(subject, `
    <h2>Interest Credited to Your Account 📈</h2>
    <p>Hello ${member.firstName}, interest has been calculated and credited to your savings account.</p>
    <div class="amount-box" style="border-color:#059669">
      <div class="label">Interest Earned</div>
      <div class="value" style="color:#059669">${formatCurrency(interest.amount)}</div>
    </div>
    <table class="info-table">
      <tr><td>Period</td><td><strong>${interest.period}</strong></td></tr>
      <tr><td>Account Number</td><td>${saving.accountNumber}</td></tr>
      <tr><td>New Balance</td><td><strong>${formatCurrency(saving.balance)}</strong></td></tr>
      <tr><td>Date</td><td>${formatDate(new Date())}</td></tr>
    </table>
    <p>Your savings are working for you. Keep it up!</p>
  `, `${formatCurrency(interest.amount)} interest credited for period ${interest.period}.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 11. Overdue Loan Reminder
 *
 * @param {Object} member — { firstName, email, phone }
 * @param {Object} loan   — { reference, balance, dueDate }
 * @param {number} daysOverdue
 */
async function sendOverdueReminder(member, loan, daysOverdue) {
  const subject = `⚠️ Overdue Loan Reminder — ${loan.reference}`;
  const html = layout(subject, `
    <h2>⚠️ Overdue Loan Reminder</h2>
    <p>Hello ${member.firstName},</p>
    <p>This is a reminder that your loan is <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>. 
       Please make a repayment as soon as possible to avoid further penalties.</p>
    <div class="amount-box" style="border-color:#dc2626">
      <div class="label">Outstanding Balance</div>
      <div class="value" style="color:#dc2626">${formatCurrency(loan.balance)}</div>
    </div>
    <table class="info-table">
      <tr><td>Loan Reference</td><td><strong>${loan.reference}</strong></td></tr>
      <tr><td>Due Date</td><td>${formatDate(loan.dueDate)}</td></tr>
      <tr><td>Days Overdue</td><td><span class="badge badge-red">${daysOverdue} days</span></td></tr>
    </table>
    <p>Please visit the SACCO office or contact your administrator to arrange a repayment immediately.</p>
  `, `Action required: your loan ${loan.reference} is ${daysOverdue} days overdue.`);

  return sendMail({ to: member.email, subject, html });
}

/**
 * 12. Scheduled Report Delivery
 * Sends a report file as an email attachment.
 *
 * @param {string[]} recipients   — array of email addresses
 * @param {string}   reportType   — e.g. "Financial Report"
 * @param {string}   period       — e.g. "May 2026"
 * @param {Buffer|string} content — file content
 * @param {string}   filename     — attachment filename
 * @param {string}   contentType  — MIME type
 */
async function sendScheduledReport(recipients, reportType, period, content, filename, contentType) {
  const subject = `${APP_NAME} — ${reportType} for ${period}`;
  const html = layout(subject, `
    <h2>${reportType}</h2>
    <p>Hello,</p>
    <p>Please find attached the <strong>${reportType}</strong> for the period <strong>${period}</strong>.</p>
    <table class="info-table">
      <tr><td>Report</td><td>${reportType}</td></tr>
      <tr><td>Period</td><td>${period}</td></tr>
      <tr><td>Generated On</td><td>${formatDateTime(new Date())}</td></tr>
      <tr><td>Format</td><td>${filename.split(".").pop().toUpperCase()}</td></tr>
    </table>
    <p>This report was automatically generated by ${APP_NAME}.</p>
  `, `Automated ${reportType} attached for ${period}.`);

  return sendMail({
    to:      recipients,
    subject,
    html,
    attachments: [{
      filename,
      content,
      contentType,
    }],
  });
}

// ─── Verify Connection ────────────────────────────────────────────────────────

/**
 * Verifies the SMTP connection on startup.
 * Call this in server.js after the DB connects.
 *
 * Usage:
 *   const { verifyMailer } = require("./utils/mailer");
 *   await verifyMailer();
 */
async function verifyMailer() {
  try {
    await transporter.verify();
    console.log("✅ Mailer connected successfully");
  } catch (err) {
    console.warn("⚠️  Mailer connection failed:", err.message);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  sendMail,
  verifyMailer,

  // Templates
  sendWelcome,
  sendPasswordReset,
  sendDepositConfirmation,
  sendWithdrawalConfirmation,
  sendLoanApplicationReceived,
  sendLoanApproval,
  sendLoanRejection,
  sendLoanDisbursement,
  sendRepaymentReceipt,
  sendInterestCredit,
  sendOverdueReminder,
  sendScheduledReport,
};


