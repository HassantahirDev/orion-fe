'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function SpotifyGuideModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the guide before
    const hasSeenGuide = localStorage.getItem('spotify-guide-seen');
    if (!hasSeenGuide) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('spotify-guide-seen', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl animate-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              🎵 Welcome to ORION Spotify Predictor
            </h2>
            <p className="text-gray-400">
              Predict track success using machine learning
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              What is this?
            </h3>
            <p className="text-gray-300 leading-relaxed">
              ORION Spotify Track Success Predictor uses machine learning to predict whether a Spotify track 
              is likely to be successful based on its audio features. The model analyzes danceability, energy, 
              loudness, tempo, and duration to determine if a track will likely achieve popularity ≥ 70.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-3">
              How to use:
            </h3>
            <ol className="space-y-3 text-gray-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  1
                </span>
                <span>
                  <strong className="text-white">Adjust the sliders</strong> to set the track's audio features:
                  <ul className="mt-2 ml-4 space-y-1 text-sm text-gray-400">
                    <li>• <strong>Danceability</strong> (0.0-1.0): How suitable for dancing</li>
                    <li>• <strong>Energy</strong> (0.0-1.0): Perceptual intensity and power</li>
                    <li>• <strong>Loudness</strong> (-60 to 0 dB): Overall loudness</li>
                    <li>• <strong>Tempo</strong> (BPM): Beats per minute</li>
                    <li>• <strong>Duration</strong> (ms): Track length in milliseconds</li>
                  </ul>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  2
                </span>
                <span>
                  <strong className="text-white">Click "Predict Success"</strong> to get the prediction
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  3
                </span>
                <span>
                  <strong className="text-white">View the results</strong> - see the success probability and whether the track is likely to be successful
                </span>
              </li>
            </ol>
          </div>

          <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4">
            <p className="text-sm text-blue-200">
              <strong className="text-blue-100">💡 Tip:</strong> The model was trained on real Spotify data using Logistic Regression. 
              A track is considered "successful" if it has a popularity score ≥ 70.
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Got it, let's start!
        </button>
      </div>
    </div>
  );
}

