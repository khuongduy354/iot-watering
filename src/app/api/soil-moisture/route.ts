import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SoilMoisture from '@/models/SoilMoisture';

type SoilMoistureBody = { 
  rawValue: number;
  moisturePercentage: number;
  timestamp: number;
}
export async function POST(request: Request) {
  try {
    await connectDB();
    const body: SoilMoistureBody = await request.json();
    
    const moistureData = new SoilMoisture({
      rawValue: body.rawValue,
      moisturePercentage: body.moisturePercentage,
      timestamp: body.timestamp
    });

    console.log(moistureData); 
    
    await moistureData.save();
    return NextResponse.json({
      status: 'success',
      message: 'Moisture data saved successfully',
      data: moistureData
    });
  } catch (error) {
    console.error('Failed to save moisture data:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to save moisture data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


// app/api/soil-moisture/route.ts

export async function GET() {
  try{ 

  const db = await connectDB();
  const dbStream = db.connection.collection("soilmoistures").watch();

  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Send initial response
  writer.write(encoder.encode('data: Connected\n\n'))


  // Keep connection alive

  const timer = setInterval(() => {
    writer.write(encoder.encode(':keep-alive\n\n'))
  }, 15000)

  dbStream.on("change", (change) => {  
    console.log("Change found", change)
    writer.write(encoder.encode(`data: ${JSON.stringify(change)}\n\n`))
  })

  // Example: Send server time every second
  // const sendTime = () => {
  //   writer.write(encoder.encode(`data: ${JSON.stringify({ time: new Date() })}\n\n`))
  // }
  // const timeInterval = setInterval(sendTime, 1000)

  // Cleanup when connection closes
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })

  }
  catch(e){
    console.error(e)
  }
}

// export async function GET() {
//   try {
//     await connectDB();
//     const data = await SoilMoisture.find()
//       .sort({ timestamp: -1 })
//       .limit(50);
    
//     return NextResponse.json({
//       status: 'success',
//       data: data
//     });
//   } catch (error) {
//     console.error('Failed to fetch moisture data:', error);
//     return NextResponse.json(
//       { 
//         status: 'error',
//         message: 'Failed to fetch moisture data',
//         error: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     );
//   }
// }