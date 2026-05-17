var fee = 0;
var spread = 0.00015;
var maxLeverage = 1000;
var levelLines = {};
var levels = [];
var editing;
var limitGridLevels = [];

function buyLimit() {
	if ( trader.checkFunds('Buy', +qtyInput.value, +priceInput.value) ) return;
	hide(contextMenu);
	addOrder('Limit', +qtyInput.value, +priceInput.value);
}

function sellLimit() {
	if ( trader.checkFunds('Sell', +qtyInput.value, +priceInput.value) ) return;
	hide(contextMenu);
	addOrder('Limit', -qtyInput.value, +priceInput.value);
}

function buyStop() {
	if ( trader.checkFunds('Buy', +qtyInput.value, +priceInput.value) ) return;
	hide(contextMenu);
	addOrder('Stop', +qtyInput.value, +priceInput.value);
}

function sellStop() {
	if ( trader.checkFunds('Sell', +qtyInput.value, +priceInput.value) ) return;
	hide(contextMenu);
	addOrder('Stop', -qtyInput.value, +priceInput.value);
}

function startLimitGrid() {
	show(riskDiv);
	this.limitGridding = 1;
}

function processLimitGrid() {
	switch (this.limitGridding) {
		case 1:
			limitGridLevels.push( getPrice() );
			this.limitGridding++;
			break;
		case 2:
			limitGridLevels.push( getPrice() );
			this.limitGridding++;
			break;
		case 3:
			limitGridLevels.push( getPrice() );
			const limitGridSteps = +stepsInput.value || 1;
			if (limitGridSteps === 1) {
				setLimitGrid(...limitGridLevels);
				limitGridLevels.length = 0;
				hide(riskDiv);
				this.limitGridding = 0;
			} else {
				this.limitGridding++;
			}
			break;
		case 4:
			limitGridLevels.push( getPrice() );
			setLimitGrid(...limitGridLevels);
			limitGridLevels.length = 0;
			hide(riskDiv);
			this.limitGridding = 0;
			break;
	}
}

function setLimitGrid() {
	var entry1, entry2, stopLoss, takeProfit;
	if (arguments.length === 4) {
		[entry1, entry2, stopLoss, takeProfit] = [...arguments];
	} else {
		[entry1, stopLoss, takeProfit] = [...arguments];
		entry2 = entry1;
	}
	const limitGridSteps = +stepsInput.value || 1;
	const long = entry1 < lastPrice;
	var qty;
	if (!riskInput.value) qty = limitGridSteps;
	else {
		const entry = (entry1 + entry2) / 2;
		const risk = +riskInput.value;
		qty = Math.abs(trader.balance * risk * 0.01 / (1 / entry - 1 / stopLoss) );
	}
	const sizeOne = Math.max(1, qty / limitGridSteps | 0);
	const totalSize = sizeOne * limitGridSteps;
	if (limitGridSteps === 1) {
		addOrder('Limit', long ? sizeOne : -sizeOne, entry1);		
	} else {
		const step = (entry2 - entry1) / (limitGridSteps - 1);
		for (var i = 0; i < limitGridSteps; i++) {
			const price = +(entry1 + i * step).toFixed(5);
			addOrder('Limit', long ? sizeOne : -sizeOne, price);
		}
	}
	addOrder('Stop', long ? -totalSize : totalSize, stopLoss, true);
	addOrder('Limit', long ? -totalSize : totalSize, takeProfit, true);
}

function stopLimitGrid() {
	limitGridLevels.length = 0;
	hide(riskDiv);
	this.limitGridding = 0;
	trader.deleteAllOrders();
}

function addOrder(type, size, price, closing) {
	const id = creatId();
	
	trader.addOrder(type, size > 0 ? 'Buy' : 'Sell', price, Math.abs(size), id, closing);
	if (type === 'Limit') {
		trader.updateLimits(trader.bid, trader.ask, true);
	} else {
		trader.updateStops(size > 0 ? trader.ask : trader.bid, true);
	}
	
	const orders = type === 'Limit' ? trader.limits : trader.stops;
	const exist = orders.length !== 0 && orders[orders.length - 1].id === id;
	if (exist) {
		displayOrder(type, size, price, id, closing);
	}
}

function amendOrder(id, price, qty) {
	const order = trader.orders.find(v => v.id === id);
	if (price) {
		order.price = price;
		this[id].children[2].firstChild.innerText = price;
		if (order.type === 'Limit') {
			trader.updateLimits(trader.bid, trader.ask, true);
		} else {
			trader.updateStops(order.side === 'Buy' ? trader.ask : trader.bid, true);
		}
	}
	if (qty) {
		order.qty = Math.abs(qty);
		this.plot.textMarker(levelLines[id], {
			text: order.type + ' ' + Math.abs(qty) + ' @ ' + order.price
		});
		this[id].children[1].firstChild.innerText = qty;
	}
}

function onFill(order) {
	deleteOrder(order.id);
	displayBalance(trader.balance);
	displayPosition();
}

function deleteOrder(id) {
	const order = trader.orders.find(v => v.id === id);
	order && trader.deleteOrder(order);
	
	if (id in levelLines) deleteLevelLine(id);
	if (id in this) ordersDiv.removeChild(this[id]);
}

function closePos() {
	var price = this.data[index - 1][4];
	if (trader.position.qty < 0) price *= (1 + spread);
	trader.closePosition(price);
}

function withdraw(amount) {
	var price = this.data[index - 1][4];
	if (trader.position.qty < 0) price *= (1 + spread);
	const upnl = trader.position.getUpnl(price);
	
	amount = Math.min(amount, trader.balance, trader.balance + upnl);
	coins += amount;
	trader.balance -= amount;
	displayBalance(trader.balance);
	displayPosition();
	save();
}

function stopEditing() {
	if (!editing) return;
	show(editing.children[0]);
	hide(editing.children[1]);
	editing = null;
}

function editable(elem, min, max, step, callback) {
	const firstChild = elem.firstChild;
	firstChild.onmouseover = e => document.body.classList.add('pencil');
	firstChild.onmouseout = e => document.body.classList.remove('pencil');
	
	const row = document.createElement('div');
	hide(row);
	row.classList.add('row');
	const cancelBtn = document.createElement('div');
	cancelBtn.innerText = 'X';
	cancelBtn.classList.add('form-group', 'col-2', 'btn', 'btn-sm', 'btn-warning');
	const inputCol = document.createElement('div');
	inputCol.classList.add('input-group', 'mb-3', 'form-group', 'col-8', 'text-warning');
	const input = document.createElement('input');
	input.classList.add('form-control');
	input.style.fontSize = '11px';
	inputCol.appendChild(input);
	input.setAttribute('type', 'number');
	input.setAttribute('min', min);
	input.setAttribute('max', max);
	input.setAttribute('step', step);
	const applyBtn = document.createElement('div');
	applyBtn.classList.add('form-group', 'col-2', 'btn', 'btn-sm', 'btn-success');
	applyBtn.innerText = '✅';
	
	row.appendChild(cancelBtn);
	row.appendChild(inputCol);
	row.appendChild(applyBtn);
	elem.appendChild(row);
	
	applyBtn.onclick = e => {
		show(firstChild);
		hide(row);
		callback(+input.value);
		editing = null;
	}
	
	cancelBtn.onclick = e => {
		show(firstChild);
		hide(row);
		editing = null;
	}
	
	const digits = (step + '').replace('0.', '').length;
	$(input).on('input change', () => {
		input.value = +(+input.value).toFixed(digits);
	});
	
	firstChild.onclick = e => {
		stopEditing();
		hide(firstChild);
		show(row);
		document.body.classList.remove('pencil');
		input.value = firstChild.innerText;
		editing = elem;
	};
}

function displayOrder(type, size, price, id, closing) {
	const row = document.createElement('div');
	row.classList.add('row');
	const typeDiv = document.createElement('div');
	typeDiv.classList.add('form-group', 'col-3', type === 'Limit' ? 'text-info' : 'text-warning');
	typeDiv.innerText = type;
	
	const sizeDiv = document.createElement('div');
	sizeDiv.classList.add('form-group', 'col-4', size > 0 ? 'text-success' : 'text-warning');
	const sizeDivText = document.createElement('div');
	sizeDivText.classList.add('editable');
	sizeDivText.innerText = size;
	sizeDiv.appendChild(sizeDivText);
	editable(sizeDiv, size > 0 ? 1 : -10000000, size > 0 ? 10000000 : -1, 1, v => amendOrder(id, null, v) );
	
	const priceDiv = document.createElement('div');
	priceDiv.classList.add('form-group', 'col-4');
	const priceDivText = document.createElement('div');
	priceDivText.classList.add('editable');
	priceDivText.innerText = price;
	priceDiv.appendChild(priceDivText);
	editable(priceDiv, 0.00001, '', 0.00001, v => { moveOrder(id, v); amendOrder(id, v) } );
	
	const xBtnCol = document.createElement('div');
	xBtnCol.classList.add('form-group', 'col-1');
	const xBtn = document.createElement('button');
	xBtn.classList.add('btn', 'btn-danger', 'btn-sm');
	xBtn.onclick = e => deleteOrder(id);
	xBtn.innerText = 'X';
	xBtn.style.position = 'absolute';
	xBtn.style.left = '0px';
	xBtnCol.appendChild(xBtn);
	row.appendChild(typeDiv);
	row.appendChild(sizeDiv);
	row.appendChild(priceDiv);
	row.appendChild(xBtnCol);
	ordersDiv.appendChild(row);
	row.id = id;
	displayOrderLine(type, size, price, id, closing);
}

function displayOrderLine(type, size, price, id, closing) {
	const color = closing ? size > 0 ? '#0eb6ff' : '#ff3dff' : size > 0 ? '#0eb600' : '#ff3d00';
	displayLevelLine(price, id, type + ' ' + Math.abs(size) + ' @ ', color, true);
}

function displayLevelLine(price, id, text = '', color = '#ffff00', isOrder = false) {
	const vals = Object.values(levelLines);
	for (var index = 2, l = (trader.orders.length + levels.length) * 2; index <= l; index += 2) {
		if ( !~vals.indexOf(index) ) break;
	}
	const i = levelLines[id] = index;
	
	this.plot.textMarker(i, {
		value: price,
		text: text + price,
		align: 'left',
		fontColor: '#000',
		background: {fill: color},
		width: isOrder ? 175 : 100,
		hAlign: 'center'
	});
	this.plot.textMarker(i + 1, {
		value: price,
		text: 'X',
		align: 'left',
		fontColor: color,
		background: {fill: '#000', stroke: color},
		width: 15,
		offsetX: isOrder ? 175 : 100,
		hAlign: 'center'
	});
	this.plot.lineMarker(i / 2 + 1, {
		value: price,
		stroke: {
			color,
			dash: '5 5'
		}
	});
	listenLine(id, isOrder);
}

function deleteLevel(id) {
	const i = levels.indexOf(id);
	if (~i) levels.splice(i, 1);
	if (id in levelLines) deleteLevelLine(id);
}

function deleteLevelLine(id) {
	const i = levelLines[id];
	delete levelLines[id];
	this.plot.textMarker(i).enabled(false);
	this.plot.textMarker(i + 1).enabled(false);
	this.plot.lineMarker(i / 2 + 1).enabled(false);
	document.body.style.cursor = '';
}

function listenLine(id, isOrder) {
	const i = levelLines[id];
	this.plot.textMarker(i).removeAllListeners();
	this.plot.textMarker(i).addEventListener('mouseDown', e => {
		if (isOrder) this.movingOrder = id;
		else this.movingLevel = id;
		range = Object.values( chart.getSelectedRange() );
	});
	this.plot.textMarker(i + 1).addEventListener('mouseDown', e => {
		range = Object.values( chart.getSelectedRange() );
	});
	this.plot.textMarker(i + 1).addEventListener('click', e => {
		if (isOrder) deleteOrder(id);
		else deleteLevel(id);
	});
	this.plot.textMarker(i).addEventListener('mouseOver', e => document.body.style.cursor = 'pointer');
	this.plot.textMarker(i).addEventListener('mouseOut', e => document.body.style.cursor = '');
	this.plot.textMarker(i + 1).addEventListener('mouseOver', e => document.body.style.cursor = 'pointer');
	this.plot.textMarker(i + 1).addEventListener('mouseOut', e => document.body.style.cursor = '');
}

function addLevel() {
	const id = creatId();
	displayLevelLine(+priceInput.value, id);
	levels.push(id);
	hide(contextMenu);
}

function displayPosition() {
	const qty = posSize.innerText = trader.position.qty;
	if (qty > 0) {
		show(posCloseBtn);
		posSize.classList.remove('text-danger');
		posSize.classList.add('text-success');
	} else if (qty < 0) {
		show(posCloseBtn);
		posSize.classList.remove('text-success');
		posSize.classList.add('text-danger');
	} else {
		hide(posCloseBtn);
		posSize.classList.remove('text-success');
		posSize.classList.remove('text-danger');
	}
	posEntry.innerText = +(+trader.position.entry).toFixed(5) || '-';
	
	const liq = trader.position.getLiqPrice(trader.balance);
	posLiq.innerText = liq > 0 ? +(+liq).toFixed(5) : '-';
	if (liq > 0) {
		posLiq.classList.add('text-warning');
	} else {
		posLiq.classList.remove('text-warning');
	}
	displayPositionLines(liq);
	displayPNL(trader.bid);
}

function displayPositionLines(liq) {
	const entry = +(+trader.position.entry).toFixed(5);
	const color = this.pnl > 0 ? '#0eb600' : '#ff3d00';
	this.plot.textMarker(0, {
		value: entry,
		text: this.quote + this.base + ': ' + trader.position.qty + ' Cont @ ' + entry,
		align: 'left',
		fontColor: '#000',
		background: {fill: color},
		hAlign: 'center'
	});
	this.plot.lineMarker(0, {
		value: entry,
		stroke: {
			color,
			dash: '5 5'
		}
	});
	
	this.plot.textMarker(1, {
		value: liq,
		text: 'Liquidation',
		align: 'left',
		fontColor: '#000',
		background: {fill: '#7f007f'}
	});
	this.plot.lineMarker(1, {
		value: liq,
		stroke: {
			color: '#7f007f',
			dash: '7 7'
		}
	});
}

function updatePosLineColor(pnl) {
	const color = pnl > 0 ? '#0eb600' : '#ff3d00';
	this.plot.textMarker(0, {
		background: {fill: color}
	});
	this.plot.lineMarker(0, {
		stroke: {
			color,
			dash: '5 5'
		}
	});
}

function creatId() {
	return ( Math.random() + '').replace('0.', 'id');
}

class Trader {
	constructor(balance, tickSize, onFill) {
		this.balance = balance;
		this.position = new Position(fee, tickSize);
		this.limits = [];
		this.stops = [];
		this.onFill = onFill;
		this.bid = 0;
		this.ask = Infinity;
		displayBalance(balance);
	}
	
	fillOrder(order, fee, i, instantly, currentPrice) {
		if (order.closing) order.qty = Math.min(order.qty, Math.abs(this.position.qty) );
		const long = order.side === 'Buy';
		const qty = long ? order.qty : -order.qty;
		const price = order.type === 'Limit'
			?
				instantly
					? 
						(long ? Math.min(order.price, this.ask) : Math.max(order.price, this.bid) )
					:
						order.price
					
			:
				instantly
					? 
						(long ? Math.max(order.price, this.ask) : Math.min(order.price, this.bid) )
					:
				        order.price;//(long ? Math.max(order.price, currentPrice) : Math.min(order.price, currentPrice) );
		this.position.fee = fee;
		this.balance = this.position.change(qty, price, this.balance);
		this.deleteOrder(order, i);
		
		this.onFill && this.onFill(order);
	}
	
	addOrder(type, side, price, qty, id, closing) {
		const orders = type === 'Limit' ? this.limits : this.stops;
		const order = new Order(type, side, price, qty, id, closing);
		orders.push(order);
		return order;
	}
	
	changeOrder(order, key, val) {
		order[key] = val;
	}
	
	deleteOrder(order, i) {
		const orders = order.type === 'Limit' ? this.limits : this.stops;
		i = i || orders.indexOf(order);
		if (~i) orders.splice(i, 1);
	}
	
	get orders() {
		return this.limits.concat(this.stops);
	}
	
	updateLimits(bid, ask, instantly) {
		this.bid = bid;
		this.ask = ask;
		for (var i = this.limits.length; i--;) {
			const order = this.limits[i];
			if (order.side === 'Buy' && ask <= order.price || order.side === 'Sell' && bid >= order.price) {
				if (order.closing) {
					if (this.position.qty)
					if ( (this.position.qty > 0) === (order.side === 'Buy') ) {
						deleteOrder(order.id);
					} else {
						this.fillOrder(order, fee, i, instantly);
						this.deleteAllOrders();
						break;
					}
				} else {
					if ( this.checkFunds(order.side, order.qty, order.price) ) {
						deleteOrder(order.id);
					} else {
						this.fillOrder(order, fee, i, instantly);
					}
				}
			}
		}
	}
	
	updateStops(price, instantly) {
		if ( this.position.getUpnl(price) + this.balance <= 0) {
			this.balance = 0;
			return;
		}
		
		for (var i = this.stops.length; i--;) {
			const order = this.stops[i];
			if (order.side === 'Buy' && price >= order.price || order.side === 'Sell' && price <= order.price) {
				if (order.closing) {
					if (this.position.qty)
					if ( (this.position.qty > 0) === (order.side === 'Buy') ) {
						deleteOrder(order.id);
					} else {
						this.fillOrder(order, fee, i, instantly, price);
						this.deleteAllOrders();
						break;
					}
				} else {
					if ( this.checkFunds(order.side, order.qty, order.price) ) {
						deleteOrder(order.id);
					} else {
						this.fillOrder(order, fee, i, instantly, price);
					}
				}
			}
		}
	}
	
	updateLiq(price) {
		if ( this.position.getUpnl(price) <= -this.balance) {
			this.closePosition(price);
			this.deleteAllOrders();
		}
	}
	
	closePosition(price) {
		this.balance = this.position.change(-this.position.qty, price, this.balance);
		displayPosition();
		displayBalance(this.balance);
	}
	
	deleteAllOrders() {
		for (const ord of this.orders) {
			deleteOrder(ord.id);
		}
	}
	
	checkFunds(side, qty, price) {
		const sign = side === 'Buy' ? 1 : -1;
		const resultQty = Math.abs(this.position.qty + qty * sign);
		return qty <= 0 || resultQty > Math.abs(this.position.qty) && resultQty >= this.balance * price * maxLeverage;
	}
}

class Position {
	constructor(fee, tickSize) {
		this.fee = fee;
		this.tickSize = tickSize;
		this.qty = this.entry = 0;
	}
	
	change(qty, price, balance, intQty = true) {
		if (qty === 0) return balance;
		
		price = this.round(price, this.tickSize);
		if (intQty) qty = qty > 0 ? Math.floor(qty) : Math.ceil(qty);
		
		if (balance <= 0 || (1 / price - 1 / this.entry) * this.qty > balance) {
			this.qty = this.entry = 0;
			return 0;
        }
		if ( Math.sign(qty) !== Math.sign(this.qty) ) {
			const closingQty = Math.sign(qty) * Math.min( Math.abs(qty), Math.abs(this.qty) );
			var profit = this.reduce(closingQty, price);
			qty -= closingQty;
        }
		this.entry = +( (this.qty * this.entry + qty * price) / (this.qty + qty) ).toFixed(8) || 0;
		this.qty += qty;
		return +(balance + (profit || 0) - Math.abs(qty) / price * this.fee).toFixed(8);
    }
	
	reduce(qty, exit) {
		this.qty += qty;
		
		return (1 / exit - 1 / this.entry) * qty - Math.abs(qty) / exit * this.fee;
    }
	
	round(v, tickSize) {
		return Math.round(v / tickSize) * tickSize;
    }
	
	getUpnl(price) {
		return this.qty ? (1 / this.entry - 1 / price) * this.qty : 0;
    }
	
	getLiqPrice(balance) {
		return 1 / (1 / this.entry + balance / this.qty);
	}
}

class Order {
	constructor(type, side, price, qty, id, closing) {
		this.type = type;
		this.side = side;
		this.price = price;
		this.qty = qty;
		this.id = id || Math.random();
		this.closing = closing;
	}
}

