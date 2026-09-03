![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4XmP4//8/AwAI/AL+GwXmLwAAAABJRU5ErkJggg==)

__CSE471: System Analysis and Design__

__Assignment on Functional Requirements__

__Proposed Project Title: ClassConnect: University Repository and communication platform __

__Group No: 02, CSE471 Lab Section: 01,    
Summer 2026__

__SL__

__ID__

__Name__

1

23201295

Arian Kabir

2

22301387

Faria Fairooz Zahan

3

22101559

Shahadat Hossain

4

23301073

Lamia Hai Meghla

__Submission Date: 5/7/26__

## <a id="_n0pcflthur9m"></a>

# <a id="_m50au6fnx9s6"></a>__Project Overview__

The ΓÇ£ClassConnect: University Repository and communication platformΓÇ¥ is a comprehensive web application designed to combine all course materials of all the courses of the university in one single platform and create a communication platform for the class students and lecturers in one place\. The system will manage four distinct user roles: Students, Lecturers, Student tutors and System administrators\. It will facilitate students to communicate with lecturers from all classes in one single platform as opposed to multiple different platforms for each lecturer\. Students will be able to arrange all of their course materials in one single place and also get summarized versions of the lecture notes for final preparations\. Users will also be able to get notifications for assignment submissions, quizzes and create a study routine with remainders in the app\. 

__Tech Stack:__

## <a id="_acnqhso8mpw9"></a>Language: TypeScript, Javascript

## <a id="_acnqhso8mpw9"></a>Framework: Next\.js

## <a id="_acnqhso8mpw9"></a>Styling: TailwindCSS

## <a id="_mb2mx14snmyb"></a>Database: mySQL

## <a id="_acnqhso8mpw9"></a>Real\-time Engine: Socket\.io

## <a id="_acnqhso8mpw9"></a>Automation Scheduler: BullMQ with Redis

### <a id="_w5mtb8qtpws0"></a>External APIs

## <a id="_acnqhso8mpw9"></a>Google Workspace API \(OAuth2 & Drive REST API\)

- Gmail REST API/[resend\.com](http://resend.com) API \(22301387 Faria Fairooz Zahan\)

## <a id="_g8p31yn4tu0h"></a>Puppeteer / Headless Chrome API

- Excalidraw API \(Arian Kabir\)
- Drive API
- Open Library Books API \( Lamia Hai Meghla\_23301073\)
- Cloudinary API \( Lamia Hai Meghla\_23301073\)
- Firebase Authentication \( Lamia Hai Meghla\_23301073\)

## <a id="_no55xy9wl0nm"></a>

## <a id="_rt0k5sgg7zwy"></a>__User Roles__

## <a id="_6b5lm4svcf9f"></a>University Student: Students are authenticated using their g\-suite gmail account,  can access personalized course materials, utilizes the interactive canvas for personal or collaborative note\-taking, and participates in section\-specific group chats\.

## <a id="_6b5lm4svcf9f"></a>Faculty Member: Uploads and provisions course materials, shares lecture videos hosted via Google Drive, broadcasts real\-time announcements within section channels, and creates digital assignment evaluation boxes to collect student submissions\.

## <a id="_6b5lm4svcf9f"></a>Student Tutor: Moderates assigned peer review structures, provides guided academic assistance inside designated section\-scoped workspaces, and shares supplementary study materials with permitted peer groups\.

## <a id="_6b5lm4svcf9f"></a>System Administrator: Oversees the health of the public routine scraping micro\-service, tracks database storage metrics, audits system access tokens, handles escalated billing/escrow disputes, and manages tenant configuration metadata\.

## <a id="_n0m6n4t1i0tx"></a>__Functional Requirements__

## <a id="_xt8tvlofu3pa"></a>

## <a id="_6b5lm4svcf9f"></a>SL

## <a id="_6b5lm4svcf9f"></a>Common Workflows

## <a id="_6b5lm4svcf9f"></a>1

## <a id="_6b5lm4svcf9f"></a>Authentication & Access Initialization: A university member signs into the repository ecosystem using their verified institutional G Suite account\. The system validates the domain security token via OAuth2, establishes an active session registry, maps the user's base identity profile, and initializes their dashboard permissions based on their institutional role \.

## <a id="_6b5lm4svcf9f"></a>2

## <a id="_qdr9f5se676b"></a>Automated Academic Onboarding & Sync Routine: Upon successful authentication, the system triggers background scraping and portal synchronization scripts\. It securely gathers the user's active semester course allocations and cross\-references them against spreadsheet routine databases, completely automated and without manual data entry, providing an immediate personalized view of upcoming classes, material paths, and communication groups\.

## <a id="_q5jeiy6ibd4h"></a>

Module 1

__ Faria__

__Automated External Spreadsheet Routine Intake:__ A background script that utilizes the Google Sheets API to pull raw rows from the university's public scheduling spreadsheet\. It parses columns like room numbers, timeslots, and teacher initials, and matches these values to pre\-populate the system's baseline calendar database\.

__Lamia__

__Course Material Category Classifier :__ A structural metadata system that allows administrators to organize central files into tags like *Syllabus*, *Lecture Slides*, *Lab Manuals*, or *Reference Books*\.

__Arian__

__Dual\-Mode Basic Canvas & Text Input Controller:__ A user\-side workspace module created using integration of Excalidraw API which captures freehand digital drawing coordinates from free\-hand, mice or styluses while letting users overlay standard typed text fields anywhere on the page\. 

__Shahadat__

__Routine builder: __Drop down option to select courses and their respective sections\. The selected sections will be added to a routine which appears on the dashboard\.

## <a id="_z348zeicrhkg"></a>Module 2

__Member__

__Feature Description__

__Lamia__

__Admin Lecturer Assignment: __An administrative dashboard panel that pulls existing section maps\. It grants administrators full operational authorization to manually assign new lecturers to existing sections or wipe specific faculty mappings when scheduling shakeups happen mid\-semester\. Also change routines of particular student or teacher

__Faria__

__Cross\-Role Section Staffing & Allocation Ledger:__ A configuration interface that reads initial teacher placements from the routine intake of member 1\. It builds the foundational section assignment tables, setting up structural parameters that map which student tutors, professors, and students share specific course segments\.

__Shahadat__

__Course Material Provisioning Pipeline:__ An asset sorting pipeline that automatically reads a student's schedule\. It pulls matching master files from the seed loader \(M1\.2\) and displays them on the user's current course dashboard, allowing lecturers to append secondary files directly to their assigned sections\.

__Arian__

__Cross\-Peer Notebook Export & File Share Controller:__ A client\-side data packager that bundles a user's canvas notes \(M1\.3\) into standalone downloadable files\. It enables sharing between classmates, enabling users to forward notes across the network without real\-time multi\-user editing conflicts\.

## <a id="_6dtwupz669qa"></a>Module 3

__Member__

__Feature Description__

__Arian__

__Section\-Scoped Multi\-Role Chat Room Orchestrator:__ A communication module that uses current enrollment data to build group chat spaces for each section\. It drops enrolled students, assigned lecturers, and verified student tutors \(M2\.1\) into shared rooms with unique role tags to support announcements and real\-time questions\.

__Arian__

__Chat Room File Attachment System: __An in\-chat file upload system where users in the chatroom can upload one or more files to share\. Accepted files are\- JPEG, PNG, PDF and Word documents within a certain size limit\. 

__Shahadat__

__Isolated Cross\-Faculty Coordination Circles:__ A private communication space created for lecturers teaching the same course code\. It features a meeting scheduler using voting system and document sharing fields, allowing faculty to align deadlines and exchange teaching resources privately\.

__Faria__

__Contextual Student Routine Builder & Study Scheduler:__ A personalized planning tool that pulls the student's core class timetable\. It allows users to schedule custom study sessions around their classes and configure automated background alerts that push reminders when assignment deadlines approach\.

__Shahadat__

__Assignment Submission Form Formulator & Collection Hub:__ A task creation tool allowing lecturers to deploy digital assignment dropboxes inside section chat rooms \(M3\.1\) using integration of Drive API\. The system tracks incoming submissions, allows student tutors to review the files, and compiles everything into a clean download folder for the teacher\. 

__Faria__

__In\-App Structured Email Template Engine:__ An integrated communication hub that provides students with predefined email templates \(e\.g\., sickness leaves, cross\-section quiz requests, consultation slot bookings\)\. Users fill in structural variables and attach local files from their dashboard to prepare emails cleanly\. 

__Lamia __

__Assignment Checker: __Student Tutors within the class section will get access to the assignment submissions and will be able to use basic document editing features to check and return the scripts\.

__Lamia__

__Academic Assignment Audit Log & Submission Guard:__ An automated logging database that monitors assignment boxes \(M3\.3\)\. It records precise timestamp signatures for every file uploaded by students or opened by student tutors, generating clean audit receipts to verify submission integrity and resolve lateness disputes\.

