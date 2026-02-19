"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { NewsletterSections } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import NewsletterSectionForm from "./NewsletterSectionForm";

interface NewsletterEditorProps {
  newsletterId: Id<"newsletters">;
  sections: NewsletterSections;
  title: string;
}

interface SectionField {
  key: keyof NewsletterSections;
  label: string;
  placeholder: string;
  rows: number;
}

interface SectionGroup {
  title: string;
  fields: SectionField[];
}

const sectionGroups: SectionGroup[] = [
  {
    title: "Welcome & Leadership",
    fields: [
      {
        key: "welcomeMessage",
        label: "Welcome Message",
        placeholder: "Write a warm welcome message from leadership...",
        rows: 6,
      },
      {
        key: "recentMilestones",
        label: "Recent Milestones",
        placeholder: "Share recent organizational milestones or achievements...",
        rows: 4,
      },
      {
        key: "personalReflections",
        label: "Personal Reflections",
        placeholder: "Personal reflections from the director or leadership...",
        rows: 4,
      },
    ],
  },
  {
    title: "Programs",
    fields: [
      {
        key: "programUpdates",
        label: "Program Updates",
        placeholder: "Share updates about current programs...",
        rows: 5,
      },
      {
        key: "programHighlights",
        label: "Program Highlights",
        placeholder: "Highlight key program achievements and milestones...",
        rows: 5,
      },
      {
        key: "participantTestimonials",
        label: "Participant Testimonials",
        placeholder: "Include testimonials from program participants...",
        rows: 5,
      },
      {
        key: "upcomingEvents",
        label: "Upcoming Events",
        placeholder: "List upcoming program events, workshops, or sessions...",
        rows: 4,
      },
    ],
  },
  {
    title: "Dad of the Month",
    fields: [
      {
        key: "dadOfMonthName",
        label: "Name",
        placeholder: "Enter the name of this month's featured dad...",
        rows: 1,
      },
      {
        key: "dadOfMonthStory",
        label: "Story",
        placeholder: "Write the story about this month's featured dad...",
        rows: 6,
      },
      {
        key: "photoLink",
        label: "Photo URL",
        placeholder: "Paste a link to the dad's photo (optional)...",
        rows: 1,
      },
    ],
  },
  {
    title: "Community & Partnerships",
    fields: [
      {
        key: "communityEvents",
        label: "Community Events",
        placeholder: "Describe community events, gatherings, or outreach...",
        rows: 4,
      },
      {
        key: "partnerships",
        label: "Partnerships",
        placeholder: "Highlight partnerships and collaborations...",
        rows: 4,
      },
    ],
  },
  {
    title: "Impact & Stats",
    fields: [
      {
        key: "fatherhoodStat",
        label: "Fatherhood Stat",
        placeholder: "Share a compelling fatherhood statistic...",
        rows: 3,
      },
    ],
  },
  {
    title: "Support & Involvement",
    fields: [
      {
        key: "volunteerNeeds",
        label: "Volunteer Needs",
        placeholder: "Describe current volunteer opportunities...",
        rows: 3,
      },
      {
        key: "donationCampaigns",
        label: "Donation Campaigns",
        placeholder: "Share active fundraising campaigns or donation info...",
        rows: 3,
      },
      {
        key: "readerSupport",
        label: "Reader Support",
        placeholder: "How readers can support the mission...",
        rows: 3,
      },
    ],
  },
  {
    title: "Stay Connected",
    fields: [
      {
        key: "contactInfo",
        label: "Contact Info",
        placeholder: "Contact details or office hours...",
        rows: 2,
      },
      {
        key: "socialMediaCTA",
        label: "Social Media CTA",
        placeholder: "Call-to-action for social media follows...",
        rows: 2,
      },
      {
        key: "additionalNotes",
        label: "Additional Notes",
        placeholder: "Any additional content or announcements...",
        rows: 4,
      },
    ],
  },
];

export default function NewsletterEditor({
  newsletterId,
  sections: initialSections,
  title,
}: NewsletterEditorProps) {
  const update = useMutation(api.newsletters.update);
  const [sections, setSections] = useState<NewsletterSections>(initialSections);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleSave = useCallback(
    async (updatedSections: NewsletterSections) => {
      setSaving(true);
      try {
        await update({
          id: newsletterId,
          sections: JSON.stringify(updatedSections),
        });
        setLastSaved(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Failed to save:", err);
      } finally {
        setSaving(false);
      }
    },
    [newsletterId, update]
  );

  function handleFieldChange(field: keyof NewsletterSections, value: string) {
    const updated = { ...sections, [field]: value };
    setSections(updated);
  }

  function handleBlur() {
    handleSave(sections);
  }

  function toggleGroup(groupTitle: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupTitle)) {
        next.delete(groupTitle);
      } else {
        next.add(groupTitle);
      }
      return next;
    });
  }

  function getGroupFieldCount(group: SectionGroup): number {
    return group.fields.filter((f) => sections[f.key]?.trim()).length;
  }

  return (
    <div className="space-y-6" onBlur={handleBlur}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {saving
            ? "Saving..."
            : lastSaved
              ? `Last saved at ${lastSaved}`
              : "Edit sections below. Changes auto-save on blur."}
        </p>
        <Button
          variant="secondary"
          size="sm"
          loading={saving}
          onClick={() => handleSave(sections)}
        >
          Save All
        </Button>
      </div>

      {sectionGroups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.title);
        const filledCount = getGroupFieldCount(group);

        return (
          <Card key={group.title}>
            <button
              type="button"
              onClick={() => toggleGroup(group.title)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-muted transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              </div>
              <span className="text-xs text-muted">
                {filledCount}/{group.fields.length} filled
              </span>
            </button>

            {!isCollapsed && (
              <div className="mt-4 space-y-4">
                {group.fields.map((field) => (
                  <NewsletterSectionForm
                    key={field.key}
                    label={field.label}
                    value={sections[field.key] || ""}
                    onChange={(val) => handleFieldChange(field.key, val)}
                    placeholder={field.placeholder}
                    rows={field.rows}
                  />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
