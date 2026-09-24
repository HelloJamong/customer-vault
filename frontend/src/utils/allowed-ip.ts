export const parseAllowedIpAddresses = (value: string): string[] =>
  [...new Set(value.split(/[\s,]+/).map((ip) => ip.trim()).filter(Boolean))];

export const formatAllowedIpAddresses = (values?: string[]): string =>
  (values || []).join('\n');
