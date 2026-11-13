import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, User, Send, Sparkles, Award, RotateCcw, LayoutDashboard, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function TeacherBotChat({
  loop,
  turns = [],
  onTurnAdded,
  onRestartPractice
}) {
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
  const isComplete = Boolean(lastTurn?.is_complete || turns.length >= 3);
  const currentTurnNumber = turns.length + 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!explanation.trim() || submitting || isComplete) return;

    try {
      setSubmitting(true);
      const res = await api.submitTeachBack(loop.id, explanation);
      if (res?.turn && onTurnAdded) {
        onTurnAdded(res.turn);
        setExplanation('');
      }
    } catch (err) {
      alert(`Error submitting teach-back: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bot Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Chat Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Friendly Teacher Bot
              </h3>
              <p className="text-xs text-slate-500">
                Feynman Teach-Back Partner • Turn {Math.min(currentTurnNumber, 3)} of 3
              </p>
            </div>
          </div>

          {isComplete && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Teach-Back Complete
            </span>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {/* Initial Greeting */}
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl rounded-tl-none p-4 max-w-xl text-sm text-slate-800 leading-relaxed shadow-xs">
              <p className="font-semibold text-indigo-950 mb-1">
                Hey there! 👋 Ready to test your mastery?
              </p>
              <p>
                Teach <strong>"{loop.title}"</strong> back to me in your own words. Pretend I'm a close friend who missed class today and needs the intuition. What's the main idea, why does it matter, and how would you explain it simply?
              </p>
            </div>
          </div>

          {/* Conversation History */}
          {turns.map((t, idx) => (
            <React.Fragment key={t.id || idx}>
              {/* User Explanation */}
              <div className="flex items-start justify-end space-x-3">
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none p-4 max-w-xl text-sm leading-relaxed shadow-sm">
                  {t.user_explanation}
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {/* Bot Response */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-4 max-w-xl text-sm text-slate-800 leading-relaxed shadow-xs">
                  <p>{t.bot_reply}</p>

                  {/* Sub-scores preview per turn if present */}
                  {t.overall_score && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center space-x-4 text-xs font-semibold text-slate-500">
                      <span>Clarity: <strong className="text-slate-800">{t.clarity_score}%</strong></span>
                      <span>Accuracy: <strong className="text-slate-800">{t.accuracy_score}%</strong></span>
                      <span>Score: <strong className="text-indigo-600">{t.overall_score}%</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Input Bar or Completed State */}
        {!isComplete ? (
          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white">
            <div className="relative">
              <textarea
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain the core concept in your own words (analogies welcome!)..."
                className="w-full rounded-xl border border-slate-300 p-3.5 pr-24 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-inner resize-none"
                required
              />
              <button
                type="submit"
                disabled={submitting || !explanation.trim()}
                className="absolute right-3 bottom-3 inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send
                  </>
                )}
              </button>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
              <span>Feynman rule: if you can't explain it simply, simplify it further!</span>
              <span>Turn {currentTurnNumber} of 3</span>
            </div>
          </form>
        ) : (
          <div className="p-6 bg-slate-50 border-t border-slate-200">
            {/* Final Mastery Scorecard */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      Teach-Back Mastery Scorecard
                    </h4>
                    <p className="text-xs text-slate-500">
                      Evaluated on Clarity, Technical Accuracy, and Completeness
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-extrabold text-indigo-600">
                    {lastTurn?.overall_score || loop.mastery_score || 0}%
                  </span>
                  <span className="block text-xs font-semibold text-slate-400 uppercase">
                    Overall Mastery
                  </span>
                </div>
              </div>

              {/* Sub-score Badges */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-xl text-center">
                  <span className="text-xs text-slate-500 font-medium block">Clarity</span>
                  <span className="text-lg font-bold text-slate-800">{lastTurn?.clarity_score || 0}%</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl text-center">
                  <span className="text-xs text-slate-500 font-medium block">Accuracy</span>
                  <span className="text-lg font-bold text-slate-800">{lastTurn?.accuracy_score || 0}%</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl text-center">
                  <span className="text-xs text-slate-500 font-medium block">Completeness</span>
                  <span className="text-lg font-bold text-slate-800">{lastTurn?.completeness_score || 0}%</span>
                </div>
              </div>
            </div>

            {/* Loop Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={onRestartPractice}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                Practice Another Question
              </button>

              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

