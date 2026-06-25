// Per-page onboarding copy shown in the "?" help popup on each interface.

export interface HelpSection {
    heading: string;
    body: string;
}

export interface HelpContent {
    title: string;
    sections: HelpSection[];
}

export type HelpPage = 'cheatsheet' | 'devwork' | 'events' | 'jobs' | 'tools';

export const HELP: Record<HelpPage, HelpContent> = {
    cheatsheet: {
        title: 'Cheat Sheets',
        sections: [
            { heading: 'What this page is for', body: 'A searchable deck of the links, files and notes you save for reference — your personal cheat-sheet library.' },
            { heading: 'How AI helps', body: 'Paste a link or upload a file and AI automatically writes the title, summary and language tags for you.' },
            { heading: 'How to add', body: 'Hit New, then add a link, upload an attachment, or write a note. The AI fields fill themselves in moments later.' },
        ],
    },
    devwork: {
        title: 'Dev Work',
        sections: [
            { heading: 'What this page is for', body: 'Track your development projects, code snippets, links and attachments in one place.' },
            { heading: 'How to add', body: 'Hit New and fill in the form. A Title is required; languages, a link, notes and attachments are optional.' },
        ],
    },
    events: {
        title: 'Events',
        sections: [
            { heading: 'What this page is for', body: 'A functional tracker for Events, Tasks and Reminders.' },
            { heading: 'How AI helps', body: 'For events, paste a link and AI fills in the title, organization, summary and date.' },
            { heading: 'How to add', body: 'Hit New and pick Task, Event or Reminder. Set a recurring Frequency if it repeats. Reminders act as pins and can recur too. Tasks repopulate when you mark them done.' },
        ],
    },
    jobs: {
        title: 'Jobs',
        sections: [
            { heading: 'What this page is for', body: 'Track job opportunities on a map and as a list.' },
            { heading: 'How AI helps', body: 'Paste a job link and AI fills in the role, organization, summary and location — then geocodes it onto the map.' },
            { heading: 'How to add', body: 'Hit New and add a link. Watch the details fill in, then find the new pin on the map.' },
        ],
    },
    tools: {
        title: 'Tools',
        sections: [
            { heading: 'What this page is for', body: 'A categorized directory of the platforms, tools and resources you rely on.' },
            { heading: 'How AI helps', body: 'Paste a link and AI fills in the name, organization and summary for you.' },
            { heading: 'How to add', body: 'Hit New and add a link. The details fill themselves in moments later.' },
        ],
    },
};
