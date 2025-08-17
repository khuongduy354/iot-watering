import { NextResponse } from 'next/server';
// No DB usage
interface Command { 
  watering: boolean; 
  time: number;
}
let currentCommand: Command | null = {
  watering: true,
  time: 10
};

export async function POST(request: Request, response: Response) {
  try {
    const body = await request.json();

    // If POST contains watering command, store in memory only if not already present
    if (typeof body.watering === "boolean" && typeof body.time === "number") {
      if (currentCommand) {
        // Do nothing if there's already a command

      return NextResponse.json({ status: 'ignored', message: 'Command already present' }, {status: 409});
      }
      currentCommand = { watering: body.watering, time: body.time };
      return NextResponse.json({
        status: 'success',
        message: 'Command stored',
        command: currentCommand
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Data saved successfully',
    });
  } catch (error) {
    console.error('Data operation error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to save data or command',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // If a command is present, return and clear it
    if (currentCommand) {
      const cmd = currentCommand;
      currentCommand = null;
      return NextResponse.json(cmd);
    }

    // Otherwise, return nothing
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Data retrieval error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to retrieve data or command',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ...existing code...