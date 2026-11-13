import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import StageStepper from '../components/loop/StageStepper';
import StepBreakdownList from '../components/loop/StepBreakdownList';
import PracticePanel from '../components/loop/PracticePanel';
import TeacherBotChat from '../components/loop/TeacherBotChat';
import { ArrowLeft, Loader2, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

export default function LoopWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loop, setLoop] = useState(null);
  const [practiceAttempts, setPracticeAttempts] = useState([]);
  const [teachBackTurns, setTeachBackTurns] = useState([]);
  const [activeStage, setActiveStage] = useState('explain');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLoopData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getLoopById(id);
      if (data?.loop) {
        setLoop(data.loop);
        setPracticeAttempts(data.practiceAttempts || []);
        setTeachBackTurns(data.teachBackTurns || []);
        setActiveStage(data.loop.current_stage || 'explain');
      }
    } catch (err) {
      setError(err.message || 'Failed to load study loop');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoopData();
  }, [id]);

  // When step is simplified by user
  const handleStepSimplified = (updatedStep) => {
    setLoop((prev) => {
      if (!prev) return prev;
      const steps = [...(prev.steps_json || [])];
      const idx = steps.findIndex((s) => s.step_number === updatedStep.step_number);
      if (idx !== -1) {
        steps[idx] = updatedStep;
      }
      return { ...prev, steps_json: steps };
    });
  };

  // Proceed to practice
  const handleProceedToPractice = async () => {
    setActiveStage('practice');
    if (practiceAttempts.length === 0) {
      try {
        const res = await api.generatePractice(id);
        if (res?.attempt) {
          setPracticeAttempts([res.attempt]);
        }
      } catch (err) {
        console.error('Failed to generate initial practice question:', err);
      }
    }
  };

  // When practice attempt is answered or generated
  const handleAttemptUpdated = (newOrUpdatedAttempt) => {
    setPracticeAttempts((prev) => {
      const idx = prev.findIndex((a) => a.id === newOrUpdatedAttempt.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newOrUpdatedAttempt;
        return copy;
      }
      return [...prev, newOrUpdatedAttempt];
    });
  };

  // Proceed to teach-back
  const handleProceedToTeachBack = () => {
    setActiveStage('teach_back');
  };

  // When teach-back turn is submitted
  const handleTurnAdded = (newTurn) => {
    setTeachBackTurns((prev) => [...prev, newTurn]);
    if (newTurn.is_complete) {
      setActiveStage('completed');
      setLoop((prev) => prev ? ({ ...prev, status: newTurn.overall_score >= 75 ? 'mastered' : 'needs_review', mastery_score: newTurn.overall_score }) : prev);
    }
  };

  // Restart practice question
  const handleRestartPractice = async () => {
    setActiveStage('practice');
    try {
      const res = await api.generatePractice(id);
      if (res?.attempt) {
        setPracticeAttempts((prev) => [...prev, res.attempt]);
      }
    } catch (err) {
      alert(`Could not start new question: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Opening your study loop session...</p>
        </div>
      </div>
    );
  }

  if (error || !loop) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Session Not Found</h3>
        <p className="text-sm text-slate-500 mb-6">{error || 'This study loop may have been deleted.'}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const currentAttempt = practiceAttempts.length > 0 ? practiceAttempts[practiceAttempts.length - 1] : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Back & Info */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
              {loop.domain.replace('_', ' ')} • {loop.depth_level}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {loop.title}
            </h1>
          </div>
        </div>

        {typeof loop.mastery_score === 'number' && (
          <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl flex items-center space-x-2 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-500">Mastery:</span>
            <span className="text-sm font-bold text-indigo-600">{loop.mastery_score}%</span>
          </div>
        )}
      </div>

      {/* 4-Stage Stepper Navigation */}
      <StageStepper
        currentStage={activeStage}
        onStageClick={(stageId) => setActiveStage(stageId)}
      />

      {/* Dynamic Stage Content View */}
      {activeStage === 'explain' && (
        <StepBreakdownList
          loop={loop}
          onStepSimplified={handleStepSimplified}
          onProceedToPractice={handleProceedToPractice}
        />
      )}

      {activeStage === 'practice' && (
        <PracticePanel
          loop={loop}
          attempt={currentAttempt}
          onAttemptUpdated={handleAttemptUpdated}
          onProceedToTeachBack={handleProceedToTeachBack}
          onGenerateNewQuestion={handleRestartPractice}
        />
      )}

      {(activeStage === 'teach_back' || activeStage === 'completed') && (
        <TeacherBotChat
          loop={loop}
          turns={teachBackTurns}
          onTurnAdded={handleTurnAdded}
          onRestartPractice={handleRestartPractice}
        />
      )}
    </div>
  );
}
