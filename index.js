const liveTickerURI = "https://static.fusioncharts.com/jsdays/ticker.php";
const liveOHLCURI = "https://www.bitstamp.net/api/v2/ohlc";
const defaultOptions = {
  coins: [
    {
      name: "Bitcoin",
      ticker: "btc",
      logo: "https://bitcoin.org/img/icons/logotop.svg",
      color: "#F7931A",
    },
    {
      name: "Ethereum",
      ticker: "eth",
      logo:
        "https://cryptologos.cc/logos/versions/ethereum-eth-logo-full-horizontal.svg",
      color: "#C3B5FA",
    },
    {
      name: "Ripple",
      ticker: "xrp",
      logo:
        "https://upload.wikimedia.org/wikipedia/commons/8/88/Ripple_logo.svg",
      color: "#1372E4",
    },
  ],
  currencies: [
    {
      name: "usd",
      symbol: "$",
    },
    {
      name: "eur",
      symbol: "€",
    },
    {
      name: "gbp",
      symbol: "£",
    },
  ],
};

fetchCheckStatus = (response) => {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  const error = new Error(response.statusText);
  error.response = response;
  throw error;
};

loadData = (url) => {
  const option = {
    method: "GET",
    headers: new Headers(),
    mode: "cors",
    cache: "default",
  };

  return fetch(url, option)
    .then(fetchCheckStatus)
    .then(function (resp) {
      const contentType = resp.headers.get("Content-Type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return resp.json();
      }
      return resp.text();
    })
    .then(function (data) {
      return data;
    })
    .catch(function () {
      console.log("Something went wrong! Please check data/schema files");
    });
};

timeConverter = (UNIX_timestamp) => {
  var a = new Date(UNIX_timestamp * 1000);
  var months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time =
    date + " " + month + " " + year + " " + hour + ":" + min + ":" + sec;
  return time;
};

// select dropdowns
let coinSelect = document.getElementById("coin-select");
for (let i = 0; i < defaultOptions.coins.length; i++) {
  let coinOption = document.createElement("option");
  coinOption.text = `${defaultOptions.coins[i]["name"]} (${defaultOptions.coins[
    i
  ]["ticker"].toUpperCase()})`;
  coinOption.value = i;
  if (i === 0) {
    coinOption.selected = true;
  }
  coinSelect.add(coinOption, coinSelect[i]);
}

let currencySelect = document.getElementById("currency-select");
for (let i = 0; i < defaultOptions.currencies.length; i++) {
  let currencyOption = document.createElement("option");
  currencyOption.text = `${defaultOptions.currencies[i][
    "name"
  ].toUpperCase()} (${defaultOptions.currencies[i]["symbol"]})`;
  currencyOption.value = i;
  if (i === 0) {
    currencyOption.selected = true;
  }
  currencySelect.add(currencyOption, currencySelect[i]);
}

coinChangeHandler = (ev) => {
  FusionCharts.items["index-chart"].dispose();
  window.clearInterval(rtUpdate);
  updateData(ev.value, currencySelect.value);
};

currencyChangeHandler = (ev) => {
  FusionCharts.items["index-chart"].dispose();
  window.clearInterval(rtUpdate);
  updateData(coinSelect.value, ev.value);
};

updateKPIS = (coin, currency) => {
  Promise.all([
    loadData(
      `${liveTickerURI}?coin=${defaultOptions.coins[coin]["ticker"]}&currency=${defaultOptions.currencies[currency]["name"]}`
    ),
  ]).then(function (res) {
    let rtData = JSON.parse(res[0]);
    let lastUpdated = document.getElementById("update-timestamp");
    lastUpdated.innerHTML = `Last Updated: ${timeConverter(rtData.timestamp)}`;
    let currentPrice = document.getElementById("current-price");
    currentPrice.innerHTML = `${defaultOptions.currencies[currency]["symbol"]}${rtData.last}`;
    let vwapValue = document.getElementById("vwap-value");
    vwapValue.innerHTML = `${defaultOptions.currencies[currency]["symbol"]}${rtData.vwap}`;
    let volumeValue = document.getElementById("volume-value");
    volumeValue.innerHTML = `${Number(rtData.volume).toFixed(2)}`;
  });
};

renderChart = (coin, currency) => {
  Promise.all([
    loadData(
      `${liveOHLCURI}/${defaultOptions.coins[coin]["ticker"]}${defaultOptions.currencies[currency]["name"]}/?step=60&limit=1000`
    ),
  ]).then(function (res) {
    const schema = [
      {
        name: "Date",
        type: "date",
        format: "%s",
      },
      {
        name: "Open",
        type: "number",
      },
      {
        name: "High",
        type: "number",
      },
      {
        name: "Low",
        type: "number",
      },
      {
        name: "Close",
        type: "number",
      },
      {
        name: "Volume",
        type: "number",
      },
    ];
    let chartData = res[0].data.ohlc.map((data, index) => {
      return [
        data.timestamp,
        data.open,
        data.high,
        data.low,
        data.close,
        data.volume,
      ];
    });
    let dt = new FusionCharts.DataStore().createDataTable(chartData, schema);

    new FusionCharts({
      type: "timeseries",
      renderAt: "chart-container",
      id: "index-chart",
      width: "100%",
      height: "100%",
      dataSource: {
        chart: {
          theme: "fusion",
        },
        caption: {
          text: `${defaultOptions.coins[coin]["name"]} Price Index`,
        },
        data: dt,
        subcaption: {
          text: `In ${defaultOptions.currencies[currency][
            "name"
          ].toUpperCase()}`,
        },
        yaxis: [
          {
            plot: [
              {
                value: {
                  close: "Close",
                  high: "High",
                  low: "Low",
                  open: "Open",
                  volume: "Volume",
                },
                type: "ohlc",
              },
            ],
            format: {
              prefix: `${defaultOptions.currencies[currency]["symbol"]}`,
            },
            title: `Index Value (In ${defaultOptions.currencies[currency]["symbol"]})`,
          },
        ],
        xAxis: {
          initialInterval: {
            from: chartData[chartData.length - 10][0],
            to: chartData[chartData.length - 1][0],
          },
        },
      },
    }).render();
  });
};

updateChart = (coin, currency) => {
  Promise.all([
    loadData(
      `${liveOHLCURI}/${defaultOptions.coins[coin]["ticker"]}${defaultOptions.currencies[currency]["name"]}/?step=60&limit=1`
    ),
  ]).then(function (res) {
    let chartData = res[0].data.ohlc.map((data, index) => {
      return [
        data.timestamp,
        data.close,
        data.high,
        data.low,
        data.open,
        data.volume,
      ];
    });
    FusionCharts.items["index-chart"].feedData([...chartData]);
  });
};

updateData = (coin, currency) => {
  // logo
  let coinLogo = document.getElementById("coin-logo");
  coinLogo.src = defaultOptions.coins[coin]["logo"];
  coinLogo.alt = defaultOptions.coins[coin]["name"];
  updateKPIS(coin, currency);
  renderChart(coin, currency);

  // real-time update
  rtUpdate = window.setInterval(() => {
    updateKPIS(coin, currency);
    updateChart(coin, currency);
  }, 3000);
};

updateData(0, 0);
