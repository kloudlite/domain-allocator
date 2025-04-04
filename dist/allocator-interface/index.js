"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDomain = exports.reserveDomain = exports.suggestDomains = exports.checkDomainAvailability = void 0;
const cloudflare_1 = __importDefault(require("cloudflare"));
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = __importDefault(require("../utils/config"));
const commons_1 = require("../utils/commons");
const client = new cloudflare_1.default({
    apiEmail: config_1.default.CLOUDFLARE_EMAIL,
    apiKey: config_1.default.CLOUDFLARE_API_KEY
});
const listDNSRecords = async (domainName, type) => {
    for await (const recordResponse of client.dns.records.list({
        zone_id: config_1.default.CLOUDFLARE_ZONE_ID,
        type,
        name: {
            exact: domainName
        }
    })) {
        return false;
    }
    return true;
};
const checkDomainAvailability = async (domainName) => {
    return listDNSRecords(domainName, 'TXT');
};
exports.checkDomainAvailability = checkDomainAvailability;
const suggestDomains = async (companyName) => {
    const availNames = [];
    const sNames = (0, commons_1.generateNameSuggestions)(companyName, 10);
    for (let i = 0; i < sNames.length; i++) {
        const sn = sNames[i];
        if (availNames.length >= 5) {
            break;
        }
        const rec = await listDNSRecords(`${sn}.khost.dev`, "TXT");
        if (rec) {
            availNames.push(sn + ".khost.dev");
        }
    }
    return availNames;
};
exports.suggestDomains = suggestDomains;
const reserveDomain = async (domainName) => {
    const uniquekey = (0, uuid_1.v4)();
    const salt = await bcrypt_1.default.genSalt();
    const hash = await bcrypt_1.default.hash(uniquekey, salt);
    const res = await client.dns.records.create({
        zone_id: config_1.default.CLOUDFLARE_ZONE_ID, type: 'TXT', name: domainName, content: `"${hash}"`, proxied: false, ttl: 1
    });
    return res.id + ":" + uniquekey + ":" + salt;
};
exports.reserveDomain = reserveDomain;
const registerDomain = async (reservationToken, nsRecords) => {
    const [txtId, uniqueKey, salt] = reservationToken.split(":");
    const hash = await bcrypt_1.default.hash(uniqueKey, salt);
    const txtRes = await client.dns.records.get(txtId, {
        zone_id: config_1.default.CLOUDFLARE_ZONE_ID
    });
    if (txtRes.content === `"${hash}"`) {
        const records = await client.dns.records.list({
            zone_id: config_1.default.CLOUDFLARE_ZONE_ID,
            type: "NS",
            name: {
                exact: txtRes.name
            }
        });
        console.log(records);
        for (let i = 0; i < records.result.length; i++) {
            const record = records.result[i];
            await client.dns.records.delete(record.id, { zone_id: config_1.default.CLOUDFLARE_ZONE_ID });
        }
        for (let i = 0; i < nsRecords.length; i++) {
            const ns = nsRecords[i];
            await client.dns.records.create({
                zone_id: config_1.default.CLOUDFLARE_ZONE_ID, type: 'NS', name: txtRes.name, content: ns, proxied: false, ttl: 1
            });
        }
    }
};
exports.registerDomain = registerDomain;
