# node-red-contrib-vcgencmd
A Node-RED node to support vcgencmd actions on Raspberry Pi.

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-vcgencmd
```

## Introduction
The ***vcgencmd*** (linux command line) tool can be used to send a broad range of commands to the VideoCore processor (indeed the 'vc' stands for VideoCore).  VideoCore is a low-power mobile multimedia processor (manufactured by Broadcom), which can decode/encode a series of multimedia codecs:

![PCB raspberry](https://user-images.githubusercontent.com/14224149/62681161-548b1480-b9b9-11e9-96c0-547d2517f520.png)

The vcgencmd command is ***only available on Raspberry Pi hardware***, and perhaps on other devices containing a Broadcom VideoCore processor.  When the vcgencmd command cannot be executed, the node will inform you about this in multiple ways:
+ Via a warning in the log: *"The vcgencmd command is not supported by this hardware platform"*.
+ Via the node status:

   ![image](https://user-images.githubusercontent.com/14224149/62809211-9bccee80-bafa-11e9-81e3-cbb388a2f532.png)

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
Turn the power of the HDMI video output on/off, and the new output status (on/off) will be returned in the output message.  The latter one could be used to verify whether the power switch was succesfull.

There are two ways to switch the video output:
1. Use two separate nodes, one for activating the output and another one for deactivating the output:

   ![image](https://user-images.githubusercontent.com/14224149/62818532-bcbc3080-bb48-11e9-9f95-fca335f6a9be.png)
   
   ```
   [{"id":"c9af1deb.e3e6c","type":"inject","z":"412200cc.017c6","name":"Activate video output","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":190,"y":440,"wires":[["57f9d829.9e1b38"]]},{"id":"d4654542.f2ab68","type":"debug","z":"412200cc.017c6","name":"Check if power is 'On'","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","x":700,"y":440,"wires":[]},{"id":"57f9d829.9e1b38","type":"vcgencmd","z":"412200cc.017c6","name":"","command":"display_power","codec":"H264","clock":"core","voltage":"core","memory":"arm","videoOutput":"1","separateMsg":false,"x":450,"y":440,"wires":[["d4654542.f2ab68"]]},{"id":"e6315fcc.61863","type":"inject","z":"412200cc.017c6","name":"Dectivate video output","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":200,"y":480,"wires":[["2e9a2f14.76d8e"]]},{"id":"41799ae7.6bf3a4","type":"debug","z":"412200cc.017c6","name":"Check if power is 'Off'","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","x":700,"y":480,"wires":[]},{"id":"2e9a2f14.76d8e","type":"vcgencmd","z":"412200cc.017c6","name":"","command":"display_power","codec":"H264","clock":"core","voltage":"core","memory":"arm","videoOutput":"0","separateMsg":false,"x":450,"y":480,"wires":[["41799ae7.6bf3a4"]]}]
   ```
   
2. Via a single node, that (de)activates the video output.  This can be achieved by leaving the dropdown empty, and sending an input message with ```msg.payload``` containing one of the following values: *on / ON / 1 / "1" / true* or *off / OFF / 0 / "0" / false*.

   ![image](https://user-images.githubusercontent.com/14224149/62818638-25f07380-bb4a-11e9-9a7c-40d3a4aa69fa.png)
   ```
   [{"id":"8dcc78a1.78a428","type":"inject","z":"412200cc.017c6","name":"Activate video output","topic":"","payload":"on","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":190,"y":560,"wires":[["76472fe1.60b83"]]},{"id":"35a94a76.b11f06","type":"debug","z":"412200cc.017c6","name":"Check power switch","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","x":700,"y":560,"wires":[]},{"id":"76472fe1.60b83","type":"vcgencmd","z":"412200cc.017c6","name":"","command":"display_power","codec":"H264","clock":"core","voltage":"core","memory":"arm","videoOutput":"","separateMsg":false,"x":440,"y":560,"wires":[["35a94a76.b11f06"]]},{"id":"bec6a5fa.92fc58","type":"inject","z":"412200cc.017c6","name":"Dectivate video output","topic":"","payload":"off","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":200,"y":600,"wires":[["76472fe1.60b83"]]}]
   ```

Example output message (when the video output has been set to *'on'*):
```
topic: "display_power"
payload: "on"
```

### Get available memory:
Shows how much memory is split between the CPU (arm) and GPU, both values expressed in Megabytes.

Example output message:
```
topic: "get_mem"
payload: 64
```

## Usage via Docker
[MikeS7](https://github.com/mikeS7) reported that the Domoticz community has found a solution to run vcgencmd in a Docker container (running on a Raspberry Pi platform): see [Pro-Tips](https://github.com/fchauveau/rpi-domoticz-docker#pro-tips) section on their readme page, which is based on this [issue](https://github.com/fchauveau/rpi-domoticz-docker/issues/4).

We will use the same mechanism here:
1. This node will internally use the full path for the command (i.e. /opt/vc/bin/vcgencmd).
2. The Node-RED Docker container should be started with some extra arguments:
   ```
   docker run ... --device=/dev/vchiq -e LD_LIBRARY_PATH=/opt/vc/lib -v /opt/vc:/opt/vc:ro ...
   ```
   
Some explanation about this: 
+ The /opt/vc/ directory of the host Raspberry operating system will be mounted into the Docker container, to make the files available in the container.  
+ Moreover the *VCHIQ* (VideoCore Host Interface Queue) message queue system is made available, to communicate with the GPU.
