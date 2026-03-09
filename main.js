// Create the add‑on without an ID
var addon = new Addon();

// Update status when the add‑on is initialized
addon.on('init', function(options) {
  document.getElementById('status').innerText = "Connected to Wealthica!";

  // Example: calculate dummy dividend snowball
  const content = document.getElementById('content');
  content.innerHTML = `<p>Snowball dividends will be shown here.</p>`;
});

// Optionally respond to updates
addon.on('update', function(options) {
  console.log("Dashboard filters updated:", options);
});

addon.on('reload', function() {
  console.log("Dashboard wants to reload data.");
});
