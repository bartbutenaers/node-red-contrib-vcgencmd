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

If the result is "0x0" then the power supply is supplying enough current/voltage/power to run the Raspberry pi.  The bits in the result number (e.g. "0x50005") mean different things: 

+ 0: under-voltage 
+ 1: arm frequency capped 
+ 2: currently throttled 
+ 16: under-voltage has occurred 
+ 17: arm frequency capped has occurred 
+ 18: throttling has occurred

Under-voltage occurs when voltage drops below 4.63V, which means the Pi is throttled.
The arm frequency capping occurs with temp > 80’C
Over-temperature occurs with temp > 85’C. The Pi is throttled

Throttling removes turbo mode, which reduces core voltage, and sets arm and gpu frequencies to non-turbo value.
Capping just limits the arm frequency (somewhere between 600MHz and 1200MHz) to try to avoid throttling.
If you are throttled and not under-voltage then you can assume over-temperature. (confirm with vcgencmd measure_temp).

Most of the throttling problems can be solved by using a better power supply.

Although be aware running a stress test is not typical behaviour. If you never see a non-zero get_throttled value in normal usage, then you may not need to do anything.

### Get temperature:
Get the temperature (Celsius) of the specified hardware part (core, arm, ...).

In most cases the 'core' temperature will be all you need, which is the core temperature of the BCM2835 system-on-chip.  Other hardware components can be specified, but there is no physical heating separation between the CPU and GPU...

### Get voltage level:
Get the voltage level (V) of the specified hardware part (core, sdram_c, ...).

One of the following key Raspberry PI components can be specified:
+ core: The GPU processor core.
+ sdram_c: The SDRAM controller.
+ sdram_i: The SDRAM input/output (I/O).
+ sdram_p: The SDRAM physical memory.

This information is mainly useful for users that want to overclock their Raspberry PI.  Note that these voltage levels are around 1,2V in normal conditions.  This in contradiction to the system board, which operates at voltage levels between 4,75V and 5,25V.

### Get clock frequency:
Get the clock frequency (Hz) of the specified hardware part (core, arm, ...).

The Broadcom system-on-chip contains an ARM CPU, a Videocore CPU and RAM memory.  All of these parts have their own clock frequencies.  Moreover the GPU has adjustable clock frequencies for its subcomponents (e.g. for the H264 hardware video decoder).

This information is mainly useful for users that want to overclock their Raspberry PI.

### Get firmware version:
Shows the VideoCore firmware version.

For example:
```
Jan 13 2013 16:24:29
Copyright (c) 2012 Broadcom
version 362371 (release)
```

### Check codec enabled:
Check if the specified codec (H264, MPG2, ...) is enabled. 

### Control video output:
Turn the power of the video output on/off.

### Get out-of-memory statistics:
Get a report of statistics on Out-of-Memory events.

### Get available memory:
Shows how much memory is split between the CPU (arm) and GPU.
