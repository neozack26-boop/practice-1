import React, { useRef } from 'react';
import { UploadCloud, FileText, Image, AlignLeft, X } from 'lucide-react';

export default function UploadDropzone({
  inputMode,
  setInputMode,
  file,
  setFile,
  conceptText,
  setConceptText
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 15 * 1024 * 1024) {
        alert('File size exceeds the 15 MB limit.');
        return;
      }
      setFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (dropped.size > 15 * 1024 * 1024) {
        alert('File size exceeds the 15 MB limit.');
        return;
      }
      if (inputMode === 'pdf' && dropped.type === 'application/pdf') {
        setFile(dropped);
      } else if (inputMode === 'image' && dropped.type.startsWith('image/')) {
        setFile(dropped);
      } else {
        alert(`Please drop a valid ${inputMode.toUpperCase()} file.`);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      {/* Mode Switcher Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl space-x-1 border border-slate-200">
        <button
          type="button"
          onClick={() => { setInputMode('pdf'); setFile(null); }}
          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            inputMode === 'pdf'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 mr-2 text-rose-500" />
          PDF Document
        </button>

        <button
          type="button"
          onClick={() => { setInputMode('image'); setFile(null); }}
          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            inputMode === 'image'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Image className="w-4 h-4 mr-2 text-sky-500" />
          Photo / Notes
        </button>

        <button
          type="button"
          onClick={() => { setInputMode('text'); setFile(null); }}
          className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            inputMode === 'text'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlignLeft className="w-4 h-4 mr-2 text-emerald-500" />
          Pasted Concept
        </button>
      </div>

      {/* Upload Zone or Text Area */}
      {inputMode === 'text' ? (
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Paste Lecture Notes, Article, or Concept Prompt
          </label>
          <textarea
            rows={7}
            value={conceptText}
            onChange={(e) => setConceptText(e.target.value)}
            placeholder="Paste dense textbook excerpts, complex formulas, coding logic, or type a topic like: 'Explain how React Reconciliation compares the Virtual DOM and updates the real DOM...'"
            className="w-full rounded-2xl border border-slate-300 p-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-y shadow-inner"
          ></textarea>
          <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
            <span>Minimum 10 characters</span>
            <span>{conceptText.length} / 15,000 characters</span>
          </div>
        </div>
      ) : (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={inputMode === 'pdf' ? 'application/pdf' : 'image/png,image/jpeg,image/webp'}
            className="hidden"
          />

          {file ? (
            <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  {inputMode === 'pdf' ? <FileText className="w-5 h-5 text-rose-500" /> : <Image className="w-5 h-5 text-sky-500" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Click to browse or drag & drop your {inputMode.toUpperCase()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {inputMode === 'pdf' ? 'Textbooks, slides, papers up to 15 MB' : 'PNG, JPG, or WEBP photos up to 15 MB'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

