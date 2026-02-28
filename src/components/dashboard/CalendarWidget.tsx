"use client";

import { useState } from "react";
import Link from "next/link";
import { useCalendarEvents } from "@/hooks/useGoogleCalendar";
import { CALENDAR_DOT_COLORS } from "@/lib/constants";

// --- Types ---

interface CalendarEvent {
  _id: string;
  eventId: string;
  calendarId: string;
  calendarDisplayName: string;
  summary: string;
  startAt: number;
  endAt: number;
  isAllDay: boolean;
  location?: string;
  htmlLink?: string;
}

// --- Helpers ---

function getDayLabel(eventDate: Date, today: Date): string {
  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);
  const todayDay = new Date(today);
  todayDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((eventDay.getTime() - todayDay.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// --- Skeleton ---

function CalendarWidgetSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-1 py-2">
          <div className="w-14 h-3 rounded bg-border/60 shrink-0" />
          <div className="flex-1 h-3 rounded bg-border/60" />
          <div className="w-2 h-2 rounded-full bg-border/60 shrink-0" />
          <div className="w-16 h-3 rounded bg-border/60 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// --- Not-configured empty state ---

function NotConfiguredState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No calendars configured</p>
        <p className="text-xs text-muted mt-1">
          Connect Google Calendar to see upcoming events here.
        </p>
      </div>
      <Link
        href="/admin?tab=google-calendar"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        Connect Google Calendar
      </Link>
    </div>
  );
}

// --- Empty today message ---

function EmptyTodayMessage() {
  return (
    <div className="flex items-center gap-2 py-3 text-muted">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5M12 11.25v2.25m0 0v2.25m0-2.25h2.25m-2.25 0H9.75" />
      </svg>
      <span className="text-sm">No events today</span>
    </div>
  );
}

// --- Single event row ---

interface EventRowProps {
  event: CalendarEvent;
  color: string;
  now: number;
}

function EventRow({ event, color, now }: EventRowProps) {
  const isHappening = !event.isAllDay && now >= event.startAt && now < event.endAt;

  const rowContent = (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors ${
        isHappening ? "border-l-4" : ""
      }`}
      style={isHappening ? { borderLeftColor: color } : undefined}
    >
      {/* Time column */}
      <div className="w-16 shrink-0 text-xs text-muted">
        {event.isAllDay ? (
          <span className="italic">All day</span>
        ) : (
          formatTime(event.startAt)
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{event.summary}</p>
        {event.location && (
          <p className="text-xs text-muted truncate">{event.location}</p>
        )}
      </div>

      {/* Calendar source */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-muted hidden sm:block max-w-[80px] truncate">
          {event.calendarDisplayName}
        </span>
      </div>
    </div>
  );

  if (event.htmlLink) {
    return (
      <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="block">
        {rowContent}
      </a>
    );
  }

  return rowContent;
}

// --- Main component ---

const VISIBLE_EVENT_LIMIT = 10;

export default function CalendarWidget() {
  const result = useCalendarEvents();
  const [expanded, setExpanded] = useState(false);

  // Loading state
  if (result === undefined) {
    return <CalendarWidgetSkeleton />;
  }

  // Not configured state
  if (result === null) {
    return <NotConfiguredState />;
  }

  const events = result.events as CalendarEvent[];
  const now = Date.now();
  const today = new Date();

  // Build calendar color map
  const uniqueCalendarIds = [...new Set(events.map((e) => e.calendarId))];
  const calendarColorMap: Record<string, string> = Object.fromEntries(
    uniqueCalendarIds.map((id, i) => [id, CALENDAR_DOT_COLORS[i % CALENDAR_DOT_COLORS.length]])
  );

  // Group events by day key (YYYY-MM-DD based on startAt)
  const dayMap = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = getDayKey(event.startAt);
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(event);
  }

  // Sort day keys chronologically
  const sortedDayKeys = Array.from(dayMap.keys()).sort();

  // Build flat list of all events (in day order, all-day first within each day)
  const allSortedEvents: Array<{ event: CalendarEvent; dayKey: string }> = [];
  for (const dayKey of sortedDayKeys) {
    const dayEvents = dayMap.get(dayKey)!;
    const sorted = [...dayEvents].sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return a.startAt - b.startAt;
    });
    for (const event of sorted) {
      allSortedEvents.push({ event, dayKey });
    }
  }

  const totalEvents = allSortedEvents.length;
  const visibleEvents = expanded ? allSortedEvents : allSortedEvents.slice(0, VISIBLE_EVENT_LIMIT);
  const remainingCount = totalEvents - VISIBLE_EVENT_LIMIT;

  // Build the today day key
  const todayKey = getDayKey(today.getTime());

  // Track which day headers we've rendered
  const renderedDayKeys = new Set<string>();

  return (
    <div className="space-y-1">
      {visibleEvents.length === 0 && (
        <EmptyTodayMessage />
      )}

      {visibleEvents.map(({ event, dayKey }, index) => {
        const isFirstOfDay = !renderedDayKeys.has(dayKey);
        if (isFirstOfDay) renderedDayKeys.add(dayKey);

        const eventDate = new Date(event.startAt);
        const dayLabel = getDayLabel(eventDate, today);
        const dayEventCount = dayMap.get(dayKey)!.length;
        const color = calendarColorMap[event.calendarId] ?? CALENDAR_DOT_COLORS[0];

        return (
          <div key={`${event._id}-${index}`}>
            {/* Day header */}
            {isFirstOfDay && (
              <>
                {/* Show "No events today" before first non-today day if today has no events */}
                {dayKey !== todayKey && !renderedDayKeys.has(todayKey) && index === 0 && (
                  <div className="mt-0 mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-foreground">Today</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">0</span>
                    </div>
                    <EmptyTodayMessage />
                  </div>
                )}
                <div className={`flex items-center gap-2 ${index === 0 ? "mt-0" : "mt-4"} mb-2`}>
                  <span className="text-sm font-semibold text-foreground">{dayLabel}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {dayEventCount}
                  </span>
                </div>
              </>
            )}

            {/* Event row */}
            <EventRow event={event} color={color} now={now} />
          </div>
        );
      })}

      {/* Show today's empty state if no events at all and today has nothing */}
      {allSortedEvents.length > 0 && !dayMap.has(todayKey) && renderedDayKeys.size === 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-foreground">Today</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">0</span>
          </div>
          <EmptyTodayMessage />
        </>
      )}

      {/* Show more / Show less toggle */}
      {totalEvents > VISIBLE_EVENT_LIMIT && (
        <div className="pt-2">
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="text-xs text-primary hover:underline font-medium"
          >
            {expanded
              ? "Show less"
              : `Show more (${remainingCount} remaining)`}
          </button>
        </div>
      )}

      {/* Empty state when no events at all */}
      {allSortedEvents.length === 0 && (
        <div className="py-4 text-center">
          <div className="flex items-center justify-center gap-2 text-muted mb-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-sm">No upcoming events</span>
          </div>
          <p className="text-xs text-muted">Events from your configured calendars will appear here.</p>
        </div>
      )}
    </div>
  );
}
