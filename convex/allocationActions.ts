"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getOpenAIApiKey } from "./openaiHelpers";
import {
  ALLOCATION_CONFIG,
  type GrantProfile,
  type QualifyingGrant,
  type PreScoredExpense,
  type AIRecommendation,
} from "./allocationTypes";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthenticatedConfig(ctx: any) {
  const config = await ctx.runQuery(internal.quickbooksInternal.getFullConfig);
  if (!config) throw new Error("QuickBooks not connected");

  if (config.tokenExpiry < Date.now() + 60000) {
    const newToken = await ctx.runAction(internal.quickbooksActions.refreshTokens, {});
    return { accessToken: newToken, realmId: config.realmId };
  }

  return { accessToken: config.accessToken, realmId: config.realmId };
}

function getBaseUrl(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

// ─── Run Categorization ─────────────────────────────────────────────────────

export const runCategorization = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Check for existing running run
    const existingRun = await ctx.runQuery(internal.allocationInternal.getRunningRun);
    if (existingRun) {
      throw new Error("A categorization run is already in progress");
    }

    // 1. Read cached data
    const budgetsCache = await ctx.runQuery(internal.quickbooksInternal.getCachedData, { reportType: "budgets" });
    const expensesCache = await ctx.runQuery(internal.quickbooksInternal.getCachedData, { reportType: "expenses" });
    const classesCache = await ctx.runQuery(internal.quickbooksInternal.getCachedData, { reportType: "classes" });

    if (!budgetsCache || !expensesCache) {
      throw new Error("No cached QB data. Please sync QuickBooks first.");
    }

    const budgets: any[] = JSON.parse(budgetsCache).QueryResponse?.Budget ?? [];
    const allPurchases: any[] = JSON.parse(expensesCache).QueryResponse?.Purchase ?? [];
    const classes: any[] = classesCache ? JSON.parse(classesCache).QueryResponse?.Class ?? [] : [];

    const CONFIG = ALLOCATION_CONFIG;
    const today = new Date();

    // 2. Build grant profiles from budgets
    const grantBudgets: Record<string, any> = {};
    const budgetClassIds = new Set<string>();

    for (const budget of budgets) {
      if (!budget.BudgetDetail || budget.BudgetDetail.length === 0) continue;

      const startDate = new Date(budget.StartDate);
      const endDate = new Date(budget.EndDate);
      const isCurrent = today >= startDate && today <= endDate;

      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const percentTimeElapsed = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

      if (!CONFIG.allow_expired_grants && remainingDays < 0) continue;

      for (const detail of budget.BudgetDetail) {
        if (!detail.ClassRef?.value) continue;

        const classId = detail.ClassRef.value;
        const className = detail.ClassRef.name;
        const accountId = detail.AccountRef?.value;
        const accountName = detail.AccountRef?.name;
        const amount = detail.Amount || 0;

        if (accountName?.includes("Revenue") || accountName?.startsWith("4")) continue;
        if (amount === 0) continue;

        budgetClassIds.add(classId);

        if (!grantBudgets[classId]) {
          grantBudgets[classId] = {
            class_id: classId,
            class_name: className,
            start_date: budget.StartDate,
            end_date: budget.EndDate,
            is_current: isCurrent,
            is_expired: remainingDays < 0,
            remaining_days: remainingDays,
            percent_time_elapsed: Math.round(percentTimeElapsed),
            categories: {} as Record<string, any>,
          };
        }

        if (!grantBudgets[classId].categories[accountId]) {
          grantBudgets[classId].categories[accountId] = {
            account_id: accountId,
            account_name: accountName,
            total_budget: 0,
          };
        }
        grantBudgets[classId].categories[accountId].total_budget += amount;
      }
    }

    // 3. Calculate actual spending from classified expenses
    const actualSpending: Record<string, Record<string, number>> = {};
    const allocationHistory: any[] = [];
    const historyWindowStart = new Date(today);
    historyWindowStart.setDate(historyWindowStart.getDate() - CONFIG.allocation_history_window_days);
    const rotationState: Record<string, any> = {};

    for (const purchase of allPurchases) {
      const txnDate = new Date(purchase.TxnDate);

      for (const line of purchase.Line || []) {
        if (line.DetailType !== "AccountBasedExpenseLineDetail") continue;

        const detail = line.AccountBasedExpenseLineDetail || {};
        const classId = detail.ClassRef?.value;
        const accountId = detail.AccountRef?.value;
        const accountName = detail.AccountRef?.name || "";
        const vendorName = purchase.EntityRef?.name || "Unknown";
        const amount = line.Amount || 0;

        if (!classId || !accountId) continue;

        if (!actualSpending[classId]) actualSpending[classId] = {};
        if (!actualSpending[classId][accountId]) actualSpending[classId][accountId] = 0;
        actualSpending[classId][accountId] += amount;

        if (txnDate >= historyWindowStart && budgetClassIds.has(classId)) {
          allocationHistory.push({
            date: purchase.TxnDate,
            vendor_name: vendorName,
            account_name: accountName,
            amount,
            class_id: classId,
          });

          const rotationKey = `${vendorName}|${accountName}`;
          if (!rotationState[rotationKey]) {
            rotationState[rotationKey] = {
              last_grant_used: null,
              grants_used: [] as string[],
              total_by_grant: {} as Record<string, number>,
              allocation_count: 0,
            };
          }
          rotationState[rotationKey].last_grant_used = classId;
          rotationState[rotationKey].allocation_count++;
          if (!rotationState[rotationKey].grants_used.includes(classId)) {
            rotationState[rotationKey].grants_used.push(classId);
          }
          if (!rotationState[rotationKey].total_by_grant[classId]) {
            rotationState[rotationKey].total_by_grant[classId] = 0;
          }
          rotationState[rotationKey].total_by_grant[classId] += amount;
        }
      }
    }

    // 4. Build grant profiles with pacing
    const grantsForAI: GrantProfile[] = Object.values(grantBudgets)
      .map((grant: any) => {
        const classSpending = actualSpending[grant.class_id] || {};
        let totalBudget = 0;
        let totalSpent = 0;

        const categoriesWithDetails = Object.values(grant.categories as Record<string, any>)
          .map((cat: any) => {
            const spent = classSpending[cat.account_id] || 0;
            const remaining = Math.max(0, cat.total_budget - spent);
            totalBudget += cat.total_budget;
            totalSpent += spent;

            const bufferActive = grant.remaining_days > CONFIG.reserves.buffer_release_days_before_end;
            const reserveBuffer = bufferActive ? cat.total_budget * (CONFIG.reserves.min_remaining_buffer_pct / 100) : 0;

            return {
              account_id: cat.account_id,
              account_name: cat.account_name,
              total_budget: Math.round(cat.total_budget * 100) / 100,
              amount_spent: Math.round(spent * 100) / 100,
              remaining_budget: Math.round(remaining * 100) / 100,
              available_after_reserve: Math.round(Math.max(0, remaining - reserveBuffer) * 100) / 100,
              percent_spent: Math.round(cat.total_budget > 0 ? (spent / cat.total_budget) * 100 : 0),
            };
          })
          .filter((cat) => cat.remaining_budget > 0);

        const percentBudgetSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        const pacingDelta = percentBudgetSpent - grant.percent_time_elapsed;
        let pacingStatus: "behind_pace" | "on_track" | "ahead_of_pace" = "on_track";
        if (pacingDelta > CONFIG.pacing.overspend_tolerance_pct) pacingStatus = "ahead_of_pace";
        else if (pacingDelta < -CONFIG.pacing.underspend_tolerance_pct) pacingStatus = "behind_pace";

        return {
          class_id: grant.class_id,
          class_name: grant.class_name,
          start_date: grant.start_date,
          end_date: grant.end_date,
          is_current: grant.is_current,
          is_expired: grant.is_expired,
          remaining_days: grant.remaining_days,
          percent_time_elapsed: grant.percent_time_elapsed,
          pacing: {
            percent_time_elapsed: grant.percent_time_elapsed,
            percent_budget_spent: Math.round(percentBudgetSpent),
            pacing_delta: Math.round(pacingDelta),
            pacing_status: pacingStatus,
          },
          budget_categories: categoriesWithDetails,
        } as GrantProfile;
      })
      .filter((g) => g.budget_categories.length > 0);

    // 5. Build diversification metrics
    const diversificationMetrics: Record<string, any> = {};
    for (const [rotationKey, state] of Object.entries(rotationState)) {
      const totalForKey = Object.values(state.total_by_grant as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
      const grantConcentrations: Record<string, { amount: number; percent: number }> = {};
      for (const [classId, amount] of Object.entries(state.total_by_grant as Record<string, number>)) {
        grantConcentrations[classId] = {
          amount,
          percent: totalForKey > 0 ? Math.round((amount / totalForKey) * 100) : 0,
        };
      }
      diversificationMetrics[rotationKey] = {
        last_grant_used: state.last_grant_used,
        grants_used: state.grants_used,
        concentration_by_grant: grantConcentrations,
        total_allocations: state.allocation_count,
      };
    }

    // 6. Pre-filter and score expenses
    const batchAllocationTracker: Record<string, Record<string, number>> = {};
    let rotationCounter = 0;
    const expensesToReassign: PreScoredExpense[] = [];

    for (const purchase of allPurchases) {
      for (const line of purchase.Line || []) {
        if (line.DetailType !== "AccountBasedExpenseLineDetail") continue;

        const detail = line.AccountBasedExpenseLineDetail || {};
        const classId = detail.ClassRef?.value || null;
        const className = detail.ClassRef?.name || null;
        const vendorName = purchase.EntityRef?.name || "Unknown";
        const accountName = detail.AccountRef?.name || "";
        const accountId = detail.AccountRef?.value || "";
        const amount = line.Amount || 0;

        // Only process unclassified or non-budgeted expenses
        if (classId && budgetClassIds.has(classId)) continue;

        const rotationKey = `${vendorName}|${accountName}`;
        const divInfo = diversificationMetrics[rotationKey] || null;

        // Find qualifying grants
        let qualifyingGrants: QualifyingGrant[] = grantsForAI
          .filter((grant) => {
            const matchingCategory = grant.budget_categories.find((cat) => cat.account_name === accountName);
            if (!matchingCategory) return false;
            if (matchingCategory.available_after_reserve < amount) return false;
            return true;
          })
          .map((grant) => {
            const matchingCategory = grant.budget_categories.find((cat) => cat.account_name === accountName)!;

            // s1: Pacing score (0-40)
            let s1_pacing = 0;
            if (grant.pacing.pacing_status === "behind_pace") s1_pacing = 40;
            else if (grant.pacing.pacing_status === "on_track") s1_pacing = 25;
            else if (grant.pacing.pacing_status === "ahead_of_pace") s1_pacing = 5;

            // s2: Time urgency (0-25)
            let s2_time = 0;
            if (grant.is_expired || grant.remaining_days <= 60) s2_time = 25;
            else if (grant.remaining_days <= 120) s2_time = 15;
            else s2_time = 5;

            // s3: Diversification (0-25)
            let s3_diversification = 25;
            if (divInfo && divInfo.concentration_by_grant[grant.class_id]) {
              const concentration = divInfo.concentration_by_grant[grant.class_id].percent;
              if (concentration < 30) s3_diversification = 25;
              else if (concentration <= 50) s3_diversification = 15;
              else if (concentration <= 70) s3_diversification = 5;
              else s3_diversification = 0;
            }

            // s4: Budget remaining (0-10)
            let s4_budget = 0;
            const pctRemaining = (matchingCategory.remaining_budget / matchingCategory.total_budget) * 100;
            if (pctRemaining > 50) s4_budget = 10;
            else if (pctRemaining >= 25) s4_budget = 5;
            else s4_budget = 2;

            const totalScore = s1_pacing + s2_time + s3_diversification + s4_budget;

            return {
              class_id: grant.class_id,
              class_name: grant.class_name,
              matching_category: matchingCategory,
              scores: { s1_pacing, s2_time, s3_diversification, s4_budget, total: totalScore },
              pacing_status: grant.pacing.pacing_status,
              is_expired: grant.is_expired,
              concentration_pct: divInfo?.concentration_by_grant[grant.class_id]?.percent || 0,
            } as QualifyingGrant;
          });

        // Hard constraint: filter out ahead_of_pace if alternatives exist
        const hasNonAhead = qualifyingGrants.some((g) => g.pacing_status !== "ahead_of_pace");
        let finalQualifying = hasNonAhead
          ? qualifyingGrants.filter((g) => g.pacing_status !== "ahead_of_pace")
          : qualifyingGrants;

        // Batch concentration penalty
        const batchKey = accountName;
        if (!batchAllocationTracker[batchKey]) batchAllocationTracker[batchKey] = {};

        finalQualifying.forEach((grant) => {
          const batchCount = batchAllocationTracker[batchKey][grant.class_id] || 0;
          const totalBatchForAccount = Object.values(batchAllocationTracker[batchKey]).reduce((a, b) => a + b, 0);

          if (totalBatchForAccount > 0) {
            const batchConcentration = (batchCount / totalBatchForAccount) * 100;
            if (batchConcentration > 50) {
              grant.scores.s3_diversification = Math.max(0, grant.scores.s3_diversification - 15);
              grant.scores.total = grant.scores.s1_pacing + grant.scores.s2_time + grant.scores.s3_diversification + grant.scores.s4_budget;
            }
          }
        });

        // Sort by score
        finalQualifying.sort((a, b) => b.scores.total - a.scores.total);

        // Sequential rotation tie-breaker
        if (finalQualifying.length > 1) {
          const topScore = finalQualifying[0].scores.total;
          const tiedGrants = finalQualifying.filter((g) => Math.abs(g.scores.total - topScore) <= 5);

          if (tiedGrants.length > 1) {
            if (divInfo?.last_grant_used) {
              const alternativeGrant = tiedGrants.find((g) => g.class_id !== divInfo.last_grant_used);
              if (alternativeGrant) {
                const idx = finalQualifying.indexOf(alternativeGrant);
                finalQualifying.splice(idx, 1);
                finalQualifying.unshift(alternativeGrant);
              }
            } else {
              const selectedIndex = rotationCounter % tiedGrants.length;
              rotationCounter++;
              const selectedGrant = tiedGrants[selectedIndex];
              const idx = finalQualifying.indexOf(selectedGrant);
              finalQualifying.splice(idx, 1);
              finalQualifying.unshift(selectedGrant);
            }
          }
        }

        // Update batch tracker
        if (finalQualifying.length > 0) {
          const selectedGrant = finalQualifying[0];
          if (!batchAllocationTracker[batchKey][selectedGrant.class_id]) {
            batchAllocationTracker[batchKey][selectedGrant.class_id] = 0;
          }
          batchAllocationTracker[batchKey][selectedGrant.class_id]++;
        }

        expensesToReassign.push({
          purchase_id: purchase.Id,
          line_id: line.Id,
          sync_token: purchase.SyncToken,
          txn_date: purchase.TxnDate,
          vendor_name: vendorName,
          description: line.Description || purchase.PrivateNote || "",
          amount: Math.round(amount * 100) / 100,
          account_id: accountId,
          account_name: accountName,
          current_class: className || "Unassigned",
          qualifying_grants: finalQualifying,
          diversification_context: divInfo
            ? {
                last_grant_used_for_this_vendor_account: divInfo.last_grant_used,
                grants_already_used: divInfo.grants_used,
                concentration_by_grant: divInfo.concentration_by_grant,
                total_recent_allocations: divInfo.total_allocations,
              }
            : null,
        });
      }
    }

    if (expensesToReassign.length === 0) {
      throw new Error("No unclassified expenses found to categorize.");
    }

    // 7. Create run record
    const runId = await ctx.runMutation(internal.allocationInternal.createRun, {
      startedBy: args.userId,
      totalExpenses: expensesToReassign.length,
    });

    try {
      // 8. Call OpenAI in batches of 30
      const OpenAI = (await import("openai")).default;
      const apiKey = await getOpenAIApiKey(ctx);
      const openai = new OpenAI({ apiKey });

      const BATCH_SIZE = 30;
      const allRecommendations: AIRecommendation[] = [];

      for (let i = 0; i < expensesToReassign.length; i += BATCH_SIZE) {
        const batch = expensesToReassign.slice(i, i + BATCH_SIZE);

        const aiInput = {
          current_date: today.toISOString().split("T")[0],
          summary: {
            total_expenses_to_allocate: batch.length,
            total_amount: Math.round(batch.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
            available_grants: grantsForAI.length,
          },
          grants: grantsForAI,
          expenses: batch,
        };

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: JSON.stringify(aiInput) },
          ],
        });

        const responseText = completion.choices[0]?.message?.content ?? "{}";
        let recommendations: AIRecommendation[];
        try {
          const parsed = JSON.parse(responseText);
          recommendations = Array.isArray(parsed) ? parsed : parsed.recommendations ?? parsed.results ?? [parsed];
        } catch {
          console.error("Failed to parse AI response batch", i);
          // Flag entire batch for review
          recommendations = batch.map((exp) => ({
            purchase_id: exp.purchase_id,
            line_id: exp.line_id,
            sync_token: exp.sync_token,
            vendor_name: exp.vendor_name,
            amount: exp.amount,
            account_name: exp.account_name,
            action: "flag_for_review" as const,
            suggested_class_id: null,
            suggested_class_name: null,
            confidence: "low" as const,
            explanation: "AI response could not be parsed",
            scoring_detail: { selected_grant_score: 0, runner_up_grant: null, runner_up_score: null },
          }));
        }

        allRecommendations.push(...recommendations);
      }

      // 9. Post-AI validation & build allocation records
      const grantsLookup: Record<string, GrantProfile> = {};
      for (const grant of grantsForAI) {
        grantsLookup[grant.class_id] = grant;
      }

      const expensesLookup: Record<string, PreScoredExpense> = {};
      for (const exp of expensesToReassign) {
        expensesLookup[`${exp.purchase_id}-${exp.line_id}`] = exp;
      }

      const allocations = allRecommendations.map((rec) => {
        const key = `${rec.purchase_id}-${rec.line_id}`;
        const originalExpense = expensesLookup[key];
        let validated = true;

        // Validation: grant exists in qualifying list
        if (rec.action === "reassign" && rec.suggested_class_id) {
          if (!grantsLookup[rec.suggested_class_id]) {
            validated = false;
          } else if (originalExpense?.qualifying_grants) {
            const wasQualified = originalExpense.qualifying_grants.some((g) => g.class_id === rec.suggested_class_id);
            if (!wasQualified && originalExpense.qualifying_grants.length > 0) {
              // AI picked a grant not in the qualifying list — use top pre-scored grant instead
              const topGrant = originalExpense.qualifying_grants[0];
              rec.suggested_class_id = topGrant.class_id;
              rec.suggested_class_name = topGrant.class_name;
              rec.explanation += " (Corrected: AI selection overridden to top pre-scored grant)";
            }
          }

          // Validate category match
          if (rec.suggested_class_id && grantsLookup[rec.suggested_class_id]) {
            const grant = grantsLookup[rec.suggested_class_id];
            const hasMatch = grant.budget_categories.some((cat) => cat.account_name === rec.account_name);
            if (!hasMatch) {
              validated = false;
            }
          }
        }

        if (!validated) {
          rec.action = "flag_for_review";
          rec.confidence = "low";
          rec.suggested_class_id = null;
          rec.suggested_class_name = null;
          rec.explanation = "Failed post-AI validation: " + rec.explanation;
        }

        return {
          runId,
          purchaseId: rec.purchase_id,
          lineId: rec.line_id,
          syncToken: rec.sync_token ?? originalExpense?.sync_token ?? "",
          vendorName: rec.vendor_name,
          accountName: rec.account_name,
          amount: rec.amount,
          txnDate: originalExpense?.txn_date ?? "",
          memo: originalExpense?.description || undefined,
          suggestedClassId: rec.suggested_class_id ?? undefined,
          suggestedClassName: rec.suggested_class_name ?? undefined,
          suggestedScore: rec.scoring_detail?.selected_grant_score ?? undefined,
          confidence: rec.confidence,
          explanation: rec.explanation,
          scoringDetail: rec.scoring_detail ? JSON.stringify(rec.scoring_detail) : undefined,
          runnerUpClassName: rec.scoring_detail?.runner_up_grant ?? undefined,
          runnerUpScore: rec.scoring_detail?.runner_up_score ?? undefined,
          qualifyingGrants: originalExpense?.qualifying_grants
            ? JSON.stringify(
                originalExpense.qualifying_grants.map((g) => ({
                  class_id: g.class_id,
                  class_name: g.class_name,
                  score: g.scores.total,
                  pacing: g.pacing_status,
                  concentration: g.concentration_pct,
                }))
              )
            : undefined,
          finalClassId: validated ? (rec.suggested_class_id ?? undefined) : undefined,
          finalClassName: validated ? (rec.suggested_class_name ?? undefined) : undefined,
          action: rec.action,
          status: "pending",
        };
      });

      // 10. Save allocations in batches (Convex mutation size limit)
      const SAVE_BATCH = 50;
      for (let i = 0; i < allocations.length; i += SAVE_BATCH) {
        await ctx.runMutation(internal.allocationInternal.saveAllocations, {
          allocations: allocations.slice(i, i + SAVE_BATCH),
        });
      }

      // 11. Mark run complete
      await ctx.runMutation(internal.allocationInternal.updateRun, {
        runId,
        status: "completed",
        completedAt: Date.now(),
        totalProcessed: allocations.length,
      });

      return runId;
    } catch (error: any) {
      await ctx.runMutation(internal.allocationInternal.updateRun, {
        runId,
        status: "failed",
        completedAt: Date.now(),
        errorMessage: error.message ?? "Unknown error",
      });
      throw error;
    }
  },
});

// ─── Submit to QuickBooks ───────────────────────────────────────────────────

export const submitToQuickBooks = action({
  args: { runId: v.id("allocationRuns") },
  handler: async (ctx, args) => {
    const allocations = await ctx.runQuery(internal.allocation.getAllocationsInternal, { runId: args.runId });
    const approved = allocations.filter((a: any) => a.status === "approved" && a.finalClassId);

    if (approved.length === 0) {
      throw new Error("No approved allocations to submit");
    }

    const { accessToken, realmId } = await getAuthenticatedConfig(ctx);
    const baseUrl = getBaseUrl();

    let submitted = 0;
    let errors = 0;

    for (const alloc of approved) {
      try {
        // Fresh-fetch the purchase to get current SyncToken
        const fetchRes = await fetch(
          `${baseUrl}/v3/company/${realmId}/purchase/${alloc.purchaseId}?minorversion=65`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!fetchRes.ok) {
          throw new Error(`QB fetch error: ${fetchRes.status}`);
        }

        const purchaseData = await fetchRes.json();
        const purchase = purchaseData.Purchase;

        if (!purchase) {
          throw new Error("Purchase not found in QuickBooks");
        }

        // Update the matching line's ClassRef
        let lineFound = false;
        for (const line of purchase.Line || []) {
          if (line.Id === alloc.lineId && line.DetailType === "AccountBasedExpenseLineDetail") {
            line.AccountBasedExpenseLineDetail.ClassRef = {
              value: alloc.finalClassId,
              name: alloc.finalClassName,
            };
            lineFound = true;
            break;
          }
        }

        if (!lineFound) {
          throw new Error(`Line ${alloc.lineId} not found in purchase ${alloc.purchaseId}`);
        }

        // POST updated purchase back
        const updateRes = await fetch(
          `${baseUrl}/v3/company/${realmId}/purchase?minorversion=65`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(purchase),
          }
        );

        if (!updateRes.ok) {
          const errorBody = await updateRes.text();
          throw new Error(`QB update error: ${updateRes.status} — ${errorBody}`);
        }

        await ctx.runMutation(internal.allocationInternal.updateAllocationStatus, {
          allocationId: alloc._id,
          status: "submitted",
          submittedAt: Date.now(),
        });
        submitted++;
      } catch (error: any) {
        await ctx.runMutation(internal.allocationInternal.updateAllocationStatus, {
          allocationId: alloc._id,
          status: "error",
          errorMessage: error.message ?? "Unknown error",
        });
        errors++;
      }
    }

    await ctx.runMutation(internal.allocationInternal.updateRun, {
      runId: args.runId,
      totalSubmitted: submitted,
    });

    return { submitted, errors, total: approved.length };
  },
});

// ─── Refresh + Categorize ───────────────────────────────────────────────────

export const refreshCategorization = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Sync QB data first
    await ctx.runAction(internal.quickbooksActions.syncAllData, {});
    // Then run categorization
    return await ctx.runAction(api.allocationActions.runCategorization, { userId: args.userId });
  },
});

// ─── System Prompt ──────────────────────────────────────────────────────────

function getSystemPrompt(): string {
  return `You are a Grant Expense Allocation Assistant. Each expense has been pre-filtered and pre-scored to show ONLY qualifying grants with matching categories and sufficient budgets.

## YOUR TASK
Review each expense's "qualifying_grants" array (already scored, sorted, and rotation-optimized). Select the TOP grant unless there's a compelling reason to override.

## OUTPUT FORMAT
Return ONLY valid JSON with a "recommendations" key containing an array:

{
  "recommendations": [
    {
      "purchase_id": "string",
      "line_id": "string",
      "sync_token": "string",
      "vendor_name": "string",
      "amount": number,
      "account_name": "string",
      "action": "reassign" OR "flag_for_review",
      "suggested_class_id": "string" OR null,
      "suggested_class_name": "string" OR null,
      "confidence": "high" OR "medium" OR "low",
      "explanation": "Brief explanation",
      "scoring_detail": {
        "selected_grant_score": number,
        "runner_up_grant": "string" OR null,
        "runner_up_score": number OR null
      }
    }
  ]
}

## DECISION RULES

### Rule 1: Empty Qualifying Grants
If qualifying_grants array is EMPTY:
- action: "flag_for_review"
- suggested_class_id: null, suggested_class_name: null
- confidence: "low"

### Rule 2: Single Qualifying Grant
If qualifying_grants has exactly 1 option:
- action: "reassign", select that grant
- Confidence: score ≥70="high", 50-69="medium", <50="low"
- runner_up_grant: null, runner_up_score: null

### Rule 3: Multiple Qualifying Grants
If qualifying_grants has 2+ options:
- action: "reassign", select qualifying_grants[0]
- Confidence: score diff vs #2 >10="high", 5-10="medium", <5="low"
- runner_up_grant: qualifying_grants[1].class_name
- runner_up_score: qualifying_grants[1].scores.total

## CRITICAL RULES
1. ONLY use grants from qualifying_grants array — never invent grants
2. Always select qualifying_grants[0] unless strong justification
3. Copy class_id and class_name EXACTLY from qualifying_grants data
4. Output must be valid JSON`;
}
