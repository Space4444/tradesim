'use strict';

const { getRealTimeRates } = require('dukascopy-node');
const express = require('express');
const app = express();
const http = require('http');
const serv = http.Server(app);
const port = process.env.PORT || 2222;

app.get('/', (req, res) => {
	res.sendFile(__dirname + `/client/index.html`);
});

app.get('/loadhistory', async (req, res) => {
    const history = await loadHistory(req.query.symbol, +req.query.start, +req.query.bias);
    res.json(history);
});

app.use('/', express.static(__dirname + '/client') );

serv.listen(port);
console.log('Server is listening on ' + port);



async function loadHistory(symbol, start, bias) {
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

        return data.map( ({open, high, low, close, timestamp}) => {
            const time = timestamp - bias - 60000;
            return [time, open, high, low, close];
        });
    } catch (error) {
        console.log('error', error);
        return [];
    }
}
