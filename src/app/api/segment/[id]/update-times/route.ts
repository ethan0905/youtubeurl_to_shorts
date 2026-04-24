import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { startTime, endTime } = await request.json();

    // Validation
    if (typeof startTime !== 'number' || typeof endTime !== 'number') {
      return NextResponse.json(
        { error: 'Invalid time values' },
        { status: 400 }
      );
    }

    if (startTime < 0 || endTime <= startTime) {
      return NextResponse.json(
        { error: 'End time must be greater than start time' },
        { status: 400 }
      );
    }

    if (endTime - startTime < 10) {
      return NextResponse.json(
        { error: 'Segment must be at least 10 seconds long' },
        { status: 400 }
      );
    }

    if (endTime - startTime > 120) {
      return NextResponse.json(
        { error: 'Segment cannot be longer than 2 minutes' },
        { status: 400 }
      );
    }

    // Get segment to check video duration
    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
      include: { video: true },
    });

    if (!segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    if (segment.video.duration && endTime > segment.video.duration) {
      return NextResponse.json(
        { error: 'End time exceeds video duration' },
        { status: 400 }
      );
    }

    // Update segment times
    const updatedSegment = await prisma.segment.update({
      where: { id: params.id },
      data: {
        startTime,
        endTime,
        // Clear processed status since times changed
        processed: false,
        outputPath: null,
      },
    });

    console.log(`✅ Updated segment times: ${startTime}s - ${endTime}s`);

    return NextResponse.json(updatedSegment);
  } catch (error: any) {
    console.error('Error updating segment times:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update segment times' },
      { status: 500 }
    );
  }
}
