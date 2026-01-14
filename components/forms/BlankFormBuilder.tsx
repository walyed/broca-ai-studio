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
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

// Minimal base form - only Primary Contact Information
const baseFormSections = [
  {
    id: "primary_contact",
    title: "Primary Contact Information",
    description: "Basic client contact details",
    fields: [
      { id: "client_name", type: "text" as const, label: "Full Name", placeholder: "Enter full name", required: true },
      { id: "client_phone", type: "tel" as const, label: "Phone Number", placeholder: "(555) 123-4567", required: true },
      { id: "client_email", type: "email" as const, label: "Email Address", placeholder: "email@example.com", required: true },
    ],
  },
];

// Default required documents
const defaultRequiredDocuments = [
  { id: "govt_id", name: "Government-issued ID", description: "Driver's license, passport, etc.", required: true },
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

interface BlankFormBuilderProps {
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

export default function BlankFormBuilder({ onSave, initialData }: BlankFormBuilderProps) {
  const [formName, setFormName] = useState(initialData?.formName || "New Custom Form");
  const [formDescription, setFormDescription] = useState(
    initialData?.formDescription || "Please complete this form to get started."
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
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  
  // Section collapse state
  const [expandedSections, setExpandedSections] = useState<string[]>(["primary_contact", "custom_fields"]);

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
    setIsAddDocOpen(false);
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

  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case "text":
      case "tel":
      case "email":
        return <TextCursor className="w-4 h-4" />;
      case "checkbox":
        return <ToggleLeft className="w-4 h-4" />;
      case "checkbox_group":
        return <List className="w-4 h-4" />;
      default:
        return <TextCursor className="w-4 h-4" />;
    }
  };

  const getFieldTypeName = (type: string) => {
    switch (type) {
      case "text": return "Text Field";
      case "tel": return "Phone Field";
      case "email": return "Email Field";
      case "checkbox": return "Yes/No Toggle";
      case "checkbox_group": return "Multiple Choice";
      default: return "Field";
    }
  };

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
        </CardContent>
      </Card>

      {/* Base Questions - Primary Contact Only */}
      <Card className="bg-app-card border-app">
        <CardHeader>
          <CardTitle className="text-app-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            Base Questions
          </CardTitle>
          <CardDescription className="text-app-muted">
            These questions are always included in your form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {baseFormSections.map((section) => (
            <Collapsible
              key={section.id}
              open={expandedSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-app-muted rounded-lg cursor-pointer hover:bg-app-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-app-muted" />
                    <div>
                      <h4 className="font-medium text-app-foreground">{section.title}</h4>
                      <p className="text-xs text-app-muted">{section.fields.length} fields</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Required
                    </Badge>
                    {expandedSections.includes(section.id) ? (
                      <ChevronUp className="w-4 h-4 text-app-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-app-muted" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                {section.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg ml-6 border border-app"
                  >
                    <div className="flex items-center gap-3">
                      {getFieldTypeIcon(field.type)}
                      <div>
                        <span className="text-sm text-app-foreground">{field.label}</span>
                        <span className="text-xs text-app-muted ml-2">({getFieldTypeName(field.type)})</span>
                      </div>
                    </div>
                    {field.required && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Your Custom Questions
              </CardTitle>
              <CardDescription className="text-app-muted">
                Add your own questions to the form
              </CardDescription>
            </div>
            <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
              <p className="text-xs text-app-muted mt-1">Click &quot;Add Question&quot; to create your first custom question</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customFields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-4 bg-app-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                      {getFieldTypeIcon(field.type)}
                    </div>
                    <div>
                      <p className="font-medium text-app-foreground">{field.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-app-muted">{getFieldTypeName(field.type)}</span>
                        {field.type === "checkbox_group" && field.options && (
                          <span className="text-xs text-primary">
                            • {field.options.length} options
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`req_${field.id}`}
                        checked={field.required}
                        onCheckedChange={() => toggleFieldRequired(field.id)}
                      />
                      <Label htmlFor={`req_${field.id}`} className="text-xs text-app-muted cursor-pointer">
                        Required
                      </Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomField(field.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-app-foreground flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Required Documents
              </CardTitle>
              <CardDescription className="text-app-muted">
                Documents clients need to upload
              </CardDescription>
            </div>
            <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-app-card border-app">
                <DialogHeader>
                  <DialogTitle className="text-app-foreground">Add Required Document</DialogTitle>
                  <DialogDescription className="text-app-muted">
                    Add a document that clients need to upload
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-app-foreground">Document Name</Label>
                    <Input
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="bg-app-muted border-app text-app-foreground"
                      placeholder="e.g., Proof of Income"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-app-foreground">Description (Optional)</Label>
                    <Input
                      value={newDocDescription}
                      onChange={(e) => setNewDocDescription(e.target.value)}
                      className="bg-app-muted border-app text-app-foreground"
                      placeholder="e.g., Recent pay stubs or tax returns"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDocOpen(false)}
                    className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addRequiredDocument}
                    disabled={!newDocName.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Add Document
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requiredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-app-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-app-foreground">{doc.name}</p>
                    {doc.description && (
                      <p className="text-xs text-app-muted">{doc.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`doc_req_${doc.id}`}
                      checked={doc.required}
                      onCheckedChange={() => toggleDocumentRequired(doc.id)}
                    />
                    <Label htmlFor={`doc_req_${doc.id}`} className="text-xs text-app-muted cursor-pointer">
                      Required
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(doc.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between p-4 bg-app-card border border-app rounded-lg">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {totalFields} fields
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            {requiredDocuments.length} documents
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-app-card border-app text-app-foreground hover:bg-app-muted">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />
            Save Form
          </Button>
        </div>
      </div>
    </div>
  );
}
