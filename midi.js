// Simple MIDI File Generator
class MidiFile {
    constructor() {
        this.tracks = [];
        this.currentTrack = null;
    }

    addTrack() {
        this.currentTrack = {
            events: [],
            tempo: 120,
            timeSignature: { numerator: 4, denominator: 4 }
        };
        this.tracks.push(this.currentTrack);
    }

    setTempo(trackIndex, bpm) {
        if (this.tracks[trackIndex]) {
            this.tracks[trackIndex].tempo = bpm;
        }
    }

    addTimeSignature(trackIndex, numerator, denominator) {
        if (this.tracks[trackIndex]) {
            this.tracks[trackIndex].timeSignature = { numerator, denominator };
        }
    }

    addNote(trackIndex, startTick, durationTicks, note, velocity) {
        if (!this.tracks[trackIndex]) return;

        const track = this.tracks[trackIndex];
        track.events.push({
            type: 'note',
            tick: startTick,
            duration: durationTicks,
            note: note,
            velocity: velocity
        });
    }

    addMetaText(trackIndex, tick, text) {
        if (!this.tracks[trackIndex]) return;

        const track = this.tracks[trackIndex];
        track.events.push({
            type: 'meta',
            tick: tick,
            metaType: 0x01, // Text Event
            text: text
        });
    }

    toArray() {
        const ticksPerQuarter = 480;
        const format = 1; // Multi-track format
        const numTracks = this.tracks.length;

        // MIDI file header
        const header = new Uint8Array([
            0x4D, 0x54, 0x68, 0x64, // "MThd"
            0x00, 0x00, 0x00, 0x06, // Header length
            0x00, format, // Format
            (numTracks >> 8) & 0xFF, numTracks & 0xFF, // Number of tracks
            (ticksPerQuarter >> 8) & 0xFF, ticksPerQuarter & 0xFF // Ticks per quarter note
        ]);

        const trackChunks = [];

        this.tracks.forEach((track, index) => {
            const events = [];

            // Add tempo meta event
            const tempo = track.tempo;
            const microsecondsPerQuarter = Math.round(60000000 / tempo);
            events.push({
                tick: 0,
                type: 'meta',
                metaType: 0x51, // Set Tempo
                data: [
                    (microsecondsPerQuarter >> 16) & 0xFF,
                    (microsecondsPerQuarter >> 8) & 0xFF,
                    microsecondsPerQuarter & 0xFF
                ]
            });

            // Add time signature meta event
            const ts = track.timeSignature;
            events.push({
                tick: 0,
                type: 'meta',
                metaType: 0x58, // Time Signature
                data: [
                    ts.numerator,
                    Math.log2(ts.denominator),
                    24, // MIDI clocks per metronome click
                    8   // 32nd notes per quarter note
                ]
            });

            // Add note events
            track.events.forEach(event => {
                if (event.type === 'note') {
                    // Note On
                    events.push({
                        tick: event.tick,
                        type: 'noteOn',
                        channel: 0,
                        note: event.note,
                        velocity: event.velocity
                    });
                    // Note Off
                    events.push({
                        tick: event.tick + event.duration,
                        type: 'noteOff',
                        channel: 0,
                        note: event.note,
                        velocity: 0
                    });
                } else if (event.type === 'meta') {
                    // Include meta events (like text events)
                    events.push(event);
                }
            });

            // Sort events by tick
            events.sort((a, b) => a.tick - b.tick);

            // Convert to MIDI track data
            const trackData = [];
            let lastTick = 0;

            events.forEach(event => {
                const deltaTime = event.tick - lastTick;
                lastTick = event.tick;

                // Write variable-length quantity for delta time
                trackData.push(...this.writeVariableLength(deltaTime));

                if (event.type === 'meta') {
                    trackData.push(0xFF); // Meta event
                    trackData.push(event.metaType);
                    
                    if (event.text) {
                        // Text meta event
                        const textBytes = new TextEncoder().encode(event.text);
                        trackData.push(...this.writeVariableLength(textBytes.length));
                        trackData.push(...Array.from(textBytes));
                    } else {
                        // Data meta event
                        trackData.push(...this.writeVariableLength(event.data.length));
                        trackData.push(...event.data);
                    }
                } else if (event.type === 'noteOn') {
                    trackData.push(0x90 | event.channel); // Note On
                    trackData.push(event.note & 0x7F);
                    trackData.push(event.velocity & 0x7F);
                } else if (event.type === 'noteOff') {
                    trackData.push(0x80 | event.channel); // Note Off
                    trackData.push(event.note & 0x7F);
                    trackData.push(event.velocity & 0x7F);
                }
            });

            // End of track
            trackData.push(...this.writeVariableLength(0));
            trackData.push(0xFF, 0x2F, 0x00); // End of track meta event

            // Create track chunk
            const trackLength = trackData.length;
            const trackChunk = new Uint8Array([
                0x4D, 0x54, 0x72, 0x6B, // "MTrk"
                (trackLength >> 24) & 0xFF,
                (trackLength >> 16) & 0xFF,
                (trackLength >> 8) & 0xFF,
                trackLength & 0xFF,
                ...trackData
            ]);

            trackChunks.push(trackChunk);
        });

        // Combine header and tracks
        const totalLength = header.length + trackChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;

        result.set(header, offset);
        offset += header.length;

        trackChunks.forEach(chunk => {
            result.set(chunk, offset);
            offset += chunk.length;
        });

        return result;
    }

    writeVariableLength(value) {
        const result = [];
        let val = value;

        if (val === 0) {
            return [0];
        }

        const bytes = [];
        while (val > 0) {
            bytes.push(val & 0x7F);
            val >>= 7;
        }

        for (let i = bytes.length - 1; i >= 0; i--) {
            let byte = bytes[i];
            if (i > 0) {
                byte |= 0x80; // Set continuation bit
            }
            result.push(byte);
        }

        return result;
    }
}

// MIDI File Parser
class MidiParser {
    parse(data) {
        let offset = 0;
        
        // Read header
        if (data.length < 14) {
            throw new Error('Invalid MIDI file: too short');
        }
        
        // Check header signature
        if (String.fromCharCode(data[0], data[1], data[2], data[3]) !== 'MThd') {
            throw new Error('Invalid MIDI file: missing header');
        }
        
        offset = 8; // Skip header signature and length
        const format = (data[offset] << 8) | data[offset + 1];
        const numTracks = (data[offset + 2] << 8) | data[offset + 3];
        const ticksPerQuarter = (data[offset + 4] << 8) | data[offset + 5];
        offset = 14;
        
        let tempo = 120; // Default tempo
        let timeSignature = { numerator: 4, denominator: 4 }; // Default time signature
        const events = [];
        
        // Parse tracks
        for (let trackIndex = 0; trackIndex < numTracks; trackIndex++) {
            if (offset >= data.length) break;
            
            // Check track header
            if (String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]) !== 'MTrk') {
                break;
            }
            
            const trackLength = (data[offset + 4] << 24) | (data[offset + 5] << 16) | 
                               (data[offset + 6] << 8) | data[offset + 7];
            offset += 8;
            const trackEnd = offset + trackLength;
            
            let currentTick = 0;
            let lastStatus = 0;
            
            while (offset < trackEnd && offset < data.length) {
                // Read delta time
                const deltaResult = this.readVariableLength(data, offset);
                const deltaTime = deltaResult.value;
                offset = deltaResult.offset;
                currentTick += deltaTime;
                
                if (offset >= data.length) break;
                
                let status = data[offset];
                
                // Handle running status
                if (status < 0x80) {
                    status = lastStatus;
                    offset--; // Re-read the byte
                } else {
                    lastStatus = status;
                    offset++;
                }
                
                // Meta event
                if (status === 0xFF) {
                    if (offset >= data.length) break;
                    const metaType = data[offset++];
                    const lengthResult = this.readVariableLength(data, offset);
                    const length = lengthResult.value;
                    offset = lengthResult.offset;
                    
                    if (metaType === 0x51 && length === 3) {
                        // Set Tempo
                        const microsecondsPerQuarter = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
                        tempo = Math.round(60000000 / microsecondsPerQuarter);
                    } else if (metaType === 0x58 && length === 4) {
                        // Time Signature
                        const numerator = data[offset];
                        const denominator = Math.pow(2, data[offset + 1]);
                        timeSignature = { numerator, denominator };
                    } else if (metaType === 0x01 && length > 0) {
                        // Text Event - potentially contains rhythm metadata
                        const textBytes = new Uint8Array(data.buffer, data.byteOffset + offset, length);
                        const textData = new TextDecoder().decode(textBytes);
                        
                        // Store metadata for the current tick (will be associated with the next note)
                        if (!events.metadata) {
                            events.metadata = {};
                        }
                        if (!events.metadata[currentTick]) {
                            events.metadata[currentTick] = {};
                        }
                        
                        // Parse rhythm metadata if present
                        if (textData.startsWith('rhythm:')) {
                            const parts = textData.substring(7).split(':');
                            events.metadata[currentTick].noteValue = parseInt(parts[0]);
                            if (parts[1]) {
                                events.metadata[currentTick].modifier = parts[1];
                            }
                        }
                    }
                    
                    offset += length;
                }
                // Note On
                else if ((status & 0xF0) === 0x90) {
                    if (offset + 1 >= data.length) break;
                    const note = data[offset++];
                    const velocity = data[offset++];
                    
                    if (velocity > 0) {
                        // Store note on event
                        events.push({
                            startTick: currentTick,
                            note: note,
                            velocity: velocity
                        });
                    } else {
                        // Note off (velocity 0)
                        // Find matching note on and create note event
                        for (let i = events.length - 1; i >= 0; i--) {
                            if (events[i].note === note && !events[i].durationTicks) {
                                events[i].durationTicks = currentTick - events[i].startTick;
                                break;
                            }
                        }
                    }
                }
                // Note Off
                else if ((status & 0xF0) === 0x80) {
                    if (offset + 1 >= data.length) break;
                    const note = data[offset++];
                    const velocity = data[offset++];
                    
                    // Find matching note on and create note event
                    for (let i = events.length - 1; i >= 0; i--) {
                        if (events[i].note === note && !events[i].durationTicks) {
                            events[i].durationTicks = currentTick - events[i].startTick;
                            break;
                        }
                    }
                }
                // Other events - skip
                else if ((status & 0xF0) === 0xC0 || (status & 0xF0) === 0xD0) {
                    offset++; // One byte
                } else if ((status & 0xF0) === 0xE0 || (status & 0xF0) === 0xB0) {
                    offset += 2; // Two bytes
                } else {
                    offset++; // Unknown, skip one byte
                }
            }
        }
        
        // Filter out incomplete notes and convert to note events
        const noteEvents = events.filter(e => e.durationTicks && e.durationTicks > 0);
        
        return {
            tempo,
            timeSignature,
            ticksPerQuarter,
            events: noteEvents,
            metadata: events.metadata || {}
        };
    }
    
    readVariableLength(data, offset) {
        let value = 0;
        let byte;
        
        do {
            if (offset >= data.length) break;
            byte = data[offset++];
            value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        
        return { value, offset };
    }
}
