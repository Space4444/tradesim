const proxyURL = 'https://cloudflare-proxy.alexkach99.workers.dev';

const instrumentMetaData = instrument_meta_data_default;

const timeframeMap = {
  tick: "TICK",
  s1: "1SEC",
  m1: "1MIN",
  m5: "5MIN",
  m15: "15MIN",
  m30: "30MIN",
  h1: "1HOUR",
  h4: "4HOUR",
  d1: "1DAY",
  mn1: "1MONTH"
};

async function getRealTimeRates({
  instrument,
  priceType = "bid",
  timeframe = "d1",
  volumes = true,
  format = "array",
  dates,
  last = 10
}) {
  const mappedTimeframe = timeframeMap[timeframe];
  const instrumentName = instrumentMetaData[instrument].name;
  const offerSide = priceType === "bid" ? "B" : "A";
  const timeDirection = "N";
  const now = new Date();
  let fromDate = now;
  let toDate = now;
  if (dates) {
    const { from, to = now } = dates;
    fromDate = typeof from === "string" || typeof from === "number" ? new Date(from) : from;
    toDate = typeof to === "string" || typeof to === "number" ? new Date(to) : to;
  } else {
    fromDate = getTimeframeLimit(timeframe, now, last || 10);
    toDate = now;
  }
  let targetTimestamp = +toDate;
  let shouldFetch = true;
  let rates = [];
  while (targetTimestamp > +fromDate && shouldFetch) {
    const fetchSeed = generateSeed();
    const urlParams = new URLSearchParams({
      path: "chart/json3",
      instrument: instrumentName,
      offer_side: offerSide,
      interval: mappedTimeframe,
      splits: "true",
      stocks: "true",
      init: "true",
      time_direction: timeDirection,
      timestamp: String(targetTimestamp),
      jsonp: `_callbacks____${fetchSeed}`
    });
    const url = `https://freeserv.dukascopy.com/2.0/index.php?${urlParams.toString()}`;
    let fetchedRates = [];
    try {
      const rawResponse = await fetch(proxyURL + '?' + url);
      
      loadBar.style.width = (+toDate - targetTimestamp) / (+toDate - +fromDate) * 100 + '%';
      
      const rawResponseText = await rawResponse.text();
      const responseClean = rawResponseText.replace(`_callbacks____${fetchSeed}(`, "").replace(");", "");
      fetchedRates = JSON.parse(responseClean);
      if (fetchedRates.length > 0) {
        const start = +new Date(fetchedRates[0][0]);
        targetTimestamp = start;
        rates.unshift(...fetchedRates);
      } else {
        shouldFetch = false;
      }
    } catch (err) {
      shouldFetch = false;
    }
  }
  const shouldSlice = !dates && (typeof last === "undefined" || typeof last === "number");
  let filteredRates = shouldSlice ? rates.slice((last || 10) * -1) : rates.filter(function(item) {
    let key = item[0];
    const isWithinBounds = item[0] >= +fromDate && item[0] < +toDate;
    const isUnique = !this.has(key);
    if (isWithinBounds && isUnique) {
      this.add(key);
      return true;
    }
    return false;
  }, /* @__PURE__ */ new Set());
  if (!volumes) {
    if (timeframe === "tick") {
      filteredRates = filteredRates.map((item) => [item[0], item[1], item[2]]);
    } else {
      filteredRates = filteredRates.map((item) => [item[0], item[1], item[2], item[3], item[4]]);
    }
  }
  const output = formatOutput({ processedData: filteredRates, format, timeframe });
  return output;
}

const headers = ["timestamp", "open", "high", "low", "close", "volume"];
const tickHeaders = ["timestamp", "askPrice", "bidPrice", "askVolume", "bidVolume"];
function formatOutput({
  processedData,
  format,
  timeframe
}) {
  if (processedData.length === 0) {
    return [];
  }
  const bodyHeaders = timeframe === "tick" /* tick */ ? tickHeaders : headers;
  if (format === "json" /* json */) {
    const data = processedData.map((arr) => {
      return arr.reduce((all, item, i) => {
        const name = bodyHeaders[i];
        all[name] = item;
        return all;
      }, {});
    });
    return data;
  }
  if (format === "csv" /* csv */) {
    const csvHeaders = bodyHeaders.filter((_, i) => processedData[0][i] !== void 0);
    const csv = [csvHeaders, ...processedData].map((arr) => arr.join(",")).join("\n");
    return csv;
  }
  return processedData;
}

function generateSeed() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 10; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function getTimeframeLimit(timeframe, now, limit) {
  const nowTimestamp = +now;
  const bufferMultiplier = 5;
  const timeframeLimits = {
    tick: 1e3,
    s1: 1e3,
    m1: 60 * 1e3,
    m5: 5 * 60 * 1e3,
    m15: 15 * 60 * 1e3,
    m30: 30 * 60 * 1e3,
    h1: 60 * 60 * 1e3,
    h4: 4 * 60 * 60 * 1e3,
    d1: 24 * 60 * 60 * 1e3,
    mn1: 30 * 24 * 60 * 60 * 1e3
  };
  return new Date(nowTimestamp - limit * bufferMultiplier * timeframeLimits[timeframe]);
}