import React, { useState } from 'react';
import { Priority, Location } from '../types';
import ImageUploader from './ImageUploader';
import ImageAnnotator from './ImageAnnotator';
import { 
  SparklesIcon, 
  CloudIcon, 
  LocationIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon,
  PencilIcon,
  TrashIcon 
} from './icons';

interface ReportAnIssueProps {
  onSubmitIssue: (data: {
    title: string;
    description: string;
    category: string;
    severity: Priority;
    cloudService: string;
    imageFile: File | null;
    imagePreviewUrl: string | null;
  }) => void;
  isLoading: boolean;
  location: Location | null;
  usingFallbackLocation: boolean;
  isGeminiConfigured: boolean;
  onCancel?: () => void;
}

const CLOUD_SERVICES = [
  'AWS Elastic Kubernetes Service (EKS)',
  'Amazon S3 Object Storage',
  'AWS Relational Database (RDS / Aurora)',
  'Google Cloud Compute / GKE',
  'Azure Virtual Network / ExpressRoute',
  'Global Edge CDN & Gateway',
  'Data Center Physical Server Rack',
  'Facility HVAC / Thermal Cooling',
  'General Cloud Infrastructure',
];

const CATEGORIES = [
  'Cloud Infrastructure',
  'Compute / Kubernetes',
  'Network & Connectivity',
  'Storage & Databases',
  'Thermal / HVAC Cooling',
  'Electrical & Power',
  'Security & Physical Access',
  'General Maintenance',
];

export const ReportAnIssue: React.FC<ReportAnIssueProps> = ({
  onSubmitIssue,
  isLoading,
  location,
  usingFallbackLocation,
  isGeminiConfigured,
  onCancel,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cloudService, setCloudService] = useState(CLOUD_SERVICES[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [severity, setSeverity] = useState<Priority>(Priority.Medium);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, { type: mime });
  };

  const handleImageSelect = (file: File, dataUrl: string) => {
    setImageFile(file);
    setImagePreviewUrl(dataUrl);
    setIsAnnotating(true);
  };

  const handleAnnotationComplete = (annotatedDataUrl: string) => {
    setImagePreviewUrl(annotatedDataUrl);
    if (imageFile) {
      setImageFile(dataURLtoFile(annotatedDataUrl, imageFile.name));
    }
    setIsAnnotating(false);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    setIsAnnotating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !imagePreviewUrl) return;

    onSubmitIssue({
      title: title.trim() || 'Unspecified Incident',
      description: description.trim(),
      category,
      severity,
      cloudService,
      imageFile,
      imagePreviewUrl,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 font-sans pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#EAE7DF] text-xs text-[#737373] shadow-sm mb-2">
            <span className="w-2 h-2 rounded-full bg-[#7B9EFF]" />
            <span>AI Incident Reporter</span>
          </div>
          <h2 className="text-3xl font-serif text-[#171717] tracking-tight">
            Report an Infrastructure Incident
          </h2>
          <p className="text-sm text-[#737373] mt-1">
            Submit telemetry, service status, and visual evidence for automated Gemini diagnosis.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-white border border-[#EAE7DF] text-xs font-medium text-[#737373] hover:text-[#171717] transition-colors"
          >
            Back to Dashboard
          </button>
        )}
      </div>

      {/* API Key Notification if not set */}
      {!isGeminiConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Gemini API Key in Standby Mode</p>
            <p className="text-amber-800/80">
              Analysis will run in offline intelligent heuristic simulation mode. To enable live multimodal Gemini 3 Flash, add <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono">VITE_GEMINI_API_KEY</code> to your <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono">.env</code> file.
            </p>
          </div>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Incident Specifics */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-7 border border-[#EAE7DF] shadow-card space-y-6">
          <div className="border-b border-[#EAE7DF] pb-4">
            <h3 className="text-base font-serif text-[#171717] tracking-tight">Incident Details</h3>
            <p className="text-xs text-[#858585] mt-0.5">Define affected cloud services and severity tier</p>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="issue-title" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                id="issue-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., EKS Worker Node OOMKilled in Cluster us-east-1a"
                className="w-full px-4 py-3 bg-[#F8F7F3] border border-[#EAE7DF] rounded-2xl text-sm font-medium text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] placeholder:text-[#858585] transition-all"
              />
            </div>

            {/* Cloud Service & Category in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cloud-service" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2">
                  Cloud Service or Component
                </label>
                <div className="relative">
                  <select
                    id="cloud-service"
                    value={cloudService}
                    onChange={(e) => setCloudService(e.target.value)}
                    className="w-full appearance-none px-4 py-3 bg-[#F8F7F3] border border-[#EAE7DF] rounded-2xl text-sm font-medium text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] cursor-pointer"
                  >
                    {CLOUD_SERVICES.map(cs => (
                      <option key={cs} value={cs}>{cs}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#858585]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2">
                  Incident Category
                </label>
                <div className="relative">
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none px-4 py-3 bg-[#F8F7F3] border border-[#EAE7DF] rounded-2xl text-sm font-medium text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#858585]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Severity Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2">
                Severity Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: Priority.Low, label: 'Low', desc: 'Minor anomaly', bg: 'hover:bg-emerald-50', active: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
                  { value: Priority.Medium, label: 'Medium', desc: 'Degraded throughput', bg: 'hover:bg-amber-50', active: 'bg-amber-50 border-amber-300 text-amber-800' },
                  { value: Priority.High, label: 'High / Critical', desc: 'Service outage / urgent', bg: 'hover:bg-red-50', active: 'bg-red-50 border-red-300 text-red-800' },
                ].map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSeverity(item.value)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      severity === item.value 
                        ? `${item.active} ring-2 ring-offset-1 ring-[#B7ACF5]/40 font-semibold shadow-sm` 
                        : `bg-[#F8F7F3] border-[#EAE7DF] text-[#737373] ${item.bg}`
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[11px] text-[#858585] mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <label htmlFor="issue-description" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2">
                Detailed Issue Description
              </label>
              <textarea
                id="issue-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include logs, system metrics, error codes (e.g. HTTP 504, Kernel Panic, CPU throttling)..."
                className="w-full px-4 py-3 bg-[#F8F7F3] border border-[#EAE7DF] rounded-2xl text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#B7ACF5] placeholder:text-[#858585] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Attachment Upload & Annotation */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-7 border border-[#EAE7DF] shadow-card space-y-4">
          <div className="border-b border-[#EAE7DF] pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-serif text-[#171717] tracking-tight">Photographic Evidence & Telemetry</h3>
              <p className="text-xs text-[#858585] mt-0.5">Attach server rack snapshot, terminal logs, or annotated hardware photo</p>
            </div>
            {imagePreviewUrl && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnotating(true)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#EAE7DF] hover:border-[#B7ACF5] text-xs font-medium text-[#171717] shadow-sm transition-all flex items-center gap-1.5"
                >
                  <PencilIcon className="w-3.5 h-3.5 text-[#9A8CE8]" />
                  Annotate Image
                </button>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="px-3 py-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-xs font-medium text-red-600 transition-colors flex items-center gap-1.5"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {isAnnotating && imagePreviewUrl ? (
            <ImageAnnotator
              src={imagePreviewUrl}
              onComplete={handleAnnotationComplete}
              onCancel={() => setIsAnnotating(false)}
            />
          ) : (
            <ImageUploader
              onImageSelect={handleImageSelect}
              imagePreviewUrl={imagePreviewUrl}
            />
          )}
        </div>

        {/* Section 3: Telemetry Location Status */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-[#EAE7DF] shadow-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              location ? (usingFallbackLocation ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200') : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
            }`}>
              {location ? <CheckCircleIcon className="w-5 h-5" /> : <LocationIcon className="w-5 h-5 animate-pulse" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#171717]">
                {location ? (usingFallbackLocation ? 'Fallback Cloud Region Active' : 'Facility Location Acquired') : 'Acquiring GPS Telemetry...'}
              </p>
              {location && (
                <p className="text-[11px] font-mono text-[#858585]">
                  Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
          <span className="text-[11px] text-[#858585]">Telemetry Fixed</span>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3.5 rounded-2xl bg-white border border-[#EAE7DF] text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F8F7F3] transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            id="submit-issue-btn"
            disabled={isLoading || (!title.trim() && !imagePreviewUrl)}
            className="px-8 py-3.5 rounded-2xl bg-[#171717] hover:bg-[#2b2b2b] text-white text-xs font-medium shadow-sm hover:shadow-card disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
          >
            <SparklesIcon className="w-4 h-4 text-[#B7ACF5] group-hover:scale-110 transition-transform" />
            <span>{isLoading ? 'Running Gemini Diagnostics...' : 'Submit Incident & Run AI Analysis'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportAnIssue;
