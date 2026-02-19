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

export default function NewsletterEditor({
  newsletterId,
  sections: initialSections,
  title,
}: NewsletterEditorProps) {
  const update = useMutation(api.newsletters.update);
  const [sections, setSections] = useState<NewsletterSections>(initialSections);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

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

  const sectionFields: {
    key: keyof NewsletterSections;
    label: string;
    placeholder: string;
    rows: number;
  }[] = [
    {
      key: "dadOfMonthName",
      label: "Dad of the Month - Name",
      placeholder: "Enter the name of this month's featured dad...",
      rows: 1,
    },
    {
      key: "dadOfMonthStory",
      label: "Dad of the Month - Story",
      placeholder: "Write the story about this month's featured dad...",
      rows: 6,
    },
    {
      key: "participantTestimonials",
      label: "Participant Testimonials",
      placeholder: "Include testimonials from program participants...",
      rows: 5,
    },
    {
      key: "programHighlights",
      label: "Program Highlights",
      placeholder: "Highlight key program achievements and milestones...",
      rows: 5,
    },
    {
      key: "programUpdates",
      label: "Program Updates",
      placeholder: "Share updates about current programs...",
      rows: 5,
    },
    {
      key: "fatherhoodStat",
      label: "Fatherhood Stat",
      placeholder: "Share a compelling fatherhood statistic...",
      rows: 3,
    },
    {
      key: "additionalNotes",
      label: "Additional Notes",
      placeholder: "Any additional content or announcements...",
      rows: 4,
    },
  ];

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

      {sectionFields.map((field) => (
        <Card key={field.key}>
          <NewsletterSectionForm
            label={field.label}
            value={sections[field.key] || ""}
            onChange={(val) => handleFieldChange(field.key, val)}
            placeholder={field.placeholder}
            rows={field.rows}
          />
        </Card>
      ))}
    </div>
  );
}
