import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Lightbulb, Sparkles, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

export default function StepBreakdownList({
  loop,
  onStepSimplified,
  onProceedToPractice
}) {
  const [simplifyingStep, setSimplifyingStep] = useState(null);
  const steps = loop?.steps_json || [];

  const handleSimplify = async (stepNumber) => {
    try {
      setSimplifyingStep(stepNumber);
      const res = await api.simplifyStep(loop.id, stepNumber);
      if (res?.updatedStep && onStepSimplified) {
        onStepSimplified(res.updatedStep);
      }
    } catch (err) {
      alert(`Could not simplify step: ${err.message}`);
    } finally {
      setSimplifyingStep(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Core Takeaway Banner */}
      {loop?.core_takeaway && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                TL;DR Core Idea
              </h4>
              <p className="text-sm font-medium text-slate-800 mt-1 leading-relaxed">
                {loop.core_takeaway}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step Cards */}
      <div className="space-y-5">
        {steps.map((step) => {
          const isBusy = simplifyingStep === step.step_number;

          return (
            <div
              key={step.step_number}
              className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm hover:border-slate-300 transition-all relative overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 rounded-xl bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center shadow-xs">
                    {step.step_number}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {step.heading}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleSimplify(step.step_number)}
                  disabled={isBusy}
                  className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  title="Ask AI to re-explain this step using an even simpler analogy"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Simplifying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Explain Simpler
                    </>
                  )}
                </button>
              </div>

              {/* Explanation Text (Markdown & KaTeX) */}
              <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed mb-4">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {step.explanation}
                </ReactMarkdown>
              </div>

              {/* Everyday Analogy Box */}
              {step.analogy && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start space-x-3 mb-3">
                  <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block mb-0.5">
                      Everyday Analogy
                    </span>
                    <p className="text-xs text-amber-950 font-medium leading-relaxed">
                      {step.analogy}
                    </p>
                  </div>
                </div>
              )}

              {/* Key Point Tag */}
              {step.key_point && (
                <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-semibold text-slate-700">Key Takeaway:</span>
                  <span className="text-slate-600">{step.key_point}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={onProceedToPractice}
          className="inline-flex items-center px-6 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          Ready for Practice Question
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

