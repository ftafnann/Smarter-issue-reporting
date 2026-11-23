import React, { useState } from 'react';
import { UploadIcon, SparklesIcon, ShieldCheckIcon } from './icons';

interface InspectorUpdateFormProps {
  onSubmit: (review: string, photoFile?: File) => void;
  isSubmitting: boolean;
}

const InspectorUpdateForm: React.FC<InspectorUpdateFormProps> = ({ onSubmit, isSubmitting }) => {
  const [review, setReview] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (review.trim() && !isSubmitting) {
      onSubmit(review.trim(), photoFile || undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-md p-6 rounded-3xl space-y-5 border border-[#EAE7DF] shadow-card mt-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#EAE7DF]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <ShieldCheckIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#171717]">Field Inspector Review Submission</h3>
            <p className="text-xs text-[#858585]">Provide on-site verification, resolution actions, and evidence photo</p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          Inspector Action Required
        </span>
      </div>

      <div>
        <label htmlFor="inspector-review" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
          Detailed Review & Remediation Notes
        </label>
        <textarea
          id="inspector-review"
          rows={4}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          className="w-full bg-[#F8F7F3] border border-[#EAE7DF] rounded-2xl p-3.5 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] focus:border-transparent transition-all placeholder:text-[#858585]"
          placeholder="Describe physical inspection findings, cloud hardware state, or corrective steps executed..."
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
          Upload Photographic Evidence (Optional)
        </label>
        <input 
          id="inspector-photo" 
          type="file" 
          accept="image/*" 
          onChange={handlePhotoChange} 
          className="hidden" 
        />
        <label 
          htmlFor="inspector-photo" 
          className="w-full p-4 border-2 border-dashed border-[#EAE7DF] rounded-2xl text-center cursor-pointer hover:border-[#B7ACF5] bg-[#F8F7F3]/60 hover:bg-[#F4F1FD]/40 transition-all flex flex-col items-center justify-center min-h-[130px] group"
        >
          {photoPreview ? (
            <div className="relative p-2">
              <img 
                src={photoPreview} 
                alt="Inspector evidence preview" 
                className="max-h-48 w-auto rounded-xl object-contain shadow-sm border border-[#EAE7DF]" 
              />
              <span className="inline-block mt-2 text-xs font-medium text-[#737373] group-hover:text-[#171717]">
                Click to replace photo
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#EAE7DF] mx-auto flex items-center justify-center text-[#9A8CE8]">
                <UploadIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-[#171717] block">Click to upload inspection snapshot</span>
              <span className="text-[11px] text-[#858585] block">High-resolution verification evidence</span>
            </div>
          )}
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          id="inspector-submit-btn"
          disabled={!review.trim() || isSubmitting}
          className="w-full sm:w-auto px-7 py-3 bg-[#171717] text-white font-medium text-xs rounded-2xl hover:bg-[#2b2b2b] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-card transition-all flex items-center justify-center gap-2"
        >
          <SparklesIcon className="w-3.5 h-3.5 text-[#B7ACF5]" />
          {isSubmitting ? 'Uploading Inspection...' : 'Submit Verification & Update Status'}
        </button>
      </div>
    </form>
  );
};

export default InspectorUpdateForm;
