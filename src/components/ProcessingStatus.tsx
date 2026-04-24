"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface ProcessingStatusProps {
  videoId: string;
}

interface ProcessedSegment {
  id: string;
  title: string;
  description: string;
  outputPath: string;
  startTime: number;
  endTime: number;
}

export default function ProcessingStatus({ videoId }: ProcessingStatusProps) {
  const [status, setStatus] = useState("Initialisation...");
  const [progress, setProgress] = useState(0);
  const [processedSegments, setProcessedSegments] = useState<ProcessedSegment[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    startProcessing();
  }, [videoId]);

  const startProcessing = async () => {
    try {
      setStatus("Démarrage du traitement...");
      setProgress(10);

      // Start the processing
      const response = await axios.post(`/api/video/${videoId}/process`);
      
      if (response.data.success) {
        pollStatus();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors du traitement");
    }
  };

  const pollStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/video/${videoId}/status`);
        const { status: currentStatus, progress: currentProgress, segments, completed } = response.data;

        setStatus(currentStatus);
        setProgress(currentProgress);

        if (segments) {
          setProcessedSegments(segments);
        }

        if (completed) {
          setIsComplete(true);
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const downloadSegment = (segment: ProcessedSegment) => {
    window.open(`/api/download/${segment.id}`, '_blank');
  };

  const downloadAll = () => {
    window.open(`/api/download/all/${videoId}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold mb-6 text-center">
          {isComplete ? "✅ Traitement terminé !" : "⚙️ Traitement en cours"}
        </h2>

        {!isComplete && !error && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{status}</span>
                <span className="text-sm font-semibold text-purple-400">{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400">
            <p className="font-semibold">Erreur</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {processedSegments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-4">Shorts générés ({processedSegments.length})</h3>
            <div className="space-y-4">
              {processedSegments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="bg-gray-750 border border-gray-600 rounded-lg p-4 hover:border-purple-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-1">
                        {segment.title || `Short #${index + 1}`}
                      </h4>
                      <p className="text-sm text-gray-400 mb-2">
                        {segment.description || "Aucune description"}
                      </p>
                      <div className="text-xs text-gray-500">
                        Durée: {Math.round(segment.endTime - segment.startTime)}s
                      </div>
                    </div>
                    <button
                      onClick={() => downloadSegment(segment)}
                      className="ml-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Télécharger
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {isComplete && (
              <button
                onClick={downloadAll}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Télécharger tous les shorts (ZIP)
              </button>
            )}
          </div>
        )}

        {isComplete && (
          <div className="mt-6 text-center">
            <button
              onClick={() => window.location.reload()}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              ← Créer un nouveau projet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
