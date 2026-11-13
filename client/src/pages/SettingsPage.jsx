import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { User, Check, Loader2, Settings } from 'lucide-react';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [defaultDepth, setDefaultDepth] = useState(profile?.default_depth || 'intermediate');
  const [defaultStyle, setDefaultStyle] = useState(profile?.default_style || 'visual_analogies');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setDefaultDepth(profile.default_depth || 'intermediate');
      setDefaultStyle(profile.default_style || 'visual_analogies');
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedSuccess(false);

      await api.updateProfile({
        full_name: fullName,
        default_depth: defaultDepth,
        default_style: defaultStyle
      });

      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert(`Could not save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Learner Preferences & Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize how StudyLoop AI deconstructs concepts and paces your active recall sessions
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        {savedSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-emerald-800 text-sm font-semibold animate-in fade-in duration-200">
            <Check className="w-5 h-5 text-emerald-600" />
            <span>Preferences saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Rivera"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
            />
          </div>

          {/* Default Depth Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Default Learning Depth
            </label>
            <select
              value={defaultDepth}
              onChange={(e) => setDefaultDepth(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
            >
              <option value="beginner">Beginner — Everyday analogies, gentle pacing</option>
              <option value="intermediate">Intermediate — Balanced technical terms & concepts</option>
              <option value="exam_ready">Exam-Ready — Rigorous formulas, edge cases & derivations</option>
            </select>
          </div>

          {/* Default Explanation Style */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Preferred Teaching Style
            </label>
            <select
              value={defaultStyle}
              onChange={(e) => setDefaultStyle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
            >
              <option value="visual_analogies">Visual Analogies — Mental models & intuitive metaphors</option>
              <option value="first_principles">First Principles — Logical bottom-up derivation</option>
              <option value="practical_examples">Practical Examples — Real-world code & numerical walk-throughs</option>
            </select>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Preferences...
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

