/** True when a wallet/spend API error is an insufficient-funds rejection. */
export function isInsufficientBalanceError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('insufficient coins') ||
    msg.includes('insufficient balance') ||
    msg.includes('insufficient diamonds') ||
    msg.includes('insufficient')
  );
}
