import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Bus, Car, Bike, CreditCard, Banknote, Smartphone, CheckCircle, ArrowRight, ArrowLeft, Share2 } from 'lucide-react';
import { toast } from 'sonner';

const DESTINATIONS = [
    { id: 'kathmandu', name: 'Kathmandu', basePrice: 1200 },
    { id: 'pokhara', name: 'Pokhara', basePrice: 1000 },
    { id: 'palpa', name: 'Palpa', basePrice: 300 },
    { id: 'sunauli', name: 'Sunauli', basePrice: 150 },
    { id: 'custom', name: 'Other Location', basePrice: 0 }, // Dynamic or TBD
];

const VEHICLE_TYPES = [
    { id: 'bus', name: 'Bus', icon: <Bus className="w-6 h-6" />, multiplier: 1 },
    { id: 'taxi', name: 'Taxi', icon: <Car className="w-6 h-6" />, multiplier: 3 },
    { id: 'bike', name: 'Bike', icon: <Bike className="w-6 h-6" />, multiplier: 0.8 },
];

const PAYMENT_METHODS = [
    { id: 'esewa', name: 'eSewa', icon: <Smartphone className="w-5 h-5 text-green-500" /> },
    { id: 'khalti', name: 'Khalti', icon: <Smartphone className="w-5 h-5 text-purple-500" /> },
    { id: 'mobile_banking', name: 'Mobile Banking', icon: <CreditCard className="w-5 h-5 text-blue-500" /> },
    { id: 'cash', name: 'Cash on Board', icon: <Banknote className="w-5 h-5 text-emerald-500" /> },
];

export default function DetailedBookingModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [vehicleType, setVehicleType] = useState('bus');
    const [passengerName, setPassengerName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [passengers, setPassengers] = useState(1);
    const [destination, setDestination] = useState('');
    const [customDestination, setCustomDestination] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');

    const handleNext = () => {
        if (step === 1) {
            if (!passengerName || !phoneNumber) {
                toast.error('Please fill in your details');
                return;
            }
        }
        if (step === 2) {
            if (!destination) {
                toast.error('Please select a destination');
                return;
            }
            if (destination === 'custom' && !customDestination) {
                toast.error('Please enter your destination');
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const calculateTotal = () => {
        const dest = DESTINATIONS.find(d => d.id === destination);
        const vehicle = VEHICLE_TYPES.find(v => v.id === vehicleType);

        if (!dest || !vehicle) return 0;

        // Simple calculation logic
        const price = dest.basePrice * vehicle.multiplier * passengers;
        return Math.round(price);
    };

    const handleConfirm = async () => {
        if (!paymentMethod) {
            toast.error('Please select a payment method');
            return;
        }

        setLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In a real app, you would redirect to payment gateway here
        if (paymentMethod !== 'cash') {
            toast.success(`Redirecting to ${PAYMENT_METHODS.find(p => p.id === paymentMethod)?.name}...`);
            // window.location.href = payment_gateway_url;
        } else {
            toast.success('Booking Confirmed! Pay cash on board.');
        }

        setLoading(false);
        setLoading(false);
        setStep(4); // Show QR Code
    };

    const handleClose = () => {
        setIsOpen(false);
        setStep(1);
        // Reset form...
    };

    const handleShare = async () => {
        const shareText = `I'm traveling to ${destination} via DriveUp! Track my ride.`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My DriveUp Trip',
                    text: shareText,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            navigator.clipboard.writeText(shareText + ' ' + window.location.href);
            toast.success('Trip details copied to clipboard!');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="bg-slate-900/80 backdrop-blur border-slate-700 text-white hover:bg-slate-800"
                >
                    Pre-Book / Long Distance
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {step === 1 && 'Select Vehicle & Details'}
                        {step === 2 && 'Choose Destination'}
                        {step === 3 && 'Payment Method'}
                        {step === 4 && 'Booking Confirmed'}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {/* Step 1: Vehicle & Details */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            {/* Vehicle Selection */}
                            <div className="grid grid-cols-3 gap-3">
                                {VEHICLE_TYPES.map(v => (
                                    <div
                                        key={v.id}
                                        onClick={() => setVehicleType(v.id)}
                                        className={`cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${vehicleType === v.id
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                            }`}
                                    >
                                        <div className={vehicleType === v.id ? 'text-cyan-400' : 'text-slate-400'}>
                                            {v.icon}
                                        </div>
                                        <span className="text-xs font-bold">{v.name}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Personal Details */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input
                                        placeholder="Enter your name"
                                        value={passengerName}
                                        onChange={e => setPassengerName(e.target.value)}
                                        className="bg-slate-900 border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input
                                        placeholder="98XXXXXXXX"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value)}
                                        className="bg-slate-900 border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Passengers</Label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <Button
                                                key={num}
                                                type="button"
                                                variant={passengers === num ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setPassengers(num)}
                                                className={`flex-1 ${passengers === num ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-slate-900 border-slate-800'}`}
                                            >
                                                {num}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Destination */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="space-y-2">
                                <Label>Where are you going?</Label>
                                <Select value={destination} onValueChange={setDestination}>
                                    <SelectTrigger className="bg-slate-900 border-slate-800 h-12">
                                        <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        {DESTINATIONS.map(d => (
                                            <SelectItem key={d.id} value={d.id}>
                                                <div className="flex justify-between w-full min-w-[200px]">
                                                    <span>{d.name}</span>
                                                    {d.basePrice > 0 && <span className="text-slate-400">~Rs. {d.basePrice}</span>}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {destination === 'custom' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>Enter Location</Label>
                                    <Input
                                        placeholder="e.g. Bhairahawa Airport"
                                        value={customDestination}
                                        onChange={e => setCustomDestination(e.target.value)}
                                        className="bg-slate-900 border-slate-800"
                                    />
                                </div>
                            )}

                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase">Trip Summary</h4>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Vehicle</span>
                                    <span className="font-medium text-white capitalize">{vehicleType}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Passengers</span>
                                    <span className="font-medium text-white">{passengers}</span>
                                </div>
                                <div className="border-t border-slate-800 my-2 pt-2 flex justify-between items-center">
                                    <span className="font-bold text-white">Estimated Total</span>
                                    <span className="text-xl font-black text-emerald-400">
                                        Rs. {calculateTotal()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Payment */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="grid grid-cols-1 gap-3">
                                {PAYMENT_METHODS.map(method => (
                                    <div
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id)}
                                        className={`cursor-pointer rounded-xl border p-4 flex items-center gap-4 transition-all ${paymentMethod === method.id
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="p-2 rounded-full bg-slate-900 border border-slate-800">
                                            {method.icon}
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-bold block">{method.name}</span>
                                            <span className="text-xs text-slate-400">
                                                {method.id === 'cash' ? 'Pay directly to driver' : 'Secure digital payment'}
                                            </span>
                                        </div>
                                        {paymentMethod === method.id && (
                                            <CheckCircle className="w-5 h-5 text-cyan-500" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                <p className="text-sm text-emerald-400 font-medium">
                                    Total to Pay: <span className="font-bold text-lg">Rs. {calculateTotal()}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: QR Code */}
                    {step === 4 && (
                        <div className="flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-300 py-4">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Booking Confirmed!</h3>
                                <p className="text-slate-400 text-sm">Your ride is scheduled.</p>
                            </div>

                            <div className="bg-white p-4 rounded-2xl shadow-xl shadow-white/5">
                                {/* Mock Booking ID for QR */}
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BOOKING-${Date.now()}-${passengerName}`}
                                    alt="Booking QR Code"
                                    className="w-48 h-48"
                                />
                            </div>

                            <p className="text-center text-slate-500 text-xs max-w-[200px]">
                                Show this QR code to the driver when boarding the vehicle.
                            </p>

                            <Button variant="outline" onClick={handleShare} className="w-full border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                                <Share2 className="w-4 h-4 mr-2" /> Share Trip Details
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-row gap-2 sm:justify-between">
                    {step > 1 && (
                        <Button variant="ghost" onClick={handleBack} className="flex-1 sm:flex-none">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                    )}

                    {step < 3 && (
                        <Button onClick={handleNext} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white">
                            Next Step <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}

                    {step === 3 && (
                        <Button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg shadow-emerald-500/20"
                        >
                            {loading ? 'Processing...' : `Confirm & Pay Rs. ${calculateTotal()}`}
                        </Button>
                    )}

                    {step === 4 && (
                        <Button onClick={handleClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white">
                            Close & View Ticket
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
