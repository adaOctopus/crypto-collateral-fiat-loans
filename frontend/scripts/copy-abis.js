/**
 * Copy contract ABIs (abi only) from contracts/artifacts to frontend/app/lib/abis.
 * Run after: cd contracts && npx hardhat compile
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '../..');
const artifactsBase = path.join(repoRoot, 'contracts/artifacts/contracts');
const outDir = path.join(__dirname, '../app/lib/abis');

const files = [
  ['CollateralLock.sol/CollateralLock.json', 'CollateralLock.json'],
  ['VerificationNFT.sol/VerificationNFT.json', 'VerificationNFT.json'],
  ['LoanSecuritization.sol/LoanSecuritization.json', 'LoanSecuritization.json'],
];

if (!fs.existsSync(artifactsBase)) {
  console.error('Run "npx hardhat compile" in contracts/ first.');
  process.exit(1);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const [src, name] of files) {
  const srcPath = path.join(artifactsBase, src);
  if (!fs.existsSync(srcPath)) {
    console.error('Missing:', srcPath);
    process.exit(1);
  }
  const art = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  fs.writeFileSync(path.join(outDir, name), JSON.stringify({ abi: art.abi }));
}

console.log('ABIs copied to frontend/app/lib/abis');
