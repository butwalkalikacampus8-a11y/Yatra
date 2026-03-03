'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAdminDb } from '@/lib/firebaseAdmin'; // Wait, client component can't use admin DB.
import { useToast } from '@/components/ui/use-toast';
import { CreditCard, Save, AlertTriangle } from 'lucide-react';
import { getDatabase, ref, update } from 'firebase/database';
import { getFirebaseApp } from '@/lib/firebase';

export default function WalletSettings() {
    const { currentUser, userData } = useAuth();
    const { toast } = useToast();
    const [wallet, setWallet] = useState(userData?.solanaWallet || '');
    const [isSaving, setIsSaving] = useState(false);

    // If no wallet is linked, show an alert block
    const isWalletMissing = !userData?.solanaWallet;

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        try {
            const app = getFirebaseApp();
            const rtdb = getDatabase(app);
            const userRef = ref(rtdb, `users/${currentUser.uid}`);

            await update(userRef, {
                solanaWallet: wallet.trim() || null,
            });

            toast({
                title: 'Wallet updated!',
                description: 'Your Solana wallet address has been saved.',
            });
        } catch (error) {
            console.error('Error saving wallet:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to save wallet. Please try again.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4 mb-6">
            {isWalletMissing && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-yellow-500">Missing Solana Wallet</h4>
                        <p className="text-xs text-yellow-400/80 mt-1">
                            Link your wallet below to receive Trip Ticket NFTs for your completed rides.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-3">
                <Label htmlFor="dashboard-wallet" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    Solana Wallet Address
                </Label>
                <div className="flex gap-2">
                    <Input
                        id="dashboard-wallet"
                        value={wallet}
                        onChange={(e) => setWallet(e.target.value)}
                        placeholder="e.g., 9xQe... (Phantom Wallet)"
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                    />
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || wallet === userData?.solanaWallet}
                        className="bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                    >
                        {isSaving ? 'Saving...' : <Save className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
