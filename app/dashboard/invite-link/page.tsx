"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Link as LinkIcon,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  ClipboardList,
  Check,
  Home,
  Heart,
  Building2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Pause,
  Play,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFormTemplates, useSubscription } from "@/lib/hooks/use-database";
import { usePublicFormLinks, useCreatePublicFormLink, useUpdatePublicFormLink, useDeletePublicFormLink, PublicFormLink } from "@/lib/hooks/use-invite-links";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  active: { label: "Active", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  paused: { label: "Paused", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  expired: { label: "Expired", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
};

const wizardSteps = [
  { id: 1, title: "Select Form", icon: ClipboardList },
  { id: 2, title: "Link Settings", icon: LinkIcon },
  { id: 3, title: "Review", icon: CheckCircle },
];

export default function InviteLink() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewLinkOpen, setIsNewLinkOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  
  // Wizard state
  const [selectedForm, setSelectedForm] = useState("");
  const [linkSettings, setLinkSettings] = useState({ 
    title: "", 
    description: "",
  });

  // Fetch links from database
  const { data: links, isLoading } = usePublicFormLinks();
  const createLink = useCreatePublicFormLink();
  const updateLink = useUpdatePublicFormLink();
  const deleteLink = useDeletePublicFormLink();
  
  // Fetch subscription to check token balance
  const { data: subscription } = useSubscription();
  const tokensRemaining = subscription?.tokens_remaining || 0;
  const hasEnoughTokens = tokensRemaining >= 5;
  
  // Fetch form templates from database
  const { data: dbFormTemplates = [], isLoading: formsLoading } = useFormTemplates();
  
  // Quick-start templates
  const quickStartTemplates = [
    { id: "quick-real-estate", name: "Real Estate Intake", fields: 18, icon: Home, color: "text-primary bg-primary/10" },
    { id: "quick-life-insurance", name: "Life Insurance", fields: 22, icon: Heart, color: "text-red-600 bg-red-100" },
    { id: "quick-mortgage", name: "Mortgage Application", fields: 25, icon: Building2, color: "text-blue-600 bg-blue-100" },
  ];
  
  // Custom form templates
  const customFormTemplates = dbFormTemplates.map(form => ({
    id: form.id,
    name: form.name,
    fields: form.fields_count || 0,
    icon: ClipboardList,
    color: "text-app-muted bg-app-card",
    isCustom: true
  }));
  
  const allFormTemplates = [...quickStartTemplates, ...customFormTemplates];

  const filteredLinks = (links || []).filter((link: PublicFormLink) =>
    (link.form_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (link.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateLink = async () => {
    if (!selectedForm) return;
    
    const selectedFormDetails = allFormTemplates.find(f => f.id === selectedForm);
    
    try {
      const result = await createLink.mutateAsync({
        formTemplateId: selectedForm.startsWith('quick-') ? undefined : selectedForm,
        formType: selectedForm.startsWith('quick-') ? selectedForm : undefined,
        formName: selectedFormDetails?.name,
        title: linkSettings.title || undefined,
        description: linkSettings.description || undefined,
      });
      
      setGeneratedLink(result.publicLink);
      
      toast({
        title: "Link Created!",
        description: "Your shareable form link is ready to copy.",
      });
      
    } catch (error) {
      console.error('Failed to create link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create link",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async (link: string, linkId?: string) => {
    try {
      await navigator.clipboard.writeText(link);
      if (linkId) {
        setCopiedLinkId(linkId);
        setTimeout(() => setCopiedLinkId(null), 2000);
      }
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (linkId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await updateLink.mutateAsync({
        linkId,
        status: newStatus,
      });
      toast({
        title: newStatus === 'active' ? "Link Activated" : "Link Paused",
        description: newStatus === 'active' 
          ? "This link is now accepting submissions" 
          : "This link is paused and won't accept new submissions",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteLink.mutateAsync(linkId);
      toast({
        title: "Link Deleted",
        description: "The form link has been deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete link",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsNewLinkOpen(open);
    if (!open) {
      setWizardStep(1);
      setSelectedForm("");
      setLinkSettings({ title: "", description: "" });
      setGeneratedLink(null);
    }
  };

  const canProceed = () => {
    switch (wizardStep) {
      case 1:
        return selectedForm !== "";
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const selectedFormDetails = allFormTemplates.find(f => f.id === selectedForm);
  const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <DashboardLayout 
      title="Invite Through Link" 
      subtitle="Generate shareable form links for anyone to fill out"
      headerAction={
        <Dialog open={isNewLinkOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Generate Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-app-card border-app max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-app-foreground font-display">
                {generatedLink ? "Your Link is Ready!" : "Generate Form Link"}
              </DialogTitle>
              <DialogDescription className="text-app-muted">
                {generatedLink 
                  ? "Copy and share this link with anyone you want to fill out the form."
                  : "Create a shareable link that anyone can use to submit a form."}
              </DialogDescription>
            </DialogHeader>

            {/* Show generated link */}
            {generatedLink ? (
              <div className="py-6 space-y-6">
                <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-app-foreground">Shareable Link</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={generatedLink} 
                      readOnly 
                      className="bg-app-muted border-app text-app-foreground"
                    />
                    <Button 
                      onClick={() => handleCopyLink(generatedLink)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-app-muted rounded-xl space-y-3">
                  <h3 className="font-medium text-app-foreground flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    Link Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-app-muted">Form:</span>
                      <span className="ml-2 text-app-foreground">{selectedFormDetails?.name}</span>
                    </div>
                    {linkSettings.title && (
                      <div>
                        <span className="text-app-muted">Title:</span>
                        <span className="ml-2 text-app-foreground">{linkSettings.title}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Note:</strong> Each form submission will deduct <strong>5 tokens</strong> + <strong>10 tokens per AI-scanned document</strong> from your account.
                    </span>
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline"
                    className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
                    onClick={() => window.open(generatedLink, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview Form
                  </Button>
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => handleDialogClose(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Wizard Progress */}
                <div className="flex items-center justify-between px-2 py-4 border-b border-app">
                  {wizardSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          wizardStep > step.id 
                            ? "bg-primary text-primary-foreground" 
                            : wizardStep === step.id 
                              ? "bg-primary/20 text-primary border-2 border-primary" 
                              : "bg-app-muted text-app-muted"
                        }`}>
                          {wizardStep > step.id ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <step.icon className="w-5 h-5" />
                          )}
                        </div>
                        <span className={`text-sm font-medium hidden sm:block ${
                          wizardStep >= step.id ? "text-app-foreground" : "text-app-muted"
                        }`}>
                          {step.title}
                        </span>
                      </div>
                      {index < wizardSteps.length - 1 && (
                        <div className={`w-12 h-0.5 mx-2 ${
                          wizardStep > step.id ? "bg-primary" : "bg-app-muted"
                        }`} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Step Content */}
                <div className="py-6 flex-1 overflow-y-auto min-h-0 max-h-[50vh]">
                  {/* Step 1: Select Form */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm text-app-muted">Select the form template for this link:</p>
                      <div className="space-y-3 pr-2">
                        {formsLoading ? (
                          <div className="p-6 text-center">
                            <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                            <p className="text-app-muted">Loading form templates...</p>
                          </div>
                        ) : (
                          <>
                            {/* Quick Start Templates */}
                            <div className="mb-4">
                              <p className="text-xs font-medium text-app-muted uppercase tracking-wide mb-3">Quick Start Templates</p>
                              <div className="space-y-2">
                                {quickStartTemplates.map((form) => {
                                  const IconComponent = form.icon;
                                  return (
                                    <div
                                      key={form.id}
                                      onClick={() => setSelectedForm(form.id)}
                                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        selectedForm === form.id
                                          ? "border-primary bg-primary/10"
                                          : "border-app bg-app-muted hover:border-app-muted"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${form.color}`}>
                                            <IconComponent className="w-5 h-5" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium text-app-foreground truncate">{form.name}</p>
                                            <p className="text-sm text-app-muted">{form.fields} fields</p>
                                          </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                          selectedForm === form.id
                                            ? "border-primary bg-primary"
                                            : "border-app-muted"
                                        }`}>
                                          {selectedForm === form.id && (
                                            <Check className="w-4 h-4 text-primary-foreground" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Custom Form Templates */}
                            {customFormTemplates.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-app-muted uppercase tracking-wide mb-3">Your Custom Forms</p>
                                <div className="space-y-2">
                                  {customFormTemplates.map((form) => (
                                    <div
                                      key={form.id}
                                      onClick={() => setSelectedForm(form.id)}
                                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        selectedForm === form.id
                                          ? "border-primary bg-primary/10"
                                          : "border-app bg-app-muted hover:border-app-muted"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            selectedForm === form.id ? "bg-primary/20" : "bg-app-card"
                                          }`}>
                                            <ClipboardList className={`w-5 h-5 ${
                                              selectedForm === form.id ? "text-primary" : "text-app-muted"
                                            }`} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-medium text-app-foreground truncate">{form.name}</p>
                                            <p className="text-sm text-app-muted">{form.fields} fields</p>
                                          </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                          selectedForm === form.id
                                            ? "border-primary bg-primary"
                                            : "border-app-muted"
                                        }`}>
                                          {selectedForm === form.id && (
                                            <Check className="w-4 h-4 text-primary-foreground" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Link Settings */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm text-app-muted">Optional: Customize your link (leave blank to use defaults)</p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-app-foreground">Link Title (Optional)</Label>
                          <Input 
                            id="title" 
                            placeholder="e.g., Home Buyer Intake Form"
                            value={linkSettings.title}
                            onChange={(e) => setLinkSettings({ ...linkSettings, title: e.target.value })}
                            className="bg-app-muted border-app text-app-foreground"
                          />
                          <p className="text-xs text-app-muted">Shown at the top of the form</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-app-foreground">Description (Optional)</Label>
                          <Textarea 
                            id="description" 
                            placeholder="Provide any additional instructions for form fillers..."
                            value={linkSettings.description}
                            onChange={(e) => setLinkSettings({ ...linkSettings, description: e.target.value })}
                            className="bg-app-muted border-app text-app-foreground resize-none"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review */}
                  {wizardStep === 3 && (
                    <div className="space-y-6">
                      <div className="p-4 bg-app-muted rounded-xl">
                        <h3 className="font-medium text-app-foreground mb-3 flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-primary" />
                          Selected Form
                        </h3>
                        <p className="text-app-foreground">{selectedFormDetails?.name}</p>
                        <p className="text-sm text-app-muted">{selectedFormDetails?.fields} fields to complete</p>
                      </div>

                      {(linkSettings.title || linkSettings.description) && (
                        <div className="p-4 bg-app-muted rounded-xl">
                          <h3 className="font-medium text-app-foreground mb-3 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-primary" />
                            Link Settings
                          </h3>
                          {linkSettings.title && (
                            <div className="mb-2">
                              <span className="text-app-muted text-sm">Title:</span>
                              <p className="text-app-foreground">{linkSettings.title}</p>
                            </div>
                          )}
                          {linkSettings.description && (
                            <div>
                              <span className="text-app-muted text-sm">Description:</span>
                              <p className="text-app-foreground text-sm">{linkSettings.description}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                        <p className="text-sm text-app-foreground flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-primary" />
                          Form submissions cost <strong>5 tokens</strong> + <strong>10 tokens per AI document scan</strong>
                        </p>
                      </div>

                      {!hasEnoughTokens && (
                        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                          <p className="text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <strong>Insufficient tokens.</strong> You need at least 5 tokens. Current balance: {tokensRemaining} tokens.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Wizard Navigation */}
                <div className="flex justify-between pt-4 border-t border-app">
                  <Button 
                    variant="outline" 
                    className="bg-app-card border-app text-app-foreground hover:bg-app-muted"
                    onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : handleDialogClose(false)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {wizardStep === 1 ? "Cancel" : "Back"}
                  </Button>
                  
                  {wizardStep < 3 ? (
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => setWizardStep(wizardStep + 1)}
                      disabled={!canProceed()}
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleCreateLink}
                      disabled={createLink.isPending || !hasEnoughTokens}
                    >
                      {createLink.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LinkIcon className="w-4 h-4 mr-2" />
                      )}
                      {createLink.isPending ? 'Creating...' : 'Generate Link'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      }
    >
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">{links?.length || 0}</p>
              <p className="text-sm text-app-muted">Total Links</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">
                {links?.filter((l: PublicFormLink) => l.status === "active").length || 0}
              </p>
              <p className="text-sm text-app-muted">Active Links</p>
            </div>
          </div>
        </div>
        <div className="app-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-app-foreground">
                {links?.reduce((sum: number, l: PublicFormLink) => sum + (l.submissions_count || 0), 0) || 0}
              </p>
              <p className="text-sm text-app-muted">Total Submissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="app-card p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
          <Input 
            placeholder="Search links by form name or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
          />
        </div>
      </div>

      {/* Links Table */}
      <div className="app-card overflow-hidden">
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-app-muted">Loading links...</p>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-12 text-center">
              <LinkIcon className="w-12 h-12 text-app-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-app-foreground mb-2">No links yet</h3>
              <p className="text-app-muted mb-4">Generate your first shareable form link to get started.</p>
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setIsNewLinkOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Link
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-app hover:bg-transparent">
                  <TableHead className="text-app-muted font-semibold">Form</TableHead>
                  <TableHead className="text-app-muted font-semibold">Link</TableHead>
                  <TableHead className="text-app-muted font-semibold">Status</TableHead>
                  <TableHead className="text-app-muted font-semibold hidden md:table-cell">Submissions</TableHead>
                  <TableHead className="text-app-muted font-semibold hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-app-muted font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link: PublicFormLink) => {
                  const StatusIcon = statusConfig[link.status as keyof typeof statusConfig]?.icon || Clock;
                  const statusInfo = statusConfig[link.status as keyof typeof statusConfig] || statusConfig.active;
                  const fullLink = `${APP_URL}/form/${link.link_token}`;
                  
                  return (
                    <TableRow 
                      key={link.id} 
                      className="border-app hover:bg-app-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-app-foreground">{link.form_name || 'Standard Form'}</p>
                            {link.title && (
                              <p className="text-sm text-app-muted">{link.title}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-app-muted px-2 py-1 rounded text-app-muted truncate max-w-[200px]">
                            /form/{link.link_token.substring(0, 8)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyLink(fullLink, link.id)}
                          >
                            {copiedLinkId === link.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-app-muted" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${statusInfo.color} border font-medium`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-app-foreground font-medium">{link.submissions_count || 0}</span>
                        {link.max_submissions && (
                          <span className="text-app-muted">/{link.max_submissions}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-app-muted">
                        {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-app-muted hover:text-app-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-app-card border-app">
                            <DropdownMenuItem 
                              className="text-app-foreground hover:bg-app-muted cursor-pointer"
                              onClick={() => handleCopyLink(fullLink, link.id)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-app-foreground hover:bg-app-muted cursor-pointer"
                              onClick={() => window.open(fullLink, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open Form
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-app-muted" />
                            <DropdownMenuItem 
                              className="text-app-foreground hover:bg-app-muted cursor-pointer"
                              onClick={() => handleToggleStatus(link.id, link.status)}
                            >
                              {link.status === 'active' ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Pause Link
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Activate Link
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => handleDeleteLink(link.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
