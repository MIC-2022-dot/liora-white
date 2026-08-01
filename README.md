# LIORA WHITE

Build the complete production-ready application called LIORA.

This is not a static UI prototype.

Build the complete UI, database, authentication, permissions, real-time functionality, messaging, calling architecture, private AI Studio, avatar configuration system, AI call controls, and all required backend structure.

The final result must be a real working application that users can register for, communicate through, and use in real time.

The AI/avatar system must also be integrated into the application architecture so it can be connected to the appropriate external AI/avatar/voice services.

━━━━━━━━━━━━━━━━━━━━━━━━
CORE PRODUCT
━━━━━━━━━━━━━━━━━━━━━━━━

Liora is ONE premium messaging and calling application.

The normal Liora experience is human-to-human communication.

Users can:

Create accounts

Login

Create profiles

Find other users

Chat in real time

Send media

See online status

See typing indicators

See read receipts

Make voice calls

Make video calls

Receive calls

Manage contacts

View call history

Manage notifications

Manage privacy and account settings

Liora also contains a powerful private capability called:

Studio

Studio is NOT a separate application.

Studio is a protected section INSIDE the same Liora application.

It allows authorized users to create and configure their own digital AI representation.

━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL ACCESS RULE
━━━━━━━━━━━━━━━━━━━━━━━━

THIS IS ONE OF THE MOST IMPORTANT REQUIREMENTS.

The AI functionality must NEVER be visible to ordinary users unless they have explicitly been granted access.

There are three levels of access:

1. NORMAL USER

A normal user sees:

Chats
Calls
Contacts
Profile

They must NOT see:

Studio

AI

Avatar

AI settings

AI training

AI call controls

AI configuration

AI-related navigation

The AI functionality should appear as if it does not exist.

2. AUTHORIZED STUDIO USER

When an administrator grants a user Studio access, the user's existing Liora account gains:

Studio

in the application navigation.

They can then create and manage THEIR OWN AI representation.

They do not gain access to another person's AI.

3. OWNER/ADMIN

The owner/admin can:

Use Studio

Create their own AI representation

Grant Studio access

Revoke Studio access

See which users have Studio permission

IMPORTANT:

Do not rely only on hiding buttons in React.

The permission must be enforced in the database using Supabase RLS and backend authorization.

A user without Studio permission must not be able to access Studio by manually typing a URL.

━━━━━━━━━━━━━━━━━━━━━━━━
BRAND
━━━━━━━━━━━━━━━━━━━━━━━━

Brand name:

LIORA

The visual identity must feel:

Premium

Elegant

Human

Sophisticated

Modern

Private

Trustworthy

Original

Liora should NOT look like an AI app.

Do not use:

Robots

AI brains

Circuit-board graphics

Cyberpunk

Cryptocurrency aesthetics

Generic chatbot layouts

Excessive neon

Excessive purple gradients

Excessive glassmorphism

Generic SaaS dashboards

The AI is a hidden advanced capability, not the public identity of Liora.

Do not copy WhatsApp, Telegram, Messenger, iMessage, Discord, or any other existing messaging application.

Create an original premium communication interface.

━━━━━━━━━━━━━━━━━━━━━━━━
PUBLIC LANDING PAGE
━━━━━━━━━━━━━━━━━━━━━━━━

Create the complete Liora public landing page.

The landing page should communicate that Liora is a premium messaging and calling platform.

Do NOT publicly advertise the AI/avatar system.

Include:

Hero:

LIORA

A strong headline about staying connected.

Supporting description.

Buttons:

Get Started
Login

Show elegant previews of:

Messaging

Calls

Profiles

Real-time conversations

Sections explaining:

Real-time messaging

Voice calls

Video calls

Profiles

Private communication

Final CTA:

Create your Liora account.

Make the landing page fully responsive.

━━━━━━━━━━━━━━━━━━━━━━━━
AUTHENTICATION
━━━━━━━━━━━━━━━━━━━━━━━━

Use Supabase Auth.

Implement:

Sign up

Login

Logout

Email verification

Forgot password

Reset password

Persistent sessions

Authentication loading states

Authentication errors

Support Google authentication if the Supabase project is configured for it.

Do not create fake authentication.

Users must actually be stored/authenticated through Supabase.

━━━━━━━━━━━━━━━━━━━━━━━━
ONBOARDING
━━━━━━━━━━━━━━━━━━━━━━━━

After registration:

WELCOME TO LIORA

Create your profile.

Allow:

Profile photo

Display name

Username

Bio

Validate usernames and prevent duplicates.

Store profile data in Supabase.

Use Supabase Storage for profile photos.

━━━━━━━━━━━━━━━━━━━━━━━━
MAIN NAVIGATION
━━━━━━━━━━━━━━━━━━━━━━━━

Normal user:

Chats
Calls
Contacts
Profile

Authorized user:

Chats
Calls
Contacts
Studio
Profile

Owner/admin:

Chats
Calls
Contacts
Studio
Profile

Studio must dynamically appear/disappear according to the user's permission.

━━━━━━━━━━━━━━━━━━━━━━━━
CHAT SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━

Implement real one-to-one messaging.

Users can:

Search for other Liora users

Start conversations

Send messages

Receive messages

Reply

React

Delete their own messages where appropriate

Send images

Send voice messages

See timestamps

See message status

See unread counts

See read receipts

Use Supabase Realtime.

If User A sends a message to User B, User B must receive it immediately without refreshing.

Do not use fake polling or fake timers.

━━━━━━━━━━━━━━━━━━━━━━━━
CHAT UI
━━━━━━━━━━━━━━━━━━━━━━━━

Create a premium real messaging interface.

Chat list:

Profile photo

Name

Last message

Timestamp

Unread count

Online indicator

Search

New conversation

Conversation:

Profile photo

Name

Online status

Voice call

Video call

Message history

Reactions

Reply

Attachments

Voice messages

Typing indicator

Read receipts

Composer

Make it feel like a real communication application.

━━━━━━━━━━━━━━━━━━━━━━━━
REAL-TIME PRESENCE
━━━━━━━━━━━━━━━━━━━━━━━━

Use Supabase Realtime presence.

Show:

Online
Offline
Last seen

Do not constantly write unnecessary presence records.

━━━━━━━━━━━━━━━━━━━━━━━━
TYPING INDICATOR
━━━━━━━━━━━━━━━━━━━━━━━━

Implement real-time typing indicators.

Example:

David is typing...

Use Supabase Realtime channels/presence.

Do not store every keystroke in PostgreSQL.

━━━━━━━━━━━━━━━━━━━━━━━━
READ RECEIPTS
━━━━━━━━━━━━━━━━━━━━━━━━

Implement:

Sent
Delivered
Read

When a user opens a conversation, unread messages should update to read.

━━━━━━━━━━━━━━━━━━━━━━━━
CONTACTS
━━━━━━━━━━━━━━━━━━━━━━━━

Create a real Contacts system.

Search users by:

Username

Display name

Show:

Profile photo

Name

Username

Online status

Allow:

Message
View Profile
Start Call

━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━

Users can:

Upload profile photo

Change display name

Change username

Edit bio

View media

View shared files

Manage account

Use Supabase Storage.

━━━━━━━━━━━━━━━━━━━━━━━━
SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━

Create:

Account
Privacy
Notifications
Security
Appearance
Blocked Users
Storage
Help
Logout

Keep the design consistent with Liora.

━━━━━━━━━━━━━━━━━━━━━━━━
CALLING SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━

Liora calls are always person-to-person.

There is NO separate “Call AI” contact.

If Michael calls David:

Calling David...

David receives the call.

The AI functionality modifies how David can answer the call.

Build:

Voice call

Video call

Incoming call

Outgoing call

Missed call

Active call

Call history

If real WebRTC can be implemented reliably, implement it.

If an external calling service is required, structure the integration correctly rather than creating a fake working state.

━━━━━━━━━━━━━━━━━━━━━━━━
NORMAL INCOMING CALL
━━━━━━━━━━━━━━━━━━━━━━━━

A normal user sees:

INCOMING CALL

David

Michael is calling

[Decline]

[Answer]

Nothing about AI should appear.

━━━━━━━━━━━━━━━━━━━━━━━━
AI-ENABLED INCOMING CALL
━━━━━━━━━━━━━━━━━━━━━━━━

If David has Studio access, the incoming call should provide:

INCOMING CALL

David

Michael is calling

[Decline]

[Answer as Me]

[Answer as My AI]

This is still the same call from Michael to David.

Michael did not call an AI.

David simply chose how the call should be answered.

━━━━━━━━━━━━━━━━━━━━━━━━
AI AUTOMATIC ANSWERING
━━━━━━━━━━━━━━━━━━━━━━━━

Inside:

Studio → Call Settings

provide:

AI Call Handling

Allow my AI to answer calls when I am unavailable

[ON/OFF]

Options:

Answer after:
[10 seconds]

Voice calls:
[ON/OFF]

Video calls:
[ON/OFF]

Manual switching during calls:
[ON/OFF]

If enabled, the AI can answer when the owner does not answer.

━━━━━━━━━━━━━━━━━━━━━━━━
LIVE CALL — HUMAN MODE
━━━━━━━━━━━━━━━━━━━━━━━━

During an active call, the owner sees:

[Switch to AI]

This is extremely important.

The user can switch from personally speaking to their AI without ending the call.

━━━━━━━━━━━━━━━━━━━━━━━━
LIVE CALL — AI MODE
━━━━━━━━━━━━━━━━━━━━━━━━

When the user selects:

Switch to AI

the AI representation takes over.

The call remains active.

The UI changes to:

David

AI is speaking

[Take Over]

The user can select:

Take Over

and immediately return to personally speaking.

The complete flow is:

YOU
↓
SWITCH TO AI
↓
AI
↓
TAKE OVER
↓
YOU

No call should end during this transition.

━━━━━━━━━━━━━━━━━━━━━━━━
AI AVATAR
━━━━━━━━━━━━━━━━━━━━━━━━

The avatar must be based on a photograph uploaded by the user.

Do NOT generate a random face.

Do NOT use a generic 3D character.

Do NOT replace the user's identity.

The system should preserve the user's recognizable appearance.

Preserve:

Facial structure

Face shape

Eyes

Hair

Skin appearance

Overall likeness

The uploaded image is the identity source.

━━━━━━━━━━━━━━━━━━━━━━━━
AVATAR MOTION
━━━━━━━━━━━━━━━━━━━━━━━━

The future/live avatar should support natural movement such as:

Blinking

Eye movement

Head movement

Looking toward camera

Nodding

Head shaking

Smiling

Laughing

Giggling

Eyebrow movement

Facial expressions

Emotional reactions

Natural hand gestures

Natural speaking movement

Listening reactions

The avatar should feel like a digital representation of the actual person.

It must not look robotic.

━━━━━━━━━━━━━━━━━━━━━━━━
AI PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━━

The user should be able to configure how their AI behaves.

Studio should support:

Personality
Speaking style
Emotional behavior
Knowledge
Instructions
Conversation behavior
Voice
Appearance
Expressions
Movement

The AI should be able to:

Answer questions

Understand context

Respond naturally

Adapt tone

Show emotions

Be playful

Be serious

Comfort someone

Laugh appropriately

React naturally

Maintain conversation

The system must use the owner's configuration rather than behaving like a generic chatbot.

━━━━━━━━━━━━━━━━━━━━━━━━
LIORA STUDIO
━━━━━━━━━━━━━━━━━━━━━━━━

Studio is inside Liora.

It should look like a professional developer/creative interface.

It should NOT look like a separate app.

Studio navigation:

Overview
My Avatar
Personality
Knowledge
Instructions
Voice
Appearance
Behavior
Training
Test Playground
Call Settings
Access

The normal Liora interface should remain simple.

Studio can be more technical and developer-oriented.

━━━━━━━━━━━━━━━━━━━━━━━━
STUDIO OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━

Show:

Your AI Representation

Avatar status:
Ready / Setup required

Voice status

Personality status

Knowledge status

Call settings

Quick actions:

Configure Avatar
Edit Personality
Add Knowledge
Test Avatar
Call Settings

━━━━━━━━━━━━━━━━━━━━━━━━
AVATAR SETUP
━━━━━━━━━━━━━━━━━━━━━━━━

Create:

MY AVATAR

Upload your photograph.

Show:

Photo preview
Identity detected
Image quality
Avatar setup progress

Allow:

Upload
Replace
Preview

Create the avatar configuration record.

The actual photorealistic animation should be implemented through an appropriate external avatar service/API when credentials are provided.

Do not pretend that a static image is a live avatar.

Structure the integration so the provider can be added without rewriting the Studio UI.

━━━━━━━━━━━━━━━━━━━━━━━━
PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━━

Create a professional configuration interface.

Fields:

Personality description

Speaking style

Tone

Emotional behavior

Things the AI should know

Things the AI should avoid

Conversation preferences

Use a developer-style editor where appropriate.

━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━

Create a system-instruction editor.

Allow the owner to define:

How the AI speaks

How it responds

What it knows

What it should not say

How it behaves in different situations

Save instructions securely to Supabase.

━━━━━━━━━━━━━━━━━━━━━━━━
KNOWLEDGE
━━━━━━━━━━━━━━━━━━━━━━━━

Create a knowledge-management interface.

Allow authorized users to add information that their AI can use.

Examples:

Personal information
Frequently asked questions
Preferences
Background information
Custom responses

Structure this so a future retrieval/knowledge system can be connected.

━━━━━━━━━━━━━━━━━━━━━━━━
VOICE
━━━━━━━━━━━━━━━━━━━━━━━━

Create a voice configuration screen.

Allow future integration with an external voice provider.

Include:

Voice selection
Voice preview
Speaking speed
Pitch where supported
Emotion where supported

Do not expose API keys in the frontend.

━━━━━━━━━━━━━━━━━━━━━━━━
APPEARANCE & BEHAVIOR
━━━━━━━━━━━━━━━━━━━━━━━━

Create controls for:

Facial expressions
Blinking
Eye movement
Head movement
Smile
Laugh
Hand gestures
Listening behavior
Speaking behavior
Emotional reactions

Make this look like a professional configuration interface.

━━━━━━━━━━━━━━━━━━━━━━━━
TEST PLAYGROUND
━━━━━━━━━━━━━━━━━━━━━━━━

Create a developer-style test environment.

Show:

Avatar preview

Conversation test:

You:
“How was your day?”

AI:
“...”

Allow:

Text test
Voice test
Video test

Show response state.

If the actual external AI provider has not been connected yet, clearly structure the integration point rather than pretending the AI response is real.

━━━━━━━━━━━━━━━━━━━━━━━━
ACCESS MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━

Only authorized owners/admins can manage Studio access.

Create:

STUDIO ACCESS

John Doe — Enabled
Sarah — Disabled
David — Enabled
Michael — Disabled

Buttons:

Grant Access
Revoke Access

Granting Studio access allows the selected user to create THEIR OWN AI representation.

It does NOT expose the owner's AI.

Each user's Studio data must be isolated.

━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━

Use Supabase PostgreSQL.

Create appropriate tables for:

profiles
conversations
conversation_participants
messages
message_reads
message_reactions
contacts
user_presence
call_history
notifications

AI-related:

studio_access
avatar_profiles
avatar_media
avatar_personality
avatar_instructions
avatar_knowledge
avatar_voice_settings
avatar_behavior_settings
ai_call_settings
ai_call_sessions

Use proper foreign keys.

Use indexes where necessary.

Avoid unnecessary duplication.

━━━━━━━━━━━━━━━━━━━━━━━━
ROW LEVEL SECURITY
━━━━━━━━━━━━━━━━━━━━━━━━

Implement strong RLS.

Users can only access their own private information.

Conversation participants can only access their conversations.

Users can only read messages from conversations they belong to.

Users can only modify their own profile.

Users can only manage their own avatar configuration.

Users with Studio permission can access Studio.

Users without Studio permission cannot access Studio.

Admins can manage Studio access according to the application's role system.

Do not rely on frontend hiding for security.

A user who manually visits:

/studio

without permission must receive an authorization failure/redirect.

━━━━━━━━━━━━━━━━━━━━━━━━
REAL-TIME
━━━━━━━━━━━━━━━━━━━━━━━━

Use Supabase Realtime for:

Messages

Typing

Presence

Read receipts where appropriate

Notifications

Relevant call state updates

The app must behave like a real-time communication product.

━━━━━━━━━━━━━━━━━━━━━━━━
NOTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━

Implement:

New message
Incoming call
Missed call
Important account notifications

Use real user-specific notification data.

━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSIVE DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━

Mobile-first.

Support:

Android
iPhone
Tablet
Desktop

Mobile should feel like a real mobile communication app.

Desktop should have an appropriate multi-column communication layout.

Do not simply stretch the mobile interface.

━━━━━━━━━━━━━━━━━━━━━━━━
LOADING / EMPTY / ERROR
━━━━━━━━━━━━━━━━━━━━━━━━

Every page must have:

Loading
Skeleton
Empty
Error
Offline
No results

Do not leave blank screens.

━━━━━━━━━━━━━━━━━━━━━━━━
SECURITY
━━━━━━━━━━━━━━━━━━━━━━━━

Never expose:

Supabase service-role keys
AI provider secret keys
Voice provider secret keys
Avatar provider secret keys

Use secure server-side functions/edge functions for sensitive external API communication.

Validate user input.

Protect uploads.

Use proper authorization.

━━━━━━━━━━━━━━━━━━━━━━━━
EXTERNAL AI INTEGRATION ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━

The avatar itself requires specialized external technology for:

Photorealistic avatar animation

Facial motion

Lip synchronization

Voice generation

Real-time streaming

Video generation

Do not fake these capabilities.

Create clean integration points/server-side functions so an avatar provider and voice provider can be connected later.

The Studio UI, user permissions, database, avatar configuration, AI call states, and call switching architecture should already exist.

When provider credentials are supplied later, the system can connect them.

━━━━━━━━━━━━━━━━━━━━━━━━
UI SCREENS TO BUILD
━━━━━━━━━━━━━━━━━━━━━━━━

Build ALL of these:

PUBLIC:

Landing page

Login

Sign up

Forgot password

Reset password

Email verification

ONBOARDING:

Welcome

Profile setup

MAIN APP:

Chat home

Conversation

Search users

Contacts

User profile

Calls

Call history

Incoming call

Outgoing call

Active voice call

Active video call

Notifications

Settings

Privacy

Account

STUDIO:

Studio overview

Avatar setup

Avatar preview

Personality

Instructions

Knowledge

Voice

Appearance

Behavior

Training

Test Playground

Call Settings

Studio Access Management

AI CALL:

Incoming call — Answer as Me / Answer as My AI

Human active call — Switch to AI

AI active call — Take Over

AI automatic answering state

━━━━━━━━━━━━━━━━━━━━━━━━
ONE PRODUCT REQUIREMENT
━━━━━━━━━━━━━━━━━━━━━━━━

The entire experience must clearly be ONE application:

LIORA

Chats
Calls
Contacts
Studio
Profile

Studio is simply unlocked for authorized users.

Do not create a separate AI app.

Do not create a separate AI login.

Do not create separate AI branding.

Do not create a second application.

━━━━━━━━━━━━━━━━━━━━━━━━
CODE QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━

Use:

React
TypeScript
Tailwind CSS
Supabase
Supabase Auth
Supabase Realtime
Supabase Storage

Use reusable components.

Use proper hooks.

Separate:

components
pages
services
hooks
Supabase logic
authentication
real-time logic
AI integration
types
utilities

Do not create one huge component.

Keep the code maintainable.

━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT IMPLEMENTATION RULE
━━━━━━━━━━━━━━━━━━━━━━━━

Before modifying the project:

Inspect the existing code.

Inspect the existing Supabase configuration.

Reuse working authentication and infrastructure.

Do not create duplicate Supabase clients.

Do not create a second database.

Do not break existing working functionality.

Use existing environment variables where appropriate.

If something requires an external service that has not yet been configured, build the complete UI, database structure, secure integration layer, and clear provider abstraction so the service can be connected later.

Do not replace real functionality with fake mock data simply to make the interface appear complete.

━━━━━━━━━━━━━━━━━━━━━━━━
FINAL SUCCESS CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━

When this phase is complete:

A new visitor can:

→ Open Liora
→ See the landing page
→ Create an account
→ Verify their email
→ Create a profile
→ Enter Liora

A normal user can:

→ Search users
→ Start conversations
→ Send real messages
→ Receive messages in real time
→ See online status
→ See typing
→ See read receipts
→ Manage contacts
→ Make/receive calls
→ View call history
→ Manage their profile
→ Manage settings

An authorized Studio user can additionally:

→ See Studio
→ Create their own avatar profile
→ Upload their own photo
→ Configure personality
→ Add knowledge
→ Add instructions
→ Configure voice
→ Configure behavior
→ Test their AI
→ Configure AI call handling

During a future/live AI-enabled call:

→ Michael calls David
→ David can answer personally
→ Or David can answer as his AI
→ AI can automatically answer if configured
→ David can switch to AI during the call
→ David can take control back
→ The call never needs to end during the switch

Most importantly:

A normal user who has NOT been granted Studio access must not see or access any of these AI features.

The permission system must be enforced at the database/backend level, not just hidden in the UI.

Build Liora as a real, scalable, premium application rather than a visual demo.

This image shows the branding and how the app should possible look like but you shoud know whats best for this kind of app. Make sure to build everything completely now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/34995625-e8a4-44d7-ae19-074f7c94fd11).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
