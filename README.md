# Project Name

This is a React Native application that performs ASR (Automatic Speech Recognition) and manages recording history locally using the Open AI Whisper model.

## Features

- **ASR Testing**: Record audio and perform speech recognition.
- **Recording History**: View, play, and delete historical recordings.

## Directory Structure
.
├── components
│ └── RootComponent.tsx
├── context
│ └── WhisperContext.tsx
├── screens
│ ├── AsrScreen.tsx
│ └── HistoryScreen.tsx
├── assets
│ └── model
│ ├── ggml-small-q8_0.bin
│ ├── ggml-base.bin
│ ├── ggml-base-q8_0.bin
│ └── ggmal-tiny.bin
└── App.tsx
```

## Installation

1. Ensure you have [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/) installed.
2. Clone this repository:
   ```bash
   git clone <repository-url>
   ```
3. Navigate to the project directory and install dependencies:
   ```bash
   cd <project-directory>
   yarn install
   ```

## Running the Application

Start the application using the following command:
```bash
yarn android
yarn ios
```

## Usage

- **ASR Testing**: On the ASR Testing page, select a model and click the "Start Recording" button to record audio. The application will automatically perform speech recognition after recording.
- **Recording History**: On the Recording History page, you can view all recorded files. Click the "Play" button to play a recording, or click the "Delete" button to remove a recording.

## Dependencies

- `react-native`
- `expo-av`
- `expo-file-system`
- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- `whisper.rn`
- `ffmpeg-kit-react-native`

## Contributing

Contributions are welcome! Please fork this repository and submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.