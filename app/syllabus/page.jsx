'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen, Upload, FileText, X, CheckCircle2,
  Loader2, ArrowLeft, LayoutDashboard, AlertCircle,
} from 'lucide-react';
import { useTheme, useAuth } from '../providers';
import { supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.png,.jpg,.jpeg';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function SyllabusPage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();

  // step: 'upload' | 'loading' | 'results' | 'saving' | 'success'
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(null); // { courseName, semester, year, assignments[] }
  const [selected, setSelected] = useState(new Set()); // indices of checked assignments
  const [savedCount, setSavedCount] = useState(0);
  const [savedBoardName, setSavedBoardName] = useState('');

  const fileInputRef = useRef(null);

  // ── File selection helpers ─────────────────────────────────────
  const handleFileSelect = (selectedFile) => {
    setError('');
    if (!selectedFile) return;
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File is too large. Please upload a file under 10MB.');
      return;
    }
    const name = selectedFile.name.toLowerCase();
    const valid = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg'].some((ext) =>
      name.endsWith(ext)
    );
    if (!valid) {
      setError('Unsupported file type. Please upload a PDF, DOCX, DOC, PNG, JPG, or JPEG.');
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleInputChange = (e) => {
    const chosen = e.target.files[0];
    if (chosen) handleFileSelect(chosen);
  };

  const resetUpload = () => {
    setFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Analyze ────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!file) return;
    setError('');
    setStep('loading');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/parse-syllabus', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
        setStep('upload');
        return;
      }

      const allIndices = new Set(data.assignments.map((_, i) => i));
      setParsed(data);
      setSelected(allIndices);
      setStep('results');
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      setStep('upload');
    }
  };

  // ── Selection helpers ──────────────────────────────────────────
  const toggleAssignment = (index) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === parsed.assignments.length) setSelected(new Set());
    else setSelected(new Set(parsed.assignments.map((_, i) => i)));
  };

  // ── Create tasks ───────────────────────────────────────────────
  const handleCreateTasks = async () => {
    if (!user) return;
    setStep('saving');

    try {
      const chosenAssignments = parsed.assignments.filter((_, i) => selected.has(i));

      const insertResults = await Promise.all(
        chosenAssignments.map((assignment) =>
          supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              title: assignment.title,
              description: `From ${parsed.courseName} syllabus`,
              status: 'in_progress',
              steps: [],
              completed_steps: 0,
              total_steps: 0,
              start_time: new Date().toISOString(),
              due_date: assignment.dueDate || null,
              priority: null,
            })
            .select()
            .single()
        )
      );

      const insertedTaskIds = insertResults
        .filter((r) => !r.error && r.data)
        .map((r) => r.data.id);

      const boardName = `${parsed.courseName} · ${parsed.semester} ${parsed.year}`;
      let existingBoards = [];
      try {
        existingBoards = JSON.parse(localStorage.getItem('task-boards') || '[]');
      } catch {
        existingBoards = [];
      }
      const newBoard = { id: Date.now().toString(), name: boardName, taskIds: insertedTaskIds };
      localStorage.setItem('task-boards', JSON.stringify([...existingBoards, newBoard]));

      setSavedCount(insertedTaskIds.length);
      setSavedBoardName(boardName);
      setStep('success');
    } catch (err) {
      setError('Failed to create tasks. Please try again.');
      setStep('results');
    }
  };

  // ── Reset ──────────────────────────────────────────────────────
  const handleStartOver = () => {
    setFile(null);
    setParsed(null);
    setSelected(new Set());
    setError('');
    setSavedCount(0);
    setSavedBoardName('');
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDueDate = (isoString) => {
    if (!isoString) return 'No date';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch { return 'No date'; }
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
            darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'
          }`}>
            <BookOpen className="w-4 h-4" />
            <span>Syllabus Import</span>
          </div>
          <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Syllabus Planner
          </h1>
          <p className={`text-lg sm:text-xl ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Upload your syllabus and let AI extract every deadline into your dashboard
          </p>
        </div>

        {/* Auth guard */}
        {!user ? (
          <div className={`rounded-2xl p-12 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <BookOpen className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Sign in to use the Syllabus Planner
            </h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
              Create an account or sign in to import your syllabus and manage your tasks.
            </p>
          </div>
        ) : (
          <>
            {/* Error banner */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* ── Upload step ── */}
            {step === 'upload' && (
              <div className={`rounded-2xl p-8 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                    file ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    dragOver
                      ? darkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-400 bg-blue-50'
                      : file
                        ? darkMode ? 'border-emerald-600 bg-emerald-900/10' : 'border-emerald-400 bg-emerald-50'
                        : darkMode ? 'border-slate-600 hover:border-slate-400' : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    onChange={handleInputChange}
                    className="hidden"
                  />

                  {file ? (
                    <div className="flex items-center justify-center space-x-3">
                      <FileText className={`w-8 h-8 flex-shrink-0 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <div className="text-left">
                        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{file.name}</p>
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                        className={`ml-2 p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className={`w-10 h-10 mx-auto mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <p className={`text-lg font-semibold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Drop your syllabus here
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>or click to browse</p>
                      <p className={`text-xs mt-3 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                        PDF, DOCX, DOC, PNG, JPG, JPEG — max 10MB
                      </p>
                    </>
                  )}
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={!file}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Analyze Syllabus</span>
                </button>
              </div>
            )}

            {/* ── Loading step ── */}
            {step === 'loading' && (
              <div className={`rounded-2xl p-12 border text-center transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  AI is reading your syllabus...
                </p>
                <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Extracting assignments and due dates
                </p>
              </div>
            )}

            {/* ── Results step ── */}
            {step === 'results' && parsed && (
              <div className="space-y-6">
                {/* Course summary */}
                <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Syllabus parsed successfully</span>
                  </div>
                  <h2 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {parsed.courseName}
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {parsed.semester} {parsed.year} &mdash; {parsed.assignments.length} items found
                  </p>
                </div>

                {/* Assignments list */}
                <div className={`rounded-2xl border overflow-hidden transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <p className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Assignments & Deadlines
                    </p>
                    <button
                      onClick={toggleAll}
                      className={`text-sm font-semibold transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      {selected.size === parsed.assignments.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                    {parsed.assignments.map((assignment, index) => {
                      const isChecked = selected.has(index);
                      return (
                        <label
                          key={index}
                          className={`flex items-center space-x-4 px-6 py-3.5 cursor-pointer transition-colors ${
                            isChecked
                              ? darkMode ? 'bg-slate-800 hover:bg-slate-750' : 'bg-white hover:bg-slate-50'
                              : darkMode ? 'bg-slate-800/50 opacity-50' : 'bg-slate-50 opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAssignment(index)}
                            className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {assignment.title}
                            </p>
                          </div>
                          <span className={`text-xs flex-shrink-0 font-semibold px-2 py-1 rounded-full ${
                            assignment.dueDate
                              ? darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                              : darkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {formatDueDate(assignment.dueDate)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleStartOver}
                    className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold transition ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Start Over</span>
                  </button>
                  <button
                    onClick={handleCreateTasks}
                    disabled={selected.size === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Add {selected.size} Task{selected.size !== 1 ? 's' : ''} to Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Saving step ── */}
            {step === 'saving' && (
              <div className={`rounded-2xl p-12 border text-center transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Creating your tasks...
                </p>
              </div>
            )}

            {/* ── Success step ── */}
            {step === 'success' && (
              <div className={`rounded-2xl p-10 border text-center transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="text-6xl mb-6">🎓</div>
                <h2 className={`text-3xl font-bold mb-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {savedCount} task{savedCount !== 1 ? 's' : ''} added!
                </h2>
                <p className={`mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Your deadlines are now in your dashboard.
                </p>
                <p className={`text-sm mb-8 font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Board created: {savedBoardName}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleStartOver}
                    className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                  >
                    Upload Another Syllabus
                  </button>
                  <Link
                    href="/dashboard"
                    className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-[1.02]"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Go to Dashboard</span>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
