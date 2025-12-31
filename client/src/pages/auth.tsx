import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, KeyRound, Shield, ArrowRight, Loader2, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import generatedImage from '@assets/generated_images/minimalist_architectural_abstract_background_in_blue_and_white.png';

const residentSchema = z.object({
  buildingNumber: z.string().min(1, "Building number is required"),
  unitNumber: z.string().min(1, "Unit number is required"),
  accessCode: z.string().min(4, "Access code must be at least 4 characters"),
});

const adminSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const residentForm = useForm<z.infer<typeof residentSchema>>({
    resolver: zodResolver(residentSchema),
    defaultValues: { buildingNumber: "", unitNumber: "", accessCode: "" },
  });

  const adminForm = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: { password: "" },
  });

  const onResidentSubmit = async (data: z.infer<typeof residentSchema>) => {
  setIsLoading(true);
  try {
    // Find building by number
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("id, number")
      .eq("number", data.buildingNumber)
      .single();

    if (buildingError || !building) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid building, unit, or access code",
      });
      return;
    }

    // Find unit by building + unit number + access code
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("id, number, access_code, building_id")
      .eq("building_id", building.id)
      .eq("number", data.unitNumber)
      .eq("access_code", data.accessCode)
      .single();

    if (unitError || !unit) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid building, unit, or access code",
      });
      return;
    }

    localStorage.setItem("userType", "resident");
    localStorage.setItem("unitId", unit.id);
    localStorage.setItem("unitNumber", unit.number);
    localStorage.setItem("buildingNumber", String(building.number));

    toast({
      title: "Welcome back",
      description: `Logged in as Building ${building.number}, Unit ${unit.number}`,
    });

    setLocation("/dashboard");
  } catch (error) {
    toast({ variant: "destructive", title: "Error", description: "Something went wrong" });
  } finally {
    setIsLoading(false);
  }
};

  const onAdminSubmit = async (data: z.infer<typeof adminSchema>) => {
  setIsLoading(true);
  try {
    // Pull admin password from DB settings table
    const { data: settings, error } = await supabase
      .from("settings")
      .select("admin_password")
      .single();

    if (error || !settings?.admin_password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Admin login is not configured in the database",
      });
      return;
    }

    const success = data.password === settings.admin_password;

    if (success) {
      localStorage.setItem("userType", "admin");
      toast({ title: "Admin Access Granted", description: "Welcome, Administrator" });
      setLocation("/admin");
    } else {
      toast({ variant: "destructive", title: "Access Denied", description: "Invalid password" });
    }
  } catch (error) {
    toast({ variant: "destructive", title: "Error", description: "Something went wrong" });
  } finally {
    setIsLoading(false);
  }
};

  const Branding = () => (
    <div className="flex flex-col">
      <h1 className="text-3xl font-display font-bold tracking-tight uppercase">Promenade Shores</h1>
      <span className="text-sm font-medium tracking-[0.2em] text-primary/80 uppercase">At Doral</span>
    </div>
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-primary/5 text-primary-foreground">
        <div className="absolute inset-0 z-0">
           <img src={generatedImage} alt="Background" className="w-full h-full object-cover opacity-100" />
           <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
        </div>
        
        <div className="relative z-10 text-white">
          <Branding />
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold mb-4 font-display text-white">Secure Visitor Management</h1>
          <p className="text-lg text-blue-100">
            Effortlessly manage guest parking passes for your residence. Request passes, track history, and manage your vehicles all in one place.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center justify-center mb-8 text-primary">
            <Branding />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to manage parking passes</p>
          </div>

          <Tabs defaultValue="resident" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="resident">Resident</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="resident">
              <Card className="border-none shadow-none">
                <CardContent className="p-0">
                  <Form {...residentForm}>
                    <form onSubmit={residentForm.handleSubmit(onResidentSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={residentForm.control}
                          name="buildingNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Building #</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="1" className="pl-9" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={residentForm.control}
                          name="unitNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit #</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="101" className="pl-9" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={residentForm.control}
                        name="accessCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Access Code</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input type="password" placeholder="••••" className="pl-9" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    <p>Demo: Building <strong>1</strong> / Unit <strong>101</strong> / Code: <strong>1234</strong></p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <Card className="border-none shadow-none">
                <CardContent className="p-0">
                  <Form {...adminForm}>
                    <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                      <FormField
                        control={adminForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admin Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input type="password" placeholder="••••••••" className="pl-9" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" variant="secondary" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Access Admin Panel"}
                      </Button>
                    </form>
                  </Form>
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    <p>Demo Admin Password: <strong>admin123</strong></p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
