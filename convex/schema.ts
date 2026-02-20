import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("lawyer"),
      v.literal("psychologist"),
      v.literal("readonly")
    )),
    mustChangePassword: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  appSettings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  quickbooksConfig: defineTable({
    accessToken: v.string(),
    refreshToken: v.string(),
    realmId: v.string(),
    tokenExpiry: v.number(),
    companyName: v.optional(v.string()),
    connectedAt: v.number(),
    connectedBy: v.optional(v.id("users")),
  }),

  quickbooksCache: defineTable({
    reportType: v.string(),
    data: v.string(),
    fetchedAt: v.number(),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
  })
    .index("by_reportType", ["reportType"])
    .index("by_fetchedAt", ["fetchedAt"]),

  googleSheetsConfig: defineTable({
    spreadsheetId: v.string(),
    sheetName: v.string(),
    serviceAccountEmail: v.string(),
    lastSyncAt: v.optional(v.number()),
    configuredBy: v.id("users"),
    purpose: v.optional(v.string()),
  }).index("by_purpose", ["purpose"]),

  constantContactConfig: defineTable({
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
    connectedAt: v.number(),
    connectedBy: v.optional(v.id("users")),
  }),

  grantsCache: defineTable({
    sheetRowId: v.string(),
    grantName: v.string(),
    funder: v.string(),
    totalAmount: v.number(),
    amountSpent: v.optional(v.number()),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("cultivating")
    ),
    restrictions: v.optional(v.string()),
    deadlines: v.optional(v.string()),
    notes: v.optional(v.string()),
    lastSyncAt: v.number(),
  }).index("by_sheetRowId", ["sheetRowId"]),

  programDataCache: defineTable({
    sheetRowId: v.string(),
    programType: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    gender: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    enrollmentDate: v.optional(v.string()),
    status: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    reasonForVisit: v.optional(v.string()),
    programOutcome: v.optional(v.string()),
    sessionCount: v.optional(v.number()),
    lastSyncAt: v.number(),
  }).index("by_sheetRowId", ["sheetRowId"])
    .index("by_programType", ["programType"]),

  programs: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("coparent"),
      v.literal("legal"),
      v.literal("fatherhood"),
      v.literal("other")
    ),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  clients: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    programId: v.optional(v.id("programs")),
    enrollmentDate: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("withdrawn")
    ),
    zipCode: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_programId", ["programId"]),

  sessions: defineTable({
    clientId: v.id("clients"),
    programId: v.optional(v.id("programs")),
    sessionDate: v.number(),
    sessionType: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  }).index("by_clientId", ["clientId"]),

  clientGoals: defineTable({
    clientId: v.id("clients"),
    goalDescription: v.string(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("not_started")
    ),
    targetDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_clientId", ["clientId"]),

  newsletters: defineTable({
    title: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("published")
    ),
    sections: v.string(),
    generatedEmailHtml: v.optional(v.string()),
    generatedEmailSubject: v.optional(v.string()),
    campaignActivityId: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  aiDirectorMessages: defineTable({
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_sessionId", ["sessionId"]),

  aiDirectorConfig: defineTable({
    assistantId: v.string(),
    vectorStoreId: v.string(),
    systemInstructions: v.string(),
    updatedAt: v.number(),
  }),

  knowledgeBase: defineTable({
    fileName: v.string(),
    fileType: v.string(),
    storageId: v.id("_storage"),
    openaiFileId: v.string(),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    sizeBytes: v.number(),
  }),

  dashboardPrefs: defineTable({
    userId: v.id("users"),
    sectionOrder: v.array(v.string()),
    hiddenSections: v.array(v.string()),
  }).index("by_userId", ["userId"]),

  auditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  allocationRuns: defineTable({
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    startedBy: v.id("users"),
    totalExpenses: v.number(),
    totalProcessed: v.number(),
    totalSubmitted: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }).index("by_startedAt", ["startedAt"]),

  legalIntakeForms: defineTable({
    clientId: v.optional(v.id("clients")),
    intakeDate: v.optional(v.number()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    coParentName: v.optional(v.string()),
    reasonForVisit: v.optional(v.string()),
    attorneyNotes: v.optional(v.string()),
    hasAttorney: v.optional(v.string()),
    email: v.optional(v.string()),
    numberOfVisits: v.optional(v.string()),
    upcomingCourtDate: v.optional(v.string()),
    hasRestrainingOrder: v.optional(v.string()),
    countyFiledIn: v.optional(v.string()),
    existingCourtOrders: v.optional(v.string()),
    custodyOrderFollowed: v.optional(v.string()),
    notFollowedReason: v.optional(v.string()),
    minorChildrenInvolved: v.optional(v.string()),
    childrenResidence: v.optional(v.string()),
    marriedToMother: v.optional(v.string()),
    childSupportOrders: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    seekingTo: v.optional(v.string()),
    safetyFears: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    countyOfOrders: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    age: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_lastName", ["lastName"]),

  coparentIntakeForms: defineTable({
    clientId: v.optional(v.id("clients")),
    timestamp: v.optional(v.string()),
    role: v.optional(v.string()),
    fullName: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    age: v.optional(v.string()),
    coParentName: v.optional(v.string()),
    coParentEthnicity: v.optional(v.string()),
    coParentDob: v.optional(v.string()),
    coParentPhone: v.optional(v.string()),
    coParentEmail: v.optional(v.string()),
    coParentZip: v.optional(v.string()),
    coParentAge: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    coParentInformed: v.optional(v.string()),
    sessionDate: v.optional(v.string()),
    sessionTime: v.optional(v.string()),
    sessionsCompleted: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clientId", ["clientId"])
    .index("by_createdAt", ["createdAt"]),

  expenseAllocations: defineTable({
    runId: v.id("allocationRuns"),
    purchaseId: v.string(),
    lineId: v.string(),
    syncToken: v.string(),
    vendorName: v.string(),
    accountName: v.string(),
    amount: v.number(),
    txnDate: v.string(),
    memo: v.optional(v.string()),
    suggestedClassId: v.optional(v.string()),
    suggestedClassName: v.optional(v.string()),
    suggestedScore: v.optional(v.number()),
    confidence: v.string(),
    explanation: v.string(),
    scoringDetail: v.optional(v.string()),
    runnerUpClassName: v.optional(v.string()),
    runnerUpScore: v.optional(v.number()),
    qualifyingGrants: v.optional(v.string()),
    finalClassId: v.optional(v.string()),
    finalClassName: v.optional(v.string()),
    action: v.string(),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
  }).index("by_runId", ["runId"])
    .index("by_status", ["status"])
    .index("by_purchaseId", ["purchaseId"]),
});
