import React from 'react';

const DOMAINS = [
  { id: 'computer_science', label: 'Computer Science' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'mathematics', label: 'Mathematics' },
  { id: 'natural_sciences', label: 'Natural Sciences' },
  { id: 'medicine_health', label: 'Medicine & Health' },
  { id: 'business_economics', label: 'Business & Econ' },
  { id: 'humanities_law', label: 'Humanities & Law' },
  { id: 'general', label: 'General / Other' }
];

const DEPTH_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Everyday analogies, zero jargon, gentle pacing' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Balanced concepts + technical terms, standard coursework' },
  { id: 'exam_ready', label: 'Exam-Ready', desc: 'Rigorous formulas, edge cases & derivations' }
];

const STYLES = [
  { id: 'visual_analogies', label: 'Visual Analogies', desc: 'Metaphors, mental models & everyday imagery' },
  { id: 'first_principles', label: 'First Principles', desc: 'Logical bottom-up derivation from fundamentals' },
  { id: 'practical_examples', label: 'Practical Examples', desc: 'Concrete real-world applications & worked code/numbers' }
];

export default function ConfigSelector({
  title,
  setTitle,
  domain,
  setDomain,
  depthLevel,
  setDepthLevel,
  explanationStyle,
  setExplanationStyle
}) {
  return (
    <div className="space-y-6">
      {/* Optional Custom Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Topic Title <span className="text-slate-400 font-normal">(Optional — AI auto-generates if blank)</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Kirchhoff's Circuit Laws or Binary Search Trees"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
        />
      </div>

      {/* Domain Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Subject Domain
        </label>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
        >
          {DOMAINS.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Depth Level */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Target Learning Depth
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEPTH_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => setDepthLevel(level.id)}
              className={`text-left p-3 rounded-xl border transition-all ${
                depthLevel === level.id
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-sm font-bold text-slate-900">{level.label}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-snug">{level.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Explanation Style */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Explanation Teaching Style
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setExplanationStyle(style.id)}
              className={`text-left p-3 rounded-xl border transition-all ${
                explanationStyle === style.id
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-sm font-bold text-slate-900">{style.label}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-snug">{style.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

