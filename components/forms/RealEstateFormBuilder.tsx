"use client";

import { useState } from "react";
import { 
  Plus, 
  Trash2, 
  GripVertical,
  CheckSquare,
  TextCursor,
  Upload,
  FileText,
  Save,
  Eye,
  ChevronDown,
  ChevronUp,
  List,
  ToggleLeft,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

// Base Real Estate Form Questions
const baseFormSections = [
  {
    id: "client_type",
    title: "Client Type",
    description: "Select the type of client",
    fields: [
      {
        id: "client_type",
        type: "checkbox_group",
        label: "I am a:",
        options: ["Seller", "Buyer", "Lease/Rental"],
        required: true,
      },
    ],
  },
  {
    id: "primary_contact",
    title: "Primary Contact Information",
    description: "Client 1 details",
    fields: [
      { id: "client1_name", type: "text", label: "Full Name", placeholder: "Enter full name", required: true },
      { id: "client1_phone", type: "tel", label: "Phone Number", placeholder: "(555) 123-4567", required: true },
      { id: "client1_email", type: "email", label: "Email Address", placeholder: "email@example.com", required: true },
      {
        id: "client1_contact_time",
        type: "checkbox_group",
        label: "Preferred Contact Time",
        options: ["Morning", "Afternoon", "Evening"],
        required: false,
      },
      {
        id: "client1_contact_type",
        type: "checkbox_group",
        label: "Preferred Contact Method",
        options: ["Call", "Text", "Email"],
        required: false,
      },
    ],
  },
  {
    id: "secondary_contact",
    title: "Secondary Contact Information (Optional)",
    description: "Client 2 details (if applicable)",
    fields: [
      { id: "client2_name", type: "text", label: "Full Name", placeholder: "Enter full name", required: false },
      { id: "client2_phone", type: "tel", label: "Phone Number", placeholder: "(555) 123-4567", required: false },
      { id: "client2_email", type: "email", label: "Email Address", placeholder: "email@example.com", required: false },
      {
        id: "client2_contact_time",
        type: "checkbox_group",
        label: "Preferred Contact Time",
        options: ["Morning", "Afternoon", "Evening"],
        required: false,
      },
      {
        id: "client2_contact_type",
        type: "checkbox_group",
        label: "Preferred Contact Method",
        options: ["Call", "Text", "Email"],
        required: false,
      },
    ],
  },
  {
    id: "property_info",
    title: "Property Information",
    description: "Address and property details",
    fields: [
      { id: "property_address", type: "textarea", label: "Property Address", placeholder: "Enter full address", required: true },
      { id: "lead_source", type: "text", label: "How did you hear about us?", placeholder: "Referral, Online, etc.", required: false },
    ],
  },
];

// Default required documents
const defaultRequiredDocuments = [
  { id: "govt_id", name: "Government-issued ID", description: "Driver's license, passport, etc.", required: true },
  { id: "proof_income", name: "Proof of Income", description: "Pay stubs, tax returns, etc.", required: false },
  { id: "bank_statements", name: "Bank Statements", description: "Last 2-3 months", required: false },
  { id: "pre_approval", name: "Pre-Approval Letter", description: "For buyers", required: false },
];

interface CustomField {
  id: string;
  type: "text" | "checkbox" | "checkbox_group";
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
}

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

interface RealEstateFormBuilderProps {
  onSave?: (formData: {
    sections: typeof baseFormSections;
    customFields: CustomField[];
    requiredDocuments: RequiredDocument[];
    formName: string;
    formDescription: string;
  }) => void;
  initialData?: {
    customFields?: CustomField[];
    requiredDocuments?: RequiredDocument[];
    formName?: string;
    formDescription?: string;
  };
}

export default function RealEstateFormBuilder({ onSave, initialData }: RealEstateFormBuilderProps) {
  const [formName, setFormName] = useState(initialData?.formName || "New Client Intake Form");
  const [formDescription, setFormDescription] = useState(
    initialData?.formDescription || "Complete this form to begin your real estate journey with us."
  );
  const [customFields, setCustomFields] = useState<CustomField[]>(initialData?.customFields || []);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>(
    initialData?.requiredDocuments || defaultRequiredDocuments
  );
  
  // Add Question Dialog State
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<"text" | "checkbox" | "checkbox_group">("text");
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionPlaceholder, setNewQuestionPlaceholder] = useState("");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [checkboxOptions, setCheckboxOptions] = useState<string[]>([""]);
  
  // Document Dialog State
  const [newDocName, setNewDocName] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  
  const [expandedSections, setExpandedSections] = useState<string[]>(["client_type", "primary_contact"]);
  const [showPreview, setShowPreview] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Add checkbox option
  const addCheckboxOption = () => {
    setCheckboxOptions([...checkboxOptions, ""]);
  };

  // Update checkbox option
  const updateCheckboxOption = (index: number, value: string) => {
    const updated = [...checkboxOptions];
    updated[index] = value;
    setCheckboxOptions(updated);
  };

  // Remove checkbox option
  const removeCheckboxOption = (index: number) => {
    if (checkboxOptions.length > 1) {
      setCheckboxOptions(checkboxOptions.filter((_, i) => i !== index));
    }
  };

  // Reset add question form
  const resetAddQuestionForm = () => {
    setNewQuestionType("text");
    setNewQuestionLabel("");
    setNewQuestionPlaceholder("");
    setNewQuestionRequired(false);
    setCheckboxOptions([""]);
  };

  // Add custom field
  const addCustomField = () => {
    if (!newQuestionLabel.trim()) return;

    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      type: newQuestionType,
      label: newQuestionLabel,
      placeholder: newQuestionType === "text" ? (newQuestionPlaceholder || `Enter ${newQuestionLabel.toLowerCase()}`) : undefined,
      options: newQuestionType === "checkbox_group" 
        ? checkboxOptions.filter(o => o.trim() !== "") 
        : newQuestionType === "checkbox" 
          ? ["Yes"]
          : undefined,
      required: newQuestionRequired,
    };

    setCustomFields([...customFields, newField]);
    resetAddQuestionForm();
    setIsAddQuestionOpen(false);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const toggleFieldRequired = (id: string) => {
    setCustomFields(customFields.map(f =>
      f.id === id ? { ...f, required: !f.required } : f
    ));
  };

  const addRequiredDocument = () => {
    if (!newDocName.trim()) return;

    const newDoc: RequiredDocument = {
      id: `doc_${Date.now()}`,
      name: newDocName,
      description: newDocDescription,
      required: false,
    };

    setRequiredDocuments([...requiredDocuments, newDoc]);
    setNewDocName("");
    setNewDocDescription("");
  };

  const removeDocument = (id: string) => {
    setRequiredDocuments(requiredDocuments.filter(d => d.id !== id));
  };

  const toggleDocumentRequired = (id: string) => {
    setRequiredDocuments(requiredDocuments.map(d =>
      d.id === id ? { ...d, required: !d.required } : d
    ));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        sections: baseFormSections,
        customFields,
        requiredDocuments,
        formName,
        formDescription,
      });
    }
  };

  const totalFields = baseFormSections.reduce((acc, s) => acc + s.fields.length, 0) + customFields.length;

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Form Details
          </CardTitle>
          <CardDescription className="text-app-muted">
            Customize your form name and description
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-app-foreground">Form Name</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-app-muted border-app text-app-foreground"
              placeholder="Enter form name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-app-foreground">Form Description</Label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="bg-app-muted border-app text-app-foreground resize-none"
              placeholder="Enter form description"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Badge className="bg-primary/20 text-primary">
              {totalFields} Fields
            </Badge>
            <Badge className="bg-accent/20 text-accent">
              {requiredDocuments.length} Documents
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Base Form Sections */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground">Base Form Questions</CardTitle>
          <CardDescription className="text-app-muted">
            Standard real estate intake questions (cannot be removed)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {baseFormSections.map((section) => (
            <Collapsible
              key={section.id}
              open={expandedSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 rounded-lg bg-app-muted/50 cursor-pointer hover:bg-app-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-app-muted" />
                    <div>
                      <h4 className="font-medium text-app-foreground">{section.title}</h4>
                      <p className="text-sm text-app-muted">{section.fields.length} fields</p>
                    </div>
                  </div>
                  {expandedSections.includes(section.id) ? (
                    <ChevronUp className="w-5 h-5 text-app-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-app-muted" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pl-11 space-y-2">
                {section.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-app bg-app-card"
                  >
                    <div className="flex items-center gap-3">
                      {field.type === "checkbox_group" ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <TextCursor className="w-4 h-4 text-primary" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-app-foreground">{field.label}</p>
                        {field.type === "checkbox_group" && field.options && (
                          <p className="text-xs text-app-muted">
                            Options: {field.options.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    {field.required && (
                      <Badge variant="outline" className="text-destructive border-destructive/50">
                        Required
                      </Badge>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <Card className="bg-app-card border-app">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-app-foreground flex items-center gap-2 text-xl">
                <Plus className="w-5 h-5 text-accent" />
                Custom Questions
              </CardTitle>
              <CardDescription className="text-app-muted mt-1">
                Add your own questions to the form
              </CardDescription>
            </div>
            <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-app-card border-app max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-app-foreground">Add New Question</DialogTitle>
                  <DialogDescription className="text-app-muted">
                    Choose a question type and configure it
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-2">
                  {/* Question Type Selection */}
                  <div className="space-y-3">
                    <Label className="text-app-foreground font-medium">Question Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewQuestionType("text")}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          newQuestionType === "text"
                            ? "border-primary bg-primary/10"
                            : "border-app hover:border-primary/50"
                        }`}
                      >
                        <TextCursor className={`w-6 h-6 mx-auto mb-2 ${newQuestionType === "text" ? "text-primary" : "text-app-muted"}`} />
                        <p className={`text-sm font-medium ${newQuestionType === "text" ? "text-primary" : "text-app-foreground"}`}>
                          Text Field
                        </p>
                        <p className="text-xs text-app-muted mt-1">Short answer</p>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setNewQuestionType("checkbox")}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          newQuestionType === "checkbox"
                            ? "border-primary bg-primary/10"
                            : "border-app hover:border-primary/50"
                        }`}
                      >
                        <ToggleLeft className={`w-6 h-6 mx-auto mb-2 ${newQuestionType === "checkbox" ? "text-primary" : "text-app-muted"}`} />
                        <p className={`text-sm font-medium ${newQuestionType === "checkbox" ? "text-primary" : "text-app-foreground"}`}>
                          Yes/No
                        </p>
                        <p className="text-xs text-app-muted mt-1">Single toggle</p>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setNewQuestionType("checkbox_group")}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          newQuestionType === "checkbox_group"
                            ? "border-primary bg-primary/10"
                            : "border-app hover:border-primary/50"
                        }`}
                      >
                        <List className={`w-6 h-6 mx-auto mb-2 ${newQuestionType === "checkbox_group" ? "text-primary" : "text-app-muted"}`} />
                        <p className={`text-sm font-medium ${newQuestionType === "checkbox_group" ? "text-primary" : "text-app-foreground"}`}>
                          Multiple Choice
                        </p>
                        <p className="text-xs text-app-muted mt-1">Select many</p>
                      </button>
                    </div>
                  </div>

                  {/* Question Label */}
                  <div className="space-y-2">
                    <Label className="text-app-foreground">Question Text</Label>
                    <Input
                      value={newQuestionLabel}
                      onChange={(e) => setNewQuestionLabel(e.target.value)}
                      className="bg-app-muted border-app text-app-foreground"
                      placeholder="e.g., What is your preferred contact time?"
                    />
                  </div>

                  {/* Placeholder for text fields */}
                  {newQuestionType === "text" && (
                    <div className="space-y-2">
                      <Label className="text-app-foreground">Placeholder Text (Optional)</Label>
                      <Input
                        value={newQuestionPlaceholder}
                        onChange={(e) => setNewQuestionPlaceholder(e.target.value)}
                        className="bg-app-muted border-app text-app-foreground"
                        placeholder="e.g., Enter your answer here..."
                      />
                    </div>
                  )}

                  {/* Options for checkbox group */}
                  {newQuestionType === "checkbox_group" && (
                    <div className="space-y-3">
                      <Label className="text-app-foreground">Answer Options</Label>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {checkboxOptions.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                              {index + 1}
                            </div>
                            <Input
                              value={option}
                              onChange={(e) => updateCheckboxOption(index, e.target.value)}
                              className="bg-app-muted border-app text-app-foreground flex-1"
                              placeholder={`Option ${index + 1}`}
                            />
                            {checkboxOptions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCheckboxOption(index)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCheckboxOption}
                        className="w-full bg-app-card border-app text-app-foreground hover:bg-app-muted"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Option
                      </Button>
                    </div>
                  )}

                  {/* Required toggle */}
                  <div className="flex items-center justify-between p-4 bg-app-muted rounded-lg">
                    <div>
                      <Label className="text-app-foreground font-medium">Required Question</Label>
                      <p className="text-xs text-app-muted mt-1">Client must answer this question</p>
                    </div>
                    <Switch
                      checked={newQuestionRequired}
                      onCheckedChange={setNewQuestionRequired}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetAddQuestionForm();
                      setIsAddQuestionOpen(false);
                    }}
                    className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addCustomField}
                    disabled={!newQuestionLabel.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Add Question
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-app rounded-lg">
              <Plus className="w-8 h-8 text-app-muted mx-auto mb-2" />
              <p className="text-app-muted">No custom questions added yet</p>
              <p className="text-sm text-app-muted mt-1">Click "Add Question" to create your first custom field</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-app bg-app-muted/30"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {field.type === "checkbox_group" ? (
                      <List className="w-4 h-4 text-accent flex-shrink-0" />
                    ) : field.type === "checkbox" ? (
                      <ToggleLeft className="w-4 h-4 text-accent flex-shrink-0" />
                    ) : (
                      <TextCursor className="w-4 h-4 text-accent flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-app-foreground">{field.label}</p>
                      {field.type === "checkbox_group" && field.options && (
                        <p className="text-xs text-app-muted truncate">
                          Options: {field.options.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {field.required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFieldRequired(field.id)}
                      className="text-app-muted hover:text-app-foreground"
                    >
                      {field.required ? "Make Optional" : "Make Required"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomField(field.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Required Documents */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Required Documents
          </CardTitle>
          <CardDescription className="text-app-muted">
            Specify which documents clients need to upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document List */}
          <div className="space-y-2">
            {requiredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-app bg-app-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-app-foreground">{doc.name}</p>
                    <p className="text-xs text-app-muted">{doc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDocumentRequired(doc.id)}
                    className={doc.required ? "text-destructive" : "text-app-muted"}
                  >
                    {doc.required ? "Required" : "Optional"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(doc.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Document */}
          <div className="p-4 rounded-lg border border-dashed border-app bg-app-muted/20">
            <h4 className="font-medium text-app-foreground mb-3">Add Document Requirement</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-app-foreground text-sm">Document Name</Label>
                <Input
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g., Property Deed"
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-app-foreground text-sm">Description</Label>
                <Input
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                  placeholder="e.g., Copy of the property deed"
                  className="bg-app-muted border-app text-app-foreground"
                />
              </div>
            </div>
            <Button
              onClick={addRequiredDocument}
              disabled={!newDocName.trim()}
              className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
          className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? "Hide Preview" : "Preview Form"}
        </Button>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Save className="w-4 h-4 mr-2" />
          Save Form Template
        </Button>
      </div>

      {/* Form Preview */}
      {showPreview && (
        <Card className="bg-app-card border-app">
          <CardHeader className="border-b border-app">
            <CardTitle className="text-app-foreground">{formName}</CardTitle>
            <CardDescription className="text-app-muted">{formDescription}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Base Sections Preview */}
            {baseFormSections.map((section) => (
              <div key={section.id} className="space-y-4">
                <div>
                  <h3 className="font-semibold text-app-foreground text-lg">{section.title}</h3>
                  <p className="text-sm text-app-muted">{section.description}</p>
                </div>
                <div className="grid gap-4">
                  {section.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-app-foreground">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.type === "checkbox_group" ? (
                        <div className="flex flex-wrap gap-4">
                          {field.options?.map((option) => (
                            <div key={option} className="flex items-center gap-2">
                              <Checkbox disabled className="border-app" />
                              <span className="text-sm text-app-foreground">{option}</span>
                            </div>
                          ))}
                        </div>
                      ) : field.type === "textarea" ? (
                        <Textarea
                          disabled
                          placeholder={field.placeholder}
                          className="bg-app-muted border-app text-app-foreground"
                        />
                      ) : (
                        <Input
                          disabled
                          type={field.type}
                          placeholder={field.placeholder}
                          className="bg-app-muted border-app text-app-foreground"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom Fields Preview */}
            {customFields.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-app-foreground text-lg">Additional Questions</h3>
                </div>
                <div className="grid gap-4">
                  {customFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-app-foreground">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {field.type === "checkbox_group" ? (
                        <div className="flex flex-wrap gap-4">
                          {field.options?.map((option) => (
                            <div key={option} className="flex items-center gap-2">
                              <Checkbox disabled className="border-app" />
                              <span className="text-sm text-app-foreground">{option}</span>
                            </div>
                          ))}
                        </div>
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-2">
                          <Checkbox disabled className="border-app" />
                          <span className="text-sm text-app-foreground">{field.label}</span>
                        </div>
                      ) : (
                        <Input
                          disabled
                          placeholder={field.placeholder}
                          className="bg-app-muted border-app text-app-foreground"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Preview */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-app-foreground text-lg">Document Upload</h3>
                <p className="text-sm text-app-muted">Please upload the following documents</p>
              </div>
              <div className="grid gap-3">
                {requiredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-lg border border-dashed border-app bg-app-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-app-foreground">
                          {doc.name}
                          {doc.required && <span className="text-destructive ml-1">*</span>}
                        </p>
                        <p className="text-sm text-app-muted">{doc.description}</p>
                      </div>
                      <Button variant="outline" size="sm" disabled className="border-app text-app-muted">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
