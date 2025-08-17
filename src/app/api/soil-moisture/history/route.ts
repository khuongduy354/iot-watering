import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SoilMoisture from '@/models/SoilMoisture';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const start = searchParams.get('start');
	const end = searchParams.get('end');

	try {
		await connectDB();
		let query = {};
		if (start && end) {
			const startDate = new Date(Number(start) * 1000).toISOString();
			const endDate = new Date(Number(end) * 1000).toISOString();
			query = { timestamp: { $gte: startDate, $lte: endDate } };
		}
		const data = await SoilMoisture.find(query).sort({ timestamp: 1 });
		return NextResponse.json({
			status: 'success',
			data
		});
	} catch (error) {
		console.error('Failed to fetch moisture data:', error);
		return NextResponse.json(
			{
				status: 'error',
				message: 'Failed to fetch moisture data',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
