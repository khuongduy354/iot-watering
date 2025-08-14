#include <WiFi.h>
#include <string>
#include <HTTPClient.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

// Replace with your network credentials
const char* ssid = "Dooing Coffee Lab";
const char* password = "dooingxinchao";
String wifiIP = "128.1.0.145:3000";

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // NTP server, UTC offset (seconds), update interval (ms)
void sendSoilMoistureData(float rawValue, float moisturePercentage);
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

  sendSoilMoistureData(2.0,3.0);

}


unsigned long getTimeNow(){ 
  timeClient.update();
  return timeClient.getEpochTime();
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
  }
}


void loop() {
}