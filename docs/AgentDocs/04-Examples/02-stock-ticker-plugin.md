# Stock Ticker Plugin Example

Summary of the comprehensive StocksPlugin_v2 walkthrough. The snippets and checklists below mirror the original material while trimming repetition.

## Capabilities

- Web-based ticker configuration (served from the plugin).  
- Dynamic commands generated per configured ticker.  
- Real-time price updates with ▲ / ▼ indicators.  
- Interactive chart viewer powered by Chart.js.  
- Cross-platform support (Windows, macOS, Linux).  
- Professional UI with colour-coded performance states.

## Project Layout

```
StocksPlugin_v2/
├── src/
│   ├── StockPlugin.cs
│   ├── Actions/
│   │   ├── StockTickerDynamicCommand.cs
│   │   ├── StockConfigurationCommand.cs
│   │   ├── StockViewerCommand.cs
│   │   └── StockTickerAdjustment.cs
│   ├── Services/
│   │   ├── StockService.cs
│   │   ├── YahooFinanceClient.cs
│   │   ├── TickerConfigService.cs
│   │   ├── WebConfigurationService.cs
│   │   └── WebViewerService.cs
│   ├── Models/
│   │   ├── TickerInfo.cs
│   │   └── ChartData.cs
│   ├── Helpers/
│   │   ├── PathHelper.cs
│   │   ├── PluginLog.cs
│   │   └── PluginResources.cs
│   └── package/metadata/
│       ├── LoupedeckPackage.yaml
│       ├── tickers.json
│       └── Icon256x256.png
├── VIEW_TICKERS_GUIDE.md
└── test_viewer.html
```

## Core Classes

### Plugin Entry

```csharp
public class StockPlugin : Plugin
{
    public override Boolean UsesApplicationApiOnly => true;
    public override Boolean HasNoApplication => true;

    public StockPlugin()
    {
        PluginLog.Init(this.Log);
        PluginResources.Init(this.Assembly);
    }

    public override void Load()
    {
        PluginLog.Info("StockPlugin loading...");
    }

    public override void Unload()
    {
        WebConfigurationService.Instance?.Dispose();
        WebViewerService.Instance?.Dispose();
        PluginLog.Info("StockPlugin unloaded");
    }
}
```

### Dynamic Command (excerpt)

```csharp
protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
{
    if (String.IsNullOrWhiteSpace(actionParameter))
        return "Stock Ticker\nNo Symbol";

    var symbol = actionParameter.ToUpperInvariant();
    if (_stockCache.TryGetValue(symbol, out var stockData))
    {
        var indicator = stockData.Change >= 0 ? "▲" : "▼";
        return $"{symbol}\n${stockData.Price:F2} {indicator}";
    }

    return $"{symbol}\nLoading...";
}
```

### Yahoo Finance Client (excerpt)

```csharp
var requestUri = $"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbol}";
using var response = await _httpClient.GetAsync(requestUri, cancellationToken);
response.EnsureSuccessStatusCode();
```

- Implements retry/backoff logic, JSON parsing, and currency formatting exactly as described in the original guide.  
- Uses `HttpClient` with configurable timeout and logging around failures.

### Web Configuration Service (highlights)

- `HttpListener` bound to `http://localhost:<port>/`.  
- Port discovery with retry (e.g., start at 8082 and increment on failure).  
- Serves HTML/JS assets for ticker management and processes POST requests to update `tickers.json`.  
- Uses `FileSystemWatcher` to broadcast configuration changes to running commands.

### Web Viewer Service

- Separate listener dedicated to chart viewing.  
- Generates chart data JSON by aggregating responses from Yahoo Finance.  
- Opens the user’s default browser with platform-specific fallbacks (`Process.Start`, `open`, `xdg-open`).

## Package Metadata Snapshot

```yaml
pluginName: StockPlugin
displayName: "Stocks Plugin"
version: 2.0.0
author: "Logitech Sample Team"
category: Finance & Business
keywords:
  - stock
  - ticker
  - finance
supportedDevices:
  - LoupedeckCtFamily
minimumLoupedeckVersion: 6.0
license: MIT
```

## Key Techniques

- Separation of concerns between actions, services, models, and helpers.  
- Async refresh loop with safe caching and status updates.  
- JSON-backed configuration storage with hot reload.  
- Secure localhost-only HTTP endpoints, validated requests, and robust disposal.  
- Dynamic command generation triggered via service events (`DynamicStockActionGenerator` in the original implementation).

## Usage Workflow

1. Install the plugin package via `LogiPluginTool install`.  
2. Use the **Configure Stocks** action to open the web configuration UI.  
3. Add or remove tickers; dynamic commands sync automatically.  
4. Place ticker actions on device buttons to display symbols, prices, and movement indicators.  
5. Launch the **View Stock Charts** action for interactive charts directly in a browser.

## Related Documentation

- Action parameter design: `../02-Core-Concepts/02-action-parameters.md`  
- Web application integration notes: `../06-Advanced-Topics/01-web-applications-as-actions.md`  
- Deployment checklist: `../05-Best-Practices/03-deployment-readiness.md`
