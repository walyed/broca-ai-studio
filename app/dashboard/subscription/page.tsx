"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CreditCard, 
  Check, 
  Sparkles,
  Users,
  FileText,
  Crown,
  Download,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSubscription, useSubscriptionPlans, useBrokerStats } from "@/lib/hooks/use-database";
import { toast } from "sonner";

export default function Subscription() {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const router = useRouter();

  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { data: stats, isLoading: statsLoading } = useBrokerStats();

  const isLoading = subscriptionLoading || plansLoading || statsLoading;

  // Handle plan upgrade
  const handleUpgrade = async (planId: string, planName: string) => {
    setUpgradingPlan(planId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId,
          returnUrl: `${window.location.origin}/dashboard/subscription`,
          isUpgrade: true
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Failed to start upgrade process');
      setUpgradingPlan(null);
    }
  };

  // Redirect to plan selection if no subscription
  useEffect(() => {
    if (!isLoading && !subscription) {
      router.push('/signup?step=plan');
    }
  }, [isLoading, subscription, router]);

  const currentPlan = subscription?.plan;
  const renewalDate = subscription?.current_period_end 
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "N/A";

  if (isLoading) {
    return (
      <DashboardLayout title="Subscription & Billing" subtitle="Manage your subscription plan and billing information">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const tokensRemaining = subscription?.tokens_remaining || 0;
  const tokensUsed = subscription?.tokens_used || 0;
  const totalTokens = currentPlan?.tokens_per_month || 500;
  const tokenPercentage = totalTokens > 0 ? ((tokensRemaining / totalTokens) * 100) : 0;
  const clientCount = stats?.total_clients || 0;
  const documentCount = stats?.total_documents || 0;

  return (
    <DashboardLayout 
      title="Subscription & Billing" 
      subtitle="Manage your subscription plan and billing information"
      headerAction={
        <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-app-card border-app max-w-5xl">
            <DialogHeader>
              <DialogTitle className="text-app-foreground text-xl">Choose Your Plan</DialogTitle>
              <DialogDescription className="text-app-muted">
                Select the plan that best fits your business needs
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {plans.map((plan) => {
                const isCurrentPlan = plan.id === subscription?.plan_id;
                const isPopular = plan.name === "Professional";
                const isFree = plan.name === "Free";
                const isEnterprise = plan.name === "Enterprise";
                return (
                  <div 
                    key={plan.id}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isCurrentPlan
                        ? "border-primary bg-primary/10"
                        : isPopular 
                        ? "border-primary/50 bg-primary/5" 
                        : isFree
                        ? "border-gray-200 bg-gray-50"
                        : isEnterprise
                        ? "border-accent/50 bg-accent/5"
                        : "border-app-muted/30 bg-app-muted/10 hover:border-app-muted"
                    }`}
                  >
                    {isPopular && !isCurrentPlan && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5">
                        Popular
                      </Badge>
                    )}
                    {isCurrentPlan && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5">
                        Current
                      </Badge>
                    )}
                    <div className="text-center mb-3 pt-1">
                      <h3 className={`text-base font-semibold ${isFree ? "text-gray-700" : isEnterprise ? "text-accent" : "text-app-foreground"}`}>{plan.name}</h3>
                      <p className="text-xs text-app-muted mt-0.5">{plan.tokens_per_month} tokens/mo</p>
                      <div className="mt-2">
                        <span className={`text-2xl font-bold ${isFree ? "text-gray-700" : isEnterprise ? "text-accent" : "text-app-foreground"}`}>${plan.price}</span>
                        <span className="text-app-muted text-xs">/mo</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4 min-h-[100px]">
                      {(plan.features || []).slice(0, 4).map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-app-muted">
                          <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${isFree ? "text-gray-500" : isEnterprise ? "text-accent" : "text-primary"}`} />
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      size="sm"
                      className={`w-full text-xs h-8 ${
                        isCurrentPlan 
                          ? "bg-app-muted text-app-muted-foreground cursor-not-allowed" 
                          : isFree
                          ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          : isEnterprise
                          ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                          : isPopular 
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                          : "bg-app-muted hover:bg-app-muted/80 text-app-foreground"
                      }`}
                      variant={isPopular ? "default" : "secondary"}
                      disabled={isCurrentPlan || upgradingPlan === plan.id}
                      onClick={() => !isCurrentPlan && handleUpgrade(plan.id, plan.name)}
                    >
                      {upgradingPlan === plan.id ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : null}
                      {isCurrentPlan ? "Current" : upgradingPlan === plan.id ? "..." : currentPlan && plan.price > currentPlan.price ? "Upgrade" : "Select"}
                      {!isCurrentPlan && upgradingPlan !== plan.id && <ArrowRight className="w-3 h-3 ml-1" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Current Plan Card */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 app-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-display text-xl font-semibold text-app-foreground">{currentPlan?.name || "No Plan"}</h2>
                <Badge className={`${subscription?.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"} border-0 capitalize`}>
                  {subscription?.status || "Inactive"}
                </Badge>
              </div>
              <p className="text-app-muted">Your subscription renews on {renewalDate}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-app-foreground">${currentPlan?.price || 0}</p>
              <p className="text-sm text-app-muted">per month</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {(currentPlan?.features || []).map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-app-muted/50">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-app-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Summary */}
        <div className="app-card p-6">
          <h3 className="font-display font-semibold text-app-foreground mb-6">Usage This Month</h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-app-foreground">Active Clients</span>
                </div>
                <span className="font-medium text-app-foreground">{clientCount}</span>
              </div>
              <div className="h-2 bg-app-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(clientCount, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-app-foreground">AI Tokens</span>
                </div>
                <span className="font-medium text-app-foreground">{tokensRemaining} / {totalTokens}</span>
              </div>
              <div className="h-2 bg-app-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${tokenPercentage}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-app-foreground">Documents</span>
                </div>
                <span className="font-medium text-app-foreground">{documentCount}</span>
              </div>
              <div className="h-2 bg-app-muted rounded-full overflow-hidden">
                <div className="h-full w-full bg-blue-500 rounded-full" />
              </div>
              <p className="text-xs text-app-muted mt-1">Unlimited storage</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-app-foreground">Payment Method</h3>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90">
              Edit
            </Button>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-app-muted/50 border border-app">
            <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-app-foreground">Visa •••• 4242</p>
              <p className="text-sm text-app-muted">Expires 12/2027</p>
            </div>
          </div>
        </div>

        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-app-foreground">Billing Information</h3>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90">
              Edit
            </Button>
          </div>
          <div className="space-y-2 text-app-muted">
            <p className="text-app-foreground font-medium">Acme Real Estate LLC</p>
            <p>123 Business Ave, Suite 456</p>
            <p>San Francisco, CA 94102</p>
            <p>billing@acmerealestate.com</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}