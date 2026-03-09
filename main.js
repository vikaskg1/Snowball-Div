var addon = new Addon();

let tableData = [];
let currentSort = { column: "total", direction: "desc" };

addon.on("init", async (data) => {
  document.getElementById("status").innerText = "Connected to Wealthica!";
  console.log("data is", data);

  await loadDividendHistory(data.dateRangeFilter[0], data.dateRangeFilter[1]);

  addon.on("update", async (newFilters) => {
    console.log("In Update!", newFilters);

    if (newFilters && newFilters.dateRangeFilter) {
      console.log("Has Real Filters changed!", newFilters);
      await loadDividendHistory(newFilters.fromDate, newFilters.toDate);
    }
  });
});

async function loadDividendHistory(from, to) {
  try {
    const transactions = await addon.api.getTransactions({
      from: from,
      to: to,
    });

    const dividendTx = transactions.filter(
      (tx) =>
        tx.origin_type === "Dividends" ||
        tx.origin_type === "DIV" ||
        tx.origin_type === "Dividend",
    );

    if (dividendTx.length === 0) {
      document.getElementById("content").innerText =
        "No historical dividends found.";
      return;
    }

    const dividendMap = {};

    dividendTx.forEach((tx) => {
      const symbol = tx.symbol || tx.security?.symbol || "UNKNOWN";
      const amount = tx.currency_amount || 0;

      if (!dividendMap[symbol]) {
        dividendMap[symbol] = { total: 0, count: 0 };
      }

      dividendMap[symbol].total += amount;
      dividendMap[symbol].count += 1;
    });

    const sorted = Object.entries(dividendMap).sort(
      (a, b) => b[1].total - a[1].total,
    );

    tableData = sorted;
    console.log("tableData", tableData);

    renderDividendTable();
  } catch (err) {
    document.getElementById("status").innerText =
      "Error loading dividend history";
    console.error(err);
  }
}

function renderDividendTable() {
  const container = document.getElementById("content");
  container.innerHTML = "";

  let data = [...tableData];

  data.sort((a, b) => {
    const dir = currentSort.direction === "asc" ? 1 : -1;

    if (currentSort.column === "symbol") {
      return a[0].localeCompare(b[0]) * dir;
    }

    if (currentSort.column === "payments") {
      return (a[1].count - b[1].count) * dir;
    }

    if (currentSort.column === "total") {
      return (a[1].total - b[1].total) * dir;
    }

    if (currentSort.column === "avg") {
      const avgA = a[1].total / a[1].count;
      const avgB = b[1].total / b[1].count;
      return (avgA - avgB) * dir;
    }
  });

  let grandTotal = 0;

  const table = document.createElement("table");

  const thead = document.createElement("thead");

  thead.innerHTML = `
    <tr>
      <th data-sort="symbol">Symbol</th>
      <th data-sort="payments">Payments</th>
      <th data-sort="total">Total ($)</th>
      <th data-sort="avg">Average per Payment ($)</th>
    </tr>
  `;

  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  data.forEach(([symbol, stats]) => {
    const avg = stats.count ? (stats.total / stats.count).toFixed(2) : "0.00";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="Symbol">${symbol}</td>
      <td data-label="Payments">${stats.count}</td>
      <td data-label="Total ($)">${stats.total.toFixed(2)}</td>
      <td data-label="Average per Payment ($)">${avg}</td>
    `;

    tbody.appendChild(row);

    grandTotal += stats.total;
  });

  table.appendChild(tbody);

  container.appendChild(table);

  const totalDiv = document.createElement("div");

  totalDiv.className = "total";
  totalDiv.innerText = `Grand Total Dividends: $${grandTotal.toFixed(2)}`;

  container.appendChild(totalDiv);

  container.querySelectorAll("th").forEach((header) => {
    header.addEventListener("click", () => {
      const column = header.dataset.sort;

      if (currentSort.column === column) {
        currentSort.direction =
          currentSort.direction === "asc" ? "desc" : "asc";
      } else {
        currentSort.column = column;
        currentSort.direction = "asc";
      }

      renderDividendTable();
    });
  });
}
