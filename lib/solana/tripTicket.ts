import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    createInitializeNonTransferableMintInstruction,
    createMintToInstruction,
    getMintLen,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createInitializeMetadataPointerInstruction,
    TYPE_SIZE,
    LENGTH_SIZE
} from '@solana/spl-token';
import { pack, createInitializeInstruction, createUpdateFieldInstruction } from '@solana/spl-token-metadata';

export interface TripTicketMetadata {
    tripId: string;
    route: string;
    fare: string;
    driverName: string;
    tripDate: string;
}

/**
 * Creates a Soulbound (NonTransferable) Token-2022 Trip Ticket NFT with embedded Metadata.
 */
export async function mintTripTicketNFT(
    connection: Connection,
    serverKeypair: Keypair,
    passengerWalletAddress: string,
    metadataDetails: TripTicketMetadata
) {
    console.log("🛠️ [Trip Ticket] Initializing Ticket Mint...");

    const passengerPubkey = new PublicKey(passengerWalletAddress);
    const mintKeypair = Keypair.generate();
    const mintPubkey = mintKeypair.publicKey;
    const decimals = 0; // NFTs have 0 decimals

    // 1. Balance Check
    const balance = await connection.getBalance(serverKeypair.publicKey);
    console.log(`💰 [Trip Ticket] Server balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 0.02 * LAMPORTS_PER_SOL) {
        throw new Error("Server wallet has insufficient SOL for Token-2022 rent.");
    }

    // --- On-Chain Metadata Setup ---
    // The Token-2022 Metadata extension allows us to store arbitrary key-value pairs
    // directly on the Mint account itself, rather than pointing to an external Arweave/IPFS JSON URI.

    // Core SPL Token Metadata format
    // Core SPL Token Metadata format
    const additionalMetadata: [string, string][] = [
        ['TripID', metadataDetails.tripId],
        ['Route', metadataDetails.route],
        ['Fare', metadataDetails.fare],
        ['Driver', metadataDetails.driverName],
        ['Date', metadataDetails.tripDate],
        ['Type', 'Soulbound Receipt']
    ];

    const metaData = {
        updateAuthority: serverKeypair.publicKey,
        mint: mintPubkey,
        name: "Yatra Trip Ticket",
        symbol: "YATRA",
        uri: "", // No external URI needed, we store everything on-chain
        additionalMetadata,
    };

    // Calculate space needed for the extensions and metadata
    const extensions = [ExtensionType.NonTransferable, ExtensionType.MetadataPointer];
    const mintLen = getMintLen(extensions);

    // Pack metadata to calculate exact byte length
    const metadataExtensionLen = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    const totalMintLen = mintLen + metadataExtensionLen;

    // Calculate rent for the exact space
    const lamports = await connection.getMinimumBalanceForRentExemption(totalMintLen);

    const transaction = new Transaction();

    // 2. Instructions Setup

    // (a) Priority fee - Helps transaction get picked up faster
    transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 })
    );

    // (b) Create Mint Account with exact space needed
    transaction.add(
        SystemProgram.createAccount({
            fromPubkey: serverKeypair.publicKey,
            newAccountPubkey: mintPubkey,
            space: totalMintLen,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        })
    );

    // (c) Initialize Metadata Pointer Extension
    // This must come before InitializeMint
    transaction.add(
        createInitializeMetadataPointerInstruction(
            mintPubkey,
            serverKeypair.publicKey,
            mintPubkey, // The mint account itself holds the metadata
            TOKEN_2022_PROGRAM_ID
        )
    );

    // (d) Soulbound extension (Non-transferable)
    // This must come before InitializeMint
    transaction.add(
        createInitializeNonTransferableMintInstruction(mintPubkey, TOKEN_2022_PROGRAM_ID)
    );

    // (e) Initialize Mint
    transaction.add(
        createInitializeMintInstruction(
            mintPubkey,
            decimals,
            serverKeypair.publicKey,
            null,
            TOKEN_2022_PROGRAM_ID
        )
    );

    // (f) Initialize Token Metadata Custom Data
    transaction.add(
        createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mintPubkey,
            updateAuthority: serverKeypair.publicKey,
            mint: mintPubkey,
            mintAuthority: serverKeypair.publicKey,
            name: metaData.name,
            symbol: metaData.symbol,
            uri: metaData.uri,
        })
    );

    // (g) Add custom fields to Metadata
    metaData.additionalMetadata.forEach(([field, value]) => {
        transaction.add(
            createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mintPubkey,
                updateAuthority: serverKeypair.publicKey,
                field: field,
                value: value,
            })
        );
    });


    // (h) Associated Token Account (ATA) & Mint 1 unit
    const passengerAta = getAssociatedTokenAddressSync(
        mintPubkey,
        passengerPubkey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    transaction.add(
        createAssociatedTokenAccountInstruction(
            serverKeypair.publicKey,
            passengerAta,
            passengerPubkey,
            mintPubkey,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        createMintToInstruction(
            mintPubkey,
            passengerAta,
            serverKeypair.publicKey,
            1,
            [],
            TOKEN_2022_PROGRAM_ID
        )
    );

    // 3. Sign & Send Transaction
    try {
        console.log("📨 [Trip Ticket] Sending transaction to Devnet...");

        // Using 'processed' commitment here makes the UI update MUCH faster
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('processed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = serverKeypair.publicKey;

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [serverKeypair, mintKeypair],
            {
                commitment: 'processed',
                skipPreflight: false,
                preflightCommitment: 'processed'
            }
        );

        console.log(`✅ [Trip Ticket] Success! Mint: ${mintPubkey.toBase58()}`);

        return {
            mintAddress: mintPubkey.toBase58(),
            signature,
            explorerLink: `https://explorer.solana.com/address/${mintPubkey.toBase58()}?cluster=devnet`,
        };
    } catch (e: any) {
        console.error('❌ [Trip Ticket] Transaction Failed:', e.message);

        if (e.message.includes("0x0")) {
            throw new Error("Transaction simulation failed. Check if wallet setup is correct.");
        }

        throw new Error(`Solana Transaction Failed: ${e.message}`);
    }
}
