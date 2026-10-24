"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, type CustomerLoginRequirements } from "@/lib/customer-login-requirements";

const CustomerLoginRequirementsContext = createContext<CustomerLoginRequirements>(DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS);

export function CustomerLoginRequirementsProvider({ initial, children }: { initial: CustomerLoginRequirements; children: React.ReactNode }) {
  return <CustomerLoginRequirementsContext.Provider value={initial}>{children}</CustomerLoginRequirementsContext.Provider>;
}

export function useCustomerLoginRequirements() {
  return useContext(CustomerLoginRequirementsContext);
}
