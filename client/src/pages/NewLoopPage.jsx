import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import UploadDropzone from '../components/studio/UploadDropzone';
import ConfigSelector from '../components/studio/ConfigSelector';
import { Sparkles, ArrowRight, Loader2, BookOpen, Brain, MessageSquareHeart } from 'lucide-react';

export default function NewLoopPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [inputMode, setInputMode] = useState('text');
  const [file, setFile] = useState(null);
  const [conceptText, setConceptText] = useState('');
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('general');
  const [depthLevel, setDepthLevel] = useState(profile?.default_depth || 'intermediate');
  const [explanationStyle, setExplanationStyle] = useState(profile?.default_style || 'visual_analogies');

  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (inputMode === 'text' && conceptText.trim().length < 10) {
      alert('Please provide at least 10 characters of study text or topic description.');
      return;
    }

    if (['pdf', 'image'].includes(inputMode) && !file) {
      alert(`Please select or drop a ${inputMode.toUpperCase()} file to analyze.`);
      return;
    }

    try {
      setLoading(true);
      setLoadingPhase('Ingesting material and extracting core models...');

      const formData = new FormData();
      formData.append('input_mode', inputMode);
      formData.append('domain', domain);
      formData.append('depth_level', depthLevel);
      formData.append('explanation_style', explanationStyle);

      if (title.trim()) {
        formData.append('title', title.trim());
      }

      if (inputMode === 'text') {
        formData.append('concept_text', conceptText.trim());
      } else if (file) {
        formData.append('file', file);
      }

      const res = await api.createLoop(formData);

      if (res?.loop?.id) {
        refreshProfile();
        navigate(`/loop/${res.loop.id}`);
      }
    } catch (err) {
      alert(`Failed to create study loop: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingPhase('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Active Learning Loop Studio</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Create New Study Loop
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-1">
          Upload any PDF textbook page, whiteboard photo, or paste dense concepts. Gemini will deconstruct it into actionable mental models.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Deconstructing Your Study Material...
          </h3>
          <p className="text-sm text-indigo-600 font-medium mb-8 animate-pulse">
            {loadingPhase}
          </p>

          <div className="max-w-md mx-auto grid grid-cols-3 gap-3 text-left">
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center space-x-2 text-xs font-semibold text-indigo-900">
              <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>1. Mental Models</span>
            </div>
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center space-x-2 text-xs font-semibold text-purple-900">
              <Brain className="w-4 h-4 text-purple-600 shrink-0" />
              <span>2. Analogies</span>
            </div>
            <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 flex items-center space-x-2 text-xs font-semibold text-pink-900">
              <MessageSquareHeart className="w-4 h-4 text-pink-600 shrink-0" />
              <span>3. Teach-Back</span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-8">
          {/* Section 1: Ingestion Zone */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              1. Choose Material Source
            </h3>
            <UploadDropzone
              inputMode={inputMode}
              setInputMode={setInputMode}
              file={file}
              setFile={setFile}
              conceptText={conceptText}
              setConceptText={setConceptText}
            />
          </div>

          {/* Section 2: Pedagogical Configuration */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              2. Pedagogical Configuration
            </h3>
            <ConfigSelector
              title={title}
              setTitle={setTitle}
              domain={domain}
              setDomain={setDomain}
              depthLevel={depthLevel}
              setDepthLevel={setDepthLevel}
              explanationStyle={explanationStyle}
              setExplanationStyle={setExplanationStyle}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-8 py-3.5 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
            >
              Start Active Learning Loop
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

