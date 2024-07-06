import React, { useCallback, useEffect, useState } from "react";
import { h2 } from "react-dom";
import midi from "../midi";
import Chart from "react-apexcharts";

const messageToText = (message) =>
  `${message.timeStamp}: [${message.data.length} bytes]: ${Array.from(
    message.data,
  )
    .map((d) => "0x" + d.toString(16))
    .join(" ")}\n`;

const initialiseDevices = async ({
  setDevices,
  selectedRecordingInput,
  setSelectedRecordingInput,
  selectedOutput,
  setSelectedOutput,
  selectedControlInput,
  setSelectedControlInput,
  setControlAddresses,
  setControlNames,
}) => {
  console.log("initialising");
  const midiAccess = await midi.initialize();

  const inputs = midi.getInputs();
  const outputs = midi.getOutputs();

  setDevices({ inputs, outputs });
  const recordingInput = inputs.find(({ id }) => id === selectedRecordingInput);
  setSelectedRecordingInput(recordingInput);
  setSelectedControlInput(inputs.find(({ id }) => id === selectedControlInput));
  setSelectedOutput(outputs.find(({ id }) => id === selectedOutput));
  if (recordingInput) {
    restoreControls(recordingInput.id, setControlAddresses, setControlNames);
  }
};

function restoreControls(deviceId, setControlAddresses, setControlNames) {
  const storedControlNames = JSON.parse(
    window.localStorage.getItem("controlNames") || "{}",
  )[deviceId];
  setControlAddresses(new Set(Object.keys(storedControlNames)));
  setControlNames(storedControlNames);
}

function CollapsibleContainer({
  title,
  initiallyOpen,
  children,
  HeaderElement = "h2",
}) {
  const [isOpen, setOpen] = useState(initiallyOpen);
  return (
    <>
      <HeaderElement
        onClick={() => setOpen(!isOpen)}
        style={{ cursor: "pointer" }}
      >
        {title} {isOpen ? "-" : "+"}
      </HeaderElement>
      {isOpen ? children : null}
    </>
  );
}

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
  const [controlNames, setControlNames] = useState({});
  const [controlAddresses, setControlAddresses] = useState(new Set());
  const [mostRecentControlAddress, setMostRecentControlAddress] =
    useState(undefined);
  const [chartData, setChartData] = useState([]);
  const [downloadName, setDownloadName] = useState(
    `midirec-${new Date().toISOString().substring(0, 10)}`,
  );

  useEffect(() => {
    const selectedRecordingInput = localStorage.getItem("record");
    const selectedOutput = localStorage.getItem("output");
    const selectedControlInput = localStorage.getItem("control");
    const initialise = async () =>
      initialiseDevices({
        setDevices,
        selectedRecordingInput,
        setSelectedRecordingInput,
        selectedOutput,
        setSelectedOutput,
        selectedControlInput,
        setSelectedControlInput,
        setControlAddresses,
        setControlNames,
      });
    initialise();
  }, []);

  const onMidiMessage = useCallback(
    (message) => {
      if (!isRecording) return;
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

      if (recordClock || statusByte < 0xf8 || statusByte > 0xfc) {
        setMidiMessages([
          {
            data: message,
            text: messageToText(message),
            ticks: currentPosition[0],
            position: currentPosition.slice(1).join("."),
          },
          ...midiMessages,
        ]);
        const address = `${Array.from(message.data.slice(0, 2))
          .map((n) => `0x${n.toString(16)}`)
          .join(" ")}`;
        setMostRecentControlAddress(address);
        setControlAddresses(controlAddresses.add(address));
      }
    },
    [midiMessages, currentPosition, isRecording],
  );

  const downloadCSV = useCallback(() => {
    const { columns, rows } = midiMessages.reduce(
      ({ columns, rows }, { data, position, ticks }) => {
        const address = Array.from(data.data.slice(0, 2))
          .map((n) => `0x${n.toString(16)}`)
          .join(" ");
        const columnName = `${controlNames[address]} (${address})`;
        let column = columns.findIndex((c) => c === columnName);
        if (column === -1) {
          column = columns.length;
          columns.push(columnName);
        }
        return {
          columns: columns,
          rows: [
            ...rows,
            `${ticks},${position}${",".repeat(column + 1)}${data.data[2]}`,
          ],
        };
      },
      { columns: [], rows: [] },
    );

    const csv = `ticks,position,${columns.join(",")}
${rows.join("\n")}`;

    const blob = new Blob([csv]);
    const fileDownloadUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", fileDownloadUrl);
    link.setAttribute("download", `${downloadName}.csv`);
    document.querySelector("body").append(link);
    link.click();
    console.log("click");
    URL.revokeObjectURL(fileDownloadUrl); // free up storage--no longer needed.
  }, [setCsv, midiMessages]);

  useEffect(() => {
    if (selectedRecordingInput) {
      selectedRecordingInput.onmidimessage = onMidiMessage;
    }
    return () =>
      selectedRecordingInput && (selectedRecordingInput.onmidimessage = null);
  }, [selectedRecordingInput, midiMessages, currentPosition, isRecording]);

  const resetPosition = useCallback(() => {
    setCurrentPosition([0, 0, 0, 0, 0]);
  }, [setCurrentPosition]);

  return (
    <>
      <h1 className="title">Midi Recorder</h1>
      {/* When the user hovers over the image we apply the wiggle style to it */}
      <div className="instructions"></div>
      <CollapsibleContainer title={"Settings"} initiallyOpen={true}>
        <h3>MIDI Devices</h3>
        <p>
          <button
            onClick={() =>
              initialiseDevices({
                setDevices,
                selectedRecordingInput,
                setSelectedRecordingInput,
                selectedOutput,
                setSelectedOutput,
                selectedControlInput,
                setSelectedControlInput,
                setControlAddresses,
                setControlNames,
              })
            }
          >
            Refresh MIDI devices list
          </button>
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0fr 300px",
            gridColumnGap: "5px",
            gridRowGap: "5px",
          }}
        >
          <label style={{ whiteSpace: "nowrap" }}>Input to record:</label>
          <select
            style={{ display: "inline" }}
            disabled={devices.inputs.length === 0}
            onChange={(e) => {
              const deviceId = e.target.value;
              window.localStorage.setItem("record", deviceId);
              setSelectedRecordingInput(
                devices.inputs.find(({ id }) => id === deviceId),
              );
              restoreControls(deviceId, setControlAddresses, setControlNames);
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
          <label>Control input:</label>
          <select
            disabled={devices.inputs.length === 0}
            onChange={(e) => {
              window.localStorage.setItem("control", e.target.value);
              setSelectedControlInput(
                devices.inputs.find(({ id }) => id === e.target.value),
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
          <label>Output:</label>
          <select
            disabled={devices.outputs.length === 0}
            onChange={(e) => {
              window.localStorage.setItem("output", e.target.value);
              setSelectedOutput(
                devices.outputs.find(({ id }) => id === e.target.value),
              );
            }}
            value={selectedOutput?.id}
          >
            <option>No device selected</option>
            {devices.outputs.map((output) => (
              <option key={output.id} value={output.id}>
                {output.name}
              </option>
            ))}
          </select>
        </div>
        {selectedRecordingInput ? (
          <>
            <h3>Control names for {selectedRecordingInput.name}</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "0fr 400px",
                gridRowGap: "5px",
                gridColumnGap: "5px",
              }}
            >
              {Array.from(controlAddresses).map((address) => (
                <>
                  <label
                    htmlFor={address}
                    style={{
                      whiteSpace: "nowrap",
                      fontWeight:
                        mostRecentControlAddress === address
                          ? "bold"
                          : "normal",
                    }}
                  >
                    {address}
                  </label>
                  <input
                    value={controlNames[address]}
                    onChange={(e) => {
                      const updatedControlNames = {
                        ...controlNames,
                        [address]: e.target.value,
                      };
                      window.localStorage.setItem(
                        "controlNames",
                        JSON.stringify({
                          [selectedRecordingInput.id]: updatedControlNames,
                        }),
                      );
                      setControlNames(updatedControlNames);
                    }}
                  />
                </>
              ))}
            </div>
          </>
        ) : null}
      </CollapsibleContainer>
      <CollapsibleContainer title={"Recording"} initiallyOpen={true}>
        <div>
          Position: {currentPosition[1] + 1}.{currentPosition[2] + 1}.
          {currentPosition[3] + 1}.{currentPosition[4]} ({currentPosition[0]})
        </div>
        <div>
          <button onClick={resetPosition} disabled={!selectedRecordingInput}>
            Reset position
          </button>
        </div>
        <button
          onClick={() => {
            setRecording(!isRecording);
            if (isRecording) {
              const { ticks: lastTicks } =
                midiMessages[midiMessages.length - 1];
              /*
                        {
            data: message,
            text: messageToText(message),
            ticks: currentPosition[0],
            position: currentPosition.slice(1).join("."),
          }
               */
              const filteredData = midiMessages.filter(
                ({ ticks }) => lastTicks - ticks < 10000,
              );

              const data = filteredData.reduce(
                (acc, { data, position, ticks }) => {
                  const address = Array.from(data.data.slice(0, 2))
                    .map((n) => `0x${n.toString(16)}`)
                    .join(" ");
                  const controlName = `${controlNames[address]} (${address})`;
                  let controlData = acc[controlName] || [];
                  return {
                    ...acc,
                    [controlName]: [
                      ...controlData,
                      { x: ticks, y: data.data[2] },
                    ],
                  };
                },
                {},
              );

              console.log({ data });

              setChartData(
                Object.entries(data).map(([control, data]) => ({
                  name: control,
                  data,
                })),
              );
            }
          }}
        >
          {isRecording ? "Pause" : "Resume"}
        </button>
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
        {!isRecording ? (
          <Chart
            options={{
              chart: {
                id: "apexchart-example",
              },
              xaxis: {
                type: "numeric",
              },
              legend: { show: true },
            }}
            series={chartData}
            type="line"
            width={500}
            height={320}
          />
        ) : null}
        <div>
          <CollapsibleContainer
            HeaderElement="h3"
            title={`Recorded messages (${midiMessages?.length})`}
          >
            <pre className="midi-messages">
              {midiMessages.slice(0, 20).map(({ text }) => text)}
            </pre>
            <button onClick={() => setMidiMessages([])}>Clear recording</button>{" "}
            <br />
            <h4>Download</h4>
            <div style={{ display: "flex", gap: 5 }}>
              <label htmlFor={"download-name"}>Name for recording:</label>
              <input
                id={"download-name"}
                value={downloadName}
                onChange={(e) => setDownloadName(e.target.value)}
              />
              <button onClick={downloadCSV}>Download CSV</button>
            </div>
          </CollapsibleContainer>
        </div>
      </CollapsibleContainer>
    </>
  );
}
