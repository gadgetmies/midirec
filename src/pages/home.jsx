import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Link } from "wouter";
import midi from "../midi";

const messageToText = (message) =>
  `${message.timeStamp}: [${message.data.length} bytes]: ${Array.from(
    message.data
  )
    .map((d) => "0x" + d.toString(16))
    .join(" ")}\n`;

const initialiseDevices = async (setDevices) => {
  console.log("initialising");
  const midiAccess = await midi.initialize();

  setDevices({ inputs: midi.getInputs(), outputs: midi.getOutputs() });
};

export default memo(function Home() {
  const [midiMessages, _setMidiMessages] = useState([]);
  const [currentPosition, _setCurrentPosition] = useState([0, 0, 0, 0, 0]);
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [selectedInput, _setSelectedInput] = useState(null);
  const [selectedOutput, setSelectedOutput] = useState();
  const [inputListener, setInputListener] = useState();
  const [recordClock, setRecordClock] = useState(false);

  const midiMessagesRef = useRef(midiMessages);
  const setMidiMessages = (messages) => {
    midiMessagesRef.current = messages;
    _setMidiMessages(messages);
  };

  const currentPositionRef = useRef(currentPosition);
  const setCurrentPosition = (position) => {
    currentPositionRef.current = position;
    _setCurrentPosition(position);
  };

  useEffect(() => {
    initialiseDevices(setDevices);
  }, []);

  const onMidiMessage = (message) => {
    const statusByte = message.data[0];
    console.log("message", statusByte === 0xf8);
    if (statusByte === 0xf8) {
      console.log(currentPosition);
      let [position, phrase, bar, beat, tick] = currentPosition;
      const tickOverflow = tick === 23 ? 1 : 0;
      tick = (tick + 1) % 24;
      const beatOverflow = beat === 3 && tickOverflow ? 1 : 0;
      beat = (beat + tickOverflow) % 4;
      const barOverflow = bar === 3 && beatOverflow ? 1 : 0;
      bar = (bar + beatOverflow) % 4;
      phrase += barOverflow;
      setCurrentPosition([position + 1, phrase, bar, beat, tick]);
      if (!recordClock) return;
    } else if (statusByte === 0xfa) {
      setCurrentPosition([0, 0, 0, 0, 0]);
      if (!recordClock) return;
    }

    if (recordClock || (statusByte < 0xf8 && statusByte > 0xfc))
      setMidiMessages([
        { data: message, text: messageToText(message) },
        ...midiMessages,
      ]);
  };

  const previousSelectedInput = useRef();
  const selectedInputRef = useRef(selectedInput);
  const setSelectedInput = (input) => {
    selectedInputRef.current = input;
    _setSelectedInput(input);
  };

  useEffect(() => {
    console.log("use", selectedInput);
    if (previousSelectedInput.current !== selectedInput) {
      console.log("trying to clear handler");
//      if (selectedInput) delete selectedInput.onmidimessage;
      if (selectedInput) selectedInput.removeEventListenere(onMidiMessage);
//      if (previousSelectedInput.current) delete previousSelectedInput.onmidimessage;
      if (previousSelectedInput.current) previousSelectedInput. = () => {};
      previousSelectedInput.current = selectedInput;

      if (selectedInput) {
        console.log("connecting");
        selectedInput.onmidimessage = onMidiMessage;
      }
    }
  }, [selectedInput]);

  return (
    <>
      <h1 className="title">Midi Recorder</h1>
      {/* When the user hovers over the image we apply the wiggle style to it */}
      <div className="instructions">
        <label>
          Input:
          <select
            disabled={devices.inputs.length === 0}
            onChange={(e) => {
              setSelectedInput(
                devices.inputs.find(({ id }) => id === e.target.value)
              );
            }}
          >
            <option>No device selected</option>
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
            onChange={(e) => {
              setSelectedOutput(
                devices.outputs.find(({ id }) => id === e.target.value)
              );
            }}
          >
            <option disabled>No device selected</option>
            {devices.outputs.map((output) => (
              <option key={output.id} value={output.id}>
                {output.name}
              </option>
            ))}
          </select>
        </label>
        <br />
        <button onClick={() => initialiseDevices(setDevices)}>
          Refresh devices
        </button>
      </div>
      <div>
        Position: {currentPosition[1] + 1}.{currentPosition[2] + 1}.
        {currentPosition[3] + 1}.{currentPosition[4]} ({currentPosition[0]})
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            onChange={(e) => setRecordClock(!recordClock)}
            checked={recordClock}
          />
          Record clock
        </label>
      </div>
      <div>
        <button onClick={() => setMidiMessages([])}>Clear messages</button>
        <pre className="midi-messages">
          {midiMessages.slice(0, 20).map(({ text }) => text)}
        </pre>
      </div>
    </>
  );
});
