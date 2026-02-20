"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

interface IntakeFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: string;
  email: string;
  ethnicity: string;
  zipCode: string;
  reasonForVisit: string;
  numberOfVisits: string;
  referralSource: string;
  hasAttorney: string;
  countyFiledIn: string;
  countyOfOrders: string;
  hasRestrainingOrder: string;
  upcomingCourtDate: string;
  existingCourtOrders: string;
  custodyOrderFollowed: string;
  notFollowedReason: string;
  seekingTo: string;
  minorChildrenInvolved: string;
  childrenResidence: string;
  marriedToMother: string;
  childSupportOrders: string;
  paymentStatus: string;
  safetyFears: string;
  attorneyNotes: string;
  coParentName: string;
}

const emptyForm: IntakeFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  age: "",
  email: "",
  ethnicity: "",
  zipCode: "",
  reasonForVisit: "",
  numberOfVisits: "",
  referralSource: "",
  hasAttorney: "",
  countyFiledIn: "",
  countyOfOrders: "",
  hasRestrainingOrder: "",
  upcomingCourtDate: "",
  existingCourtOrders: "",
  custodyOrderFollowed: "",
  notFollowedReason: "",
  seekingTo: "",
  minorChildrenInvolved: "",
  childrenResidence: "",
  marriedToMother: "",
  childSupportOrders: "",
  paymentStatus: "",
  safetyFears: "",
  attorneyNotes: "",
  coParentName: "",
};

const SECTIONS = [
  {
    title: "Personal Info",
    fields: ["firstName", "lastName", "dateOfBirth", "age", "email", "ethnicity", "zipCode"] as const,
  },
  {
    title: "Visit Details",
    fields: ["reasonForVisit", "numberOfVisits", "referralSource"] as const,
  },
  {
    title: "Legal Status",
    fields: ["hasAttorney", "countyFiledIn", "countyOfOrders", "hasRestrainingOrder", "upcomingCourtDate"] as const,
  },
  {
    title: "Court Orders",
    fields: ["existingCourtOrders", "custodyOrderFollowed", "notFollowedReason", "seekingTo"] as const,
  },
  {
    title: "Children",
    fields: ["minorChildrenInvolved", "childrenResidence", "marriedToMother"] as const,
  },
  {
    title: "Child Support",
    fields: ["childSupportOrders", "paymentStatus"] as const,
  },
  {
    title: "Safety & Notes",
    fields: ["safetyFears", "attorneyNotes", "coParentName"] as const,
  },
];

const FIELD_LABELS: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  dateOfBirth: "Date of Birth",
  age: "Age",
  email: "Email",
  ethnicity: "Ethnicity",
  zipCode: "Zip Code",
  reasonForVisit: "Reason for Visit",
  numberOfVisits: "Number of Visits",
  referralSource: "Referral Source",
  hasAttorney: "Has Attorney",
  countyFiledIn: "County Filed In",
  countyOfOrders: "County of Orders",
  hasRestrainingOrder: "Has Restraining Order",
  upcomingCourtDate: "Upcoming Court Date",
  existingCourtOrders: "Existing Court Orders",
  custodyOrderFollowed: "Custody Order Followed",
  notFollowedReason: "Not Followed Reason",
  seekingTo: "Seeking To",
  minorChildrenInvolved: "Minor Children Involved",
  childrenResidence: "Children Residence",
  marriedToMother: "Married to Mother",
  childSupportOrders: "Child Support Orders",
  paymentStatus: "Payment Status",
  safetyFears: "Safety Fears",
  attorneyNotes: "Attorney Notes",
  coParentName: "Co-Parent Name",
};

// Fields rendered as select dropdowns
const SELECT_OPTIONS: Record<string, string[]> = {
  hasAttorney: ["Yes", "No"],
  hasRestrainingOrder: ["Yes", "No"],
  custodyOrderFollowed: ["Yes", "No"],
  marriedToMother: ["Yes", "No"],
  seekingTo: ["Obtain new CC/CV/CS orders", "Modify existing CC/CV/CS"],
  ethnicity: [
    "Black/African American",
    "Hispanic/Latino",
    "White",
    "Asian",
    "Native American",
    "Pacific Islander",
    "Two or More Races",
    "Other",
    "Prefer Not to Say",
  ],
};

// Fields rendered as textarea
const TEXTAREA_FIELDS = new Set([
  "reasonForVisit",
  "existingCourtOrders",
  "notFollowedReason",
  "safetyFears",
  "attorneyNotes",
  "childrenResidence",
]);

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  const existing = useQuery(
    api.legalIntake.getById,
    isNew ? "skip" : { id: id as Id<"legalIntakeForms"> }
  );

  const createMutation = useMutation(api.legalIntake.create);
  const updateMutation = useMutation(api.legalIntake.update);

  const [form, setForm] = useState<IntakeFormData>(emptyForm);
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Populate form when existing data loads
  useEffect(() => {
    if (existing && !isNew) {
      setForm({
        firstName: existing.firstName || "",
        lastName: existing.lastName || "",
        dateOfBirth: existing.dateOfBirth || "",
        age: existing.age || "",
        email: existing.email || "",
        ethnicity: existing.ethnicity || "",
        zipCode: existing.zipCode || "",
        reasonForVisit: existing.reasonForVisit || "",
        numberOfVisits: existing.numberOfVisits || "",
        referralSource: existing.referralSource || "",
        hasAttorney: existing.hasAttorney || "",
        countyFiledIn: existing.countyFiledIn || "",
        countyOfOrders: existing.countyOfOrders || "",
        hasRestrainingOrder: existing.hasRestrainingOrder || "",
        upcomingCourtDate: existing.upcomingCourtDate || "",
        existingCourtOrders: existing.existingCourtOrders || "",
        custodyOrderFollowed: existing.custodyOrderFollowed || "",
        notFollowedReason: existing.notFollowedReason || "",
        seekingTo: existing.seekingTo || "",
        minorChildrenInvolved: existing.minorChildrenInvolved || "",
        childrenResidence: existing.childrenResidence || "",
        marriedToMother: existing.marriedToMother || "",
        childSupportOrders: existing.childSupportOrders || "",
        paymentStatus: existing.paymentStatus || "",
        safetyFears: existing.safetyFears || "",
        attorneyNotes: existing.attorneyNotes || "",
        coParentName: existing.coParentName || "",
      });
    }
  }, [existing, isNew]);

  function toggleSection(title: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    try {
      // Build args — only send non-empty strings
      const args: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(form)) {
        args[key] = value.trim() || undefined;
      }

      if (isNew) {
        await createMutation(args as Parameters<typeof createMutation>[0]);
      } else {
        await updateMutation({
          id: id as Id<"legalIntakeForms">,
          ...args,
        } as Parameters<typeof updateMutation>[0]);
      }
      router.push("/clients");
    } catch (err) {
      console.error("Failed to save intake form:", err);
    } finally {
      setSaving(false);
    }
  }

  // Loading state for existing records
  if (!isNew && existing === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading client record...</p>
        </div>
      </div>
    );
  }

  if (!isNew && existing === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted">Client record not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
            {isNew ? "New Client Intake" : `${existing?.firstName || ""} ${existing?.lastName || ""}`.trim()}
          </h1>
          <p className="text-sm text-muted mt-1">
            {isNew
              ? "Fill out the Father Intake Form"
              : `Created ${existing?.createdAt ? formatDate(existing.createdAt) : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => router.push("/clients")}>
            Back
          </Button>
          {!isNew && !editing && (
            <Button variant="primary" size="md" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Form sections */}
      {SECTIONS.map((section) => {
        const isCollapsed = collapsedSections.has(section.title);
        return (
          <Card key={section.title}>
            <button
              type="button"
              className="w-full flex items-center justify-between text-left"
              onClick={() => toggleSection(section.title)}
            >
              <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
                {section.title}
              </h3>
              <svg
                className={`w-5 h-5 text-muted transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isCollapsed && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.map((field) => {
                  const label = FIELD_LABELS[field];
                  const value = form[field];

                  if (!editing) {
                    // Read-only view
                    return (
                      <div key={field}>
                        <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                          {label}
                        </p>
                        <p className="text-sm text-foreground">
                          {value || "\u2014"}
                        </p>
                      </div>
                    );
                  }

                  // Select fields
                  if (SELECT_OPTIONS[field]) {
                    return (
                      <div key={field}>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          {label}
                        </label>
                        <select
                          value={value}
                          onChange={(e) => updateField(field, e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                        >
                          <option value="">Select...</option>
                          {SELECT_OPTIONS[field].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  // Textarea fields
                  if (TEXTAREA_FIELDS.has(field)) {
                    return (
                      <div key={field} className="sm:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          {label}
                        </label>
                        <textarea
                          value={value}
                          onChange={(e) => updateField(field, e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl text-sm resize-y bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
                          placeholder={label}
                        />
                      </div>
                    );
                  }

                  // Regular input
                  return (
                    <Input
                      key={field}
                      label={label}
                      value={value}
                      onChange={(e) => updateField(field, e.target.value)}
                      placeholder={label}
                    />
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {/* Action buttons */}
      {editing && (
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (isNew) {
                router.push("/clients");
              } else {
                setEditing(false);
                // Reset form to existing data
                if (existing) {
                  setForm({
                    firstName: existing.firstName || "",
                    lastName: existing.lastName || "",
                    dateOfBirth: existing.dateOfBirth || "",
                    age: existing.age || "",
                    email: existing.email || "",
                    ethnicity: existing.ethnicity || "",
                    zipCode: existing.zipCode || "",
                    reasonForVisit: existing.reasonForVisit || "",
                    numberOfVisits: existing.numberOfVisits || "",
                    referralSource: existing.referralSource || "",
                    hasAttorney: existing.hasAttorney || "",
                    countyFiledIn: existing.countyFiledIn || "",
                    countyOfOrders: existing.countyOfOrders || "",
                    hasRestrainingOrder: existing.hasRestrainingOrder || "",
                    upcomingCourtDate: existing.upcomingCourtDate || "",
                    existingCourtOrders: existing.existingCourtOrders || "",
                    custodyOrderFollowed: existing.custodyOrderFollowed || "",
                    notFollowedReason: existing.notFollowedReason || "",
                    seekingTo: existing.seekingTo || "",
                    minorChildrenInvolved: existing.minorChildrenInvolved || "",
                    childrenResidence: existing.childrenResidence || "",
                    marriedToMother: existing.marriedToMother || "",
                    childSupportOrders: existing.childSupportOrders || "",
                    paymentStatus: existing.paymentStatus || "",
                    safetyFears: existing.safetyFears || "",
                    attorneyNotes: existing.attorneyNotes || "",
                    coParentName: existing.coParentName || "",
                  });
                }
              }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={saving}
            disabled={!form.firstName.trim() || !form.lastName.trim()}
            onClick={handleSave}
          >
            {isNew ? "Create Client" : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
