# Tradesim

![Banner](https://github.com/user-attachments/assets/12cc695b-f64f-4434-b059-2a35416e98f1)

## Introduction

This is forex trading simulator written in JavaScript. It was made to help learning intraday trading.

## [Web demo](https://space4444.github.io/tradesim)

## Features
- Automatic downloading random Forex pair history
- Limit and stop orders
- Ability to mark price levels
- Virtual money withdrawal
- Automatic detection of new order price by clicking on the chart
- Ability to move orders on chart
- Adjusting speed of price movement
- Saving trading statistics

## Tech stack
- [Bootstrap](https://getbootstrap.com/)

## Overview

Firstly, it downloads 100 days of 1m historical data
of random forex pair and random time range from Dukascopy. Then it adds a random number to all dates displayed on the chart.
This is done in order to make remembering charts more difficult.

Then price candles are displayed on the chart and you can start simulated trading.
Chart zooming automatically adjusts candles timeframe. Also you can place horisontal levels at the chart.

To place order, right-click on a chart at the desired price level, specify order volume and choose between limit and stop order types.
You can modify pending orders' prices and volumes in the control panel or just drag them on the chart to change price.

Also you can withdraw virtual money to prevent accidental liquidation of all balance.
You trading summary is saved and displayed at the main page.
