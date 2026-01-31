# Collateral Crypto — Architecture, Scalability & Security

This document summarizes how the app is structured, how to make it **scalable**, and how to keep it **secure** (backend and smart contracts). Use it for demos and planning.

---

## 1. How the app is structured (high level)

- **Frontend (Next.js 15)**: User connects wallet (e.g. MetaMask), locks collateral, pays loans, withdraws. All chain writes go through the user’s wallet; the frontend only reads from the backend for positions/payments and from the chain for contract state.
- **Backend (Express + MongoDB)**: Stores positions, interest payment schedule, payment records, users, securitized loans. Validates unlock eligibility and records payments. Does **not** hold private keys or sign transactions.
- **Smart contracts (Ethereum / Sepolia)**: **CollateralLock** holds collateral and mints positions; **VerificationNFT** mints proof-of-collateral NFTs; **LoanSecuritization** mints loan/fraction tokens. Critical money flows and collateral rules live on-chain.

---

## 2. Making the app scalable

### Backend

- **Stateless API**: Keep the Express app stateless so you can run multiple instances behind a load balancer. No in-memory session store; use JWT or similar if you add auth.
- **Database**: Use MongoDB Atlas (or similar) with read replicas for heavy read traffic (positions, payment history). Add indexes on `userId`, `positionId`, `dueDate`, `isPaid` where you query (you already have compound indexes on payments).
- **Background jobs**: Move “check late payments” and any future cron work to a dedicated worker (e.g. Bull + Redis, or a separate small Node service). Don’t run long intervals inside the main API process so the API can scale independently.
- **Rate limiting**: Add rate limiting (e.g. `express-rate-limit`) per IP or per wallet so one user can’t overwhelm the API.
- **Caching**: Cache “next unpaid payment” and position lists per user with short TTL (e.g. Redis) to reduce DB load for repeated Pay Loan / Withdraw views.
- **Env and ops**: Use `NODE_ENV=production`, connection pooling for MongoDB, and a process manager (e.g. PM2) or container orchestration (e.g. Kubernetes) when you need horizontal scaling.

### Contracts

- **Design is already scalable**: Positions are in a mapping; adding users doesn’t require contract changes. No unbounded loops over all users.
- **Gas**: Batch operations (if you ever add them) should process limited-size chunks to avoid hitting block gas limits. Current design (single-position lock/unlock/liquidate) is gas-friendly.
- **Upgrades**: For future changes, consider a proxy pattern (e.g. UUPS/Transparent) so you can fix bugs or add features without migrating state; plan this before mainnet.

### Frontend

- **Static and CDN**: Build with `next build` and serve with `next start` or a platform (Vercel/Netlify). Put assets behind a CDN.
- **RPC**: Use a dedicated RPC provider (e.g. Alchemy/Infura) with rate limits and fallbacks so the frontend doesn’t depend on a single endpoint.
- **No secrets**: Keep all keys and secrets in env on the server; the frontend only needs public RPC URL and contract addresses.

---

## 3. Keeping the app secure

### Backend

- **Input validation**: Validate and sanitize every input (you already use Zod). Strictly validate `walletAddress` (format, length), `positionId` (integer, in range), and `amount` (number, positive, within expected bounds) so no injection or bad data reaches the DB or business logic.
- **Auth and identity**: Today the API trusts the client to send `walletAddress`. For production, tie requests to the wallet: e.g. require a signed message (SIWE) or JWT issued after wallet signature so only the owner of that address can record payments or change their data.
- **Principle of least privilege**: MongoDB user and Node process should have the minimum roles and permissions needed (read/write only to the app DB, no admin).
- **Secrets**: Store `MONGODB_URI`, API keys, and any signing keys in env vars or a secret manager; never commit them. Use different credentials per environment (dev/staging/prod).
- **HTTPS and headers**: Serve the API over HTTPS only. Add security headers (e.g. Helmet): `Content-Security-Policy`, `X-Content-Type-Options`, etc.
- **CORS**: Restrict `cors()` to the exact frontend origin(s) in production; avoid `*`.
- **Dependencies**: Run `npm audit` and fix critical/high issues; update dependencies regularly.

### Smart contracts

- **Access control**: Critical functions are restricted:
  - **CollateralLock**: `setSupportedToken`, `setTokenPrice`, `closePosition` are `onlyOwner`; `unlockCollateral` and `liquidatePosition` enforce `msg.sender` or liquidation rules. Keep the owner key in a secure wallet or multisig.
  - **VerificationNFT**: `setMinter`, `updateCreditScore` are `onlyOwner`; only the minter (CollateralLock) can mint. Preserves integrity of collateral proof.
  - **LoanSecuritization**: `withdraw` is `onlyOwner`; buying fractions and securitizing have explicit checks. Prevents unauthorized withdrawals.
- **Reentrancy**: All state-changing external calls are behind OpenZeppelin’s `ReentrancyGuard` (e.g. lock, unlock, liquidate). Maintain this pattern for any new functions that call external contracts or transfer tokens.
- **Oracle / price feed**: `tokenPrices` is set by the owner. For production, use a decentralized oracle (e.g. Chainlink) so price manipulation doesn’t break collateral ratios or liquidations.
- **Token checks**: `onlySupportedToken` and `_isERC20Like` reduce the risk of malicious or non-standard tokens. Keep a small allowlist of collateral tokens.
- **Integer overflow**: Solidity 0.8+ has built-in overflow checks; no extra libraries needed, but avoid unchecked blocks unless you have a clear reason.
- **Audits and testing**: Add unit and integration tests (e.g. Foundry/Hardhat) for lock, unlock, liquidation, and edge cases. Before mainnet, get a professional audit and a bug bounty program.

---

## 4. Summary table

| Area            | Scalability focus                          | Security focus                                      |
|-----------------|--------------------------------------------|-----------------------------------------------------|
| Backend API     | Stateless, horizontal scaling, DB replicas, rate limit, cache | Validation, auth (e.g. SIWE/JWT), least privilege, secrets, HTTPS, CORS |
| Backend DB      | Indexes, replicas, connection pooling      | Least-privilege user, no sensitive data in logs     |
| Contracts       | No unbounded loops, gas-aware design       | Owner/minter access, ReentrancyGuard, oracle, audits |
| Frontend        | CDN, robust RPC, env-based config          | No secrets in client, validate before sending        |

---

## 5. Architecture diagram

See **`docs/architecture-diagram.png`** for the top-level overview. Two additional diagrams in the same style:

- **`docs/backend-architecture.png`** — Backend (Express): routes → controllers → services → models → MongoDB, plus config and middleware.
- **`docs/contracts-architecture.png`** — Smart contracts: CollateralLock (mints) → VerificationNFT; LoanSecuritization checks VerificationNFT ownership; user flows for lock/unlock and securitize.

Top-level diagram shows:

- User → Frontend (Next.js) → Backend (Express) and Ethereum (Sepolia)
- MongoDB (positions, payments, users, securitized loans)
- Contracts: CollateralLock, VerificationNFT, LoanSecuritization
- Main flows: Lock collateral, Pay loan, Withdraw collateral

Use the diagram in demos to explain the three layers (frontend, backend, chain) and where data and money live.
