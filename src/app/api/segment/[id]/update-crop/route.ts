import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { cropX } = await request.json();

    // Validation
    if (typeof cropX !== 'number') {
      return NextResponse.json(
        { error: 'Invalid crop position' },
        { status: 400 }
      );
    }

    if (cropX < 0 || cropX > 1) {
      return NextResponse.json(
        { error: 'Crop position must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Update segment crop position
    const updatedSegment = await prisma.segment.update({
      where: { id: params.id },
      data: {
        cropX,
        // Clear processed status since crop changed
        processed: false,
        outputPath: null,
      },
    });

    console.log(`✅ Updated crop position: ${(cropX * 100).toFixed(0)}%`);

    return NextResponse.json(updatedSegment);
  } catch (error: any) {
    console.error('Error updating crop position:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update crop position' },
      { status: 500 }
    );
  }
}
