import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";

const race = v.object({
  players: v.array(v.number()), start: v.number(), revision: v.number(),
});

export const get = query({
  args: {},
  returns: v.union(v.null(), race),
  handler: async (ctx) => {
    const row = await ctx.db.query("races").withIndex("by_name", q => q.eq("name", "main")).unique();
    return row ? { players: row.players, start: row.start, revision: row.revision } : null;
  },
});

// Joining the race is public. This mutation only appends; it cannot remove
// existing accounts or change the organizer's start date.
export const addPlayer = mutation({
  args: { accountId: v.number() },
  returns: race,
  handler: async (ctx, { accountId }) => {
    if (!Number.isInteger(accountId) || accountId < 1 || accountId > 4294967295) {
      throw new ConvexError("Enter a valid Steam account ID or SteamID64.");
    }
    const row = await ctx.db.query("races").withIndex("by_name", q => q.eq("name", "main")).unique();
    if (!row) throw new ConvexError("The shared race has not been initialized.");
    if (row.players.includes(accountId)) {
      return { players: row.players, start: row.start, revision: row.revision };
    }
    if (row.players.length >= 100) throw new ConvexError("The race is full. Contact an organizer.");
    const result = { players: [...row.players, accountId], start: row.start, revision: row.revision + 1 };
    await ctx.db.patch(row._id, result);
    return result;
  },
});

export const update = mutation({
  args: { key: v.string(), players: v.array(v.number()), start: v.number(), revision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const secret = process.env.RACE_ADMIN_KEY;
    if (!secret || args.key !== secret) throw new ConvexError("Invalid organizer key.");
    if (args.players.length > 100 || args.players.some(id => !Number.isInteger(id) || id < 1 || id > 4294967295)) {
      throw new ConvexError("Use up to 100 valid Steam account IDs.");
    }
    if (!Number.isSafeInteger(args.start) || args.start < 0 || args.start > 4102444800) {
      throw new ConvexError("Invalid race start date.");
    }
    const row = await ctx.db.query("races").withIndex("by_name", q => q.eq("name", "main")).unique();
    if (!row || row.revision !== args.revision) throw new ConvexError("Race changed. Wait for it to sync, then try again.");
    if (row.players.some(id => !args.players.includes(id))) {
      throw new ConvexError("Players can only be removed directly in the Convex dashboard.");
    }
    await ctx.db.patch(row._id, { players: [...new Set(args.players)], start: args.start, revision: row.revision + 1 });
    return null;
  },
});

// CLI-only initialization; never exposed to browsers.
export const initialize = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const row = await ctx.db.query("races").withIndex("by_name", q => q.eq("name", "main")).unique();
    if (!row) await ctx.db.insert("races", {
      name: "main", players: [147271596, 1092139390, 916636876, 146738314, 165563493],
      start: Math.floor(Date.now() / 86400000 - 7) * 86400, revision: 0,
    });
    return null;
  },
});
