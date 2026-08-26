import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-fitz.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-service-role-key";

const isMockEnv =
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY.includes("mock") ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock");

/**
 * In-Memory Mock Database for isolated testing and local sandbox verification.
 * Automatically active when real Supabase keys are omitted.
 */
class InMemorySupabaseStore {
  public companies: any[] = [];
  public clients: any[] = [];
  public checkins: any[] = [];
  public plans: any[] = [];
  public webhook_events: any[] = [];

  from(table: string) {
    if (!this[table as keyof InMemorySupabaseStore]) {
      (this as any)[table] = [];
    }
    return new MockTable(table, (this as any)[table]);
  }

  // Storage mock
  public storage = {
    from: (bucket: string) => ({
      createSignedUploadUrl: async (path: string) => ({
        data: {
          signedUrl: `https://mock-storage.supabase.co/${bucket}/${path}?token=mock_signed_token`,
          token: "mock_signed_token",
          path,
        },
        error: null,
      }),
      getPublicUrl: (path: string) => ({
        data: {
          publicUrl: `https://mock-storage.supabase.co/${bucket}/${path}`,
        },
      }),
    }),
  };
}

class MockTable {
  private filters: Array<(row: any) => boolean> = [];
  private orderField: string | null = null;
  private orderAsc = true;
  private limitCount: number | null = null;
  private pendingInsert: any = null;
  private pendingUpdate: any = null;
  private pendingDelete = false;
  private tableName: string;
  private tableData: any[];

  constructor(tableName: string, tableData: any[]) {
    this.tableName = tableName;
    this.tableData = tableData;
  }

  select(fields = "*") {
    return this;
  }

  eq(column: string, value: any) {
    if ((column === "company_id" || column === "whop_company_id") && typeof value === "string") {
      const cleanVal = value.replace(/^(comp_|biz_)/, "");
      this.filters.push((row) => {
        if (row[column] === value) return true;
        if (typeof row[column] === "string") {
          return row[column].replace(/^(comp_|biz_)/, "") === cleanVal;
        }
        return false;
      });
      return this;
    }
    this.filters.push((row) => row[column] === value);
    return this;
  }

  ilike(column: string, pattern: string) {
    const regex = new RegExp(pattern.replace(/%/g, ".*"), "i");
    this.filters.push((row) => typeof row[column] === "string" && regex.test(row[column]));
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  insert(recordOrRecords: any) {
    this.pendingInsert = recordOrRecords;
    return this;
  }

  update(updates: any) {
    this.pendingUpdate = updates;
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  private execute(): { data: any; error: any } {
    // 1. Handle Insert
    if (this.pendingInsert) {
      const records = Array.isArray(this.pendingInsert) ? this.pendingInsert : [this.pendingInsert];
      const inserted: any[] = [];

      for (const rec of records) {
        const nowIso = new Date().toISOString();
        const newRecord = {
          id: rec.id || `mock_uuid_${Math.random().toString(36).slice(2, 11)}`,
          created_at: rec.created_at || nowIso,
          joined_at: rec.joined_at || nowIso,
          ...rec,
        };

        if (this.tableName === "webhook_events" && rec.whop_event_id) {
          const dup = this.tableData.find((r) => r.whop_event_id === rec.whop_event_id);
          if (dup) {
            return { data: null, error: { message: "duplicate key (whop_event_id)" } };
          }
        }
        if (this.tableName === "companies" && rec.whop_company_id) {
          const dup = this.tableData.find((r) => r.whop_company_id === rec.whop_company_id);
          if (dup) {
            return { data: null, error: { message: "duplicate key (whop_company_id)" } };
          }
        }
        if (this.tableName === "clients" && rec.company_id && rec.whop_user_id) {
          const dup = this.tableData.find(
            (r) => r.company_id === rec.company_id && r.whop_user_id === rec.whop_user_id
          );
          if (dup) {
            return { data: null, error: { message: "duplicate key (company_id, whop_user_id)" } };
          }
        }

        this.tableData.push(newRecord);
        inserted.push(newRecord);
      }

      return {
        data: Array.isArray(this.pendingInsert) ? inserted : inserted[0],
        error: null,
      };
    }

    // 2. Handle Update
    if (this.pendingUpdate) {
      const matched = this.tableData.filter((row) => this.filters.every((f) => f(row)));
      for (const row of matched) {
        Object.assign(row, this.pendingUpdate);
      }
      return { data: matched, error: null };
    }

    // 3. Handle Delete
    if (this.pendingDelete) {
      const remaining: any[] = [];
      const deleted: any[] = [];
      for (const row of this.tableData) {
        if (this.filters.every((f) => f(row))) {
          deleted.push(row);
        } else {
          remaining.push(row);
        }
      }
      this.tableData.length = 0;
      this.tableData.push(...remaining);
      return { data: deleted, error: null };
    }

    // 4. Handle Select
    let result = this.tableData.filter((row) => this.filters.every((f) => f(row)));
    if (this.orderField) {
      result = [...result].sort((a, b) => {
        const valA = a[this.orderField!];
        const valB = b[this.orderField!];
        if (valA < valB) return this.orderAsc ? -1 : 1;
        if (valA > valB) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }
    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }
    return { data: result, error: null };
  }

  async then(resolve: (res: { data: any; error: any }) => void) {
    const res = this.execute();
    resolve(res);
  }

  async single() {
    const res = this.execute();
    if (res.error) return res;
    const array = Array.isArray(res.data) ? res.data : [res.data];
    if (array.length === 0 || array[0] == null) {
      return { data: null, error: { message: "Row not found", code: "PGRST116" } };
    }
    return { data: array[0], error: null };
  }

  async maybeSingle() {
    const res = this.execute();
    if (res.error) return res;
    const array = Array.isArray(res.data) ? res.data : [res.data];
    return { data: array[0] || null, error: null };
  }
}

// Preserve in-memory store on globalThis across Next.js dev server worker boundaries
const globalWithStore = globalThis as typeof globalThis & {
  __fitz_mock_supabase_store?: InMemorySupabaseStore;
};

export const mockStore =
  globalWithStore.__fitz_mock_supabase_store || (globalWithStore.__fitz_mock_supabase_store = new InMemorySupabaseStore());

export const supabaseAdmin = isMockEnv
  ? (mockStore as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
