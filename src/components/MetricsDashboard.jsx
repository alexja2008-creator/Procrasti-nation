import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Flame, Zap, CheckCircle2, Clock, TrendingUp, Calendar, Archive, ChevronRight, X } from 'lucide-react';

export default function MetricsDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [highestStreak, setHighestStreak] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [quickestCompletion, setQuickestCompletion] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const tasksResult = await window.storage.get('user-tasks');
      const loadedTasks = tasksResult ? JSON.parse(tasksResult.value) : [];
      setTasks(loadedTasks);

      const streakResult = await window.storage.get('user-streak');
      if (streakResult) {
        const streakData = JSON.parse(streakResult.value);
        setCurrentStreak(streakData.streak || 0);
      }

      const highestStreakResult = await window.storage.get('highest-streak');
      const highest = highestStreakResult ? JSON.parse(highestStreakResult.value) : 0;
      setHighestStreak(Math.max(highest, currentStreak));

      const completedTasks = loadedTasks.filter(t => t.status === 'completed' && t.completionTime);
      if (completedTasks.length > 0) {
        const quickest = completedTasks.reduce((min, task) => 
          task.completionTime < min.completionTime ? task : min
        );
        setQuickestCompletion(quickest);
      }
    } catch (err) {
      console.log('No existing dashboard data');
    }
  };

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').sort((a, b) => {
    const dateA = new Date(a.deadline || '9999-12-31');
    const dateB = new Date(b.deadline || '9999-12-31');
    return dateA - dateB;
  });
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const formatTime = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hrs`;
    } else {
      return `${Math.round(hours / 24)} days`;
    }
  };

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear all dashboard data?')) {
      setTasks([]);
      setHighestStreak(0);
      setCurrentStreak(0);
      setQuickestCompletion(null);
      
      try {
        await window.storage.delete('user-tasks');
        await window.storage.delete('user-streak');
        await window.storage.delete('highest-streak');
      } catch (err) {
        console.error('Error clearing data:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4">
      <div className="max-w-6xl mx-auto py-8">
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl font-bold">Your Dashboard</h1>
          </div>
          <p className="text-xl text-indigo-200">Track your progress and celebrate your wins</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-yellow-400 hover:text-yellow-300"
          >
            ← Back to Home
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Flame className="w-8 h-8" />
              <span className="text-3xl font-bold">{currentStreak}</span>
            </div>
            <h3 className="text-lg font-semibold opacity-90">Current Streak</h3>
            <p className="text-sm opacity-75">days in a row</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8" />
              <span className="text-3xl font-bold">{highestStreak}</span>
            </div>
            <h3 className="text-lg font-semibold opacity-90">Best Streak</h3>
            <p className="text-sm opacity-75">personal record</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 className="w-8 h-8" />
              <span className="text-3xl font-bold">{completionRate}%</span>
            </div>
            <h3 className="text-lg font-semibold opacity-90">Completion Rate</h3>
            <p className="text-sm opacity-75">{completedTasks.length} of {totalTasks} tasks</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8" />
              <span className="text-3xl font-bold">
                {quickestCompletion ? formatTime(quickestCompletion.completionTime) : '--'}
              </span>
            </div>
            <h3 className="text-lg font-semibold opacity-90">Quickest Task</h3>
            <p className="text-sm opacity-75">fastest completion</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-yellow-400" />
              <span>Task Status</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Completed</span>
                  <span className="text-yellow-400 font-bold">{completedTasks.length}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">In Progress</span>
                  <span className="text-yellow-400 font-bold">{inProgressTasks.length}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? (inProgressTasks.length / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400 mb-1">{totalTasks}</p>
                <p className="text-indigo-200">Total Tasks Created</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Clock className="w-6 h-6 text-yellow-400" />
              <span>Recent Completions</span>
            </h3>
            
            {completedTasks.length > 0 ? (
              <div className="space-y-3">
                {completedTasks.slice(-5).reverse().map(task => (
                  <div key={task.id} className="bg-white/10 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="font-medium">{task.title}</span>
                    </div>
                    <span className="text-sm text-indigo-300">{formatTime(task.completionTime)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-indigo-300">
                <p>No completed tasks yet!</p>
                <p className="text-sm mt-2">Complete your first task to see it here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setShowArchive(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:from-purple-400 hover:to-indigo-500 transition transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <Archive className="w-6 h-6" />
            <span>View Completed Tasks Archive</span>
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {inProgressTasks.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
            <h3 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Clock className="w-6 h-6 text-yellow-400" />
              <span>Tasks In Progress</span>
            </h3>
            
            <div className="space-y-3">
              {inProgressTasks.map(task => {
                const completedSteps = task.steps.filter(s => s.completed).length;
                const totalSteps = task.steps.length;
                const progressPercent = (completedSteps / totalSteps) * 100;
                
                return (
                  <div key={task.id} className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{task.title}</h4>
                        <p className="text-sm text-indigo-300">Due: {task.deadline}</p>
                      </div>
                      <span className="text-yellow-400 font-bold text-lg">
                        {completedSteps}/{totalSteps}
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={clearAllData}
            className="flex-1 bg-red-500/20 text-red-300 px-6 py-3 rounded-xl font-semibold hover:bg-red-500/30 transition"
          >
            Clear All Data
          </button>
        </div>

        {showArchive && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold flex items-center space-x-2">
                  <Archive className="w-8 h-8 text-yellow-400" />
                  <span>Completed Tasks Archive</span>
                </h2>
                <button
                  onClick={() => {
                    setShowArchive(false);
                    setSelectedTask(null);
                  }}
                  className="text-white hover:text-yellow-400 transition"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              {selectedTask ? (
                <div>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="text-yellow-400 hover:text-yellow-300 mb-4 flex items-center space-x-2"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                    <span>Back to Archive</span>
                  </button>

                  <div className="bg-white/10 rounded-2xl p-6 mb-6">
                    <h3 className="text-2xl font-bold mb-2">{selectedTask.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-indigo-300">
                      <span className="px-3 py-1 rounded-full bg-green-500/30 text-green-300">
                        ✓ Completed
                      </span>
                      {selectedTask.completionTime && (
                        <span>Completed in {formatTime(selectedTask.completionTime)}</span>
                      )}
                      {selectedTask.deadline && (
                        <span>Due: {selectedTask.deadline}</span>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xl font-bold mb-4">Task Steps</h4>
                  <div className="space-y-3">
                    {selectedTask.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="bg-white/10 rounded-xl p-4 flex items-center space-x-4 opacity-60"
                      >
                        <div className="flex-shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <span className="line-through">{step.title}</span>
                          <p className="text-sm text-indigo-300 mt-1">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {completedTasks.length > 0 ? (
                    <div className="space-y-3">
                      {completedTasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="w-full bg-white/10 hover:bg-white/20 rounded-xl p-4 flex items-center justify-between transition text-left"
                        >
                          <div className="flex items-center space-x-4">
                            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">{task.title}</p>
                              <p className="text-sm text-indigo-300">
                                Completed in {formatTime(task.completionTime)}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-6 h-6 text-indigo-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-indigo-300">
                      <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-xl">No completed tasks yet!</p>
                      <p className="text-sm mt-2">Finish your first task to see it archived here.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
