# Yatra — Updated Dev Prompts for Claude Code CLI
> These replace the older DEV_PROMPTS.md. Reflect the actual codebase at github.com/Since2024/Yatra (39 commits).
> Designed for Claude Code CLI — run each with: claude "$(cat PROMPT_X.md)"
> ZK Civic identity has NOT been built yet. These prompts account for that.

---

## Status of Old Prompts vs Current Codebase

| Old Prompt | Status | What happened |
|---|---|---|
| A — Security hardening | Partially done | Some fixes applied, but role cookie httpOnly and rate limiting still needed — verify before skipping |
| B — ZK verification fix | NOT DONE | Circuit still broken, verifier still demo-mode bypassed |
| C — Wallet ownership + passenger NFT | NOT DONE | NFTs still mint to server keypair |
| D — On-chain TRRL reputation | NOT DONE | No Anchor program exists |
| E — Fare escrow | NOT DONE | No escrow implementation |
| F — Cleanup / production readiness | NOT DONE | Dependencies not pruned, SMS still mocked |
| Auth flow fix | DONE (partially) | Sign-up/sign-in flow fixed in recent commits |
| Ride flow (state machine) | DONE (partially) | Trip request, driver accept panel, ETA, polyline added |
| 3D landing page | DONE | Three.js immersive landing page built |

## What still needs to happen (in priority order for Frontier deadline May 11)

1. **ZK identity — build it for real** (most differentiating, never done)
2. **Wallet connect + passenger receives NFT** (makes soulbound claim true)
3. **Security hardening pass** (judges will test; exposed keys = instant disqualification)
4. **TRRL on-chain reputation** (the protocol story)
5. **Fare escrow** (nice to have, not critical for demo)
6. **Cleanup** (last)

---

## PROMPT 1 — ZK Civic Identity (Build From Scratch)

```
You are a senior cryptographic engineer building Yatra's ZK identity verification system.
This is the FIRST TIME this is being built properly. The current codebase has:
- circuits/driverIdentity.circom — EXISTS but has a broken constraint (ageValid <== (age * 0) + 1)
- lib/zk/prover.ts — EXISTS and generates Groth16 proofs client-side via snarkjs. DO NOT CHANGE IT.
- lib/zk/verifier.ts — EXISTS but NEVER calls snarkjs.groth16.verify(). Returns {isValid: true, demoMode: true} always.
- app/api/auth/verify-driver/route.ts — EXISTS, calls verifier, writes verificationBadge to Firebase
- components/driver/VerificationPanel.tsx — EXISTS, collects license + birthYear + wallet address from driver
- lib/solana/tokenExtensions.ts — EXISTS, mints Token-2022 soulbound badge on Solana devnet

The ZK flow works end-to-end in terms of UI and data flow. The ONLY problems are:
1. The circuit's age constraint is always true (broken math)
2. The server-side verifier skips the Groth16 math entirely

DO NOT rewrite the UI. DO NOT change the prover. DO NOT change the badge minting.
Fix ONLY the circuit and the verifier.

TARGET FILES:
- circuits/driverIdentity.circom (FIX the age constraint)
- lib/zk/verifier.ts (WIRE snarkjs.groth16.verify)
- app/api/auth/verify-driver/route.ts (REMOVE demoMode bypass)

STEP 1 — Fix the circuit constraint

Open circuits/driverIdentity.circom. Find the line:
  ageValid <== (age * 0) + 1;

This always outputs 1 regardless of the driver's age. Replace it with a real comparator.

First, check if circomlib is installed:
  ls node_modules/circomlib/circuits/comparators.circom

If it exists, use it. If not, install it:
  npm install circomlib

Then replace the broken constraint with:

  include "node_modules/circomlib/circuits/comparators.circom";

  // Calculate age from birthYear
  // currentYear is a public input or hardcoded constant
  signal input currentYear;
  signal age;
  age <== currentYear - birthYear;

  // Age must be >= 18
  component ageCheck = GreaterEqThan(8); // 8-bit comparison (handles ages 0-255)
  ageCheck.in[0] <== age;
  ageCheck.in[1] <== 18;
  ageValid <== ageCheck.out;

IMPORTANT: Read the existing circuit FIRST to understand what signals already exist.
The circuit already has `birthYear` as an input and `ageValid` as an output.
You may need to add `currentYear` as a new public input signal.
If the prover (lib/zk/prover.ts) does not pass `currentYear`, you have two options:
  Option A: Hardcode currentYear in the circuit as 2026 (simpler, works for hackathon)
  Option B: Add currentYear as a public input and update the prover to pass it
Choose Option A unless the prover already passes currentYear.

After fixing, verify the circuit compiles:
  npx circom circuits/driverIdentity.circom --r1cs --wasm --sym -o circuits/

If circom is not installed globally:
  npm install -g circom
  OR use npx: npx circom ...

STEP 2 — Regenerate proving and verification keys

After the circuit compiles successfully:

  # Check if a powers-of-tau file exists
  ls circuits/*.ptau

  # If no ptau file exists, download one:
  wget -O circuits/pot12_final.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau

  # Generate the zkey
  npx snarkjs groth16 setup circuits/driverIdentity.r1cs circuits/pot12_final.ptau circuits/circuit_0000.zkey

  # Contribute to the ceremony (required for security)
  npx snarkjs zkey contribute circuits/circuit_0000.zkey circuits/circuit_final.zkey --name="Yatra v1" -v

  # Export verification key
  npx snarkjs zkey export verificationkey circuits/circuit_final.zkey verification_key.json

  # Copy the wasm to where the prover expects it
  # Check lib/zk/prover.ts for the exact path it loads the wasm from
  # It likely expects: public/circuits/driverIdentity_js/driverIdentity.wasm
  # Copy the generated wasm there:
  cp circuits/driverIdentity_js/driverIdentity.wasm public/circuits/driverIdentity_js/

STEP 3 — Wire the real verifier

Open lib/zk/verifier.ts.

Find the function that does verification. It currently:
- Reads publicSignals (probably publicSignals[0] for the commitment)
- Checks if ageValid signal equals '1'
- Returns { isValid: true, demoMode: true } without calling Groth16 verify

Replace the verification logic with:

  import * as snarkjs from 'snarkjs';
  import verificationKey from '../../verification_key.json';
  // OR wherever verification_key.json is located relative to this file

  export async function verifyDriverProof(
    proof: any,
    publicSignals: string[]
  ): Promise<{ isValid: boolean; commitment?: string; demoMode?: boolean }> {
    try {
      // Actually call Groth16 verification
      const isValid = await snarkjs.groth16.verify(
        verificationKey,
        publicSignals,
        proof
      );

      if (!isValid) {
        return { isValid: false };
      }

      // The Poseidon commitment is typically publicSignals[0]
      // ageValid is typically the last public signal
      const commitment = publicSignals[0];

      return {
        isValid: true,
        commitment,
        // NO demoMode flag — this is real verification
      };
    } catch (error) {
      console.error('[ZK Verifier] Groth16 verification failed:', error);
      return { isValid: false };
    }
  }

Remove ALL instances of:
- demoMode: true
- zkDemoMode: true
- Any code path that returns isValid: true without calling groth16.verify

STEP 4 — Update the API route

Open app/api/auth/verify-driver/route.ts (or app/api/solana/verify-driver/route.ts — check both paths).

Find where it calls the verifier function.
Ensure:
- If verifier returns isValid: false → return HTTP 400 with "ZK proof verification failed"
- If verifier returns isValid: true → proceed with badge minting and Firebase write
- Remove any demoMode field from the Firebase verificationBadge write
- Add the commitment string to the Firebase write:
    verificationBadge: {
      verified: true,
      commitment: result.commitment,
      verifiedAt: new Date().toISOString(),
      // NO demoMode field
    }

STEP 5 — Test

Test with a real proof:
1. Open the driver app as a driver
2. Go to the ZK verification panel
3. Enter a valid license number and a birth year that makes age >= 18 (e.g., 2000)
4. Submit
5. Expected: proof generates, server verifies, badge mints on Solana, Firebase updated

Test with an invalid age:
1. Enter a birth year that makes age < 18 (e.g., 2015)
2. Submit
3. Expected: the circuit should output ageValid=0, and the server should reject with HTTP 400

Test with a tampered proof:
1. Generate a valid proof via the driver panel
2. In the network tab, copy the proof JSON
3. Change one character in the proof
4. Replay the request to verify-driver with the tampered proof
5. Expected: HTTP 400 "ZK proof verification failed"

ACCEPTANCE CRITERIA:
- [ ] Circuit compiles with zero errors
- [ ] A driver with age >= 18 passes verification and gets a badge
- [ ] A driver with age < 18 fails verification
- [ ] A tampered proof fails verification
- [ ] grep -r "demoMode" lib/ app/ returns zero results
- [ ] grep -r "zkDemoMode" lib/ app/ returns zero results
- [ ] snarkjs.groth16.verify is called in lib/zk/verifier.ts
- [ ] npm run build succeeds
- [ ] The Solana badge minting still works after verification succeeds

DO NOT:
- Change lib/zk/prover.ts
- Change components/driver/VerificationPanel.tsx (or whatever the verification UI component is called)
- Change lib/solana/tokenExtensions.ts or the badge minting logic
- Change the Firebase auth flow
- Change any map, booking, or ride flow code
```

---

## PROMPT 2 — Security Hardening (Verify + Fix Remaining Gaps)

```
You are a senior security engineer doing a targeted security pass on Yatra.
Some security fixes may have been applied in recent commits. Your job is to
VERIFY each item first, and only fix what is still broken.

For each step below:
1. Check if it is already done (grep or read the file)
2. If already done, skip it and note "ALREADY FIXED"
3. If not done, implement the fix

TARGET FILES TO INSPECT:
- app/api/auth/sessionLogin/route.ts (or wherever session login is handled)
- app/api/auth/sessionLogout/route.ts
- app/api/seed/route.ts (if it exists)
- app/api/solana/mint-ticket/route.ts (or verify-driver)
- database.rules.json
- .gitignore
- middleware.ts

CHECKS TO VERIFY AND FIX:

CHECK 1 — Is .env tracked by git?
  Run: git ls-files .env
  If output is non-empty: run git rm --cached .env && echo ".env" >> .gitignore
  If output is empty: ALREADY FIXED

CHECK 2 — Dev-mode auth bypass
  Run: grep -n "dev-session" app/api/auth/ -r
  OR: grep -n "fake.*session\|dev.*token\|fallback.*cookie" app/api/ -r
  If found: remove the fallback path; throw HTTP 500 if Firebase Admin SDK is not configured
  If not found: ALREADY FIXED

CHECK 3 — Role cookie httpOnly
  Run: grep -n "httpOnly" app/api/auth/ -r
  Check if role cookie is set with httpOnly: true
  If httpOnly: false → change to httpOnly: true, secure: true, sameSite: 'lax'
  If httpOnly: true → ALREADY FIXED

CHECK 4 — Seed route protection
  If app/api/seed/ exists:
    grep -n "NODE_ENV\|production" app/api/seed/ -r
    If no production guard exists: add one at the top of the handler
  If app/api/seed/ does not exist: SKIP

CHECK 5 — Rate limiting on Solana transaction routes
  grep -n "ratelimit\|rate.limit\|rateLimi" app/api/ -r
  If no rate limiting exists on mint-ticket or verify-driver routes:
    Install @upstash/ratelimit OR implement a simple in-memory rate limiter:
    
    const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
    function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
      const now = Date.now();
      const entry = rateLimitMap.get(key);
      if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= maxRequests) return false;
      entry.count++;
      return true;
    }
    
    Add to the top of mint-ticket and verify-driver routes:
      const userId = /* extract from session */;
      if (!checkRateLimit(userId, 5, 3600000)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
  If rate limiting already exists: ALREADY FIXED

CHECK 6 — Firebase security rules
  Read database.rules.json.
  Check if:
  - trips node has participant-only read rules
  - locations node restricts reads to owner only
  - tripLocations node exists with participant-only access
  If any of these are missing, add them per the rules defined in the ride flow prompts.
  If all are present: ALREADY FIXED

CHECK 7 — Coordinate validation on API routes
  grep -n "isFinite\|isNaN\|z.number\|min.*-90\|max.*90" app/api/ -r
  If no coordinate validation exists on routes that accept lat/lng:
    Add Zod validation:
    const coordSchema = z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    });
  If validation exists: ALREADY FIXED

After all checks, output a summary table:
  | Check | Status |
  |---|---|
  | .env untracked | FIXED / ALREADY FIXED |
  | Dev-mode bypass | FIXED / ALREADY FIXED |
  | ... | ... |

ACCEPTANCE CRITERIA:
- [ ] Every check has a status (FIXED or ALREADY FIXED)
- [ ] npm run build succeeds after changes
- [ ] No regressions in auth, booking, or ride flow

DO NOT:
- Change any business logic
- Change the ride flow or state machine
- Change lib/zk/ (handled in Prompt 1)
- Change the landing page
- Remove features that are working
```

---

## PROMPT 3 — Passenger Wallet Connect + NFT to Passenger

```
You are implementing real wallet ownership for Yatra so passengers actually receive
their soulbound NFT trip receipts in their own Solana wallet.

CURRENT STATE (verify by reading the code):
- lib/solana/tripTicket.ts mints Token-2022 NonTransferable NFTs
- The NFT is currently minted to the SERVER keypair, not the passenger
- The passenger never holds the receipt
- @solana/wallet-adapter-react may or may not be installed (check package.json)

TARGET FILES:
- package.json (add wallet adapter if not present)
- app/layout.tsx (add WalletProvider — wrap ONLY, do not remove existing providers)
- app/passenger/ (add wallet connect UI somewhere in the passenger flow)
- app/api/auth/verify-wallet/route.ts (NEW — create this)
- app/api/solana/mint-ticket/route.ts (change recipient from server to passenger wallet)
- lib/solana/tripTicket.ts (accept recipient wallet address parameter)
- lib/firebaseDb.ts (store verified wallet address on user profile)

DO NOT TOUCH:
- Token-2022 extension setup (NonTransferable + MetadataPointer are correct)
- Driver flow or driver dashboard
- Auth flow (login/signup/profile)
- ZK identity code
- Map components
- Ride flow state machine
- The landing page
- The 3D scene components

STEP 1 — Check and install dependencies
  Run: grep "wallet-adapter" package.json
  If not found:
    npm install @solana/wallet-adapter-react @solana/wallet-adapter-wallets \
                @solana/wallet-adapter-base @solana/wallet-adapter-react-ui tweetnacl

STEP 2 — Add WalletProvider to app/layout.tsx
  Read app/layout.tsx first. It already has providers (AuthProvider, Firebase, etc.).
  Add the wallet adapter providers INSIDE the existing provider tree, NOT replacing anything.
  
  Wrap with:
    <ConnectionProvider endpoint={devnetEndpoint}>
      <WalletProvider wallets={[new PhantomWalletAdapter()]} autoConnect={false}>
        <WalletModalProvider>
          {/* existing children */}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  
  This must be a client component. If layout.tsx is a server component, create a separate
  components/providers/WalletProviderWrapper.tsx as a 'use client' wrapper and import it.
  
  IMPORTANT: Only load wallet adapter on pages that need it. Use dynamic import:
    const WalletProviders = dynamic(() => import('@/components/providers/WalletProviderWrapper'), { ssr: false });

STEP 3 — Create wallet verification API route
  Create app/api/auth/verify-wallet/route.ts with GET (issue nonce) and POST (verify signature).
  
  GET: generates a random nonce, stores it in Firebase at users/{uid}/walletNonce, returns it
  POST: receives { walletAddress, signature, nonce }, verifies signature with tweetnacl,
        stores verified wallet in Firebase at users/{uid}/walletAddress

  See the full implementation in the previous DEV_PROMPTS.md Prompt C, Step 2.

STEP 4 — Add wallet connect to passenger flow
  Find the passenger dashboard or booking flow.
  Add a "Connect Wallet" button that:
  - Uses useWallet() from @solana/wallet-adapter-react
  - On connect: fetches nonce from GET /api/auth/verify-wallet
  - Signs nonce with wallet
  - Submits to POST /api/auth/verify-wallet
  - Shows a green checkmark when verified
  
  Make it optional — passenger can still book without connecting a wallet.
  But warn them: "Connect a wallet to receive your trip receipt NFT"

STEP 5 — Update NFT minting to use passenger's wallet
  In the mint-ticket API route:
  - Read passenger's walletAddress from Firebase
  - If present: mint to that wallet
  - If absent: skip minting, log a warning, return { minted: false, reason: 'no_wallet' }
  - Do NOT fall back to server keypair
  
  In lib/solana/tripTicket.ts:
  - Add a `recipientAddress: string` parameter to the mint function
  - Use new PublicKey(recipientAddress) as the token account owner

STEP 6 — Idempotency guard
  Before minting, check if a receipt already exists for this trip:
    const existing = await adminDb.ref(`receipts/${tripId}`).get();
    if (existing.exists()) return existing.val().mintAddress;
  After successful mint:
    await adminDb.ref(`receipts/${tripId}`).set({ mintAddress, passengerId, timestamp });

ACCEPTANCE CRITERIA:
- [ ] Passenger can connect Phantom wallet on devnet
- [ ] Wallet address is saved to Firebase after signature verification
- [ ] After trip completion, NFT appears in the passenger's Phantom wallet
- [ ] Minting the same tripId twice returns the same mint address (idempotent)
- [ ] A passenger without a connected wallet can still complete trips (just no NFT)
- [ ] The NFT is NonTransferable (verify in Solana Explorer)
- [ ] npm run build succeeds
- [ ] No regressions in auth, ride flow, or driver dashboard

DO NOT:
- Change the Token-2022 extension configuration
- Add wallet requirements to the driver flow
- Change the ZK identity system
- Change the ride flow state machine
- Break existing booking or seat management
```

---

## PROMPT 4 — TRRL On-Chain Reputation (Anchor Program)

```
You are building the on-chain reputation layer for Yatra — the TRRL protocol.
This is a NEW Anchor program. Nothing like it exists in the codebase yet.
Yatra is a Next.js app, not an Anchor workspace. You need to create the
Anchor program as a SEPARATE project that the Next.js app calls via RPC.

IMPORTANT ARCHITECTURAL DECISION:
Yatra is deployed on Vercel. Anchor programs cannot be compiled or deployed from Vercel.
The Anchor program is a separate repo/directory that gets deployed to Solana devnet independently.
The Next.js app only interacts with it via @coral-xyz/anchor in the browser/server.

OPTION A (recommended for hackathon speed):
  Skip the full Anchor workspace. Instead, use Solana Web3.js directly to create PDAs
  and store reputation data. This avoids the Anchor build toolchain entirely.
  
  Create these files in the Yatra repo:
  - lib/solana/trrl.ts — all reputation read/write functions using @solana/web3.js
  - app/api/solana/complete-trip/route.ts — calls trrl.ts after trip completion

OPTION B (proper protocol, more work):
  Create a separate directory or repo for the Anchor program.
  Deploy it to devnet. Import the IDL into the Next.js app.

FOR THE HACKATHON, USE OPTION A.

Create lib/solana/trrl.ts with these functions:

  // Store driver reputation as account data in a PDA
  // PDA seeds: ["driver_rep", driverPubkeyBytes]
  
  interface DriverRepData {
    driverPubkey: string;
    totalTrips: number;
    completedTrips: number;
    avgRatingX100: number;     // 0-500 (represents 0.00-5.00)
    onTimeArrivals: number;
    zkVerified: boolean;
    zkCommitment: string;
    sosTriggered: number;
    verifiedAt: number;
  }
  
  interface PassengerRepData {
    passengerPubkey: string;
    totalBookings: number;
    completedTrips: number;
    noShows: number;
    loyaltyTier: 'new' | 'bronze' | 'silver' | 'gold';
  }
  
  // For the hackathon MVP, store reputation in Firebase RTDB under a
  // dedicated path and ALSO write a hash/summary to Solana via Memo program.
  // This is not full on-chain storage but it is verifiable and demonstrable.
  
  export async function updateDriverReputation(
    driverId: string,
    driverPubkey: string,
    update: Partial<DriverRepData>
  ): Promise<string> {
    // 1. Read current rep from Firebase
    const currentRep = await adminDb.ref(`reputation/drivers/${driverId}`).get();
    const rep = currentRep.val() || defaultDriverRep(driverPubkey);
    
    // 2. Apply update
    const newRep = { ...rep, ...update };
    
    // 3. Calculate score
    newRep.score = calculateDriverScore(newRep);
    
    // 4. Write to Firebase
    await adminDb.ref(`reputation/drivers/${driverId}`).set(newRep);
    
    // 5. Write hash to Solana via Memo program (creates verifiable on-chain record)
    const memo = JSON.stringify({
      type: 'YATRA_DRIVER_REP',
      driver: driverPubkey,
      score: newRep.score,
      trips: newRep.completedTrips,
      zkVerified: newRep.zkVerified,
      timestamp: Date.now(),
    });
    const txSignature = await sendMemoTransaction(memo);
    
    // 6. Store Solana tx signature
    await adminDb.ref(`reputation/drivers/${driverId}/lastSolanaTx`).set(txSignature);
    
    return txSignature;
  }
  
  export function calculateDriverScore(rep: DriverRepData): number {
    if (rep.totalTrips === 0) return 0;
    const completionRate = (rep.completedTrips / rep.totalTrips) * 400;
    const ratingScore = (rep.avgRatingX100 / 500) * 300;
    const punctuality = Math.min(rep.onTimeArrivals / Math.max(rep.completedTrips, 1), 1) * 200;
    const zkBonus = rep.zkVerified ? 100 : 0;
    const sosPenalty = rep.sosTriggered * 20;
    return Math.min(Math.round(completionRate + ratingScore + punctuality + zkBonus - sosPenalty), 1000);
  }
  
  export async function getDriverReputation(driverId: string): Promise<DriverRepData | null> {
    const snap = await adminDb.ref(`reputation/drivers/${driverId}`).get();
    return snap.val();
  }

Wire it into the trip completion flow:
  In whatever handler fires when a trip completes (handlePassengerDropoff or the
  complete-trip API route), add:
    await updateDriverReputation(driverId, driverPubkey, {
      totalTrips: rep.totalTrips + 1,
      completedTrips: rep.completedTrips + 1,
      onTimeArrivals: wasOnTime ? rep.onTimeArrivals + 1 : rep.onTimeArrivals,
    });

Add a driver reputation card to the passenger view:
  When a passenger selects a driver, show their score (if available):
    Score: 847/1000
    Trips: 234
    Rating: 4.85
    ZK Verified: ✓

ACCEPTANCE CRITERIA:
- [ ] After completing a trip, driver's reputation updates in Firebase
- [ ] A Solana Memo transaction is created with the reputation hash
- [ ] calculateDriverScore returns the correct value for sample data
- [ ] Passenger can see driver's reputation score before booking
- [ ] npm run build succeeds
- [ ] No regressions

DO NOT:
- Set up an Anchor workspace inside the Yatra repo
- Change the ride flow state machine
- Change the NFT minting logic
- Change auth or ZK code
```

---

## PROMPT 5 — Final Polish for Frontier Submission

```
You are doing the final production readiness pass before Yatra's Solana Frontier
Hackathon submission (deadline: May 11, 2026).

The previous prompts (ZK fix, security hardening, wallet connect, TRRL) are complete.
This prompt handles cleanup, SMS, dependencies, and submission preparation.

STEP 1 — Verify the build
  npm run build
  npx tsc --noEmit
  If either fails, fix the errors before doing anything else.

STEP 2 — Remove unnecessary dependencies
  Read package.json. Remove any of these if they exist as direct dependencies:
    crypto, bufferutil, utf-8-validate, web-worker, bigint-buffer
  Run: npm uninstall <package> for each that exists
  Then: npm run build to verify nothing breaks

STEP 3 — Replace mock SMS with SparrowSMS
  grep -r "console.log.*SMS\|console.log.*sms\|console.log.*notification" app/ lib/ hooks/
  For each mock SMS found, create and use lib/utils/sms.ts:
    export async function sendSMS(to: string, message: string): Promise<boolean> {
      if (!process.env.SPARROWSMS_TOKEN) {
        console.log('[SMS mock]', to, message);
        return true;
      }
      const res = await fetch('https://api.sparrowsms.com/v2/sms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: process.env.SPARROWSMS_TOKEN,
          from: 'Yatra',
          to, text: message,
        }),
      });
      return res.ok;
    }

STEP 4 — Add error boundaries
  In app/passenger/layout.tsx and app/driver/layout.tsx:
  Add a React error boundary that catches errors and shows a fallback UI
  instead of a white screen.

STEP 5 — Verify all demo-mode strings are removed
  Run these greps and fix anything found:
    grep -rn "demoMode" lib/ app/ components/
    grep -rn "zkDemoMode" lib/ app/ components/
    grep -rn "demo-session\|dev-session\|fake.*session" app/api/
  Remove or replace every instance.

STEP 6 — Update README.md
  Replace with the professional README we already have. If it's already
  been updated, verify it matches the current feature state.

STEP 7 — Final verification checklist
  Run each and confirm:
  - [ ] npm run build: zero errors
  - [ ] npx tsc --noEmit: zero type errors
  - [ ] .env is not tracked: git ls-files .env returns empty
  - [ ] ZK verifier works: valid proof → 200, tampered proof → 400
  - [ ] Passenger wallet connect works: NFT appears in Phantom on devnet
  - [ ] Driver reputation score updates after trip completion
  - [ ] Landing page loads: yatra-chi.vercel.app shows 3D scene
  - [ ] Driver can go online, accept a trip, complete it
  - [ ] Passenger can see nearby drivers, send request, see ETA

ACCEPTANCE CRITERIA:
All items in Step 7 must pass. If any fail, fix them before this prompt is "done."

DO NOT:
- Add new features
- Change working code
- Refactor for style (no time)
```

---

## Execution Order

```
Day 1-3:  PROMPT 1 (ZK identity — the claimed differentiator, currently fake)
Day 3-4:  PROMPT 2 (Security — verify and fix remaining gaps)
Day 4-7:  PROMPT 3 (Wallet connect + passenger receives NFT)
Day 7-9:  PROMPT 4 (TRRL reputation — makes it a protocol)
Day 10:   PROMPT 5 (Final polish + submission prep)
Day 11:   Submit to Frontier
```

The old Prompt E (Fare Escrow) is dropped from this sprint.
Reason: escrow requires an Anchor program, which requires a separate
build toolchain and deployment pipeline. The hackathon has 10 days left.
Escrow is a post-hackathon feature. The ZK + wallet + reputation combo
is enough to win a prize.
