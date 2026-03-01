import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';

// bs58 v6: the package exports a BaseConverter as `default`.
// Using require() here is intentional — it avoids TypeScript esModuleInterop
// ambiguity with the CJS declaration file (export default _default).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bs58 = require('bs58').default as { encode: (buf: Uint8Array) => string; decode: (str: string) => Uint8Array };

// Use environment variables or fallback to devnet
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');

export const getConnection = () => {
    return new Connection(RPC_ENDPOINT, 'confirmed');
};

/**
 * Gets the server keypair used to mint verification badges.
 * Reads `SOLANA_SERVER_PRIVATE_KEY` env var (base58 encoded).
 * This wallet must have SOL on Devnet to cover transaction fees.
 * Fund it at: https://faucet.solana.com
 */
export const getServerKeypair = (): Keypair => {
    const pkRaw = process.env.SOLANA_SERVER_PRIVATE_KEY;
    if (!pkRaw) {
        throw new Error(
            'Missing SOLANA_SERVER_PRIVATE_KEY. Set it in .env.local as a base58 encoded private key.'
        );
    }

    try {
        // bs58.decode returns a Uint8Array — exactly what Keypair.fromSecretKey expects
        const decoded = bs58.decode(pkRaw);
        return Keypair.fromSecretKey(decoded);
    } catch (e) {
        throw new Error(
            'Failed to decode SOLANA_SERVER_PRIVATE_KEY. Ensure it is a valid base58 string.'
        );
    }
};
