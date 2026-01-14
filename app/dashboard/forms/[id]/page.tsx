"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RealEstateFormBuilder from "@/components/forms/RealEstateFormBuilder";
import LifeInsuranceFormBuilder from "@/components/forms/LifeInsuranceFormBuilder";
import MortgageFormBuilder from "@/components/forms/MortgageFormBuilder";
import BlankFormBuilder from "@/components/forms/BlankFormBuilder";
import RealEstateFormViewer from "@/components/forms/RealEstateFormViewer";
import { useFormTemplate, useUpdateFormTemplate } from "@/lib/hooks/use-database";
import { toast } from "sonner";
import type { FormCategory } from "@/lib/types/database";
import { useState, Suspense } from "react";

function FormDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = params.id as string;
  const initialTab = searchParams.get("tab") === "edit" ? "edit" : "preview";
  const [activeTab, setActiveTab] = useState<"preview" | "edit">(initialTab);
  
  const { data: form, isLoading, error } = useFormTemplate(formId);
  const updateForm = useUpdateFormTemplate();

  const handleSave = async (formData: {
    sections: unknown[];
    customFields: unknown[];
    requiredDocuments: unknown[];
    formName: string;
    formDescription: string;
  }, category: FormCategory = "general") => {
    try {
      const baseFieldsCount = (formData.sections as Array<{ fields: unknown[] }>).reduce(
        (acc, section) => acc + section.fields.length, 0
      );
      const totalFields = baseFieldsCount + (formData.customFields as unknown[]).length;

      const formStructure = [{
        baseSections: formData.sections,
        customFields: formData.customFields,
        requiredDocuments: formData.requiredDocuments,
        templateType: getTemplateType(),
      }];

      await updateForm.mutateAsync({
        id: formId,
        data: {
          name: formData.formName,
          description: formData.formDescription,
          category: category,
          fields: formStructure,
          fields_count: totalFields,
        }
      });
      
      toast.success("Form template updated successfully!");
      router.push("/dashboard/forms");
    } catch {
      toast.error("Failed to update form template");
    }
  };

  // Determine template type from stored form data
  const getTemplateType = () => {
    if (form?.fields && Array.isArray(form.fields) && form.fields[0]) {
      return (form.fields[0] as { templateType?: string }).templateType || "real-estate-intake";
    }
    return "real-estate-intake";
  };

  // Type definitions matching RealEstateFormViewer
  type FieldType = "text" | "tel" | "email" | "textarea" | "checkbox" | "checkbox_group";
  
  interface FormField {
    id: string;
    type: FieldType;
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

  // Get form data structure for viewer/builder
  const getFormDataForViewer = () => {
    if (form?.fields && Array.isArray(form.fields) && form.fields[0]) {
      const stored = form.fields[0] as {
        baseSections?: FormSection[];
        customFields?: FormField[];
        requiredDocuments?: { id: string; name: string; description: string; required: boolean }[];
      };
      return {
        formName: form.name,
        formDescription: form.description || "",
        sections: (stored.baseSections || []) as FormSection[],
        customFields: (stored.customFields || []) as FormField[],
        requiredDocuments: (stored.requiredDocuments || []) as { id: string; name: string; description: string; required: boolean }[],
      };
    }
    // Return empty structure if no form data
    return {
      formName: form?.name || "",
      formDescription: form?.description || "",
      sections: [] as FormSection[],
      customFields: [] as FormField[],
      requiredDocuments: [] as { id: string; name: string; description: string; required: boolean }[],
    };
  };

  // Get initial data for builder - only pass the subset that builders accept
  const getInitialDataForBuilder = () => {
    if (form?.fields && Array.isArray(form.fields) && form.fields[0]) {
      const stored = form.fields[0] as {
        baseSections?: FormSection[];
        customFields?: FormField[];
        requiredDocuments?: { id: string; name: string; description: string; required: boolean }[];
      };
      return {
        formName: form.name,
        formDescription: form.description || "",
        customFields: stored.customFields as FormField[] | undefined,
        requiredDocuments: stored.requiredDocuments as { id: string; name: string; description: string; required: boolean }[] | undefined,
      };
    }
    return undefined;
  };

  const renderFormBuilder = () => {
    const templateType = getTemplateType();
    const initialData = getInitialDataForBuilder();
    
    switch (templateType) {
      case "life-insurance":
        return (
          <LifeInsuranceFormBuilder 
            onSave={(data) => handleSave(data, "general")}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialData={initialData as any}
          />
        );
      case "mortgage":
        return (
          <MortgageFormBuilder 
            onSave={(data) => handleSave(data, "buyer")}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialData={initialData as any}
          />
        );
      case "real-estate-intake":
        return (
          <RealEstateFormBuilder 
            onSave={(data) => handleSave(data, "general")}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialData={initialData as any}
          />
        );
      case "blank":
      default:
        return (
          <BlankFormBuilder 
            onSave={(data) => handleSave(data, "general")}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialData={initialData as any}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !form) {
    return (
      <DashboardLayout title="Form Not Found" subtitle="">
        <div className="app-card p-12 text-center">
          <h3 className="font-semibold text-app-foreground mb-2">Form template not found</h3>
          <p className="text-app-muted mb-4">The form you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push("/dashboard/forms")}>
            Back to Forms
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const formDataForViewer = getFormDataForViewer();

  return (
    <DashboardLayout
      title={form.name}
      subtitle={form.description || "No description"}
      headerAction={
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${form.status === "active" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
            {form.status === "active" ? "Active" : "Draft"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/forms")}
            className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forms
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "edit")} className="w-full">
        <TabsList className="bg-app-muted border-app mb-6">
          <TabsTrigger value="preview" className="data-[state=active]:bg-app-card">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="edit" className="data-[state=active]:bg-app-card">
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview">
          <div className="app-card p-6">
            <div className="mb-6 pb-6 border-b border-app">
              <h2 className="text-xl font-semibold text-app-foreground mb-2">Form Preview</h2>
              <p className="text-app-muted">This is how the form will appear to clients during onboarding.</p>
            </div>
            {formDataForViewer.sections.length > 0 || formDataForViewer.customFields.length > 0 ? (
              <RealEstateFormViewer 
                formData={formDataForViewer}
                readOnly={true}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-app-muted">This form has no fields yet. Switch to Edit mode to add fields.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="edit">
          {renderFormBuilder()}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

export default function FormDetailPage() {
  return (
    <Suspense fallback={
      <DashboardLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    }>
      <FormDetailContent />
    </Suspense>
  );
}