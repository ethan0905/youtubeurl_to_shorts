"use client";

import { useState } from "react";
import axios from "axios";

interface VideoInputProps {
  onVideoDetected: (videoId: string) => void;
}

export default function VideoInput({ onVideoDetected }: VideoInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoPreview, setVideoPreview] = useState<{
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
  } | null>(null);

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleUrlChange = async (value: string) => {
    setUrl(value);
    setError("");
    setVideoPreview(null);

    const videoId = extractYouTubeId(value);
    if (videoId) {
      try {
        setLoading(true);
        const response = await axios.post("/api/video/detect", { url: value, videoId });
        setVideoPreview(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Erreur lors de la détection de la vidéo");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConfirm = async () => {
    if (!videoPreview) return;
    
    try {
      setLoading(true);
      const response = await axios.post("/api/video/create", {
        youtubeUrl: url,
        youtubeId: videoPreview.id,
        title: videoPreview.title,
        thumbnail: videoPreview.thumbnail,
        duration: videoPreview.duration,
      });
      
      onVideoDetected(response.data.id);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors de la création de la vidéo");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            URL de la vidéo YouTube
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white placeholder-gray-400"
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}

        {videoPreview && !loading && (
          <div className="mt-6 border border-gray-700 rounded-lg overflow-hidden bg-gray-750">
            <div className="flex items-start space-x-4 p-4">
              <img
                src={videoPreview.thumbnail}
                alt={videoPreview.title}
                className="w-40 h-24 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{videoPreview.title}</h3>
                <p className="text-sm text-gray-400">
                  Durée: {Math.floor(videoPreview.duration / 60)}:{(videoPreview.duration % 60).toString().padStart(2, '0')}
                </p>
                <div className="mt-3 flex items-center text-green-400 text-sm">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Vidéo détectée avec succès
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer vers l'éditeur
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-gray-400 text-sm">
        <p>💡 Astuce: Utilisez des vidéos de 5-30 minutes pour de meilleurs résultats</p>
      </div>
    </div>
  );
}
