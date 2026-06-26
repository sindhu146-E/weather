import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  AlertTriangle,
  MapPin,
  Search,
  Send,
  Thermometer,
  Sun,
  Gauge,
  RefreshCw,
  Loader2,
  MessageCircle,
  X,
  CloudSun,
  AlertCircle,
  Mic,
  Volume2,
  VolumeX,
  Languages,
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  rainProbability: number;
  location: string;
}

interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
}

interface WeatherAlert {
  event: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  start: string;
  end: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type Language = 'en' | 'ta';

const WEATHER_API_BASE = 'https://api.open-meteo.com/v1';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1';
const AIR_QUALITY_API = 'https://air-quality-api.open-meteo.com/v1';

export default function App() {
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: 51.5074, lon: -0.1278 });
  const [locationName, setLocationName] = useState('London');
  const [error, setError] = useState<string | null>(null);

  // Voice and language states
  const [language, setLanguage] = useState<Language>('en');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const getWeatherDescription = (code: number): { description: string; icon: string } => {
    const weatherCodes: Record<number, { description: string; icon: string }> = {
      0: { description: 'Clear sky', icon: 'sun' },
      1: { description: 'Mainly clear', icon: 'cloud-sun' },
      2: { description: 'Partly cloudy', icon: 'cloud-sun' },
      3: { description: 'Overcast', icon: 'cloud' },
      45: { description: 'Foggy', icon: 'cloud' },
      48: { description: 'Depositing rime fog', icon: 'cloud' },
      51: { description: 'Light drizzle', icon: 'cloud-rain' },
      53: { description: 'Moderate drizzle', icon: 'cloud-rain' },
      55: { description: 'Dense drizzle', icon: 'cloud-rain' },
      61: { description: 'Slight rain', icon: 'cloud-rain' },
      63: { description: 'Moderate rain', icon: 'cloud-rain' },
      65: { description: 'Heavy rain', icon: 'cloud-rain' },
      71: { description: 'Slight snow', icon: 'cloud-rain' },
      73: { description: 'Moderate snow', icon: 'cloud-rain' },
      75: { description: 'Heavy snow', icon: 'cloud-rain' },
      77: { description: 'Snow grains', icon: 'cloud-rain' },
      80: { description: 'Slight rain showers', icon: 'cloud-rain' },
      81: { description: 'Moderate rain showers', icon: 'cloud-rain' },
      82: { description: 'Violent rain showers', icon: 'cloud-rain' },
      85: { description: 'Slight snow showers', icon: 'cloud-rain' },
      86: { description: 'Heavy snow showers', icon: 'cloud-rain' },
      95: { description: 'Thunderstorm', icon: 'cloud-rain' },
      96: { description: 'Thunderstorm with slight hail', icon: 'cloud-rain' },
      99: { description: 'Thunderstorm with heavy hail', icon: 'cloud-rain' },
    };
    return weatherCodes[code] || { description: 'Unknown', icon: 'cloud' };
  };

  const fetchWeatherData = useCallback(async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    setError(null);

    try {
      const weatherResponse = await fetch(
        `${WEATHER_API_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,pressure_msl,wind_speed_10m,visibility,weather_code,uv_index&timezone=auto&forecast_days=1`
      );

      if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');
      const weatherData = await weatherResponse.json();

      const airQualityResponse = await fetch(
        `${AIR_QUALITY_API}/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,ozone,nitrogen_dioxide`
      );

      let airQualityData = null;
      if (airQualityResponse.ok) {
        airQualityData = await airQualityResponse.json();
      }

      const current = weatherData.current;
      const weatherInfo = getWeatherDescription(current.weather_code);

      setCurrentWeather({
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        pressure: Math.round(current.pressure_msl),
        visibility: Math.round(current.visibility / 1000),
        uvIndex: current.uv_index || 0,
        rainProbability: current.precipitation_probability || 0,
        location: name || locationName,
      });

      if (airQualityData?.current) {
        setAirQuality({
          aqi: Math.round(airQualityData.current.european_aqi || 0),
          pm25: Math.round(airQualityData.current.pm2_5 || 0),
          pm10: Math.round(airQualityData.current.pm10 || 0),
          o3: Math.round(airQualityData.current.ozone || 0),
          no2: Math.round(airQualityData.current.nitrogen_dioxide || 0),
        });
      }

      const generatedAlerts: WeatherAlert[] = [];
      if (current.wind_speed_10m > 50) {
        generatedAlerts.push({
          event: 'High Wind Warning',
          description: `Wind speeds of ${Math.round(current.wind_speed_10m)} km/h expected. Secure loose objects and avoid exposed areas.`,
          severity: 'moderate',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        });
      }
      if ((airQualityData?.current?.european_aqi || 0) > 100) {
        generatedAlerts.push({
          event: 'Air Quality Alert',
          description: 'Air quality is degraded. Sensitive groups should limit outdoor activities.',
          severity: 'moderate',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        });
      }
      if (current.precipitation_probability > 80) {
        generatedAlerts.push({
          event: 'Heavy Rain Advisory',
          description: 'High probability of rain. Consider carrying an umbrella.',
          severity: 'minor',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      if (current.temperature_2m > 35) {
        generatedAlerts.push({
          event: 'Heat Advisory',
          description: 'High temperatures expected. Stay hydrated and avoid prolonged sun exposure.',
          severity: 'moderate',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      if (current.temperature_2m < -5) {
        generatedAlerts.push({
          event: 'Cold Weather Alert',
          description: 'Sub-freezing temperatures. Dress warmly and be cautious of ice.',
          severity: 'moderate',
          start: new Date().toISOString(),
          end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      setAlerts(generatedAlerts);
    } catch (err) {
      setError('Unable to fetch weather data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [locationName]);

  const getUserLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ lat: latitude, lon: longitude });

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const name = data.address?.city || data.address?.town || data.address?.village || 'Current Location';
            setLocationName(name);
            fetchWeatherData(latitude, longitude, name);
          } catch {
            setLocationName('Current Location');
            fetchWeatherData(latitude, longitude, 'Current Location');
          }
        },
        () => {
          setError('Location access denied. Using default location.');
          fetchWeatherData(coordinates.lat, coordinates.lon);
        }
      );
    } else {
      fetchWeatherData(coordinates.lat, coordinates.lon);
    }
  }, [coordinates.lat, coordinates.lon, fetchWeatherData]);

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `${GEOCODING_API}/search?name=${encodeURIComponent(searchQuery)}&count=1`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name } = data.results[0];
        setCoordinates({ lat: latitude, lon: longitude });
        setLocationName(name);
        fetchWeatherData(latitude, longitude, name);
        setSearchQuery('');
      } else {
        setError('Location not found. Please try a different search.');
      }
    } catch {
      setError('Failed to search for location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const loadChatHistory = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(20);

    if (data) {
      setChatMessages(
        data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }))
      );
    }
  };

  // Text-to-Speech function
  const speakText = useCallback((text: string, lang: Language) => {
    if (!speechEnabled || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;

    // Try to find a Tamil voice if needed
    if (lang === 'ta') {
      const voices = synthRef.current.getVoices();
      const tamilVoice = voices.find(v => v.lang.includes('ta')) || voices.find(v => v.lang.includes('IN'));
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [speechEnabled]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Voice recognition
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    recognitionRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-US';
    recognitionRef.current.start();
    setIsListening(true);
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      // Load voices
      const loadVoices = () => {
        synthRef.current?.getVoices();
      };

      synthRef.current.addEventListener('voiceschanged', loadVoices);

      return () => {
        synthRef.current?.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const tempUserMsg: ChatMessage = {
      id: 'temp-user',
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, tempUserMsg]);

    await supabase.from('chat_messages').insert({
      role: 'user',
      content: userMessage,
    });

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-chat`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userMessage }],
          weather: currentWeather
            ? {
                location: currentWeather.location,
                temperature: currentWeather.temperature,
                humidity: currentWeather.humidity,
                windSpeed: currentWeather.windSpeed,
                description: currentWeather.description,
                rainProbability: currentWeather.rainProbability,
                airQuality: airQuality?.aqi,
                alerts: alerts.map((a) => a.event),
              }
            : null,
          language: language,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: 'temp-assistant',
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      await supabase.from('chat_messages').insert({
        role: 'assistant',
        content: data.content,
      });

      // Speak the response if speech is enabled
      if (speechEnabled) {
        speakText(data.content, language);
      }
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: 'error',
        role: 'assistant',
        content: language === 'ta' ? 'மன்னிக்கவும், பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.' : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChatHistory = async () => {
    await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setChatMessages([]);
  };

  // Toggle language
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ta' : 'en'));
  };

  useEffect(() => {
    getUserLocation();
    loadChatHistory();
  }, []);

  const WeatherIcon = ({ icon, size = 48 }: { icon: string; size?: number }) => {
    const icons: Record<string, React.ReactNode> = {
      sun: <Sun size={size} className="text-yellow-400" />,
      cloud: <Cloud size={size} className="text-gray-300" />,
      'cloud-sun': <CloudSun size={size} className="text-amber-300" />,
      'cloud-rain': <CloudRain size={size} className="text-blue-400" />,
    };
    return <>{icons[icon] || <Cloud size={size} className="text-gray-300" />}</>;
  };

  const getAQICategory = (aqi: number) => {
    if (aqi <= 20) return { label: 'Good', labelTa: 'நல்லது', color: 'text-green-600', bg: 'bg-green-100' };
    if (aqi <= 40) return { label: 'Fair', labelTa: 'மிதமானது', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (aqi <= 60) return { label: 'Moderate', labelTa: 'சராசரி', color: 'text-orange-600', bg: 'bg-orange-100' };
    if (aqi <= 80) return { label: 'Poor', labelTa: 'மோசம்', color: 'text-red-600', bg: 'bg-red-100' };
    return { label: 'Very Poor', labelTa: 'மிக மோசம்', color: 'text-purple-600', bg: 'bg-purple-100' };
  };

  const getSeverityStyle = (severity: string) => {
    const styles: Record<string, string> = {
      minor: 'bg-yellow-100 border-l-4 border-yellow-400 text-yellow-900',
      moderate: 'bg-orange-100 border-l-4 border-orange-400 text-orange-900',
      severe: 'bg-red-100 border-l-4 border-red-400 text-red-900',
      extreme: 'bg-purple-100 border-l-4 border-purple-400 text-purple-900',
    };
    return styles[severity] || styles.minor;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CloudSun size={32} className="text-sky-400" />
            <h1 className="text-2xl font-bold text-white hidden sm:block">
              {language === 'ta' ? 'வானிலை இப்போது' : 'WeatherNow'}
            </h1>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                placeholder={language === 'ta' ? 'நகரத்தைத் தேடுங்கள்...' : 'Search for a city...'}
                className="w-full bg-white/10 border border-white/20 rounded-full py-2 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              {isSearching ? (
                <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 animate-spin" />
              ) : (
                <button
                  onClick={searchLocation}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <Search size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-white transition-colors"
              title={language === 'ta' ? 'Switch to English' : 'தமிழுக்கு மாறவும்'}
            >
              <Languages size={18} />
              <span className="hidden md:inline text-sm font-medium">{language === 'ta' ? 'தமிழ்' : 'EN'}</span>
            </button>

            <button
              onClick={() => getUserLocation()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-white transition-colors"
            >
              <MapPin size={18} />
              <span className="hidden md:inline text-sm">
                {language === 'ta' ? 'என் இடம்' : 'My Location'}
              </span>
            </button>
            <button
              onClick={() => fetchWeatherData(coordinates.lat, coordinates.lon)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 flex items-center gap-3">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 size={48} className="animate-spin text-sky-400 mx-auto mb-4" />
              <p className="text-white/70">
                {language === 'ta' ? 'வானிலை தரவு ஏற்றுகிறது...' : 'Loading weather data...'}
              </p>
            </div>
          </div>
        ) : currentWeather ? (
          <div className="space-y-6">
            {alerts.length > 0 && (
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl backdrop-blur-sm ${getSeverityStyle(alert.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={24} className="shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold">{alert.event}</h3>
                        <p className="text-sm opacity-80">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/20">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                <div className="text-center md:text-left">
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                    <MapPin size={20} className="text-sky-400" />
                    <h2 className="text-2xl font-semibold text-white">{currentWeather.location}</h2>
                  </div>
                  <p className="text-white/60 mb-4">
                    {new Date().toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>

                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <div className="text-7xl sm:text-8xl font-light text-white">
                      {currentWeather.temperature}°
                    </div>
                  </div>

                  <p className="text-white/90 text-xl mt-2">{currentWeather.description}</p>
                  <p className="text-white/50 mt-1">
                    {language === 'ta' ? `உணர்கிறது ${currentWeather.feelsLike}°சி` : `Feels like ${currentWeather.feelsLike}°C`}
                  </p>
                </div>

                <div className="WeatherIcon">
                  <WeatherIcon icon={currentWeather.icon} size={100} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-sky-400 mb-3">
                  <CloudRain size={20} />
                  <span className="text-sm font-medium">{language === 'ta' ? 'மழை' : 'Rain'}</span>
                </div>
                <div className="text-3xl font-bold text-white">{currentWeather.rainProbability}%</div>
                <p className="text-white/60 text-sm">{language === 'ta' ? 'வாய்ப்பு' : 'probability'}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-teal-400 mb-3">
                  <Wind size={20} />
                  <span className="text-sm font-medium">{language === 'ta' ? 'காற்று' : 'Wind'}</span>
                </div>
                <div className="text-3xl font-bold text-white">{currentWeather.windSpeed}</div>
                <p className="text-white/60 text-sm">{language === 'ta' ? 'கிமீ/ம' : 'km/h'}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-cyan-400 mb-3">
                  <Droplets size={20} />
                  <span className="text-sm font-medium">{language === 'ta' ? 'ஈரப்பதம்' : 'Humidity'}</span>
                </div>
                <div className="text-3xl font-bold text-white">{currentWeather.humidity}%</div>
                <p className="text-white/60 text-sm">{language === 'ta' ? 'தன்மை' : 'moisture'}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-amber-400 mb-3">
                  <Sun size={20} />
                  <span className="text-sm font-medium">{language === 'ta' ? 'புற ஊதா' : 'UV Index'}</span>
                </div>
                <div className="text-3xl font-bold text-white">{currentWeather.uvIndex.toFixed(1)}</div>
                <p className="text-white/60 text-sm">
                  {currentWeather.uvIndex <= 2
                    ? (language === 'ta' ? 'குறைவு' : 'Low')
                    : currentWeather.uvIndex <= 5
                    ? (language === 'ta' ? 'மிதம்' : 'Moderate')
                    : (language === 'ta' ? 'அதிகம்' : 'High')}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-purple-400 mb-3">
                  <Gauge size={20} />
                  <span className="text-sm font-medium">{language === 'ta' ? 'அழுத்தம்' : 'Pressure'}</span>
                </div>
                <div className="text-3xl font-bold text-white">{currentWeather.pressure}</div>
                <p className="text-white/60 text-sm">hPa</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-emerald-400 mb-3">
                  <Thermometer size={20} />
                  <span className="text-sm font-medium">{language === 'ta' ? 'பார்வை' : 'Visibility'}</span>
                </div>
                <div className="text-3xl font-bold text-white">{currentWeather.visibility}</div>
                <p className="text-white/60 text-sm">{language === 'ta' ? 'கி.மீ' : 'km'}</p>
              </div>
            </div>

            {airQuality && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">
                    {language === 'ta' ? 'காற்று தர குறியீடு' : 'Air Quality Index'}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAQICategory(airQuality.aqi).bg} ${getAQICategory(airQuality.aqi).color}`}>
                    {language === 'ta' ? getAQICategory(airQuality.aqi).labelTa : getAQICategory(airQuality.aqi).label}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70">
                      {language === 'ta' ? 'AQI மதிப்பு' : 'AQI Value'}
                    </span>
                    <span className="text-3xl font-bold text-white">{airQuality.aqi}</span>
                  </div>
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(airQuality.aqi, 100)}%`,
                        background: airQuality.aqi <= 20 ? '#22c55e' : airQuality.aqi <= 40 ? '#eab308' : airQuality.aqi <= 60 ? '#f97316' : airQuality.aqi <= 80 ? '#ef4444' : '#a855f7',
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm mb-1">PM2.5</p>
                    <p className="text-xl font-semibold text-white">{airQuality.pm25} μg/m³</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm mb-1">PM10</p>
                    <p className="text-xl font-semibold text-white">{airQuality.pm10} μg/m³</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm mb-1">Ozone (O₃)</p>
                    <p className="text-xl font-semibold text-white">{airQuality.o3} μg/m³</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-white/50 text-sm mb-1">NO₂</p>
                    <p className="text-xl font-semibold text-white">{airQuality.no2} μg/m³</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <Cloud size={48} className="text-white/30 mx-auto mb-4" />
            <p className="text-white/50">
              {language === 'ta' ? 'வானிலை தரவு கிடைக்கவில்லை' : 'Weather data unavailable'}
            </p>
          </div>
        )}
      </main>

      {/* Chat Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-sky-500 hover:bg-sky-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
      >
        {showChat ? (
          <X size={24} className="text-white" />
        ) : (
          <MessageCircle size={24} className="text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-200">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-white" />
              <h3 className="text-white font-semibold">
                {language === 'ta' ? 'வானிலை உதவியாளர்' : 'Weather Assistant'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Speech Toggle */}
              <button
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className={`p-1.5 rounded-full transition-colors ${speechEnabled ? 'bg-white/30 hover:bg-white/40' : 'bg-white/10 hover:bg-white/20'}`}
                title={speechEnabled ? 'Disable speech' : 'Enable speech'}
              >
                {speechEnabled ? <Volume2 size={16} className="text-white" /> : <VolumeX size={16} className="text-white/70" />}
              </button>
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white text-sm font-medium"
              >
                {language === 'ta' ? 'தமிழ்' : 'EN'}
              </button>
              <button onClick={clearChatHistory} className="text-white/70 hover:text-white text-sm">
                {language === 'ta' ? 'அழி' : 'Clear'}
              </button>
            </div>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>{language === 'ta' ? 'வானிலை பற்றி கேளுங்கள்!' : 'Ask me about the weather!'}</p>
                <p className="text-sm mt-2">
                  {language === 'ta' ? 'எ.கா: "இன்று மழை வருமா?"' : 'e.g., "Will it rain today?"'}
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.role === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                    {msg.role === 'assistant' && speechEnabled && (
                      <button
                        onClick={() => speakText(msg.content, language)}
                        className="mt-2 flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700"
                      >
                        <Volume2 size={12} />
                        <span>{language === 'ta' ? 'பேசு' : 'Speak'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              {/* Voice Input Button */}
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-2 rounded-full transition-colors ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                <Mic size={18} className={isListening ? 'text-white' : 'text-gray-600'} />
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={
                  isListening
                    ? language === 'ta'
                      ? 'கேட்கிறது...'
                      : 'Listening...'
                    : language === 'ta'
                    ? 'வானிலை பற்றி கேளுங்கள்...'
                    : 'Ask about the weather...'
                }
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                disabled={chatLoading}
              />
              <button
                onClick={sendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 p-2 rounded-full transition-colors"
              >
                <Send size={18} className="text-white" />
              </button>
            </div>

            {/* Speech Status */}
            {isSpeaking && (
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-sky-600">
                  <Volume2 size={14} className="animate-pulse" />
                  <span>{language === 'ta' ? 'பேசுகிறது...' : 'Speaking...'}</span>
                </div>
                <button
                  onClick={stopSpeaking}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  {language === 'ta' ? 'நிறுத்து' : 'Stop'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
