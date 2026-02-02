import { type UserProfile, type InsertUserProfile } from "@shared/schema";

// Since we use Supabase, this internal storage interface is largely unused 
// but kept for compatibility with the project structure templates.
// The frontend communicates directly with Supabase.

export interface IStorage {
  getUser(id: string): Promise<UserProfile | undefined>;
  createUser(user: InsertUserProfile): Promise<UserProfile>;
}

export class MemStorage implements IStorage {
  private users: Map<string, UserProfile>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<UserProfile | undefined> {
    return this.users.get(id);
  }

  async createUser(insertUser: InsertUserProfile): Promise<UserProfile> {
    const id = insertUser.id || "uuid-placeholder"; // In reality, Supabase handles IDs
    const user: UserProfile = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      currency: "IDR",
      theme: "dark",
      email: insertUser.email || null,
      fullName: insertUser.fullName || null,
      avatarUrl: insertUser.avatarUrl || null
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
