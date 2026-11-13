import React from 'react';
import { BookOpen, HelpCircle, MessageSquareHeart, Award, Check } from 'lucide-react';

const STAGES = [
  { id: 'explain', label: '1. Learn Concept', icon: BookOpen },
  { id: 'practice', label: '2. Solve Question', icon: HelpCircle },
  { id: 'teach_back', label: '3. Teach-Back Bot', icon: MessageSquareHeart },
  { id: 'completed', label: '4. Mastery Summary', icon: Award }
];

export default function StageStepper({ currentStage, onStageClick }) {
  const getStageIndex = (stage) => STAGES.findIndex((s) => s.id === stage);
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isAccessible = idx <= currentIndex;

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => isAccessible && onStageClick && onStageClick(stage.id)}
                disabled={!isAccessible}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-xs'
                    : isCompleted
                    ? 'text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium'
                    : 'text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="hidden md:inline text-xs sm:text-sm">
                  {stage.label}
                </span>
              </button>

              {idx < STAGES.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded ${
                    idx < currentIndex ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

