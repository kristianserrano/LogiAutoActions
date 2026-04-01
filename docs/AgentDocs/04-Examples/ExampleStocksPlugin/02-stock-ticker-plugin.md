# Stock Ticker Plugin Example

This example demonstrates a complete stock ticker plugin implementation with web-based configuration, interactive chart viewer, and real-time updates. Based on the StocksPlugin_v2 reference implementation.

## Overview

The Stock Ticker Plugin provides real-time stock price information on Logitech devices with advanced features including:

- **Web-based Configuration** - Browser-based ticker management interface
- **Interactive Chart Viewer** - Professional stock charts with multiple time ranges
- **Dynamic Commands** - Auto-generated actions for each configured ticker
- **Real-time Updates** - Automatic data refresh with visual indicators
- **Cross-platform Support** - Works on Windows, macOS, and Linux
- **Professional UI** - Color-coded performance indicators and modern styling

## Project Structure

```
StocksPlugin_v2/
├── src/
│   ├── StockPlugin.cs                    # Main plugin class
│   ├── Actions/
│   │   ├── StockTickerDynamicCommand.cs  # Dynamic ticker actions
│   │   ├── StockConfigurationCommand.cs  # Web configuration interface
│   │   ├── StockViewerCommand.cs         # Interactive chart viewer
│   │   └── StockTickerAdjustment.cs      # Ticker rotation adjustment
│   ├── Services/
│   │   ├── StockService.cs               # Core business logic
│   │   ├── YahooFinanceClient.cs         # Enhanced API client
│   │   ├── TickerConfigService.cs        # Configuration management
│   │   ├── WebConfigurationService.cs    # Web config server
│   │   └── WebViewerService.cs           # Chart viewer server
│   ├── Models/
│   │   ├── TickerInfo.cs                 # Ticker configuration model
│   │   └── ChartData.cs                  # Chart data models
│   ├── Helpers/
│   │   ├── PathHelper.cs                 # Cross-platform path utilities
│   │   ├── PluginLog.cs                  # Logging utilities
│   │   └── PluginResources.cs            # Resource management
│   └── package/
│       └── metadata/
│           ├── LoupedeckPackage.yaml     # Package metadata
│           ├── tickers.json              # Default ticker configuration
│           └── Icon256x256.png           # Plugin icon
├── test_viewer.html                      # Test interface
├── VIEW_TICKERS_GUIDE.md                 # Chart viewer documentation
└── README.md                             # Plugin documentation
```

## Core Implementation

### 1. Main Plugin Class

```csharp
namespace Loupedeck.StockPlugin
{
    using System;
    using Loupedeck.StockPlugin.Services;

    public class StockPlugin : Plugin
    {
        public override Boolean UsesApplicationApiOnly => true;
        public override Boolean HasNoApplication => true;

        public StockPlugin()
        {
            // Initialize the plugin log and resources
            PluginLog.Init(this.Log);
            PluginResources.Init(this.Assembly);
        }

        public override void Load()
        {
            PluginLog.Info("StockPlugin loading...");
            PluginLog.Info("StockPlugin loaded successfully - actions will be auto-discovered");
        }

        public override void Unload()
        {
            PluginLog.Info("StockPlugin unloading...");
            
            // Clean up web services
            try
            {
                WebConfigurationService.Instance?.Dispose();
                WebViewerService.Instance?.Dispose();
            }
            catch (Exception ex)
            {
                PluginLog.Error(ex, "Error disposing web services");
            }
            
            PluginLog.Info("StockPlugin unloaded");
        }
    }
}
```

### 2. Ticker Configuration Model

```csharp
namespace Loupedeck.StockPlugin.Models
{
    using System;

    public class TickerInfo
    {
        public String Symbol { get; set; } = String.Empty;
        public String DisplayName { get; set; } = String.Empty;
        public String Description { get; set; } = String.Empty;
        public Boolean IsActive { get; set; } = true;
        public Int32 SortOrder { get; set; } = 0;

        public String GetDisplayText()
        {
            return String.IsNullOrWhiteSpace(DisplayName) ? Symbol : DisplayName;
        }

        public override String ToString()
        {
            return $"{Symbol} - {GetDisplayText()}";
        }
    }
}
```

### 3. Enhanced Yahoo Finance Client

```csharp
namespace Loupedeck.StockPlugin.Services
{
    using System;
    using System.Collections.Generic;
    using System.Net.Http;
    using System.Threading.Tasks;
    using System.Text.Json;
    using Loupedeck.StockPlugin.Models;

    public class YahooFinanceClient : IDisposable
    {
        private readonly HttpClient _httpClient;
        private const String BaseUrl = "https://query1.finance.yahoo.com/v8/finance/chart/";

        public YahooFinanceClient()
        {
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", 
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        }

        // Get basic ticker summary data
        public async Task<List<TickerSummary>> GetTickerSummariesAsync(String[] symbols)
        {
            var summaries = new List<TickerSummary>();
            
            foreach (var symbol in symbols)
            {
                try
                {
                    var summary = await GetTickerSummaryAsync(symbol);
                    summaries.Add(summary);
                }
                catch (Exception ex)
                {
                    PluginLog.Error(ex, $"Failed to get summary for {symbol}");
                    summaries.Add(CreateErrorSummary(symbol, ex.Message));
                }
            }
            
            return summaries;
        }

        // Get detailed chart data for interactive viewer
        public async Task<ChartData> GetChartDataAsync(String symbol, String range = "1d", String interval = "1m")
        {
            try
            {
                var url = $"{BaseUrl}{symbol}?range={range}&interval={interval}";
                var response = await _httpClient.GetStringAsync(url);
                
                return ParseChartData(symbol, response);
            }
            catch (Exception ex)
            {
                PluginLog.Error(ex, $"Failed to get chart data for {symbol}");
                return CreateErrorChartData(symbol, ex.Message);
            }
        }

        private async Task<TickerSummary> GetTickerSummaryAsync(String symbol)
        {
            var url = $"{BaseUrl}{symbol}";
            var response = await _httpClient.GetStringAsync(url);
            
            using var document = JsonDocument.Parse(response);
            var root = document.RootElement;
            var chart = root.GetProperty("chart");
            var result = chart.GetProperty("result")[0];
            var meta = result.GetProperty("meta");

            var currentPrice = meta.GetProperty("regularMarketPrice").GetDecimal();
            var previousClose = meta.GetProperty("previousClose").GetDecimal();
            var change = currentPrice - previousClose;
            var changePercent = (change / previousClose) * 100;

            return new TickerSummary
            {
                Symbol = symbol.ToUpperInvariant(),
                CompanyName = meta.TryGetProperty("longName", out var nameElement) 
                    ? nameElement.GetString() ?? symbol 
                    : symbol,
                CurrentPrice = currentPrice,
                Change = change,
                ChangePercent = changePercent,
                Volume = meta.TryGetProperty("regularMarketVolume", out var volumeElement)
                    ? volumeElement.GetInt64() : 0,
                LastUpdated = DateTime.Now,
                IsValid = true
            };
        }

        private ChartData ParseChartData(String symbol, String jsonResponse)
        {
            using var document = JsonDocument.Parse(jsonResponse);
            var root = document.RootElement;
            var chart = root.GetProperty("chart");
            var result = chart.GetProperty("result")[0];
            
            // Extract metadata
            var meta = result.GetProperty("meta");
            var chartMeta = new ChartMeta
            {
                Symbol = symbol.ToUpperInvariant(),
                Currency = meta.GetProperty("currency").GetString(),
                ExchangeName = meta.GetProperty("exchangeName").GetString(),
                InstrumentType = meta.GetProperty("instrumentType").GetString(),
                FirstTradeDate = DateTimeOffset.FromUnixTimeSeconds(
                    meta.GetProperty("firstTradeDate").GetInt64()).DateTime,
                RegularMarketTime = DateTimeOffset.FromUnixTimeSeconds(
                    meta.GetProperty("regularMarketTime").GetInt64()).DateTime,
                Gmtoffset = meta.GetProperty("gmtoffset").GetInt32(),
                Timezone = meta.GetProperty("timezone").GetString(),
                ExchangeTimezoneName = meta.GetProperty("exchangeTimezoneName").GetString(),
                RegularMarketPrice = meta.GetProperty("regularMarketPrice").GetDecimal(),
                ChartPreviousClose = meta.GetProperty("chartPreviousClose").GetDecimal()
            };

            // Extract price data
            var timestamps = result.GetProperty("timestamp");
            var indicators = result.GetProperty("indicators");
            var quote = indicators.GetProperty("quote")[0];
            
            var dataPoints = new List<ChartDataPoint>();
            var timestampArray = timestamps.EnumerateArray().ToArray();
            var openArray = quote.GetProperty("open").EnumerateArray().ToArray();
            var highArray = quote.GetProperty("high").EnumerateArray().ToArray();
            var lowArray = quote.GetProperty("low").EnumerateArray().ToArray();
            var closeArray = quote.GetProperty("close").EnumerateArray().ToArray();
            var volumeArray = quote.GetProperty("volume").EnumerateArray().ToArray();

            for (int i = 0; i < timestampArray.Length; i++)
            {
                if (closeArray[i].ValueKind != JsonValueKind.Null)
                {
                    dataPoints.Add(new ChartDataPoint
                    {
                        Timestamp = DateTimeOffset.FromUnixTimeSeconds(
                            timestampArray[i].GetInt64()).DateTime,
                        Open = openArray[i].ValueKind != JsonValueKind.Null ? 
                            openArray[i].GetDecimal() : 0,
                        High = highArray[i].ValueKind != JsonValueKind.Null ? 
                            highArray[i].GetDecimal() : 0,
                        Low = lowArray[i].ValueKind != JsonValueKind.Null ? 
                            lowArray[i].GetDecimal() : 0,
                        Close = closeArray[i].GetDecimal(),
                        Volume = volumeArray[i].ValueKind != JsonValueKind.Null ? 
                            volumeArray[i].GetInt64() : 0
                    });
                }
            }

            return new ChartData
            {
                Meta = chartMeta,
                DataPoints = dataPoints,
                IsValid = true
            };
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }
}
```

### 4. Dynamic Stock Ticker Command

```csharp
namespace Loupedeck.StockPlugin.Actions
{
    using System;
    using System.Linq;
    using Loupedeck.StockPlugin.Services;

    public class StockTickerDynamicCommand : PluginDynamicCommand
    {
        private readonly StockService _stockService;

        public StockTickerDynamicCommand()
        {
            this.DisplayName = "Stock Ticker";
            this.Description = "Display individual stock prices";
            this.GroupName = "Ticker Rotator";
            
            _stockService = new StockService();
            _stockService.StockDataUpdated += OnStockDataUpdated;
            
            // Load tickers from JSON configuration and add as parameters
            var tickers = TickerConfigService.Instance.GetTickers();
            
            foreach (var ticker in tickers.OrderBy(t => t.Symbol))
            {
                this.AddParameter(ticker.Symbol, 
                    $"{ticker.Symbol} - {ticker.DisplayName}", "Configured Stocks");
            }
            
            PluginLog.Info($"StockTickerDynamicCommand initialized with {tickers.Count} tickers");
        }

        protected override void RunCommand(String actionParameter)
        {
            if (String.IsNullOrWhiteSpace(actionParameter))
                return;

            string symbol = actionParameter.ToUpper().Trim();
            
            // Trigger immediate data fetch for this ticker
            _stockService.GetStockData(symbol);
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
        {
            if (String.IsNullOrWhiteSpace(actionParameter))
                return "Stock Ticker\r\nNo Symbol";

            string symbol = actionParameter.ToUpper().Trim();
            var stockData = _stockService.GetStockData(symbol);

            if (!stockData.IsValid)
            {
                return stockData.ErrorMessage == "Loading..." 
                    ? $"{symbol}\r\nLoading..." 
                    : $"{symbol}\r\nError";
            }

            // Show symbol, price and change with indicator
            return $"{symbol}\r\n{stockData.FormattedPrice}\r\n{stockData.FormattedChange}";
        }

        private void OnStockDataUpdated(object sender, StockDataUpdatedEventArgs e)
        {
            // Refresh display when stock data is updated
            this.ActionImageChanged();
        }
    }
}
```

### 5. Web Configuration Command

```csharp
namespace Loupedeck.StockPlugin.Actions
{
    using System;
    using System.Diagnostics;
    using Loupedeck.StockPlugin.Services;

    public class StockConfigurationCommand : PluginDynamicCommand
    {
        private readonly WebConfigurationService _webService;

        public StockConfigurationCommand()
            : base("Configure Stocks", "Open web interface to manage stock tickers", "Stock Configuration")
        {
            // Enable external editor with custom button text
            this.EnableExternalEditor("Open Stock Manager");
            
            _webService = WebConfigurationService.Instance;
        }

        protected override Boolean TryOpenExternalEditor(String actionParameter)
        {
            try
            {
                // Start the web server if not already running
                _webService.StartWebServer();
                
                var configUrl = $"http://localhost:{_webService.Port}/";
                
                // Open web browser to configuration page
                Process.Start(new ProcessStartInfo
                {
                    FileName = configUrl,
                    UseShellExecute = true
                });
                
                this.Plugin.OnPluginStatusChanged(PluginStatus.Normal, 
                    "Stock configuration opened");
                return true;
            }
            catch (Exception ex)
            {
                PluginLog.Error(ex, "Failed to open stock configuration");
                this.Plugin.OnPluginStatusChanged(PluginStatus.Error, 
                    "Failed to open configuration");
                return false;
            }
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
        {
            var tickerCount = TickerConfigService.Instance.GetTickers().Count;
            var serverStatus = _webService.IsRunning ? "Server On" : "Server Off";
            return $"Stock Config\r\n{tickerCount} tickers\r\n{serverStatus}";
        }
    }
}
```

### 6. Interactive Chart Viewer Command

```csharp
namespace Loupedeck.StockPlugin.Actions
{
    using System;
    using Loupedeck.StockPlugin.Services;

    public class StockViewerCommand : PluginDynamicCommand
    {
        private WebViewerService _webViewerService;

        public StockViewerCommand()
            : base("View Stock Charts", "Opens interactive stock charts for configured tickers", "Stock Viewer")
        {
        }

        protected override void RunCommand(String actionParameter)
        {
            try
            {
                PluginLog.Info("Stock Viewer Command executed");
                
                // Get or create the web viewer service
                _webViewerService = WebViewerService.Instance;
                
                if (!_webViewerService.IsRunning)
                {
                    _ = _webViewerService.StartAsync();
                    PluginLog.Info($"Started Stock Viewer web server on port {_webViewerService.Port}");
                }

                // Open the viewer in the default browser
                var url = $"http://localhost:{_webViewerService.Port}/viewer";
                OpenBrowser(url);
            }
            catch (Exception ex)
            {
                PluginLog.Error(ex, "Error in Stock Viewer Command");
            }
        }

        private void OpenBrowser(string url)
        {
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
                PluginLog.Info($"Opened Stock Viewer at {url}");
            }
            catch (Exception ex)
            {
                PluginLog.Error(ex, "Failed to open Stock Viewer in browser");
                
                // Platform-specific fallback methods
                try
                {
                    if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(
                        System.Runtime.InteropServices.OSPlatform.Windows))
                    {
                        System.Diagnostics.Process.Start("cmd", $"/c start {url}");
                    }
                    else if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(
                        System.Runtime.InteropServices.OSPlatform.OSX))
                    {
                        System.Diagnostics.Process.Start("open", url);
                    }
                    else
                    {
                        System.Diagnostics.Process.Start("xdg-open", url);
                    }
                }
                catch (Exception fallbackEx)
                {
                    PluginLog.Error(fallbackEx, "All methods to open browser failed");
                }
            }
        }
    }
}
```

## Package Configuration

### LoupedeckPackage.yaml

```yaml
# Package type. Must be plugin4 for plugins.
type: plugin4

# Name that identifies the plugin.
name: Stock

# Plugin name that is shown to the user.
displayName: Stock Ticker Pro

# Short description of the plugin.
description: Professional real-time stock ticker display with dynamic color-coded performance indicators, web-based configuration interface, and cross-platform support for seamless ticker management.

# Name of the plugin library file.
pluginFileName: StockPlugin.dll

# Plugin version.
version: 1.0.0

# Author of the plugin.
author: Logitech

# Copyright information.
copyright: Copyright © 2025 Logitech. All rights reserved.

# Plugin theme colors
backgroundColor: 4278190335    # Dark blue/navy - professional financial theme
foregroundColor: 4294967295   # White - high contrast text

# Plugin category for marketplace organization
category: Finance & Business

# Keywords for marketplace search
keywords:
  - stock
  - ticker
  - finance
  - market
  - trading
  - investment
  - real-time
  - dashboard

# Location of plugin files
pluginFolderWin: bin
pluginFolderMac: bin

# List of devices the plugin is optimized for.
supportedDevices:
    - LoupedeckCtFamily

# Minimum Loupedeck version supported by the plugin.
minimumLoupedeckVersion: 6.0

# License information
license: MIT
licenseUrl: https://opensource.org/licenses/MIT
```

### Default Ticker Configuration (tickers.json)

```json
{
  "tickers": [
    {
      "symbol": "AAPL",
      "displayName": "Apple Inc.",
      "description": "Technology company",
      "isActive": true,
      "sortOrder": 1
    },
    {
      "symbol": "GOOGL",
      "displayName": "Alphabet Inc.",
      "description": "Search and cloud services",
      "isActive": true,
      "sortOrder": 2
    },
    {
      "symbol": "MSFT",
      "displayName": "Microsoft Corporation",
      "description": "Software and cloud services",
      "isActive": true,
      "sortOrder": 3
    },
    {
      "symbol": "TSLA",
      "displayName": "Tesla, Inc.",
      "description": "Electric vehicles and energy",
      "isActive": true,
      "sortOrder": 4
    }
  ]
}
```

## Key Features Demonstrated

### 1. **Web-based Configuration**
- Browser-based ticker management interface
- Real-time configuration updates without plugin restart
- Cross-platform web server implementation

### 2. **Interactive Chart Viewer**
- Professional stock charts with Chart.js
- Multiple time ranges (1D, 5D, 1M, 3M, 6M, 1Y, 2Y, 5Y)
- Real-time data updates and responsive design

### 3. **Dynamic Command Generation**
- Automatic action creation from JSON configuration
- Event-driven UI updates when data changes
- Parameterized commands for individual tickers

### 4. **Advanced Service Architecture**
- Singleton pattern for web services
- Port conflict resolution and automatic fallback
- Proper resource management and cleanup

### 5. **Cross-platform Support**
- Platform-specific browser opening methods
- Cross-platform path handling utilities
- Consistent behavior across Windows, macOS, and Linux

### 6. **Professional UI/UX**
- Color-coded performance indicators
- Real-time visual feedback
- Modern dark theme optimized for trading

## Best Practices Demonstrated

- **Separation of Concerns**: Clear separation between UI, business logic, and data access
- **Event-driven Architecture**: Reactive UI updates based on data changes
- **Resource Management**: Proper disposal of HTTP clients and web servers
- **Error Handling**: Comprehensive error handling with fallback mechanisms
- **Configuration Management**: JSON-based configuration with hot-reload capability
- **Cross-platform Compatibility**: Platform-agnostic implementation patterns
- **Performance Optimization**: Efficient data caching and update strategies
- **Security**: Localhost-only web server binding and request validation

## Usage

1. **Installation**: Deploy the plugin package to Loupedeck software
2. **Configuration**: Use the "Configure Stocks" action to manage tickers via web interface
3. **Ticker Display**: Individual ticker actions automatically appear for each configured stock
4. **Chart Viewing**: Use "View Stock Charts" action to open interactive chart interface
5. **Customization**: Modify tickers.json or use web interface to add/remove stocks

## Advanced Features

- **Real-time Updates**: Automatic data refresh with configurable intervals
- **Web Services**: Dual web servers for configuration and chart viewing
- **Data Interpolation**: Smart handling of missing data points in charts
- **Responsive Design**: Mobile-friendly web interfaces
- **Professional Styling**: Financial industry-standard color schemes and layouts

This implementation demonstrates a production-ready plugin with enterprise-level features suitable for professional trading environments.