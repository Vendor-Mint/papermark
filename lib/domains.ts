import {
  DomainConfigResponse,
  DomainResponse,
  DomainVerificationResponse,
} from "@/lib/types";

export const validDomainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$/;

export const getApexDomain = (url: string): string => {
  let domain;
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    domain = url;
  }
  const parts = domain.split(".");
  if (parts.length > 2) {
    // Handle special cases like co.uk, com.br, etc.
    if (parts[parts.length - 2].length <= 3 && parts[parts.length - 1].length <= 3) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  }
  return domain;
};

export const getSubdomain = (name: string, apexName: string): string | null => {
  if (name === apexName) return null;
  return name.slice(0, name.length - apexName.length - 1);
};

export const addDomain = async (domain: string): Promise<{ success: boolean; verified?: boolean; error?: string }> => {
  try {
    // Make API call to verify domain
    const response = await fetch(`/api/domains/verify?domain=${encodeURIComponent(domain)}`);
    const data = await response.json();
    
    return { 
      success: true,
      verified: data.verified
    };
  } catch (error) {
    console.error('Error adding domain:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const removeDomain = async (domain: string): Promise<{ success: boolean }> => {
  return { success: true };
};

export const getDomainResponse = async (
  domain: string
): Promise<DomainResponse & { error: { code: string; message: string } }> => {
  try {
    // Make API call to verify domain
    const response = await fetch(`/api/domains/verify?domain=${encodeURIComponent(domain)}`);
    const data = await response.json();
    const apexName = getApexDomain(domain);
    
    return {
      name: domain,
      apexName,
      verified: data.verified,
      verification: [],
      projectId: 'self-hosted',
      error: {
        code: data.verified ? 'verified' : 'pending_verification',
        message: data.verified ? 'Domain verified' : 'Domain verification pending'
      }
    };
  } catch (error) {
    return {
      name: domain,
      apexName: getApexDomain(domain),
      verified: false,
      verification: [],
      projectId: 'self-hosted',
      error: {
        code: 'verification_failed',
        message: error instanceof Error ? error.message : 'Domain verification failed'
      }
    };
  }
};

export const getConfigResponse = async (
  domain: string,
): Promise<DomainConfigResponse> => {
  const isSelfHosted = process.env.NEXT_PUBLIC_IS_SELF_HOSTED === "true";
  
  // For self-hosted instances, return basic configuration
  if (isSelfHosted) {
    return {
      configuredBy: "A",
      acceptedChallenges: ["dns-01"],
      misconfigured: false,
      conflicts: []
    };
  }

  // For non-self-hosted, implement proper configuration check
  return {
    configuredBy: "A",
    acceptedChallenges: ["dns-01"],
    misconfigured: true,
    conflicts: []
  };
};
