import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * One-time seed: creates Legal + Co-Parent programs, then migrates
 * existing legalIntakeForms into client records.
 *
 * Run via: npx convex run seedPrograms:default
 * (This is an internalMutation so use: npx convex run --no-push seedPrograms:default)
 */
export default internalMutation({
  args: {},
  handler: async (ctx) => {
    // 1. Seed Legal program
    const legalId = await ctx.runMutation(internal.programs.seed, {
      name: "Legal Aid Program",
      type: "legal",
      description: "Free legal consultation for fathers",
      isActive: true,
    });
    console.log("Legal program:", legalId);

    // 2. Seed Co-Parent program
    const coparentId = await ctx.runMutation(internal.programs.seed, {
      name: "Co-Parent Counseling",
      type: "coparent",
      description: "Co-parenting skills and communication",
      isActive: true,
    });
    console.log("Co-Parent program:", coparentId);

    // 3. Migrate legal intake forms to client records
    const result = await ctx.runMutation(internal.legalIntake.internalMigrateToClients, {
      legalProgramId: legalId,
    });
    console.log("Migrated legal intakes:", result.migrated);

    return {
      legalProgramId: legalId,
      coparentProgramId: coparentId,
      migratedLegalIntakes: result.migrated,
    };
  },
});
