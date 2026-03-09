var addon = new Addon();

// Listen for filter changes at the top level
addon.on('filterChange', async function() {
  document.getElementById("status").innerText = "Global filters changed — updating…";
  await loadDividendHistory();
});

// Initial load after add-on container is ready
addon.on('init', async function() {
  try {
    document.getElementById("status").innerText = "Connected to Wealthica! Loading dividends…";
    await loadDividendHistory();
  } catch (err) {
    document.getElementById("status").innerText = "Error initializing add-on";
    console.error("Initialization error:", err);
  }
});

async function loadDividendHistory() {
  const container = document.getElementById("content");
  container.innerHTML = "";

  try {
    const transactions = await addon.api.getTransactions();

    if (!transactions || transactions.length === 0) {
      container.innerText = "No transactions found for the selected filters.";
      return;
    }

    // Only consider dividends
    const dividendTx = transactions.filter(tx => tx.origin_type === "Dividend");

    if (dividendTx.length === 0) {
      container.innerText = "No dividend transactions found.";
      return;
    }

    // Group by symbol
    const dividendMap = {};
    dividendTx.forEach(tx => {
      const symbol = tx.symbol || tx.security?.symbol || "UNKNOWN";
      const amount = tx.currency_amount || 0;

      if (!dividendMap[symbol]) {
        dividendMap[symbol] = { total: 0, count: 0 };
      }

      dividendMap[symbol].total += amount;
      dividendMap[symbol].count += 1;
    });

    // Sort descending by total
    const sorted = Object.entries(dividendMap).sort((a, b) => b[1].total - a[1].total);

    renderDividendTable(sorted);

  } catch (err) {
    container.innerText = "Error loading transactions.";
    console.error("loadDividendHistory error:", err);
  }
}

function renderDividendTable(sortedData) {
  const container = document.getElementById("content");
  container.innerHTML = "";

  let grandTotal = 0;

  const table = document.createElement("table");

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

  const totalDiv = document.createElement("div");
  totalDiv.className = "total";
  totalDiv.innerText = `Grand Total Dividends: $${grandTotal.toFixed(2)}`;
  container.appendChild(totalDiv);

  document.getElementById("status").innerText = "Connected to Wealthica! Displaying historical dividends.";
}
