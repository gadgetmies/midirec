import React, { useState, useEffect, useRef } from "react";
import { animated } from "react-spring";
import { useWiggle } from "../hooks/wiggle";
import { Link } from "wouter";
import midi from "../midi";

// Our language strings for the header
const strings = [
  "Hello React",
  "Salut React",
  "Hola React",
  "안녕 React",
  "Hej React",
];

// Utility function to choose a random value from the language array
function randomLanguage() {
  return strings[Math.floor(Math.random() * strings.length)];
}

/**
 * The Home function defines the content that makes up the main content of the Home page
 *
 * This component is attached to the /about path in router.jsx
 * The function in app.jsx defines the page wrapper that this appears in along with the footer
 */

export default function Home() {
  /* We use state to set the hello string from the array https://reactjs.org/docs/hooks-state.html
     - We'll call setHello when the user clicks to change the string
  */
  const [hello, setHello] = React.useState(strings[0]);

  /* The wiggle function defined in /hooks/wiggle.jsx returns the style effect and trigger function
     - We can attach this to events on elements in the page and apply the resulting style
  */
  const [style, trigger] = useWiggle({ x: 5, y: 5, scale: 1 });

  // When the user clicks we change the header language
  const handleChangeHello = () => {
    // Choose a new Hello from our languages
    const newHello = randomLanguage();

    // Call the function to set the state string in our component
    setHello(newHello);
  };

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

      midiAccess.inputs.forEach(function (entry) {
        entry.onmidimessage = onMIDIMessage;
      });
      midiAccess.outputs.forEach(function (entry) {
        entry.onmidimessage = onMIDIMessage;
      });

      setDevices({ inputs: midi.getInputs(), outputs: midi.getOutputs() });
    })();
  }, []);

  const previousSelectedInput = useRef();
  useEffect(() => {
    console.log(selectedInput);
    previousSelectedInput.onmidimessage = undefined;
    previousSelectedInput.current = selectedInput;

    if (selectedInput) {
      selectedInput.onmidimessage = (e) => {
        setMidiMessages([...midiMessages, e]);
      };
    }
  }, [selectedInput]);

  return (
    <>
      <h1 className="title">{hello}!</h1>
      {/* When the user hovers over the image we apply the wiggle style to it */}
      <animated.div onMouseEnter={trigger} style={style}>
        <img
          src="https://cdn.glitch.com/2f80c958-3bc4-4f47-8e97-6a5c8684ac2c%2Fillustration.svg?v=1618196579405"
          className="illustration"
          onClick={handleChangeHello}
          alt="Illustration click to change language"
        />
      </animated.div>
      <div className="navigation">
        {/* When the user hovers over this text, we apply the wiggle function to the image style */}
        <animated.div onMouseEnter={trigger}>
          <a className="btn--click-me" onClick={handleChangeHello}>
            Psst, click me
          </a>
        </animated.div>
      </div>
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
              <option value={input.id}>{input.name}</option>
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
              <option value={output.id}>{output.name}</option>
            ))}
          </select>
        </label>
        <div>
          {midiMessages.map(
            (message) =>
              `${event.timeStamp}: [${
                event.data?.length
              } bytes]: ${event.data?.map((d) => "0x " + d.toString(16))}`
          ).join(<br/>)}
        </div>
      </div>
    </>
  );
}
