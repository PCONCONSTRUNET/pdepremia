const fs = require('fs');
const { execSync } = require('child_process');

const text = execSync('git show HEAD:src/pages/public/Profile.tsx').toString('utf8');

const startMarker = "          ) : activeTab === 'recompensas' ? (";
const startIdx = text.indexOf(startMarker);
const endMarker = "          ) : activeTab === 'premios' ? (";
const endIdx = text.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error('Markers not found');
    process.exit(1);
}

const jsxContent = text.substring(startIdx + startMarker.length, endIdx).trim();

const promoMarker = '{/* Promo Code Modal */}';
const promoIdx = text.indexOf(promoMarker);
const withdrawMarker = '{/* Withdraw Modal */}';
const withdrawIdx = text.indexOf(withdrawMarker);
const promoModal = text.substring(promoIdx, withdrawIdx).trim();

const newReturn = `  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        ${jsxContent}
      </div>
      <AnimatePresence>
        ${promoModal}
      </AnimatePresence>
    </div>
  )
}`;

const returnStart = text.lastIndexOf('  return (');

let newFileContent = text.substring(0, returnStart) + newReturn;
newFileContent = newFileContent.replace('export default function Profile()', 'export default function Rewards()');

fs.writeFileSync('src/pages/public/Rewards.tsx', newFileContent, 'utf8');
console.log('Success');
