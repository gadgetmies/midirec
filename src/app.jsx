import React, { useState, useEffect } from "react";
import { Router, Link } from "wouter";
import midi from "./midi";

/**
 * This code defines the react app
 *
 * Imports the router functionality to provide page navigation
 * Defines the Home function outlining the content on each page
 * Content specific to each page (Home and About) is defined in their components in /pages
 * Each page content is presented inside the overall structure defined here
 * The router attaches the page components to their paths
 */

// Import and apply CSS stylesheet
import "./styles/styles.css";

// Where all of our pages come from
import PageRouter from "./components/router.jsx";

// The component that adds our Meta tags to the page
import Seo from "./components/seo.jsx";

// Home function that is reflected across the site
export default function Home() {
  const [midiMessages, setMidiMessages] = useState([]);
  const [currentPosition, setCurrentPosition] = useState([0, 0, 0, 0, 0]);
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });

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

  return (
    <Router>
      <Seo />
      <main role="main" className="wrapper">
        <div className="content">
          {/* Router specifies which component to insert here as the main content */}
          <PageRouter />
        </div>
      </main>
      {/* Footer links to Home and About, Link elements matched in router.jsx */}
      <footer className="footer">
        <label>
          Inputs:
          <select>
            {devices.inputs.map((input) => (
              <option value={}>input.name</option>
            ))}
          </select>
        </label>
      </footer>
    </Router>
  );
}
