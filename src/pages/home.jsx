import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import midi from "../midi";

export default function Home() {
  const [midiMessages, setMidiMessages] = useState([]);
  const [currentPosition, setCurrentPosition] = useState([0, 0, 0, 0, 0]);
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [selectedInput, setSelectedInput] = useState();
  const [selectedOutput, setSelectedOutput] = useState();
  const [inputListener, setInputListener] = useState();

  const initialiseDevices = async () => {
    console.log("initialising");
    const midiAccess = await midi.initialize();

    setDevices({ inputs: midi.getInputs(), outputs: midi.getOutputs() });
  }
  
  useEffect(() => {
    function onMIDIMessage(event) {
      let str =
        "MIDI message received at timestamp " +
        event.timeStamp +
        "[" +
        event.data.length +
        " bytes]: ";
      if (event.data[0] === 0xf8) {
        const [ticks, ...rest] = currentPosition;
        setCurrentPosition([ticks + 1, ...rest]);
      } else if (event.data[0] === 0x56) {
        setCurrentPosition([0,0,0,0,0])
      }

      for (let i = 0; i < event.data.length; i++) {
        str += "0x" + event.data[i].toString(16) + " ";
      }
      console.log(str);
    }

    initialiseDevices();
  }, []);

  const previousSelectedInput = useRef();
  useEffect(() => {
    console.log("input selected");
    if (previousSelectedInput.current !== selectedInput) {
      previousSelectedInput.onmidimessage = undefined;
      previousSelectedInput.current = selectedInput;
    }

    if (selectedInput) {
      selectedInput.onmidimessage = (e) => {
        setMidiMessages([...midiMessages, e]);
      };
    }
  }, [selectedInput, midiMessages]);

  return (
    <>
      <h1 className="title">Midi Recorder</h1>
      {/* When the user hovers over the image we apply the wiggle style to it */}
      <div className="instructions">
        <label>
          Input:
          <select
            disabled={devices.inputs.length === 0}
            onChange={(e) =>
              setSelectedInput(
                devices.inputs.find(({ id }) => (id = e.target.value))
              )
            }
          >
            <option disabled selected={selectedInput === undefined}>No device selected</option>
            {devices.inputs.map((input) => (
              <option key={input.id} value={input.id}>
                {input.name}
              </option>
            ))}
          </select>
        </label><br/>
        <label>
          Output:
          <select
            disabled={devices.outputs.length === 0}
            onChange={(e) =>
              setSelectedOutput(
                devices.outputs.find(({ id }) => (id = e.target.value))
              )
            }
          >
            <option disabled selected={selectedOutput === undefined}>No device selected</option>
            {devices.outputs.map((output) => (
              <option key={output.id} value={output.id}>
                {output.name}
              </option>
            ))}
          </select>
        </label>
        <br/>
        <button onClick={() => initialiseDevices()}>Refresh devices</button>
      </div>
      <div>
        Position: {currentPosition[1]}.{currentPosition[2]}.{currentPosition[3]}.{currentPosition[4]} ({currentPosition[0]})
      </div>
      <div>
        <pre className='midi-messages'>
          {midiMessages.map(
            (message) => {
              return `${message.timeStamp}: [${
                message.data.length
              } bytes]: ${Array.from(message.data).map((d) => "0x"+ d.toString(16)).join(' ')}\n`
            }
          )}
        </pre>
      </div>
    </>
  );
}
