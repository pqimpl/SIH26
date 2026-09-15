# Dementia Support App: Product and Technical Plan

## 1. Objective

Build a cross-platform hackathon prototype that provides dementia patients with simple, familiar, and engaging activities focused on:

- Familiarity
- Reminiscence
- Sequencing
- Spatial reasoning
- Auditory prediction
- Social interaction

The application will be configured and supervised by a caregiver. It is a support and engagement tool, not a medical device or diagnostic system.

## 2. Target Platforms

The application should support:

- Android
- iOS
- Web browsers

The recommended frontend technology is Expo React Native with TypeScript, using Expo web support where practical.

The initial prototype should prioritize tablet-sized layouts while remaining usable on phones and desktop browsers.

## 3. User Roles

### Caregiver

The caregiver can:

- Create and manage patient profiles
- Configure activities
- Upload familiar images and audio
- Create recognition questions
- Create daily routines
- Review basic activity completion
- Start and configure social conversations
- Access protected settings

### Patient

The patient can:

- Select their profile
- Start available activities
- Complete activities without time pressure
- Receive positive, simple feedback
- View daily routines
- Use the social conversation feature

The patient interface should avoid exposing complex settings or account management controls.

## 4. Core Design Principles

The patient experience must be:

- Simple
- Calm
- Predictable
- Encouraging
- Accessible
- Suitable for touch devices
- Usable with limited reading ability
- Free from unnecessary timers and penalties

The interface should use:

- Large touch targets
- Large readable text
- High color contrast
- Clear icons and images
- Minimal navigation depth
- Consistent placement of controls
- Optional audio instructions
- Positive feedback instead of failure states

The app must not make medical claims or replace professional care.

## 5. Functional Modules

### 5.1 Familiarity Puzzle

The patient completes a puzzle based on a familiar image.

Caregiver functionality:

- Upload an image
- Add a title or description
- Select puzzle difficulty
- Enable or disable a puzzle

Patient functionality:

- View the image and puzzle pieces
- Arrange pieces using touch interaction
- Receive encouraging feedback
- Restart or exit the puzzle

The prototype may use a simple tile-swapping interaction instead of complex drag-and-drop behavior.

Recommended difficulty levels:

- Easy: 4 pieces
- Medium: 6 pieces
- Hard: 9 pieces

### 5.2 Image Recognition Questions

The patient is shown an image and chooses the correct answer from several options.

Example:

- Prompt: "What is in this picture?"
- Option A: Cup
- Option B: Ladle
- Option C: Spoon

Caregiver functionality:

- Upload or select an image
- Create a question
- Add two to four answer choices
- Mark the correct answer
- Add optional explanatory feedback

Patient functionality:

- View the image and question
- Select an answer
- Receive supportive feedback
- Continue to the next question

The app should avoid harsh error messages or scoring that may cause frustration.

### 5.3 Daily Routine and To-Do Activities

The caregiver creates a list of familiar daily activities.

Examples:

- Brush your teeth
- Drink water
- Eat breakfast
- Take medication
- Go for a walk
- Call a family member

Caregiver functionality:

- Create routine items
- Set an optional time
- Add an icon or image
- Set repeat days
- Mark whether the item is informational or requires confirmation

Patient functionality:

- View today's routine
- Mark activities as completed
- Hear or view simple instructions
- See encouraging progress feedback

Medication entries must remain reminders or logging prompts only. The app must not recommend dosages, change prescriptions, or make medical decisions.

### 5.4 Slow Rhythmic Music Activity

The patient taps or interacts with slow, predictable rhythmic patterns.

Caregiver functionality:

- Select an audio track
- Select a difficulty
- Configure tempo where supported

Patient functionality:

- Listen to a slow rhythm
- Tap along to visual or audio cues
- Receive positive feedback
- Restart or exit the activity

The prototype should prioritize accessibility and enjoyment over competitive scoring. Missed beats should not create a stressful failure state.

### 5.5 AI Social Mode

The patient can have a simple conversation with a genuinely AI-generated cloud model.

The initial implementation should support text-based conversation. Voice input and spoken responses are optional future enhancements.

Conversation requirements:

- Use short, clear sentences
- Maintain a friendly and patient tone
- Ask one question at a time
- Avoid complex topics unless configured by the caregiver
- Encourage conversation without pressuring the patient
- Avoid pretending to be a human
- Never provide medical diagnosis or treatment advice
- Never give emergency instructions beyond directing the user to a caregiver or emergency service
- Avoid requesting unnecessary personal information

Caregiver functionality:

- Configure a conversation theme
- Provide optional context such as names, hobbies, or favorite topics
- Start or reset a conversation
- Disable the feature

The app should not persist conversations by default. If conversation history is stored, the caregiver must explicitly enable it.

## 6. Recommended Technology Stack

### Frontend

- Expo React Native
- TypeScript
- Expo Router
- Responsive layouts for mobile, tablet, and web
- Accessible reusable UI components

### Local Storage

Use local storage for offline gameplay and cached configuration.

Recommended options:

- `expo-sqlite` for structured mobile data
- IndexedDB-compatible storage for web
- A shared repository or service layer to hide platform-specific storage details

Local data should include:

- Patient profiles
- Activity configuration
- Downloaded assets
- Daily routine state
- Activity progress
- Pending synchronization operations

### Backend

Use Supabase for the prototype.

Supabase responsibilities:

- Caregiver authentication
- Patient and caregiver data
- Activity configuration synchronization
- Image and audio storage
- Basic activity history
- Edge Functions for AI requests
- Optional row-level security

### AI Integration

The app must never call the cloud model provider directly from the client with a secret API key.

Required request flow:

1. The patient submits a message in the application.
2. The application sends the message to a Supabase Edge Function.
3. The Edge Function authenticates and validates the request.
4. The Edge Function adds the controlled system prompt and permitted caregiver context.
5. The Edge Function calls the cloud model provider.
6. The Edge Function returns a filtered response to the application.

The model provider should be accessed through an abstraction so it can be replaced later.

Configuration should use environment variables for:

- Model provider
- Model name
- API key
- Maximum response length
- Request timeout
- Usage limits

## 7. Data Model

The initial data model should include:

- `caregivers`
- `patients`
- `patient_caregiver_access`
- `activities`
- `puzzle_content`
- `question_content`
- `routine_items`
- `rhythm_content`
- `activity_sessions`
- `daily_completions`
- `conversation_settings`

Potential fields include:

- Unique identifier
- Patient identifier
- Activity type
- Title
- Description
- Image or audio asset URL
- Difficulty
- Enabled status
- Schedule
- Created timestamp
- Updated timestamp

Conversation messages should not be stored unless the caregiver explicitly enables history.

## 8. Offline and Synchronization Behavior

The core games must work without an active internet connection after their content has been downloaded.

Offline functionality:

- Open configured activities
- Complete puzzles
- Answer questions
- View and complete routines
- Play downloaded rhythm content
- Record completion locally

When connectivity returns:

- Upload pending progress
- Download caregiver configuration changes
- Synchronize assets
- Resolve basic conflicts using the latest update timestamp

AI Social Mode requires internet access for the initial prototype. If the device is offline, display a clear and calm message explaining that conversation is temporarily unavailable.

## 9. Privacy and Security

The prototype must:

- Keep model API keys on the server
- Authenticate caregiver operations
- Restrict patient data by caregiver access
- Minimize patient information sent to the cloud model
- Avoid storing conversation history by default
- Protect caregiver settings with authentication or a caregiver PIN
- Use private storage for uploaded images and audio
- Avoid collecting unnecessary analytics
- Clearly label the application as a non-medical prototype

User-provided photos, names, routines, and conversation context must be treated as sensitive personal data.

## 10. Application Structure

Recommended application areas:

- Caregiver login
- Patient selection
- Patient home screen
- Puzzle activity
- Recognition activity
- Daily routine activity
- Rhythm activity
- Social conversation activity
- Caregiver dashboard
- Content management
- Patient settings
- Sync and connection status

Use a shared activity interface so each game can provide:

- Activity metadata
- Patient-facing screen
- Caregiver configuration screen
- Completion event
- Progress summary
- Offline support status

## 11. Hackathon Implementation Strategy

Implement a complete vertical slice of every module rather than building only one feature in depth.

Suggested order:

1. Set up the Expo application and routing.
2. Create caregiver and patient profile flows.
3. Create the shared activity and local-storage abstractions.
4. Implement the patient home screen.
5. Implement the puzzle activity.
6. Implement the recognition question activity.
7. Implement the daily routine activity.
8. Implement the rhythm activity.
9. Implement Supabase authentication and synchronization.
10. Implement the AI Edge Function and social mode.
11. Implement caregiver configuration screens.
12. Add basic caregiver activity history.
13. Test mobile, tablet, web, offline, and reconnect behavior.
14. Prepare seeded demo data and a polished presentation flow.

## 12. Prototype Acceptance Criteria

The prototype is successful when:

- A caregiver can log in.
- A caregiver can create or select a patient profile.
- A caregiver can configure at least one item for each activity.
- A patient can open and complete all five activity types.
- Activity progress is saved locally.
- Configured content can synchronize when internet is available.
- The social mode produces cloud-generated responses.
- The model API key is never exposed to the client.
- The app remains usable on mobile, tablet, and web layouts.
- The interface uses large controls and accessible visual feedback.
- The application clearly communicates that it is a prototype and not medical advice.

## 13. Out of Scope for the Hackathon

The following should not block the initial prototype:

- Clinical validation
- Medical diagnosis
- Prescription management
- Advanced patient analytics
- Real-time caregiver alerts
- Voice conversation
- Fully offline AI inference
- Complex multiplayer functionality
- Professional medical integrations
- Production-grade compliance certification
- Advanced personalization algorithms

## 14. Future Enhancements

Possible future work includes:

- On-device AI for offline conversations
- Voice recognition and text-to-speech
- More sophisticated accessibility options
- Caregiver notifications
- Secure conversation history
- Improved synchronization conflict handling
- Additional games and therapeutic activities
- Clinical evaluation with appropriate professionals
- Formal privacy, security, and regulatory review
