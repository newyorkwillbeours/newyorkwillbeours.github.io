import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  races: defineTable({
    name: v.string(),
    players: v.array(v.number()),
    start: v.number(),
    revision: v.number(),
  }).index("by_name", ["name"]),
});
