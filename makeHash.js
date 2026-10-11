const bcrypt = require("bcryptjs");

const PASSWORD = process.argv[2];
if (!PASSWORD) {
  console.log('Usage: node makeHash.js "Admin2026Secure"');
  process.exit(1);
}

(async function () {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const ok = await bcrypt.compare(PASSWORD, hash);
  console.log("Self-check (must be true):", ok);
  console.log("");
  console.log(
    `UPDATE users SET passwordHash='${hash}', loginAttempts=0, lockedUntil=NULL WHERE email='admin@savings-sacco.ug';`
  );
})();