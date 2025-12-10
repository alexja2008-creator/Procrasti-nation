import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Play, CheckCircle2, Clock, Heart, Wind, Brain, Sparkles, Volume2, X } from 'lucide-react';

export default function ResetStation() {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [completedSessions, setCompletedSessions] = useState(new Set());

  const categories = [
    {
      id: 'breathwork',
      name: 'Breathwork',
      icon: Wind,
      color: 'from-blue-500 to-cyan-500',
      description: 'Breathing exercises to calm your mind'
    },
    {
      id: 'meditation',
      name: 'Guided Meditation',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      description: 'Center yourself and find clarity'
    },
    {
      id: 'stress',
      name: 'Stress Management',
      icon: Heart,
      color: 'from-red-500 to-orange-500',
      description: 'Techniques to manage overwhelm'
    },
    {
      id: 'focus',
      name: 'Focus & Centering',
      icon: Sparkles,
      color: 'from-yellow-500 to-green-500',
      description: 'Get back on track with your goals'
    }
  ];

  const videos = [
    {
      id: 1,
      title: '5-Minute Box Breathing',
      category: 'breathwork',
      duration: '5 min',
      description: 'A simple 4-4-4-4 breathing pattern used by Navy SEALs to reduce stress and increase focus.',
      thumbnail: '🫁',
      videoUrl: 'https://example.com/video1'
    },
    {
      id: 2,
      title: 'Quick Body Scan Meditation',
      category: 'meditation',
      duration: '7 min',
      description: 'Release tension from head to toe with this guided body awareness practice.',
      thumbnail: '🧘',
      videoUrl: 'https://example.com/video2'
    },
    {
      id: 3,
      title: 'Dealing with Overwhelm',
      category: 'stress',
      duration: '8 min',
      description: 'Practical strategies for when everything feels like too much.',
      thumbnail: '💆',
      videoUrl: 'https://example.com/video3'
    },
    {
      id: 4,
      title: 'The Power of the Pause',
      category: 'focus',
      duration: '6 min',
      description: 'Learn to create intentional breaks that actually recharge you.',
      thumbnail: '⏸️',
      videoUrl: 'https://example.com/video4'
    },
    {
      id: 5,
      title: 'Progressive Muscle Relaxation',
      category: 'stress',
      duration: '10 min',
      description: 'Systematically release physical tension for mental clarity.',
      thumbnail: '💪',
      videoUrl: 'https://example.com/video5'
    },
    {
      id: 6,
      title: '4-7-8 Breathing for Sleep',
      category: 'breathwork',
      duration: '5 min',
      description: 'A powerful technique to calm your nervous system quickly.',
      thumbnail: '😴',
      videoUrl: 'https://example.com/video6'
    },
    {
      id: 7,
      title: 'Mindful Minute',
      category: 'meditation',
      duration: '5 min',
      description: 'A quick reset when you only have a moment.',
      thumbnail: '🕐',
      videoUrl: 'https://example.com/video7'
    },
    {
      id: 8,
      title: 'Returning to Your Why',
      category: 'focus',
      duration: '7 min',
      description: 'Reconnect with your purpose and motivation.',
      thumbnail: '🎯',
      videoUrl: 'https://example.com/video8'
    }
  ];

  const [selectedCategory, setSelectedCategory] = useState(null);

  const filteredVideos = selectedCategory 
    ? videos.filter(v => v.category === selectedCategory)
    : videos;

  const markComplete = (videoId) => {
    const newCompleted = new Set(completedSessions);
    newCompleted.add(videoId);
    setCompletedSessions(newCompleted);
    
    window.storage.set('completed-resets', JSON.stringify(Array.from(newCompleted)))
      .catch(err => console.error('Error saving:', err));
  };

  React.useEffect(() => {
    window.storage.get('completed-resets')
      .then(result => {
        if (result) {
          setCompletedSessions(new Set(JSON.parse(result.value)));
        }
      })
      .catch(() => console.log('No saved sessions'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Zap className="w-12 h-12 text-yellow-400" />
            <h1 className="text-5xl font-bold">Reset Station</h1>
          </div>
          <p className="text-xl text-indigo-200">Take a break. Recenter. Return stronger.</p>
          <p className="text-md text-indigo-300 mt-2">
            {completedSessions.size} session{completedSessions.size !== 1 ? 's' : ''} completed
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-yellow-400 hover:text-yellow-300"
          >
            ← Back to Home
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {categories.map(category => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                className={`bg-gradient-to-br ${category.color} rounded-2xl p-6 text-left transition transform hover:scale-105 ${
                  isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''
                }`}
              >
                <Icon className="w-10 h-10 mb-3" />
                <h3 className="text-xl font-bold mb-2">{category.name}</h3>
                <p className="text-sm opacity-90">{category.description}</p>
              </button>
            );
          })}
        </div>

        {selectedCategory && (
          <div className="mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-yellow-400 hover:text-yellow-300 flex items-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>Clear filter</span>
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map(video => {
            const isCompleted = completedSessions.has(video.id);
            return (
              <div
                key={video.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden hover:bg-white/20 transition cursor-pointer"
                onClick={() => setSelectedVideo(video)}
              >
                <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 h-48 flex items-center justify-center">
                  <span className="text-8xl">{video.thumbnail}</span>
                  <div className="absolute top-4 right-4">
                    {isCompleted && (
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <Play className="w-16 h-16 text-white" />
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400 font-semibold">{video.duration}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{video.title}</h3>
                  <p className="text-indigo-200 text-sm">{video.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {selectedVideo && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl max-w-4xl w-full overflow-hidden">
              <div className="p-6 border-b border-white/20 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{selectedVideo.title}</h2>
                  <p className="text-indigo-300 flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{selectedVideo.duration}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-white hover:text-yellow-400 transition"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="relative bg-black aspect-video flex items-center justify-center">
                <div className="text-center">
                  <Volume2 className="w-24 h-24 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">Video Player</p>
                  <p className="text-gray-500 text-sm max-w-md mx-auto px-4">
                    This is where your video content will be embedded. You can use YouTube, Vimeo, or host your own videos.
                  </p>
                  <div className="mt-6">
                    <code className="text-xs text-gray-600 bg-gray-900 px-3 py-1 rounded">
                      videoUrl: {selectedVideo.videoUrl}
                    </code>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/20">
                <p className="text-indigo-200 mb-4">{selectedVideo.description}</p>
                <div className="flex space-x-4">
                  {!completedSessions.has(selectedVideo.id) && (
                    <button
                      onClick={() => markComplete(selectedVideo.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Mark as Completed</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-bold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
