// Rhythm Generator Application
class RhythmGenerator {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.currentRhythm = [];
        this.playbackTimeouts = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplayValues();
        this.setupFancyButtons();
    }

    setupFancyButtons() {
        // Setup note value buttons
        document.querySelectorAll('.button-group .fancy-button[data-value]').forEach(button => {
            button.addEventListener('click', () => {
                const isSelected = button.getAttribute('data-selected') === 'true';
                button.setAttribute('data-selected', !isSelected);
            });
        });

        // Setup advanced options buttons
        document.getElementById('allow-dotted').addEventListener('click', () => {
            const button = document.getElementById('allow-dotted');
            const isSelected = button.getAttribute('data-selected') === 'true';
            button.setAttribute('data-selected', !isSelected);
        });

        document.getElementById('allow-triplets').addEventListener('click', () => {
            const button = document.getElementById('allow-triplets');
            const isSelected = button.getAttribute('data-selected') === 'true';
            button.setAttribute('data-selected', !isSelected);
        });
    }

    setupEventListeners() {
        document.getElementById('generate-btn').addEventListener('click', () => this.generateRhythm());
        document.getElementById('play-btn').addEventListener('click', () => this.playRhythm());
        document.getElementById('stop-btn').addEventListener('click', () => this.stopRhythm());
        document.getElementById('export-btn').addEventListener('click', () => this.exportMIDI());
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('midi-file-input').click();
        });
        document.getElementById('midi-file-input').addEventListener('change', (e) => this.importMIDI(e));

        document.getElementById('tempo').addEventListener('input', (e) => {
            document.getElementById('tempo-value').textContent = e.target.value;
        });

        document.getElementById('density').addEventListener('input', (e) => {
            document.getElementById('density-value').textContent = e.target.value;
        });
    }

    updateDisplayValues() {
        document.getElementById('tempo-value').textContent = document.getElementById('tempo').value;
        document.getElementById('density-value').textContent = document.getElementById('density').value;
    }

    getSelectedNoteValues() {
        const buttons = document.querySelectorAll('.button-group .fancy-button[data-value][data-selected="true"]');
        return Array.from(buttons).map(btn => parseInt(btn.getAttribute('data-value')));
    }

    getTimeSignature() {
        const sig = document.getElementById('time-signature').value.split('/');
        return { numerator: parseInt(sig[0]), denominator: parseInt(sig[1]) };
    }

    generateRhythm() {
        const noteValues = this.getSelectedNoteValues();
        if (noteValues.length === 0) {
            this.updateStatus('Please select at least one note value');
            return;
        }

        const timeSig = this.getTimeSignature();
        const bars = parseInt(document.getElementById('bars').value);
        const density = parseInt(document.getElementById('density').value, 10) / 10;
        const allowDotted = document.getElementById('allow-dotted').getAttribute('data-selected') === 'true';
        const allowTriplets = document.getElementById('allow-triplets').getAttribute('data-selected') === 'true';

        // Calculate beats per bar
        const beatsPerBar = timeSig.numerator;
        
        // Generate rhythm pattern bar by bar
        this.currentRhythm = [];
        let globalBeat = 0;

        for (let bar = 0; bar < bars; bar++) {
            let barBeat = 0; // Beat position within current bar
            const tolerance = 0.0001; // Small tolerance for floating point comparison
            
            while (barBeat < beatsPerBar - tolerance) {
                const remainingInBar = beatsPerBar - barBeat;
                
                // If remaining space is very small, fill with rest and move to next bar
                if (remainingInBar < 0.01) {
                    if (remainingInBar > tolerance) {
                        const approxNoteValue = Math.round(4 / remainingInBar);
                        this.currentRhythm.push({
                            start: globalBeat + barBeat,
                            duration: remainingInBar,
                            noteValue: approxNoteValue,
                            type: 'rest'
                        });
                    }
                    break;
                }
                
                // Decide if this position should have a note based on density
                if (Math.random() < density) {
                    // Randomly select a note value
                    const noteValue = noteValues[Math.floor(Math.random() * noteValues.length)];
                    let duration = 4 / noteValue; // Convert to beat duration (quarter note = 1 beat)
                    let modifier = null;
                    let isTripletGroup = false;

                    // Apply modifiers (dotted or triplet)
                    if (allowDotted && allowTriplets) {
                        // Both enabled - randomly choose
                        const rand = Math.random();
                        if (rand < 0.33) {
                            // Dotted note (1.5x duration)
                            duration = duration * 1.5;
                            modifier = 'dotted';
                        } else if (rand < 0.66) {
                            // Triplet group (3 notes of 2/3x duration each)
                            isTripletGroup = true;
                            modifier = 'triplet';
                        }
                    } else if (allowDotted && Math.random() < 0.3) {
                        // Only dotted enabled - 30% chance
                        duration = duration * 1.5;
                        modifier = 'dotted';
                    } else if (allowTriplets && Math.random() < 0.3) {
                        // Only triplets enabled - 30% chance to create a triplet group
                        isTripletGroup = true;
                        modifier = 'triplet';
                    }

                    // Handle triplet groups (always in groups of 3)
                    if (isTripletGroup) {
                        const tripletDuration = (4 / noteValue) * (2/3); // Duration of each triplet note
                        const totalTripletDuration = tripletDuration * 3; // Total for all 3

                        // Ensure the triplet group fits in the remaining bar space
                        if (totalTripletDuration <= remainingInBar + tolerance) {
                            // Add all 3 triplet notes
                            for (let i = 0; i < 3; i++) {
                                this.currentRhythm.push({
                                    start: globalBeat + barBeat + (i * tripletDuration),
                                    duration: tripletDuration,
                                    noteValue: noteValue,
                                    modifier: 'triplet',
                                    type: 'note'
                                });
                            }
                            barBeat += totalTripletDuration;
                        } else {
                            // Triplet group doesn't fit - fall back to non-triplet single note
                            duration = 4 / noteValue;
                            if (duration <= remainingInBar + tolerance) {
                                this.currentRhythm.push({
                                    start: globalBeat + barBeat,
                                    duration: duration,
                                    noteValue: noteValue,
                                    modifier: null,
                                    type: 'note'
                                });
                                barBeat += duration;
                            }
                        }
                    } else if (duration <= remainingInBar + tolerance) {
                        // Regular note or dotted note
                        this.currentRhythm.push({
                            start: globalBeat + barBeat,
                            duration: duration,
                            noteValue: noteValue,
                            modifier: modifier,
                            type: 'note'
                        });
                        barBeat += duration;
                    } else {
                        // Note doesn't fit - try to find a smaller note value that fits
                        let foundFit = false;
                        const sortedNoteValues = [...noteValues].sort((a, b) => b - a); // Largest first
                        
                        for (const smallerNoteValue of sortedNoteValues) {
                            let smallerDuration = 4 / smallerNoteValue;
                            
                            // Try without modifier first
                            if (smallerDuration <= remainingInBar + tolerance) {
                                this.currentRhythm.push({
                                    start: globalBeat + barBeat,
                                    duration: smallerDuration,
                                    noteValue: smallerNoteValue,
                                    modifier: null,
                                    type: 'note'
                                });
                                barBeat += smallerDuration;
                                foundFit = true;
                                break;
                            }
                        }
                        
                        // If nothing fits, fill remaining bar with rest
                        if (!foundFit && remainingInBar > tolerance) {
                            // Calculate approximate note value for the remaining duration
                            const approxNoteValue = Math.round(4 / remainingInBar);
                            this.currentRhythm.push({
                                start: globalBeat + barBeat,
                                duration: remainingInBar,
                                noteValue: approxNoteValue,
                                type: 'rest'
                            });
                            barBeat = beatsPerBar;
                        }
                    }
                } else {
                    // Add a rest
                    const restNoteValue = noteValues[Math.floor(Math.random() * noteValues.length)];
                    let restDuration = 4 / restNoteValue;
                    let restModifier = null;
                    
                    // Can apply dotted modifier to rests (triplets only apply to note groups)
                    if (allowDotted && Math.random() < 0.1) {
                        restDuration = restDuration * 1.5;
                        restModifier = 'dotted';
                    }
                    
                    // Ensure the rest fits in the remaining bar space
                    if (restDuration <= remainingInBar + tolerance) {
                        this.currentRhythm.push({
                            start: globalBeat + barBeat,
                            duration: restDuration,
                            noteValue: restNoteValue,
                            modifier: restModifier,
                            type: 'rest'
                        });
                        barBeat += restDuration;
                    } else {
                        // Rest doesn't fit - fill remaining bar with rest
                        if (remainingInBar > tolerance) {
                            // Calculate approximate note value for the remaining duration
                            const approxNoteValue = Math.round(4 / remainingInBar);
                            this.currentRhythm.push({
                                start: globalBeat + barBeat,
                                duration: remainingInBar,
                                noteValue: approxNoteValue,
                                type: 'rest'
                            });
                        }
                        barBeat = beatsPerBar;
                    }
                }
            }
            
            // Ensure bar is completely filled
            const actualBarDuration = this.currentRhythm
                .filter(e => e.start >= globalBeat && e.start < globalBeat + beatsPerBar)
                .reduce((sum, e) => sum + e.duration, 0);
            
            const barDifference = beatsPerBar - actualBarDuration;
            if (Math.abs(barDifference) > tolerance) {
                // Adjust the last event in the bar to fill exactly
                const barEvents = this.currentRhythm
                    .map((e, i) => ({ event: e, index: i }))
                    .filter(({ event }) => event.start >= globalBeat && event.start < globalBeat + beatsPerBar)
                    .sort((a, b) => b.event.start - a.event.start);
                
                if (barEvents.length > 0) {
                    const lastEvent = barEvents[0].event;
                    lastEvent.duration += barDifference;
                }
            }
            
            globalBeat += beatsPerBar;
        }

        // Sort by start time (should already be sorted, but just in case)
        this.currentRhythm.sort((a, b) => a.start - b.start);

        this.displayRhythm();
        document.getElementById('play-btn').disabled = false;
        document.getElementById('export-btn').disabled = false;
        this.updateStatus(`Generated ${bars} bar(s) rhythm`);
    }

    displayRhythm() {
        const container = document.getElementById('rhythm-visualization');
        container.innerHTML = '';

        const timeSig = this.getTimeSignature();
        const beatsPerBar = timeSig.numerator;
        
        // Group events by bar
        const bars = [];
        let currentBar = [];
        let currentBarNumber = -1;

        this.currentRhythm.forEach((event) => {
            const eventBarNumber = Math.floor(event.start / beatsPerBar);
            
            if (eventBarNumber !== currentBarNumber) {
                if (currentBar.length > 0) {
                    bars.push(currentBar);
                }
                currentBar = [];
                currentBarNumber = eventBarNumber;
            }
            
            currentBar.push(event);
        });
        
        // Add the last bar
        if (currentBar.length > 0) {
            bars.push(currentBar);
        }

        // Display each bar in its own container
        let globalEventIdx = 0;
        bars.forEach((barEvents, barIndex) => {
            const barContainer = document.createElement('div');
            barContainer.className = 'bar-container';
            barContainer.draggable = true;
            
            // Create the drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '⋮⋮';
            dragHandle.title = 'Drag to reorder bars';
            barContainer.appendChild(dragHandle);
            
            let tripletGroup = [];
            barEvents.forEach((event) => {
                const nextBarStart = (barIndex + 1) * beatsPerBar;
                const eventEnd = event.start + event.duration;
                const crossesBarBoundary = eventEnd > nextBarStart - 0.001;
                if (event.modifier === 'triplet' && !crossesBarBoundary) {
                    tripletGroup.push(event);
                } else {
                    if (tripletGroup.length > 0) {
                        this.displayTripletGroup(barContainer, tripletGroup);
                        tripletGroup = [];
                    }
                    let el;
                    if (event.type === 'note') {
                        el = document.createElement('span');
                        el.className = 'note';
                        el.setAttribute('data-event-idx', globalEventIdx);
                        const noteSymbol = this.getNoteLabel(event.noteValue);
                        let displayText = noteSymbol;
                        if (event.modifier === 'dotted') {
                            displayText = noteSymbol + '<span class="dot">.</span>';
                        }
                        el.innerHTML = displayText;
                        el.title = `${event.noteValue}th note${event.modifier ? ' (' + event.modifier + ')' : ''}`;
                    } else {
                        el = document.createElement('span');
                        el.className = 'rest';
                        el.setAttribute('data-event-idx', globalEventIdx);
                        const restSymbol = this.getRestLabel(event.noteValue || 4, event.modifier);
                        el.innerHTML = restSymbol;
                        el.title = `Rest${event.noteValue ? ' (' + event.noteValue + 'th note value)' : ''}`;
                    }
                    barContainer.appendChild(el);
                    globalEventIdx++;
                }
            });
            if (tripletGroup.length > 0) {
                this.displayTripletGroup(barContainer, tripletGroup);
            }
            
            // Add drag and drop event listeners
            barContainer.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', barContainer.innerHTML);
                barContainer.classList.add('dragging');
            });
            
            barContainer.addEventListener('dragend', () => {
                barContainer.classList.remove('dragging');
            });
            
            barContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                barContainer.classList.add('drag-over');
            });
            
            barContainer.addEventListener('dragleave', () => {
                barContainer.classList.remove('drag-over');
            });
            
            barContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                barContainer.classList.remove('drag-over');
                
                // Get the dragging element
                const draggingElement = document.querySelector('.bar-container.dragging');
                if (draggingElement && draggingElement !== barContainer) {
                    // Swap the elements
                    const parent = barContainer.parentNode;
                    const allContainers = Array.from(parent.querySelectorAll('.bar-container'));
                    const dragIndex = allContainers.indexOf(draggingElement);
                    const dropIndex = allContainers.indexOf(barContainer);
                    
                    if (dragIndex < dropIndex) {
                        barContainer.parentNode.insertBefore(draggingElement, barContainer.nextSibling);
                    } else {
                        barContainer.parentNode.insertBefore(draggingElement, barContainer);
                    }
                    
                    // Rebuild currentRhythm based on new visual order
                    this.rebuildRhythmFromVisualOrder();
                }
            });
            
            container.appendChild(barContainer);
        });
    }

    rebuildRhythmFromVisualOrder() {
        // Rebuild currentRhythm based on the current visual order of bars
        const timeSig = this.getTimeSignature();
        const beatsPerBar = timeSig.numerator;
        const barContainers = document.querySelectorAll('.bar-container');
        const oldRhythm = this.currentRhythm;
        const newRhythm = [];
        const eventMapping = new Map(); // Maps old event data to new index

        let barIndex = 0;

        barContainers.forEach((barContainer) => {
            const barStartBeat = barIndex * beatsPerBar;
            
            // Get all note and rest elements in this bar
            const elements = Array.from(barContainer.querySelectorAll('.note, .rest'));
            
            elements.forEach((el) => {
                const oldIndex = parseInt(el.getAttribute('data-event-idx'), 10);
                if (oldIndex >= 0 && oldIndex < oldRhythm.length) {
                    const oldEvent = oldRhythm[oldIndex];
                    
                    // Calculate position within the original bar
                    const oldBarIndex = Math.floor(oldEvent.start / beatsPerBar);
                    const positionWithinBar = oldEvent.start - (oldBarIndex * beatsPerBar);
                    
                    // Calculate new start time in the new bar position
                    const newStart = barStartBeat + positionWithinBar;
                    
                    // Create new event with updated start time
                    const newEvent = {
                        ...oldEvent,
                        start: newStart
                    };
                    
                    newRhythm.push(newEvent);
                    // Store mapping with a unique key
                    eventMapping.set(newRhythm.length - 1, { element: el, oldIndex: oldIndex });
                }
            });

            barIndex++;
        });

        // Sort by start time and rebuild the mapping
        const sortedRhythm = newRhythm
            .map((event, idx) => ({ event, visualIdx: idx }))
            .sort((a, b) => a.event.start - b.event.start);

        const newIndexMap = new Map(); // Maps visual index to new sorted index
        sortedRhythm.forEach((item, sortedIdx) => {
            newIndexMap.set(item.visualIdx, sortedIdx);
        });

        // Update DOM elements with correct data-event-idx based on sorted position
        newRhythm.forEach((event, visualIdx) => {
            const { element } = eventMapping.get(visualIdx);
            if (element) {
                const newIndex = newIndexMap.get(visualIdx);
                element.setAttribute('data-event-idx', newIndex.toString());
            }
        });

        // Update currentRhythm with sorted events
        this.currentRhythm = sortedRhythm.map(item => item.event);
    }

    displayTripletGroup(container, tripletGroup) {
        // Only display the first note/rest symbol with bracket styling
        const firstEvent = tripletGroup[0];
        
        if (firstEvent.type === 'note') {
            const note = document.createElement('span');
            note.className = 'note triplet-note';
            const noteSymbol = this.getNoteLabel(firstEvent.noteValue);
            // Create bracket with the note symbol below
            note.innerHTML = '<span class="triplet-bracket">3</span>' + noteSymbol;
            note.title = `${firstEvent.noteValue}th note (triplet)`;
            container.appendChild(note);
        } else {
            const rest = document.createElement('span');
            rest.className = 'rest triplet-rest';
            const restSymbol = this.getRestLabel(firstEvent.noteValue || 4, firstEvent.modifier);
            // Create bracket with the rest symbol below
            rest.innerHTML = '<span class="triplet-bracket">3</span>' + restSymbol;
            rest.title = `Rest (triplet)${firstEvent.noteValue ? ' (' + firstEvent.noteValue + 'th note value)' : ''}`;
            container.appendChild(rest);
        }
    }

    getNoteLabel(noteValue) {
        const labels = {
            1: '𝅝',  // Whole note
            2: '𝅗𝅥',  // Half note
            4: '𝅘𝅥',  // Quarter note
            8: '𝅘𝅥𝅮',  // Eighth note
            16: '𝅘𝅥𝅯'  // Sixteenth note
        };
        return labels[noteValue] || noteValue.toString();
    }

    getRestLabel(noteValue, modifier) {
        // Map note values to rest symbols
        let restSymbol;
        if (noteValue <= 1) {
            restSymbol = '𝄻'; // Whole rest
        } else if (noteValue <= 2) {
            restSymbol = '𝄼'; // Half rest
        } else if (noteValue <= 4) {
            restSymbol = '𝄽'; // Quarter rest
        } else if (noteValue <= 8) {
            restSymbol = '𝄾'; // Eighth rest
        } else {
            restSymbol = '𝄿'; // Sixteenth rest
        }
        
        // Add dot for dotted rests
        if (modifier === 'dotted') {
            return restSymbol + '<span class="dot">.</span>';
        }
        
        return restSymbol;
    }

    validateAndFixTriplets() {
        // Ensure all triplets are in groups of 3 consecutive notes with triplet modifier
        const rhythm = this.currentRhythm;
        let i = 0;

        while (i < rhythm.length) {
            const event = rhythm[i];

            // Check if this is a triplet note
            if (event.type === 'note' && event.modifier === 'triplet') {
                // Count consecutive triplet notes with the same note value
                let tripletCount = 1;
                let j = i + 1;

                while (j < rhythm.length && 
                       rhythm[j].type === 'note' && 
                       rhythm[j].modifier === 'triplet' &&
                       rhythm[j].noteValue === event.noteValue &&
                       Math.abs(rhythm[j].duration - event.duration) < 0.001) {
                    tripletCount++;
                    j++;
                }

                // If triplets are not in groups of 3, convert extras to regular notes
                if (tripletCount % 3 !== 0) {
                    const remainderCount = tripletCount % 3;
                    // Remove triplet modifier from the last 'remainderCount' notes
                    for (let k = 0; k < remainderCount; k++) {
                        rhythm[i + tripletCount - remainderCount + k].modifier = null;
                        // Adjust duration back to standard (triplet was 2/3x, so multiply by 3/2)
                        rhythm[i + tripletCount - remainderCount + k].duration = 
                            rhythm[i + tripletCount - remainderCount + k].duration * 1.5;
                    }
                }

                i = j;
            } else {
                i++;
            }
        }
    }

    async playRhythm() {
        if (this.isPlaying) return;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.isPlaying = true;
        document.querySelector('.rhythm-display').classList.add('playing');
        document.getElementById('play-btn').disabled = true;
        document.getElementById('stop-btn').disabled = false;
        document.getElementById('generate-btn').disabled = true;

        const tempo = parseInt(document.getElementById('tempo').value);
        const bpm = tempo;
        const beatDuration = 60 / bpm; // seconds per beat

        // Clear any existing timeouts
        this.clearAllTimeouts();
        this.currentRhythm.forEach((event, index) => {
            const startTime = event.start * beatDuration;
            const eventDuration = event.duration * beatDuration;
            const selector = event.type === 'note' ? `.note[data-event-idx="${index}"]` : `.rest[data-event-idx="${index}"]`;
            const el = document.querySelector(selector);
            const timeoutId = setTimeout(() => {
                if (!this.isPlaying) return;
                if (event.type === 'note') this.playNote();
                if (el) {
                    el.classList.add('active');
                    const highlightTimeout = setTimeout(() => {
                        if (el) el.classList.remove('active');
                    }, eventDuration * 1000);
                    this.playbackTimeouts.push(highlightTimeout);
                }
            }, startTime * 1000);
            this.playbackTimeouts.push(timeoutId);
        });

        const totalDuration = Math.max(...this.currentRhythm.map(e => e.start + e.duration)) * beatDuration;
        const stopTimeout = setTimeout(() => {
            if (this.isPlaying) {
                this.stopRhythm();
            }
        }, totalDuration * 1000 + 100);
        this.playbackTimeouts.push(stopTimeout);
    }

    playNote() {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 800; // A5 note
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    clearAllTimeouts() {
        this.playbackTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.playbackTimeouts = [];
    }

    stopRhythm() {
        this.isPlaying = false;
        document.querySelector('.rhythm-display').classList.remove('playing');
        
        // Clear all pending timeouts
        this.clearAllTimeouts();
        
        document.getElementById('play-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
        document.getElementById('generate-btn').disabled = false;

        // Remove active class from all notes and rests
        document.querySelectorAll('.note').forEach(note => {
            note.classList.remove('active');
        });
        document.querySelectorAll('.rest').forEach(rest => {
            rest.classList.remove('active');
        });

        this.updateStatus('Playback stopped');
    }

    async importMIDI(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const midiData = new Uint8Array(arrayBuffer);
            
            const parser = new MidiParser();
            const parsed = parser.parse(midiData);
            
            if (!parsed || !parsed.events || parsed.events.length === 0) {
                this.updateStatus('Invalid MIDI file or no notes found');
                return;
            }

            // Convert MIDI events to rhythm format
            this.currentRhythm = [];
            const ticksPerBeat = parsed.ticksPerQuarter || 480;
            const tempo = parsed.tempo || 120;
            const timeSig = parsed.timeSignature || { numerator: 4, denominator: 4 };

            // Update UI with imported tempo and time signature
            document.getElementById('tempo').value = tempo;
            document.getElementById('tempo-value').textContent = tempo;
            document.getElementById('time-signature').value = `${timeSig.numerator}/${timeSig.denominator}`;

            // Convert MIDI notes to rhythm events
            const beatsPerBar = timeSig.numerator;
            let currentBeat = 0;

            parsed.events.forEach(noteEvent => {
                const startBeat = noteEvent.startTick / ticksPerBeat;
                const durationBeat = noteEvent.durationTicks / ticksPerBeat;
                
                let noteValue = 4;
                let modifier = null;
                let hasMetadata = false;

                // Check if metadata is available for this note
                if (parsed.metadata && parsed.metadata[noteEvent.startTick]) {
                    const meta = parsed.metadata[noteEvent.startTick];
                    if (meta.noteValue !== undefined) {
                        noteValue = meta.noteValue;
                        hasMetadata = true;
                    }
                    if (meta.modifier !== undefined) {
                        modifier = meta.modifier;
                    }
                }
                
                // If no metadata, determine note value and modifier from duration
                if (!hasMetadata) {
                    // Check for standard durations first
                    const standardDurations = {
                        0.0625: 16,  // 16th
                        0.125: 8,    // 8th
                        0.25: 4,     // Quarter
                        0.5: 2,      // Half
                        1: 1         // Whole
                    };

                    // Check for dotted note durations (1.5x standard)
                    const dottedDurations = {
                        0.09375: { base: 16, modifier: 'dotted' },    // Dotted 16th
                        0.1875: { base: 8, modifier: 'dotted' },      // Dotted 8th
                        0.375: { base: 4, modifier: 'dotted' },       // Dotted quarter
                        0.75: { base: 2, modifier: 'dotted' },        // Dotted half
                        1.5: { base: 1, modifier: 'dotted' }          // Dotted whole
                    };

                    // Check for triplet durations (2/3x standard)
                    const tripletDurations = {
                        0.041667: { base: 16, modifier: 'triplet' },  // Triplet 16th
                        0.083333: { base: 8, modifier: 'triplet' },   // Triplet 8th
                        0.166667: { base: 4, modifier: 'triplet' },   // Triplet quarter
                        0.333333: { base: 2, modifier: 'triplet' },   // Triplet half
                        0.666667: { base: 1, modifier: 'triplet' }    // Triplet whole
                    };

                    const tolerance = 0.001;

                    // Check dotted durations first (they're more distinctive)
                    for (const [duration, info] of Object.entries(dottedDurations)) {
                        if (Math.abs(durationBeat - parseFloat(duration)) < tolerance) {
                            noteValue = info.base;
                            modifier = info.modifier;
                            break;
                        }
                    }

                    // Check triplet durations if no dotted match
                    if (modifier === null) {
                        for (const [duration, info] of Object.entries(tripletDurations)) {
                            if (Math.abs(durationBeat - parseFloat(duration)) < tolerance) {
                                noteValue = info.base;
                                modifier = info.modifier;
                                break;
                            }
                        }
                    }

                    // Check standard durations if no modifier match
                    if (modifier === null) {
                        for (const [duration, value] of Object.entries(standardDurations)) {
                            if (Math.abs(durationBeat - parseFloat(duration)) < tolerance) {
                                noteValue = value;
                                modifier = null;
                                break;
                            }
                        }
                    }

                    // If still no match, find closest standard duration
                    if (modifier === null && !Object.keys(standardDurations).some(d => Math.abs(durationBeat - parseFloat(d)) < tolerance)) {
                        let closestDuration = 0.25;
                        let closestValue = 4;
                        let minDistance = Math.abs(durationBeat - 0.25);

                        for (const [duration, value] of Object.entries(standardDurations)) {
                            const distance = Math.abs(durationBeat - parseFloat(duration));
                            if (distance < minDistance) {
                                minDistance = distance;
                                closestDuration = parseFloat(duration);
                                closestValue = value;
                            }
                        }
                        noteValue = closestValue;
                    }
                }

                this.currentRhythm.push({
                    start: startBeat,
                    duration: durationBeat,
                    noteValue: noteValue,
                    modifier: modifier,
                    type: 'note'
                });
            });

            // Sort by start time
            this.currentRhythm.sort((a, b) => a.start - b.start);

            // Fill gaps with rests
            const filledRhythm = [];
            let lastEnd = 0;
            const totalBeats = Math.max(...this.currentRhythm.map(e => e.start + e.duration));

            this.currentRhythm.forEach(event => {
                // Add rest if there's a gap
                if (event.start > lastEnd + 0.001) {
                    const restDuration = event.start - lastEnd;
                    const restNoteValue = Math.round(4 / restDuration);
                    filledRhythm.push({
                        start: lastEnd,
                        duration: restDuration,
                        noteValue: restNoteValue,
                        type: 'rest'
                    });
                }
                filledRhythm.push(event);
                lastEnd = event.start + event.duration;
            });

            this.currentRhythm = filledRhythm;

            // Validate and fix triplet groupings - triplets must be in groups of 3
            this.validateAndFixTriplets();

            // Calculate number of bars
            const bars = Math.ceil(totalBeats / beatsPerBar);
            document.getElementById('bars').value = bars;

            // Display the imported rhythm
            this.displayRhythm();
            document.getElementById('play-btn').disabled = false;
            document.getElementById('export-btn').disabled = false;
            this.updateStatus(`Imported ${bars} bar(s) rhythm from MIDI file`);

            // Reset file input
            event.target.value = '';
        } catch (error) {
            console.error('Error importing MIDI:', error);
            this.updateStatus('Error importing MIDI file: ' + error.message);
        }
    }

    exportMIDI() {
        if (!this.currentRhythm || this.currentRhythm.length === 0) {
            this.updateStatus('No rhythm to export');
            return;
        }

        const tempo = parseInt(document.getElementById('tempo').value);
        const timeSig = this.getTimeSignature();

        // Create MIDI file
        const midi = new MidiFile();
        midi.addTrack();
        
        // Set tempo
        midi.setTempo(0, tempo);

        // Add time signature
        midi.addTimeSignature(0, timeSig.numerator, timeSig.denominator);

        // Convert rhythm to MIDI notes
        const ticksPerBeat = 480; // Standard MIDI resolution

        this.currentRhythm.forEach((event, index) => {
            if (event.type === 'note') {
                const startTick = Math.round(event.start * ticksPerBeat);
                const durationTicks = Math.round(event.duration * ticksPerBeat);
                const note = 60; // Middle C
                const velocity = 100;

                midi.addNote(0, startTick, durationTicks, note, velocity);
                
                // Add metadata about note value and modifier as a text event
                // This preserves rhythm information for re-import
                if (event.modifier) {
                    midi.addMetaText(0, startTick, `rhythm:${event.noteValue}:${event.modifier}`);
                } else {
                    midi.addMetaText(0, startTick, `rhythm:${event.noteValue}`);
                }
            }
        });

        // Generate and download MIDI file
        const midiData = midi.toArray();
        const blob = new Blob([midiData], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rhythm_${Date.now()}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.updateStatus('MIDI file exported successfully');
    }

    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RhythmGenerator();
});
