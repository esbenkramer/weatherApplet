The app consists of 4 individual files:
Two HTML templates, a server-side node.js script, and a client-side js script.

The app is started by running this in the terminal:
node Weather-widget-applet.js

The server is listening on port 8080, and the app can be accessed from the server, through:
http://localhost:8080/

The weather app uses two different third party APIs:
For autocompletion of city names, it uses the DAWA system.
For weather data, it uses the OpenWeather API.

The OpenWeather API needs a key, which must be defined in the script/file:
Weather-widget-applet.js.

Without this key, weather data will not be retrieved and shown to the user correctly.
To insert the key, open Weather-widget-applet.js and add the key as a string, in the topmost line:
    var weatherAPI = ''; //INSERT THE WEATHER API KEY AS A STRING HERE.

