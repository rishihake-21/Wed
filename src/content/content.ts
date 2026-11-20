/**
 * Single source of truth for every guest-facing string and fact.
 *
 * !! Every value below is a PLACEHOLDER until the family's content freeze. !!
 * Marathi text must be proofread by a fluent reader and an elder before launch.
 * Late changes to date, time or venue happen here only — no scene code changes.
 *
 * Devanagari is always rendered as an HTML overlay, never as WebGL text.
 */

import type { Lang } from '../core/types';

/** A string in every supported language. */
export type L10n = Record<Lang, string>;

export interface PersonEntry {
  /** Honorific, e.g. चि. (groom) or चि.सौ.कां. (bride) — to be confirmed with the family. */
  prefix?: L10n;
  name: L10n;
  /** Family line shown with the name reveal. */
  family: L10n;
}

export interface HostEntry {
  relation: L10n;
  name: L10n;
}

export interface EventEntry {
  id: string;
  name: L10n;
  /** ISO 8601 with the IST offset, e.g. 2027-01-01T11:00:00+05:30. */
  startIso: string;
  endIso?: string;
  venue?: L10n;
  dressCode?: L10n;
}

export interface Helpline {
  label: L10n;
  /** International format, digits and leading +. */
  phone: string;
}

export type UiKey =
  | 'enter'
  | 'skip'
  | 'sound'
  | 'language'
  | 'menu'
  | 'date'
  | 'venue'
  | 'schedule'
  | 'rsvp'
  | 'scrollHint'
  | 'lite'
  | 'loading';

export interface WeddingContent {
  meta: {
    title: L10n;
    description: L10n;
    /** 1200×630, under ~300 KB. Wired into index.html in Phase 8. */
    ogImage: string;
  };
  /** Language names are shown in their own script in both languages. */
  languages: Record<Lang, string>;
  invocation: {
    primary: L10n;
    /** Kuladevata or other family-specific invocation, if the family wants one. */
    family?: L10n;
  };
  couple: {
    groom: PersonEntry;
    bride: PersonEntry;
  };
  date: {
    timeZone: 'Asia/Kolkata';
    /** Start of the muhurat, ISO 8601 with +05:30. Drives the countdown and calendar file. */
    muhuratIso: string;
    muhuratLabel: L10n;
    tithi?: L10n;
  };
  venue: {
    name: L10n;
    address: L10n;
    mapsUrl: string;
    phone: string;
    landmark?: L10n;
    parking?: L10n;
  };
  events: EventEntry[];
  families: {
    invitationLine: L10n;
    hosts: HostEntry[];
    closingLine: L10n;
  };
  rsvp: {
    /** ISO date (YYYY-MM-DD); optional. */
    deadline?: string;
    /** WhatsApp number in international format without +, for wa.me links. */
    whatsappNumber: string;
    helplines: Helpline[];
    /** Google Apps Script web-app URL (Phase 8). */
    endpoint: string;
  };
  ui: Record<UiKey, L10n>;
}

export const content: WeddingContent = {
  meta: {
    title: { mr: 'कृष्ण — विवाह निमंत्रण', en: 'Krushna — Wedding Invitation' },
    description: {
      mr: 'आपल्याला सस्नेह निमंत्रण.',
      en: 'You are warmly invited.',
    },
    ogImage: '/og.jpg',
  },

  languages: { mr: 'मराठी', en: 'English' },

  invocation: {
    primary: { mr: '॥ श्री गणेशाय नमः ॥', en: '॥ श्री गणेशाय नमः ॥' },
  },

  couple: {
    groom: {
      prefix: { mr: 'चि.', en: '' },
      name: { mr: 'कृष्ण', en: 'Krushna' },
      family: { mr: 'श्री. [वडिलांचे नाव] व सौ. [आईचे नाव] यांचे चिरंजीव', en: 'Son of Shri [Father’s name] & Smt [Mother’s name]' },
    },
    bride: {
      prefix: { mr: 'चि.सौ.कां.', en: '' },
      name: { mr: '[वधूचे नाव]', en: '[Bride name]' },
      family: { mr: '[कुटुंब परिचय]', en: '[Family line]' },
    },
  },

  date: {
    timeZone: 'Asia/Kolkata',
    muhuratIso: '2027-01-01T11:00:00+05:30', // PLACEHOLDER date
    muhuratLabel: { mr: '[मुहूर्त]', en: '[Muhurat]' },
  },

  venue: {
    name: { mr: '[स्थळाचे नाव]', en: '[Venue name]' },
    address: { mr: '[पूर्ण पत्ता]', en: '[Full address]' },
    mapsUrl: 'https://maps.google.com/',
    phone: '+910000000000',
  },

  events: [
    {
      id: 'haldi',
      name: { mr: 'हळद', en: 'Haldi' },
      startIso: '2026-12-31T10:00:00+05:30',
    },
    {
      id: 'lagna',
      name: { mr: 'लग्न', en: 'Lagna' },
      startIso: '2027-01-01T11:00:00+05:30',
    },
    {
      id: 'reception',
      name: { mr: 'स्वागत समारंभ', en: 'Reception' },
      startIso: '2027-01-01T19:00:00+05:30',
    },
  ],

  families: {
    invitationLine: { mr: 'सस्नेह निमंत्रण', en: 'With love, we invite you' },
    hosts: [
      {
        relation: { mr: '[नाते]', en: '[Relation]' },
        name: { mr: '[नाव]', en: '[Name]' },
      },
    ],
    closingLine: {
      mr: '[आपल्या उपस्थितीने आमचा आनंद द्विगुणित होईल]',
      en: '[Your presence will make our joy complete]',
    },
  },

  rsvp: {
    whatsappNumber: '910000000000',
    helplines: [
      { label: { mr: '[संपर्क १]', en: '[Contact 1]' }, phone: '+910000000000' },
      { label: { mr: '[संपर्क २]', en: '[Contact 2]' }, phone: '+910000000000' },
    ],
    endpoint: '',
  },

  ui: {
    enter: { mr: 'प्रवेश करा', en: 'Enter' },
    skip: { mr: 'वगळा', en: 'Skip' },
    sound: { mr: 'ध्वनी', en: 'Sound' },
    language: { mr: 'भाषा', en: 'Language' },
    menu: { mr: 'मेनू', en: 'Menu' },
    date: { mr: 'दिनांक', en: 'Date' },
    venue: { mr: 'स्थळ', en: 'Venue' },
    schedule: { mr: 'कार्यक्रम', en: 'Schedule' },
    rsvp: { mr: 'उपस्थिती कळवा', en: 'RSVP' },
    scrollHint: { mr: 'पुढे जाण्यासाठी खाली स्क्रोल करा', en: 'Scroll to continue' },
    lite: { mr: 'लाइट मोड', en: 'Lite mode' },
    loading: { mr: 'लोड होत आहे…', en: 'Loading…' },
  },
};
