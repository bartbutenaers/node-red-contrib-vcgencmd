# node-red-contrib-pi-vcgencmd
A Node-RED node to support vcgencmd actions on Raspberry Pi.

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-pi-vcgencmd
```

## Introduction
The ***vcgencmd*** (linux command line) tool can be used to send a broad range of commands to the VideoCore processor (indeed the 'vc' stands for VideoCore).  VideoCore is a low-power mobile multimedia processor (manufactured by Broadcom), which can decode/encode a series of multimedia codecs:

![PCB raspberry](https://user-images.githubusercontent.com/14224149/62681161-548b1480-b9b9-11e9-96c0-547d2517f520.png)

The vcgencmd command is ***only available on Raspberry Pi hardware***, and perhaps on other devices containing a Broadcom VideoCore processor.

Remark: The documentation of the vcgencmd tool is not really sufficient to get started.  I got a lot of useful information from the book [Hacks für Raspberry Pi](https://books.google.be/books?isbn=3955616339).  For those who don't speak German, there is a 'translate' link in that page ...

## Node usage
By sending a (random) input message to the input, the node will access (via the vcgendcmd) the processor to get the requested information.  As soon as the processor has returned the information, one or more output messages will be send containing that information:

![Example flow](https://user-images.githubusercontent.com/14224149/62661902-b1171100-b972-11e9-93d0-ede5bfef846d.png)

Some remarks:
+ During the processing, the process id (PID) of the child process will be displayed in the node status.
+ When a new input message is send during the processing of the previous message, then the new input message will be ignored.  A warning will be logged to inform about this...

## Node configuration
The vcgencmd command offers a large amount of options on a Raspberry Pi, but we agreed on the Node-RED [forum](https://discourse.nodered.org/t/ras-pi-supply-voltage/8791/12) to reduce the number of options in this node.  The other (less useful) options can be called easily from Node-RED via an Exec node.  The following options are currently implemented in this node:

### Check throttling:
Check whether the hardware has been throttled due to unsufficient current/voltage/power, which will result in bad performance.  Most of the throttling problems can be solved by using a better power supply.

Remark: the vcgencmd command returns a bitwise pattern, in which every bit flag has its own meaning.  Since this is rather hard to interpret for most users, this node will convert the bit flags to human readable fields in the output message(s): see the example output messages below ...

There are two different modes in which your hardware will become slower:
+ ***Throttling*** will disable the turbo mode, which reduces the core voltage and sets ARM and GPU frequencies to non-turbo value.
+ ***Capping*** just limits the arm frequency (somewhere between 600MHz and 1200MHz) to try to avoid throttling.

When the hardware is throttled but there is no under-voltage, then you can assume over-temperature. That assumption can be confirmed by using the *"Get temperature"* option. 

The hardware will switch automatically to another status, when the sensor measurements reach some criteria:
+ ***Under-voltage*** occurs when voltage drops below 4.63V.  In that case the Raspberry will be throttled.
+ The arm ***frequency capping*** occurs at temperatures above 80 degrees Celsius.
+ ***Over-temperature*** occurs at temperatures above 85 degrees Celsius. In that case the Raspberry will be throttled.

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

Remark: when you only need to measure the temperature of your processor, you can also use my [node-red-contrib-cpu](https://github.com/bartbutenaers/node-red-contrib-cpu#single-output-message-with-core-temperatures) node.  That cpu-node has the advantage that it works on multiple platforms, so not only Raspberry Pi!

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
Shows the VideoCore firmware version.  The output will be splitted automatically into an array of 3 strings.

Example output message:
```
topic: "version"
payload: [
   "Sep 21 2018 15:43:17 ",
   "Copyright (c) 2012 Broadcom",
   "version 07f57128b8491ffdefcdfd13f7b4961b3006d9a9 (clean) (release)"
]
```

### Check codec enabled:
Check if the specified codec (H264, MPG2, ...) is enabled.

Remark: For some codecs (like MPG2, WMV9, WVC1), you first need to pay a license fee before they can be used...

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
