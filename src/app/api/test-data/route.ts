import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Test from '@/models/Test';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    const testData = new Test({
      name: body.name || 'Test Entry'
    });
    
    await testData.save();
    return NextResponse.json({
      status: 'success',
      message: 'Data saved successfully',
      data: testData
    });
  } catch (error) {
    console.error('Data operation error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to save data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const data = await Test.find().sort({ createdAt: -1 }).limit(5);
    
    return NextResponse.json({
      status: 'success',
      message: 'Data retrieved successfully',
      data: data
    });
  } catch (error) {
    console.error('Data retrieval error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to retrieve data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}