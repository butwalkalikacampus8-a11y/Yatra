'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bus } from '@/lib/types';
import { VEHICLE_TYPE_MAP } from '@/lib/constants';
import { BusFront, MapPin, Users, Battery, Wifi, Settings, Plus, Minus } from 'lucide-react';

interface DriverPanelProps {
	bus: Bus;
	onLocationToggle: (enabled: boolean) => void;
	locationEnabled: boolean;
	onAddOfflinePassenger?: () => void;
	onRemoveOfflinePassenger?: () => void;
}

export default function DriverPanel({
	bus,
	onLocationToggle,
	locationEnabled,
	onAddOfflinePassenger,
	onRemoveOfflinePassenger
}: DriverPanelProps) {
	const batteryLevel = 78;
	const connectionStrength = 'Good';
	const vehicleType = VEHICLE_TYPE_MAP[bus.vehicleType];

	return (
		<Card className="bg-slate-900/60 backdrop-blur-xl border-slate-700/50 shadow-xl">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
							<BusFront className="w-5 h-5 text-blue-400" />
						</div>
						<div>
							<CardTitle className="text-lg font-bold text-white">Bus Details</CardTitle>
							<CardDescription className="text-slate-400">Vehicle & Status</CardDescription>
						</div>
					</div>
					<Badge
						variant="outline"
						className={`${bus.isActive
							? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
							: 'bg-slate-800 text-slate-400 border-slate-700'}`}
					>
						{bus.isActive ? 'Active' : 'Inactive'}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Bus Info */}
				<div className="bg-slate-950/50 rounded-xl p-4 space-y-3 border border-slate-800">
					<div className="flex items-center justify-between">
						<span className="text-sm text-slate-400">Vehicle Number</span>
						<span className="font-mono text-white font-medium bg-slate-800 px-2 py-1 rounded">
							{bus.busNumber}
						</span>
					</div>

					{vehicleType && (
						<div className="flex items-center justify-between">
							<span className="text-sm text-slate-400">Type</span>
							<Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 flex items-center gap-1">
								<span>{vehicleType.icon}</span>
								<span>{vehicleType.name}</span>
							</Badge>
						</div>
					)}

					<div className="flex items-center justify-between">
						<span className="text-sm text-slate-400">Route</span>
						<span className="text-white font-medium">{bus.route}</span>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm text-slate-400">Driver</span>
						<div className="flex items-center gap-2">
							{bus.driverImage ? (
								<div className="w-6 h-6 rounded-full overflow-hidden border border-slate-600">
									<img src={bus.driverImage} alt="Driver" className="w-full h-full object-cover" />
								</div>
							) : (
								<div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
									{bus.driverName.charAt(0).toUpperCase()}
								</div>
							)}
							<span className="text-white text-sm">{bus.driverName}</span>
						</div>
					</div>
				</div>

				{/* Seat Management */}
				<div className="space-y-3">
					<h4 className="font-medium text-sm text-slate-300 flex items-center gap-2">
						<Users className="w-4 h-4 text-purple-400" />
						Seat Management
					</h4>
					<div className="grid grid-cols-3 gap-3">
						<div className="bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/20">
							<div className="text-xl font-bold text-blue-400 mb-1">
								{bus.onlineBookedSeats || 0}
							</div>
							<div className="text-[10px] uppercase tracking-wider text-blue-300/70 font-semibold">Online</div>
						</div>
						<div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20">
							<div className="text-xl font-bold text-yellow-400 mb-1">
								{bus.offlineOccupiedSeats || 0}
							</div>
							<div className="text-[10px] uppercase tracking-wider text-yellow-300/70 font-semibold">Offline</div>
						</div>
						<div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
							<div className="text-xl font-bold text-emerald-400 mb-1">
								{bus.availableSeats !== undefined ? bus.availableSeats : bus.capacity}
							</div>
							<div className="text-[10px] uppercase tracking-wider text-emerald-300/70 font-semibold">Free</div>
						</div>
					</div>

					<div className="flex gap-3">
						<Button
							variant="outline"
							size="sm"
							className="flex-1 bg-slate-800/50 border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
							onClick={onAddOfflinePassenger}
							disabled={!onAddOfflinePassenger}
						>
							<Plus className="w-4 h-4 mr-2" />
							Add Offline
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1 bg-slate-800/50 border-slate-700 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all"
							onClick={onRemoveOfflinePassenger}
							disabled={!onRemoveOfflinePassenger || (bus.offlineOccupiedSeats || 0) === 0}
						>
							<Minus className="w-4 h-4 mr-2" />
							Remove
						</Button>
					</div>
				</div>

				<Separator className="bg-slate-800" />

				{/* Location Settings */}
				<div className="space-y-4">
					<div className="flex items-center justify-between group">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
								<MapPin className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
							</div>
							<span className="text-sm text-slate-300">Share Location</span>
						</div>
						<Switch
							checked={locationEnabled}
							onCheckedChange={onLocationToggle}
							className="data-[state=checked]:bg-cyan-500"
						/>
					</div>
					<div className="flex items-center justify-between group">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
								<Users className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
							</div>
							<span className="text-sm text-slate-300">Accepting Passengers</span>
						</div>
						<Switch defaultChecked className="data-[state=checked]:bg-purple-500" />
					</div>
				</div>

				{/* Status Indicators */}
				<div className="bg-slate-950/30 rounded-xl p-3 flex items-center justify-between border border-slate-800/50">
					<div className="flex items-center gap-2">
						<Battery className="w-4 h-4 text-green-400" />
						<span className="text-xs font-medium text-slate-400">{batteryLevel}%</span>
					</div>
					<div className="h-4 w-px bg-slate-800"></div>
					<div className="flex items-center gap-2">
						<Wifi className="w-4 h-4 text-blue-400" />
						<span className="text-xs font-medium text-slate-400">{connectionStrength}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
