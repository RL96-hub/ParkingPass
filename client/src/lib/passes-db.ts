// client/src/lib/passes-db.ts
import { supabase } from "@/lib/supabase";

/**
 * Backward-compatible exports expected by resident-dashboard.tsx:
 * - getPassesByUnit
 * - insertPass
 * - hasActivePass
 * - countFreePassesThisMonth
 *
 * Plus admin helpers:
 * - getAllPassesSupabase
 * - updatePassPaymentStatusSupabase
 */

export type VehicleSnapshot = {
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  nickname?: string | null;
};

export type PassRow = {
  id: string;
  unit_id: string;
  vehicle_id: string;

  vehicle_snapshot: VehicleSnapshot;

  created_at: string;
  expires_at: string;

  type: "free" | "paid" | "party";
  payment_status: "free" | "paid" | "payment_required" | "waived";
  price: number | null;
};

export type InsertPassInput = {
  unitId: string;
  vehicleId: string;
  vehicleSnapshot: VehicleSnapshot;
  expiresAt: string; // ISO string
  type: "free" | "paid" | "party";
  paymentStatus: "free" | "paid" | "payment_required" | "waived";
  price?: number | null;
};

// --------------------
// Resident functions
// --------------------

export async function getPassesByUnit(unitId: string): Promise<PassRow[]> {
  const { data, error } = await supabase
    .from("passes")
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PassRow[];
}

export async function insertPass(input: InsertPassInput): Promise<PassRow> {
  const payload = {
    unit_id: input.unitId,
    vehicle_id: input.vehicleId,
    vehicle_snapshot: input.vehicleSnapshot,
    expires_at: input.expiresAt,
    type: input.type,
    payment_status: input.paymentStatus,
    price: input.price ?? null,
  };

  const { data, error } = await supabase
    .from("passes")
    .insert(payload)
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .single();

  if (error) throw error;
  return data as PassRow;
}

export async function hasActivePass(unitId: string, vehicleId?: string): Promise<boolean> {
  const nowIso = new Date().toISOString();

  let q = supabase
    .from("passes")
    .select("id", { count: "exact", head: true })
    .eq("unit_id", unitId)
    .gt("expires_at", nowIso);

  if (vehicleId) q = q.eq("vehicle_id", vehicleId);

  const { error, count } = await q;
  if (error) throw error;

  return (count ?? 0) > 0;
}

/**
 * Counts how many FREE passes were created this month for a unit.
 * We count rows where:
 * - unit_id = unitId
 * - type = "free"   (or payment_status = "free" if your dashboard uses that)
 * - created_at within current month
 */
export async function countFreePassesThisMonth(unitId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  // We filter by type="free" (preferred).
  // If your schema uses payment_status="free" instead, we include OR logic.
  // Supabase doesn't support OR nicely with typed builder here, so we do one query.
  const { data, error } = await supabase
    .from("passes")
    .select("id, type, payment_status, created_at")
    .eq("unit_id", unitId)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (error) throw error;

  const rows = data ?? [];
  const count = rows.filter((r: any) => r.type === "free" || r.payment_status === "free").length;
  return count;
}

// --------------------
// Admin helpers
// --------------------

export async function getAllPassesSupabase(): Promise<PassRow[]> {
  const { data, error } = await supabase
    .from("passes")
    .select("id, unit_id, vehicle_id, vehicle_snapshot, created_at, expires_at, type, payment_status, price")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PassRow[];
}

export async function updatePassPaymentStatusSupabase(passId: string, status: "paid" | "waived") {
  const { error } = await supabase.from("passes").update({ payment_status: status }).eq("id", passId);
  if (error) throw error;
}
