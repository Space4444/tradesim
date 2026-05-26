# Tradesim

![Banner](https://github.com/user-attachments/assets/12cc695b-f64f-4434-b059-2a35416e98f1)

## Introduction

This is forex trading simulator written in JavaScript. It was made to help learning intraday trading.

Firstly, it downloads 100 days of 1m historical data
of random forex pair and random time range from Dukascopy. Then it adds a random number to all dates displayed on the chart.
This is done in order to make charts more difficult to remember.
Then price candlesticks are displayed on the chart and you can start simulated trading.

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
- [Dukascopy API](https://www.dukascopy.com/trading-tools/api/documentation)

## Usage

At the top left corner you can pause/resume and adjust speed of the simulation.

Chart zooming is done by scrolling mouse wheel. The candlestick time interval is automatically adjusted if the scale is too large or too small.

Right-click on any place at the chart to open context menu. By default, order price will be equal to the one where you clicked on the chart.
At the context menu you can input order price and volume, change the volume by moving slider, select between limit or stop order and
place horizontal lines on the chart to mark price levels.

You can modify prices and volumes or pending orders in the control panel. Prices can also be changed by dragging orders on the chart.

Informaion about opened position is displayed at the bottom left section.

Also you can withdraw virtual money by clicking on the green button at the top right corner.

You trading summary is saved and displayed at the main page.

## License

[MIT](LICENSE) © Space4444
