import { useDispatch, useSelector } from "react-redux";
import { setPreferredLanguage } from "@/slice";
import { LANGUAGES } from "./languages";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  translateText as requestTextTranslation,
  translateTexts,
} from "./translate";

/**
 * @typedef {Object} TranslationValue
 * @property {string} language
 * @property {(language: string) => void} setLanguage
 * @property {(key: string) => string} t
 * @property {(text: string, sourceLanguage?: string, targetLanguage?: string) => Promise<string>} translateMessage
 * @property {{ language: string } | null} conversationTranslation
 * @property {(language: string) => void} translateConversation
 * @property {boolean} interfaceLoading
 */
const TranslationContext = createContext(
  /** @type {TranslationValue | null} */ (null),
);

// Storage is optional on native devices, during SSR, and in private browsers.
function readStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Keep the language usable in memory when persistence is unavailable.
  }
}

const ORIGINAL_LANGUAGE = "en";

const ENGLISH_INTERFACE = {
  lawyerTestPrice: "Fabricated test price",
  lawyerTestPriceUnit: "USD per consultation",
  lawyerTestPriceDisclosure: "Prices are fabricated for testing purposes only. They are not actual fees, estimates, or quotes from these organizations. Recommendations use these fictional prices.",
  lawyerRankingMethod: "Ranking uses your saved profile location, preferred language, selected services, and priority weights. Proximity uses approximate straight-line miles from your saved location to the listed office, not driving distance. Saved city locations are automatically looked up to calculate approximate distances from the city center. Affordability uses fabricated test prices; cheaper test prices earn more points.",
  lawyerDistance: "Approximate straight-line distance",
  lawyerMiles: "miles",
  lawyerDistanceUnknown: "Distance unavailable — your profile location could not be resolved to coordinates.",
  lawyerOfficeDistanceUnknown: "Distance unavailable — this organization has no mapped office address.",
  lawyerDistanceLoading: "Finding coordinates for your saved location…",
  lawyerDistanceLookupFailed: "Could not find coordinates for your saved location. Retry or check the city, state, and country in your profile.",
  lawyerDistanceRetry: "Retry location lookup",
  lawyerNeedsHelp: "Select all that apply. Tap an option again to remove it. Select at least one before pressing Done.",
  lawyerNeed: "What help do you need?",
  lawyerRecommendation: "Suggested organization",
  lawyerNoConfirmedMatch: "No organization lists any of your selected services. Browse the organizations below.",
  lawyerRecommendationHelp: "This demo recommendation combines documented matches with fabricated test prices. Equal scores share the same ranking; names break ties. Contact the organization to confirm fees, eligibility, language assistance, and availability.",
  lawyerMatchScore: "Demo preference match",
  lawyerServiceMatch: "Matching selected services",
  lawyerServiceUnknown: "None of your selected services are listed — confirm directly",
  lawyerLanguageMatch: "Lists your preferred language",
  lawyerLanguageUnknown: "Preferred language unconfirmed — ask about language assistance",
  lawyerPriorities: "Your priorities",
  lawyerPrioritiesHelp: "Rate how important each factor is to you, from 1 (less important) to 10 (most important).",
  lawyerPriorityProximity: "Distance",
  lawyerPrioritySpecialization: "Case specialization",
  lawyerPriorityLanguage: "Language compatibility",
  lawyerPriorityAffordability: "Affordability",
  tourStep: "Step",
  tourSkip: "Skip tour",
  tourNext: "Next",
  tourStart: "Start planning",
  tourUploadTitle: "Start with your information",
  tourUploadBody: "Use this button to edit your profile. Add your location, then select the Eviction Notice and Lease Agreement rows to upload a PDF or image. Choose Done when you finish.",
  tourMenuTitle: "Your app menu",
  tourMenuBody: "Use this menu button to move between Profile, Chat, Calendar, and Lawyer Connect. Let’s take a quick look at each one.",
  tourProfileBody: "Keep your documents and location here. Add supporting files under Additional information, or remove them in edit mode. After both main documents are uploaded, your case summary appears below. It updates automatically, displays in your language, and downloads in English.",
  tourChatBody: "Ask questions about your notice, lease, or next steps. The assistant uses your saved information and may ask follow-up questions. Translate lets you choose a language for the conversation. Always verify important legal information.",
  tourCalendarBody: "See deadlines extracted from your documents. Select a day for its details, and check off completed tasks in the priority checklist. Review the extracted dates against your documents.",
  tourLawyersBody: "Open Local legal help to see organizations, counties served, services, and contact details. Contact an organization directly to confirm whether it can help with your case.",
  tourReadyTitle: "You’re ready to begin",
  tourReadyBody: "Start by uploading your eviction notice and lease agreement here. You can return to your profile whenever your information changes.",
  removeAdditionalFile: "Remove file",
  removeAdditionalFileFailed: "Could not remove this file. Please try again.",
  welcomeLanguageStep: "Language",
  welcomeOverviewStep: "About the app",
  welcomeAccountStep: "Your account",
  welcomeChooseLanguage: "Choose your language",
  welcomeLanguageHelp: "Choose the language you feel most comfortable with. You can change it later.",
  welcomeTitle: "A clearer path through housing uncertainty.",
  welcomeIntro: "Bring your documents, questions, and next steps together in one place. Evict Wise helps you understand your situation and prepare for what comes next.",
  welcomeDocuments: "Understand your documents",
  welcomeDocumentsHelp: "Upload your lease or eviction notice and keep a concise summary of your situation.",
  welcomeDeadlines: "Keep track of what matters",
  welcomeDeadlinesHelp: "See important dates on your calendar and check off tasks as you complete them.",
  welcomeSupport: "Find answers and local help",
  welcomeSupportHelp: "Ask follow-up questions in your language and explore local legal-help organizations.",
  welcomeAccountHelp: "After signing in, start with your profile to add your location and documents.",
  welcomeContinue: "Continue",
  authCreateAccount: "Create account",
  authSignIn: "Sign in",
  authSignOut: "Sign out",
  authUsername: "Username",
  authUsernameHelp: "3–32 letters, numbers, or underscores. Usernames are not case-sensitive.",
  authPassword: "Password",
  authConfirmPassword: "Confirm password",
  authPasswordHelp: "At least 9 characters.",
  authAlreadyAccount: "Already have an account? Sign in",
  authNeedAccount: "New here? Create an account",
  authInvalidInput: "Enter a valid username and password.",
  authPasswordPolicy: "Use a password with 9–128 characters.",
  authPasswordMismatch: "The passwords do not match.",
  authInvalidCredentials: "The username or password is incorrect.",
  authUsernameUnavailable: "That username is unavailable. Choose another or sign in.",
  authTooManyAttempts: "Too many attempts. Please wait and try again later.",
  authUnavailable: "Cannot reach the account service. Please try again.",
  authHttpsRequired: "A secure HTTPS connection is required to sign in.",
  authForbidden: "This app address is not allowed by the account service.",
  authInvalidRequest: "The account request could not be processed.",
  authSignInRequired: "Please sign in to continue.",
  lawyerShowDetails: "Show details",
  lawyerHideDetails: "Hide details",
  lawyerTranslationFailed: "Could not translate organization details. Showing English; you can retry.",
  lawyerOrganizations: "Local legal help",
  lawyerCounties: "Counties served",
  lawyerServices: "Services",
  lawyerRepresentation: "Representation level",
  lawyerCaseStages: "Case stages",
  lawyerAddress: "Address",
  lawyerLanguages: "Languages",
  lawyerWebsite: "Website",
  lawyerPhone: "Phone",
  lawyerEmail: "Email",
  lawyerNotProvided: "Not provided",
  lawyerContactFailed: "Could not open this contact link. Please try again.",
  condensedEnglishEdits: "Editing the English source. Changes entered in another language are translated to English before saving. Downloads are always in English.",
  condensedSaving: "Saving in English...",
  condensedSaveFailed: "Could not save changes in English. Your draft is still here; please try again.",
  condensedTranslationFailed: "Could not translate the report. Showing the English version. The English download is still available.",
  retryTranslation: "Retry translation",
  preferredLanguage: "Preferred language",
  priorityChecklist: "Priority checklist",
  priorityChecklistHelp: "Earliest deadlines first. Check off a task when it is complete; tap again to undo.",
  priorityChecklistEmpty: "Tasks from your calendar deadlines will appear here when you upload your documents.",
  checklistDeadline: "Deadline",
  assistantDisclaimer: "I am not a professional and can make mistakes! Please check in with a licensed professional.",
  chatSubtitle: "Your housing assistance companion",
  assistantLabel: "EVICT WISE ASSISTANT",
  welcomeHeading: "How can I help with your case?",
  welcomeSubtitle: "Ask questions about your eviction notice, lease agreement, tenant rights, or upcoming deadlines.",
  suggestNotice: "Understand my eviction notice",
  suggestRights: "What are my tenant rights?",
  suggestCourt: "Help me prepare for court",
  followUpPlaceholder: "Ask a follow-up question...",
  composerDisclaimer: "Evict Wise can make mistakes. Verify important legal information.",
  copyResponse: "Copy response",
  copiedResponse: "Copied",
  copyFailed: "Could not copy. Please select and copy the response text.",

  title: "Messages",
  lightMode: "Light mode",
  darkMode: "Dark mode",
  switchToLightMode: "Switch to light mode",
  switchToDarkMode: "Switch to dark mode",
  menuChat: "Chat",
  menuDocuments: "Documents",
  menuProfile: "Profile",
  menuCalendar: "Calendar",
  menuLawyerConnect: "Lawyer Connect",
  lawyerConnectDescription: "Browse the supplied legal-help organizations below. Review their counties, services, and contact information. Contact an organization directly to confirm availability.",
  lawyerLegalAidDescription: "Search by city or address for a legal aid organization that helps with civil legal problems.",
  lawyerReferralDescription: "Explore lawyer referral services, free legal help, and state lawyer licensing resources.",
  lawyerReviewProfile: "Review your profile and case summary",
  lawyerOpenDirectory: "Open directory",
  lawyerLinkFailed: "Could not open the directory. Please try again.",
  calendarEventsFor: "Events for",
  calendarNoEvents: "You have nothing for this day!",
  calendarFromEviction: "From eviction notice",
  calendarFromLease: "From lease agreement",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  language: "Language",
  conversation: "Conversation",
  messagePlaceholder: "Type your message...",
  legalSources: "Legal sources (original text)",
  sourcePage: "Page",
  sourcePassage: "Passage",
  send: "Send",
  startConversation: "Start a conversation...",
  profileTitle: "Profile Page",
  yourInformation: "Your Information",
  editingMode: "(Editing Mode)",
  clickToEdit: "Click to edit",
  evictionNoticeLabel: "Eviction Notice:",
  leaseAgreementLabel: "Lease Agreement:",
  locationLabel: "Location:",
  caseDownloadTitle: "What would you like to download?",
  caseDownloadHelp: "Download the English case summary alone, or a ZIP with the summary first, followed by your eviction notice, lease agreement, and additional uploaded files.",
  caseDownloadSummary: "Case summary only",
  caseDownloadAll: "All case information (ZIP)",
  caseDownloadPreparing: "Preparing your download…",
  caseDownloadMissing: "An uploaded original could not be included. No ZIP was downloaded. Re-upload this file and try again, or download the case summary only:",
  caseDownloadFailed: "Could not prepare or save the download. Please try again, or choose case summary only.",
  condensedUserInfo: "Case summary",
  condensedInfoDescription: "This file updates automatically when your profile or chat conversation changes. Only new case-relevant details and evidence reported by you appear under Additional Info (from chatbox conversation). Review the extracted information before sharing. Missing details are marked Not provided.",
  editCondensedInfo: "Edit information",
  saveCondensedEdits: "Save changes",
  condensedEditHelp: "Your changes are saved locally and kept during automatic updates. Fields you leave unchanged continue to update automatically.",
  condensedName: "User Name",
  condensedHousing: "Housing Location/Type",
  condensedDeadlines: "Deadlines",
  condensedEvictionReason: "Legal reason for eviction",
  condensedAdditionalInfo: "Additional Info (from chatbox conversation)",
  generateUserInfo: "Generate file",
  generatingUserInfo: "Generating file...",
  downloadUserInfo: "Download / share file",
  userInfoFailed: "Could not generate or save the file. Please try again.",
  additionalInformation: "Additional information",
  additionalInformationHelp: "Upload supporting files of any type. No app-imposed count or size limit; available device storage still applies.",
  uploadAdditionalFiles: "Upload files",
  additionalFilesFailed: "Some files could not be saved. Check available storage and try again. Files already saved are still available.",
  documentNoPreview: "No preview is available for this file type. Download the original to open it.",
  viewDocument: "View",
  closeDocument: "Close",
  documentOpening: "Opening document...",
  downloadOriginalDocument: "Download original file",
  openOriginalDocument: "Open / share original",
  documentOriginalUnavailable: "The original file is unavailable. Showing extracted text. Re-upload the document to view its original layout.",
  documentFormats: "Upload a PDF or image (JPG, PNG, WebP), up to 20 MB.",
  documentUnsupportedFormat: "Choose a PDF, JPG, PNG, or WebP file.",
  documentTooLarge: "Choose a file smaller than 20 MB.",
  documentUnreadable: "Could not read the document. Try a clearer image or a PDF with selectable text.",
  documentUploading: "Uploading document...",
  documentUploadFailed: "Could not process the document. Please try again.",
  notUploaded: "Not uploaded",
  notSet: "Not set",
  doneEditing: "Done",
  editInformation: "Edit Information",
  uploadInformationToBegin: "Please upload information to begin planning",
  selectLocation: "Select Your Location",
  useCurrentLocation: "Use Current Location",
  enterManually: "Enter Manually",
  cityPlaceholder: "Enter your city...",
  confirmLocation: "Confirm Location:",
  cityLabel: "City:",
  stateLabel: "State:",
  countryLabel: "Country:",
  zipCodeLabel: "Zip Code:",
  back: "Back",
  confirm: "Confirm",
  locationPermissionDenied: "Permission to access location was denied",
  locationDetailsUnavailable: "Could not determine location details from coordinates.",
  locationFailed: "Failed to get location. Please try again.",
  locationSaved: "Location saved successfully!",
  translate: "Translate",
  selectLanguage: "Translate all messages to",
  cancel: "Cancel",
  showOriginal: "Show original",
  translating: "Translating...",
  translationFailed: "Translation failed.",
};

export function TranslationProvider({ children, initialLanguage }) {
  const dispatch = useDispatch();
  const savedLanguage = useSelector(state => state.app.preferredLanguage);
  const supported = code => LANGUAGES.some(item => item.code === code);
  const [legacyLanguage] = useState(() => readStorage("preferred-language"));
  const preference = supported(savedLanguage) ? savedLanguage
    : supported(initialLanguage) ? initialLanguage : supported(legacyLanguage) ? legacyLanguage : null;
  const language = preference || ORIGINAL_LANGUAGE;
  const [selection, setSelection] = useState(0);
  const conversationTranslation = useMemo(
    () => preference ? { language } : null,
    [preference, language, selection],
  );

  // Migrate the previous browser-only preference into the persisted profile.
  useEffect(() => {
    if (preference && savedLanguage !== preference) {
      dispatch(setPreferredLanguage(preference));
    }
  }, [dispatch, preference, savedLanguage]);

  const [interfaceText, setInterfaceText] = useState(
    ENGLISH_INTERFACE
  );

  const [interfaceLoading, setInterfaceLoading] =
    useState(false);

  const setLanguage = useCallback((nextLanguage) => {
    if (!LANGUAGES.some(item => item.code === nextLanguage)) return;
    dispatch(setPreferredLanguage(nextLanguage));
    writeStorage("preferred-language", nextLanguage);
    // A fresh selection lets users retry even when the language is unchanged.
    setSelection(value => value + 1);
  }, [dispatch]);

  const translateConversation = setLanguage;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
    setInterfaceLoading(false);

    if (language === ORIGINAL_LANGUAGE) {
      setInterfaceText(ENGLISH_INTERFACE);
      return;
    }

    const cacheKey = `interface-v42-${language}`;
    const cachedTranslation =
      readStorage(cacheKey);

    if (cachedTranslation) {
      try {
        setInterfaceText(
          JSON.parse(cachedTranslation)
        );
        return;
      } catch {
        // Ignore invalid cached data and request a fresh translation.
      }
    }

    let cancelled = false;

    async function translateInterface() {
      setInterfaceLoading(true);

      try {
        const entries = Object.entries(
          ENGLISH_INTERFACE
        );

        const translations = await translateTexts({
          texts: entries.map(([, value]) => value),
          targetLanguage: language,
          sourceLanguage: ORIGINAL_LANGUAGE,
        });

        const translatedInterface =
          Object.fromEntries(
            entries.map(([key], index) => [
              key,
              translations[index]?.translatedText ||
              ENGLISH_INTERFACE[key],
            ])
          );

        if (!cancelled) {
          setInterfaceText(translatedInterface);

          writeStorage(
            cacheKey,
            JSON.stringify(translatedInterface)
          );
        }
      } catch (error) {
        console.error(
          "Interface Translation failed:",
          error
        );

        if (!cancelled) {
          setInterfaceText(ENGLISH_INTERFACE);
        }
      } finally {
        if (!cancelled) {
          setInterfaceLoading(false);
        }
      }
    }

    translateInterface();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const t = useCallback(
    (key) => {
      return (
        interfaceText[key] ||
        ENGLISH_INTERFACE[key] ||
        key
      );
    },
    [interfaceText]
  );

  const translateMessage = useCallback(
    async (text, sourceLanguage = "auto", targetLanguage = language) => {
      if (
        sourceLanguage !== "auto" &&
        sourceLanguage === targetLanguage
      ) {
        return text;
      }

      return requestTextTranslation({
        text,
        targetLanguage,
        sourceLanguage,
      });
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      translateMessage,
      interfaceLoading,
      conversationTranslation,
      translateConversation,
    }),
    [
      language,
      setLanguage,
      t,
      translateMessage,
      interfaceLoading,
      conversationTranslation,
      translateConversation,
    ]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(
    TranslationContext
  );

  if (!context) {
    throw new Error(
      "useTranslation must be used inside TranslationProvider."
    );
  }

  return context;
}