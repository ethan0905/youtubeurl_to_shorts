"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import VideoTimeline from "./VideoTimeline";
import dynamic from "next/dynamic";

// Import ReactPlayer dynamically to avoid SSR issues
const ReactPlayerComponent = dynamic(() => import("react-player/youtube"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full bg-black">Loading player...</div>
});

interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  score: number;
  selected: boolean;
  title?: string | null;
  description?: string | null;
  processed?: boolean;
  outputPath?: string | null;
}

interface VideoEditorProps {
  videoId: string;
  onProcess: () => void;
  onBack: () => void;
}

export default function VideoEditor({ videoId, onProcess, onBack }: VideoEditorProps) {
  const playerRef = useRef<any>(null);
  const [playerInstance, setPlayerInstance] = useState<any>(null);
  const [video, setVideo] = useState<any>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingMetadata, setGeneratingMetadata] = useState(false);
  const [processingSegmentId, setProcessingSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [videoId]);

  const loadVideo = async () => {
    try {
      const response = await axios.get(`/api/video/${videoId}`);
      setVideo(response.data);
      
      if (response.data.segments && response.data.segments.length > 0) {
        // Sort segments by start time
        const sortedSegments = [...response.data.segments].sort((a, b) => a.startTime - b.startTime);
        setSegments(sortedSegments);
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
      // Sort segments by start time
      const sortedSegments = [...response.data.segments].sort((a, b) => a.startTime - b.startTime);
      setSegments(sortedSegments);
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

  const handleGenerateMetadata = async () => {
    const selectedSegments = segments.filter(s => s.selected);
    if (selectedSegments.length === 0) {
      alert("Veuillez sélectionner au moins un segment");
      return;
    }

    setGeneratingMetadata(true);
    try {
      const response = await axios.post(`/api/video/${videoId}/generate-metadata`);
      if (response.data.success) {
        // Merge updated segments back into the full list
        const updatedSegmentsMap = new Map<string, Segment>(
          response.data.segments.map((s: Segment) => [s.id, s])
        );
        setSegments(prev => {
          const merged = prev.map(s => {
            const updated = updatedSegmentsMap.get(s.id);
            return updated ? updated : s;
          });
          // Sort by start time to maintain chronological order
          return merged.sort((a, b) => a.startTime - b.startTime);
        });
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Erreur lors de la génération des métadonnées");
    } finally {
      setGeneratingMetadata(false);
    }
  };

  const downloadSegment = async (segment: Segment) => {
    setProcessingSegmentId(segment.id);
    try {
      const response = await axios.post(`/api/segment/${segment.id}/process`);
      
      if (response.data.success) {
        // Update the segment
        setSegments(prev => 
          prev.map(s => 
            s.id === segment.id 
              ? { ...s, processed: true, outputPath: response.data.segment.outputPath }
              : s
          )
        );

        // Download the video file
        const link = document.createElement('a');
        link.href = response.data.segment.outputPath;
        link.download = `short_${segment.title?.replace(/[^a-z0-9]/gi, '_') || segment.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Erreur lors du téléchargement");
    } finally {
      setProcessingSegmentId(null);
    }
  };

  const downloadAllSelected = async () => {
    const selectedSegments = segments.filter(s => s.selected);
    if (selectedSegments.length === 0) {
      alert("Veuillez sélectionner au moins un segment");
      return;
    }

    setGeneratingMetadata(true);
    let successCount = 0;
    
    for (let i = 0; i < selectedSegments.length; i++) {
      const segment = selectedSegments[i];
      try {
        console.log(`📥 Downloading segment ${i + 1}/${selectedSegments.length}...`);
        const response = await axios.post(`/api/segment/${segment.id}/process`);
        
        if (response.data.success) {
          // Update the segment
          setSegments(prev => 
            prev.map(s => 
              s.id === segment.id 
                ? { ...s, processed: true, outputPath: response.data.segment.outputPath }
                : s
            )
          );

          // Download the video file
          const link = document.createElement('a');
          link.href = response.data.segment.outputPath;
          link.download = `short_segment_${i + 1}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          successCount++;
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        console.error(`❌ Error downloading segment ${i + 1}:`, error);
      }
    }
    
    setGeneratingMetadata(false);
    alert(`✅ ${successCount}/${selectedSegments.length} segments téléchargés avec succès !`);
  };

  const seekToSegment = (startTime: number) => {
    console.log('🎯 [SEEK] Attempting to seek to:', startTime, 'seconds');
    console.log('📍 [SEEK] Player instance:', playerInstance);
    console.log('📍 [SEEK] Player ready:', playerReady);
    
    const player = playerInstance || playerRef.current;
    
    if (player && playerReady) {
      try {
        console.log('✅ [SEEK] Player found, calling seekTo...');
        player.seekTo(startTime, 'seconds');
        setPlaying(true);
        console.log('✅ [SEEK] Seek command sent!');
      } catch (error) {
        console.error('❌ [SEEK] Error:', error);
      }
    } else {
      console.warn('⚠️ [SEEK] Player not ready. Player:', !!player, 'Ready:', playerReady);
      console.log('🔄 [SEEK] Will retry in 1 second...');
      // Retry after player loads
      setTimeout(() => {
        const retryPlayer = playerInstance || playerRef.current;
        if (retryPlayer) {
          console.log('🔄 [SEEK] Retry successful, seeking to', startTime);
          retryPlayer.seekTo(startTime, 'seconds');
          setPlaying(true);
        } else {
          console.error('❌ [SEEK] Retry failed - player still not available');
        }
      }, 1000);
    }
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
              <ReactPlayerComponent
                ref={playerRef}
                url={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                width="100%"
                height="100%"
                playing={playing}
                controls
                onReady={(player: any) => {
                  console.log('🎬 [PLAYER] Ready! Instance:', player);
                  console.log('🔍 [PLAYER] Has seekTo?', typeof player?.seekTo);
                  playerRef.current = player;
                  setPlayerInstance(player);
                  setPlayerReady(true);
                }}
                onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
                progressInterval={100}
              />
            </div>

            {/* Timeline */}
            <div className="p-4">
              {/* Player Status Indicator */}
              <div className="mb-2 flex items-center justify-between text-xs">
                <div className={`flex items-center gap-2 ${playerReady ? 'text-green-400' : 'text-yellow-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${playerReady ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}></div>
                  {playerReady ? '✅ Lecteur prêt' : '⏳ Chargement du lecteur...'}
                </div>
                {playerReady && (
                  <button
                    onClick={() => seekToSegment(0)}
                    className="text-purple-400 hover:text-purple-300 px-2 py-1 bg-purple-500/10 rounded"
                  >
                    🔄 Test (0s)
                  </button>
                )}
              </div>
              
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
                  onSegmentClick={(segmentId: string) => {
                    console.log('🎯 [TIMELINE] Segment clicked:', segmentId);
                    const segment = segments.find(s => s.id === segmentId);
                    if (segment) {
                      console.log('🎯 [TIMELINE] Seeking to segment start:', segment.startTime, 's');
                      seekToSegment(segment.startTime);
                    }
                  }}
                  onSeek={(time: number) => {
                    console.log('🎯 [TIMELINE] Timeline clicked, seeking to:', time, 's');
                    seekToSegment(time);
                  }}
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
                segments.map((segment, index) => {
                  const hasMetadata = segment.title && segment.description;
                  const isProcessing = processingSegmentId === segment.id;
                  return (
                    <div
                      key={segment.id}
                      className={`border-2 rounded-lg p-3 transition-all ${
                        segment.selected
                          ? "border-green-500 bg-green-500/10"
                          : "border-gray-600 bg-gray-750 hover:border-gray-500"
                      }`}
                    >
                      <div 
                        className="cursor-pointer"
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
                      </div>

                      {/* Metadata Display */}
                      {hasMetadata && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-sm font-semibold text-white mb-1">{segment.title}</p>
                          <p className="text-xs text-gray-400">{segment.description}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔘 [BUTTON] "Voir le segment" clicked for segment at', segment.startTime, 's');
                            seekToSegment(segment.startTime);
                          }}
                          className="flex-1 text-xs text-purple-400 hover:text-purple-300 transition-colors py-2 px-3 bg-purple-500/10 rounded hover:bg-purple-500/20"
                        >
                          ▶ Voir le segment
                        </button>
                        {hasMetadata && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadSegment(segment);
                            }}
                            disabled={isProcessing}
                            className={`flex-1 text-xs py-2 px-3 rounded font-semibold transition-colors ${
                              isProcessing
                                ? 'bg-yellow-600 cursor-wait'
                                : segment.processed
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                            }`}
                          >
                            {isProcessing ? '⏳ Traitement...' : segment.processed ? '✓ Re-télécharger' : '📥 Télécharger'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {segments.length > 0 && !segments.some(s => s.title) && (
                <>
                  <button
                    onClick={handleGenerateMetadata}
                    disabled={segments.filter(s => s.selected).length === 0 || generatingMetadata}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingMetadata ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        Génération des métadonnées...
                      </>
                    ) : (
                      `🤖 Générer les métadonnées (${segments.filter(s => s.selected).length})`
                    )}
                  </button>

                  <button
                    onClick={downloadAllSelected}
                    disabled={segments.filter(s => s.selected).length === 0 || generatingMetadata}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingMetadata ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        Téléchargement en cours...
                      </>
                    ) : (
                      <>
                        📥 Télécharger les segments sélectionnés ({segments.filter(s => s.selected).length})
                      </>
                    )}
                  </button>

                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-xs text-gray-400">
                    <p className="mb-1"><strong className="text-gray-300">💡 2 options :</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong className="text-green-400">Générer métadonnées</strong> : Crée des titres/descriptions avec l'IA avant téléchargement</li>
                      <li><strong className="text-blue-400">Télécharger directement</strong> : Télécharge les segments sans métadonnées</li>
                    </ul>
                  </div>
                </>
              )}

            {segments.some(s => s.title) && (
              <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 text-blue-300 text-sm">
                <p className="font-semibold mb-2">✨ Métadonnées générées !</p>
                <p className="text-xs">Cliquez sur "Télécharger" pour traiter un short spécifique. Le téléchargement de la vidéo YouTube et le découpage FFmpeg démarreront automatiquement.</p>
              </div>
            )}
            </div>
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
