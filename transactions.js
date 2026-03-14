const DB_KEY = "wealthica_dividend_db";
const transactionTypes = new Set(["dividend", "distribution"]);

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);

  if (!raw) {
    return {
      lastSync: null,
      dividends: [],
    };
  }

  return JSON.parse(raw);
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getLastSync(db) {
  const lastSyncStr = db.lastSync;
  const defaultPastDate = "2022-01-01";
  // 1. Check if the string exists and is not empty
  if (!lastSyncStr) {
    return defaultPastDate;
  }
  // 2. Convert to Date object
  const lastSyncDate = new Date(lastSyncStr);

  // 3. Subtract 1 day
  // (setDate handles month/year roll-overs automatically)
  lastSyncDate.setDate(lastSyncDate.getDate() - 1);

  // 4. Convert back to "yyyy-mm-dd" format
  return lastSyncDate.toISOString().split("T")[0];
}

async function getDividendTransactions(addon) {
  const db = loadDB();
  const todayDate = today();

  const from = getLastSync(db);
  const transactions = await addon.api.getTransactions({
    from: from,
    to: todayDate,
  });

  const existingIds = new Set(db.dividends.map((t) => t._id));

  for (const t of transactions) {
    const type = (t.type || "").toLowerCase();

    if (!transactionTypes.has(type)) continue;
    if (existingIds.has(t._id)) continue;

    db.dividends.push({
      _id: t._id,
      symbol: t.symbol || t.security?.symbol || "UNKNOWN",
      amount: t.currency_amount || 0,
      divDate: t.date,
    });
  }

  db.lastSync = todayDate;

  saveDB(db);

  return db.dividends;
}
