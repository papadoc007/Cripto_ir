const WEI_PER_ETH = BigInt('1000000000000000000');

export function weiToEth(wei: string): string {
  if (!wei || wei === '0') return '0';
  const value = BigInt(wei);
  const whole = value / WEI_PER_ETH;
  const fraction = value % WEI_PER_ETH;
  if (fraction === 0n) return whole.toString();
  const fractionStr = fraction.toString().padStart(18, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

export function addWei(a: string, b: string): string {
  return (BigInt(a || '0') + BigInt(b || '0')).toString();
}

export function subtractWei(a: string, b: string): string {
  return (BigInt(a || '0') - BigInt(b || '0')).toString();
}
