"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface ProcessingStatusProps {
  videoId: string;
}

interface SegmentWithMetadata {
  id: string;
  title: string | null;
  description: string | null;
  startTime: number;
  endTime: number;
  processed: boolean;
  outputPath: string | null;
}

export default function ProcessingStatus({ videoId }: ProcessingStatusProps) {
  const [status, setStatus] = useState("Génération des métadonnées...");
  const [segments, setSegments] = useState<SegmentWithMetadata[]>([]);
  const [processingSegmentId, setProcessingSegmentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(true);

  useEffect(() => {
    generateMetadata();
  }, [videoId]);

  const generateMetadata = async () => {
    try {
      setStatus("🤖 Génération des titres et descriptions avec l'IA...");
      setIsGeneratingMetadata(true);

      // Generate AI metadata for all segments (no video download)
      const response = await axios.post(`/api/video/${videoId}/generate-metadata`);
      
      if (response.data.success) {
        setSegments(response.data.segments);
        setStatus("✅ Métadonnées générées ! Cliquez sur Télécharger pour traiter un short.");
        setIsGeneratingMetadata(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors de la génération des métadonnées");
      setIsGeneratingMetadata(false);
    }
  };

  const downloadSegment = async (segment: SegmentWithMetadata) => {
    try {
      setProcessingSegmentId(segment.id);
      setStatus(`📥 Téléchargement et traitement du short...`);

      // Process this specific segment (download video + extract)
      const response = await axios.post(`/api/segment/${segment.id}/process`);
      
      if (response.data.success) {
        // Update the segment in the list
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

        setStatus("✅ Short téléchargé avec succès !");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erreur lors du téléchargement");
    } finally {
      setProcessingSegmentId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {isGeneratingMetadata ? "🤖 Génération des métadonnées" : "✨ Prévisualisation des shorts"}
        </h2>

        <div className="mb-6 text-center">
          <p className="text-gray-400">{status}</p>
        </div>

        {isGeneratingMetadata && !error && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400">
            <p className="font-semibold">Erreur</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!isGeneratingMetadata && segments.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 bg-blue-500/10 border border-blue-500 rounded-lg p-4 text-blue-300 text-sm">
              <p className="font-semibold mb-2">ℹ️ Comment ça marche :</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Les titres et descriptions ont été générés par l'IA en français</li>
                <li>Cliquez sur "Télécharger" pour traiter un short spécifique</li>
                <li>Le téléchargement de la vidéo YouTube et le découpage FFmpeg démarreront</li>
                <li>Le fichier MP4 sera téléchargé automatiquement</li>
              </ol>
            </div>
            
            <div className="space-y-4">
              {segments.map((segment, index) => {
                const duration = Math.round(segment.endTime - segment.startTime);
                const isProcessing = processingSegmentId === segment.id;
                const isProcessed = segment.processed;

                return (
                  <div
                    key={segment.id}
                    className={`bg-gray-750 border rounded-lg p-5 transition-all ${
                      isProcessing 
                        ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
                        : isProcessed
                        ? 'border-green-500'
                        : 'border-gray-600 hover:border-purple-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                            Short #{index + 1}
                          </span>
                          <span className="text-xs text-gray-400">
                            {duration}s • {Math.floor(segment.startTime)}s - {Math.floor(segment.endTime)}s
                          </span>
                          {isProcessed && (
                            <span className="text-xs bg-green-600 px-2 py-1 rounded">
                              ✓ Téléchargé
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-lg mb-2">
                          {segment.title || `Short #${index + 1}`}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {segment.description || "Aucune description"}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadSegment(segment)}
                        disabled={isProcessing}
                        className={`flex-shrink-0 px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                          isProcessing
                            ? 'bg-yellow-600 cursor-wait'
                            : isProcessed
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                            Traitement...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {isProcessed ? 'Re-télécharger' : 'Télécharger'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Créer un nouveau projet
          </button>
        </div>
      </div>
    </div>
  );
}
