"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import VideoTimeline from "./VideoTimeline";
import dynamic from "next/dynamic";

// Import ReactPlayer dynamically to avoid SSR issues
const ReactPlayer = dynamic(() => import("react-player/youtube"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-black">Loading player...</div>
});

interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  score: number;
  selected: boolean;
  title?: string;
  description?: string;
}

interface VideoEditorProps {
  videoId: string;
  onProcess: () => void;
  onBack: () => void;
}

export default function VideoEditor({ videoId, onProcess, onBack }: VideoEditorProps) {
  const [video, setVideo] = useState<any>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [videoId]);

  const loadVideo = async () => {
    try {
      const response = await axios.get(`/api/video/${videoId}`);
      setVideo(response.data);
      
      if (response.data.segments && response.data.segments.length > 0) {
        setSegments(response.data.segments);
      } else {
        // Start analysis if no segments yet
        analyzeVideo();
      }
    } catch (error) {
      console.error("Error loading video:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeVideo = async () => {
    setAnalyzing(true);
    try {
      const response = await axios.post(`/api/video/${videoId}/analyze`);
      setSegments(response.data.segments);
    } catch (error) {
      console.error("Error analyzing video:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSegment = async (segmentId: string) => {
    const updatedSegments = segments.map(seg =>
      seg.id === segmentId ? { ...seg, selected: !seg.selected } : seg
    );
    setSegments(updatedSegments);

    try {
      await axios.patch(`/api/segment/${segmentId}/toggle`);
    } catch (error) {
      console.error("Error toggling segment:", error);
    }
  };

  const handleProcess = async () => {
    const selectedSegments = segments.filter(s => s.selected);
    if (selectedSegments.length === 0) {
      alert("Veuillez sélectionner au moins un segment");
      return;
    }
    onProcess();
  };

  const seekToSegment = (startTime: number) => {
    setCurrentTime(startTime);
    setPlaying(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">Vidéo non trouvée</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <h2 className="text-2xl font-bold">{video.title}</h2>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="aspect-video bg-black">
              <ReactPlayer
                url={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                width="100%"
                height="100%"
                playing={playing}
                controls
                onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
                progressInterval={100}
              />
            </div>

            {/* Timeline */}
            <div className="p-4">
              {analyzing ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mr-3"></div>
                  <span className="text-gray-300">Analyse en cours... Détection des meilleurs moments</span>
                </div>
              ) : (
                <VideoTimeline
                  segments={segments}
                  duration={video.duration || 0}
                  currentTime={currentTime}
                  onSegmentClick={toggleSegment}
                  onSeek={seekToSegment}
                />
              )}
            </div>
          </div>
        </div>

        {/* Segments List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              Segments détectés ({segments.filter(s => s.selected).length}/{segments.length})
            </h3>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {segments.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Aucun segment détecté</p>
                  <button
                    onClick={analyzeVideo}
                    disabled={analyzing}
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Analyser la vidéo
                  </button>
                </div>
              ) : (
                segments.map((segment, index) => (
                  <div
                    key={segment.id}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      segment.selected
                        ? "border-green-500 bg-green-500/10"
                        : "border-gray-600 bg-gray-750 hover:border-gray-500"
                    }`}
                    onClick={() => toggleSegment(segment.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-semibold text-purple-400">
                        Segment #{index + 1}
                      </span>
                      <div className="flex items-center">
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded mr-2">
                          Score: {(segment.score * 100).toFixed(0)}%
                        </span>
                        {segment.selected && (
                          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      <span className="text-gray-500 ml-2">
                        ({Math.round(segment.endTime - segment.startTime)}s)
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        seekToSegment(segment.startTime);
                      }}
                      className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      ▶ Voir le segment
                    </button>
                  </div>
                ))
              )}
            </div>

            {segments.length > 0 && (
              <button
                onClick={handleProcess}
                disabled={segments.filter(s => s.selected).length === 0}
                className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Générer les Shorts ({segments.filter(s => s.selected).length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
