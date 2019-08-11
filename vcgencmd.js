/**
 * Copyright 2019 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
 module.exports = function(RED) {
    var settings = RED.settings;
    var child_process = require('child_process');

    function VcGenCmdNode(config) {
        RED.nodes.createNode(this, config);
        this.command     = config.command;
        this.codec       = config.codec;
        this.clock       = config.clock;
        this.voltage     = config.voltage;
        this.memory      = config.memory;
        this.videoOutput = config.videoOutput;
        this.separateMsg = config.separateMsg;
        this.supported   = true;
        // To support Docker on Raspberry Pi, we will use the full path (for Raspberry).
        // See https://github.com/bartbutenaers/node-red-contrib-vcgencmd/issues/1
        this.fullPath    = "/opt/vc/bin/vcgencmd";
        
        var node = this;
        
        // Check whether the vcgencmd command is supported on the current system.
        child_process.exec(node.fullPath + " version", function (err, stdout, stderr) {
            if (stderr) {
                node.supported = false;
                node.warn("The " + node.fullPath + " command is not supported by this hardware platform");
                node.status({fill:"grey", shape:"dot", text:"not supported"});
            }
        });

        node.on("input", function(msg) {
            if (!node.supported) {
                // Ignore the input message when the vcgencmd command is not supported by this hardware platform
                return;
            }
            
            if (node.childProcess) {
                node.warn("Previous vcgencmd command hasn't finished yet");
                return;
            }
            
            var command = node.fullPath + " " + node.command;
            
            // For some commands an extra command line parameter will be specified in the configuration
            switch (node.command) {
                case "codec_enabled":
                    command = command + " " + node.codec;
                    break;
                case "measure_clock":
                    command = command + " " + node.clock;
                    break;
                case "measure_volts":
                    command = command + " " + node.voltage;
                    break;     
                case "get_mem":
                    command = command + " " + node.memory;
                    break;     
                case "display_power":
                    var videoOutput = node.videoOutput;
                
                    if (videoOutput === "") {
                        // When no videoOutput option has been specified in the config screen, then get it from the msg.payload
                        videoOutput = msg.payload;
                        
                        if (videoOutput === "ON" || videoOutput === "on" || videoOutput === "1" || videoOutput === 1 || videoOutput === true) {
                            videoOutput = "1";
                        }
                        else if (videoOutput === "OFF" || videoOutput === "off" || videoOutput === "0" || videoOutput === 0 || videoOutput === false) {
                            videoOutput = "0";
                        }
                        else {
                            node.warn("The msg.payload should contain one of the following values: on/ON/off/OFF");
                            return;
                        }
                    }                
                
                    command = command + " " + videoOutput;
                    break;     
            }  

            node.childProcess = child_process.exec(command, function (err, stdout, stderr) {
                if (err) {
                    node.error("Error executing " + node.fullPath + " : " + err);
                }
                else {                 
                    // Remove newline ... characters from the result
                    var result = stdout.trim();
                    
                    var messages = [];
                    
                    // Convert the command output to the correct format
                    switch (node.command) {
                        case "version":
                            // Returns for example "Jan 13 2013 16:24:29
                            //                      Copyright (c) 2012 Broadcom
                            //                      version 362371 (release)"
                            // The 3 lines are separated by newlines, so we will split it into an array with length 3.
                            // The splitting will be done on \n (\r and \r\n are not required since vcgencmd is only available on Linux).
                            result = result.split(/\n/);
                            messages.push({payload: result, topic: node.command});
                            break;
                        case "display_power":
                            // When we send e.g. value 'on' then the result will be "display_power=1" (which confirms that the power has been switched on).
                            // So we are only interested in the part after the equal-operator.
                            result = result.split('=')[1];
                            
                            // Convert '0' to 'off' and '1' to 'on'
                            if (result === "1") {
                                result = "on";
                            }
                            else {
                                result = "off";
                            }
                            
                            messages.push({payload: result, topic: node.command});
                            break;
                        case "codec_enabled":
                            // Returns for example "H264=enabled".
                            // So we are only interested in the part after the equal-operator.
                            result = result.split('=')[1];
                            
                            // Let's convert it to a boolean
                            if (result === "enabled") {
                                result = true;
                            }
                            else {
                                result = false;
                            }
                            
                            messages.push({payload: result, topic: node.command});
                            break;
                        case "measure_clock":
                            // Returns for example "frequency(45)=700000000".
                            // The number between the brackets is (an internal enum denoting) the clock that is being measured.
                            //     1 = core / 4 = dpi / 9 = hdmi / 10 = vec / 22 = uart / 25 = pwm / 28 = h264 / 29 = pixel / 42 = isp / 43 = v3d / 45 = arm / 47 = emmc / ...
                            // The full enum can be found in the firmware source code:
                            // https://github.com/shacharr/videocoreiv-qpu-driver/blob/master/brcm_usrlib/dag/vmcsx/vcfw/drivers/chip/clock.h#L141
                            // So we are only interested in the part after the equal-operator.
                            result = result.split('=')[1];
                            result = parseFloat(result);
                            
                            messages.push({payload: result, topic: node.command});
                            break;
                        case "measure_volts":
                            // Returns for example "volt=1.20V".
                            // So we are only interested in the part after the equal-operator.
                            result = result.split('=')[1];
                            
                            // And since the unit is always Volt, we can remove the "V"
                            result = result.substring(0, result.length - 1);
                            result = parseFloat(result);
                            
                            messages.push({payload: result, topic: node.command});
                            break;
                        case "measure_temp":
                            // Returns for example "temp=42.8'C".
                            // So we are only interested in the part after the equal-operator.
                            result = result.split('=')[1];
                            
                            // And since the unit is always Celsius, we can remove the "'C"
                            result = result.substring(0, result.length - 2);
                            result = parseFloat(result);
                            
                            messages.push({payload: result, topic: node.command});
                            break;
                        case "get_throttled":
                            // Thanks to Normen Hansen (see https://github.com/normen/rpi-throttled/blob/master/lib.js)
                            var number = parseInt(String(result).replace("throttled=",""), 16);
                            
                            // Convert the individual bits to separate boolean variables (to make them human readable)
                            var underVoltage            = (number >> 0)  & 1 ? true : false;
                            var frequencyCapped         = (number >> 1)  & 1 ? true : false;
                            var throttled               = (number >> 2)  & 1 ? true : false;
                            var softTempLimit           = (number >> 3)  & 1 ? true : false;
                            var underVoltageOccurred    = (number >> 16) & 1 ? true : false;
                            var frequencyCappedOccurred = (number >> 17) & 1 ? true : false;
                            var throttledOccurred       = (number >> 18) & 1 ? true : false;
                            var softTempLimitOccurred   = (number >> 19) & 1 ? true : false;
                            
                            if (node.separateMsg) {
                                // Create a separate output message for every variable
                                messages.push({payload: underVoltage           , topic: "under_voltage"});
                                messages.push({payload: frequencyCapped        , topic: "frequency_capped"});
                                messages.push({payload: throttled              , topic: "throttled"});
                                messages.push({payload: softTempLimit          , topic: "soft_temp_limit"});
                                messages.push({payload: underVoltageOccurred   , topic: "under_voltage_occurred"});
                                messages.push({payload: frequencyCappedOccurred, topic: "frequency_capped_occurred"});
                                messages.push({payload: throttledOccurred      , topic: "throttled_occurred"});
                                messages.push({payload: softTempLimitOccurred  , topic: "soft_temp_limit_occurred"});
                            }
                            else {
                                result = {};
                                
                                // Create a single output message, with payload containing all the variables
                                result.underVoltage            = underVoltage;
                                result.frequencyCapped         = frequencyCapped;
                                result.throttled               = throttled;
                                result.softTempLimit           = softTempLimit;
                                result.underVoltageOccurred    = underVoltageOccurred;
                                result.frequencyCappedOccurred = frequencyCappedOccurred;
                                result.throttledOccurred       = throttledOccurred;
                                result.softTempLimitOccurred   = softTempLimitOccurred;
                                
                                messages.push({payload: result, topic: node.command});
                            }
                            
                            break;
                        case "get_mem":
                            // Returns for example "arm=448M".
                            // So we are only interested in the part after the equal-operator.
                            result = result.split('=')[1];
                            
                            // And since the unit is always MegaByte, we can remove the "M".
                            // TODO This could become Gb in the future ...
                            result = result.substring(0, result.length - 1);
                            result = parseInt(result);
                            
                            messages.push({payload: result, topic: node.command});
                            break;
                    }

                    // Remove the payload from the original input message
                    delete msg.payload;
                    msg.payload = {};
                    
                    // Send the required output message(s)
                    for (var i = 0; i < messages.length; i++) {
                        var message = messages[i];
                        var clonedMsg = RED.util.cloneMessage(msg);
                        clonedMsg.payload = message.payload;
                        clonedMsg.topic = message.topic;
                        node.send(clonedMsg);
                    }
                }
                
                node.childProcess = null;
                node.status({});
            });
            
            node.status({fill:"blue", shape:"dot", text:"pid:" + node.childProcess.pid});
            
            node.childProcess.on('error',function() {});
        });
        
        node.on('close',function() {
            if (node.childProcess) {
                // Kill the current vcgencmd child process
                node.childProcess.kill();
                node.childProcess = null;
            }

            node.status({});
        });
    }

    RED.nodes.registerType("vcgencmd", VcGenCmdNode);
}
