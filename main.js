var addon = new Addon();

addon.on('init', async function() {
  document.getElementById("status").innerText = "Connected to Wealthica!";
  await loadDividendHistory();
});

async function loadDividendHistory() {
  try {
    const transactions = await addon.api.getTransactions();

    // Filter only dividend transactions
    const dividendTx = transactions.filter(tx => tx.type === 'dividend');

    if(dividendTx.length === 0){
      document.getElementById("content").innerText = "No historical dividends found.";
      return;
    }

    const dividendMap = {};

    dividendTx.forEach(tx => {
      // Symbol fallback for imported brokers
      const symbol = tx.symbol || tx.security?.symbol || "UNKNOWN";

      // Read amount from possible broker-imported fields
      const amount = tx.amount || tx.value || tx.cashAmount || 0;

      if (!dividendMap[symbol]) {
        dividendMap[symbol] = { total: 0, count: 0 };
      }

      dividendMap[symbol].total += amount;
      dividendMap[symbol].count += 1;
    });

    // Sort by total dividend descending
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

  const table = document.createElement("table");

  // Table header
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Symbol</th>
      <th>Payments</th>
      <th>Total ($)</th>
      <th>Average per Payment ($)</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  sortedData.forEach(([symbol, data]) => {
    const avg = data.count > 0 ? (data.total / data.count).toFixed(2) : "0.00";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Symbol">${symbol}</td>
      <td data-label="Payments">${data.count}</td>
      <td data-label="Total ($)">${data.total.toFixed(2)}</td>
      <td data-label="Average per Payment ($)">${avg}</td>
    `;
    tbody.appendChild(row);
    grandTotal += data.total;
  });

  table.appendChild(tbody);
  container.appendChild(table);

  // Grand total
  const totalDiv = document.createElement("div");
  totalDiv.className = "total";
  totalDiv.innerText = `Grand Total Dividends: $${grandTotal.toFixed(2)}`;
  container.appendChild(totalDiv);
}
