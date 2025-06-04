import { NextApiRequest, NextApiResponse } from "next";
import dns from 'dns';
import { promisify } from 'util';
import { getApexDomain } from "@/lib/domains";
import crypto from 'crypto';

const resolveCname = promisify(dns.resolveCname);
const resolveA = promisify(dns.resolve4);
const resolveTxt = promisify(dns.resolveTxt);

// Generate a verification token for a domain
function generateVerificationToken(domain: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'default-secret';
  return `papermark-verify=${crypto.createHash('sha256').update(`${domain}-${secret}`).digest('hex')}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { domain, checkOwnership } = req.query;
  
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const serverHostname = process.env.NEXT_PUBLIC_APP_HOSTNAME;
  const serverIP = process.env.NEXT_PUBLIC_APP_IP;
  
  if (!serverHostname || !serverIP) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  try {
    const apexDomain = getApexDomain(domain);
    
    // If checking ownership, verify TXT record
    if (checkOwnership === 'true') {
      const expectedToken = generateVerificationToken(domain);
      try {
        const txtRecords = await resolveTxt(apexDomain);
        const hasVerificationRecord = txtRecords.some(records => 
          records.some(record => record === expectedToken)
        );
        
        if (!hasVerificationRecord) {
          return res.json({ 
            verified: false, 
            error: 'Domain ownership not verified',
            verificationToken: expectedToken 
          });
        }
      } catch (error) {
        return res.json({ 
          verified: false, 
          error: 'Could not verify domain ownership',
          verificationToken: expectedToken 
        });
      }
    }

    // Verify DNS configuration
    const isSubdomain = domain !== apexDomain;
    if (isSubdomain) {
      // For subdomains, verify CNAME record
      const cnameRecords = await resolveCname(domain);
      const isVerified = cnameRecords.some(record => 
        record === serverHostname || 
        record === serverHostname.replace(/^https?:\/\//, '')
      );
      return res.json({ verified: isVerified });
    } else {
      // For apex domains, verify A record
      const aRecords = await resolveA(domain);
      const isVerified = aRecords.includes(serverIP);
      return res.json({ verified: isVerified });
    }
  } catch (error) {
    console.error('DNS verification error:', error);
    if (error instanceof Error && error.message.includes('ENOTFOUND')) {
      return res.json({ verified: false, error: 'DNS records not found' });
    }
    return res.json({ verified: false, error: 'DNS verification failed' });
  }
} 