import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeVideoForBestMoments, analyzeTranscriptContent } from '@/lib/openai';
import { getSegmentTranscript } from '@/lib/youtube-transcript';
import { downloadYouTubeVideo, extractThumbnail } from '@/lib/video-processing';
import path from 'path';
import fs from 'fs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: params.id },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Analyze video to find best moments
    const moments = await analyzeVideoForBestMoments(
      video.youtubeId,
      video.duration || 0
    );

    // Download video for thumbnail extraction
    let videoPath: string | null = null;
    try {
      console.log('📥 Downloading video for thumbnail extraction...');
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      videoPath = await downloadYouTubeVideo(video.youtubeId, uploadsDir);
    } catch (error) {
      console.error('⚠️ Could not download video for thumbnails:', error);
    }

    // Create segments in database with transcripts and analysis
    const segments = await Promise.all(
      moments.map(async (moment, index) => {
        // Fetch transcript for this segment
        let transcript = null;
        let transcriptAnalysis = null;
        let qualityScore = moment.score;

        try {
          transcript = await getSegmentTranscript(
            video.youtubeId,
            moment.startTime,
            moment.endTime
          );

          // Analyze transcript content for quality grading
          if (transcript) {
            console.log(`🤖 Analyzing transcript for segment ${index + 1}...`);
            const analysis = await analyzeTranscriptContent(
              transcript,
              video.title || 'Vidéo YouTube'
            );
            transcriptAnalysis = analysis.analysis;
            qualityScore = analysis.qualityScore; // Update score based on AI analysis
            console.log(`✅ Quality score: ${(qualityScore * 100).toFixed(0)}%`);
          }
        } catch (error) {
          console.log(`⚠️ Could not analyze segment ${moment.startTime}-${moment.endTime}`);
        }

        // Extract thumbnail
        let thumbnailUrl = null;
        if (videoPath) {
          try {
            const thumbnailsDir = path.join(process.cwd(), 'public', 'thumbnails');
            if (!fs.existsSync(thumbnailsDir)) {
              fs.mkdirSync(thumbnailsDir, { recursive: true });
            }

            const thumbnailFilename = `${video.youtubeId}_${Math.floor(moment.startTime)}.jpg`;
            const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
            
            await extractThumbnail(videoPath, moment.startTime, thumbnailPath);
            thumbnailUrl = `/thumbnails/${thumbnailFilename}`;
            console.log(`📸 Thumbnail generated: ${thumbnailUrl}`);
          } catch (error) {
            console.error(`⚠️ Could not extract thumbnail:`, error);
          }
        }

        return prisma.segment.create({
          data: {
            videoId: video.id,
            startTime: moment.startTime,
            endTime: moment.endTime,
            score: qualityScore,
            selected: true,
            transcript: transcript,
            transcriptAnalysis: transcriptAnalysis,
            thumbnailUrl: thumbnailUrl,
          },
        });
      })
    );

    // Update video status
    await prisma.video.update({
      where: { id: params.id },
      data: { status: 'analyzed' },
    });

    return NextResponse.json({ segments });
  } catch (error: any) {
    console.error('Error analyzing video:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze video' },
      { status: 500 }
    );
  }
}
