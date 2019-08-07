# node-red-contrib-pi-vcgencmd
A Node-RED node to support vcgencmd actions on Raspberry Pi.

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-pi-vcgencmd
```

## Introduction
The vcgencmd tool is used to send a broad range of commands to the VideoCore processor (indeed the 'vc' stands for VideoCore).

The documentation of the vcgencmd tool is not really sufficient to get started.  I got a lot of useful information from the book [Hacks für Raspberry Pi](https://books.google.be/books?isbn=3955616339).  For those who don't speak German, there is a 'translate' link in that page ...

Remark: The vcgencmd command is ***only available on Raspberry Pi hardware***, and perhaps on other devices containing a Broadcom VideoCore processor.

## Node configuration
The vcgencmd command offers a large amount of options on a Raspberry Pi, but we agreed on the Node-RED [forum](https://discourse.nodered.org/t/ras-pi-supply-voltage/8791/12) to reduce the number of options in this node:

### Check throttling:
Check whether the hardware has been throttle due to under-voltage levels, which will result in bad performance.

If the result is "0x0" then the power supply is supplying enough current/voltage/power to run the Raspberry pi.  All bits in the result value (e.g. "0x50005") have their own purpose: 

+ 0: Under-voltage detected
+ 1: Arm frequency capped 
+ 2: Currently throttled 
+ 3:	Soft temperature limit active
+ 16: Under-voltage has occurred 
+ 17: Arm frequency capped has occurred 
+ 18: Throttling has occurred
+ 19: Soft temperature limit has occurred

Under-voltage occurs when voltage drops below 4.63V, which means the Pi is throttled.
The arm frequency capping occurs with temp > 80’C
Over-temperature occurs with temp > 85’C. The Pi is throttled

Throttling removes turbo mode, which reduces core voltage, and sets arm and gpu frequencies to non-turbo value.
Capping just limits the arm frequency (somewhere between 600MHz and 1200MHz) to try to avoid throttling.
If you are throttled and not under-voltage then you can assume over-temperature. (confirm with vcgencmd measure_temp).

Most of the throttling problems can be solved by using a better power supply.

Although be aware running a stress test is not typical behaviour. If you never see a non-zero get_throttled value in normal usage, then you may not need to do anything.

Example output message, in case the checkbox *"Separate output messages per topic"* is unselected:
```
topic: "get_throttled"
payload: { 
   underVoltage: false
   frequencyCapped: false
   throttled: false
   softTempLimit: false
   underVoltageOccurred: false
   frequencyCappedOccurred: false
   throttledOccurred: false
   softTempLimitOccurred: false
}
```

Example output messages, in case the checkbox *"Separate output messages per topic"* is selected.  A series of messages will be send:
```
topic: "under_voltage"
payload: false
```
```
topic: "frequency_capped"
payload: false
```
```
topic: "throttled"
payload: false
```
```
topic: "soft_temp_limit"
payload: false
```
```
topic: "under_voltage_occurred"
payload: false
```
```
topic: "frequency_capped_occurred"
payload: false
```
```
topic: "throttled_occurred"
payload: false
```
```
topic: "soft_temp_limit_occurred"
payload: false
```

### Get temperature:
Get the temperature (Celsius) of the core component.

In most cases the 'core' temperature will be all you need, which is the core temperature of the BCM2835 system-on-chip.  Other hardware components can be specified, but there is no physical heating separation between the CPU and GPU...

Example output message:
```
topic: "measure_temp"
payload: 50.5
```

### Get voltage level:
Get the voltage level (V) of the specified hardware component (core, sdram_c, ...).

One of the following key Raspberry PI components can be specified:
+ core: The GPU processor core.
+ sdram_c: The SDRAM controller.
+ sdram_i: The SDRAM input/output (I/O).
+ sdram_p: The SDRAM physical memory.

This information is mainly useful for users that want to overclock their Raspberry PI.  Note that these voltage levels are around 1,2V in normal conditions.  This in contradiction to the system board, which operates at voltage levels between 4,75V and 5,25V.

Example output message:
```
topic: "measure_volts"
payload: 1.2
```

### Get clock frequency:
Get the clock frequency (Hz) of the specified hardware component (core, arm, ...).

The Broadcom system-on-chip contains an ARM CPU, a Videocore CPU and RAM memory.  All of these components have their own clock frequencies.  Moreover the GPU has adjustable clock frequencies for its subcomponents (e.g. for the H264 hardware video decoder).

This information is mainly useful for users that want to overclock their Raspberry PI.

One of the following components can be selected:
+ arm:	ARM cores
+ core:	VC4 scaler cores
+ H264:	H264 block
+ isp:	Image system Pipeline
+ v3d:	3D block
+ uart:	UART
+ pwm:	Pulse Width Modulation block (analogue audio output)
+ emmc:	SD card interface
+ pixel:	Pixel valve
+ vec:	Analogue video encoder
+ hdmi:	HDMI
+ dpi:	Display Peripheral Interface

Example output message:
```
topic: "measure_clock"
payload: 250000000
```

### Get firmware version:
Shows the VideoCore firmware version.

Example output message:
```
topic: "version"
payload: "Sep 21 2018 15:43:17 ↵Copyright (c) 2012 Broadcom↵version 07f57128b8491ffdefcdfd13f7b4961b3006d9a9 (clean) (release)"
```

### Check codec enabled:
Check if the specified codec (H264, MPG2, ...) is enabled.

Example output message:
```
topic: "codec_enabled"
payload: true
```

### Control video output:
Turn the power of the video output on/off.

Since we are not fetching information from the hardware (i.e. we are controlling it), no output message will be send.

### Get available memory:
Shows how much memory is split between the CPU (arm) and GPU, both values expressed in Megabytes.

Example output message:
```
topic: "get_mem"
payload: 64
```
