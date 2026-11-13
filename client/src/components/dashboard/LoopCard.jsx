import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Image, AlignLeft, ArrowRight, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const DOMAIN_LABELS = {
  computer_science: 'Computer Science',
  engineering: 'Engineering',
  mathematics: 'Mathematics',
  natural_sciences: 'Natural Sciences',
  medicine_health: 'Medicine & Health',
  business_economics: 'Business & Econ',
  humanities_law: 'Humanities & Law',
  general: 'General Study'
};

const STAGE_LABELS = {
  explain: '1. Learn Concept',
  practice: '2. Solve Question',
  teach_back: '3. Teach-Back Bot',
  completed: '4. Mastered'
};

export default function LoopCard({ loop, onDelete }) {
  const getModeIcon = () => {
    switch (loop.input_mode) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-500" />;
      case 'image':
        return <Image className="w-4 h-4 text-sky-500" />;
      default:
        return <AlignLeft className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (loop.status) {
      case 'mastered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Mastered
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Needs Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
    }
  };

  const formattedDate = new Date(loop.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-slate-100 flex items-center justify-center">
              {getModeIcon()}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {DOMAIN_LABELS[loop.domain] || loop.domain}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Title */}
        <Link to={`/loop/${loop.id}`}>
          <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
            {loop.title}
          </h4>
        </Link>

        {/* Stage Progress Pill */}
        <div className="mb-4">
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            Stage: {STAGE_LABELS[loop.current_stage] || loop.current_stage}
          </span>
        </div>

        {/* Mastery Progress Bar */}
        {typeof loop.mastery_score === 'number' && (
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs font-semibold mb-1">
              <span className="text-slate-500">Mastery Score</span>
              <span className={loop.mastery_score >= 75 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {loop.mastery_score}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  loop.mastery_score >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${loop.mastery_score}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">
          Created {formattedDate}
        </span>

        <div className="flex items-center space-x-1">
          {onDelete && (
            <button
              onClick={() => onDelete(loop.id)}
              title="Delete Loop"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <Link
            to={`/loop/${loop.id}`}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 rounded-lg transition-all"
          >
            {loop.current_stage === 'completed' ? 'Review' : 'Resume'}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

