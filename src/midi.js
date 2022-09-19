function listInputsAndOutputs(midiAccess) {
  for (let entry of midiAccess.inputs) {
    const input = entry[1];
    console.log(
      "Input port [type:'" +
        input.type +
        "'] id:'" +
        input.id +
        "' manufacturer:'" +
        input.manufacturer +
        "' name:'" +
        input.name +
        "' version:'" +
        input.version +
        "'"
    );
  }

  for (let entry of midiAccess.outputs) {
    const output = entry[1];
    console.log(
      "Output port [type:'" +
        output.type +
        "'] id:'" +
        output.id +
        "' manufacturer:'" +
        output.manufacturer +
        "' name:'" +
        output.name +
        "' version:'" +
        output.version +
        "'"
    );
  }
}

let midi = null; // global MIDIAccess object

function onMIDISuccess(midiAccess) {
  console.log("MIDI ready!");
  listInputsAndOutputs(midiAccess);
  return midiAccess; // store in the global (in real usage, would probably keep in an object instance)
}

async function initialize() {
  try {
    const midi = await window.navigator.requestMIDIAccess({ sysex: true });
    return midi;
  } catch (e) {
    console.error("Failed to get MIDI access - ", e);
  }
}

export default { initialize };
