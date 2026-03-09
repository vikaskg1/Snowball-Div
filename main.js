let addon, currentSort = { column: null, ascending: true };

document.getElementById("applyFilter").addEventListener("click", loadDividendHistory);

// Only initialize if inside Wealthica
if (typeof Addon !== "undefined") {
  addon = new Addon();

  addon.on('init', async function() {
    document.getElementById("status").innerText = "Connected to Wealthica! Loading dividends…";
    await loadDividendHistory();
  });
} else {
  document.getElementById("status").innerText = "Addon can only run inside Wealthica.";
}

async function loadDividendHistory() {
  const container = document.getElementById("content");
  container.innerHTML = "";

  if (!addon) return;

  try {
    const transactions = await addon.api.getTransactions();
    if (!transactions || transactions.length === 0) {
      container.innerText = "No transactions found.";
      return;
    }

    const dividendTx = transactions.filter(tx => tx.origin_type === "Dividend");

    // Date filter
    const startInput = document.getElementById("startDate").value;
    const endInput = document.getElementById("endDate").value;
    let startDate = startInput ? new Date(startInput) : null;
    let endDate = endInput ? new Date(endInput) : null;

    const filteredTx = dividendTx.filter(tx => {
      const date = new Date(tx.settlement_date || tx.processing_date);
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });

    if (filteredTx.length === 0) {
      container.innerText = "No dividend transactions found for the selected date range.";
      return;
    }

    // Group by symbol
    const dividendMap = {};
    filteredTx.forEach(tx => {
      const symbol = tx.symbol || tx.security?.symbol || "UNKNOWN";
      const amount = tx.currency_amount || 0;
      if (!dividendMap[symbol]) dividendMap[symbol] = { total: 0, count: 0 };
      dividendMap[symbol].total += amount;
      dividendMap[symbol].count += 1;
    });

    let dataArray = Object.entries(dividendMap).map(([symbol, data]) => ({ symbol, ...data }));
    dataArray.sort((a, b) => b.total - a.total);

    renderDividendTable(dataArray);
  } catch (err) {
    container.innerText = "Error loading transactions.";
    console.error("loadDividendHistory error:", err);
  }
}

function renderDividendTable(data) {
  const container = document.getElementById("content");
  container.innerHTML = "";
  let grandTotal = 0;

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th data-column="symbol">Symbol</th>
      <th data-column="count">Payments</th>
      <th data-column="total">Total ($)</th>
      <th data-column="average">Average ($)</th>
    </tr>
  `;
  table.appendChild(thead);

  thead.querySelectorAll("th").forEach(th => {
    th.addEventListener("click", () => {
      const column = th.dataset.column;
      if (currentSort.column === column) currentSort.ascending = !currentSort.ascending;
      else { currentSort.column = column; currentSort.ascending = true; }
      sortAndRender(data);
    });
  });

  const tbody = document.createElement("tbody");
  data.forEach(rowData => {
    const avg = rowData.count > 0 ? (rowData.total / rowData.count).toFixed(2) : "0.00";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${rowData.symbol}</td>
      <td>${rowData.count}</td>
      <td>${rowData.total.toFixed(2)}</td>
      <td>${avg}</td>
    `;
    tbody.appendChild(row);
    grandTotal += rowData.total;
  });
  table.appendChild(tbody);
  container.appendChild(table);

  // Sort arrow
  thead.querySelectorAll(".sort-arrow").forEach(el => el.remove());
  if (currentSort.column) {
    const th = thead.querySelector(`th[data-column="${currentSort.column}"]`);
    const arrow = document.createElement("span");
    arrow.className = "sort-arrow";
    arrow.innerHTML = currentSort.ascending ? "&#9650;" : "&#9660;";
    th.appendChild(arrow);
  }

  const totalDiv = document.createElement("div");
  totalDiv.className = "total";
  totalDiv.innerText = `Grand Total Dividends: $${grandTotal.toFixed(2)}`;
  container.appendChild(totalDiv);

  document.getElementById("status").innerText = "Connected to Wealthica! Displaying dividends.";
}

function sortAndRender(data) {
  if (!currentSort.column) return;

  data.sort((a, b) => {
    let valA, valB;
    switch (currentSort.column) {
      case "symbol": valA = a.symbol.toUpperCase(); valB = b.symbol.toUpperCase(); return currentSort.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case "count": valA = a.count; valB = b.count; return currentSort.ascending ? valA - valB : valB - valA;
      case "total": valA = a.total; valB = b.total; return currentSort.ascending ? valA - valB : valB - valA;
      case "average": valA = a.total / a.count; valB = b.total / b.count; return currentSort.ascending ? valA - valB : valB - valA;
    }
  });

  renderDividendTable(data);
}
