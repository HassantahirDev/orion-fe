'use client';

import { useState } from 'react';
import { Music, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { spotifyApi } from '@/lib/api';
import SpotifyGuideModal from '@/components/SpotifyGuideModal';

interface PredictionResult {
  success_probability: number;
  is_likely_successful: boolean;
  message: string;
}

export default function Home() {
  const [danceability, setDanceability] = useState(0.5);
  const [energy, setEnergy] = useState(0.5);
  const [loudness, setLoudness] = useState(-10);
  const [tempo, setTempo] = useState(120);
  const [durationMs, setDurationMs] = useState(200000);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await spotifyApi.predict({
        danceability,
        energy,
        loudness,
        tempo,
        duration_ms: durationMs,
      });
      setResult(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to get prediction. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SpotifyGuideModal />
      
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-10 h-10 text-blue-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ORION
            </h1>
          </div>
          <h2 className="text-3xl font-semibold mb-2">Spotify Track Success Predictor</h2>
          <p className="text-gray-400 text-lg">
            Predict whether a track will be successful using machine learning
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold mb-6">Track Features</h3>
            
            <div className="space-y-6">
              {/* Danceability */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-300 font-medium">Danceability</label>
                  <span className="text-blue-400 font-semibold">{danceability.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={danceability}
                  onChange={(e) => setDanceability(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">How suitable the track is for dancing</p>
              </div>

              {/* Energy */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-300 font-medium">Energy</label>
                  <span className="text-blue-400 font-semibold">{energy.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={energy}
                  onChange={(e) => setEnergy(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">Perceptual measure of intensity and power</p>
              </div>

              {/* Loudness */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-300 font-medium">Loudness (dB)</label>
                  <span className="text-blue-400 font-semibold">{loudness.toFixed(1)} dB</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="50"
                  step="0.1"
                  value={loudness}
                  onChange={(e) => setLoudness(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">Overall loudness in decibels (range: -60 to +50 dB)</p>
              </div>

              {/* Tempo */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-300 font-medium">Tempo (BPM)</label>
                  <span className="text-blue-400 font-semibold">{tempo} BPM</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="1"
                  value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">Beats per minute</p>
              </div>

              {/* Duration */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-300 font-medium">Duration</label>
                  <span className="text-blue-400 font-semibold">
                    {Math.floor(durationMs / 60000)}:{(Math.floor((durationMs % 60000) / 1000)).toString().padStart(2, '0')}
                  </span>
                </div>
                <input
                  type="range"
                  min="30000"
                  max="600000"
                  step="1000"
                  value={durationMs}
                  onChange={(e) => setDurationMs(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">Track duration in milliseconds</p>
              </div>
            </div>

            <button
              onClick={handlePredict}
              disabled={isLoading}
              className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Predict Success
                </>
              )}
            </button>
          </div>

          {/* Results Panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h3 className="text-2xl font-semibold mb-6">Prediction Result</h3>
            
            {error && (
              <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 mb-6">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {result ? (
              <div className="space-y-6">
                {/* Success Probability */}
                <div className="bg-gradient-to-br from-blue-950/50 to-purple-950/50 border border-blue-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Success Probability</span>
                    {result.is_likely_successful ? (
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div className="text-5xl font-bold text-white mb-2">
                    {result.success_probability}%
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.is_likely_successful
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-red-500 to-orange-500'
                      }`}
                      style={{ width: `${result.success_probability}%` }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div
                  className={`rounded-xl p-6 border-2 ${
                    result.is_likely_successful
                      ? 'bg-green-950/30 border-green-800/50'
                      : 'bg-red-950/30 border-red-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.is_likely_successful ? (
                      <TrendingUp className="w-8 h-8 text-green-400" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-red-400" />
                    )}
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Prediction</p>
                      <p className="text-2xl font-bold text-white">{result.message}</p>
                    </div>
                  </div>
                </div>

                {/* Feature Summary */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Based on features:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Danceability:</span>{' '}
                      <span className="text-white">{danceability.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Energy:</span>{' '}
                      <span className="text-white">{energy.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Loudness:</span>{' '}
                      <span className="text-white">{loudness.toFixed(1)} dB</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tempo:</span>{' '}
                      <span className="text-white">{tempo} BPM</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Adjust the track features and click "Predict Success" to see the results</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>ORION Spotify Track Success Predictor | Powered by Machine Learning</p>
        </div>
      </div>
    </div>
  );
}
