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

// Constants for soil moisture calibration
const SENSOR_DRY_VALUE = 880; // Sensor reading in dry soil
const SENSOR_WET_VALUE = 460; // Sensor reading in wet soil

// Mock data - simulating soil moisture readings
const generateMockData = (date: Date) => {
  return Array.from({ length: 24 }, (_, i) => {
    // Simulate raw sensor value between wet and dry (460-880)
    const rawValue = Math.floor(
      Math.random() * (SENSOR_DRY_VALUE - SENSOR_WET_VALUE) + SENSOR_WET_VALUE
    );

    // Convert to percentage (0-100%)
    const moisturePercentage = Math.floor(
      ((SENSOR_DRY_VALUE - rawValue) / (SENSOR_DRY_VALUE - SENSOR_WET_VALUE)) *
        100
    );

    return {
      time: `${i}:00`,
      moisture: moisturePercentage,
      rawValue: rawValue,
      date: new Date(date.setHours(i, 0, 0, 0)).toISOString(),
    };
  });
};

const MOCK_DATES = [
  new Date("2025-07-11"),
  new Date("2025-07-10"),
  new Date("2025-07-09"),
  new Date("2025-07-08"),
  new Date("2025-07-07"),
];

export default function Home() {
  const [isWatering, setIsWatering] = useState(false);
  const [waterDuration, setWaterDuration] = useState(5);
  const [selectedDate, setSelectedDate] = useState(MOCK_DATES[0]);
  const [viewMode, setViewMode] = useState<"percentage" | "raw">("percentage");
  const [isRealtime, setIsRealtime] = useState(false);
  const [mockData, setMockData] = useState(
    generateMockData(new Date(selectedDate))
  );

  // Realtime data simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRealtime) {
      // Update latest data point every 2 seconds
      interval = setInterval(() => {
        setMockData((current) => {
          const newData = [...current];
          const now = new Date();
          const hour = now.getHours();
          const rawValue = Math.floor(
            Math.random() * (SENSOR_DRY_VALUE - SENSOR_WET_VALUE) +
              SENSOR_WET_VALUE
          );
          const moisturePercentage = Math.floor(
            ((SENSOR_DRY_VALUE - rawValue) /
              (SENSOR_DRY_VALUE - SENSOR_WET_VALUE)) *
              100
          );

          newData[hour] = {
            time: `${hour}:00`,
            moisture: moisturePercentage,
            rawValue: rawValue,
            date: now.toISOString(),
          };

          return newData;
        });
      }, 2000);
    } else {
      // Reset to historical data when realtime is turned off
      setMockData(generateMockData(new Date(selectedDate)));
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRealtime]); // Remove selectedDate dependency

  // Update data when date changes (only in non-realtime mode)
  useEffect(() => {
    if (!isRealtime) {
      setMockData(generateMockData(new Date(selectedDate)));
    }
  }, [selectedDate, isRealtime]);

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

  const handleWater = () => {
    setIsWatering(true);
    // Simulate watering action using the selected duration
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
                    const today = new Date();
                    setSelectedDate(today);
                    setMockData(generateMockData(today));
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
          <div
            className={`flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 ${
              isRealtime ? "opacity-50" : ""
            }`}
          >
            {MOCK_DATES.map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => !isRealtime && setSelectedDate(date)}
                disabled={isRealtime}
                className={`
                  min-w-[100px] px-4 py-2 rounded-lg font-medium
                  ${
                    date.toISOString() === selectedDate.toISOString()
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200 hover:shadow"
                  }
                  transition-all duration-150 transform hover:-translate-y-0.5
                `}
              >
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </button>
            ))}
          </div>
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
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  viewMode === "percentage"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow"
                } transition-all duration-150`}
              >
                <span className="text-lg">📊</span> Percentage
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  viewMode === "raw"
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="time"
                  label={{ value: "Time", position: "bottom" }}
                />
                <YAxis
                  domain={chartConfig[viewMode].domain}
                  label={{
                    value: chartConfig[viewMode].label,
                    angle: -90,
                    position: "insideLeft",
                  }}
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
                  stroke="url(#colorGradient)"
                  strokeWidth={3}
                  dot={false}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
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
                ${
                  isWatering
                    ? "bg-gradient-to-r from-blue-400 to-cyan-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                }
                transition-all duration-150
              `}
            >
              <span
                className={`w-4 h-4 rounded-full ${
                  isWatering ? "animate-ping bg-white/50" : "bg-white/90"
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
                  ${
                    isWatering
                      ? "bg-gray-100 border-gray-300"
                      : "bg-white border-cyan-200 hover:border-cyan-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  }
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
