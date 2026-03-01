'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck, Loader2, ExternalLink, Wallet } from 'lucide-react';
import { Driver } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { updateDriverVerificationStatus } from '@/lib/firebaseDb';

interface VerificationPanelProps {
    driver: Driver;
    onVerificationSuccess: () => void;
}

/**
 * Renders the Solana verification section on the driver dashboard.
 * - Unverified: shows wallet address input + "Verify on Blockchain" button
 * - Verified: shows a green badge + Solana Explorer link
 */
export default function VerificationPanel({ driver, onVerificationSuccess }: VerificationPanelProps) {
    const { toast } = useToast();
    const [isVerifying, setIsVerifying] = useState(false);
    // Pre-fill from stored wallet if available
    const [walletAddress, setWalletAddress] = useState(driver.solanaWallet || '');
    const [walletError, setWalletError] = useState('');

    const validateWallet = (address: string): boolean => {
        // Solana addresses are base58 encoded, 32–44 characters
        if (!address || address.trim().length < 32 || address.trim().length > 44) {
            setWalletError('Enter a valid Solana wallet address (32–44 characters)');
            return false;
        }
        setWalletError('');
        return true;
    };

    const handleVerify = async () => {
        const trimmedWallet = walletAddress.trim();
        if (!validateWallet(trimmedWallet)) return;

        setIsVerifying(true);
        try {
            const response = await fetch('/api/solana/verify-driver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId: driver.id,
                    licenseNumber: driver.licenseNumber || 'PENDING_LICENSE',
                    driverName: driver.name,
                    vehicleType: driver.vehicleType,
                    // Use the driver's Phantom wallet; never fall back to System Program address
                    driverWalletAddress: trimmedWallet,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Persist badge data + wallet to Firebase
            await updateDriverVerificationStatus(driver.id, {
                mintAddress: data.mintAddress,
                txSignature: data.signature,
                explorerLink: data.explorerLink,
                verifiedAt: new Date().toISOString(),
            });

            toast({
                title: 'Blockchain Verification Complete! 🎉',
                description: 'Your soulbound Verification Badge has been minted on Solana Devnet.',
                duration: 5000,
            });

            onVerificationSuccess();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
            console.error('Verification error:', error);
            toast({
                title: 'Verification Failed',
                description: msg,
                variant: 'destructive',
            });
        } finally {
            setIsVerifying(false);
        }
    };

    // ── Already verified ──────────────────────────────────────────────────
    if (driver.verificationBadge) {
        return (
            <Card className="bg-emerald-950/20 border-emerald-500/30 shadow-lg">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-white">
                                Verified Driver
                            </CardTitle>
                            <CardDescription className="text-emerald-400/80">
                                Secured by Solana Token-2022
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <p className="text-sm text-slate-300">
                            Your documents are cryptographically hashed and verified on-chain.
                            Passengers see a <strong className="text-emerald-400">Solana Verified</strong> badge when they tap your marker.
                        </p>
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Mint Address</p>
                            <p className="font-mono text-xs text-slate-300 break-all">
                                {driver.verificationBadge.mintAddress}
                            </p>
                        </div>
                        <a
                            href={driver.verificationBadge.explorerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            View Token-2022 Badge on Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ── Not yet verified ──────────────────────────────────────────────────
    return (
        <Card className="bg-slate-900/60 border-slate-700/50 shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold text-white">
                            Get Blockchain Verified
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Mint a soulbound Token-2022 badge on Solana Devnet
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-400">
                    Mint a permanent Solana Verification Badge using your driver documents.
                    This proves your identity to passengers and cannot be transferred or faked.
                </p>

                {/* Wallet address input */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5" />
                        Your Phantom / Solana Wallet Address (Devnet)
                    </label>
                    <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => {
                            setWalletAddress(e.target.value);
                            if (walletError) setWalletError('');
                        }}
                        placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs"
                        className={`w-full bg-slate-800/70 border rounded-lg px-3 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${walletError
                                ? 'border-red-500/60 focus:ring-red-500/30'
                                : 'border-slate-700 focus:ring-blue-500/30'
                            }`}
                        disabled={isVerifying}
                    />
                    {walletError && (
                        <p className="text-xs text-red-400 mt-1">{walletError}</p>
                    )}
                    <p className="text-[11px] text-slate-600">
                        Paste your Phantom wallet address. Get test SOL at{' '}
                        <a
                            href="https://faucet.solana.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                        >
                            faucet.solana.com
                        </a>
                    </p>
                </div>

                <Button
                    onClick={handleVerify}
                    disabled={isVerifying || !walletAddress.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold"
                >
                    {isVerifying ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Minting on Solana Devnet...
                        </>
                    ) : (
                        <>
                            <Shield className="w-4 h-4 mr-2" />
                            Verify on Blockchain
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
