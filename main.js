var addon = new Addon();

addon.on('init', async function() {
  document.getElementById("status").innerText = "Connected to Wealthica!";
  await loadDividendHistory();
});

async function loadDividendHistory() {
  try {
    // Fetch all transactions (dividends, trades, etc.)
    const transactions = await addon.api.getTransactions();

    // Filter only dividend transactions
    const dividendTx = transactions.filter(tx => tx.type === 'dividend');

    if(dividendTx.length === 0){
      document.getElementById("content").innerText = "No historical dividends found.";
      return;
    }

    // Aggregate dividends by symbol
    const dividendMap = {};
    dividendTx.forEach(tx => {
      const symbol = tx.symbol || "UNKNOWN";
      const amount = tx.amount || 0;

      if (!dividendMap[symbol]) {
        dividendMap[symbol] = { total: 0, count: 0 };
      }

      dividendMap[symbol].total += amount;
      dividendMap[symbol].count += 1;
    });

    // Convert map to array and sort descending by total dividend
    const sorted = Object.entries(dividendMap).sort((a,b) => b[1].total - a[1].total);

    renderDividendTable(sorted);

  } catch(err) {
    document.getElementById("status").innerText = "Error loading dividend history";
    console.error(err);
  }
}

function renderDividendTable(sortedData) {
  const container = document.getElementById("content");
  container.innerHTML = "";

  let grandTotal = 0;

  sortedData.forEach(([symbol, data]) => {
    const row = document.createElement("div");
    row.className = "symbol-row";
    row.setAttribute("data-symbol", symbol); // CSS ::before shows symbol
    row.innerHTML = `<span>Total $${data.total.toFixed(2)} from ${data.count} payments</span>`;
    container.appendChild(row);
    grandTotal += data.total;
  });

  const totalDiv = document.createElement("div");
  totalDiv.className = "total";
  totalDiv.innerText = `Grand Total Dividends: $${grandTotal.toFixed(2)}`;
  container.appendChild(totalDiv);
}
