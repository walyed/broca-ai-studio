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
  AlertCircle,
  Shield,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
  Camera,
  Link as LinkIcon
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

interface LinkData {
  id: string;
  broker_id: string;
  broker_name: string;
  title?: string;
  description?: string;
  form_template_id?: string;
  form_name?: string;
  form_type?: string;
  form_template_data?: unknown[];
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

export default function PublicFormPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [formSections, setFormSections] = useState<FormSection[]>([]);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  
  const [fieldValues, setFieldValues] = useState<Record<string, string | string[]>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch link data on mount
  useEffect(() => {
    const fetchLinkData = async () => {
      try {
        const response = await fetch(`/api/public-form/${token}`);
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.error || "Invalid or expired form link");
          setLoading(false);
          return;
        }
        
        setLinkData(data.link);
        
        // Check if we have custom form template data
        const formTemplateData = data.link.form_template_data;
        
        if (formTemplateData && Array.isArray(formTemplateData) && formTemplateData[0]) {
          // Custom form template
          const templateConfig = formTemplateData[0] as {
            baseSections?: FormSection[];
            customFields?: FormField[];
            requiredDocuments?: RequiredDocument[];
            templateType?: string;
          };
          
          const sections: FormSection[] = templateConfig.baseSections || [];
          
          if (templateConfig.customFields && templateConfig.customFields.length > 0) {
            sections.push({
              id: "custom-fields",
              title: "Additional Information",
              description: "Please provide the following additional details",
              fields: templateConfig.customFields,
            });
          }
          
          if (sections.length > 0) {
            setFormSections(sections);
          } else {
            const formType = data.link.form_type || "quick-real-estate";
            setFormSections(getDefaultFormSections(formType));
          }
          
          if (templateConfig.requiredDocuments && templateConfig.requiredDocuments.length > 0) {
            setRequiredDocuments(templateConfig.requiredDocuments);
          } else {
            const formType = data.link.form_type || "quick-real-estate";
            setRequiredDocuments(getDefaultDocuments(formType));
          }
        } else {
          // No custom template - use default form sections
          const formType = data.link.form_type || "quick-real-estate";
          setFormSections(getDefaultFormSections(formType));
          setRequiredDocuments(getDefaultDocuments(formType));
        }
        
        // Initialize empty field values
        setFieldValues({});
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching link data:", err);
        setError("Failed to load form");
        setLoading(false);
      }
    };

    if (token) {
      fetchLinkData();
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

      const response = await fetch(`/api/public-form/${token}/submit`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit form");
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting form:", err);
      setError(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = fieldValues[field.id];

    switch (field.type) {
      case "checkbox_group":
        return (
          <div className="flex flex-wrap gap-3">
            {field.options?.map((option) => (
              <label
                key={option}
                htmlFor={`${field.id}-${option}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  ((value as string[]) || []).includes(option)
                    ? 'border-green-500 bg-green-500/10 text-white'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={((value as string[]) || []).includes(option)}
                  onCheckedChange={(checked) => handleCheckboxChange(field.id, option, !!checked)}
                  className="border-slate-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <span className="text-sm font-medium">{option}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <label
            htmlFor={field.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all w-fit ${
              value === "yes"
                ? 'border-green-500 bg-green-500/10 text-white'
                : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Checkbox
              id={field.id}
              checked={value === "yes"}
              onCheckedChange={(checked) => handleSingleCheckboxChange(field.id, !!checked)}
              className="border-slate-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
            <span className="text-sm font-medium">{field.label}</span>
          </label>
        );

      case "textarea":
        return (
          <Textarea
            id={field.id}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500 rounded-xl"
            rows={3}
          />
        );

      case "select":
        return (
          <select
            id={field.id}
            value={(value as string) || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '20px'
            }}
          >
            <option value="" className="bg-slate-800">Select...</option>
            {field.options?.map((option) => (
              <option key={option} value={option} className="bg-slate-800">{option}</option>
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
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 h-12 rounded-xl"
          />
        );
    }
  };

  // Calculate progress
  const totalSteps = formSections.length + 1; // +1 for documents
  const progress = ((currentStep + 1) / totalSteps) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse mx-auto mb-6 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 blur-xl opacity-50 mx-auto" />
          </div>
          <p className="text-white/80 text-lg">Loading form...</p>
          <p className="text-white/50 text-sm mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border-slate-700 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 ring-4 ring-red-500/30">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Link Not Available</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <div className="p-4 bg-slate-700/50 rounded-xl">
              <p className="text-sm text-slate-300">
                This form link may have expired or been deactivated.
                Please contact the broker for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border-slate-700 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
          <CardContent className="p-8 text-center relative">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <Sparkles className="w-6 h-6 text-yellow-400 absolute top-0 right-1/4 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Thank You!</h2>
            <p className="text-slate-300 mb-6">
              Your form has been submitted successfully.
            </p>
            <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Submitted to</p>
                  <p className="text-white font-medium">{linkData?.broker_name}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-6">
              They will review your information and contact you shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get step icon based on section
  const getStepIcon = (index: number) => {
    if (index === formSections.length) return FileText;
    const sectionId = formSections[index]?.id || '';
    if (sectionId.includes('personal')) return User;
    if (sectionId.includes('property')) return Home;
    if (sectionId.includes('health')) return Heart;
    if (sectionId.includes('employment') || sectionId.includes('loan')) return Building2;
    if (sectionId.includes('timeline') || sectionId.includes('coverage')) return Shield;
    return Clock;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <BrocaLogo size="sm" />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-full border border-slate-700">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-300">Secure Form</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Requested by</p>
              <p className="text-sm font-medium text-white">{linkData?.broker_name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Section */}
      <div className="sticky top-[65px] z-40 bg-slate-900/60 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[...Array(totalSteps)].map((_, index) => {
              const StepIcon = getStepIcon(index);
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={index} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30'
                        : isActive
                          ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30 ring-4 ring-green-500/20'
                          : 'bg-slate-800 border border-slate-700'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <StepIcon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    )}
                  </div>
                  {index < totalSteps - 1 && (
                    <div className={`w-8 sm:w-12 h-1 mx-1 rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Progress Text */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-white font-medium">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2 mt-2 bg-slate-700 [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-emerald-500" />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 relative">
        {/* Welcome Message */}
        {currentStep === 0 && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full mb-4">
              <LinkIcon className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Public Form</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              {linkData?.title || linkData?.form_name || 'Welcome!'} 👋
            </h1>
            {linkData?.description ? (
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                {linkData.description}
              </p>
            ) : (
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                Please complete the following steps to submit your information.
              </p>
            )}
          </div>
        )}

        {/* Form Sections */}
        {currentStep < formSections.length && (
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700 shadow-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-800/50 border-b border-slate-700 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                  {(() => {
                    const StepIcon = getStepIcon(currentStep);
                    return <StepIcon className="w-6 h-6 text-white" />;
                  })()}
                </div>
                <div>
                  <CardTitle className="text-xl text-white">{formSections[currentStep].title}</CardTitle>
                  {formSections[currentStep].description && (
                    <CardDescription className="text-slate-400 mt-1">
                      {formSections[currentStep].description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {formSections[currentStep].fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  {field.type !== "checkbox" && (
                    <Label htmlFor={field.id} className="text-slate-300 font-medium">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
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
          <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700 shadow-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-800/50 border-b border-slate-700 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Upload Documents</CardTitle>
                  <CardDescription className="text-slate-400 mt-1">
                    Upload required documents • Supports PDF, JPG, PNG
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {requiredDocuments.map((doc) => {
                const uploaded = getUploadedFile(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`group p-5 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                      uploaded 
                        ? "border-green-500/50 bg-green-500/10" 
                        : "border-slate-600 bg-slate-800/50 hover:border-primary/50 hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        uploaded 
                          ? 'bg-green-500/20' 
                          : 'bg-slate-700 group-hover:bg-primary/20'
                      }`}>
                        {uploaded ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <Upload className={`w-6 h-6 text-slate-400 group-hover:text-primary transition-colors`} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">
                          {doc.name}
                          {doc.required && <span className="text-red-400 ml-1">*</span>}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">{doc.description}</p>
                        
                        {uploaded ? (
                          <div className="flex items-center gap-3 mt-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                            <FileText className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <span className="text-sm text-slate-300 truncate flex-1">{uploaded.name}</span>
                            <button
                              onClick={() => removeFile(doc.id)}
                              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4">
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
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-sm font-medium text-white cursor-pointer transition-all hover:shadow-lg"
                            >
                              <Upload className="w-4 h-4" />
                              Choose File
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* AI Processing Note */}
              <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">AI-Powered Processing</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Your documents will be automatically scanned and processed using AI to extract relevant information.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < formSections.length ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!validateCurrentStep()}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-500/90 hover:to-emerald-500/90 text-white shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:shadow-none"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !validateForm()}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-500/90 hover:to-emerald-500/90 text-white shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:shadow-none min-w-[180px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Form
                </>
              )}
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-700/50 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-400">Your information is encrypted and secure</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Powered by</span>
            <BrocaLogo size="sm" />
          </div>
        </div>
      </footer>
    </div>
  );
}
