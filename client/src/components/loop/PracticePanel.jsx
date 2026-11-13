import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { HelpCircle, Eye, EyeOff, CheckCircle2, XCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function PracticePanel({
  loop,
  attempt,
  onAttemptUpdated,
  onProceedToTeachBack,
  onGenerateNewQuestion
}) {
  const [userAnswer, setUserAnswer] = useState(attempt?.user_answer || '');
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isAnswered = Boolean(attempt?.answered_at);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.submitPracticeAnswer(loop.id, attempt.id, userAnswer);
      if (res?.attempt && onAttemptUpdated) {
        onAttemptUpdated(res.attempt);
      }
    } catch (err) {
      alert(`Error grading answer: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateAnother = async () => {
    try {
      setGenerating(true);
      setUserAnswer('');
      setShowHint(false);
      const res = await api.generatePractice(loop.id);
      if (res?.attempt && onAttemptUpdated) {
        onAttemptUpdated(res.attempt);
      }
    } catch (err) {
      alert(`Could not generate new question: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (!attempt) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Generate Diagnostic Question</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          The AI will test your comprehension based strictly on the material in this loop.
        </p>
        <button
          onClick={handleGenerateAnother}
          disabled={generating}
          className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Question...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Practice Problem
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-md">
            {attempt.question_type?.replace('_', ' ')} Question
          </span>
          {isAnswered && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                attempt.is_correct
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {attempt.is_correct ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Needs Work
                </>
              )}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 leading-snug mb-4">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {attempt.question_text}
          </ReactMarkdown>
        </h3>

        {/* Collapsible Hint */}
        {attempt.hint_text && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              {showHint ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
              {showHint ? 'Hide Diagnostic Hint' : 'Reveal Diagnostic Hint'}
            </button>
            {showHint && (
              <div className="mt-2 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed animate-in fade-in duration-200">
                💡 <strong>Hint:</strong> {attempt.hint_text}
              </div>
            )}
          </div>
        )}

        {/* Answer Form or Graded Display */}
        {!isAnswered ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Your Answer
              </label>
              <textarea
                rows={4}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your explanation or worked solution here..."
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-inner"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !userAnswer.trim()}
                className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI Evaluating...
                  </>
                ) : (
                  'Submit Answer for Diagnostic Check'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* Student's submitted answer */}
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                Your Submitted Answer:
              </span>
              <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {attempt.user_answer}
              </p>
            </div>

            {/* AI Feedback */}
            <div className={`p-4 rounded-xl border ${attempt.is_correct ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-rose-50/70 border-rose-200 text-rose-950'}`}>
              <div className="flex items-center space-x-2 font-bold text-sm mb-1">
                <Sparkles className="w-4 h-4" />
                <span>AI Diagnostic Feedback</span>
              </div>
              <p className="text-xs leading-relaxed">
                {attempt.ai_feedback}
              </p>
            </div>

            {/* Worked Solution */}
            {attempt.worked_solution && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  Complete Worked Solution
                </span>
                <div className="text-xs text-slate-800 prose prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {attempt.worked_solution}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleGenerateAnother}
                disabled={generating}
                className="w-full sm:w-auto text-xs font-semibold text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
              >
                {generating ? 'Generating...' : 'Try Another Question'}
              </button>

              <button
                type="button"
                onClick={onProceedToTeachBack}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all"
              >
                Proceed to Teach-Back Loop
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

