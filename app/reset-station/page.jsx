'use client';

import { useState, useEffect } from 'react';
import { Zap, Play, CheckCircle2, Clock, Heart, Wind, Brain, Sparkles, X } from 'lucide-react';
import { useTheme } from '../providers';
import Navigation from '../../components/Navigation';

export default function ResetStationPage() {
  const { darkMode } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [completedSessions, setCompletedSessions] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categories = [
    { id: 'breathwork', name: 'Breathwork', icon: Wind, color: 'blue', description: 'Breathing exercises to calm your mind' },
    { id: 'meditation', name: 'Guided Meditation', icon: Brain, color: 'violet', description: 'Center yourself and find clarity' },
    { id: 'stress', name: 'Stress Management', icon: Heart, color: 'rose', description: 'Techniques to manage overwhelm' },
    { id: 'focus', name: 'Focus & Centering', icon: Sparkles, color: 'emerald', description: 'Get back on track with your goals' }
  ];

  const getCategoryStyles = (colorName) => {
    const colors = {
      emerald: { bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100', text: darkMode ? 'text-emerald-400' : 'text-emerald-600', gradient: 'from-emerald-500 to-teal-500' },
      blue: { bg: darkMode ? 'bg-blue-900/30' : 'bg-blue-100', text: darkMode ? 'text-blue-400' : 'text-blue-600', gradient: 'from-blue-500 to-cyan-500' },
      violet: { bg: darkMode ? 'bg-violet-900/30' : 'bg-violet-100', text: darkMode ? 'text-violet-400' : 'text-violet-600', gradient: 'from-violet-500 to-purple-500' },
      rose: { bg: darkMode ? 'bg-rose-900/30' : 'bg-rose-100', text: darkMode ? 'text-rose-400' : 'text-rose-600', gradient: 'from-rose-500 to-pink-500' }
    };
    return colors[colorName] || colors.emerald;
  };

  const videos = [
    { id: 1, title: '5-Minute Box Breathing', category: 'breathwork', duration: '5 min', description: 'A simple 4-4-4-4 breathing pattern used by Navy SEALs to reduce stress and increase focus.', thumbnail: '🫁', youtubeId: 'aPYmZOhJF5Q' },
    { id: 2, title: 'Quick Body Scan Meditation', category: 'meditation', duration: '7 min', description: 'Release tension from head to toe with this guided body awareness practice.', thumbnail: '🧘', youtubeId: '1saZqSr2zGM' },
    { id: 3, title: 'Dealing with Overwhelm', category: 'stress', duration: '8 min', description: 'Practical strategies for when everything feels like too much.', thumbnail: '💆', youtubeId: '8uZNGWPpdms' },
    { id: 4, title: 'The Power of the Pause', category: 'focus', duration: '6 min', description: 'Learn to create intentional breaks that actually recharge you.', thumbnail: '⏸️', youtubeId: 'Ejq4FRMyATs' },
    { id: 5, title: 'Progressive Muscle Relaxation', category: 'stress', duration: '10 min', description: 'Systematically release physical tension for mental clarity.', thumbnail: '💪', youtubeId: '1nZEdqcGVzo' },
    { id: 6, title: '4-7-8 Breathing for Sleep', category: 'breathwork', duration: '5 min', description: 'A powerful technique to calm your nervous system quickly.', thumbnail: '😴', youtubeId: 'kpSkoXRrZnE' },
    { id: 7, title: 'Mindful Minute', category: 'meditation', duration: '5 min', description: 'A quick reset when you only have a moment.', thumbnail: '🕐', youtubeId: '9mopikvt114' },
    { id: 8, title: 'Returning to Your Why', category: 'focus', duration: '7 min', description: 'Reconnect with your purpose and motivation.', thumbnail: '🎯', youtubeId: 'tF7YLGpOoz8' }
  ];

  const filteredVideos = selectedCategory ? videos.filter(v => v.category === selectedCategory) : videos;

  const markComplete = (videoId) => {
    const newCompleted = new Set(completedSessions);
    newCompleted.add(videoId);
    setCompletedSessions(newCompleted);
  };

  const getCategoryForVideo = (categoryId) => {
    return categories.find(c => c.id === categoryId) || categories[0];
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
            darkMode ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-50 text-teal-700'
          }`}>
            <Zap className="w-4 h-4" />
            <span>Quick Reset</span>
          </div>
          <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Reset Station</h1>
          <p className={`text-lg sm:text-xl mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Take a break. Recenter. Return stronger.</p>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {completedSessions.size} session{completedSessions.size !== 1 ? 's' : ''} completed
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
          {categories.map(category => {
            const Icon = category.icon;
            const styles = getCategoryStyles(category.color);
            const isSelected = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                className={`rounded-2xl p-6 text-left transition-all transform hover:scale-105 border-2 ${
                  isSelected 
                    ? `bg-gradient-to-br ${styles.gradient} text-white border-transparent`
                    : darkMode 
                      ? 'bg-slate-800 border-slate-700 hover:border-slate-600' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isSelected ? 'bg-white/20' : styles.bg}`}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : styles.text}`} />
                </div>
                <h3 className={`text-lg font-bold mb-1 ${isSelected ? 'text-white' : darkMode ? 'text-white' : 'text-slate-900'}`}>{category.name}</h3>
                <p className={`text-sm ${isSelected ? 'text-white/80' : darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{category.description}</p>
              </button>
            );
          })}
        </div>

        {selectedCategory && (
          <div className="mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center space-x-2 ${darkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}
            >
              <X className="w-5 h-5" />
              <span>Clear filter</span>
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredVideos.map(video => {
            const isCompleted = completedSessions.has(video.id);
            const category = getCategoryForVideo(video.category);
            const styles = getCategoryStyles(category.color);
            
            return (
              <div
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className={`rounded-2xl overflow-hidden border transition-all cursor-pointer group hover:shadow-xl ${
                  darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`relative h-48 flex items-center justify-center bg-gradient-to-br ${styles.gradient}`}>
                  <span className="text-7xl group-hover:scale-110 transition-transform">{video.thumbnail}</span>
                  {isCompleted && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <Play className="w-16 h-16 text-white" />
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span className={`text-sm font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{video.duration}</span>
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{video.title}</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{video.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-3xl max-w-4xl w-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div>
                <h2 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedVideo.title}</h2>
                <p className={`flex items-center space-x-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Clock className="w-4 h-4" />
                  <span>{selectedVideo.duration}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative aspect-video bg-black">
              {selectedVideo.youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <div className="text-center">
                    <div className="text-6xl mb-4">{selectedVideo.thumbnail}</div>
                    <p className={`text-lg mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Video coming soon</p>
                    <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Check back after videos are added</p>
                  </div>
                </div>
              )}
            </div>

            <div className={`p-6 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <p className={`mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{selectedVideo.description}</p>
              <div className="flex space-x-4">
                {!completedSessions.has(selectedVideo.id) && (
                  <button
                    onClick={() => markComplete(selectedVideo.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Mark as Completed</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedVideo(null)}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold transition ${
                    darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
