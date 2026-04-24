"use client";

import { useState } from "react";
import VideoInput from "@/components/VideoInput";
import VideoEditor from "@/components/VideoEditor";

export default function Home() {
  const [videoId, setVideoId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            YouTube Shorts Generator
          </h1>
          <p className="text-gray-400 text-lg">
            Transformez vos vidéos YouTube en shorts captivants avec l'IA
          </p>
        </header>

        {!videoId ? (
          <VideoInput onVideoDetected={setVideoId} />
        ) : (
          <VideoEditor 
            videoId={videoId} 
            onProcess={() => {}} // No longer needed, processing is done in editor
            onBack={() => setVideoId(null)}
          />
        )}
      </div>
    </main>
  );
}
