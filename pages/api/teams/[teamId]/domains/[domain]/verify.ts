import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { getApexDomain } from "@/lib/domains";
import prisma from "@/lib/prisma";
import { DomainVerificationStatusProps } from "@/lib/types";
import { log } from "@/lib/utils";
import { authOptions } from "../../../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // GET /api/teams/:teamId/domains/[domain]/verify - get domain verification status
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { domain } = req.query as { domain: string };
    let status: DomainVerificationStatusProps = "Valid Configuration";

    try {
      // Call our domain verification API
      const verifyResponse = await fetch(
        `${process.env.NEXTAUTH_URL}/api/domains/verify?domain=${encodeURIComponent(domain)}&checkOwnership=true`
      );
      const verifyData = await verifyResponse.json();

      // Get current domain status from database
      const currentDomain = await prisma.domain.findUnique({
        where: { slug: domain },
        select: { verified: true },
      });

      if (!currentDomain) {
        return res.status(404).json({
          status: "Domain Not Found",
          response: {
            domainJson: { error: { code: "not_found", message: "Domain not found" } },
            configJson: { misconfigured: true, conflicts: [] }
          }
        });
      }

      if (!verifyData.verified) {
        status = "Pending Verification";
        
        // Update domain status in database
        await prisma.domain.update({
          where: { slug: domain },
          data: { 
            verified: false,
            lastChecked: new Date()
          }
        });

        return res.status(200).json({
          status,
          response: {
            domainJson: {
              name: domain,
              apexName: getApexDomain(domain),
              verified: false,
              verification: [{
                type: "TXT",
                domain: domain,
                value: verifyData.verificationToken,
                reason: "Domain ownership verification required"
              }],
              error: {
                code: "pending_verification",
                message: verifyData.error || "Domain verification pending"
              }
            },
            configJson: {
              misconfigured: true,
              conflicts: [],
              acceptedChallenges: ["dns-01"]
            }
          }
        });
      }

      // Domain is verified
      if (!currentDomain.verified) {
        await prisma.domain.update({
          where: { slug: domain },
          data: { 
            verified: true,
            lastChecked: new Date()
          }
        });
      }

      return res.status(200).json({
        status: "Valid Configuration",
        response: {
          domainJson: {
            name: domain,
            apexName: getApexDomain(domain),
            verified: true,
            verification: [],
            error: { code: "verified", message: "Domain verified" }
          },
          configJson: {
            misconfigured: false,
            conflicts: [],
            acceptedChallenges: ["dns-01"]
          }
        }
      });

    } catch (error) {
      log({
        message: `Failed to verify domain: _${domain}_. \n\n ${error}`,
        type: "error",
        mention: true,
      });

      return res.status(200).json({
        status: "Unknown Error",
        response: {
          domainJson: {
            error: {
              code: "verification_error",
              message: error instanceof Error ? error.message : "Failed to verify domain"
            }
          },
          configJson: {
            misconfigured: true,
            conflicts: []
          }
        }
      });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
