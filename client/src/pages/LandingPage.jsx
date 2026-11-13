import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, BookOpen, Brain, MessageSquareHeart, Award, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const steps = [
    {
      num: '1',
      title: 'Ingest & Deconstruct',
      desc: 'Drop in any textbook photo, lecture PDF, or dense concept. AI deconstructs it into bite-sized mental models with real-world analogies.',
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      num: '2',
      title: 'Apply (Practice Question)',
      desc: 'Test your immediate comprehension with a targeted diagnostic problem tailored directly from the ingested material.',
      icon: Brain,
      color: 'from-indigo-500 to-purple-600'
    },
    {
      num: '3',
      title: 'Attempt & Diagnose',
      desc: 'Submit your solution. AI grades your work instantly, pinpointing exact conceptual gaps and providing step-by-step worked logic.',
      icon: Award,
      color: 'from-purple-500 to-pink-600'
    },
    {
      num: '4',
      title: 'Teach-Back (Friendly Bot)',
      desc: 'Adopt the Feynman technique: teach the concept back to our warm, encouraging teacher bot to lock in deep retention and earn your Mastery Score.',
      icon: MessageSquareHeart,
      color: 'from-pink-500 to-rose-600'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Recall & Feynman Teach-Back Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Stop Just Reading. <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Understand, Solve, & Teach It Back.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate passive study fatigue. StudyLoop turns any complex PDF, whiteboard photo, or tough topic into an interactive 4-stage active learning loop.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
            >
              Start Your First Loop Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl shadow-sm transition-all"
            >
              Sign In to Your Library
            </Link>
          </div>
        </div>
      </div>

      {/* 4-Step Interactive Loop Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            The 4-Stage Active Loop
          </h2>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            Built on Cognitive Science & The Feynman Technique
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${s.color} text-white flex items-center justify-center font-black text-lg mb-5 shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider block mb-1">
                    Stage {s.num}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          StudyLoop © 2026 — AI-Powered Active Recall & Feynman Teach-Back Platform. Built with Supabase & Google Gen AI.
        </div>
      </footer>
    </div>
  );
}

