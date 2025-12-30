import { addHours, isAfter, isBefore, startOfMonth, endOfMonth, parseISO, startOfDay, isSameDay, format } from "date-fns";

// --- Types ---

export interface Building {
  id: string;
  number: string;
  name?: string;
}

export interface Unit {
  id: string;
  buildingId: string;
  number: string;
  accessCode: string;
  freePassLimit: number;
  partyDays: string[]; // ISO date strings (YYYY-MM-DD) representing days used as party days
}

export interface Vehicle {
  id: string;
  unitId: string;
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  nickname?: string;
}

export type PassStatus = "active" | "expired";
export type PaymentStatus = "free" | "paid" | "payment_required" | "waived";

export interface Pass {
  id: string;
  unitId: string;
  vehicleId: string;
  vehicleSnapshot: {
    licensePlate: string;
    make: string;
    model: string;
    color: string;
    nickname?: string;
  };
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  type: "free" | "paid" | "party";
  paymentStatus: PaymentStatus;
  price?: number;
}

export interface AdminSettings {
  pricePerPass: number;
  partyPassLimit: number;
}

// --- Initial Data ---

const INITIAL_SETTINGS: AdminSettings = {
  pricePerPass: 5.00,
  partyPassLimit: 3
};

// 1. Create 10 Buildings
const INITIAL_BUILDINGS: Building[] = Array.from({ length: 10 }, (_, i) => ({
  id: `b${i + 1}`,
  number: String(i + 1),
  name: `Building ${i + 1}`
}));

// 2. Create at least 1 unit per building
const INITIAL_UNITS: Unit[] = INITIAL_BUILDINGS.map((building, i) => ({
  id: `u${i + 1}`,
  buildingId: building.id,
  number: "101",
  accessCode: "1234",
  freePassLimit: 12,
  partyDays: []
}));

// Add a few extra units for variety in Building 1
INITIAL_UNITS.push({ id: "u102", buildingId: "b1", number: "102", accessCode: "5678", freePassLimit: 12, partyDays: [] });
INITIAL_UNITS.push({ id: "u103", buildingId: "b1", number: "103", accessCode: "9012", freePassLimit: 12, partyDays: [] });

const INITIAL_VEHICLES: Vehicle[] = [
  { id: "v1", unitId: "u1", licensePlate: "ABC-123", make: "Toyota", model: "Camry", color: "Silver", nickname: "Mom's Car" },
  { id: "v2", unitId: "u1", licensePlate: "XYZ-999", make: "Honda", model: "Civic", color: "Black" },
];

const INITIAL_PASSES: Pass[] = [
  {
    id: "p1",
    unitId: "u1",
    vehicleId: "v1",
    vehicleSnapshot: { licensePlate: "ABC-123", make: "Toyota", model: "Camry", color: "Silver", nickname: "Mom's Car" },
    createdAt: new Date().toISOString(),
    expiresAt: addHours(new Date(), 24).toISOString(),
    type: "free",
    paymentStatus: "free",
  },
];

// --- Store ---

let settings = { ...INITIAL_SETTINGS };
let buildings = [...INITIAL_BUILDINGS];
let units = [...INITIAL_UNITS];
let vehicles = [...INITIAL_VEHICLES];
let passes = [...INITIAL_PASSES];

// --- API Functions ---

export const api = {
  // Auth
  loginResident: async (buildingNumber: string, unitNumber: string, accessCode: string): Promise<(Unit & { buildingNumber: string }) | null> => {
    await delay(500);
    const building = buildings.find(b => b.number === buildingNumber);
    if (!building) return null;

    const unit = units.find(u => u.buildingId === building.id && u.number === unitNumber && u.accessCode === accessCode);
    if (!unit) return null;

    return { ...unit, buildingNumber: building.number };
  },

  loginAdmin: async (password: string): Promise<boolean> => {
    await delay(500);
    return password === "admin123";
  },

  // Settings
  getSettings: async (): Promise<AdminSettings> => {
    await delay(200);
    return { ...settings };
  },

  updateSettings: async (newSettings: Partial<AdminSettings>): Promise<AdminSettings> => {
    await delay(200);
    settings = { ...settings, ...newSettings };
    return { ...settings };
  },

  // Buildings
  getBuildings: async (): Promise<Building[]> => {
    await delay(300);
    return [...buildings].sort((a, b) => Number(a.number) - Number(b.number));
  },

  addBuilding: async (data: Omit<Building, "id">): Promise<Building> => {
    await delay(300);
    const exists = buildings.some(b => b.number === data.number);
    if (exists) throw new Error("Building number already exists");
    
    const newBuilding = { ...data, id: Math.random().toString(36).substr(2, 9) };
    buildings.push(newBuilding);
    return newBuilding;
  },

  deleteBuilding: async (id: string): Promise<void> => {
    await delay(300);
    const hasUnits = units.some(u => u.buildingId === id);
    if (hasUnits) throw new Error("Cannot delete building with existing units. Remove units first.");
    buildings = buildings.filter(b => b.id !== id);
  },

  // Units
  getUnits: async (): Promise<(Unit & { buildingNumber: string })[]> => {
    await delay(300);
    return units.map(u => {
      const b = buildings.find(b => b.id === u.buildingId);
      return { ...u, buildingNumber: b?.number || "?" };
    });
  },

  getUnit: async (id: string): Promise<Unit | undefined> => {
    await delay(200);
    return units.find(u => u.id === id);
  },

  addUnit: async (data: Omit<Unit, "id" | "partyDays">): Promise<Unit> => {
    await delay(300);
    if (data.accessCode.length < 4 || data.accessCode.length > 10) {
      throw new Error("Access code must be between 4 and 10 characters.");
    }

    const exists = units.some(u => u.buildingId === data.buildingId && u.number === data.number);
    if (exists) throw new Error("Unit already exists in this building");

    const newUnit: Unit = { ...data, id: Math.random().toString(36).substr(2, 9), partyDays: [] };
    units.push(newUnit);
    return newUnit;
  },

  updateUnit: async (id: string, updates: Partial<Unit>): Promise<Unit> => {
    await delay(300);
    if (updates.accessCode && (updates.accessCode.length < 4 || updates.accessCode.length > 10)) {
      throw new Error("Access code must be between 4 and 10 characters.");
    }

    const index = units.findIndex(u => u.id === id);
    if (index === -1) throw new Error("Unit not found");
    units[index] = { ...units[index], ...updates };
    return units[index];
  },

  deleteUnit: async (id: string): Promise<void> => {
    await delay(300);
    units = units.filter(u => u.id !== id);
    vehicles = vehicles.filter(v => v.unitId !== id);
    passes = passes.filter(p => p.unitId !== id);
  },

  importData: async (csvContent: string): Promise<{ created: number, updated: number, skipped: number, errors: string[] }> => {
    await delay(1000);
    const lines = csvContent.split("\n");
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    // Header check (simple)
    const header = lines[0].toLowerCase();
    if (!header.includes("building") || !header.includes("unit") || !header.includes("access")) {
       throw new Error("Invalid CSV header. Must contain Building, Unit, AccessCode");
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(",").map(p => p.trim());
        if (parts.length < 3) {
            skipped++;
            errors.push(`Line ${i+1}: Insufficient columns`);
            continue;
        }

        const [bNum, uNum, code] = parts;

        // Validation
        if (!bNum || !uNum || !code) {
             skipped++;
             errors.push(`Line ${i+1}: Missing fields`);
             continue;
        }
        if (code.length < 4 || code.length > 10) {
            skipped++;
            errors.push(`Line ${i+1}: Access code must be 4-10 chars (Unit ${uNum})`);
            continue;
        }

        // Find/Create Building
        let building = buildings.find(b => b.number === bNum);
        if (!building) {
            building = { id: Math.random().toString(36).substr(2, 9), number: bNum, name: `Building ${bNum}` };
            buildings.push(building);
        }

        // Upsert Unit
        const existingUnitIndex = units.findIndex(u => u.buildingId === building!.id && u.number === uNum);
        if (existingUnitIndex !== -1) {
            units[existingUnitIndex] = { ...units[existingUnitIndex], accessCode: code };
            updated++;
        } else {
            units.push({
                id: Math.random().toString(36).substr(2, 9),
                buildingId: building.id,
                number: uNum,
                accessCode: code,
                freePassLimit: 12,
                partyDays: []
            });
            created++;
        }
    }

    return { created, updated, skipped, errors };
  },
  
  // Vehicles
  getVehicles: async (unitId: string): Promise<Vehicle[]> => {
    await delay(300);
    return vehicles.filter(v => v.unitId === unitId);
  },

  addVehicle: async (unitId: string, data: Omit<Vehicle, "id" | "unitId">): Promise<Vehicle> => {
    await delay(300);
    const newVehicle = { ...data, id: Math.random().toString(36).substr(2, 9), unitId };
    vehicles.push(newVehicle);
    return newVehicle;
  },

  updateVehicle: async (id: string, data: Partial<Vehicle>): Promise<Vehicle> => {
    await delay(300);
    const index = vehicles.findIndex(v => v.id === id);
    if (index === -1) throw new Error("Vehicle not found");
    vehicles[index] = { ...vehicles[index], ...data };
    return vehicles[index];
  },

  deleteVehicle: async (id: string): Promise<void> => {
    await delay(300);
    vehicles = vehicles.filter(v => v.id !== id);
  },

  // Passes
  getUnitPasses: async (unitId: string): Promise<Pass[]> => {
    await delay(300);
    return passes.filter(p => p.unitId === unitId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getAllPasses: async (): Promise<Pass[]> => {
    await delay(300);
    return [...passes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createPass: async (unitId: string, vehicleId: string, isPartyPass: boolean = false): Promise<Pass> => {
    await delay(500);
    
    // 1. Check if vehicle exists
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    // 2. Check for active pass
    const activePass = passes.find(p => 
      p.vehicleId === vehicleId && 
      isAfter(parseISO(p.expiresAt), new Date())
    );
    
    if (activePass) {
      throw new Error(`This vehicle already has an active pass expiring at ${new Date(activePass.expiresAt).toLocaleTimeString()}`);
    }

    // 3. Logic Check
    const unitIndex = units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) throw new Error("Unit not found");
    let unit = units[unitIndex];

    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let finalType: "free" | "paid" | "party" = "free";
    let finalPaymentStatus: PaymentStatus = "free";
    let finalPrice = 0;

    // Check if today is already a party day
    const isTodayPartyDay = unit.partyDays.includes(todayStr);

    if (isPartyPass) {
       // Requesting a NEW Party Pass
       if (isTodayPartyDay) {
           // Already active, just proceed as party pass (free)
           finalType = "party";
           finalPaymentStatus = "free";
       } else {
           // Check limit
           const currentMonthPartyDays = unit.partyDays.filter(d => {
               const date = parseISO(d);
               return isAfter(date, monthStart) && isBefore(date, monthEnd) || isSameDay(date, monthStart) || isSameDay(date, monthEnd);
           }).length;

           if (currentMonthPartyDays >= settings.partyPassLimit) {
               throw new Error(`Party pass limit (${settings.partyPassLimit}) reached for this month.`);
           }

           // Consume party day
           unit.partyDays.push(todayStr);
           units[unitIndex] = unit; // Save
           finalType = "party";
           finalPaymentStatus = "free";
       }
    } else {
       // Regular Pass Logic
       if (isTodayPartyDay) {
           // It's a party day, so this pass is free regardless of limit
           finalType = "free";
           finalPaymentStatus = "free";
       } else {
           // Normal check
           const passesThisMonth = passes.filter(p => 
             p.unitId === unitId && 
             isAfter(parseISO(p.createdAt), monthStart) && 
             isBefore(parseISO(p.createdAt), monthEnd) &&
             (p.type === "free") // Only count free regular passes against limit
           ).length;

           if (passesThisMonth < unit.freePassLimit) {
               finalType = "free";
               finalPaymentStatus = "free";
           } else {
               finalType = "paid";
               finalPaymentStatus = "payment_required";
               finalPrice = settings.pricePerPass;
           }
       }
    }

    const newPass: Pass = {
      id: Math.random().toString(36).substr(2, 9),
      unitId,
      vehicleId,
      vehicleSnapshot: {
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        nickname: vehicle.nickname
      },
      createdAt: now.toISOString(),
      expiresAt: addHours(now, 24).toISOString(),
      type: finalType,
      paymentStatus: finalPaymentStatus,
      price: finalPrice > 0 ? finalPrice : undefined
    };

    passes.unshift(newPass);
    return newPass;
  },

  updatePassPaymentStatus: async (passId: string, status: PaymentStatus): Promise<Pass> => {
    await delay(300);
    const index = passes.findIndex(p => p.id === passId);
    if (index === -1) throw new Error("Pass not found");
    
    passes[index] = { ...passes[index], paymentStatus: status };
    return passes[index];
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
