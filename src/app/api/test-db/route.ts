import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET() {
  try {
    const mongoose = await connectDB();
    const isConnected = mongoose.connection.readyState === 1;
    
    return NextResponse.json({
      status: 'success',
      message: isConnected ? 'Successfully connected to MongoDB' : 'Not connected to MongoDB',
      connectionState: mongoose.connection.readyState
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to connect to database',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}