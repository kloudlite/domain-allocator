import Cloudflare from "cloudflare";
import { v4 as uuid } from "uuid"
import crypto from "crypto"
import bcrypt from "bcrypt";
import config from "../utils/config";
import { generateNameSuggestions } from "../utils/commons";
import { RecordListParams } from "cloudflare/resources/dns/records";

const client = new Cloudflare({
  apiEmail: config.CLOUDFLARE_EMAIL,
  apiKey: config.CLOUDFLARE_API_KEY
});

const listDNSRecords = async (domainName: string, type: RecordListParams['type']) => {
  for await (const recordResponse of client.dns.records.list({
    zone_id: config.CLOUDFLARE_ZONE_ID!,
    type,
    name: {
      exact: domainName
    }
  })) {
    return false
  }
  return true
}
export const checkDomainAvailability = async (domainName: string) => {
  return listDNSRecords(domainName, 'TXT')
};

export const suggestDomains = async (companyName: string) => {
  const availNames: string[] = []
  const sNames = generateNameSuggestions(companyName, 10)

  for (let i = 0; i < sNames.length; i++) {
    const sn = sNames[i]
    if (availNames.length >= 5) {
      break
    }
    const rec = await listDNSRecords(`${sn}.khost.dev`, "TXT")
    if (rec) {
      availNames.push(sn + ".khost.dev")
    }

  }
  return availNames
};

export const reserveDomain = async (domainName: string) => {
  const uniquekey = uuid()
  const salt = await bcrypt.genSalt()
  const hash = await bcrypt.hash(uniquekey, salt)

  const res = await client.dns.records.create({
    zone_id: config.CLOUDFLARE_ZONE_ID!, type: 'TXT', name: domainName, content:
      `"${hash}"`, proxied: false, ttl: 1
  })

  return res.id + ":" + uniquekey + ":" + salt
};
export const registerDomain = async (
  reservationToken: string,
  nsRecords: string[],
) => {
  const [txtId, uniqueKey, salt] = reservationToken.split(":")
  const hash = await bcrypt.hash(uniqueKey, salt)

  const txtRes = await client.dns.records.get(txtId, {
    zone_id: config.CLOUDFLARE_ZONE_ID!
  })

  if (txtRes.content === `"${hash}"`) {

    const records = await client.dns.records.list({
      zone_id: config.CLOUDFLARE_ZONE_ID!,
      type: "NS",
      name: {
        exact: txtRes.name
      }
    })

    console.log(records)

    for (let i = 0; i < records.result.length; i++) {
      const record = records.result[i];
      await client.dns.records.delete(record.id, { zone_id: config.CLOUDFLARE_ZONE_ID! })
    }

    for (let i = 0; i < nsRecords.length; i++) {
      const ns = nsRecords[i];
      await client.dns.records.create({
        zone_id: config.CLOUDFLARE_ZONE_ID!, type: 'NS', name: txtRes.name, content:ns, proxied: false, ttl: 1
      })
    }
  }
};
