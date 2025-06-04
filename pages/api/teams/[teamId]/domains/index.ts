import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth/next";

import { addDomain, validDomainRegex } from "@/lib/domains";
import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { getTeamWithDomain } from "@/lib/team/helper";
import { CustomUser } from "@/lib/types";
import { log } from "@/lib/utils";

import { authOptions } from "../../../auth/[...nextauth]";

async function verifyDomainDNS(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/domains/verify?domain=${encodeURIComponent(domain)}`);
    const data = await response.json();
    return data.verified;
  } catch (error) {
    console.error('Error verifying domain:', error);
    return false;
  }
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/domains
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId } = req.query as { teamId: string };

    const userId = (session.user as CustomUser).id;

    try {
      const { team } = await getTeamWithDomain({
        teamId,
        userId,
        options: {
          select: {
            slug: true,
            verified: true,
            isDefault: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      });

      // Verify all domains
      const domains = await Promise.all(
        team.domains.map(async (domain: any) => {
          if (!domain.verified) {
            const isVerified = await verifyDomainDNS(domain.slug);
            if (isVerified) {
              await prisma.domain.update({
                where: { id: domain.id },
                data: { verified: true }
              });
              domain.verified = true;
            }
          }
          return domain;
        })
      );

      return res.status(200).json(domains);
    } catch (error) {
      errorhandler(error, res);
    }
  } else if (req.method === "POST") {
    // POST /api/teams/:teamId/domains
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      res.status(401).end("Unauthorized");
      return;
    }

    const userId = (session.user as CustomUser).id;
    const { teamId } = req.query as { teamId: string };

    if (!teamId) {
      return res.status(401).json("Unauthorized");
    }

    try {
      await getTeamWithDomain({
        teamId,
        userId,
      });

      // Assuming data is an object with `domain` properties
      const { domain } = req.body;

      // Sanitize domain by removing whitespace, protocol, and paths
      const sanitizedDomain = domain
        .trim()
        .toLowerCase()
        .replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
        .split("/")[0];

      // Validate domain format
      if (!validDomainRegex.test(sanitizedDomain)) {
        return res.status(422).json({ message: "Invalid domain format" });
      }

      // Check if domain contains papermark
      if (sanitizedDomain.toLowerCase().includes("papermark")) {
        return res
          .status(400)
          .json({ message: "Domain cannot contain 'papermark'" });
      }

      // Check if domain already exists
      const existingDomain = await prisma.domain.findFirst({
        where: {
          slug: sanitizedDomain,
        },
      });

      if (existingDomain) {
        return res.status(400).json({ message: "Domain already exists" });
      }

      // Try to verify the domain first
      const isVerified = await verifyDomainDNS(sanitizedDomain);

      // Create domain record
      const response = await prisma.domain.create({
        data: {
          slug: sanitizedDomain,
          userId,
          teamId,
          verified: isVerified,
        },
      });

      // Add domain to DNS verification system
      await addDomain(sanitizedDomain);

      return res.status(201).json(response);
    } catch (error) {
      log({
        message: `Failed to add domain. \n\n ${error} \n\n*Metadata*: \`{teamId: ${teamId}, userId: ${userId}}\``,
        type: "error",
        mention: true,
      });
      errorhandler(error, res);
    }
  } else {
    // We only allow GET and POST requests
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
