pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/comparators.circom";

template DriverIdentity() {
    // Private inputs (stays in the browser, never transmitted)
    signal input licenseHash;
    signal input birthYear;
    signal input salt;

    // Public outputs (stored on Solana)
    signal output commitment;
    signal output ageValid;

    // --- Age Logic ---
    // Hardcoded to 2026 for hackathon; avoids adding a public input to the prover
    signal age;
    age <== 2026 - birthYear;

    // Driver must be at least 21 years old (matches prover.ts validation)
    component ageCheck = GreaterEqThan(8); // 8-bit handles ages 0-255
    ageCheck.in[0] <== age;
    ageCheck.in[1] <== 21;
    ageValid <== ageCheck.out;

    // --- Binding Commitment ---
    // Formula: licenseHash + (birthYear * 10^9) + salt
    // Must match computeCommitment() in lib/zk/prover.ts exactly.
    signal yearWeight;
    yearWeight <== birthYear * 1000000000;

    commitment <== licenseHash + yearWeight + salt;
}

component main = DriverIdentity();
