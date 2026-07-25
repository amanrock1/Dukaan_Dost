'use client';

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { InputArea } from "@/components/dashboard/InputArea";
import { InventoryTab } from "@/components/dashboard/InventoryTab";
import { SalesTab } from "@/components/dashboard/SalesTab";
import { PurchasesTab } from "@/components/dashboard/PurchasesTab";
import { InvoicesTab } from "@/components/dashboard/InvoicesTab";
import { AILogTab } from "@/components/dashboard/AILogTab";
import { Toaster, toast } from "sonner";
import { Package, ShoppingCart, ArrowDownRight, FileText, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
