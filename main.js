dividendTx.forEach(tx => {
  // Symbol fallback
  const symbol = tx.symbol || tx.security?.symbol || "UNKNOWN";

  // Read amount from possible fields used by brokers
  const amount = tx.amount || tx.value || tx.cashAmount || 0;

  if (!dividendMap[symbol]) {
    dividendMap[symbol] = { total: 0, count: 0 };
  }

  dividendMap[symbol].total += amount;
  dividendMap[symbol].count += 1;
});
