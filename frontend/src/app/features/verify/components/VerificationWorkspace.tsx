import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Mic,
  Link2,
  Upload,
  Clipboard,
  Trash2,
  ArrowRight,
  Play,
  Square,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";

export type InputMode = "text" | "image" | "pdf" | "audio" | "url";

interface VerificationWorkspaceProps {
  onVerifyText: (text: string, language?: string) => Promise<void>;
  onVerifyUrl: (url: string, language?: string) => Promise<void>;
  onVerifyMultimodal: (formData: FormData) => Promise<void>;
  isLoading: boolean;
}

export const SAMPLE_CLAIMS = [
  {
    title: "WHO Pandemic Agreement Rumor",
    category: "health",
    text: "Forwarded: WHO has passed a secret treaty allowing them to deploy global military to enforce forced lockdowns and override national constitutions starting next month.",
  },
  {
    title: "RBI ₹500 Note Discontinuation",
    category: "finance",
    text: "Urgent warning! Reserve Bank of India has announced that all ₹500 currency notes with star (*) symbol will become completely invalid after December 31st.",
  },
  {
    title: "NASA Solar Flare Grid Blackout",
    category: "science",
    text: "NASA confirmed an X-class solar storm will hit Earth this Friday causing an internet and power blackout for 72 hours across Asia.",
  },
  {
    title: "Free Government Laptop Scheme",
    category: "governance",
    text: "Government is giving free laptops to all students from Class 10 to Post-Graduation under PM Free Laptop Yojana 2026. Register on pm-free-laptop.xyz immediately.",
  },
];

export default function VerificationWorkspace({
  onVerifyText,
  onVerifyUrl,
  onVerifyMultimodal,
  isLoading,
}: VerificationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("auto");

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    };
  }, [previewUrl, recordedAudioUrl]);

  // Handle Clipboard Paste
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextInput(text);
      }
    } catch (e) {
      setFileError("Unable to access clipboard. Please paste directly using Ctrl+V.");
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setFileError(null);
    if (activeTab === "image") {
      if (!file.type.startsWith("image/")) {
        setFileError("Please select a valid image file (JPG, PNG, WEBP).");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setFileError("Image file size must be less than 15MB.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else if (activeTab === "pdf") {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setFileError("Please select a valid PDF document (.pdf).");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setFileError("PDF file size must be less than 20MB.");
        return;
      }
      setSelectedFile(file);
    } else if (activeTab === "audio") {
      if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|m4a|ogg|opus)$/i)) {
        setFileError("Please select a supported audio file (MP3, WAV, M4A, OGG).");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setFileError("Audio file size must be less than 25MB.");
        return;
      }
      setSelectedFile(file);
      setRecordedAudioUrl(URL.createObjectURL(file));
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioUrl(null);
    setAudioBlob(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Microphone recording
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicError("Microphone access was denied. Please allow microphone permissions in your browser or upload an audio file.");
      } else {
        setMicError("Unable to access microphone. Please check your audio input device.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFileError(null);

    if (activeTab === "text") {
      if (!textInput.trim() || textInput.trim().length < 5) {
        setFileError("Please enter at least 5 characters to analyze.");
        return;
      }
      await onVerifyText(textInput.trim(), selectedLanguage);
    } else if (activeTab === "url") {
      if (!urlInput.trim()) {
        setFileError("Please enter a valid website URL.");
        return;
      }
      try {
        const parsed = new URL(urlInput.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          setFileError("Only HTTP and HTTPS URLs are supported.");
          return;
        }
      } catch {
        setFileError("Invalid URL format. Example: https://example.com/article");
        return;
      }
      await onVerifyUrl(urlInput.trim(), selectedLanguage);
    } else if (activeTab === "image" || activeTab === "pdf") {
      if (!selectedFile) {
        setFileError(`Please upload a ${activeTab.toUpperCase()} file to verify.`);
        return;
      }
      const formData = new FormData();
      formData.append("type", activeTab);
      formData.append("file", selectedFile);
      formData.append("language", selectedLanguage);
      await onVerifyMultimodal(formData);
    } else if (activeTab === "audio") {
      let audioFileToUpload: File | null = selectedFile;
      if (!audioFileToUpload && audioBlob) {
        audioFileToUpload = new File([audioBlob], "voice_note.webm", { type: "audio/webm" });
      }
      if (!audioFileToUpload) {
        setFileError("Please record a voice note or upload an audio file.");
        return;
      }
      const formData = new FormData();
      formData.append("type", "audio");
      formData.append("file", audioFileToUpload);
      formData.append("language", selectedLanguage);
      await onVerifyMultimodal(formData);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Workspace Card */}
      <div className="bg-white rounded-3xl border border-[#E7E2D6] shadow-xl shadow-stone-900/5 overflow-hidden transition-all">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#EDE8DE] bg-[#FAF8F5]/80 overflow-x-auto scrollbar-none">
          {[
            { id: "text", label: "Text / Forward", icon: FileText },
            { id: "image", label: "Image / Screenshot", icon: ImageIcon },
            { id: "pdf", label: "PDF / Circular", icon: FileSpreadsheet },
            { id: "audio", label: "Voice Note", icon: Mic },
            { id: "url", label: "Web URL", icon: Link2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as InputMode);
                  setFileError(null);
                }}
                disabled={isLoading}
                className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-4 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                  isActive
                    ? "border-[#0F382E] text-[#0F382E] bg-white shadow-2xs"
                    : "border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/50"
                }`}
              >
                <Icon size={16} className={isActive ? "text-[#0F382E]" : "text-stone-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* TAB 1: TEXT */}
          {activeTab === "text" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold text-stone-700">
                  Paste forwarded message, tweet, or WhatsApp claim:
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 text-xs text-[#0F382E] hover:text-[#185344] font-medium bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1 rounded-md transition-colors"
                >
                  <Clipboard size={12} />
                  <span>Paste from clipboard</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={isLoading}
                  rows={6}
                  placeholder="e.g. 'Forwarded message: Government announced a 50% discount on electricity bills across the state from tomorrow. Share with everyone!'..."
                  className="w-full p-4 rounded-2xl border border-stone-200 focus:border-[#0F382E] focus:ring-2 focus:ring-[#0F382E]/10 outline-none transition-all text-sm sm:text-base text-stone-800 placeholder:text-stone-400 leading-relaxed resize-y bg-[#FCFBF9]"
                />
                <div className="absolute bottom-3 right-3 text-[11px] text-stone-400 font-mono">
                  {textInput.length} characters
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMAGE */}
          {activeTab === "image" && (
            <div className="space-y-4">
              <label className="text-xs sm:text-sm font-semibold text-stone-700 block">
                Upload screenshot of chat, social post, or news clipping:
              </label>

              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-[#0F382E] bg-emerald-50/50"
                      : "border-stone-200 hover:border-[#0F382E] bg-[#FCFBF9]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0F382E] flex items-center justify-center mx-auto mb-4">
                    <Upload size={24} />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-800 mb-1">
                    Click to select or drag and drop image here
                  </h4>
                  <p className="text-xs text-stone-400">
                    Supports JPG, PNG, WEBP (Max file size: 15MB)
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-2 font-medium">
                    OCR with Tesseract & Gemini Vision fallback automatically reads Indian languages
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover border border-stone-200 shadow-2xs"
                      />
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-stone-800 truncate max-w-xs">
                        {selectedFile.name}
                      </h4>
                      <p className="text-xs text-stone-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for OCR extraction
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PDF */}
          {activeTab === "pdf" && (
            <div className="space-y-4">
              <label className="text-xs sm:text-sm font-semibold text-stone-700 block">
                Upload official notice, circular, or multi-page PDF document:
              </label>

              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-[#0F382E] bg-emerald-50/50"
                      : "border-stone-200 hover:border-[#0F382E] bg-[#FCFBF9]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0F382E] flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet size={24} />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-800 mb-1">
                    Click to select or drag and drop PDF document
                  </h4>
                  <p className="text-xs text-stone-400">
                    Supports digital and scanned PDF files (Max size: 20MB)
                  </p>
                  <p className="text-[11px] text-stone-500 mt-2">
                    Multi-page text extraction extracts all paragraphs across pages
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                      <FileSpreadsheet size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-800 truncate max-w-xs">
                        {selectedFile.name}
                      </h4>
                      <p className="text-xs text-stone-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for text extraction
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIO */}
          {activeTab === "audio" && (
            <div className="space-y-4">
              <label className="text-xs sm:text-sm font-semibold text-stone-700 block">
                Record or upload voice note forwarded on WhatsApp / Telegram:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A: Microphone Recorder */}
                <div className="border border-stone-200 rounded-2xl p-6 bg-[#FCFBF9] flex flex-col items-center justify-center text-center">
                  <div className="mb-4">
                    {isRecording ? (
                      <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse shadow-lg shadow-rose-500/25">
                        <Mic size={28} />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0F382E] flex items-center justify-center">
                        <Mic size={28} />
                      </div>
                    )}
                  </div>

                  {isRecording ? (
                    <div className="space-y-3">
                      <div className="text-rose-600 font-mono font-bold text-lg">
                        Recording: {Math.floor(recordingSeconds / 60)}:
                        {String(recordingSeconds % 60).padStart(2, "0")}
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
                      >
                        <Square size={14} />
                        <span>Stop Recording</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-stone-800">
                        Record through Microphone
                      </h4>
                      <p className="text-xs text-stone-400 mb-2">
                        Speak clearly in Hindi, English, or regional languages
                      </p>
                      <button
                        type="button"
                        onClick={startRecording}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F382E] text-white text-xs font-semibold hover:bg-[#185344] transition-colors"
                      >
                        <Play size={14} />
                        <span>Start Recording</span>
                      </button>
                    </div>
                  )}

                  {micError && (
                    <p className="text-xs text-rose-600 mt-3 font-medium">{micError}</p>
                  )}
                </div>

                {/* Option B: Upload Audio File */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-stone-200 rounded-2xl p-6 bg-[#FCFBF9] flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#0F382E] transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mp3,audio/wav,audio/m4a,audio/ogg,audio/opus"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mb-4">
                    <Upload size={24} />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-800">
                    Upload Audio File
                  </h4>
                  <p className="text-xs text-stone-400 mt-1">
                    MP3, WAV, M4A, OGG (Max 25MB)
                  </p>
                  <span className="text-xs text-[#0F382E] font-medium mt-3 underline">
                    Browse files
                  </span>
                </div>
              </div>

              {/* Recorded / Uploaded Audio Preview Player */}
              {recordedAudioUrl && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="text-[#0F382E]" size={20} />
                    <audio src={recordedAudioUrl} controls className="h-8 max-w-xs sm:max-w-md" />
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: URL */}
          {activeTab === "url" && (
            <div className="space-y-3">
              <label className="text-xs sm:text-sm font-semibold text-stone-700 block">
                Enter public web article link or viral post URL:
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="https://example.com/breaking-news-claim..."
                  className="w-full p-4 pl-11 rounded-2xl border border-stone-200 focus:border-[#0F382E] focus:ring-2 focus:ring-[#0F382E]/10 outline-none transition-all text-sm sm:text-base text-stone-800 placeholder:text-stone-400 bg-[#FCFBF9]"
                />
                <Link2 className="absolute left-4 top-4 text-stone-400" size={18} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <Info size={13} />
                <span>
                  Strict SSRF safeguards protect private networks. Only public HTTP/HTTPS URLs permitted.
                </span>
              </div>
            </div>
          )}

          {/* Inline Validation / Error Message */}
          {fileError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Action Footer: Language Selector & Submit CTA */}
          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-stone-500 font-medium">Target Explanation:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={isLoading}
                className="text-xs font-semibold text-stone-700 bg-stone-100 border border-stone-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#0F382E]"
              >
                <option value="auto">Auto-Detect Language</option>
                <option value="English">English</option>
                <option value="Hindi">हिंदी (Hindi)</option>
                <option value="Tamil">தமிழ் (Tamil)</option>
                <option value="Telugu">తెలుగు (Telugu)</option>
                <option value="Bengali">বাংলা (Bengali)</option>
                <option value="Marathi">मराठी (Marathi)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all shadow-md active:scale-98 ${
                isLoading
                  ? "bg-stone-300 text-stone-500 cursor-not-allowed"
                  : "bg-[#0F382E] hover:bg-[#164E3F] text-white shadow-[#0F382E]/20 hover:shadow-lg"
              }`}
            >
              <span>{isLoading ? "Verifying with Gemini & Tavily..." : "Verify Claim with Live Evidence"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>

      {/* Actionable Example Claims */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-emerald-700" />
          <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Try Sample Forwarded Claims (Populates input & runs live API)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAMPLE_CLAIMS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setActiveTab("text");
                setTextInput(item.text);
                setFileError(null);
                window.scrollTo({ top: 300, behavior: "smooth" });
              }}
              className="text-left p-3.5 rounded-2xl bg-white border border-[#E9E5DB] hover:border-[#0F382E] hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#0F382E] group-hover:underline">
                  {item.title}
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                {item.text}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
