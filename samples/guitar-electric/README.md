# Guitar electric samples (Electric Guitar variant)

Place `.wav` or `.mp3` files in this folder to use the **Electric Guitar** variant (Instrument → Guitar → Electric Guitar). Click the download icon next to the variant in the instrument menu to load samples. The app checks `.mp3` first, then `.wav` for each note. Tone.Sampler repitches loaded notes to cover the full range.

| Note | Filename (either extension) |
|------|-----------------------------|
| C3   | C3.wav or C3.mp3 |
| E3   | E3.wav or E3.mp3 |
| G3   | G3.wav or G3.mp3 |
| C4   | C4.wav or C4.mp3 |

You can export single-note samples from your soundfont or use any short electric-guitar files. At least one file must exist or the loader will report an error.

Serve the app from the project root (e.g. `npm start`) so paths like `samples/guitar-electric/C3.wav` resolve correctly.
