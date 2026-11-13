import React from 'react';
import { BookOpen, Award, Target, Flame } from 'lucide-react';

export default function StatsBar({ stats }) {
  const { totalLoops = 0, masteredCount = 0, avgMasteryScore = 0 } = stats || {};

  const cards = [
    {
      title: 'Total Study Loops',
      value: totalLoops,
      subtitle: 'Active learning sessions',
      icon: BookOpen,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100'
    },
    {
      title: 'Topics Mastered',
      value: masteredCount,
      subtitle: `${totalLoops > 0 ? Math.round((masteredCount / totalLoops) * 100) : 0}% mastery rate`,
      icon: Award,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100'
    },
    {
      title: 'Average Mastery Score',
      value: `${avgMasteryScore}%`,
      subtitle: avgMasteryScore >= 75 ? 'Exam-ready retention' : 'Building core comprehension',
      icon: Target,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {card.value}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {card.subtitle}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl ${card.bgColor} ${card.borderColor} border flex items-center justify-center ${card.color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

