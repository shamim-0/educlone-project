export const COMPANY_TYPES = [
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "trading", label: "Trading" },
  { value: "services", label: "Services" },
  { value: "industrial_license", label: "Industrial License" },
  { value: "tga", label: "TGA" },
  { value: "after_licence", label: "After Licence" },
] as const;

export type CompanyTypeValue = (typeof COMPANY_TYPES)[number]["value"];

export const companyTypeLabel = (value?: string | null) =>
  COMPANY_TYPES.find((t) => t.value === value)?.label ?? (value ?? "—");
