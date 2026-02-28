/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiDirector from "../aiDirector.js";
import type * as aiDirectorActions from "../aiDirectorActions.js";
import type * as aiDirectorInternal from "../aiDirectorInternal.js";
import type * as alerts from "../alerts.js";
import type * as allocation from "../allocation.js";
import type * as allocationActions from "../allocationActions.js";
import type * as allocationInternal from "../allocationInternal.js";
import type * as allocationTypes from "../allocationTypes.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as clientGoals from "../clientGoals.js";
import type * as clients from "../clients.js";
import type * as constantContact from "../constantContact.js";
import type * as constantContactActions from "../constantContactActions.js";
import type * as constantContactInternal from "../constantContactInternal.js";
import type * as coparentIntake from "../coparentIntake.js";
import type * as crons from "../crons.js";
import type * as dashboardPrefs from "../dashboardPrefs.js";
import type * as debug from "../debug.js";
import type * as expenseActions from "../expenseActions.js";
import type * as googleCalendar from "../googleCalendar.js";
import type * as googleCalendarActions from "../googleCalendarActions.js";
import type * as googleCalendarInternal from "../googleCalendarInternal.js";
import type * as googleCalendarSync from "../googleCalendarSync.js";
import type * as googleSheets from "../googleSheets.js";
import type * as googleSheetsActions from "../googleSheetsActions.js";
import type * as googleSheetsInternal from "../googleSheetsInternal.js";
import type * as googleSheetsSync from "../googleSheetsSync.js";
import type * as grants from "../grants.js";
import type * as grantsInternal from "../grantsInternal.js";
import type * as http from "../http.js";
import type * as knowledgeBase from "../knowledgeBase.js";
import type * as knowledgeBaseActions from "../knowledgeBaseActions.js";
import type * as legalIntake from "../legalIntake.js";
import type * as newsletterActions from "../newsletterActions.js";
import type * as newsletterTemplate from "../newsletterTemplate.js";
import type * as newsletters from "../newsletters.js";
import type * as openaiHelpers from "../openaiHelpers.js";
import type * as programs from "../programs.js";
import type * as quickbooks from "../quickbooks.js";
import type * as quickbooksActions from "../quickbooksActions.js";
import type * as quickbooksInternal from "../quickbooksInternal.js";
import type * as quickbooksSync from "../quickbooksSync.js";
import type * as seedPrograms from "../seedPrograms.js";
import type * as sessions from "../sessions.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiDirector: typeof aiDirector;
  aiDirectorActions: typeof aiDirectorActions;
  aiDirectorInternal: typeof aiDirectorInternal;
  alerts: typeof alerts;
  allocation: typeof allocation;
  allocationActions: typeof allocationActions;
  allocationInternal: typeof allocationInternal;
  allocationTypes: typeof allocationTypes;
  auditLog: typeof auditLog;
  auth: typeof auth;
  clientGoals: typeof clientGoals;
  clients: typeof clients;
  constantContact: typeof constantContact;
  constantContactActions: typeof constantContactActions;
  constantContactInternal: typeof constantContactInternal;
  coparentIntake: typeof coparentIntake;
  crons: typeof crons;
  dashboardPrefs: typeof dashboardPrefs;
  debug: typeof debug;
  expenseActions: typeof expenseActions;
  googleCalendar: typeof googleCalendar;
  googleCalendarActions: typeof googleCalendarActions;
  googleCalendarInternal: typeof googleCalendarInternal;
  googleCalendarSync: typeof googleCalendarSync;
  googleSheets: typeof googleSheets;
  googleSheetsActions: typeof googleSheetsActions;
  googleSheetsInternal: typeof googleSheetsInternal;
  googleSheetsSync: typeof googleSheetsSync;
  grants: typeof grants;
  grantsInternal: typeof grantsInternal;
  http: typeof http;
  knowledgeBase: typeof knowledgeBase;
  knowledgeBaseActions: typeof knowledgeBaseActions;
  legalIntake: typeof legalIntake;
  newsletterActions: typeof newsletterActions;
  newsletterTemplate: typeof newsletterTemplate;
  newsletters: typeof newsletters;
  openaiHelpers: typeof openaiHelpers;
  programs: typeof programs;
  quickbooks: typeof quickbooks;
  quickbooksActions: typeof quickbooksActions;
  quickbooksInternal: typeof quickbooksInternal;
  quickbooksSync: typeof quickbooksSync;
  seedPrograms: typeof seedPrograms;
  sessions: typeof sessions;
  settings: typeof settings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
