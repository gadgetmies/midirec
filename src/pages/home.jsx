import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import midi from "../midi";

const messageToText = message => `${message.timeStamp}: [${
              message.data.length
            } bytes]: ${Array.from(message.data)
              .map((d) => "0x" + d.toString(16))
              .join(" ")}\n`;


const initialiseDevices = async (setDevices) => {
  console.log("initialising");
  const midiAccess = await midi.initialize();

  setDevices({ inputs: midi.getInputs(), outputs: midi.getOutputs() });
};

export default function Home() {
  const [midiMessages, setMidiMessages] = useState([]);
  const [currentPosition, setCurrentPosition] = useState([0, 0, 0, 0, 0]);
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [selectedInput, setSelectedInput] = useState();
  const [selectedOutput, setSelectedOutput] = useState();
  const [inputListener, setInputListener] = useState();

  useEffect(() => {
    function onMIDIMessage(event) {
      let str =
        "MIDI message received at timestamp " +
        event.timeStamp +
        "[" +
        event.data.length +
        " bytes]: ";

      for (let i = 0; i < event.data.length; i++) {
        str += "0x" + event.data[i].toString(16) + " ";
      }
      console.log(str);
    }

    initialiseDevices(setDevices);
  }, []);

  const previousSelectedInput = useRef();
  useEffect(() => {
    if (previousSelectedInput.current !== selectedInput) {
      delete previousSelectedInput.onmidimessage;
      previousSelectedInput.current = selectedInput;
    }
    if (selectedInput) {
      selectedInput.onmidimessage = (e) => {
        setMidiMessages([{data: e, text: messageToText(e)}, ...midiMessages]);
        if (event.data[0] === 0xf8) {
          const [ticks] = currentPosition;
          setCurrentPosition([ticks + 1, ticks >> 4, ticks >> 8, ticks >> 10]);
        } else if (event.data[0] === 0xfc) {
          setCurrentPosition([0, 0, 0, 0, 0]);
        }
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
            <option disabled selected={selectedInput === undefined}>
              No device selected
            </option>
            {devices.inputs.map((input) => (
              <option key={input.id} value={input.id}>
                {input.name}
              </option>
            ))}
          </select>
        </label>
        <br />
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
            <option disabled selected={selectedOutput === undefined}>
              No device selected
            </option>
            {devices.outputs.map((output) => (
              <option key={output.id} value={output.id}>
                {output.name}
              </option>
            ))}
          </select>
        </label>
        <br />
        <button onClick={() => initialiseDevices()}>Refresh devices</button>
      </div>
      <div>
        Position: {currentPosition[1]}.{currentPosition[2]}.{currentPosition[3]}{" "}
        ({currentPosition[0]})
      </div>
      <div>
        <button onClick={() => setMidiMessages([])}>Clear messages</button>
        <pre className="midi-messages">
          {midiMessages.slice(0, 20).map(({text}) => text)}
        </pre>
      </div>
    </>
  );
}
