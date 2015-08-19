//Stockchart Site Javascript File

//Refreshes the Chart with new data
var refreshChart = function() {
	//pull stock from currently selected value in drop down menu
	stock = $("#ticker").val();

	//Create default Chart Time Frame of six months
	if(typeof chartMonths === 'undefined') {
		chartMonths = 6;
	}

	//Create Start and End dates for Chart data, Format dates into YQL accepted ISO Date format
	var today = new Date();
	var endDateStr = today.toISOString().substring(0,10);
	var startDate = new Date();
	startDate.setMonth(today.getMonth() - chartMonths);
	var startDateStr = startDate.toISOString().substring(0,10);

	//Empty the Chart dataArr Array for a fresh data fetch
	dataArr = [];
	//Get chart data with appropriate inputs
	yahooChartDataFetch(stock, startDateStr, endDateStr);
	//Draw chart with newly fetched data
	drawChart();
}

//Refreshes the Quote with new data
var refreshQuote = function() {
	//pull stock from currently selected value in drop down menu
	stock = $("#ticker").val();
	//Empty the quoteData Object for a fresh data fetch
	quoteDataObj = {};
	//Get quote data for new stock ticker
	yahooQuoteDataFetch(stock);

	//Update all quote fields with new data
	$("#quoteHeader").text(quoteDataObj.Name + " (" + quoteDataObj.Symbol +")");
	$("#price").text("$" + quoteDataObj.LastTradePriceOnly);
	var changePercent = quoteDataObj.Change/quoteDataObj.LastTradePriceOnly*100;
	$("#change").text(quoteDataObj.Change + " (" + changePercent.toFixed(2) + "%)");
	$("#volume").text(Number(quoteDataObj.Volume).toLocaleString());
	$("#avgVolume").text(Number(quoteDataObj.AverageDailyVolume).toLocaleString());
	$("#52wkRange").text("$" + quoteDataObj.YearLow + " - " +quoteDataObj.YearHigh);
}

var timeBtns = function(htmlID, time) {
	$(htmlID).click(function() {
		chartMonths = time;
		refreshChart();
	})
}

//jQuery functions
$(document).ready( function() {
	$("#ticker").change(function() {
		refreshQuote();
		refreshChart();
	});

/*
	$("#1monthsBtn").click(function() {
		chartMonths = 1;
		refreshChart();
	});

	$("#3monthsBtn").click(function() {
		chartMonths = 3;
		refreshChart();
	});

	$("#6monthsBtn").click(function() {
		chartMonths = 6;
		refreshChart();
	});

	$("#12monthsBtn").click(function() {
		chartMonths = 12;
		refreshChart();
	});
*/

	timeBtns("#1monthsBtn",1);
	timeBtns("#3monthsBtn",3);
	timeBtns("#6monthsBtn",6);
	timeBtns("#12monthsBtn",12);
})

//default settings
//var stock = "SPY";
//var chartMonths = 6;
//var dataArr = [];
//var quoteDataObj = {};

//format Date variables for input into Yahoo Finance API calls

/*
var today = new Date();
var endDateStr = today.toISOString().substring(0,10);
var startDate = new Date();
startDate.setMonth(today.getMonth() - chartMonths);
var startDateStr = startDate.toISOString().substring(0,10);
*/

//YahooFinance API call variables
var baseURL = "https://query.yahooapis.com/v1/public/yql?q=";

//Fetch data from Yahoo API using YQL (Yahoo Query Language) for population of stock quote
var yahooQuoteDataFetch = function(stock) {
	//Format string into YQL accepted format
	var yqlQuoteQuery = 'select * from yahoo.finance.quote where symbol in ("' + stock + '")';
	var yqlQueryStr = encodeURI(baseURL+yqlQuoteQuery);
	var queryStrFinal = yqlQueryStr + "&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback="

	//Use AJAX to fetch Object containing all quote data for requested stock
	$.ajax({
		url: queryStrFinal,
		dataType: 'json',
		async: false,
		success: function(quoteData) {
			quoteDataObj = quoteData.query.results.quote;
		}
	})
}
//refreshQuote();

//Fetch historical stock data from Yahoo API using YQL (Yahoo Query Language) for population of stock chart
var yahooChartDataFetch = function(stock, start, end) {
	//Format string into YQL accepted format
	var yqlHistoricalQuery = 'select * from yahoo.finance.historicaldata where symbol = "' + stock + '" and startDate = "' + start + '" and endDate = "' + end + '"';
	var yqlQueryStr = encodeURI(baseURL+yqlHistoricalQuery);
	var queryStrFinal = yqlQueryStr + "&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback="

	//Use AJAX to fetch Object containing all histocial data for requested stock
	$.ajax({
		url: queryStrFinal,
		dataType: 'json',
		async: false,
		success: function(data) {
			var quoteArr = data.query.results.quote;

			//Step 1) Push data into properly formatted array accepted by Google Charts package
			//Step 2) Change date format from ISO to Javascript Date object for easier manipulation by Google Chart package
			for (var i = 0; i < quoteArr.length; i++) {
				dataArr[i] = [];
				var dayISOStr = quoteArr[i].Date + "T21:00";
				var parsed = Date.parse(dayISOStr);
				var day = new Date();
				day.setTime(parsed);
				dataArr[i].push(day);
				dataArr[i].push(Number(quoteArr[i].Close));
			}

			//Reverse order of Array as Yahoo API delivers them with most recent dates first. This makes the chart dates appear backwards.
			dataArr.reverse();
		}
	})

	//Input new first entry of data array telling Google Charts the type of data to expect. This allows Google Charts to properly setup the chart based on the data.
	dataArr.unshift([{label: 'Date', id: 'Date', type: 'date'}, {label: 'Price', id: 'Price', type: 'number'}]);
	//console.log(dataArr);
};
//yahooChartDataFetch();


//Load Google Charts packages
google.load("visualization", "1", {packages:["corechart", "line"]});

//set initial load of Quote and Chart sections after Google JS API loads
google.setOnLoadCallback(function() {
	refreshQuote();
	refreshChart();
});

function drawChart() {
  //Create data table for the Chart using the Historical Stock Data Array created in yahooChartDataFetch() function
  var data = new google.visualization.arrayToDataTable(dataArr, false);

  //Declare formatting options for Google Chart
  var options = {
    chart: {
      title: stock + ' Historical Price Chart',
      subtitle: 'Last ' + chartMonths + ' Months'
    },
    legend: {
    	position: 'none'
    },
    width: 900,
    height: 500,
    vAxis: {
    	format: 'currency'
    },
    hAxis: {
    	format: 'MMM d'
    }
  };

  //Tells function to place the chart in the specified HTML Div
  var chart = new google.charts.Line(document.getElementById('chart_div'));
	
	//Draw the chart using the Data and Options specified above
	chart.draw(data, google.charts.Line.convertOptions(options));
}



