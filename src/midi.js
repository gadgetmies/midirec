const getOutputs = () => {
  return Array.from(midi.outputs.values())
}

const getInputs = () => {
  return Array.from(midi.inputs.values())
}

let midi = null; // global MIDIAccess object

async function initialize() {
  console.log('midi initialize')
  try {
    console.log()
    const midi = await window.navigator.requestMIDIAccess({ sysex: true });
    return midi;
  } catch (e) {
    console.error("Failed to get MIDI access - ", e);
  }
}



export default { initialize };
