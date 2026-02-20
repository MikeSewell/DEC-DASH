"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { formatDate, capitalize } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";

// ── Legal Intake Config ──────────────────────────────────────────────

interface LegalIntakeFormData {
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

const emptyLegalForm: LegalIntakeFormData = {
  firstName: "", lastName: "", dateOfBirth: "", age: "", email: "",
  ethnicity: "", zipCode: "", reasonForVisit: "", numberOfVisits: "",
  referralSource: "", hasAttorney: "", countyFiledIn: "", countyOfOrders: "",
  hasRestrainingOrder: "", upcomingCourtDate: "", existingCourtOrders: "",
  custodyOrderFollowed: "", notFollowedReason: "", seekingTo: "",
  minorChildrenInvolved: "", childrenResidence: "", marriedToMother: "",
  childSupportOrders: "", paymentStatus: "", safetyFears: "",
  attorneyNotes: "", coParentName: "",
};

const LEGAL_SECTIONS = [
  { title: "Personal Info", fields: ["firstName", "lastName", "dateOfBirth", "age", "email", "ethnicity", "zipCode"] as const },
  { title: "Visit Details", fields: ["reasonForVisit", "numberOfVisits", "referralSource"] as const },
  { title: "Legal Status", fields: ["hasAttorney", "countyFiledIn", "countyOfOrders", "hasRestrainingOrder", "upcomingCourtDate"] as const },
  { title: "Court Orders", fields: ["existingCourtOrders", "custodyOrderFollowed", "notFollowedReason", "seekingTo"] as const },
  { title: "Children", fields: ["minorChildrenInvolved", "childrenResidence", "marriedToMother"] as const },
  { title: "Child Support", fields: ["childSupportOrders", "paymentStatus"] as const },
  { title: "Safety & Notes", fields: ["safetyFears", "attorneyNotes", "coParentName"] as const },
];

const LEGAL_FIELD_LABELS: Record<string, string> = {
  firstName: "First Name", lastName: "Last Name", dateOfBirth: "Date of Birth",
  age: "Age", email: "Email", ethnicity: "Ethnicity", zipCode: "Zip Code",
  reasonForVisit: "Reason for Visit", numberOfVisits: "Number of Visits",
  referralSource: "Referral Source", hasAttorney: "Has Attorney",
  countyFiledIn: "County Filed In", countyOfOrders: "County of Orders",
  hasRestrainingOrder: "Has Restraining Order", upcomingCourtDate: "Upcoming Court Date",
  existingCourtOrders: "Existing Court Orders", custodyOrderFollowed: "Custody Order Followed",
  notFollowedReason: "Not Followed Reason", seekingTo: "Seeking To",
  minorChildrenInvolved: "Minor Children Involved", childrenResidence: "Children Residence",
  marriedToMother: "Married to Mother", childSupportOrders: "Child Support Orders",
  paymentStatus: "Payment Status", safetyFears: "Safety Fears",
  attorneyNotes: "Attorney Notes", coParentName: "Co-Parent Name",
};

const LEGAL_SELECT_OPTIONS: Record<string, string[]> = {
  hasAttorney: ["Yes", "No"],
  hasRestrainingOrder: ["Yes", "No"],
  custodyOrderFollowed: ["Yes", "No"],
  marriedToMother: ["Yes", "No"],
  seekingTo: ["Obtain new CC/CV/CS orders", "Modify existing CC/CV/CS"],
  ethnicity: [
    "Black/African American", "Hispanic/Latino", "White", "Asian",
    "Native American", "Pacific Islander", "Two or More Races", "Other", "Prefer Not to Say",
  ],
};

const LEGAL_TEXTAREA_FIELDS = new Set([
  "reasonForVisit", "existingCourtOrders", "notFollowedReason",
  "safetyFears", "attorneyNotes", "childrenResidence",
]);

// ── Co-Parent Intake Config ──────────────────────────────────────────

interface CoparentIntakeFormData {
  role: string;
  fullName: string;
  ethnicity: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  zipCode: string;
  age: string;
  coParentName: string;
  coParentEthnicity: string;
  coParentDob: string;
  coParentPhone: string;
  coParentEmail: string;
  coParentZip: string;
  coParentAge: string;
  referralSource: string;
  coParentInformed: string;
  sessionDate: string;
  sessionTime: string;
  sessionsCompleted: string;
}

const emptyCoparentForm: CoparentIntakeFormData = {
  role: "", fullName: "", ethnicity: "", dateOfBirth: "", phone: "",
  email: "", zipCode: "", age: "", coParentName: "", coParentEthnicity: "",
  coParentDob: "", coParentPhone: "", coParentEmail: "", coParentZip: "",
  coParentAge: "", referralSource: "", coParentInformed: "",
  sessionDate: "", sessionTime: "", sessionsCompleted: "",
};

const COPARENT_SECTIONS = [
  { title: "Participant Info", fields: ["role", "fullName", "ethnicity", "dateOfBirth", "phone", "email", "zipCode", "age"] as const },
  { title: "Co-Parent Info", fields: ["coParentName", "coParentEthnicity", "coParentDob", "coParentPhone", "coParentEmail", "coParentZip", "coParentAge"] as const },
  { title: "Session Info", fields: ["referralSource", "coParentInformed", "sessionDate", "sessionTime", "sessionsCompleted"] as const },
];

const COPARENT_FIELD_LABELS: Record<string, string> = {
  role: "Role (Dad/Mom)", fullName: "Full Name", ethnicity: "Ethnicity",
  dateOfBirth: "Date of Birth", phone: "Phone", email: "Email",
  zipCode: "Zip Code", age: "Age", coParentName: "Co-Parent Name",
  coParentEthnicity: "Co-Parent Ethnicity", coParentDob: "Co-Parent DOB",
  coParentPhone: "Co-Parent Phone", coParentEmail: "Co-Parent Email",
  coParentZip: "Co-Parent Zip", coParentAge: "Co-Parent Age",
  referralSource: "Referral Source", coParentInformed: "Co-Parent Informed?",
  sessionDate: "Session Date", sessionTime: "Session Time",
  sessionsCompleted: "Sessions Completed",
};

const COPARENT_SELECT_OPTIONS: Record<string, string[]> = {
  role: ["Dad", "Mom"],
  coParentInformed: ["Yes", "No"],
  ethnicity: [
    "Black/African American", "Hispanic/Latino", "White", "Asian",
    "Native American", "Pacific Islander", "Two or More Races", "Other", "Prefer Not to Say",
  ],
  coParentEthnicity: [
    "Black/African American", "Hispanic/Latino", "White", "Asian",
    "Native American", "Pacific Islander", "Two or More Races", "Other", "Prefer Not to Say",
  ],
};

// ── Status badge variant map ─────────────────────────────────────────

const statusVariant: Record<string, "success" | "info" | "danger"> = {
  active: "success",
  completed: "info",
  withdrawn: "danger",
};

// ── Main Component ───────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const data = useQuery(api.clients.getByIdWithIntake, {
    clientId: clientId as Id<"clients">,
  });
  const currentUser = useQuery(api.users.getCurrentUser);
  const programs = useQuery(api.programs.list);

  const updateClient = useMutation(api.clients.update);
  const removeClient = useMutation(api.clients.remove);
  const createLegalIntake = useMutation(api.legalIntake.create);
  const updateLegalIntake = useMutation(api.legalIntake.update);
  const createCoparentIntake = useMutation(api.coparentIntake.create);
  const updateCoparentIntake = useMutation(api.coparentIntake.update);

  // Client editing state
  const [editingClient, setEditingClient] = useState(false);
  const [clientFormState, setClientFormState] = useState({
    firstName: "", lastName: "", status: "active" as string,
    zipCode: "", ageGroup: "", ethnicity: "", notes: "", programId: "",
  });
  const [savingClient, setSavingClient] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Legal intake state
  const [editingLegal, setEditingLegal] = useState(false);
  const [creatingLegal, setCreatingLegal] = useState(false);
  const [legalForm, setLegalForm] = useState<LegalIntakeFormData>(emptyLegalForm);
  const [savingLegal, setSavingLegal] = useState(false);

  // Co-parent intake state
  const [editingCoparent, setEditingCoparent] = useState(false);
  const [creatingCoparent, setCreatingCoparent] = useState(false);
  const [coparentForm, setCoparentForm] = useState<CoparentIntakeFormData>(emptyCoparentForm);
  const [savingCoparent, setSavingCoparent] = useState(false);

  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Populate client form on load
  useEffect(() => {
    if (data && !editingClient) {
      setClientFormState({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        status: data.status || "active",
        zipCode: data.zipCode || "",
        ageGroup: data.ageGroup || "",
        ethnicity: data.ethnicity || "",
        notes: data.notes || "",
        programId: data.programId || "",
      });
    }
  }, [data, editingClient]);

  // Populate legal form
  useEffect(() => {
    if (data?.legalIntake && !editingLegal && !creatingLegal) {
      const li = data.legalIntake;
      setLegalForm({
        firstName: li.firstName || "", lastName: li.lastName || "",
        dateOfBirth: li.dateOfBirth || "", age: li.age || "",
        email: li.email || "", ethnicity: li.ethnicity || "",
        zipCode: li.zipCode || "", reasonForVisit: li.reasonForVisit || "",
        numberOfVisits: li.numberOfVisits || "", referralSource: li.referralSource || "",
        hasAttorney: li.hasAttorney || "", countyFiledIn: li.countyFiledIn || "",
        countyOfOrders: li.countyOfOrders || "",
        hasRestrainingOrder: li.hasRestrainingOrder || "",
        upcomingCourtDate: li.upcomingCourtDate || "",
        existingCourtOrders: li.existingCourtOrders || "",
        custodyOrderFollowed: li.custodyOrderFollowed || "",
        notFollowedReason: li.notFollowedReason || "",
        seekingTo: li.seekingTo || "",
        minorChildrenInvolved: li.minorChildrenInvolved || "",
        childrenResidence: li.childrenResidence || "",
        marriedToMother: li.marriedToMother || "",
        childSupportOrders: li.childSupportOrders || "",
        paymentStatus: li.paymentStatus || "",
        safetyFears: li.safetyFears || "",
        attorneyNotes: li.attorneyNotes || "",
        coParentName: li.coParentName || "",
      });
    }
  }, [data?.legalIntake, editingLegal, creatingLegal]);

  // Populate co-parent form
  useEffect(() => {
    if (data?.coparentIntake && !editingCoparent && !creatingCoparent) {
      const ci = data.coparentIntake;
      setCoparentForm({
        role: ci.role || "", fullName: ci.fullName || "",
        ethnicity: ci.ethnicity || "", dateOfBirth: ci.dateOfBirth || "",
        phone: ci.phone || "", email: ci.email || "",
        zipCode: ci.zipCode || "", age: ci.age || "",
        coParentName: ci.coParentName || "", coParentEthnicity: ci.coParentEthnicity || "",
        coParentDob: ci.coParentDob || "", coParentPhone: ci.coParentPhone || "",
        coParentEmail: ci.coParentEmail || "", coParentZip: ci.coParentZip || "",
        coParentAge: ci.coParentAge || "", referralSource: ci.referralSource || "",
        coParentInformed: ci.coParentInformed || "",
        sessionDate: ci.sessionDate || "", sessionTime: ci.sessionTime || "",
        sessionsCompleted: ci.sessionsCompleted || "",
      });
    }
  }, [data?.coparentIntake, editingCoparent, creatingCoparent]);

  function toggleSection(title: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  // ── Save handlers ──────────────────────────────────────────────────

  async function handleSaveClient() {
    setSavingClient(true);
    try {
      await updateClient({
        clientId: clientId as Id<"clients">,
        firstName: clientFormState.firstName || undefined,
        lastName: clientFormState.lastName || undefined,
        status: clientFormState.status as "active" | "completed" | "withdrawn",
        zipCode: clientFormState.zipCode || undefined,
        ageGroup: clientFormState.ageGroup || undefined,
        ethnicity: clientFormState.ethnicity || undefined,
        notes: clientFormState.notes || undefined,
        programId: clientFormState.programId
          ? (clientFormState.programId as Id<"programs">)
          : undefined,
      });
      setEditingClient(false);
    } catch (err) {
      console.error("Failed to save client:", err);
    } finally {
      setSavingClient(false);
    }
  }

  async function handleDeleteClient() {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await removeClient({ clientId: clientId as Id<"clients"> });
      router.push("/clients");
    } catch (err) {
      console.error("Failed to delete client:", err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveLegalIntake() {
    setSavingLegal(true);
    try {
      const args: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(legalForm)) {
        args[key] = value.trim() || undefined;
      }

      if (creatingLegal) {
        await createLegalIntake({
          ...args,
          clientId: clientId as Id<"clients">,
        } as Parameters<typeof createLegalIntake>[0]);
        setCreatingLegal(false);
      } else if (data?.legalIntake) {
        await updateLegalIntake({
          id: data.legalIntake._id,
          ...args,
        } as Parameters<typeof updateLegalIntake>[0]);
      }
      setEditingLegal(false);
    } catch (err) {
      console.error("Failed to save legal intake:", err);
    } finally {
      setSavingLegal(false);
    }
  }

  async function handleSaveCoparentIntake() {
    setSavingCoparent(true);
    try {
      const args: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(coparentForm)) {
        args[key] = value.trim() || undefined;
      }

      if (creatingCoparent) {
        await createCoparentIntake({
          ...args,
          clientId: clientId as Id<"clients">,
        } as Parameters<typeof createCoparentIntake>[0]);
        setCreatingCoparent(false);
      } else if (data?.coparentIntake) {
        await updateCoparentIntake({
          id: data.coparentIntake._id,
          ...args,
        } as Parameters<typeof updateCoparentIntake>[0]);
      }
      setEditingCoparent(false);
    } catch (err) {
      console.error("Failed to save co-parent intake:", err);
    } finally {
      setSavingCoparent(false);
    }
  }

  // ── Loading / Not Found ────────────────────────────────────────────

  if (data === undefined || currentUser === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading client record...</p>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted">Client not found.</p>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";
  const programType = data.program?.type;

  // ── Reusable form field renderer ───────────────────────────────────

  function renderField(
    field: string,
    value: string,
    editing: boolean,
    onChange: (key: string, val: string) => void,
    labels: Record<string, string>,
    selectOptions: Record<string, string[]>,
    textareaFields: Set<string>,
  ) {
    const label = labels[field] || field;

    if (!editing) {
      return (
        <div key={field}>
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm text-foreground">{value || "\u2014"}</p>
        </div>
      );
    }

    if (selectOptions[field]) {
      return (
        <div key={field}>
          <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
          <select
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
          >
            <option value="">Select...</option>
            {selectOptions[field].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    if (textareaFields.has(field)) {
      return (
        <div key={field} className="sm:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
          <textarea
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl text-sm resize-y bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
            placeholder={label}
          />
        </div>
      );
    }

    return (
      <Input
        key={field}
        label={label}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={label}
      />
    );
  }

  // ── Collapsible section renderer ───────────────────────────────────

  function renderCollapsibleSection(
    section: { title: string; fields: readonly string[] },
    formData: Record<string, string>,
    editing: boolean,
    onChange: (key: string, val: string) => void,
    labels: Record<string, string>,
    selectOptions: Record<string, string[]>,
    textareaFields: Set<string>,
    prefix: string,
  ) {
    const isCollapsed = collapsedSections.has(prefix + section.title);
    return (
      <Card key={prefix + section.title}>
        <button
          type="button"
          className="w-full flex items-center justify-between text-left"
          onClick={() => toggleSection(prefix + section.title)}
        >
          <h3 className="text-base font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
            {section.title}
          </h3>
          <svg
            className={`w-5 h-5 text-muted transition-transform ${isCollapsed ? "" : "rotate-180"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!isCollapsed && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map((field) =>
              renderField(
                field,
                formData[field] || "",
                editing,
                onChange,
                labels,
                selectOptions,
                textareaFields,
              )
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
            {data.firstName} {data.lastName}
          </h1>
          <p className="text-sm text-muted mt-1">
            {data.program?.name ?? "No program"} &middot; Created {formatDate(data.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => router.push("/clients")}>
            Back
          </Button>
          {isAdmin && (
            <Button variant="secondary" size="md" loading={deleting} onClick={handleDeleteClient}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* ─── Section A: Client Info ─────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
            Client Information
          </h2>
          {!editingClient ? (
            <Button variant="secondary" size="sm" onClick={() => setEditingClient(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditingClient(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={savingClient} onClick={handleSaveClient}>
                Save
              </Button>
            </div>
          )}
        </div>

        {!editingClient ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Name</p>
              <p className="text-sm text-foreground">{data.firstName} {data.lastName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Program</p>
              <p className="text-sm text-foreground">{data.program?.name ?? "\u2014"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Status</p>
              <Badge variant={statusVariant[data.status] || "default"}>
                {capitalize(data.status)}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Enrolled</p>
              <p className="text-sm text-foreground">
                {data.enrollmentDate ? formatDate(data.enrollmentDate) : "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Zip Code</p>
              <p className="text-sm text-foreground">{data.zipCode || "\u2014"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Ethnicity</p>
              <p className="text-sm text-foreground">{data.ethnicity || "\u2014"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Age Group</p>
              <p className="text-sm text-foreground">{data.ageGroup || "\u2014"}</p>
            </div>
            {data.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-foreground">{data.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={clientFormState.firstName}
              onChange={(e) => setClientFormState((p) => ({ ...p, firstName: e.target.value }))}
            />
            <Input
              label="Last Name"
              value={clientFormState.lastName}
              onChange={(e) => setClientFormState((p) => ({ ...p, lastName: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Program</label>
              <select
                value={clientFormState.programId}
                onChange={(e) => setClientFormState((p) => ({ ...p, programId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="">No program</option>
                {programs?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({capitalize(p.type)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
              <select
                value={clientFormState.status}
                onChange={(e) => setClientFormState((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <Input
              label="Zip Code"
              value={clientFormState.zipCode}
              onChange={(e) => setClientFormState((p) => ({ ...p, zipCode: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Age Group</label>
              <select
                value={clientFormState.ageGroup}
                onChange={(e) => setClientFormState((p) => ({ ...p, ageGroup: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="">Select...</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45-54">45-54</option>
                <option value="55+">55+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Ethnicity</label>
              <select
                value={clientFormState.ethnicity}
                onChange={(e) => setClientFormState((p) => ({ ...p, ethnicity: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="">Select...</option>
                <option value="Black/African American">Black/African American</option>
                <option value="Hispanic/Latino">Hispanic/Latino</option>
                <option value="White">White</option>
                <option value="Asian">Asian</option>
                <option value="Native American">Native American</option>
                <option value="Pacific Islander">Pacific Islander</option>
                <option value="Two or More Races">Two or More Races</option>
                <option value="Other">Other</option>
                <option value="Prefer Not to Say">Prefer Not to Say</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
              <textarea
                value={clientFormState.notes}
                onChange={(e) => setClientFormState((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-4 py-2.5 rounded-xl text-sm resize-y bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ─── Section B: Legal Intake Form ───────────────────── */}
      {programType === "legal" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
              Legal Intake Form
            </h2>
            {data.legalIntake && !editingLegal && (
              <Button variant="secondary" size="sm" onClick={() => setEditingLegal(true)}>
                Edit Intake
              </Button>
            )}
            {!data.legalIntake && !creatingLegal && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setLegalForm(emptyLegalForm);
                  setCreatingLegal(true);
                  setEditingLegal(true);
                }}
              >
                Add Legal Intake
              </Button>
            )}
            {editingLegal && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingLegal(false);
                    setCreatingLegal(false);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" loading={savingLegal} onClick={handleSaveLegalIntake}>
                  Save Intake
                </Button>
              </div>
            )}
          </div>

          {(data.legalIntake || creatingLegal) &&
            LEGAL_SECTIONS.map((section) =>
              renderCollapsibleSection(
                section,
                legalForm as unknown as Record<string, string>,
                editingLegal,
                (key, val) => setLegalForm((p) => ({ ...p, [key]: val })),
                LEGAL_FIELD_LABELS,
                LEGAL_SELECT_OPTIONS,
                LEGAL_TEXTAREA_FIELDS,
                "legal-",
              )
            )}
        </>
      )}

      {/* ─── Section C: Co-Parent Intake Form ──────────────── */}
      {programType === "coparent" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground font-[family-name:var(--font-fraunces)]">
              Co-Parent Intake Form
            </h2>
            {data.coparentIntake && !editingCoparent && (
              <Button variant="secondary" size="sm" onClick={() => setEditingCoparent(true)}>
                Edit Intake
              </Button>
            )}
            {!data.coparentIntake && !creatingCoparent && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCoparentForm(emptyCoparentForm);
                  setCreatingCoparent(true);
                  setEditingCoparent(true);
                }}
              >
                Add Co-Parent Intake
              </Button>
            )}
            {editingCoparent && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingCoparent(false);
                    setCreatingCoparent(false);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" loading={savingCoparent} onClick={handleSaveCoparentIntake}>
                  Save Intake
                </Button>
              </div>
            )}
          </div>

          {(data.coparentIntake || creatingCoparent) &&
            COPARENT_SECTIONS.map((section) =>
              renderCollapsibleSection(
                section,
                coparentForm as unknown as Record<string, string>,
                editingCoparent,
                (key, val) => setCoparentForm((p) => ({ ...p, [key]: val })),
                COPARENT_FIELD_LABELS,
                COPARENT_SELECT_OPTIONS,
                new Set<string>(),
                "coparent-",
              )
            )}
        </>
      )}
    </div>
  );
}
