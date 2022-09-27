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

export default function Home() {
  const [midiMessages, setMidiMessages] = useState([]);
  const [currentPosition, setCurrentPosition] = useState([0, 0, 0, 0, 0]);
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [selectedRecordingInput, setSelectedRecordingInput] = useState(null);
  const [selectedControlInput, setSelectedControlInput] = useState(null);
  const [selectedOutput, setSelectedOutput] = useState();
  const [inputListener, setInputListener] = useState();
  const [recordClock, setRecordClock] = useState(false);
  const [csv, setCsv] = useState("");
  const [isRecording, setRecording] = useState(true);

  useEffect(() => {
    initialiseDevices(setDevices);
  }, []);

  const onMidiMessage = useCallback(
    (message) => {
      if (!isRecording) return
      const statusByte = message.data[0];
      if (statusByte === 0xf8) {
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
      } else if (statusByte === 0xfc) {
        setCurrentPosition([0, 0, 0, 0, 0]);
        if (!recordClock) return;
      }

      if (recordClock || statusByte < 0xf8 || statusByte > 0xfc)
        setMidiMessages([
          {
            data: message,
            text: messageToText(message),
            ticks: currentPosition[0],
            position: currentPosition.slice(1).join("."),
          },
          ...midiMessages,
        ]);
    },
    [midiMessages, currentPosition, isRecording]
  );

  const downloadCSV = useCallback(() => {
    const {columns, rows} = midiMessages
      .reduce(
        ({ columns, rows }, { data, position, ticks }) => {
          let column = columns.findIndex((c) => c === data.data[1]);
          if (column === -1) {
            column = columns.length;
            columns.push(data.data[1]);
          }
          return {
            columns: columns,
            rows: [...rows, `${ticks},${position}${",".repeat(column + 1)}${data.data[2]}`],
          };
        },
        { columns: [], rows: [] }
      )
      
    const csv = `ticks,position,${columns.join(',')}
${rows.join("\n")}`;
    
    const blob = new Blob([csv]);
    const fileDownloadUrl = URL.createObjectURL(blob);
    
    const link = document.createElement("a")
    link.setAttribute('href', fileDownloadUrl)
    link.setAttribute('download', 'recording.csv')
    document.querySelector('body').append(link)
    link.click()
    console.log('click')
    URL.revokeObjectURL(fileDownloadUrl);  // free up storage--no longer needed.
  }, [setCsv, midiMessages]);

  useEffect(() => {
    if (selectedRecordingInput) {
      selectedRecordingInput.onmidimessage = onMidiMessage;
    }
    return () => selectedRecordingInput && (selectedRecordingInput.onmidimessage = null);
  }, [selectedRecordingInput, midiMessages, currentPosition, isRecording]);

  const resetPosition = useCallback(() => {
    setCurrentPosition([0, 0, 0, 0, 0]);
  }, [setCurrentPosition]);

  return (
    <>
      <h1 className="title">Midi Recorder</h1>
      {/* When the user hovers over the image we apply the wiggle style to it */}
      <div className="instructions">
        <label>
          Input to record:<br/>
          <select
            disabled={devices.inputs.length === 0}
            onChange={(e) => {
              setSelectedRecordingInput(
                devices.inputs.find(({ id }) => id === e.target.value)
              );
            }}
            value={selectedRecordingInput?.id}
          >
            <option>No device selected</option>
            {devices.inputs.map((input) => (
              <option key={input.id} value={input.id}>
                {input.name}
              </option>
            ))}
          </select>
        </label>
        <br/>
        <label>
          Control input:<br/>
          <select
            disabled={devices.inputs.length === 0}
            onChange={(e) => {
              setSelectedControlInput(
                devices.inputs.find(({ id }) => id === e.target.value)
              );
            }}
            value={selectedControlInput?.id}
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
          Output:<br/>
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
        <button onClick={resetPosition} disabled={!selectedRecordingInput}>Reset position</button>
      </div>
      <h2>Recording</h2>
      <button onClick={() => setRecording(!isRecording)}>{isRecording ? 'Pause' : 'Resume'}</button>
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
        <h3>
          Recorded messages ({midiMessages?.length})
        </h3>
        <button onClick={() => setMidiMessages([])}>Clear recording</button>{" "}
        <button onClick={downloadCSV}>Download CSV</button>
        <pre className="midi-messages">
          {midiMessages.slice(0, 20).map(({ text }) => text)}
        </pre>
      </div>
    </>
  );
}
