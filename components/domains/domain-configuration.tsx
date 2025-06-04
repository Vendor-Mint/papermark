import { Fragment, useState, useEffect } from "react";
import { InfoIcon } from "lucide-react";
import { getSubdomain } from "@/lib/domains";
import { DomainVerificationStatusProps } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TabSelect } from "../ui/tab-select";

export default function DomainConfiguration({
  status,
  response,
}: {
  status: DomainVerificationStatusProps;
  response: { domainJson: any; configJson: any };
}) {
  const { domainJson, configJson } = response;
  const subdomain = getSubdomain(domainJson.name, domainJson.apexName);
  const [recordType, setRecordType] = useState(!!subdomain ? "CNAME" : "A");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const isSelfHosted = process.env.NEXT_PUBLIC_IS_SELF_HOSTED === "true";

  useEffect(() => {
    // Fetch verification token when component mounts
    async function getVerificationToken() {
      try {
        const response = await fetch(`/api/domains/verify?domain=${encodeURIComponent(domainJson.name)}&checkOwnership=true`);
        const data = await response.json();
        if (data.verificationToken) {
          setVerificationToken(data.verificationToken);
        }
      } catch (error) {
        console.error('Error fetching verification token:', error);
      }
    }
    getVerificationToken();
  }, [domainJson.name]);

  if (isSelfHosted) {
    return (
      <div className="pt-2">
        <div className="flex items-center space-x-2">
          <TabSelect
            options={[
              { id: "CNAME", label: "Subdomain" },
              { id: "A", label: "Apex Domain" },
            ]}
            selected={recordType}
            onSelect={(option: string) => setRecordType(option)}
          />
        </div>

        {/* Domain Ownership Verification */}
        <div className="my-3 text-sm">
          <p className="text-sm font-medium mb-2">
            First, verify domain ownership by adding this TXT record:
          </p>
          <div className="bg-secondary/50 p-4 rounded-md mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-mono mb-1">Type: TXT</p>
                <p className="font-mono mb-1">Name: @</p>
                <p className="font-mono">Value: {verificationToken || "Loading..."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* DNS Configuration */}
        <div className="my-3 text-sm">
          <p className="text-sm font-medium mb-2">
            Then, set up the DNS record for routing:
          </p>
          {recordType === "CNAME" ? (
            <>
              <p className="text-sm font-medium mb-2">
                Set the following CNAME record for your subdomain:
              </p>
              <div className="bg-secondary/50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono mb-1">Type: CNAME</p>
                    <p className="font-mono mb-1">Name: {subdomain || "@"}</p>
                    <p className="font-mono">Value: {process.env.NEXT_PUBLIC_APP_HOSTNAME || window.location.hostname}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium mb-2">
                Set the following A record for your apex domain:
              </p>
              <div className="bg-secondary/50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono mb-1">Type: A</p>
                    <p className="font-mono mb-1">Name: @</p>
                    <p className="font-mono">Value: {process.env.NEXT_PUBLIC_APP_IP || "Your server's public IP"}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-md bg-blue-50 dark:bg-blue-900/50 p-3 mt-4">
          <div className="flex items-center space-x-3">
            <InfoIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-400">
              DNS changes can take up to 24 hours to propagate. Once propagated, your domain will be automatically verified.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "Pending Verification") {
    const txtVerification = domainJson.verification.find(
      (x: any) => x.type === "TXT",
    );
    return (
      <div>
        <DnsRecord
          instructions={`Please set the following TXT record on <code>${domainJson.apexName}</code> to prove ownership of <code>${domainJson.name}</code>:`}
          records={[
            {
              type: txtVerification.type,
              name: txtVerification.domain.slice(
                0,
                txtVerification.domain.length - domainJson.apexName.length - 1,
              ),
              value: txtVerification.value,
            },
          ]}
          warning="Warning: if you are using this domain for another site, setting this TXT record will transfer domain ownership away from that site and break it. Please exercise caution when setting this record; make sure that the domain that is shown in the TXT verification value is actually the <b><i>domain you want to use on Papermark.io</i></b> – <b><i>not your production site</i></b>."
        />
      </div>
    );
  }

  if (status === "Conflicting DNS Records") {
    return (
      <div className="pt-5">
        <div className="flex justify-start space-x-4">
          <div className="ease border-b-2 border-black pb-1 text-sm text-foreground transition-all duration-150">
            {configJson?.conflicts.some((x: any) => x.type === "A")
              ? "A Record (recommended)"
              : "CNAME Record (recommended)"}
          </div>
        </div>
        <DnsRecord
          instructions="Please remove the following conflicting DNS records from your DNS provider:"
          records={configJson?.conflicts.map(
            ({
              name,
              type,
              value,
            }: {
              name: string;
              type: string;
              value: string;
            }) => ({
              name,
              type,
              value,
            }),
          )}
        />
        <DnsRecord
          instructions="Afterwards, set the following record on your DNS provider:"
          records={[
            {
              type: recordType,
              name: recordType === "A" ? "@" : (subdomain ?? "www"),
              value:
                recordType === "A" ? `76.76.21.21` : `cname.vercel-dns.com`,
              ttl: "86400",
            },
          ]}
        />
      </div>
    );
  }

  if (status === "Unknown Error") {
    return (
      <div className="pt-5">
        <p className="mb-5 text-sm">{response.domainJson.error.message}</p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="-ml-1.5 border-b border-gray-200 dark:border-gray-400">
        <TabSelect
          options={[
            { id: "A", label: `A Record${!subdomain ? " (recommended)" : ""}` },
            {
              id: "CNAME",
              label: `CNAME Record${subdomain ? " (recommended)" : ""}`,
            },
          ]}
          selected={recordType}
          onSelect={setRecordType}
        />
      </div>

      <DnsRecord
        instructions={`To configure your ${
          recordType === "A" ? "apex domain" : "subdomain"
        } <code>${
          recordType === "A" ? domainJson.apexName : domainJson.name
        }</code>, set the following ${recordType} record on your DNS provider:`}
        records={[
          {
            type: recordType,
            name: recordType === "A" ? "@" : (subdomain ?? "www"),
            value:
              recordType === "A" ? `76.76.21.21` : `cname.vercel-dns.com`,
            ttl: "86400",
          },
        ]}
      />
    </div>
  );
}

const MarkdownText = ({ text }: { text: string }) => {
  return (
    <p
      className="prose-sm max-w-none prose-code:rounded-md prose-code:bg-gray-100 prose-code:p-1 prose-code:font-mono prose-code:text-[.8125rem] prose-code:font-medium prose-code:text-gray-900"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};

const DnsRecord = ({
  instructions,
  records,
  warning,
}: {
  instructions: string;
  records: { type: string; name: string; value: string; ttl?: string }[];
  warning?: string;
}) => {
  const hasTtl = records.some((x) => x.ttl);

  return (
    <div className="mt-3 text-left text-gray-600">
      <div className="my-5 text-gray-600 dark:text-gray-400">
        <MarkdownText text={instructions} />
      </div>
      <div
        className={cn(
          "grid items-end gap-x-10 gap-y-1 overflow-x-auto rounded-lg bg-gray-100/80 p-4 text-sm scrollbar-hide",
          hasTtl
            ? "grid-cols-[repeat(4,min-content)]"
            : "grid-cols-[repeat(3,min-content)]",
        )}
      >
        {["Type", "Name", "Value"].concat(hasTtl ? "TTL" : []).map((s) => (
          <p key={s} className="font-medium text-gray-950">
            {s}
          </p>
        ))}

        {records.map((record, idx) => (
          <Fragment key={idx}>
            <p key={record.type} className="font-mono">
              {record.type}
            </p>
            <p key={record.name} className="font-mono">
              {record.name}
            </p>
            <p key={record.value} className="flex items-end gap-1 font-mono">
              {record.value}{" "}
              {/* <CopyButton
                variant="neutral"
                className="-mb-0.5"
                value={record.value}
              /> */}
            </p>
            {hasTtl && (
              <p key={record.ttl} className="font-mono">
                {record.ttl}
              </p>
            )}
          </Fragment>
        ))}
      </div>
      {(warning || hasTtl) && (
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-lg p-3",
            warning
              ? "bg-orange-50 text-orange-600"
              : "bg-indigo-50 text-indigo-600",
          )}
        >
          <InfoIcon className="h-5 w-5 shrink-0" />
          <MarkdownText
            text={
              warning ||
              "If a TTL value of 86400 is not available, choose the highest available value. Domain propagation may take up to 12 hours."
            }
          />
        </div>
      )}
    </div>
  );
};
