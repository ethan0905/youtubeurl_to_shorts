import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segment = await prisma.segment.findUnique({
      where: { id: params.id },
    });

    if (!segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    const updatedSegment = await prisma.segment.update({
      where: { id: params.id },
      data: { selected: !segment.selected },
    });

    return NextResponse.json(updatedSegment);
  } catch (error: any) {
    console.error('Error toggling segment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle segment' },
      { status: 500 }
    );
  }
}
