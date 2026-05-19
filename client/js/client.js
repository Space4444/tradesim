var speed = 464;
var running = false;
var range = null;
var index = 1000;
var lastUpdate;
var restCandles = 200;
var startBalance = 10;
var deposits, coins, recordBalance;
load();

const TF = {
	'M1': 1,
	'M5': 5,
	'M15': 15,
	'M30': 30,
	'H1': 60,
	'H4': 240,
	'D1': 1440,
	'W1': 10080
};

async function play() {
	hide(menu);
	show(loading);
	const symbol = this.symbol = randomSymbol();
	[this.quote, this.base] = symbol.split('/');
	baseSpan.innerText = this.base;
	this.trader = new Trader(startBalance, 0.00001, onFill);
	this.bias = (1e4 + Math.random() * 1e5 | 0) * 86400000;
	this.data = await loadHistory(symbol, randomTime() );
	this.trader.bid = this.data[index - 1][4];
	this.trader.ask = this.trader.bid * (1 + spread);
	this.lastPrice = data[index - 1][4];
	addChart(symbol, data.slice(0, index) );
	displayPositionLines();
	hide(loading);
	show(gameBtns);
	show(balanceDiv);
	show(info);
	editable(withdrawDiv, 0, '', 1, withdraw);
	this.bot = new Bot();
	run();
}

function load() {
	deposits = +localStorage.getItem('deposits');
	if (!deposits) localStorage.setItem('deposits', deposits = startBalance);
	coins = localStorage.getItem('coins');
	if (coins === null) localStorage.setItem('coins', coins = startBalance);
	coins = +coins;
	recordBalance = +localStorage.getItem('recordBalance');
	if (!recordBalance) localStorage.setItem('recordBalance', recordBalance = startBalance);
	
	if (coins < startBalance) {
		const deposit = startBalance - coins;
		coins += deposit;
		deposits += deposit;
		localStorage.setItem('deposits', deposits);
		localStorage.setItem('coins', coins);
	}
	
	const recordROE = +( calcROE(recordBalance, startBalance) ).toFixed(2);
	const recordPNL = +(recordBalance - startBalance).toFixed(2);
	const allTimeROE = +( calcROE(coins, deposits) ).toFixed(2);
	const allTimePNL = +(coins - deposits).toFixed(2);
	
	recordROEdiv.innerText = recordROE + '%';
	recordPNLspan.innerText = recordPNL + ' ';
	allTimeROEdiv.innerText = allTimeROE + '%';
	allTimePNLspan.innerText = allTimePNL + ' ';
	depositsSpan.innerText = +(deposits).toFixed(2) + ' ';
	
	if (recordROE > 0) recordROEdiv.classList.add('text-success');
	if (recordROE < 0) recordROEdiv.classList.add('text-danger');
	if (recordPNL > 0) recordPNLspan.classList.add('text-success');
	if (recordPNL < 0) recordPNLspan.classList.add('text-danger');
	if (allTimeROE > 0) allTimeROEdiv.classList.add('text-success');
	if (allTimeROE < 0) allTimeROEdiv.classList.add('text-danger');
	if (allTimePNL > 0) allTimePNLspan.classList.add('text-success');
	if (allTimePNL < 0) allTimePNLspan.classList.add('text-danger');
}

function save() {
	var price = this.data[index - 1][4];
	if (trader.position.qty < 0) price *= (1 + spread);
	const balance = trader.balance + trader.position.getUpnl(price);
	
	localStorage.setItem('coins', coins + balance - startBalance);
	
	if (balance > recordBalance) {
		localStorage.setItem('recordBalance', recordBalance = balance);
	}
}

function calcROE(coins, deposits) {
	return (coins / deposits - 1) * 100;
}

resumeBtn.onclick = e => {
	if (restCandles <= 0 || index >= this.data.length) return;
	running = true;
	lastUpdate = Date.now();
	hide(resumeBtn);
	show(pauseBtn);
};

pauseBtn.onclick = e => {
	displayPNL(this.data[index - 1][4]);
	running = false;
	range = null;
	hide(pauseBtn);
	show(resumeBtn);
};

function run() {
	if (range) chart.selectRange(...range);
	chart.draw();
	if (running) update();
	requestAnimationFrame(run);
}

function displayBalance(balance) {
	balanceText.innerText = +balance.toFixed(4) + ' ' + this.quote;
}

$('#slider').on('input change', () => {
	speed = 60 ** (1 + slider.value / 100) | 0;
});

function randomSymbol() {
	return symbols[0 | Math.random() * symbols.length];
}

function randomTime() {
	//		01.02.2010								         	      01.02.2010	 100 days
	return 1264975200000 + parseInt( Math.random() * ( Date.now() - 1264975200000 - 8640000000) );
}

function addChart(symbol, data) {
	const table = this.table = anychart.data.table();
	table.addData(data);
	
	const mapping = table.mapAs({'open': 1, 'high': 2, 'low': 3, 'close': 4});
	
	const chart = this.chart = anychart.stock();
	const scale = this.scale = chart.xScale();
	scale.maximumGap({intervalsCount: 40, unitType: 'minutes', unitCount: 5});

	chart.scroller().enabled(false);

	const plot = this.plot = chart.plot(0);
	const series = plot.candlestick(mapping);
	addAsk(table, mapping);
	
	plot.legend(false);
	series.name(symbol);
	series.risingFill('#26a69a');
	series.risingStroke('#26a69a');
	series.fallingFill('#ef5350');
	series.fallingStroke('#ef5350');
	
	plot.yAxis().orientation('right');
	chart.left(-60);
	chart.right(25);
	chart.bottom(-25);
	chart.top(-15);
	
	const crosshair = chart.crosshair();
	crosshair.displayMode('float');
	
	const indicator = plot.priceIndicator(0, {
		value: 'last-visible',
		risingStroke: {color: '#26a69a', dash: '2 2'},
		risingLabel: {background: '#26a69a'},
		fallingStroke: {color: '#ef5350', dash: '2 2'},
		fallingLabel: {background: '#ef5350'}
	});
	
	chart.title(symbol);
	this.oldZoom = 700;
	chart.background().fill('#0c0d16');
	
	const div = document.createElement('div');
	div.id = symbol;
	div.classList.add('chart');
	div.style.height = innerHeight * 2 / 3 + 'px';
	info.style.height = innerHeight * 1 / 3 + 'px';
	posDiv.style.height = innerHeight * 1 / 3 + 'px';
	ordDiv.style.height = innerHeight * 1 / 3 + 'px';
	ordersDiv.style.height = innerHeight * 1 / 3 - 20 + 'px';
	ordersDiv.style.overflowY = 'auto';
	
	const yScale = this.yScale = plot.yScale();
	waitFor( () => this['ac_rect_9'])
		.then(res => {
			res.style.cursor = 'crosshair';
			res.onwheel = e => zoom(e, chart);
			res.oncontextmenu = e => onContextMenu(e);
			res.onclick = e => {
				hide(contextMenu);
				if (this.limitGridding) processLimitGrid();
			};
			this[symbol].onmousedown = e => stopEditing();
			const e = div.getElementsByClassName('anychart-credits')[0];
			e.parentNode.removeChild(e);
		});
	
	const fieldset = document.getElementsByTagName('fieldset')[0];
	fieldset.insertBefore(div, fieldset.children[0]);
	chart.container(symbol);
	chart.draw();
	
	this.grouping = chart.grouping();
	grouping.forced(true);
	updateRange();
	
	chart.autoRedraw(false);
}

function addAsk(dataTable, mapping) {
	const computer = dataTable.createComputer(mapping);
	computer.addOutputField('Ask', 'Ask');
	computer.setCalculationFunction(row => {
		row.set('Ask', +( +row.get('close') * (1 + spread) ).toFixed(5) );
	});

	const computedMapping = dataTable.mapAs({'value': 'Ask'});
	const computedLine = this.plot.line(computedMapping);
	computedLine.name('Ask');
	computedLine.stroke('#ffa000 0.6');
}

function onContextMenu(e) {
	this.price = getPrice();
	
	contextMenu.style.left = e.clientX + 200 > innerWidth ? e.clientX - 200 + 'px' : e.clientX + 'px';
	contextMenu.style.top = e.clientY + 'px';
	priceInput.value = this.price;
	const maxQty = Math.max(trader.balance * this.price * maxLeverage - 1, Math.abs(trader.position.qty) );
	qtyInput.value = +Math.exp(qtySlider.value * Math.log(maxQty) / 100) | 0;
	show(contextMenu);
}

function getPrice() {
	const sizes = this.sizes = ac_rect_9.getAttribute('d').split(' ');
	const y = 1 - (this.mouseEvent.clientY - +sizes[5]) / (+sizes[7] - +sizes[5]);
	return +(this.yScale.min + y * (this.yScale.max - this.yScale.min) ).toFixed(5);
}

onmousemove = onmousedown = e => {
	this.mouseEvent = e;
	if (!this.movingOrder && !this.movingLevel) return;
	
	const y = 1 - (e.clientY - +this.sizes[5]) / (+this.sizes[7] - +this.sizes[5]);
	const price = this.price = +(this.yScale.min + y * (this.yScale.max - this.yScale.min) ).toFixed(5);
	moveLevel(this.movingOrder || this.movingLevel, price, !this.movingLevel);
};

onmouseup = e => {
	if (this.movingOrder) {
		amendOrder(this.movingOrder, this.price);
		delete this.movingOrder;
	} else if (this.movingLevel) {
		delete this.movingLevel;
	}
	if (range) {
		chart.selectRange( ...Object.values(range) );
		range = null;
	}
};

onkeyup = e => {
	if (e.key === ' ' || e.code === 'Space' || e.keyCode == 32) {
		if (this.limitGridding) {
			stopLimitGrid();
		} else {
			startLimitGrid();
		}
	}
};

function moveLevel(id, price, isOrder = false) {
	const i = levelLines[id];
	const order = isOrder ? trader.orders.find(v => v.id === id) : null;
	this.plot.textMarker(i, {
		value: price,
		text: (isOrder ? order.type + ' ' + order.qty + ' @ ' : '') + price
	});
	this.plot.textMarker(i + 1, { value: price });
	this.plot.lineMarker(i / 2 + 1, { value: price });
}

$('#qtySlider').on('input change', () => {
	const maxQty = Math.max(trader.balance * this.price * maxLeverage - 1, Math.abs(trader.position.qty) );
	qtyInput.value = +Math.exp(qtySlider.value * Math.log(maxQty) / 100) | 0;
});

$('#qtyInput').on('input change', () => {
	const maxQty = Math.max(trader.balance * this.price * maxLeverage - 1, Math.abs(trader.position.qty) );
	qtyInput.value = +(+qtyInput.value).toFixed() || ( +Math.exp(qtySlider.value * Math.log(maxQty) / 100) | 0);
	qtySlider.value = 100 * Math.log(+qtyInput.value + 1) / Math.log(trader.balance * this.price * maxLeverage);
});

async function update() {
	const candleCount = speed / 60 * ( Date.now() - lastUpdate) / 1000 | 0;
	if (candleCount === 0) return;
	if (trader.balance === 0 && trader.position.qty === 0) {
		if ( (restCandles -= candleCount) <= 0) {
			pauseBtn.click();
		}
	}
	
	lastUpdate = Date.now();
	const candles = this.data.slice(index, index + candleCount);
	this.table.addData(candles);
	if (this.table.lc.b.length > 10000) table.remove(data[0][0], table.lc.b[table.lc.b.length - 10000].key);
	this.lastPrice = candles[candles.length - 1][4];
	updateOrders(candles);
	const pTime = this.data[index - 1][0];
	const time = this.data[index + candleCount - 1][0];
	this.scale.maximumGap({intervalsCount: 0});
	this.scale.maximumGap({intervalsCount: 40});
	range = updateRange();
	displayPNL(this.data[index - 1][4]);
	index += candleCount;
	//for (const candle of candles) {
	//	bot.trade(candle);
	//}
	if (index >= this.data.length) {
		pauseBtn.click();
	}
}

function displayPNL(price) {
	if (trader.position.qty < 0) price *= (1 + spread);
	const pnl = trader.position.getUpnl(price);
	posPNL.innerText = +(+pnl).toFixed(4) + ' ' + this.quote;
	if ( Math.sign(pnl) !== Math.sign(this.pnl) ) {
		updatePosLineColor(pnl);
	}
	this.pnl = pnl;
	if (pnl > 0) {
		posPNL.classList.remove('text-danger');
		posPNL.classList.add('text-success');
	} else if (pnl < 0) {
		posPNL.classList.remove('text-success');
		posPNL.classList.add('text-danger');
	} else {
		posPNL.classList.remove('text-success');
		posPNL.classList.remove('text-danger');
	}
	save();
}

function updateOrders(candles) {
	for (const [time, open, high, low, close] of candles) {
		trader.updateLiq(high);
		trader.updateLiq(low);
		
		if (trader.balance <= 0) return;
		
		trader.updateStops(high * (1 + spread) );
		trader.updateStops(low);
		trader.updateLimits(high, high * (1 + spread) );
		trader.updateLimits(low, low * (1 + spread) );
		trader.bid = close;
		trader.ask = close * (1 + spread);
	}
}

function updateRange() {
	const data = this.table.lc.b;
	const first = data[ Math.max(0, data.length - 1 - this.oldZoom + 200) ].values[0];
	const last = data[data.length - 1].values[0] + 40 * 300000;
	chart.selectRange(first, last);
	return [first, last];
}

// async function loadHistory(symbol, start) {
	// return new Promise( (resolve, reject) => {
		// const WS = new WebSocket('wss://ifccd.net:2053/');
		
		// WS.onopen = e => WS.send( JSON.stringify({
		// 	cmd: 'history',
		// 	from: start / 1000,
		// 	period: 1,
		// 	symbol: symbol.replace('/', ''),
		// 	to: start / 1000 + 86400 * 100
		// }) );
	
		// WS.onmessage = e => {
		// 	var data = JSON.parse(e.data).list;
		// 	data = data.map( ({open, high, low, close, ctm}) => {
		// 		const time = new Date(new Date(ctm).getTime() - this.bias - 60000).getTime();
		// 		return [time, +open, +high, +low, +close];
		// 	});
		// 	resolve(data);
		// 	WS.close();
		// };
	// });
// }

async function loadHistory(symbol, start) {
    try {
        const data = await getRealTimeRates({
            instrument: symbol.replace('/', '').toLowerCase(),
            dates: {
                from: new Date(start),
                to: new Date(start + 86400000 * 100)
            },
            timeframe: 'm1',
            format: 'json'
        });

        if (data.length === 0) {
            return await (await fetch(`/loadhistory?symbol=${symbol}&start=${start}&bias=${this.bias}`) ).json();
        }

        return data.map( ({open, high, low, close, timestamp}) => {
            const time = timestamp - this.bias - 60000;
            return [time, open, high, low, close];
        });
    } catch (error) {
        alert(`error: ${error}`);
        return [];
    }
}

function zoom(e, chart) {
	e.preventDefault();
	const newZoom = Math.max(30, Math.min(300000, +(this.oldZoom * (e.deltaY > 0 ? 1.1 : 0.9)).toFixed() ) );
	if (newZoom === this.oldZoom) return;
	
	const data = this.table.lc.b;
	const lastVisible = chart.getSelectedRange().lastVisible;
	var lastBarI = data.findIndex(v => v.key === lastVisible);
	lastBarI = ~lastBarI ? lastBarI : data.length - 1 + ( (lastVisible - new Date(data[data.length - 1].values[0]).getTime() ) / 60000 | 0);
	const firstBarI = Math.min(data.length - 1, Math.max(0, lastBarI - newZoom) );
	chart.selectRange(data[firstBarI].values[0], lastVisible);
	
	setGrouping(this.oldZoom = lastBarI - firstBarI);
}

function setGrouping(zoom) {
	if (zoom < 450) {
		chart.grouping().levels([{unit: 'minute', count: 1}]);
	} else if (zoom < 2250) {
		chart.grouping().levels([{unit: 'minute', count: 5}]);
	} else if (zoom < 6750) {
		chart.grouping().levels([{unit: 'minute', count: 15}]);
	} else if (zoom < 13500) {
		chart.grouping().levels([{unit: 'minute', count: 30}]);
	} else if (zoom < 27000) {
		chart.grouping().levels([{unit: 'hour', count: 1}]);
	} else if (zoom < 54000) {
		chart.grouping().levels([{unit: 'hour', count: 2}]);
	} else if (zoom < 162000) {
		chart.grouping().levels([{unit: 'hour', count: 6}]);
	} else if (zoom < 324000) {
		chart.grouping().levels([{unit: 'hour', count: 12}]);
	} else {
		chart.grouping().levels([{unit: 'day', count: 1}]);
	}
}

document.oncontextmenu = e => e.preventDefault();

function hide(e) {
	e.style.display = 'none';
}

function show(e) {
	e.style.display = '';
}

function waitFor(f, time) {
	return new Promise( (res, rej) => {
		const r = f();
		if (r) {
			res(r);
		} else {
			setTimeout( () => res( waitFor(f, time) ), time);
		}
	});
}

