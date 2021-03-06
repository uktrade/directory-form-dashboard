'use strict';

var config  = require('../../config');
var google = require('googleapis');

const TODAY = 'today';
const LASTWEEK = '7daysAgo';


//return a an authenticated Google API client
function getJwtClient() {
	return new Promise(function(resolve, reject) {
		var jwtClient = new google.auth.JWT(config.ga.clientEmail, null, config.ga.privateKey, ['https://www.googleapis.com/auth/analytics.readonly'], null);
		jwtClient.authorize(function (error, tokens) {
			if (error) {
				console.log('getJwtClient failed: ' + error);
				reject(error);
			} else {
				resolve(jwtClient);
			}
		});
	});
}

function getViewAnalytics(client, analytics, viewID, startDate, endDate) {

	return new Promise(function(resolve, reject) {

		function callback(error, response) {
			if (error) {
				console.log('getViewAnalytics failed: ' + error);
				reject(error);
			} else {
				resolve(response);
			}
		}

		analytics.data.ga.get({
				'auth': client,
				'ids': viewID,
				'metrics': 'ga:sessions',
				'start-date': startDate,
				'end-date': endDate,
				'dimensions': 'ga:deviceCategory',
			},
			callback);
	});

}

function getSubmissionAnalytics(client, analytics, viewID, startDate, endDate) {

	return new Promise(function(resolve, reject) {

		function callback(error, response) {
			if (error) {
				console.log('getViewAnalytics failed: ' + error);
				reject(error);
			} else {
				resolve(response);
			}
		}

		analytics.data.ga.get({
				'auth': client,
				'ids': viewID,
				'metrics': 'ga:pageviews',
				'dimensions': 'ga:pagePath',
				'start-date': startDate,
				'end-date': endDate,
				'filters': 'ga:pagePath==/thanks'
			},
			callback);
	});

}

function getRightNow(client, analytics, viewID) {

	return new Promise(function(resolve, reject) {

		function callback(error, response) {
			if (error) {
				console.log('getRightNow failed: ' + error);
				reject(error);
			} else {
				resolve(response);
			}
		}

		analytics.data.realtime.get({
				'auth': client,
				'ids': viewID,
				'metrics': 'rt:ActiveUsers'
			},
			callback);
	});

}

// go get it all
function getData() {

	let client;
	let analytics = google.analytics('v3');
	let combinedResults = {};

	return getJwtClient()
		.then((jwtClient) => {
			client = jwtClient;
			return getViewAnalytics(client, analytics, config.ga.viewID, TODAY, TODAY);
		})
		.then((result) => {
			combinedResults.today = {
				sessions: result.totalsForAllResults['ga:sessions']
			};
			return getViewAnalytics(client, analytics, config.ga.viewID, LASTWEEK, TODAY)
		})
		.then((result) => {

			combinedResults.week = {
				sessions: result.totalsForAllResults['ga:sessions']
			};

			combinedResults.devices = {};
			for (const device of result.rows) {
				combinedResults.devices[device[0]] = parseInt(device[1], 10);
			}

			return getRightNow(client, analytics, config.ga.viewID);
		})
		.then((result) => {
			combinedResults.now = result.totalsForAllResults['rt:ActiveUsers'];
			return getSubmissionAnalytics(client, analytics, config.ga.viewID, LASTWEEK, TODAY);
		})
		.then((result) => {
			combinedResults.week.submissions = result.totalsForAllResults['ga:pageviews'];
			return getSubmissionAnalytics(client, analytics, config.ga.viewID, TODAY, TODAY);
		})
		.then((result) => {
			combinedResults.today.submissions = result.totalsForAllResults['ga:pageviews'];
			return combinedResults;
		})
		.catch((error) => {
			console.log(error);
		});

}


module.exports = {
	getData
};
