import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Plus, Mic, MicOff, LogOut, Calendar, Target, Coffee, BookOpen, Briefcase, GraduationCap } from 'lucide-react';

export default function FocusPods() {
  const navigate = useNavigate();
  const [activePods, setActivePods] = useState([]);
  const [myPods, setMyPods] = useState([]);
  const [currentPod, setCurrentPod] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [podName, setPodName] = useState('');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState('study');
  const [maxParticipants, setMaxParticipants] = useState('4');

  const categories = [
    { id: 'study', name: 'Study Session', icon: BookOpen, color: 'bg-blue-500' },
    { id: 'work', name: 'Work Sprint', icon: Briefcase, color: 'bg-purple-500' },
    { id: 'writing', name: 'Writing Time', icon: Target, color: 'bg-green-500' },
    { id: 'exam', name: 'Exam Prep', icon: GraduationCap, color: 'bg-red-500' },
    { id: 'break', name: 'Coffee Break', icon: Coffee, color: 'bg-orange-500' }
  ];

  useEffect(() => {
    loadPods();
  }, []);

  const loadPods = async () => {
    try {
      const result = await window.storage.get('focus-pods', true);
      if (result) {
        const pods = JSON.parse(result.value);
        const now = Date.now();
        const active = pods.filter(pod => now < pod.endTime);
        setActivePods(active);
        
        if (active.length !== pods.length) {
          await window.storage.set('focus-pods', JSON.stringify(active), true);
        }
      }
    } catch (err) {
      console.log('No existing pods');
    }
  };

  const createPod = async () => {
    if (!podName.trim()) return;

    const newPod = {
      id: Date.now(),
      name: podName,
      category: category,
      duration: parseInt(duration),
      maxParticipants: parseInt(maxParticipants),
      participants: 1,
      createdAt: Date.now(),
      endTime: Date.now() + (parseInt(duration) * 60 * 1000),
      creator: 'User-' + Math.random().toString(36).substr(2, 6),
      roomUrl: `https://procrastination.daily.co/pod-${Date.now()}`
    };

    try {
      const result = await window.storage.get('focus-pods', true);
      const existingPods = result ? JSON.parse(result.value) : [];
      const updatedPods = [...existingPods, newPod];
      await window.storage.set('focus-pods', JSON.stringify(updatedPods), true);
      
      setActivePods(updatedPods);
      setShowCreateForm(false);
      setPodName('');
      
      joinPod(newPod);
    } catch (err) {
      console.error('Error creating pod:', err);
    }
  };

  const joinPod = async (pod) => {
    if (pod.participants >= pod.maxParticipants) {
      alert('This pod is full!');
      return;
    }

    const updatedPods = activePods.map(p => 
      p.id === pod.id ? { ...p, participants: p.participants + 1 } : p
    );
    setActivePods(updatedPods);
    
    try {
      await window.storage.set('focus-pods', JSON.stringify(updatedPods), true);
    } catch (err) {
      console.error('Error updating pod:', err);
    }

    setCurrentPod(pod);
  };

  const leavePod = async () => {
    if (!currentPod) return;

    const updatedPods = activePods.map(p => 
      p.id === currentPod.id ? { ...p, participants: Math.max(0, p.participants - 1) } : p
    );
    setActivePods(updatedPods);
    
    try {
      await window.storage.set('focus-pods', JSON.stringify(updatedPods), true);
    } catch (err) {
      console.error('Error updating pod:', err);
    }

    setCurrentPod(null);
    setIsMuted(false);
  };

  const getCategoryIcon = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat : categories[0];
  };

  const formatTimeRemaining = (endTime) => {
    const remaining = Math.max(0, endTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    return minutes > 0 ? `${minutes} min left` : 'Ending soon';
  };

  if (currentPod) {
    const CategoryIcon = getCategoryIcon(currentPod.category).icon;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4">
        <div className="max-w-5xl mx-auto py-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className={`${getCategoryIcon(currentPod.category).color} rounded-full p-3`}>
                  <CategoryIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{currentPod.name}</h2>
                  <p className="text-indigo-300">
                    {currentPod.participants} of {currentPod.maxParticipants} participants • {formatTimeRemaining(currentPod.endTime)}
                  </p>
                </div>
              </div>
              <button
                onClick={leavePod}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition flex items-center space-x-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Leave Pod</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-8 mb-6 border-4 border-purple-500">
            <div className="text-center mb-8">
              <div className="inline-block bg-green-500 rounded-full p-4 mb-4 animate-pulse">
                <Mic className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Connected to Focus Pod</h3>
              <p className="text-indigo-300">Audio call in progress</p>
            </div>

            <div className="bg-black rounded-2xl aspect-video mb-6 flex items-center justify-center">
              <div className="text-center p-8">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">Daily.co Audio Room</p>
                <p className="text-gray-500 text-sm max-w-md">
                  In production, this would be a Daily.co iframe embed for the audio call.
                  You'll need to set up a Daily.co account and generate room URLs via their API.
                </p>
                <div className="mt-4">
                  <code className="text-xs text-gray-600 bg-gray-900 px-3 py-1 rounded block">
                    {currentPod.roomUrl}
                  </code>
                </div>
                <div className="mt-6 text-left max-w-md mx-auto text-xs text-gray-500 space-y-2">
                  <p><strong>Setup steps:</strong></p>
                  <p>1. Create Daily.co account (free tier available)</p>
                  <p>2. Use their REST API to create rooms</p>
                  <p>3. Embed with: <code className="bg-gray-800 px-1">&lt;iframe src="room-url" allow="microphone"&gt;</code></p>
                  <p>4. Set audio-only mode in room config</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'} text-white px-8 py-4 rounded-xl font-semibold transition flex items-center space-x-2`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">📚 Focus Tips</h3>
            <ul className="space-y-2 text-indigo-200">
              <li>• Stay muted unless you need to chat</li>
              <li>• Use the pomodoro technique: 25 min work, 5 min break</li>
              <li>• Share your goals at the start of the session</li>
              <li>• Celebrate wins together at the end!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Users className="w-12 h-12 text-yellow-400" />
            <h1 className="text-5xl font-bold">Focus Pods</h1>
          </div>
          <p className="text-xl text-indigo-200">Work alongside others. Stay accountable. Get things done.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-yellow-400 hover:text-yellow-300"
          >
            ← Back to Home
          </button>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-900 px-8 py-4 rounded-xl font-bold text-xl hover:from-yellow-300 hover:to-orange-400 transition transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <Plus className="w-6 h-6" />
            <span>Create New Pod</span>
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold mb-6">Create Your Focus Pod</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-2">Pod Name</label>
                <input
                  type="text"
                  value={podName}
                  onChange={(e) => setPodName(e.target.value)}
                  placeholder="e.g., Morning Study Crew, Essay Writing Party"
                  className="w-full px-6 py-4 rounded-xl text-gray-900 text-lg placeholder-gray-400"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-lg font-semibold mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-6 py-4 rounded-xl text-gray-900 text-lg"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-2">Duration (min)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-6 py-4 rounded-xl text-gray-900 text-lg"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-2">Max People</label>
                  <select
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full px-6 py-4 rounded-xl text-gray-900 text-lg"
                  >
                    <option value="2">2 people</option>
                    <option value="3">3 people</option>
                    <option value="4">4 people</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createPod}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition"
                >
                  Create Pod
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-3xl font-bold mb-6">Active Pods</h2>
          
          {activePods.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePods.map(pod => {
                const CategoryIcon = getCategoryIcon(pod.category).icon;
                const categoryData = getCategoryIcon(pod.category);
                const isFull = pod.participants >= pod.maxParticipants;
                
                return (
                  <div
                    key={pod.id}
                    className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`${categoryData.color} rounded-full p-3`}>
                        <CategoryIcon className="w-6 h-6" />
                      </div>
                      <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        {formatTimeRemaining(pod.endTime)}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2">{pod.name}</h3>
                    <p className="text-indigo-300 text-sm mb-4">{categoryData.name}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{pod.participants}/{pod.maxParticipants}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{pod.duration} min</span>
                      </div>
                    </div>

                    <button
                      onClick={() => joinPod(pod)}
                      disabled={isFull}
                      className={`w-full ${
                        isFull 
                          ? 'bg-gray-500 cursor-not-allowed' 
                          : 'bg-green-500 hover:bg-green-600'
                      } text-white px-6 py-3 rounded-xl font-semibold transition`}
                    >
                      {isFull ? 'Full' : 'Join Pod'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/10 backdrop-blur-lg rounded-2xl">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl text-indigo-300 mb-2">No active pods right now</p>
              <p className="text-indigo-400">Be the first to create one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
