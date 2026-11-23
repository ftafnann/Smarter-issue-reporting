import React from 'react';
import { SparklesIcon, CloudIcon } from './icons';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "AI is analyzing infrastructure incident and telemetry..." }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-14 px-6 bg-white/80 backdrop-blur-md border border-[#EAE7DF] rounded-3xl shadow-card relative overflow-hidden my-6">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#B7ACF5]/10 via-[#7B9EFF]/10 to-transparent blur-2xl pointer-events-none" />

      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-3xl bg-[#F4F1FD] border border-[#DDD6FE] shadow-lavender-glow flex items-center justify-center text-[#7C3AED] relative animate-pulse">
          <CloudIcon className="w-8 h-8 text-[#9A8CE8]" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#DDD6FE] shadow-sm flex items-center justify-center text-[#2563EB]">
            <SparklesIcon className="w-3.5 h-3.5 animate-spin" />
          </div>
        </div>
      </div>

      <h4 className="text-base font-serif text-[#171717] tracking-tight text-center">
        Processing Cloud Diagnostics
      </h4>
      <p className="text-xs text-[#737373] mt-1.5 text-center max-w-md leading-relaxed">
        {message}
      </p>

      {/* Modern progressive status steps */}
      <div className="mt-6 flex items-center gap-2 text-[11px] text-[#858585]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span>Gemini Multimodal Inference • Evaluating Root Cause</span>
      </div>
    </div>
  );
};

export default Loader;
