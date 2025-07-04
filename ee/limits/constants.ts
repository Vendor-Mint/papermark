// INFO: for numeric values,`null` means unlimited

export type TPlanLimits = {
  users: number;
  links: number | null;
  documents: number | null;
  domains: number;
  datarooms: number;
  customDomainOnPro: boolean;
  customDomainInDataroom: boolean;
  advancedLinkControlsOnPro: boolean | null;
  watermarkOnBusiness?: boolean | null;
};

// For self-hosted instances, enable custom domains for all plans
const isSelfHosted = process.env.NEXT_PUBLIC_IS_SELF_HOSTED === "true";

export const FREE_PLAN_LIMITS = {
  users: 1,
  links: 50,
  documents: 50,
  domains: isSelfHosted ? null : 0,
  datarooms: 0,
  customDomainOnPro: isSelfHosted ? true : false,
  customDomainInDataroom: isSelfHosted ? true : false,
  advancedLinkControlsOnPro: false,
};

export const PRO_PLAN_LIMITS = {
  users: 1,
  links: null,
  documents: 300,
  domains: isSelfHosted ? null : 0,
  datarooms: 0,
  customDomainOnPro: isSelfHosted ? true : false,
  customDomainInDataroom: isSelfHosted ? true : false,
  advancedLinkControlsOnPro: false,
};

export const BUSINESS_PLAN_LIMITS = {
  users: 3,
  links: null,
  documents: null,
  domains: isSelfHosted ? null : 5,
  datarooms: 100,
  customDomainOnPro: true,
  customDomainInDataroom: isSelfHosted ? true : false,
  advancedLinkControlsOnPro: false,
};

export const DATAROOMS_PLAN_LIMITS = {
  users: 3,
  links: null,
  documents: null,
  domains: isSelfHosted ? null : 10,
  datarooms: 100,
  customDomainOnPro: true,
  customDomainInDataroom: true,
  advancedLinkControlsOnPro: false,
};

export const DATAROOMS_PLUS_PLAN_LIMITS = {
  users: 5,
  links: null,
  documents: null,
  domains: isSelfHosted ? null : 1000,
  datarooms: 1000,
  customDomainOnPro: true,
  customDomainInDataroom: true,
  conversationsInDataroom: true,
  advancedLinkControlsOnPro: false,
};
