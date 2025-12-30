import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Edit2, Car, Loader2 } from "lucide-react";

import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  nickname?: string | null;
};

function normalizePlate(input: string) {
  // Keep letters/numbers only, remove dashes/spaces/symbols, uppercase.
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

const vehicleSchema = z.object({
  licensePlate: z
    .string()
    .min(2, "License plate is required")
    .transform((v) => normalizePlate(v)),
  make: z.string().min(2, "Make is required"),
  model: z.string().min(1, "Model is required"),
  color: z.string().min(3, "Color is required"),
  nickname: z.string().optional(),
});

export default function ResidentVehicles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // We keep unitId for compatibility with your existing login flow,
  // but Supabase persistence is keyed by building + unit.
  const [unitId, setUnitId] = useState<string | null>(null);
  const [buildingNumber, setBuildingNumber] = useState<string | null>(null);
  const [unitNumber, setUnitNumber] = useState<string | null>(null);
  const [unitLabel, setUnitLabel] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("unitId");
    const num = localStorage.getItem("unitNumber");
    const bldg = localStorage.getItem("buildingNumber");

    // Require building+unit for Supabase filters
    if (!id || !num || !bldg) {
      setLocation("/");
      return;
    }

    setUnitId(id);
    setUnitNumber(num);
    setBuildingNumber(bldg);
    setUnitLabel(`Bldg ${bldg} - Unit ${num}`);
  }, [setLocation]);

  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { licensePlate: "", make: "", model: "", color: "", nickname: "" },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isDialogOpen) return;

    if (editingVehicle) {
      form.reset({
        licensePlate: editingVehicle.licensePlate,
        make: editingVehicle.make,
        model: editingVehicle.model,
        color: editingVehicle.color,
        nickname: editingVehicle.nickname || "",
      });
    } else {
      form.reset({ licensePlate: "", make: "", model: "", color: "", nickname: "" });
    }
  }, [isDialogOpen, editingVehicle, form]);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles", buildingNumber, unitNumber],
    enabled: !!buildingNumber && !!unitNumber,
    queryFn: async (): Promise<Vehicle[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, license_plate, make, model, color, nickname, created_at")
        .eq("building", buildingNumber!)
        .eq("unit", unitNumber!)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((v: any) => ({
        id: v.id,
        licensePlate: v.license_plate,
        make: v.make ?? "",
        model: v.model ?? "",
        color: v.color ?? "",
        nickname: v.nickname ?? "",
      }));
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vehicleSchema>) => {
      const { error } = await supabase.from("vehicles").insert([
        {
          building: buildingNumber!,
          unit: unitNumber!,
          license_plate: data.licensePlate,
          make: data.make,
          model: data.model,
          color: data.color,
          nickname: data.nickname || null,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Vehicle Added" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Could not add vehicle",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vehicleSchema>) => {
      const { error } = await supabase
        .from("vehicles")
        .update({
          license_plate: data.licensePlate,
          make: data.make,
          model: data.model,
          color: data.color,
          nickname: data.nickname || null,
        })
        .eq("id", editingVehicle!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Vehicle Updated" });
      setIsDialogOpen(false);
      setEditingVehicle(null);
    },
    onError: (err: any) => {
      toast({
        title: "Could not update vehicle",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast({ title: "Vehicle Deleted" });
    },
    onError: (err: any) => {
      toast({
        title: "Could not delete vehicle",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof vehicleSchema>) => {
    if (editingVehicle) {
      updateMutation.mutate(data);
    } else {
      addMutation.mutate(data);
    }
  };

  if (!unitId) return null;

  return (
    <Layout userType="resident" userName={unitLabel || ""}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">My Vehicles</h1>
          <Button
            onClick={() => {
              setEditingVehicle(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make</FormLabel>
                        <FormControl>
                          <Input placeholder="Toyota" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="Camry" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="Silver" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Mom's Car" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-4">
                  <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending}>
                    {addMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Save Vehicle"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles?.map((vehicle) => (
              <Card key={vehicle.id} className="relative group hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start">
                    <span className="font-display tracking-wide">{vehicle.licensePlate}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this vehicle?")) {
                            deleteMutation.mutate(vehicle.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-secondary rounded-full">
                      <Car className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-sm text-muted-foreground">{vehicle.color}</div>
                    </div>
                  </div>
                  {vehicle.nickname && (
                    <div className="mt-2 text-xs font-medium bg-muted inline-block px-2 py-1 rounded">
                      {vehicle.nickname}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {vehicles?.length === 0 && (
              <div className="col-span-full py-12 text-center border-dashed border-2 rounded-lg text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No vehicles saved yet. Add one to get started.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
