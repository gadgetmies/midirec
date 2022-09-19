import React, { useState, useEffect, useRef } from "react";
import { animated } from "react-spring";
import { useWiggle } from "../hooks/wiggle";
import { Link } from "wouter";
import midi from "../midi";

/**
 * The Home function defines the content that makes up the main content of the Home page
 *
 * This component is attached to the /about path in router.jsx
 * The function in app.jsx defines the page wrapper that this appears in along with the footer
 */

export default function Home() {
  /* The wiggle function defined in /hooks/wiggle.jsx returns the style effect and trigger function
     - We can attach this to events on elements in the page and apply the resulting style
  */
  const [style, trigger] = useWiggle({ x: 5, y: 5, scale: 1 });

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
      const [ticks, ...rest] = currentPosition;
      setCurrentPosition([ticks + 1, ...rest]);

      for (let i = 0; i < event.data.length; i++) {
        str += "0x" + event.data[i].toString(16) + " ";
      }
      console.log(str);
    }

    (async () => {
      console.log("initialising");
      const midiAccess = await midi.initialize();

      setDevices({ inputs: midi.getInputs(), outputs: midi.getOutputs() });
    })();
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
        console.log(e);
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
            onChange={(e) =>
              setSelectedInput(
                devices.inputs.find(({ id }) => (id = e.target.value))
              )
            }
          >
            <option></option>
            {devices.inputs.map((input) => (
              <option key={input.id} value={input.id}>
                {input.name}
              </option>
            ))}
          </select>
        </label>
        ,
        <label>
          Output:
          <select
            onChange={(e) =>
              setSelectedOutput(
                devices.outputs.find(({ id }) => (id = e.target.value))
              )
            }
          >
            <option></option>
            {devices.outputs.map((output) => (
              <option key={output.id} value={output.id}>
                {output.name}
              </option>
            ))}
          </select>
        </label>
        <pre className='midi-messages'>
          {midiMessages?.map(
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
