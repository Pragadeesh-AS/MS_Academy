"use client";
import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import NumberFlow from "@number-flow/react";
import {
  Briefcase,
  CheckCheck,
  Database,
  Server,
  X,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Star,
} from "lucide-react";
import { motion } from "motion/react";

export const defaultPlans = [
  {
    name: "Starter",
    description:
      "Great for small businesses and startups looking to get started with AI",
    price: 12,
    yearlyPrice: 99,
    buttonText: "Get started",
    buttonVariant: "outline" as const,
    features: [
      { text: "Up to 10 boards per workspace", icon: <Briefcase size={20} /> },
      { text: "Up to 10GB storage", icon: <Database size={20} /> },
      { text: "Limited analytics", icon: <Server size={20} /> },
    ],
    includes: [
      "Free includes:",
      "Unlimted Cards",
      "Custom background & stickers",
      "2-factor authentication",
    ],
  },
  {
    name: "Business",
    description:
      "Best value for growing businesses that need more advanced features",
    price: 48,
    yearlyPrice: 399,
    buttonText: "Get started",
    buttonVariant: "default" as const,
    popular: true,
    features: [
      { text: "Unlimted boards", icon: <Briefcase size={20} /> },
      { text: "Storage (250MB/file)", icon: <Database size={20} /> },
      { text: "100 workspace command runs", icon: <Server size={20} /> },
    ],
    includes: [
      "Everything in Starter, plus:",
      "Advanced checklists",
      "Custom fields",
      "Servedless functions",
    ],
  },
  {
    name: "Enterprise",
    description:
      "Advanced plan with enhanced security and unlimited access for large teams",
    price: 96,
    yearlyPrice: 899,
    buttonText: "Get started",
    buttonVariant: "outline" as const,
    features: [
      { text: "Unlimited board", icon: <Briefcase size={20} /> },
      { text: "Unlimited storage ", icon: <Database size={20} /> },
      { text: "Unlimited workspaces", icon: <Server size={20} /> },
    ],
    includes: [
      "Everything in Business, plus:",
      "Multi-board management",
      "Multi-board guest",
      "Attachment permissions",
    ],
  },
];

const PricingSwitch = ({ onSwitch }: { onSwitch: (value: string) => void }) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="flex justify-center">
      <div className="relative z-50 mx-auto flex w-fit rounded-full bg-neutral-50 border border-gray-200 p-1 shadow-sm">
        <button
          type="button"
          onClick={() => handleSwitch("0")}
          className={`relative z-10 w-fit sm:h-12 h-10 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium text-sm transition-colors cursor-pointer ${
            selected === "0"
              ? "text-white font-bold"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          {selected === "0" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 via-blue-400 to-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">Monthly</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitch("1")}
          className={`relative z-10 w-fit sm:h-12 h-10 flex-shrink-0 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium text-sm transition-colors cursor-pointer ${
            selected === "1"
              ? "text-white font-bold"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          {selected === "1" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 via-blue-400 to-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Yearly
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-900 border border-blue-200">
              Save 20%
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export interface PricingSectionProps {
  test?: {
    id?: string;
    title?: string;
    subject?: string;
    duration?: number | string;
    questions?: any[];
    department?: string;
    topic?: string;
  };
  availableBundles?: any[];
  onSelectBundle?: (bundleId: string) => void;
  onClose?: () => void;
  isModal?: boolean;
  purchasedBundles?: string[];
  payingBundleId?: string | null;
}

// Inclusions helper that exactly mirrors the old template
const extractBundleInclusions = (bundle: any): string[] => {
  if (!bundle) return [];
  // 1. Only actual admin-specified features for this exact bundle
  const features = (bundle.features || [])
    .map((f: any) => (typeof f === "string" ? f.trim() : ""))
    .filter(Boolean);
  if (features.length > 0) return features;

  // 2. Otherwise only the explicit permissions this bundle actually has
  const perms = bundle.permissions;
  if (Array.isArray(perms) && perms.length > 0) {
    const items: string[] = [];
    if (perms.includes("tests")) items.push("Academy Tests");
    if (perms.includes("live_classes")) items.push("Live Classes");
    if (perms.includes("recordings")) items.push("Class Recordings");
    if (perms.includes("notes")) items.push("Study Notes");
    return items;
  }
  return [];
};

const extractDiscountInfo = (bundle: any) => {
  const orig = Number(bundle.price);
  const disc = Number(bundle.discountedPrice);
  if (!isNaN(orig) && !isNaN(disc) && orig > disc && disc > 0) {
    const diff = orig - disc;
    const pct = Math.round((diff / orig) * 100);
    return { hasDiscount: true, saveAmount: diff, percent: pct };
  }
  return { hasDiscount: false, saveAmount: 0, percent: 0 };
};

export default function PricingSection({
  test,
  availableBundles,
  onSelectBundle,
  onClose,
  isModal = false,
  purchasedBundles = [],
  payingBundleId = null,
}: PricingSectionProps = {}) {
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.1,
        duration: 0.35,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  // Category parsing for test fallback
  let examCategory = "GATE ME";
  if (test) {
    const rawDept = test.department || "ME";
    const deptMatch = rawDept.match(/\(([^)]+)\)/);
    const deptCode = deptMatch
      ? deptMatch[1]
      : rawDept.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
    examCategory = `GATE ${deptCode || "ME"}`;
  }

  const isLiveTestMode = Boolean(test);

  const effectiveBundles =
    availableBundles && availableBundles.length > 0
      ? availableBundles
      : [
          {
            id: "bundle-elite",
            name: "GATE ELITE COURSE - MECHANICAL",
            department: examCategory || "MECHANICAL (ME)",
            tagline: "IGNITE YOUR DREAMS",
            price: 90000,
            discountedPrice: 70000,
            permissions: ["tests", "live_classes", "recordings", "notes"],
            isPopular: true,
          },
        ];

  return (
    <div
      className={`px-4 sm:px-8 ${
        isModal ? "py-7 relative" : "pt-20 pb-16 min-h-screen"
      } mx-auto relative bg-neutral-100 text-neutral-900 w-full`}
      ref={pricingRef}
    >
      {/* Background Radial Glow */}
      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at center, #206ce8 0%, transparent 70%)`,
          opacity: 0.25,
          mixBlendMode: "multiply",
        }}
      />

      {/* Modal Close Button */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-50 w-10 h-10 rounded-full bg-white hover:bg-neutral-200 border border-gray-300 text-gray-700 hover:text-black flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
      )}

      {/* Header Section */}
      <div className="text-center mb-6 max-w-3xl mx-auto relative z-10">
        {test ? (
          <div>
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2.5 shadow-sm">
              <Sparkles size={13} className="text-blue-600" />
              <span>UNLOCK TEST ACCESS</span>
            </div>

            {/* Test Title */}
            <TimelineContent
              as="h2"
              animationNum={0}
              timelineRef={pricingRef}
              customVariants={revealVariants}
              className="md:text-3xl sm:text-2xl text-xl font-black text-gray-950 tracking-tight mb-1"
            >
              {test.title}
            </TimelineContent>

            {/* Short Subtitle */}
            <TimelineContent
              as="p"
              animationNum={1}
              timelineRef={pricingRef}
              customVariants={revealVariants}
              className="sm:text-sm text-xs text-gray-600 font-medium max-w-lg mx-auto mb-2"
            >
              Unlock this test by choosing a bundle below
            </TimelineContent>
          </div>
        ) : (
          <div>
            <TimelineContent
              as="h2"
              animationNum={0}
              timelineRef={pricingRef}
              customVariants={revealVariants}
              className="md:text-6xl sm:text-4xl text-3xl font-medium text-gray-900 mb-4"
            >
              Plans that works best for your{" "}
              <TimelineContent
                as="span"
                animationNum={1}
                timelineRef={pricingRef}
                customVariants={revealVariants}
                className="border border-dashed border-blue-500 px-2 py-1 rounded-xl bg-blue-100 capitalize inline-block"
              >
                business
              </TimelineContent>
            </TimelineContent>

            <TimelineContent
              as="p"
              animationNum={2}
              timelineRef={pricingRef}
              customVariants={revealVariants}
              className="sm:text-base text-sm text-gray-600 sm:w-[70%] w-[80%] mx-auto"
            >
              Trusted by millions, We help teams all around the world, Explore which
              option is right for you.
            </TimelineContent>
          </div>
        )}
      </div>

      {/* Standalone switch only when in generic demo mode */}
      {!isLiveTestMode && (
        <TimelineContent
          as="div"
          animationNum={3}
          timelineRef={pricingRef}
          customVariants={revealVariants}
        >
          <PricingSwitch onSwitch={togglePricingPeriod} />
        </TimelineContent>
      )}

      {/* Cards Display */}
      {isLiveTestMode ? (
        // LIVE TEST BUNDLES: Both cards share the same unified theme (blue border, white card, vibrant blue CTA button)
        <div
          className={`grid ${
            effectiveBundles.length <= 1
              ? "grid-cols-1 max-w-md"
              : effectiveBundles.length === 2
              ? "grid-cols-1 md:grid-cols-2 max-w-4xl"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl"
          } gap-5 py-4 mx-auto relative z-10`}
        >
          {effectiveBundles.map((bundle: any, index: number) => {
            const finalPrice = Number(bundle.discountedPrice || bundle.price) || 0;
            const { hasDiscount, saveAmount, percent } = extractDiscountInfo(bundle);
            const isAlreadyPurchased = purchasedBundles.includes(bundle.id);
            const isPaying = payingBundleId === bundle.id;
            const inclusions = extractBundleInclusions(bundle);
            const tagline = bundle.tagline || bundle.description || "";
            const isPopular = Boolean(
              bundle.isPopular ||
                bundle.tier === "elite" ||
                bundle.isElite ||
                /elite/i.test(bundle.name || "")
            );

            return (
              <TimelineContent
                key={bundle.id || index}
                as="div"
                animationNum={4 + index}
                timelineRef={pricingRef}
                customVariants={revealVariants}
              >
                <Card
                  className={`relative transition-all duration-200 flex flex-col justify-between h-full rounded-2xl bg-white shadow-md hover:shadow-xl ${
                    isPopular
                      ? "border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10"
                      : "border-2 border-blue-400/50 hover:border-blue-500"
                  }`}
                >
                  <CardHeader className="text-left pb-3">
                    {/* Top Badges */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {bundle.department && (
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
                            {bundle.department}
                          </span>
                        )}
                        {isPopular && (
                          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <Star size={10} className="fill-white" /> MOST POPULAR
                          </span>
                        )}
                      </div>

                      {hasDiscount && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {percent}% OFF
                        </span>
                      )}
                    </div>

                    {/* Bundle Name */}
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight">
                      {bundle.name}
                    </h3>

                    {/* Tagline / Description given in the old template (e.g. IGNITE YOUR DREAMS) */}
                    {tagline ? (
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">
                        {tagline}
                      </p>
                    ) : null}

                    {/* Price with NumberFlow */}
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-gray-950 flex items-baseline">
                        ₹<NumberFlow value={finalPrice} />
                      </span>
                      {hasDiscount && (
                        <span className="text-xs sm:text-sm text-gray-400 line-through font-bold">
                          ₹{Number(bundle.price).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {/* Save Amount - exactly like old template */}
                    {hasDiscount && (
                      <div className="text-xs font-black text-emerald-600 mt-1">
                        Save ₹{saveAmount.toLocaleString("en-IN")} instantly
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0 flex flex-col flex-1 justify-between">
                    {/* Inclusions List - only the actual inclusions from old template, no extra words */}
                    {inclusions.length > 0 && (
                      <ul className="space-y-2 font-semibold pt-3 border-t border-neutral-200 mb-6">
                        {inclusions.map((featureText, idx) => (
                          <li key={idx} className="flex items-center text-gray-800 text-sm">
                            <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-300 flex items-center justify-center mr-2.5 shrink-0">
                              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                            </span>
                            <span className="font-semibold text-gray-900">{featureText}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CTA Button: Both cards share the same vibrant blue primary button theme */}
                    <div className="mt-auto">
                      {isAlreadyPurchased ? (
                        <span className="w-full py-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs sm:text-sm font-bold inline-block text-center">
                          ✓ Already Purchased
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isPaying}
                          onClick={() => {
                            if (onSelectBundle && bundle.id) {
                              onSelectBundle(bundle.id);
                            }
                          }}
                          className="w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60"
                        >
                          <span>
                            {isPaying
                              ? "Opening Checkout..."
                              : `Buy Bundle • ₹${finalPrice.toLocaleString("en-IN")}`}
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TimelineContent>
            );
          })}
        </div>
      ) : (
        // STANDALONE DEMO MODE (/pricing or demo component)
        <div className="grid md:grid-cols-3 max-w-7xl gap-4 py-6 mx-auto relative z-10">
          {defaultPlans.map((plan, index) => (
            <TimelineContent
              key={plan.name}
              as="div"
              animationNum={4 + index}
              timelineRef={pricingRef}
              customVariants={revealVariants}
            >
              <Card
                className={`relative border-neutral-200 ${
                  plan.popular ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
                }`}
              >
                <CardHeader className="text-left">
                  <div className="flex justify-between">
                    <h3 className="text-3xl font-semibold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    {plan.popular && (
                      <div>
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          Popular
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-semibold text-gray-900 flex items-baseline">
                      $
                      <NumberFlow
                        value={isYearly ? plan.yearlyPrice : plan.price}
                        className="text-4xl font-semibold"
                      />
                    </span>
                    <span className="text-gray-600 ml-1">
                      /{isYearly ? "year" : "month"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <button
                    type="button"
                    className={`w-full mb-6 p-4 text-xl rounded-xl font-medium transition-all ${
                      plan.popular
                        ? "bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-500 border border-blue-400 text-white"
                        : plan.buttonVariant === "outline"
                        ? "bg-gradient-to-t from-neutral-900 to-neutral-600 shadow-lg shadow-neutral-900 border border-neutral-700 text-white"
                        : "bg-neutral-800 text-white"
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                  <ul className="space-y-2 font-semibold py-5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <span className="text-neutral-800 grid place-content-center mt-0.5 mr-3">
                          {feature.icon}
                        </span>
                        <span className="text-sm text-gray-600">
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3 pt-4 border-t border-neutral-200">
                    <h4 className="font-medium text-base text-gray-900 mb-3">
                      {plan.includes[0]}
                    </h4>
                    <ul className="space-y-2 font-semibold">
                      {plan.includes.slice(1).map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <span className="h-6 w-6 bg-green-50 border border-blue-500 rounded-full grid place-content-center mt-0.5 mr-3">
                            <CheckCheck className="h-4 w-4 text-blue-500 " />
                          </span>
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TimelineContent>
          ))}
        </div>
      )}

      {/* Modal Footer Section */}
      {isModal && (
        <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left relative z-10">
          <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Unlock your learning potential • Instant access upon enrollment</span>
          </div>

          <div className="flex items-center gap-4">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-200"
              >
                Maybe later
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { PricingSection };
