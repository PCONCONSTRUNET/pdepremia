const fs = require('fs');

const text = fs.readFileSync('src/pages/public/Rewards.tsx', 'utf8');

const returnStart = text.indexOf('  return (\n    <div className="max-w-6xl mx-auto px-4 py-8">');
if (returnStart === -1) {
  console.log("Could not find returnStart");
  process.exit(1);
}

// Recompensas section starts here
const recompensasStart = text.indexOf(") : activeTab === 'recompensas' ? (");
if (recompensasStart === -1) {
  console.log("Could not find recompensasStart");
  process.exit(1);
}

// Premios section starts here
const premiosStart = text.indexOf(") : activeTab === 'premios' ? (");
if (premiosStart === -1) {
  console.log("Could not find premiosStart");
  process.exit(1);
}

// Promo code modal starts here
const promoStart = text.indexOf('{/* Promo Code Modal */}');
if (promoStart === -1) {
  console.log("Could not find promoStart");
  process.exit(1);
}

// Withdraw modal starts here
const withdrawStart = text.indexOf('{/* Withdraw Modal */}');
if (withdrawStart === -1) {
  console.log("Could not find withdrawStart");
  process.exit(1);
}

const beforeReturn = text.substring(0, returnStart);

const jsxContent = text.substring(recompensasStart + ") : activeTab === 'recompensas' ? (".length, premiosStart).trim();
// jsxContent currently ends with `</motion.div>` which is correct!

const promoModal = text.substring(promoStart, withdrawStart).trim();
// promoModal currently ends with `)}` which is correct, but needs AnimatePresence wrapper

const newReturn = `  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-6">
        ${jsxContent}
      </div>
      <AnimatePresence>
        ${promoModal}
      </AnimatePresence>
    </div>
  )
}
`;

fs.writeFileSync('src/pages/public/Rewards.tsx', beforeReturn + newReturn, 'utf8');
console.log("Success");
