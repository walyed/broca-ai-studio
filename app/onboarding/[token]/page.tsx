"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle,
  Loader2,
  Send,
  User,
  Mail,
  Phone,
  Home,
  Building2,
  Heart,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import BrocaLogo from "@/components/ui/BrocaLogo";

// Types for form structure
interface FormField {
  id: string;
  type: "text" | "tel" | "email" | "textarea" | "checkbox" | "checkbox_group" | "date" | "number" | "select";
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  broker_name: string;
  form_template_id?: string;
  form_name?: string;
}

interface UploadedFile {
  documentId: string;
  file: File;
  name: string;
}

// Default form sections based on form type
const getDefaultFormSections = (formType: string): FormSection[] => {
  const basePersonalInfo: FormSection = {
    id: "personal-info",
    title: "Personal Information",
    description: "Please provide your basic contact information",
    fields: [
      { id: "full_name", type: "text", label: "Full Legal Name", placeholder: "Enter your full name", required: true },
      { id: "email", type: "email", label: "Email Address", placeholder: "your@email.com", required: true },
      { id: "phone", type: "tel", label: "Phone Number", placeholder: "+1 (555) 000-0000", required: true },
      { id: "date_of_birth", type: "date", label: "Date of Birth", required: true },
      { id: "address", type: "text", label: "Current Address", placeholder: "Street address, City, State, ZIP", required: true },
    ]
  };

  if (formType === "quick-real-estate" || formType === "real-estate") {
    return [
      basePersonalInfo,
      {
        id: "property-preferences",
        title: "Property Preferences",
        description: "Tell us about your ideal property",
        fields: [
          { id: "property_type", type: "checkbox_group", label: "Property Type", options: ["Single Family Home", "Condo", "Townhouse", "Multi-Family", "Land"], required: true },
          { id: "budget_min", type: "number", label: "Minimum Budget ($)", placeholder: "e.g., 200000", required: true },
          { id: "budget_max", type: "number", label: "Maximum Budget ($)", placeholder: "e.g., 500000", required: true },
          { id: "bedrooms", type: "select", label: "Bedrooms", options: ["1", "2", "3", "4", "5+"], required: true },
          { id: "bathrooms", type: "select", label: "Bathrooms", options: ["1", "1.5", "2", "2.5", "3+"], required: true },
          { id: "preferred_locations", type: "textarea", label: "Preferred Locations/Neighborhoods", placeholder: "List your preferred areas...", required: false },
        ]
      },
      {
        id: "timeline-financing",
        title: "Timeline & Financing",
        description: "Your buying timeline and financing details",
        fields: [
          { id: "timeline", type: "select", label: "When are you looking to buy?", options: ["Immediately", "1-3 months", "3-6 months", "6-12 months", "Just browsing"], required: true },
          { id: "pre_approved", type: "checkbox", label: "I am pre-approved for a mortgage", required: false },
          { id: "first_time_buyer", type: "checkbox", label: "I am a first-time homebuyer", required: false },
          { id: "additional_notes", type: "textarea", label: "Additional Notes", placeholder: "Any other information you'd like to share...", required: false },
        ]
      }
    ];
  }

  if (formType === "quick-life-insurance" || formType === "life-insurance") {
    return [
      basePersonalInfo,
      {
        id: "health-info",
        title: "Health Information",
        description: "Basic health details for insurance assessment",
        fields: [
          { id: "height", type: "text", label: "Height", placeholder: "e.g., 5'10\"", required: true },
          { id: "weight", type: "number", label: "Weight (lbs)", placeholder: "e.g., 170", required: true },
          { id: "smoker", type: "checkbox", label: "I am a smoker or use tobacco products", required: false },
          { id: "health_conditions", type: "textarea", label: "Pre-existing Health Conditions", placeholder: "List any health conditions...", required: false },
          { id: "medications", type: "textarea", label: "Current Medications", placeholder: "List any medications...", required: false },
        ]
      },
      {
        id: "coverage-details",
        title: "Coverage Details",
        description: "Your insurance coverage preferences",
        fields: [
          { id: "coverage_amount", type: "select", label: "Desired Coverage Amount", options: ["$100,000", "$250,000", "$500,000", "$1,000,000", "$2,000,000+"], required: true },
          { id: "coverage_type", type: "checkbox_group", label: "Coverage Type", options: ["Term Life", "Whole Life", "Universal Life", "Not Sure"], required: true },
          { id: "beneficiaries", type: "textarea", label: "Beneficiaries", placeholder: "List your beneficiaries and relationship...", required: true },
        ]
      }
    ];
  }

  if (formType === "quick-mortgage" || formType === "mortgage") {
    return [
      basePersonalInfo,
      {
        id: "employment-info",
        title: "Employment Information",
        description: "Your current employment details",
        fields: [
          { id: "employer", type: "text", label: "Current Employer", placeholder: "Company name", required: true },
          { id: "job_title", type: "text", label: "Job Title", placeholder: "Your position", required: true },
          { id: "years_employed", type: "number", label: "Years at Current Job", placeholder: "e.g., 3", required: true },
          { id: "annual_income", type: "number", label: "Annual Income ($)", placeholder: "e.g., 75000", required: true },
          { id: "employment_type", type: "select", label: "Employment Type", options: ["Full-time", "Part-time", "Self-employed", "Contract", "Retired"], required: true },
        ]
      },
      {
        id: "loan-details",
        title: "Loan Details",
        description: "Details about the mortgage you're seeking",
        fields: [
          { id: "loan_type", type: "checkbox_group", label: "Loan Type", options: ["Purchase", "Refinance", "Cash-out Refinance", "Home Equity"], required: true },
          { id: "property_value", type: "number", label: "Property Value/Purchase Price ($)", placeholder: "e.g., 350000", required: true },
          { id: "down_payment", type: "number", label: "Down Payment ($)", placeholder: "e.g., 70000", required: true },
          { id: "credit_score", type: "select", label: "Estimated Credit Score", options: ["Excellent (750+)", "Good (700-749)", "Fair (650-699)", "Below 650", "Not Sure"], required: true },
        ]
      }
    ];
  }

  // Default generic form
  return [basePersonalInfo];
};

const getDefaultDocuments = (formType: string): RequiredDocument[] => {
  const baseDocuments: RequiredDocument[] = [
    { id: "govt_id", name: "Government-Issued ID", description: "Driver's license, passport, or state ID", required: true },
  ];

  if (formType === "quick-real-estate" || formType === "real-estate") {
    return [
      ...baseDocuments,
      { id: "pre_approval", name: "Pre-Approval Letter", description: "Mortgage pre-approval letter (if available)", required: false },
      { id: "proof_of_funds", name: "Proof of Funds", description: "Bank statements or proof of down payment funds", required: false },
    ];
  }

  if (formType === "quick-life-insurance" || formType === "life-insurance") {
    return [
      ...baseDocuments,
      { id: "medical_records", name: "Medical Records", description: "Recent medical exam or doctor's report (if available)", required: false },
      { id: "current_policy", name: "Current Insurance Policy", description: "Existing life insurance policy details (if any)", required: false },
    ];
  }

  if (formType === "quick-mortgage" || formType === "mortgage") {
    return [
      ...baseDocuments,
      { id: "pay_stubs", name: "Recent Pay Stubs", description: "Last 2-3 months of pay stubs", required: true },
      { id: "tax_returns", name: "Tax Returns", description: "Last 2 years of tax returns", required: true },
      { id: "bank_statements", name: "Bank Statements", description: "Last 2-3 months of bank statements", required: true },
      { id: "w2_forms", name: "W-2 Forms", description: "Last 2 years of W-2 forms", required: true },
    ];
  }

  return baseDocuments;
};

export default function OnboardingPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [formSections, setFormSections] = useState<FormSection[]>([]);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  
  const [fieldValues, setFieldValues] = useState<Record<string, string | string[]>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch client data on mount
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const response = await fetch(`/api/onboarding/${token}`);
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.error || "Invalid or expired onboarding link");
          setLoading(false);
          return;
        }
        
        setClientData(data.client);
        
        // Set form sections based on form type
        const formType = data.client.form_type || "quick-real-estate";
        setFormSections(getDefaultFormSections(formType));
        setRequiredDocuments(getDefaultDocuments(formType));
        
        // Pre-fill known client data
        setFieldValues({
          full_name: data.client.name || "",
          email: data.client.email || "",
          phone: data.client.phone || "",
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching client data:", err);
        setError("Failed to load onboarding form");
        setLoading(false);
      }
    };

    if (token) {
      fetchClientData();
    }
  }, [token]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setFieldValues(prev => {
      const currentValues = (prev[fieldId] as string[]) || [];
      if (checked) {
        return { ...prev, [fieldId]: [...currentValues, option] };
      } else {
        return { ...prev, [fieldId]: currentValues.filter(v => v !== option) };
      }
    });
  };

  const handleSingleCheckboxChange = (fieldId: string, checked: boolean) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: checked ? "yes" : "no" }));
  };

  const handleFileUpload = (documentId: string, file: File) => {
    setUploadedFiles(prev => {
      const filtered = prev.filter(f => f.documentId !== documentId);
      return [...filtered, { documentId, file, name: file.name }];
    });
  };

  const removeFile = (documentId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.documentId !== documentId));
    if (fileInputRefs.current[documentId]) {
      fileInputRefs.current[documentId]!.value = "";
    }
  };

  const getUploadedFile = (documentId: string) => {
    return uploadedFiles.find(f => f.documentId === documentId);
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep < formSections.length) {
      const section = formSections[currentStep];
      for (const field of section.fields) {
        if (field.required) {
          const value = fieldValues[field.id];
          if (!value || (Array.isArray(value) && value.length === 0)) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const validateForm = (): boolean => {
    // Check required fields in sections
    for (const section of formSections) {
      for (const field of section.fields) {
        if (field.required) {
          const value = fieldValues[field.id];
          if (!value || (Array.isArray(value) && value.length === 0)) {
            return false;
          }
        }
      }
    }

    // Check required documents
    for (const doc of requiredDocuments) {
      if (doc.required && !getUploadedFile(doc.id)) {
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("token", token);
      formData.append("fieldValues", JSON.stringify(fieldValues));
      
      // Add files
      uploadedFiles.forEach(({ documentId, file }) => {
        formData.append(`document_${documentId}`, file);
      });

      const response = await fetch(`/api/onboarding/${token}/submit`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting form:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = fieldValues[field.id];

    switch (field.type) {
      case "checkbox_group":
        return (
          <div className="flex flex-wrap gap-4">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={((value as string[]) || []).includes(option)}
                  onCheckedChange={(checked) => handleCheckboxChange(field.id, option, !!checked)}
                  className="border-gray-300 data-[state=checked]:bg-primary"
                />
                <label
                  htmlFor={`${field.id}-${option}`}
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={value === "yes"}
              onCheckedChange={(checked) => handleSingleCheckboxChange(field.id, !!checked)}
              className="border-gray-300 data-[state=checked]:bg-primary"
            />
            <label
              htmlFor={field.id}
              className="text-sm text-gray-700 cursor-pointer"
            >
              {field.label}
            </label>
          </div>
        );

      case "textarea":
        return (
          <Textarea
            id={field.id}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none"
            rows={3}
          />
        );

      case "select":
        return (
          <select
            id={field.id}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      default:
        return (
          <Input
            id={field.id}
            type={field.type}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
          />
        );
    }
  };

  // Calculate progress
  const totalSteps = formSections.length + 1; // +1 for documents
  const progress = ((currentStep + 1) / totalSteps) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading your onboarding form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              Please contact your broker for a new onboarding link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">
              Your onboarding form has been submitted successfully.
            </p>
            <p className="text-sm text-gray-500">
              {clientData?.broker_name} will review your information and contact you shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <BrocaLogo size="sm" />
          <div className="text-right">
            <p className="text-sm text-gray-500">Onboarding for</p>
            <p className="font-medium text-gray-900">{clientData?.broker_name}</p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Welcome Message */}
        {currentStep === 0 && (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {clientData?.name}!
            </h1>
            <p className="text-gray-600">
              Please complete the following information to get started.
            </p>
          </div>
        )}

        {/* Form Sections */}
        {currentStep < formSections.length && (
          <Card className="bg-white shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="text-gray-900">{formSections[currentStep].title}</CardTitle>
              {formSections[currentStep].description && (
                <CardDescription className="text-gray-500">
                  {formSections[currentStep].description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {formSections[currentStep].fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  {field.type !== "checkbox" && (
                    <Label htmlFor={field.id} className="text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  )}
                  {renderField(field)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Documents Section */}
        {currentStep === formSections.length && (
          <Card className="bg-white shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Upload
              </CardTitle>
              <CardDescription className="text-gray-500">
                Please upload the required documents. Supported formats: PDF, JPG, PNG
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requiredDocuments.map((doc) => {
                const uploaded = getUploadedFile(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-xl border-2 border-dashed transition-all ${
                      uploaded ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {doc.name}
                          {doc.required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        <p className="text-sm text-gray-500">{doc.description}</p>
                        
                        {uploaded ? (
                          <div className="flex items-center gap-2 mt-3 p-2 bg-white rounded-lg">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-700 flex-1 truncate">{uploaded.name}</span>
                            <button
                              onClick={() => removeFile(doc.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <input
                              ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.id, file);
                              }}
                              className="hidden"
                              id={`file-${doc.id}`}
                            />
                            <label
                              htmlFor={`file-${doc.id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <Upload className="w-4 h-4" />
                              Choose File
                            </label>
                          </div>
                        )}
                      </div>
                      {uploaded && (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Previous
          </Button>

          {currentStep < formSections.length ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!validateCurrentStep()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !validateForm()}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Onboarding
                </>
              )}
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Powered by BrocaAI • Your information is encrypted and secure
        </div>
      </footer>
    </div>
  );
}
