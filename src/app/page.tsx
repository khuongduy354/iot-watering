"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useEffect } from "react";
import SoilMoisture from "@/models/SoilMoisture";
import connectDB from "@/lib/mongodb";
// Constants for soil moisture calibration
const SENSOR_DRY_VALUE = 880; // Sensor reading in dry soil
const SENSOR_WET_VALUE = 460; // Sensor reading in wet soil

export default function Home() {
  const [isWatering, setIsWatering] = useState(false);
  const [waterDuration, setWaterDuration] = useState(5);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"percentage" | "raw">("percentage");
  const [isRealtime, setIsRealtime] = useState(false);
  type ChartDatum = {
    time: string;
    moisture: number;
    rawValue: number;
    date: string;
    dateObj: Date;
  };
  const [chartData, setChartData] = useState<ChartDatum[]>([]); // all historical data
  const [filteredChartData, setFilteredChartData] = useState<ChartDatum[]>([]); // data for selected date
  const [liveData, setLiveData] = useState<Record<string, ChartDatum>>({});
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  // Live sensor data via SSE
  useEffect(() => {
    const eventSource = new EventSource('/api/soil-moisture');

    eventSource.onmessage = (event) => {
      let change;
      try {
        change = JSON.parse(event.data);
      } catch {
        // Not JSON, ignore (debug print or keep-alive)
        return;
      }
      if (change.operationType === 'insert' && change.fullDocument) {
        const doc = change.fullDocument;
        setLiveData((current) => {
          const dateObj = new Date(doc.timestamp);
          const hour = dateObj.getHours();
          return {
            ...current,
            [hour]: {
              time: `${hour}:00`,
              moisture: doc.moisturePercentage,
              rawValue: doc.rawValue,
              date: doc.timestamp,
            }
          };
        });
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []); // Always listen
  useEffect(()=>{
    console.log(selectedDate)
    console.log(isRealtime)
  }, [isRealtime])

  // Fetch initial data for today in realtime mode
  useEffect(() => {
    if (isRealtime) {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      const start = Math.floor(startOfDay.getTime() / 1000);
      const end = Math.floor(endOfDay.getTime() / 1000);
      const fetchInitial = async () => {
        try {
          const res = await fetch(`/api/soil-moisture/history?start=${start}&end=${end}`);
          const result = await res.json();
          if (result.status === 'success' && Array.isArray(result.data)) {
            const mapped: ChartDatum[] = result.data.map((doc: any): ChartDatum => {
              const dateObj = new Date(doc.timestamp);
              const hour = dateObj.getHours();
              return {
                time: `${hour}:00`,
                moisture: doc.moisturePercentage,
                rawValue: doc.rawValue,
                date: doc.timestamp,
                dateObj,
              };
            });
            // Convert to hour-keyed object for liveData
            const liveObj: Record<string, ChartDatum> = {};
            mapped.forEach((d: ChartDatum) => {
              liveObj[d.time] = d;
            });
            setLiveData(liveObj);
          } else {
            setLiveData({});
          }
        } catch {
          setLiveData({});
        }
      };
      fetchInitial();
    }
  }, [isRealtime]);

  // Fetch all historical data once and set available dates
  useEffect(() => {
    if (!isRealtime) {
      const fetchAllHistorical = async () => {
        try {
          const res = await fetch('/api/soil-moisture/history');
          const result = await res.json();
          if (result.status === 'success' && Array.isArray(result.data)) {
            const mapped: ChartDatum[] = result.data.map((doc: any): ChartDatum => {
              const dateObj = new Date(doc.timestamp);
              const hour = dateObj.getHours();
              return {
                time: `${hour}:00`,
                moisture: doc.moisturePercentage,
                rawValue: doc.rawValue,
                date: doc.timestamp,
                dateObj,
              };
            });
            setChartData(mapped);
            // Get unique dates, exclude today
            const todayStr = new Date().toDateString();
            const dateSet = new Set<string>();
            mapped.forEach((d) => {
              const dStr = d.dateObj.toDateString();
              if (dStr !== todayStr) {
                dateSet.add(dStr);
              }
            });
            const dates = Array.from(dateSet).map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
            setAvailableDates(dates);
            if (!selectedDate && dates.length > 0) {
              setSelectedDate(dates[0]);
            }
          }
        } catch {
          setChartData([]);
          setAvailableDates([]);
        }
      };
      fetchAllHistorical();
    }
  }, [isRealtime]);

  // Filter chart data for selected date and fill missing hours
  useEffect(() => {
    if (!isRealtime && selectedDate && chartData.length > 0) {
      const filtered = chartData.filter((d: ChartDatum) => {
        return d.dateObj.toDateString() === selectedDate.toDateString();
      });
      // Map hour to ChartDatum
      const hourMap = new Map<number, ChartDatum>();
      filtered.forEach((d) => {
        const hour = d.dateObj.getHours();
        hourMap.set(hour, d);
      });
      // Fill all 24 hours
      const filled: ChartDatum[] = Array.from({ length: 24 }, (_, hour) => {
        if (hourMap.has(hour)) {
          return hourMap.get(hour)!;
        } else {
          // Empty/default value for missing hour
          return {
            time: `${hour}:00`,
            moisture: NaN,
            rawValue: NaN,
            date: selectedDate.toISOString(),
            dateObj: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, 0, 0, 0),
          };
        }
      });
      setFilteredChartData(filled);
    }
  }, [selectedDate, isRealtime, chartData]);

  // Prefill realtime chart with all 24 hours
  const realtimeChartData: ChartDatum[] = Array.from({ length: 24 }, (_, hour) => {
    if (liveData[`${hour}:00`]) {
      const d = liveData[`${hour}:00`];
      return {
        ...d,
        time: `${hour}:00`,
        dateObj: new Date(d.date),
      };
    } else {
      // Empty/default value for missing hour
      const today = new Date();
      return {
        time: `${hour}:00`,
        moisture: NaN,
        rawValue: NaN,
        date: today.toISOString(),
        dateObj: new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0, 0, 0),
      };
    }
  });

  const chartConfig = {
    percentage: {
      dataKey: "moisture",
      domain: [0, 100],
      label: "Moisture %",
      formatter: (value: number, name: string, props: any) => [
        `${value}% (Raw: ${props.payload.rawValue})`,
        "Moisture",
      ],
    },
    raw: {
      dataKey: "rawValue",
      domain: [SENSOR_WET_VALUE - 20, SENSOR_DRY_VALUE + 20],
      label: "Raw Value",
      formatter: (value: number, name: string, props: any) => [
        `Raw: ${value} (${props.payload.moisture}%)`,
        "Sensor Reading",
      ],
    },
  };

  const handleWater = async () => {
    setIsWatering(true);
    try {
      const res = await fetch('/api/test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watering: true, time: waterDuration })
      });
      if (res.status === 409) {
        const result = await res.json();
        alert(result.message || 'Command already present.');
        setIsWatering(false);
        return;
      }
      const result = await res.json();
      console.log('Watering response:', result);
    } catch (error) {
      console.error('Error sending watering command:', error);
    }
    setTimeout(() => setIsWatering(false), waterDuration * 1000);
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-white to-green-50">
      <main className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
          🌱 Plant Watering Dashboard
          {isRealtime && (
            <span className="text-base inline-flex items-center px-3 py-1 rounded-full font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 mr-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Monitoring
            </span>
          )}
        </h1>

        {/* Date Selection */}
        <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-xl shadow-lg border border-blue-100/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              📅 Historical Data
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">
                Realtime Mode
              </span>
              <button
                onClick={() => {
                  if (!isRealtime) {
                    // setSelectedDate(new Date());
                  }
                  setIsRealtime(!isRealtime);
                
                }}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full
                  ${isRealtime ? "bg-blue-600" : "bg-gray-200"}
                  transition-colors
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white
                    transition-transform
                    ${isRealtime ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
            </div>
          </div>
          {/* Date buttons for selecting historical date */}
          {!isRealtime && availableDates.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {availableDates.filter(date => date.toDateString() !== new Date().toDateString()).map((date) => {
                const label = date.toLocaleDateString();
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`px-3 py-1 rounded-lg font-medium border transition-all duration-150 ${isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-100 hover:border-blue-400"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {/* Show today's date as label in realtime mode */}
          {isRealtime && (
            <div className="mt-2">
              <span className="px-3 py-1 rounded-lg font-medium bg-blue-100 text-blue-800 border border-blue-300">
                {new Date().toLocaleDateString()} (Today)
              </span>
            </div>
          )}
        </div>

        {/* Moisture Chart */}
        <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-xl shadow-lg border border-blue-100/50 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Soil Moisture Levels</h2>
              {isRealtime && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 mr-1 rounded-full bg-green-500 animate-pulse"></span>
                  Live
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("percentage")}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${viewMode === "percentage"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow"
                  } transition-all duration-150`}
              >
                <span className="text-lg">📊</span> Percentage
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${viewMode === "raw"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow"
                  } transition-all duration-150`}
              >
                <span className="text-lg">📈</span> Raw Values
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-6 bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg border border-blue-100/50">
            {viewMode === "percentage"
              ? "Showing moisture percentage (0-100%) calculated from sensor readings"
              : `Showing raw sensor values (${SENSOR_WET_VALUE} = wet, ${SENSOR_DRY_VALUE} = dry)`}
          </p>
          <div className="h-[400px] transition-all duration-300">
            {isRealtime ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={realtimeChartData}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="time"
                    label={{ value: "Hour (0-23)", position: "bottom", offset: 10 }}
                    type="category"
                    allowDuplicatedCategory={false}
                    ticks={Array.from({ length: 24 }, (_, i) => `${i}:00`)}
                    tick={{ fontSize: 12, dx: 0, dy: 8 }}
                  />
                  <YAxis
                    domain={chartConfig[viewMode].domain}
                    label={{
                      value: chartConfig[viewMode].label,
                      angle: -90,
                      position: "insideLeft",
                    }}
                    allowDataOverflow={true}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={chartConfig[viewMode].formatter} />
                  <defs>
                    <linearGradient
                      id="colorGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <Line
                    type="monotone"
                    dataKey={chartConfig[viewMode].dataKey}
                    // stroke="url(#colorGradient)"
                    strokeWidth={3}
                    // dot={{ r: 4, stroke: "#4f46e5", strokeWidth: 2, fill: "#fff" }}
                    // label
                    animationDuration={300}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : selectedDate ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...filteredChartData].sort((a, b) => parseInt(a.time) - parseInt(b.time))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="time"
                    label={{ value: "Hour (0-23)", position: "bottom", offset: 10 }}
                    type="category"
                    allowDuplicatedCategory={false}
                    ticks={Array.from({ length: 24 }, (_, i) => `${i}:00`)}
                    tick={{ fontSize: 12, dx: 0, dy: 8 }}
                  />
                  <YAxis
                    domain={chartConfig[viewMode].domain}
                    label={{
                      value: chartConfig[viewMode].label,
                      angle: -90,
                      position: "insideLeft",
                    }}
                    allowDataOverflow={true}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={chartConfig[viewMode].formatter} />
                  <defs>
                    <linearGradient
                      id="colorGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <Line
                    type="monotone"
                    dataKey={chartConfig[viewMode].dataKey}
                    // stroke="url(#colorGradient)"
                    strokeWidth={3}
                    // dot={{ r: 4, stroke: "#4f46e5", strokeWidth: 2, fill: "#fff" }}
                    // label
                    animationDuration={300}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-lg">No data available</div>
            )}
          </div>
        </div>

        {/* Water Button */}
        <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-xl shadow-lg border border-blue-100/50">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
            💧 Manual Control
          </h2>
          <div className="flex items-center gap-6">
            <button
              onClick={handleWater}
              disabled={isWatering}
              className={`
                px-6 py-3 rounded-lg font-medium text-white
                flex items-center gap-2 relative overflow-hidden
                ${isWatering
                  ? "bg-gradient-to-r from-blue-400 to-cyan-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                }
                transition-all duration-150
              `}
            >
              <span
                className={`w-4 h-4 rounded-full ${isWatering ? "animate-ping bg-white/50" : "bg-white/90"
                  }`}
              />
              {isWatering ? "Watering..." : "Water Now"}
            </button>
            {isWatering && (
              <span className="text-sm text-blue-600 animate-pulse">
                Watering in progress...
              </span>
            )}
            <div className="flex items-center gap-2 min-w-[140px]">
              <label className="text-sm font-medium text-gray-600">
                Duration:
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={waterDuration}
                onChange={(e) =>
                  setWaterDuration(
                    Math.max(1, Math.min(30, parseInt(e.target.value) || 1))
                  )
                }
                disabled={isWatering}
                className={`
                  w-16 px-2 py-1 rounded border text-center
                   bg-gray-100 border-gray-300
                   text-gray-600

                  transition-all duration-150 outline-none
                `}
              />
              <span className="text-sm text-gray-600">s</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
