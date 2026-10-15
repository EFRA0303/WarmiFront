import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export function countryFlag(country: CountryCode) {
  return country
    .toUpperCase()
    .replace(/./g, (letter) =>
      String.fromCodePoint(127397 + letter.charCodeAt(0)),
    );
}

export function phoneParts(value?: string | null) {
  const raw = value?.trim() ?? "";
  const phone = raw ? parsePhoneNumberFromString(raw, "BO") : undefined;
  if (!phone?.isValid()) return null;
  const country = phone.country ?? "BO";
  return {
    country,
    callingCode: getCountryCallingCode(country),
    nationalNumber: phone.nationalNumber,
    e164: phone.number,
    formatted: `${countryFlag(country)} ${phone.formatInternational()}`,
  };
}
