// Local mock for testing outside Wealthica
if (typeof Addon === "undefined") {
  var Addon = function () {
    this.api = {
      getTransactions: async () => [
        { origin_type: "Dividend", symbol: "ZMMK", currency_amount: 69.78, settlement_date: "2026-01-05" },
        { origin_type: "Dividend", symbol: "BMO", currency_amount: 50.0, settlement_date: "2026-01-10" },
        { origin_type: "Dividend", symbol: "ZMMK", currency_amount: 70.0, settlement_date: "2026-02-05" }
      ]
    };
    this.on = () => {};
    this.getFilters = () => ({ startDate: null, endDate: null });
  };
}

const addon = new Addon();
const statusEl = document.getElementById('status');
const contentEl = document.getElementById('content');

async function loadDividendHistory() {
  try {
    statusEl.textContent = 'Loading dividends…';

    const txs = await addon.api.getTransactions();
    const dividends = txs.filter(tx => tx.origin_type === 'Dividend');

    if (!dividends.length) {
      contentEl.innerHTML = '<p>No dividends found for the selected filters.</p>';
      statusEl.textContent = 'Connected to Wealthica!';
      return;
    }

    // Group by symbol
    const grouped = {};
    dividends.forEach(tx => {
      if (!grouped[tx.symbol]) grouped[tx.symbol] = [];
      grouped[tx.symbol].push(tx);
    });

    // Build table
    let html = `<table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Payments</th>
                      <th>Total Amount</th>
                      <th>Average Amount</th>
                    </tr>
                  </thead>
                  <tbody>`;

    let grandTotal = 0;

    Object.keys(grouped).forEach(symbol => {
      const arr = grouped[symbol];
      const total = arr.reduce((sum, tx) => sum + tx.currency_amount, 0);
      const avg = total / arr.length;
      grandTotal += total;

      html += `<tr>
                 <td>${symbol}</td>
                 <td>${arr.length}</td>
                 <td>${total.toFixed(2)}</td>
                 <td>${avg.toFixed(2)}</td>
               </tr>`;
    });

    html += `<tr class="total-row">
               <td colspan="2">Grand Total</td>
               <td>${grandTotal.toFixed(2)}</td>
               <td>-</td>
             </tr>`;

    html += '</tbody></table>';
    contentEl.innerHTML = html;
    statusEl.textContent = 'Connected to Wealthica!';
  } catch (err) {
    console.error('loadDividendHistory error:', err);
    statusEl.textContent = 'Error loading dividends.';
    contentEl.innerHTML = '';
  }
}

// Initial fast load to avoid timeout
addon.on('init', loadDividendHistory);

// React to global filter changes
addon.on('filtersChanged', loadDividendHistory);
