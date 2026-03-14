var addon = new Addon();

let tableData = [];
let currentSort = { column: "total", direction: "desc" };
let allPositionsMap;
let heldSymbols;
const dividendTypes = new Set([
  "Dividends",
  "DIV",
  "Dividend",
  "Distribution",
  "DIST",
]);

addon.on("init", async (data) => {
  document.getElementById("status").innerText = "Connected to Wealthica!";

  await addon.api
    .getPositions()
    .then(function (positions) {
      const positionsMap = positions.reduce((acc, p) => {
        const symbol = p.security?.symbol || p.ticker?.symbol;

        if (symbol) {
          acc[symbol] = {
            symbol: symbol,
            qty: p.quantity,
            lastPrice: p.security?.last_price || 0,
          };
        }
        return acc;
      }, {});
      heldSymbols = new Set(Object.keys(positionsMap));

      allPositionsMap = positionsMap;
    })
    .catch(function (err) {
      console.error("Error fetching positions:", err);
    });

  await loadDividendHistory();
});

async function loadDividendHistory() {
  try {
    const transactions = await getDividendTransactions(addon);
    if (transactions === 0) {
      document.getElementById("content").innerText =
        "No historical dividends found.";
      return;
    }

    const dividendMap = {};

    transactions.forEach((tx) => {
      const symbol = tx.symbol || tx.security?.symbol || "UNKNOWN";
      const amount = tx.amount || 0;

      if (!dividendMap[symbol]) {
        dividendMap[symbol] = {
          total: 0,
          count: 0,
        };
      }
      dividendMap[symbol].total += amount;
      if (isDateInThisMonth(tx.date)) {
        dividendMap[symbol].monthly += amount;
      }
      if (isYesterday(tx.date)) {
        dividendMap[symbol].yesterday += amount;
      }
      dividendMap[symbol].count += 1;
    });

    const displayMap = {};

    for (const symbol in allPositionsMap) {
      const divData = dividendMap[symbol] || {
        monthly: 0,
        yesterday: 0,
        total: 0,
        count: 0,
      }; // Get { qty: 10, price: 150 }

      // Go DIRECTLY to the same Symbol in your Dividend Map
      // No searching required!
      const positionData = allPositionsMap[symbol] || { qty: 0, lastPrice: 0 };

      // Staple them together into a new Map
      displayMap[symbol] = {
        ...divData,
        qty: positionData.qty,
        lastPrice: positionData.lastPrice,
      };
    }

    const sorted = Object.entries(displayMap).sort(
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

function isYesterday(dateToCheck) {
  const d = new Date(dateToCheck);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

function isDateInThisMonth(dateToCheck) {
  const inputDate = new Date(dateToCheck);
  const now = new Date();

  return (
    inputDate.getFullYear() === now.getFullYear() &&
    inputDate.getMonth() === now.getMonth()
  );
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

    if (currentSort.column === "qty") {
      return (a[1].qty - b[1].qty) * dir;
    }

    if (currentSort.column === "price") {
      return (a[1].lastPrice - b[1].lastPrice) * dir;
    }

    if (currentSort.column === "inv") {
      const invA = a[1].qty * a[1].lastPrice;
      const invB = b[1].qty * b[1].lastPrice;
      return (invA - invB) * dir;
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
      <th data-sort="qty">Quantity</th>
      <th data-sort="price">Price ($)</th>
      <th data-sort="inv">Invsted ($)</th>
    </tr>
  `;

  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  data.forEach(([symbol, stats]) => {
    const inv = (stats.qty * stats.lastPrice).toFixed(2);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="Symbol">${symbol}</td>
      <td data-label="Payments">${stats.count}</td>
      <td data-label="Total ($)">${stats.total.toFixed(2)}</td>
      <td data-label="Quantity">${stats.qty.toFixed(0)}</td>
      <td data-label="Price ($)">${stats.lastPrice.toFixed(2)}</td>
      <td data-label="Invested ($)">${inv}</td>
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
