//The API token can easily be changed here.
var weatherAPI = ''; //INSERT THE WEATHER API KEY AS A STRING HERE.//

//required node modules.
var http = require('http');
var fs = require('fs');
var url = require('url');

/**
 * Allow requiring the html-files, by adding an extension to the require system.
 * Using require makes sure the node system only loads it on first run reducing I/O.
 */
require.extensions['.html'] = function (module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

//Required templates
var weatherHTMLTemplate = require('./weather.html');
var errorHTMLTemplate = require('./error.html');
var clientSideJS = require('./client-side.html');

//create a server object, and define a basic function for reacting to requests.
http.createServer(function (req, res) {
  //Extract the requested location from the URL params.
  var parts = url.parse(req.url, true);
  var query = parts.query;
  var location = query.location;
  var JSONOnly = query.jsononly;
  //Basic routing.
  if (location == null || location == '')
  {
    returnDefaultPage(res);
  }
  else if (JSONOnly == null || JSONOnly == undefined || JSONOnly == '' || JSONOnly == 'false')
  {
    //Normal HTML request
    getWeatherData(location, res, insertWeatherDataAndSendResponse);
  }
  else if (JSONOnly == 'true')
  {
    //JSON request by client side js.
    getWeatherData(location, res, returnJSONData);
  }
  else returnDefaultPage(res);
}).listen(8080); //the server object listens on port 8080


/**
 * This function allows for simple retrieval of the weather json result, 
 * based on just a city name.
 * The passed function will be called, when the request is done, 
 * with the weather object and the response.
 * 
 * @param {string} location A string containing the name of a city.
 * @param {function} callback A function called 
 * 
 */
var getWeatherData = function(location, response, finalizeFunction)
{
  location = cleanCityNameForWeatherAPI(location);
  var encodedLocation = encodeURI(location);
  //Contruct the URL, for the query towards the weather API.
  var baseAPIURL = 'http://api.openweathermap.org/data/2.5/weather?'; //example : q=Copenhagen,dk&appid=
  var locationURLParameter = 'q=' + encodedLocation + ',dk'; //Hardcoded to only accept Danish locations, by inserting the ,dk.
  var APIURLParameter = 'appid=' + weatherAPI; //Construct parameter from the API key.
  var finalURL = baseAPIURL + locationURLParameter + '&' + APIURLParameter; //Concatenate the URL as a complete string.
  var weatherObject;
  //Errors can occur in the http module.
  try {
    http.get(finalURL, (resp) => {
      //Concat each retrieved chunk into final response.
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      //On retrieval of complete response from Weather.
      resp.on('end', () => {

        //The node.js system demands that the data is parsed in this event.
        var parsedJSON = JSON.parse(data);
        if (parsedJSON.main != null)
        {
          var degrees = parsedJSON.main.temp - 273.15; //Weather offers their temp in K.
          var humidity = parsedJSON.main.humidity;
          var windSpeed = parsedJSON.wind.speed;
          var icon = "http://openweathermap.org/img/w/" + parsedJSON.weather[0].icon + ".png";
          var windDirection = getPrettyWindDirectionNameFromDegrees(parsedJSON.wind.deg);
          weatherObject = constructWeatherObject(location, icon, degrees, humidity, windSpeed, windDirection);
          finalizeFunction(weatherObject, response); //Pass the result on to the input function.
        }
        else
        {
          //No data from Weathers API. Most likely due to non-existing city.
          returnNoSuchLocationPage(response, "Kan ikke finde data for <b>" + location + "</b>");
        }
      });
    }).on("error", (error) => {
      console.log("Fejl i hentning af vejrdata fra Weather: " + error.message);
      showErrorMessage(response);
    });
  }
  catch (error)
  {
    console.log('Fejl i HTTP-modul: ' + error.message);
    showErrorMessage(response);
  }
}

/** 
 * The weather data is kept in a single object, which always has the same fields. 
 * In case other APIs are introduced, or a caching system is built to reduce the 
 * number of calls to the APIs, the creation of this object is isolated in this function.
 * 
 * @param {string} location
 * @param {string} degreesInCelcius
 * @param {string} humitidyPercentage
 * @param {string} windSpeed
 * @param {string} formattedWindDirection
 * 
 * @returns {Object} An object with the fields: {degrees, humidity, wind, windDirection}, ready for insertion into the response HTML. 
*/
var constructWeatherObject = function(location, icon, degreesInCelcius, humitidyPercentage, windSpeed, formattedWindDirection)
{
  return {
    location: location,
    icon: icon,
    degrees: Math.round(degreesInCelcius, 3), 
    humidity: humitidyPercentage,
    wind: windSpeed,
    windDirection: formattedWindDirection};
}

/**
 * Used for dynamically updatingjsono the page. Called by the client side js.
 * @param {object} weatherObject 
 */
var returnJSONData = function(weatherObject, response)
{
  var JSONReturn = JSON.stringify(weatherObject);
  response.writeHead(200, {'Content-Type': 'application/json'});
  response.write(JSONReturn);
  response.end();
}
/** 
 * Used to fill in the weather object with default data, and return the weather object.
*/
var returnDefaultPage = function(response, customHeader)
{
  getWeatherData('København', response, insertWeatherDataAndSendResponse);
} 

var returnNoSuchLocationPage = function(response, customHeader)
{
  var header = (customHeader == null) ? "Kunne ikke finde byen." : customHeader;
  var finalWeatherHTML = weatherHTMLTemplate
  .replace("$header", header)
  .replace("$icon","http://openweathermap.org/img/w/01d.png")
  .replace("$temperature", "")
  .replace("$humidity", "")
  .replace("$wind", "");
  response.write(finalWeatherHTML + clientSideJS); //write a response to the client
  response.end(); //end the response
} 

/** 
 * @param {Number} degrees The direction in degrees.
 * @returns {string} The name of the direction in Danish. 
 */
var getPrettyWindDirectionNameFromDegrees = function(degrees)
{
  if (degrees >=  337.5 || degrees <= 22.5) return 'Nord'; //North is a special case, since the degrees wrap at 360.
  if (degrees > 22.5 && degrees <= 67.5) return 'Nordøst';
  if (degrees > 67.5 && degrees <= 112.5) return 'Øst';
  if (degrees > 112.5 && degrees <= 157.5) return 'Sydøst';
  if (degrees > 157.5 && degrees <= 202.5) return 'Syd';
  if (degrees > 202.5 && degrees <= 247.5) return 'Sydvest';
  if (degrees > 247.5 && degrees <= 292.5) return 'Vest';
  if (degrees > 292.5 && degrees <= 337.5) return 'NordVest';  
}

/**
 * Function for fixing holes in the data between DAWA and the weather API.
 * @param {string} cityName 
 */
var cleanCityNameForWeatherAPI = function(cityName)
{
  if (cityName.indexOf("København") != -1) return "København"; //Weather API only holds the general city, not S, C, N and so on.
  if (cityName.indexOf("Odense") != -1) return "Odense"; //Weather API only holds the general city, not S, C, N and so on.
  if (cityName.indexOf("Århus") != -1 || cityName.indexOf("Aarhus") != -1) return "Aarhus"; //Weather API only holds the general city, not S, C, N and so on.
  return cityName;
}

var insertWeatherDataAndSendResponse = function(weatherObject, response)
{
  var finalWeatherHTML = weatherHTMLTemplate
  .replace("$header", "Vejret i <b>" + weatherObject.location + "</b>")
  .replace("$icon", weatherObject.icon)
  .replace("$temperature", weatherObject.degrees + "°C")
  .replace("$humidity", weatherObject.humidity + " %")
  .replace("$wind", weatherObject.wind + " m/s " + weatherObject.windDirection);
  finalWeatherHTML = finalWeatherHTML + clientSideJS; //Insert the client side javascript at the end, after the replaces.
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(finalWeatherHTML); //write a response to the client
  response.end(); //end the response
}

var showErrorMessage = function(response)
{
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(errorHTMLTemplate + clientSideJS); //write a response to the client
  response.end(); //end the response
}
