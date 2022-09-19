let midi = null; // global MIDIAccess object

const getOutputs = () => {
  return Array.from(midi.outputs.values())
}

const getInputs = () => {
  return Array.from(midi.inputs.values())
}

async function initialize() {
  console.log('midi initialize')
  try {
    console.log()
    midi = await window.navigator.requestMIDIAccess({ sysex: true });
    return midi;
  } catch (e) {
    console.error("Failed to get MIDI access - ", e);
  }
}



export default { initialize, getInputs, getOutputs };
