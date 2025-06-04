import prisma from "@/lib/prisma";
import { getApexDomain } from "../domains";

// calculate the domainCount
export async function getDomainCount(domain: string) {
  const apexDomain = getApexDomain(`https://${domain}`);
  const response = await prisma.domain.count({
    where: {
      OR: [
        {
          slug: apexDomain,
        },
        {
          slug: {
            endsWith: `.${apexDomain}`,
          },
        },
      ],
    },
  });

  return response;
}

/* Delete a domain */
export async function deleteDomain(
  domain: string,
  {
    skipPrismaDelete = false,
  } = {},
) {
  if (!skipPrismaDelete) {
    await prisma.domain.delete({
      where: {
        slug: domain,
      },
    });
  }
  return true;
}
