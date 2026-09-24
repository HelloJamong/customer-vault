export function getTrustProxySetting(
  trustedProxyAddresses?: string,
  trustedProxyHops?: string,
): string[] | number {
  const addresses = trustedProxyAddresses
    ?.split(',')
    .map((address) => address.trim())
    .filter(Boolean);

  if (addresses?.length) return addresses;
  return Number(trustedProxyHops || 1);
}
