import { HttpError } from "../../lib/http-error.js";
export interface KycPolicy {
  retentionDays: number;
  scanSecret: string;
  agreementVersion: string;
  agreementSha256: string;
  privacyVersion: string;
}
export function getKycPolicy(env: NodeJS.ProcessEnv = process.env): KycPolicy {
  const retentionDays = Number(env.KYC_RETENTION_DAYS);
  const scanSecret = env.KYC_SCAN_SECRET ?? "";
  const agreementVersion = env.DRIVER_AGREEMENT_VERSION ?? "";
  const agreementSha256 = env.DRIVER_AGREEMENT_SHA256 ?? "";
  const privacyVersion = env.DRIVER_PRIVACY_VERSION ?? "";
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 365 ||
      scanSecret.length < 32 ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(agreementVersion) ||
      !/^[a-f0-9]{64}$/.test(agreementSha256) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(privacyVersion)) {
    throw new HttpError(503, "KYC_POLICY_UNAVAILABLE", "Private verification policy is not configured");
  }
  return { retentionDays, scanSecret, agreementVersion, agreementSha256, privacyVersion };
}
