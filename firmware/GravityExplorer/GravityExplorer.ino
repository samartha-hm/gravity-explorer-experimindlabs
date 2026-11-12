// GravityExplorer v1 — Arduino Uno R3, bogde HX711 library 0.7.5.
// No automatic tare: an occupied platform must never become the zero reference.
#include <HX711.h>
#include <EEPROM.h>
#include <math.h>
#include <stddef.h>

const byte BUTTON_PIN=2, PREVIOUS_PIN=3, DATA_PIN=4, CLOCK_PIN=5;
const byte WINDOW=20;
HX711 adc;
struct __attribute__((packed)) Calibration {
  uint32_t magic;
  byte version;
  int32_t zero;
  float factor;
  uint16_t checksum;
};
Calibration calibration;
long readings[WINDOW];
byte count=0, cursor=0;
bool calibrated=false, tarePending=false, buttonState=HIGH, buttonRaw=HIGH;
bool previousState=HIGH, previousRaw=HIGH;
uint32_t previousAt=0;
long pendingZero=0;
uint32_t boot=0, sequence=0, lastSample=0, lastHello=0, lastFault=0, buttonAt=0;
char command[64];
byte commandLength=0;
bool dropping=false;

uint16_t checksum(const Calibration &value) {
  uint16_t crc=0xFFFF;
  const byte *bytes=(const byte *)&value;
  for(size_t i=0;i<offsetof(Calibration,checksum);i++) {
    crc^=bytes[i];
    for(byte j=0;j<8;j++)crc=(crc&1)?(crc>>1)^0xA001:crc>>1;
  }
  return crc;
}
void frame(const __FlashStringHelper *type) {
  Serial.print(F("{\"v\":1,\"boot\":\"uno-"));Serial.print(boot);
  Serial.print(F("\",\"seq\":"));Serial.print(sequence++);
  Serial.print(F(",\"type\":\""));Serial.print(type);Serial.print('"');
}
void hello() {
  frame(F("hello"));Serial.print(F(",\"calibrated\":"));
  Serial.print(calibrated&&!tarePending?F("true"):F("false"));Serial.println('}');
  lastHello=millis();
}
void ack(unsigned long id,bool ok,const __FlashStringHelper *message) {
  frame(F("ack"));Serial.print(F(",\"id\":"));Serial.print(id);
  Serial.print(F(",\"ok\":"));Serial.print(ok?F("true"):F("false"));
  Serial.print(F(",\"message\":\""));Serial.print(message);Serial.println(F("\"}"));
}
bool stable(double &mean) {
  if(count<WINDOW || millis()-lastSample>500)return false;
  long low=readings[0],high=readings[0];mean=0;
  for(byte i=0;i<count;i++){low=min(low,readings[i]);high=max(high,readings[i]);mean+=readings[i];}
  mean/=count;
  // Before calibration use a conservative raw ADC noise bound; tune to the cell.
  double limit=calibrated?max(100.0,abs((double)calibration.factor)*0.2):10000.0;
  if(high-low>limit || low<=-8300000L || high>=8300000L)return false;
  double first=0,second=0;
  // Compare chronological halves to reject gradual loading, not just vibration.
  for(byte i=0;i<WINDOW;i++){
    if(i<WINDOW/2)first+=readings[(cursor+i)%WINDOW];
    else second+=readings[(cursor+i)%WINDOW];
  }
  return abs(first/(WINDOW/2)-second/(WINDOW/2))<=limit/2;
}
void processCommand() {
  char name[8],extra;unsigned long id=0;float kg=0;double raw=0;
  int fields=sscanf(command,"%7s %lu %c",name,&id,&extra);
  if(fields<2 || !id)return;
  if(strcmp(name,"TARE")==0 && fields==2) {
    if(!stable(raw)){ack(id,false,F("Wait for a stable empty platform (2 seconds)."));return;}
    pendingZero=lround(raw);tarePending=true;count=0;cursor=0;
    hello();ack(id,true,F("Empty platform recorded. Add reference mass, wait 3 seconds, then calibrate."));
  } else if(strcmp(name,"CAL")==0) {
    // AVR scanf does not support floats. Parse the known mass explicitly.
    char *firstSpace=strchr(command,' ');char *secondSpace=firstSpace?strchr(firstSpace+1,' '):NULL;
    char *end=NULL;
    if(secondSpace)kg=strtod(secondSpace+1,&end);
    while(end && *end==' ')end++;
    if(!secondSpace || !end || *end || !isfinite(kg) || kg<1 || kg>100){ack(id,false,F("Reference mass must be 1 to 100 kg."));return;}
    if(!tarePending){ack(id,false,F("Record the empty platform first."));return;}
    if(!stable(raw)){ack(id,false,F("Reference mass is moving. Wait at least 3 seconds."));return;}
    double factor=(raw-pendingZero)/kg;
    if(abs(raw-pendingZero)<1000 || abs(factor)<10 || abs(factor)>10000000){ack(id,false,F("Reference signal too small or invalid. Check the load cells."));return;}
    calibration.magic=0x47525631UL;calibration.version=1;calibration.zero=pendingZero;calibration.factor=factor;
    calibration.checksum=checksum(calibration);EEPROM.put(0,calibration);
    calibrated=true;tarePending=false;hello();ack(id,true,F("Calibration saved. Remove reference mass and verify zero."));
  } else ack(id,false,F("Unknown or malformed command."));
}
void setup() {
  pinMode(BUTTON_PIN,INPUT_PULLUP);pinMode(PREVIOUS_PIN,INPUT_PULLUP);pinMode(LED_BUILTIN,OUTPUT);
  buttonState=buttonRaw=digitalRead(BUTTON_PIN); // Held at boot is not a press.
  previousState=previousRaw=digitalRead(PREVIOUS_PIN);
  Serial.begin(115200);adc.begin(DATA_PIN,CLOCK_PIN);
  EEPROM.get(0,calibration);
  calibrated=calibration.magic==0x47525631UL && calibration.version==1 && calibration.checksum==checksum(calibration) && isfinite(calibration.factor) && abs(calibration.factor)>=10;
  EEPROM.get(64,boot);if(boot==0xFFFFFFFFUL)boot=0;boot++;EEPROM.put(64,boot);
  hello();lastSample=millis();
}
void loop() {
  uint32_t now=millis();
  bool rawButton=digitalRead(BUTTON_PIN);
  if(rawButton!=buttonRaw){buttonRaw=rawButton;buttonAt=now;}
  if(now-buttonAt>=40 && buttonState!=buttonRaw){
    buttonState=buttonRaw;
    if(buttonState==LOW){frame(F("button"));Serial.println(F(",\"action\":\"next\"}"));}
  }
  bool rawPrevious=digitalRead(PREVIOUS_PIN);
  if(rawPrevious!=previousRaw){previousRaw=rawPrevious;previousAt=now;}
  if(now-previousAt>=40 && previousState!=previousRaw){
    previousState=previousRaw;
    if(previousState==LOW){frame(F("button"));Serial.println(F(",\"action\":\"previous\"}"));}
  }
  digitalWrite(LED_BUILTIN,buttonState==LOW?HIGH:LOW);
  // Bound work per loop so noisy serial input cannot starve the scale/button.
  for(byte i=0;i<32 && Serial.available();i++) {
    char c=Serial.read();
    if(c=='\n'){if(!dropping && commandLength){command[commandLength]=0;processCommand();}commandLength=0;dropping=false;}
    else if(c!='\r' && !dropping){if(commandLength<sizeof(command)-1)command[commandLength++]=c;else dropping=true;}
  }
  if(adc.is_ready()) {
    long raw=adc.read();lastSample=now;
    readings[cursor]=raw;cursor=(cursor+1)%WINDOW;if(count<WINDOW)count++;
    bool valid=calibrated&&!tarePending && raw>-8300000L && raw<8300000L;
    double kg=valid?(raw-(double)calibration.zero)/calibration.factor:0;
    frame(F("measurement"));Serial.print(F(",\"kg\":"));Serial.print(kg,3);
    Serial.print(F(",\"valid\":"));Serial.print(valid?F("true"):F("false"));Serial.println('}');
  }
  if(now-lastHello>=3000)hello();
  if(now-lastSample>500 && now-lastFault>=1000){
    count=0;cursor=0;frame(F("fault"));Serial.println(F(",\"message\":\"HX711 not responding\"}"));lastFault=now;
  }
}
