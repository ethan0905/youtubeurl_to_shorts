import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        segments: {
          where: { processed: true },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    let status = '';
    let progress = 0;

    switch (video.status) {
      case 'pending':
        status = 'En attente...';
        progress = 0;
        break;
      case 'analyzing':
        status = 'Analyse de la vidéo...';
        progress = 20;
        break;
      case 'processing':
        const totalSegments = video.segments.length;
        const processedCount = video.segments.filter(s => s.processed).length;
        progress = 30 + (processedCount / totalSegments) * 60;
        status = `Génération des shorts (${processedCount}/${totalSegments})...`;
        break;
      case 'completed':
        status = 'Terminé !';
        progress = 100;
        break;
      case 'failed':
        status = 'Erreur lors du traitement';
        progress = 0;
        break;
      default:
        status = 'Statut inconnu';
        progress = 0;
    }

    return NextResponse.json({
      status,
      progress,
      segments: video.segments,
      completed: video.status === 'completed',
    });
  } catch (error: any) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
