'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Passenger, Bus } from '@/lib/types';
import { User, MapPin, Clock, CheckCircle, XCircle, Navigation } from 'lucide-react';
import { haversineDistance } from '@/lib/utils/geofencing';

interface PassengerListProps {
	passengers: Passenger[];
	selectedBus?: Bus | null;
	onPassengerPickup: (passengerId: string) => void;
	onPassengerDropoff: (passengerId: string) => void;
}

export default function PassengerList({
	passengers,
	selectedBus,
	onPassengerPickup,
	onPassengerDropoff,
}: PassengerListProps) {
	// Calculate distance to each passenger and sort by proximity
	const passengersWithDistance = passengers.map(p => {
		if (!selectedBus || !selectedBus.currentLocation) return { ...p, distanceToPickup: null };

		const distanceMeters = haversineDistance(
			selectedBus.currentLocation.lat,
			selectedBus.currentLocation.lng,
			p.pickupLocation.lat,
			p.pickupLocation.lng
		);

		return { ...p, distanceToPickup: distanceMeters };
	});

	// Sort by distance (nearest first), then by status
	const sortedPassengers = [...passengersWithDistance].sort((a, b) => {
		// Waiting passengers first
		if (a.status === 'waiting' && b.status !== 'waiting') return -1;
		if (a.status !== 'waiting' && b.status === 'waiting') return 1;

		// Then by distance
		const distA = a.distanceToPickup ?? Infinity;
		const distB = b.distanceToPickup ?? Infinity;
		return distA - distB;
	});

	const waitingPassengers = sortedPassengers.filter(p => p.status === 'waiting');
	const pickedPassengers = sortedPassengers.filter(p => p.status === 'picked');
	const droppedPassengers = sortedPassengers.filter(p => p.status === 'dropped');

	const getStatusBadge = (status: Passenger['status']) => {
		switch (status) {
			case 'waiting':
				return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Waiting</Badge>;
			case 'picked':
				return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">On Board</Badge>;
			case 'dropped':
				return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Dropped</Badge>;
		}
	};

	const getAvatarFallback = (name: string) => {
		return name.split(' ').map(n => n[0]).join('').toUpperCase();
	};

	return (
		<Card className="bg-slate-900/60 backdrop-blur-xl border-slate-700/50 shadow-xl h-full flex flex-col">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
							<User className="w-5 h-5 text-purple-400" />
						</div>
						<div>
							<CardTitle className="text-lg font-bold text-white">Passenger Manifest</CardTitle>
							<CardDescription className="text-slate-400">Pickup & Dropoff Queue</CardDescription>
						</div>
					</div>
					<Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">
						{passengers.length} Total
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
				{/* Stats */}
				<div className="grid grid-cols-3 gap-3">
					<div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-xl text-center">
						<p className="text-2xl font-bold text-yellow-400">{waitingPassengers.length}</p>
						<p className="text-[10px] uppercase tracking-wider text-yellow-300/70 font-semibold">Waiting</p>
					</div>
					<div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl text-center">
						<p className="text-2xl font-bold text-blue-400">{pickedPassengers.length}</p>
						<p className="text-[10px] uppercase tracking-wider text-blue-300/70 font-semibold">On Board</p>
					</div>
					<div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-center">
						<p className="text-2xl font-bold text-emerald-400">{droppedPassengers.length}</p>
						<p className="text-[10px] uppercase tracking-wider text-emerald-300/70 font-semibold">Dropped</p>
					</div>
				</div>

				{/* Passenger List */}
				<div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
					{sortedPassengers.map((passenger) => (
						<div
							key={passenger.id}
							className={`group flex flex-col gap-3 p-4 rounded-xl border transition-all duration-300 ${passenger.status === 'waiting'
								? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-yellow-500/30'
								: 'bg-slate-900/30 border-slate-800/50 opacity-75 hover:opacity-100'
								}`}
						>
							<div className="flex items-start gap-4">
								<Avatar className="w-10 h-10 border-2 border-slate-700">
									<AvatarFallback className="bg-slate-800 text-slate-300 font-bold">
										{getAvatarFallback(passenger.name)}
									</AvatarFallback>
								</Avatar>

								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between mb-1">
										<p className="font-bold text-white truncate text-lg">{passenger.name}</p>
										{getStatusBadge(passenger.status)}
									</div>

									<div className="flex items-center gap-4 flex-wrap text-sm">
										{/* Distance to pickup */}
										{passenger.distanceToPickup !== null && passenger.distanceToPickup !== undefined && (
											<div className="flex items-center gap-1.5 bg-slate-950/50 px-2 py-1 rounded-md border border-slate-800">
												<Navigation className={`w-3 h-3 ${passenger.distanceToPickup < 100
													? 'text-emerald-400'
													: passenger.distanceToPickup < 500
														? 'text-yellow-400'
														: 'text-blue-400'
													}`} />
												<span className={`font-mono font-medium ${passenger.distanceToPickup < 100
													? 'text-emerald-400'
													: passenger.distanceToPickup < 500
														? 'text-yellow-400'
														: 'text-blue-400'
													}`}>
													{passenger.distanceToPickup < 1000
														? `${Math.round(passenger.distanceToPickup)}m`
														: `${(passenger.distanceToPickup / 1000).toFixed(1)}km`}
												</span>
											</div>
										)}
										<div className="flex items-center gap-1.5 text-slate-400">
											<Clock className="w-3 h-3" />
											<span>
												{new Date(passenger.bookingTime).toLocaleTimeString([], {
													hour: '2-digit',
													minute: '2-digit'
												})}
											</span>
										</div>
									</div>
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex gap-2 mt-1">
								{passenger.status === 'waiting' && (
									<Button
										size="sm"
										className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
										onClick={() => onPassengerPickup(passenger.id)}
									>
										<CheckCircle className="w-4 h-4 mr-2" />
										Confirm Pickup
									</Button>
								)}
								{passenger.status === 'picked' && (
									<Button
										size="sm"
										variant="outline"
										className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
										onClick={() => onPassengerDropoff(passenger.id)}
									>
										<XCircle className="w-4 h-4 mr-2" />
										Confirm Dropoff
									</Button>
								)}
							</div>
						</div>
					))}

					{/* Empty State */}
					{passengers.length === 0 && (
						<div className="text-center py-12 px-4 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
							<div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
								<User className="w-8 h-8 text-slate-600" />
							</div>
							<p className="text-slate-400 font-medium">No passengers yet</p>
							<p className="text-sm text-slate-500 mt-1">New bookings will appear here instantly</p>
						</div>
					)}
				</div>

				{/* Summary */}
				<div className="pt-4 border-t border-slate-800">
					<div className="flex items-center justify-between text-sm mb-2">
						<span className="text-slate-400">Total Passengers Today</span>
						<span className="font-bold text-white">{passengers.length}</span>
					</div>
					<div className="flex items-center justify-between text-sm bg-slate-950/50 p-3 rounded-lg border border-slate-800">
						<span className="text-slate-400">Estimated Revenue</span>
						<span className="font-mono font-bold text-emerald-400">रु {passengers.length * 75}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
