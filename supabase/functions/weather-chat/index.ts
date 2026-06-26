import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: string;
  content: string;
}

interface WeatherData {
  location?: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  description?: string;
  rainProbability?: number;
  airQuality?: number;
  alerts?: string[];
}

type Language = 'en' | 'ta';

// Tamil translations for common weather terms
const tamilTranslations = {
  greeting: "வணக்கம்! நான் உங்கள் வானிலை உதவியாளர். வெப்பநிலை, மழை, காற்று வேகம் மற்றும் பலவற்றைப் பற்றி கேட்கலாம்.",
  location: "இடம்",
  temperature: "வெப்பநிலை",
  humidity: "ஈரப்பதம்",
  windSpeed: "காற்று வேகம்",
  rainProbability: "மழை வாய்ப்பு",
  airQuality: "காற்று தரம்",
  alerts: "எச்சரிக்கைகள்",
  today: "இன்று",
  currentWeather: "தற்போதைய வானிலை",
  feelsLike: "உணர்கிறது",
  good: "நல்லது",
  moderate: "மிதமானது",
  poor: "மோசமானது",
  veryPoor: "மிகவும் மோசமானது",
  high: "அதிகமாக",
  low: "குறைவாக",
  kmh: "கிமீ/மணி",
  percent: "சதவீதம்",
  celsius: "டிகிரி செல்சியஸ்",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, weather, language = 'en' } = await req.json() as {
      messages: ChatMessage[];
      weather?: WeatherData;
      language?: Language;
    };

    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || "";
    const response = generateWeatherResponse(lastUserMessage, weather, language);

    return new Response(
      JSON.stringify({
        role: "assistant",
        content: response,
        language: language
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateWeatherResponse(query: string, weather?: WeatherData, language: Language = 'en'): string {
  const lowerQuery = query.toLowerCase();

  if (language === 'ta') {
    return generateTamilResponse(query, weather);
  }

  // English responses
  if (lowerQuery.match(/^(hi|hello|hey|good morning|good afternoon|good evening|வணக்கம்)/)) {
    return getGreetingResponse(weather);
  }

  if (lowerQuery.includes('temperature') || lowerQuery.includes('how hot') || lowerQuery.includes('how cold') || lowerQuery.includes('warm') || lowerQuery.includes('cool')) {
    return getTemperatureResponse(weather);
  }

  if (lowerQuery.includes('rain') || lowerQuery.includes('precipitation') || lowerQuery.includes('umbrella') || lowerQuery.includes('wet')) {
    return getRainResponse(weather);
  }

  if (lowerQuery.includes('wind') || lowerQuery.includes('breeze') || lowerQuery.includes('windy')) {
    return getWindResponse(weather);
  }

  if (lowerQuery.includes('air quality') || lowerQuery.includes('pollution') || lowerQuery.includes('air') || lowerQuery.includes('breathe') || lowerQuery.includes('aqi')) {
    return getAirQualityResponse(weather);
  }

  if (lowerQuery.includes('humid') || lowerQuery.includes('moisture') || lowerQuery.includes('dry')) {
    return getHumidityResponse(weather);
  }

  if (lowerQuery.includes('alert') || lowerQuery.includes('warning') || lowerQuery.includes('danger') || lowerQuery.includes('safe') || lowerQuery.includes('emergency')) {
    return getAlertsResponse(weather);
  }

  if (lowerQuery.includes('wear') || lowerQuery.includes('clothing') || lowerQuery.includes('outfit') || lowerQuery.includes('dress') || lowerQuery.includes('jacket')) {
    return getClothingResponse(weather);
  }

  if (lowerQuery.includes('activity') || lowerQuery.includes('outdoor') || lowerQuery.includes('exercise') || lowerQuery.includes('run') || lowerQuery.includes('walk') || lowerQuery.includes('hike')) {
    return getActivityResponse(weather);
  }

  if (lowerQuery.includes('weather') || lowerQuery.includes('forecast') || lowerQuery.includes('today') || lowerQuery.includes('now')) {
    return getGeneralWeatherResponse(weather);
  }

  return getDefaultResponse();
}

function generateTamilResponse(query: string, weather?: WeatherData): string {
  const lowerQuery = query.toLowerCase();

  // Greeting
  if (lowerQuery.match(/^(hi|hello|hey|வணக்கம்|எப்படி இருக்கிறீர்கள்)/)) {
    if (!weather || weather.temperature === undefined) {
      return tamilTranslations.greeting;
    }
    return `வணக்கம்! ${weather.location || 'உங்கள் பகுதியில்'} தற்போதைய வெப்பநிலை ${weather.temperature}°சி. வானிலை பற்றி என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?`;
  }

  // Temperature
  if (lowerQuery.includes('temperature') || lowerQuery.includes('வெப்பம்') || lowerQuery.includes('குளிர்') || lowerQuery.includes('வெப்பநிலை')) {
    if (!weather || weather.temperature === undefined) {
      return "வெப்பநிலை தரவு கிடைக்கவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.";
    }
    const temp = weather.temperature;
    let response = `தற்போதைய வெப்பநிலை ${temp}°சி. `;

    if (temp <= 0) {
      response += "மிகவும் குளிராக இருக்கிறது! வெதுவெதுவான உடைகள், டோப்பி மற்றும் கையுறை அணியவும்.";
    } else if (temp <= 15) {
      response += "குளிராக இருக்கிறது. வெதுவெதுவான ஜாக்கெட் அணியவும்.";
    } else if (temp <= 25) {
      response += "வானிலை மிதமாகவும் வசதியாகவும் உள்ளது.";
    } else if (temp <= 35) {
      response += "வெப்பமாக உள்ளது. நன்கு தண்ணீர் குடிக்கவும்.";
    } else {
      response += "மிகவும் வெப்பமாக உள்ளது! வெளியே செல்வதை தவிர்க்கவும்.";
    }
    return response;
  }

  // Rain
  if (lowerQuery.includes('rain') || lowerQuery.includes('மழை') || lowerQuery.includes('குடை')) {
    if (!weather || weather.rainProbability === undefined) {
      return "மழை தரவு கிடைக்கவில்லை.";
    }
    const rainProb = weather.rainProbability;
    let response = `மழை வருவதற்கான வாய்ப்பு ${rainProb}%. `;

    if (rainProb >= 70) {
      response += "மழை வரும் வாய்ப்பு அதிகம். குடை எடுத்துச் செல்லவும்.";
    } else if (rainProb >= 40) {
      response += "மழை வருவதற்கு வாய்ப்புள்ளது. குடை எடுத்துச் செல்லலாம்.";
    } else {
      response += "மழை வரும் வாய்ப்பு குறைவு.";
    }
    return response;
  }

  // Wind
  if (lowerQuery.includes('wind') || lowerQuery.includes('காற்று') || lowerQuery.includes('காற்று வேகம்')) {
    if (!weather || weather.windSpeed === undefined) {
      return "காற்று வேக தரவு கிடைக்கவில்லை.";
    }
    const wind = weather.windSpeed;
    let response = `தற்போதைய காற்று வேகம் ${wind} கிமீ/மணி. `;

    if (wind >= 50) {
      response += "காற்று வேகம் அதிகமாக உள்ளது. வெளியே செல்லும்போது எச்சரிக்கையாக இருக்கவும்.";
    } else if (wind >= 30) {
      response += "மிதமான காற்று வீசுகிறது.";
    } else {
      response += "காற்று வேகம் குறைவாக உள்ளது.";
    }
    return response;
  }

  // Air Quality
  if (lowerQuery.includes('air') || lowerQuery.includes('காற்று தரம்') || lowerQuery.includes('pollution')) {
    if (!weather || weather.airQuality === undefined) {
      return "காற்று தர தரவு கிடைக்கவில்லை.";
    }
    const aqi = weather.airQuality;
    let response = `காற்று தர குறியீடு ${aqi}. `;

    if (aqi <= 50) {
      response += "காற்று தரம் சிறப்பாக உள்ளது! வெளியே செல்லலாம்.";
    } else if (aqi <= 100) {
      response += "காற்று தரம் ஏற்றுக்கொள்ளக்கூடியது.";
    } else if (aqi <= 150) {
      response += "காற்று தரம் மிதமானது. மூச்சுக்குழாய் நோயாளிகள் எச்சரிக்கையாக இருக்கவும்.";
    } else {
      response += "காற்று தரம் மோசமாக உள்ளது. வெளியே செல்வதை குறைக்கவும்.";
    }
    return response;
  }

  // Humidity
  if (lowerQuery.includes('humidity') || lowerQuery.includes('ஈரப்பதம்')) {
    if (!weather || weather.humidity === undefined) {
      return "ஈரப்பத தரவு கிடைக்கவில்லை.";
    }
    const humidity = weather.humidity;
    let response = `தற்போதைய ஈரப்பதம் ${humidity}%. `;

    if (humidity >= 80) {
      response += "ஈரப்பதம் மிக அதிகமாக உள்ளது. வியர்வை அதிகமாக இருக்கும்.";
    } else if (humidity >= 60) {
      response += "ஈரப்பதம் மிதமான அளவில் உள்ளது.";
    } else {
      response += "ஈரப்பதம் குறைவாக உள்ளது. நன்கு தண்ணீர் குடிக்கவும்.";
    }
    return response;
  }

  // Alerts
  if (lowerQuery.includes('alert') || lowerQuery.includes('எச்சரிக்கை') || lowerQuery.includes('warning')) {
    if (!weather || !weather.alerts || weather.alerts.length === 0) {
      return "உங்கள் பகுதியில் எந்த எச்சரிக்கைகளும் இல்லை. பாதுகாப்பாக இருங்கள்!";
    }
    return `தற்போது ${weather.alerts.length} எச்சரிக்கைகள் உள்ளன: ${weather.alerts.join(', ')}. தயவுசெய்து எச்சரிக்கையாக இருக்கவும்.`;
  }

  // Clothing
  if (lowerQuery.includes('wear') || lowerQuery.includes('உடை') || lowerQuery.includes('என்ன அணிய')) {
    if (!weather || weather.temperature === undefined) {
      return "வானிலை தரவு கிடைக்கவில்லை.";
    }
    const temp = weather.temperature;
    const rainProb = weather.rainProbability || 0;

    let response = "இன்று அணிவதற்கு பரிந்துரைகள்:\n\n";

    if (temp <= 10) {
      response += "- வெதுவெதுவான ஜாக்கெட் அல்லது கோட்\n- டோப்பி மற்றும் கையுறை\n- வெதுவெதுவான செருப்பு\n";
    } else if (temp <= 25) {
      response += "- லேசான ஜாக்கெட்\n- நீள கை உடை\n- வசதியான செருப்பு\n";
    } else {
      response += "- லேசான பருத்தி உடைகள்\n- குட்டி கை அல்லது சட்டை\n- சன்கிளாஸ் அணியவும்\n";
    }

    if (rainProb >= 40) {
      response += "- குடை எடுத்துச் செல்லவும்\n";
    }

    return response;
  }

  // General weather
  if (lowerQuery.includes('weather') || lowerQuery.includes('வானிலை') || lowerQuery.includes('today') || lowerQuery.includes('இன்று')) {
    if (!weather || weather.temperature === undefined) {
      return "வானிலை தரவு கிடைக்கவில்லை.";
    }

    let response = `${weather.location || 'உங்கள் பகுதி'} வானிலை:\n\n`;
    response += `வெப்பநிலை: ${weather.temperature}°சி`;
    if (weather.description) response += ` - ${weather.description}`;
    response += `\n`;

    if (weather.humidity !== undefined) response += `ஈரப்பதம்: ${weather.humidity}%\n`;
    if (weather.windSpeed !== undefined) response += `காற்று வேகம்: ${weather.windSpeed} கிமீ/மணி\n`;
    if (weather.rainProbability !== undefined) response += `மழை வாய்ப்பு: ${weather.rainProbability}%\n`;
    if (weather.airQuality !== undefined) response += `காற்று தரம்: ${weather.airQuality}\n`;

    if (weather.alerts && weather.alerts.length > 0) {
      response += `\nஎச்சரிக்கைகள்: ${weather.alerts.join(', ')}\n`;
    }

    return response;
  }

  return "நான் உங்கள் வானிலை உதவியாளர்! வெப்பநிலை, மழை, காற்று வேகம், காற்று தரம் மற்றும் எச்சரிக்கைகள் பற்றி கேட்கலாம்.";
}

function getGreetingResponse(weather?: WeatherData): string {
  if (!weather || weather.temperature === undefined) {
    return "Hello! I'm your weather assistant. I can help you understand current weather conditions, provide safety tips, and give recommendations. Feel free to ask me about temperature, rain, wind, air quality, or what to wear today!";
  }

  let response = `Hello! The current temperature in ${weather.location || 'your area'} is ${weather.temperature}°C`;
  if (weather.description) {
    response += ` with ${weather.description.toLowerCase()} conditions`;
  }
  response += ". How can I help you with the weather today?";

  return response;
}

function getTemperatureResponse(weather?: WeatherData): string {
  if (!weather || weather.temperature === undefined) {
    return "I don't have current temperature data. Please check the weather dashboard for temperature information.";
  }

  const temp = weather.temperature;
  let response = `The current temperature is ${temp}°C. `;

  if (temp <= 0) {
    response += "It's freezing! Make sure to bundle up with multiple layers, a warm coat, hat, and gloves. Watch out for ice on surfaces.";
  } else if (temp <= 10) {
    response += "It's quite cold. A warm jacket and layers are recommended. Consider wearing a hat and scarf.";
  } else if (temp <= 20) {
    response += "It's mild and comfortable. A light jacket or sweater would be perfect for this temperature.";
  } else if (temp <= 30) {
    response += "It's warm! Light, breathable clothing is ideal. Stay hydrated and seek shade when possible.";
  } else {
    response += "It's very hot! Wear light, loose-fitting clothing, stay hydrated, and avoid prolonged sun exposure. Look for air-conditioned spaces during the hottest parts of the day.";
  }

  return response;
}

function getRainResponse(weather?: WeatherData): string {
  if (!weather || weather.rainProbability === undefined) {
    return "I don't have current rain probability data. Please check the weather dashboard for precipitation information.";
  }

  const rainProb = weather.rainProbability;
  let response = `There's a ${rainProb}% chance of rain. `;

  if (rainProb >= 80) {
    response += "It's very likely to rain! Definitely bring an umbrella and wear waterproof clothing. Consider postponing outdoor activities.";
  } else if (rainProb >= 50) {
    response += "There's a moderate chance of rain. It would be wise to carry an umbrella just in case.";
  } else if (rainProb >= 20) {
    response += "There's a slight chance of rain. You might want to bring a light rain jacket, but it's not a major concern.";
  } else {
    response += "Rain is very unlikely today. It should be dry throughout the day.";
  }

  return response;
}

function getWindResponse(weather?: WeatherData): string {
  if (!weather || weather.windSpeed === undefined) {
    return "I don't have current wind data. Please check the weather dashboard for wind information.";
  }

  const wind = weather.windSpeed;
  let response = `Current wind speed is ${wind} km/h. `;

  if (wind >= 75) {
    response += "Extreme wind conditions! Avoid outdoor activities if possible. Secure loose objects and stay away from windows.";
  } else if (wind >= 50) {
    response += "Very windy conditions. Be cautious when walking and secure loose outdoor items.";
  } else if (wind >= 30) {
    response += "Moderate winds. It's breezy but manageable for most outdoor activities.";
  } else if (wind >= 15) {
    response += "Light winds. A gentle breeze that's quite pleasant for outdoor activities.";
  } else {
    response += "Very calm conditions with minimal wind. Great for outdoor activities!";
  }

  return response;
}

function getAirQualityResponse(weather?: WeatherData): string {
  if (!weather || weather.airQuality === undefined) {
    return "I don't have current air quality data. Please check the weather dashboard for air quality information.";
  }

  const aqi = weather.airQuality;
  let response = `The Air Quality Index is ${aqi}. `;

  if (aqi <= 50) {
    response += "Air quality is excellent! Perfect conditions for outdoor activities and exercise. Enjoy the fresh air!";
  } else if (aqi <= 100) {
    response += "Air quality is acceptable. Most people can enjoy outdoor activities without concern.";
  } else if (aqi <= 150) {
    response += "Air quality is moderate. Sensitive individuals (those with asthma or respiratory issues) should limit prolonged outdoor exertion.";
  } else if (aqi <= 200) {
    response += "Air quality is unhealthy for sensitive groups. Consider limiting outdoor activities, especially for children, elderly, and those with respiratory conditions.";
  } else if (aqi <= 300) {
    response += "Air quality is very unhealthy. Limit outdoor activities. Consider wearing a mask if you must go outside.";
  } else {
    response += "Air quality is hazardous! Avoid all outdoor activities. Keep windows closed and use air purifiers if available.";
  }

  return response;
}

function getHumidityResponse(weather?: WeatherData): string {
  if (!weather || weather.humidity === undefined) {
    return "I don't have current humidity data. Please check the weather dashboard for humidity information.";
  }

  const humidity = weather.humidity;
  let response = `Current humidity is ${humidity}%. `;

  if (humidity >= 80) {
    response += "It's very humid! You might feel sticky and uncomfortable. Stay hydrated and seek air-conditioned spaces to cool off.";
  } else if (humidity >= 60) {
    response += "It's moderately humid. Most people are comfortable, but it might feel a bit muggy during physical activity.";
  } else if (humidity >= 40) {
    response += "Humidity is at a comfortable level. Perfect conditions for most activities!";
  } else {
    response += "It's quite dry. Make sure to stay hydrated and use moisturizer. Those with respiratory issues might benefit from a humidifier.";
  }

  return response;
}

function getAlertsResponse(weather?: WeatherData): string {
  if (!weather || !weather.alerts || weather.alerts.length === 0) {
    return "There are no active severe weather alerts for your area. Conditions are within normal ranges. Stay safe and enjoy your day!";
  }

  let response = `There ${weather.alerts.length === 1 ? 'is' : 'are'} ${weather.alerts.length} active alert${weather.alerts.length > 1 ? 's' : ''}: ${weather.alerts.join(', ')}. `;

  response += "Please take necessary precautions and stay updated with local news. Consider staying indoors if conditions worsen.";

  return response;
}

function getClothingResponse(weather?: WeatherData): string {
  if (!weather || weather.temperature === undefined) {
    return "I need weather data to give clothing recommendations. Please check the weather dashboard first.";
  }

  const temp = weather.temperature;
  const rainProb = weather.rainProbability || 0;
  const wind = weather.windSpeed || 0;

  let response = "Based on current conditions, here's what I recommend:\n\n";

  if (temp <= 0) {
    response += "- Heavy winter coat, thermal underwear\n- Warm hat, gloves, and scarf\n- Insulated boots\n";
  } else if (temp <= 10) {
    response += "- Warm jacket or coat\n- Long pants and layers\n- Light gloves if windy\n";
  } else if (temp <= 20) {
    response += "- Light jacket or cardigan\n- Long pants or jeans\n- Comfortable shoes\n";
  } else if (temp <= 30) {
    response += "- Light, breathable fabrics (cotton, linen)\n- Short sleeves\n- Comfortable walking shoes\n";
  } else {
    response += "- Very light, loose clothing\n- Sun hat and sunglasses\n- Light colors to reflect heat\n";
  }

  if (rainProb >= 40) {
    response += "- Bring a waterproof jacket or umbrella\n- Waterproof shoes recommended\n";
  }

  if (wind >= 30) {
    response += "- Wind-resistant outer layer\n- Avoid loose accessories\n";
  }

  return response;
}

function getActivityResponse(weather?: WeatherData): string {
  if (!weather || weather.temperature === undefined) {
    return "I need weather data to give activity recommendations. Please check the weather dashboard first.";
  }

  const temp = weather.temperature;
  const rainProb = weather.rainProbability || 0;
  const aqi = weather.airQuality || 0;
  const wind = weather.windSpeed || 0;

  let response = "";
  let canGoOutdoors = true;
  let reasons: string[] = [];

  if (temp > 35 || temp < -10) {
    canGoOutdoors = false;
    reasons.push("extreme temperatures");
  }
  if (rainProb >= 80) {
    reasons.push("high rain probability");
  }
  if (aqi >= 200) {
    canGoOutdoors = false;
    reasons.push("poor air quality");
  }
  if (wind >= 75) {
    canGoOutdoors = false;
    reasons.push("dangerous wind speeds");
  }

  if (canGoOutdoors && reasons.length === 0) {
    response = "Great news! Conditions are good for outdoor activities. ";

    if (temp >= 15 && temp <= 25 && rainProb < 30 && aqi <= 100) {
      response += "It's a perfect day for jogging, cycling, hiking, or any outdoor sports. ";
    } else if (rainProb >= 30 && rainProb < 80) {
      response += "While outdoor activities are possible, keep an eye on the sky and have a backup plan. ";
    }

    response += "Stay hydrated and use appropriate sun protection if needed.";
  } else if (reasons.length > 0) {
    response = `I'd recommend limiting outdoor activities today due to ${reasons.join(' and ')}. `;
    response += "Consider indoor alternatives like gym workouts, yoga, or home exercises. If you must go outside, take appropriate precautions.";
  }

  return response;
}

function getGeneralWeatherResponse(weather?: WeatherData): string {
  if (!weather || weather.temperature === undefined) {
    return "I don't have current weather data loaded. Please allow location access or search for a city to get weather information.";
  }

  let response = `Here's the current weather in ${weather.location || 'your area'}:\n\n`;
  response += `Temperature: ${weather.temperature}°C`;
  if (weather.description) response += ` - ${weather.description}`;
  response += `\n`;

  if (weather.humidity !== undefined) response += `Humidity: ${weather.humidity}%\n`;
  if (weather.windSpeed !== undefined) response += `Wind: ${weather.windSpeed} km/h\n`;
  if (weather.rainProbability !== undefined) response += `Rain Chance: ${weather.rainProbability}%\n`;
  if (weather.airQuality !== undefined) response += `Air Quality: ${weather.airQuality}\n`;

  if (weather.alerts && weather.alerts.length > 0) {
    response += `\nAlerts: ${weather.alerts.join(', ')}\n`;
  }

  response += `\nIs there anything specific about the weather you'd like to know more about?`;

  return response;
}

function getDefaultResponse(): string {
  return "I'm your weather assistant! I can help you with:\n\n- Current weather conditions\n- Temperature and what to wear\n- Rain probability and umbrella advice\n- Wind conditions\n- Air quality and health tips\n- Severe weather alerts\n- Activity recommendations\n\nJust ask me anything about the weather!";
}
