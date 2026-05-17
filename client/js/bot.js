class Bot {
	constructor() {
		this.len = 1;
		this.multiplier = 100;
		this.minQty = 0.1;
		this.lotSize = 1;
		this.tickSize = Math.max(0.00001, +(data[0][1] / 50000).toFixed(5) );
		this.maArr = [];
		this.maSum = 0;
	}
	
	trade(candle) {
		this.bid = candle[4];
		this.ask = this.bid * (1 + spread);
		this.updateMa();
		if (!this.ma) return;
		
		trader.deleteAllOrders();
		const buyPrice = this.getPrice(1);
		if (buyPrice) {
			const qty = this.getQty(buyPrice);
			if (qty > 0) addOrder('Limit', qty, buyPrice);
		}
		const sellPrice = this.getPrice(-1);
		if (sellPrice) {
			const qty = this.getQty(sellPrice);
			if (qty < 0) addOrder('Limit', qty, sellPrice);
		}
	}

	getQty(price) {
		var offset = Math.atan( Math.log2(price / this.ma) ) * 2 / Math.PI * this.multiplier;
		
		const usd = -trader.position.qty;
		const btc = trader.balance + trader.position.qty / price;
		
		const newUsd = (usd + btc * price) * 0.5 * (offset + 1);
		const qty = usd - newUsd;
		
		return qty > 0 ? Math.floor(qty) : Math.ceil(qty);
	}

	getPrice(distQty) {
		const buying = distQty > 0;
		const start = buying ? this.bid : this.ask;
		const step = (buying ? -this.tickSize : this.tickSize) * 10;
		const stop = buying ? start / 1.01 : start * 1.01;
		distQty = Math.abs(distQty);
		for (var price = start; buying ? price > stop : price < stop; price += step) {
			const qty = this.getQty(price);
			const min = Math.max(this.lotSize, distQty, trader.balance * price * this.minQty);
			if (buying ? qty >= min : qty <= -min) {
				return price;
			}
		}
	}
	
	updateMa() {
		const price = (this.bid + this.ask) / 2;
		this.maArr.push(price);
		this.maSum += price;
		
		if (this.maArr.length > this.len) {
			this.maSum -= this.maArr.shift();
		}
		
		if (this.maArr.length === this.len) {
			this.ma = this.maSum / this.len;
		}
	}
}