import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(), 
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  currency: text("currency").default("IDR"),
  theme: text("theme").default("dark"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"), 
  name: text("name").notNull(),
  type: text("type").notNull(),
  icon: text("icon"),
  color: text("color"),
  isCustom: boolean("is_custom").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});


export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(), // Changed to UUID
  userId: uuid("user_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(), 
  amount: numeric("amount").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.id), // Changed to UUID
  description: text("description").notNull(),
  transactionDate: timestamp("transaction_date").notNull().defaultNow(),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  isSplit: boolean("is_split").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});


export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  amount: numeric("amount").notNull(),
  period: text("period").notNull(),
  alertThreshold: integer("alert_threshold").default(80),
  createdAt: timestamp("created_at").defaultNow(),
});

export const financialGoals = pgTable("financial_goals", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetAmount: numeric("target_amount").notNull(),
  currentAmount: numeric("current_amount").default("0"),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactionSplits = pgTable("transaction_splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  totalAmount: numeric("total_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const splitParticipants = pgTable("split_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  splitId: uuid("split_id").references(() => transactionSplits.id),
  name: text("name").notNull(),
  email: text("email"),
  amountOwed: numeric("amount_owed").notNull(),
  isPaid: boolean("is_paid").default(false),
});

export const recurringTransactions = pgTable("recurring_transactions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  type: text("type").notNull(),
  frequency: text("frequency").notNull(),
  nextOccurrence: date("next_occurrence").notNull(),
  isActive: boolean("is_active").default(true),
});

// FIX: Updated id to uuid to match the database
export const incomeSplitRules = pgTable("income_split_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  // New Allocation Logic Fields
  isTitheEnabled: boolean("is_tithe_enabled").default(false),
  tithePercentage: numeric("tithe_percentage").default("10"),
  tithePaymentMethodId: uuid("tithe_payment_method_id").references(() => paymentMethods.id),

  isSavingsEnabled: boolean("is_savings_enabled").default(false),
  savingsPercentage: numeric("savings_percentage").default("20"),
  
  // Savings Split (Core/Satellite)
  savingsCorePercentage: numeric("savings_core_percentage").default("90"),
  savingsSatellitePercentage: numeric("savings_satellite_percentage").default("10"),
  
  savingsCorePaymentMethodId: uuid("savings_core_payment_method_id").references(() => paymentMethods.id),
  savingsSatellitePaymentMethodId: uuid("savings_satellite_payment_method_id").references(() => paymentMethods.id),
});

export const incomeSplitAllocations = pgTable("income_split_allocations", {
  id: uuid("id").primaryKey().defaultRandom(), // Updated to uuid as likely
  ruleId: uuid("rule_id").references(() => incomeSplitRules.id), // Updated reference
  categoryId: integer("category_id").references(() => categories.id),
  percentage: numeric("percentage").notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod Schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const insertCategorySchema = createInsertSchema(categories);
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods);
export const insertTransactionSchema = createInsertSchema(transactions);
export const insertBudgetSchema = createInsertSchema(budgets);
export const insertFinancialGoalSchema = createInsertSchema(financialGoals);
export const insertTransactionSplitSchema = createInsertSchema(transactionSplits);
export const insertSplitParticipantSchema = createInsertSchema(splitParticipants);
export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactions);
export const insertIncomeSplitRuleSchema = createInsertSchema(incomeSplitRules);
export const insertIncomeSplitAllocationSchema = createInsertSchema(incomeSplitAllocations);
export const insertNotificationSchema = createInsertSchema(notifications);

// Types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export type FinancialGoal = typeof financialGoals.$inferSelect;
export type InsertFinancialGoal = z.infer<typeof insertFinancialGoalSchema>;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;