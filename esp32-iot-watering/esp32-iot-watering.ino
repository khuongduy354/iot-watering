#include <WiFi.h>
#include <string>
#include <HTTPClient.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <ArduinoJson.h> 
// Replace with your network credentials
// const char* ssid = "Go Home Viettel";
// const char* password = "0932898080";
// String wifiIP = "192.168.1.23:3000";
const char* ssid = "Sky";
const char* password = "123456789";
String wifiIP = "192.168.78.19:3000";

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // NTP server, UTC offset (seconds), update interval (ms)

// Data
const int sensorPin = 34;
const int relayPin = 23;
float sensorValue = 0;
const int WetValue = 100;
const int DryValue = 0;
bool pumpRunning = false;
unsigned long pumpEndTime = 0;

// Function
float getRawDataSensor();
float getPercentageDataSensor(float rawValue);
void sendSoilMoistureData(float rawValue, float moisturePercentage);
void pumpControl();


unsigned long getTimeNow(){ 
  timeClient.update();
  return timeClient.getEpochTime();
}

void controlRelay(){
  int check = digitalRead(relayPin);
  Serial.println(check); 
  digitalWrite(relayPin, HIGH); // Turn relay on
  delay(2000); 
  digitalWrite(relayPin, LOW); // Turn relay off
  delay(2000);
}

void pumpControl(){
  unsigned long now = millis();

  // Kiểm tra nếu đang chạy bơm và hết thời gian thì tắt
  if (pumpRunning && now >= pumpEndTime) {
    digitalWrite(relayPin, LOW);
    pumpRunning = false;
    Serial.println("Pump stopped");
  }

  // Nếu WiFi OK và không đang chạy bơm → gọi API
  if (!pumpRunning) {
    HTTPClient http;
    String url = "http://" + wifiIP + "/api/test-data"; 
    http.begin(url);
    int httpCode = http.GET();

    if (httpCode>=200 && httpCode < 300 && httpCode != 204) {
      Serial.println("success");
      String jsonPayload = http.getString();
      Serial.println("Response: " + jsonPayload);

      // Phân tích JSON
      StaticJsonDocument<200> data;
      DeserializationError error = deserializeJson(data, jsonPayload);
      if (!error) {
        Serial.println("Deserialized success");

        bool watering = data["watering"] | false;
        int timeSec = data["time"] | 0;

        if (watering && timeSec > 0) {
          Serial.println("Pump ON for " + String(timeSec) + " seconds");
          digitalWrite(relayPin, HIGH); // bật bơm
          pumpRunning = true;
          pumpEndTime = now + (timeSec * 1000UL); // tính thời gian kết thúc
        }
      }else{
        Serial.println("Error parsing JSON: ");
        // Serial.println(String(error)); 
      }
    } else if (httpCode == 204){
      Serial.println("No command");
    }
    else  {
      Serial.println("Error calling API: " + String(httpCode));
    }
    http.end();
  }

  delay(1000); // Poll mỗi 1 giây

}

float getRawDataSensor(){
  Serial.print("Soil Moisture Value: ");
  Serial.println(analogRead(sensorPin));
  return analogRead(sensorPin);
}

float getPercentageDataSensor(float rawValue){
  return 100;
}

void sendSoilMoistureData(float rawValue, float moisturePercentage){ 
  String url = "http://" + wifiIP + "/api/soil-moisture"; 
  Serial.println(url);
  String timeNow = String(getTimeNow()); 
  String jsonPayload = "{\"rawValue\":" + String(rawValue) + ",\"moisturePercentage\":" + String(moisturePercentage) + ",\"timestamp\":" + timeNow + "}"; 

    // Send POST request to log in
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(jsonPayload);

  if (httpCode>=200 && httpCode < 300) {
    Serial.printf("Login response: %d\n", httpCode);
  } else {
    Serial.println("Login failed!");
    Serial.println(httpCode);
  }
}


void setup() { 
  Serial.begin(9600);

  // Wifi connection
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password); 

  while (WiFi.status() != WL_CONNECTED) { 
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP()); 

  // Time connection
  timeClient.begin();
  timeClient.update();
  Serial.println(timeClient.getEpochTime());
  // sendSoilMoistureData(2.0, 3.0);
  pinMode(relayPin, OUTPUT);
}


void loop() {
//   float rawData = getRawDataSensor();
//  float percentageData = getPercentageDataSensor(rawData);
  //sendSoilMoistureData(rawData,percentageData);
  // controlRelay();
   pumpControl();
}