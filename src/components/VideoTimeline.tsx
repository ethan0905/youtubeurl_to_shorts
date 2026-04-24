"use client";

interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  score: number;
  selected: boolean;
}

interface VideoTimelineProps {
  segments: Segment[];
  duration: number;
  currentTime: number;
  onSegmentClick: (segmentId: string) => void;
  onSeek: (time: number) => void;
}

export default function VideoTimeline({
  segments,
  duration,
  currentTime,
  onSegmentClick,
  onSeek,
}: VideoTimelineProps) {
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    onSeek(time);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
        <span>Timeline des segments</span>
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>

      <div
        className="timeline-container relative cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Segments */}
        {segments.map((segment) => {
          const left = (segment.startTime / duration) * 100;
          const width = ((segment.endTime - segment.startTime) / duration) * 100;

          return (
            <div
              key={segment.id}
              className={`timeline-segment ${segment.selected ? 'selected' : ''}`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSegmentClick(segment.id);
              }}
              title={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)} (Score: ${(segment.score * 100).toFixed(0)}%)`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white opacity-0 hover:opacity-100 transition-opacity">
                {Math.round(segment.endTime - segment.startTime)}s
              </div>
            </div>
          );
        })}

        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-red-500 z-10 pointer-events-none"
          style={{
            left: `${(currentTime / duration) * 100}%`,
          }}
        >
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
        </div>
      </div>

      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>0:00</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
