import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Calendar, Clock, CheckCircle2, Sparkles, Zap, Target, Trophy } from 'lucide-react';

export default function AITaskPlanner() {
  const navigate = useNavigate();
  const [task, setTask] = useState('');
  const [deadline, setDeadline] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [encouragement, setEncouragement] = useState('');
  const [lastEncouragement, setLastEncouragement] = useState('');
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [draggedStep, setDraggedStep] = useState(null);
  const [showFinalCelebration, setShowFinalCelebration] = useState(false);
  const [taskStartTime, setTaskStartTime] = useState(null);
  const [streak, setStreak] = useState(0);
  const [lastCompletionDate, setLastCompletionDate] = useState(null);
  const [clarificationNeeded, setClarificationNeeded] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [clarificationAnswers, setClarificationAnswers] = useState({});

  const encouragements = [
    "Great job!",
    "Keep up the good work!",
    "You're on a roll!",
    "Crushing it!",
    "Momentum building!",
    "You're unstoppable!",
    "Amazing progress!",
    "Way to go!"
  ];

  useEffect(() => {
    const loadStreakData = async () => {
      try {
        const streakData = await window.storage.get('user-streak');
        if (streakData) {
          const data = JSON.parse(streakData.value);
          setStreak(data.streak || 0);
          setLastCompletionDate(data.lastCompletionDate || null);
        }
      } catch (err) {
        console.log('No existing streak data');
      }
    };
    loadStreakData();
  }, []);

  const getCurrentUTCDate = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  };

  const updateStreak = async () => {
    const today = getCurrentUTCDate();
    const todayString = today.toISOString().split('T')[0];

    let newStreak = streak;
    
    if (!lastCompletionDate) {
      newStreak = 1;
    } else {
      const lastDate = new Date(lastCompletionDate);
      const lastDateString = lastDate.toISOString().split('T')[0];
      
      if (lastDateString === todayString) {
        return;
      }
      
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      
      if (lastDateString === yesterdayString) {
        newStreak = streak + 1;
      } else {
        newStreak = 1;
      }
    }

    setStreak(newStreak);
    setLastCompletionDate(todayString);

    try {
      await window.storage.set('user-streak', JSON.stringify({
        streak: newStreak,
        lastCompletionDate: todayString
      }));
    } catch (err) {
      console.error('Error saving streak:', err);
    }
  };

  const generatePlan = async () => {
    if (!task || !deadline) return;
    
    setLoading(true);
    
    if (!clarificationNeeded) {
      const clarificationPrompt = `You are an AI productivity assistant. A user wants help breaking down a task.

Task: ${task}
Deadline: ${deadline}

Analyze if this task description is specific enough to create a detailed plan. If the task is vague or missing key information, ask 2-3 clarifying questions. If it's specific enough, respond with "SUFFICIENT".

For vague tasks, ask about:
- Specific subject/topic if not mentioned
- Length/scope (word count, number of slides, number of problems, pages, etc.)
- Any special requirements or format

Respond ONLY with valid JSON in this exact format, no preamble or markdown:
{
  "needsClarification": true or false,
  "questions": ["question 1", "question 2", "question 3"] or []
}`;

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 500,
            messages: [
              { role: "user", content: clarificationPrompt }
            ],
          })
        });

        const data = await response.json();
        const text = data.content.map(item => item.text || "").join("\n");
        const clean = text.replace(/```json|```/g, "").trim();
        const result = JSON.parse(clean);

        if (result.needsClarification) {
          setClarificationQuestions(result.questions);
          setClarificationNeeded(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking clarification:", err);
      }
    }

    let taskContext = task;
    if (Object.keys(clarificationAnswers).length > 0) {
      taskContext += "\n\nAdditional details:\n";
      clarificationQuestions.forEach((q, i) => {
        if (clarificationAnswers[i]) {
          taskContext += `- ${q} ${clarificationAnswers[i]}\n`;
        }
      });
    }
    
    const prompt = `You are an AI productivity assistant helping students and professionals break down tasks into micro-steps.

Task: ${taskContext}
Deadline: ${deadline}

Generate a realistic, actionable plan with the appropriate number of micro-steps (typically 3-8 depending on complexity) that will help complete this task on time. Each step should:
- Be small and specific (15-45 minutes of work)
- Build on previous steps logically
- Be easy to start (low activation energy)
- Include estimated time
- Number of steps should match task complexity (simpler tasks = fewer steps, complex tasks = more steps)

Respond ONLY with valid JSON in this exact format, no preamble or markdown:
{
  "taskTitle": "brief rewrite of the task",
  "analysis": "one sentence about the approach",
  "totalEstimatedTime": "X hours",
  "steps": [
    {
      "id": 1,
      "title": "step title",
      "description": "what to do",
      "estimatedTime": "X min",
      "when": "suggested timing like 'Today' or 'Tomorrow morning'"
    }
  ]
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { role: "user", content: prompt }
          ],
        })
      });

      const data = await response.json();
      const text = data.content.map(item => item.text || "").join("\n");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      
      setPlan(parsed);
      setCompletedSteps(new Set());
      setClarificationNeeded(false);
      setClarificationQuestions([]);
      setClarificationAnswers({});
      setTaskStartTime(Date.now());
      
      await saveTaskToStorage(parsed, 'in-progress', []);
    } catch (err) {
      console.error("Error generating plan:", err);
      alert("Oops! Couldn't generate a plan. Try rephrasing your task.");
    }
    
    setLoading(false);
  };

  const markComplete = (stepId) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
    
    const newTotalCompletions = totalCompletions + 1;
    setTotalCompletions(newTotalCompletions);
    
    saveTaskToStorage(plan, 'in-progress', Array.from(newCompleted));
    
    if (newCompleted.size === plan.steps.length) {
      const completionTime = (Date.now() - taskStartTime) / (1000 * 60 * 60);
      saveTaskToStorage(plan, 'completed', Array.from(newCompleted), completionTime);
      triggerFinalCelebration();
    } else {
      triggerCelebration(newTotalCompletions);
    }
    
    updateStreak();
  };

  const triggerCelebration = (completionCount) => {
    let availableEncouragements = [...encouragements];
    
    if (completionCount === 1) {
      availableEncouragements = availableEncouragements.filter(msg => msg !== "You're on a roll!");
    }
    
    if (lastEncouragement) {
      availableEncouragements = availableEncouragements.filter(msg => msg !== lastEncouragement);
    }
    
    const randomEncouragement = availableEncouragements[Math.floor(Math.random() * availableEncouragements.length)];
    
    setEncouragement(randomEncouragement);
    setLastEncouragement(randomEncouragement);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
  };

  const triggerFinalCelebration = () => {
    setShowFinalCelebration(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      if (clarificationNeeded) {
        generatePlan();
      } else if (task && deadline) {
        generatePlan();
      }
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedStep(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedStep === null || draggedStep === dropIndex) return;
    
    const newSteps = [...plan.steps];
    const draggedItem = newSteps[draggedStep];
    
    newSteps.splice(draggedStep, 1);
    newSteps.splice(dropIndex, 0, draggedItem);
    
    setPlan({
      ...plan,
      steps: newSteps
    });
    
    setDraggedStep(null);
  };

  const handleDragEnd = () => {
    setDraggedStep(null);
  };

  const saveTaskToStorage = async (taskPlan, status, completedStepIds, completionTime = null) => {
    try {
      const tasksResult = await window.storage.get('user-tasks');
      const existingTasks = tasksResult ? JSON.parse(tasksResult.value) : [];
      
      const taskId = taskPlan.id || Date.now();
      const taskData = {
        id: taskId,
        title: taskPlan.taskTitle,
        deadline: deadline,
        status: status,
        completionTime: completionTime,
        completedDate: status === 'completed' ? new Date().toISOString() : null,
        createdAt: taskStartTime || Date.now(),
        steps: taskPlan.steps.map(step => ({
          id: step.id,
          title: step.title,
          description: step.description,
          estimatedTime: step.estimatedTime,
          when: step.when,
          completed: completedStepIds.includes(step.id)
        }))
      };
      
      const taskIndex = existingTasks.findIndex(t => t.id === taskId);
      if (taskIndex >= 0) {
        existingTasks[taskIndex] = taskData;
      } else {
        existingTasks.push(taskData);
      }
      
      await window.storage.set('user-tasks', JSON.stringify(existingTasks));
      
      setPlan({ ...taskPlan, id: taskId });
      
      if (status === 'completed') {
        const highestStreakResult = await window.storage.get('highest-streak');
        const currentHighest = highestStreakResult ? JSON.parse(highestStreakResult.value) : 0;
        if (streak > currentHighest) {
          await window.storage.set('highest-streak', JSON.stringify(streak));
        }
      }
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const completionPercentage = plan ? (completedSteps.size / plan.steps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Brain className="w-12 h-12 text-yellow-400" />
            <h1 className="text-4xl font-bold">AI Adherence Planner</h1>
          </div>
          <p className="text-xl text-indigo-200">Break any task into bite-sized, achievable steps</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-yellow-400 hover:text-yellow-300"
          >
            ← Back to Home
          </button>
        </div>

        {showCelebration && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
              <div className="animate-bounce mb-4">
                <Trophy className="w-32 h-32 text-yellow-400 drop-shadow-2xl animate-pulse" />
              </div>
              <p className="text-3xl font-bold text-yellow-400 animate-pulse">{encouragement}</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(12)].map((_, i) => (
                <Sparkles
                  key={i}
                  className="absolute w-8 h-8 text-yellow-400 animate-ping"
                  style={{
                    transform: `rotate(${i * 30}deg) translateY(-100px)`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {showFinalCelebration && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 pointer-events-auto">
            <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-12 max-w-2xl w-full text-center border-4 border-yellow-400 pointer-events-auto">
              <div className="mb-6">
                <div className="text-8xl mb-4 animate-bounce">🎉</div>
                <div className="flex justify-center space-x-4 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-5xl animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
              
              <h2 className="text-4xl font-bold mb-4 text-yellow-400">Congratulations!</h2>
              <p className="text-2xl text-white mb-8">You have completed this task.</p>
              
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setPlan(null);
                    setTask('');
                    setDeadline('');
                    setShowFinalCelebration(false);
                    setCompletedSteps(new Set());
                    setTaskStartTime(null);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-900 px-8 py-4 rounded-xl font-bold text-xl hover:from-yellow-300 hover:to-orange-400 transition transform hover:scale-105"
                >
                  Plan Another Task
                </button>
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-white/30 transition"
                >
                  Check Dashboard
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-white/30 transition"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {!plan ? (
          clarificationNeeded ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2 flex items-center space-x-2">
                  <Brain className="w-6 h-6 text-yellow-400" />
                  <span>Just a few quick questions...</span>
                </h2>
                <p className="text-indigo-200">Help me create a better plan for you!</p>
              </div>
              
              <div className="space-y-6">
                {clarificationQuestions.map((question, index) => (
                  <div key={index}>
                    <label className="block text-lg font-semibold mb-2">{question}</label>
                    <input
                      type="text"
                      value={clarificationAnswers[index] || ''}
                      onChange={(e) => setClarificationAnswers({
                        ...clarificationAnswers,
                        [index]: e.target.value
                      })}
                      onKeyPress={handleKeyPress}
                      placeholder="Your answer..."
                      className="w-full px-6 py-4 rounded-xl text-gray-900 text-lg placeholder-gray-400 focus:ring-4 focus:ring-yellow-400 transition"
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => {
                    setClarificationNeeded(false);
                    setClarificationQuestions([]);
                    setClarificationAnswers({});
                  }}
                  disabled={loading}
                  className="flex-1 bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back
                </button>
                <button
                  onClick={generatePlan}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-900 px-8 py-4 rounded-xl font-bold text-xl hover:from-yellow-300 hover:to-orange-400 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-900"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      <span>Generate Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-2">What do you need to do?</label>
                <input
                  type="text"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Write essay for history class, Finish presentation for Business 101"
                  className="w-full px-6 py-4 rounded-xl text-gray-900 text-lg placeholder-gray-400 focus:ring-4 focus:ring-yellow-400 transition"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2">When's it due?</label>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Next Tuesday, Friday at 5pm, December 20th"
                  className="w-full px-6 py-4 rounded-xl text-gray-900 text-lg placeholder-gray-400 focus:ring-4 focus:ring-yellow-400 transition"
                  disabled={loading}
                />
              </div>

              <button
                onClick={generatePlan}
                disabled={loading || !task || !deadline}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-indigo-900 px-8 py-4 rounded-xl font-bold text-xl hover:from-yellow-300 hover:to-orange-400 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-900"></div>
                    <span>AI is thinking...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    <span>Generate My Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold">Your Progress</span>
                <span className="text-2xl font-bold text-yellow-400">{Math.round(completionPercentage)}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-indigo-200">
                  {completedSteps.size} of {plan.steps.length} steps complete
                </span>
                {streak > 0 && (
                  <div className="flex items-center space-x-2 bg-orange-500/30 px-3 py-1 rounded-full">
                    <span className="text-2xl">🔥</span>
                    <span className="text-lg font-bold">{streak}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center space-x-2">
                <Target className="w-6 h-6 text-yellow-400" />
                <span>{plan.taskTitle}</span>
              </h2>
              <p className="text-indigo-200 mb-4">{plan.analysis}</p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span>Est. {plan.totalEstimatedTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-yellow-400" />
                  <span>Due: {deadline}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-indigo-300 mb-2">💡 Tip: Drag and drop to reorder your steps</p>
              {plan.steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isDragging = draggedStep === index;
                return (
                  <div
                    key={step.id}
                    draggable={!isCompleted}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 transition-all duration-300 ${
                      isCompleted ? 'opacity-60 border-2 border-green-400' : 'border-2 border-transparent cursor-move hover:border-yellow-400'
                    } ${isDragging ? 'opacity-50 scale-95' : ''}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-8 h-8 text-green-400" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-yellow-400 text-indigo-900 flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-2 ${isCompleted ? 'line-through' : ''}`}>
                          {step.title}
                        </h3>
                        <p className="text-indigo-200 mb-3">{step.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="bg-white/20 px-3 py-1 rounded-full">
                              ⏱️ {step.estimatedTime}
                            </span>
                            <span className="bg-white/20 px-3 py-1 rounded-full">
                              📅 {step.when}
                            </span>
                          </div>
                          {!isCompleted && (
                            <button
                              onClick={() => markComplete(step.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition transform hover:scale-105 flex items-center space-x-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark Complete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setPlan(null);
                setTask('');
                setDeadline('');
              }}
              className="w-full bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition"
            >
              Plan Another Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
