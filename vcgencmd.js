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
        
        var node = this;
        
        node.on("input", function(msg) {
            if (node.childProcess) {
                node.warn("Previous vcgencmd command hasn't finished yet");
                return;
            }
            
            var command = "vcgencmd " + node.command;
            
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
                    command = command + " " + node.videoOutput;
                    break;     
            }  

            node.childProcess = exec(command, function (err, stdout, stderr) {
                if (err) {
                    node.error("Error executing vcgencmd:" + err);
                }
                else {
                    delete msg.payload;
                    msg.payload = {};
                    
                    // Convert the command output to the correct format
                    switch (node.command) {
                        case "version":
                            // Returns for example "Jan 13 2013 16:24:29
                            //                      Copyright (c) 2012 Broadcom
                            //                      version 362371 (release)"
                            msg.payload = stdout;
                            
                            break;
                        case "display_power":
                            // TODO Check if no return value?  Leave payload empty??
                            msg.payload = stdout;
                            break;
                        case "codec_enabled":
                            // Returns for example "H264=enabled".
                            // So we are only interested in the part after the equal-operator.
                            msg.payload = stdout.split('=')[1];
                            
                            // Let's convert it to a boolean
                            if (msg.payload === "enabled") {
                                msg.payload = true;
                            }
                            else {
                                msg.payload = false;
                            }
                            
                            break;
                        case "measure_clock":
                            // Returns for example "frequency(45)=700000000".
                            // The number between the brackets is (an internal enum denoting) the clock that is being measured.
                            //     1 = core / 4 = dpi / 9 = hdmi / 10 = vec / 22 = uart / 25 = pwm / 28 = h264 / 29 = pixel / 42 = isp / 43 = v3d / 45 = arm / 47 = emmc / ...
                            // The full enum can be found in the firmware source code:
                            // https://github.com/shacharr/videocoreiv-qpu-driver/blob/master/brcm_usrlib/dag/vmcsx/vcfw/drivers/chip/clock.h#L141
                            // So we are only interested in the part after the equal-operator.
                            msg.payload = stdout.split('=')[1];
                            
                            break;
                        case "measure_volts":
                            // Returns for example "volt=1.20V".
                            // So we are only interested in the part after the equal-operator.
                            msg.payload = stdout.split('=')[1];
                            
                            // And since the unit is always Volt, we can remove the "V"
                            msg.payload = msg.payload.slice(0, -1);
                            
                            break;
                        case "measure_temp":
                            // Returns for example "temp=42.8'C".
                            // So we are only interested in the part after the equal-operator.
                            msg.payload = stdout.split('=')[1];
                            
                            // And since the unit is always Celsius, we can remove the "'C"
                            msg.payload = msg.payload.slice(0, -2);
                            break;

                        case "get_throttled":
                            // Thanks to Normen Hansen (see https://github.com/normen/rpi-throttled/blob/master/lib.js)
                            var number = parseInt(String(stdout).replace("throttled=",""), 16);
                            
                            msg.payload.underVoltage            = (number >> 0)  & 1 ? true : false;
                            msg.payload.frequencyCapped         = (number >> 1)  & 1 ? true : false;
                            msg.payload.throttled               = (number >> 2)  & 1 ? true : false;
                            msg.payload.softTempLimit           = (number >> 3)  & 1 ? true : false;
                            msg.payload.underVoltageOccurred    = (number >> 16) & 1 ? true : false;
                            msg.payload.frequencyCappedOccurred = (number >> 17) & 1 ? true : false;
                            msg.payload.throttledOccurred       = (number >> 18) & 1 ? true : false;
                            msg.payload.softTempLimitOccurred   = (number >> 19) & 1 ? true : false;
                            
                            break;
                        case "mem_oom":
                            // TODO : check the output value
                            msg.payload = stdout;
                            
                            break;
                        case "get_mem":
                            // Returns for example "arm=448M".
                            // So we are only interested in the part after the equal-operator.
                            msg.payload = stdout.split('=')[1];
                            
                            // And since the unit is always MegaByte, we can remove the "M".
                            // TODO This could become Gb in the future ...
                            msg.payload = msg.payload.slice(0, -1);
                            
                            break;
                    }

                    node.send(msg);
                }
                
                node.childProcess = null;
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