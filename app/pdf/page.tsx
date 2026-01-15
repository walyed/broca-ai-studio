"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExtractionResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  extractedText?: string;
  textLength?: number;
  aiAnalysis?: Record<string, unknown>;
  error?: string;
  logs: string[];
  duration: number;
}

export default function PDFTestPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearResults = () => {
    setResults([]);
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setResults([]);

    for (const file of files) {
      setCurrentFile(file.name);
      const startTime = Date.now();
      const logs: string[] = [];

      try {
        logs.push(`📄 Processing: ${file.name}`);
        logs.push(`📊 Size: ${(file.size / 1024).toFixed(2)} KB`);
        logs.push(`📝 Type: ${file.type}`);

        const formData = new FormData();
        formData.append("file", file);

        logs.push(`🚀 Sending to API...`);

        const response = await fetch("/api/pdf-test", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          logs.push(`✅ API Response received`);
          if (data.textLength) {
            logs.push(`📖 Text extracted: ${data.textLength} characters`);
          }
          if (data.aiAnalysis) {
            logs.push(`🤖 AI Analysis completed`);
          }

          setResults(prev => [...prev, {
            success: true,
            fileName: file.name,
            fileSize: file.size,
            extractedText: data.extractedText,
            textLength: data.textLength,
            aiAnalysis: data.aiAnalysis,
            logs: [...logs, ...data.logs || []],
            duration: Date.now() - startTime,
          }]);
        } else {
          logs.push(`❌ Error: ${data.error}`);
          if (data.details) {
            logs.push(`📋 Details: ${data.details}`);
          }

          setResults(prev => [...prev, {
            success: false,
            fileName: file.name,
            fileSize: file.size,
            error: data.error,
            logs: [...logs, ...data.logs || []],
            duration: Date.now() - startTime,
          }]);
        }
      } catch (err) {
        const error = err as Error;
        logs.push(`💥 Exception: ${error.message}`);

        setResults(prev => [...prev, {
          success: false,
          fileName: file.name,
          fileSize: file.size,
          error: error.message,
          logs,
          duration: Date.now() - startTime,
        }]);
      }
    }

    setCurrentFile(null);
    setIsProcessing(false);
    setFiles([]);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">PDF OCR Test Page</h1>
          <p className="text-slate-400">Upload PDFs to test text extraction and AI analysis</p>
        </div>

        {/* Upload Section */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload PDFs
            </CardTitle>
            <CardDescription className="text-slate-400">
              Select one or more PDF files to test extraction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-300">Click to select PDF files</p>
              <p className="text-slate-500 text-sm mt-1">or drag and drop</p>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Selected files ({files.length}):</p>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white text-sm">{file.name}</p>
                        <p className="text-slate-400 text-xs">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={processFiles}
              disabled={files.length === 0 || isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing {currentFile}...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Process {files.length} PDF{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Results</h2>
              <Button variant="outline" size="sm" onClick={clearResults} className="text-slate-300 border-slate-600">
                Clear Results
              </Button>
            </div>

            {results.map((result, index) => (
              <Card key={index} className={`bg-slate-800 border-slate-700 ${result.success ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      {result.fileName}
                    </CardTitle>
                    <Badge variant="outline" className="text-slate-300 border-slate-600">
                      {(result.duration / 1000).toFixed(2)}s
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400">
                    {(result.fileSize / 1024).toFixed(2)} KB
                    {result.textLength !== undefined && ` • ${result.textLength} chars extracted`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Console Logs */}
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-2">Console Logs:</p>
                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm max-h-48 overflow-auto">
                      {result.logs.map((log, i) => (
                        <div key={i} className={`${log.includes('❌') || log.includes('💥') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : 'text-slate-300'}`}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {result.error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-red-400 font-medium">Error</p>
                          <p className="text-red-300 text-sm">{result.error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extracted Text Preview */}
                  {result.extractedText && (
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-2">Extracted Text Preview:</p>
                      <div className="bg-slate-900 rounded-lg p-4 max-h-48 overflow-auto">
                        <pre className="text-slate-300 text-sm whitespace-pre-wrap">
                          {result.extractedText.substring(0, 1000)}
                          {result.extractedText.length > 1000 && '...'}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {result.aiAnalysis && (
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-2">AI Analysis:</p>
                      <div className="grid md:grid-cols-2 gap-3">
                        {Object.entries(result.aiAnalysis).map(([key, value]) => {
                          if (['raw_text', 'logs'].includes(key)) return null;
                          return (
                            <div key={key} className="bg-slate-700 rounded-lg p-3">
                              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="text-slate-200 text-sm break-words">
                                {formatValue(value)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
