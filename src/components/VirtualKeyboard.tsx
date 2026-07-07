import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Smile, Mic, Delete, RefreshCw, Clipboard, Check, Volume2, Search, ArrowRight, ShieldCheck } from 'lucide-react';
import { KeyboardSettings, CustomTheme, MLModelStats } from '../types';
import { assembleJamos, composeCheonjiinVowels, isVowel, STROKE_ADDITIONS, DOUBLE_CONSONANTS } from '../utils/hangul';
import { getAutocompleteSuggestions, predictNextWords, getSentenceCorrection } from '../utils/keyboardEngine';

interface VirtualKeyboardProps {
  settings: KeyboardSettings;
  setSettings: React.Dispatch<React.SetStateAction<KeyboardSettings>>;
  textValue: string;
  setTextValue: (val: string) => void;
  focusedInputId: string | null;
  clipboard: string[];
  addToClipboard: (text: string) => void;
  mlStats: MLModelStats;
  updateMLStats: (typedWord: string, prevWord: string) => void;
  incrementCorrections: () => void;
}

export default function VirtualKeyboard({
  settings,
  setSettings,
  textValue,
  setTextValue,
  focusedInputId,
  clipboard,
  addToClipboard,
  mlStats,
  updateMLStats,
  incrementCorrections
}: VirtualKeyboardProps) {
  const [isShifted, setIsShifted] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'ko' | 'en'>('ko');
  const [activeTab, setActiveTab] = useState<'keyboard' | 'emoji' | 'voice'>('keyboard');
  
  // Emoji tab categorization
  const [emojiCategory, setEmojiCategory] = useState<'faces' | 'animals' | 'objects' | 'symbols'>('faces');
  
  // Jamo composition buffers
  // For QWERTY Dubeolsik, we buffer the current word's Jamos
  const [koQwertyJamos, setKoQwertyJamos] = useState<string[]>([]);
  // For Cheonjiin, we track the state of composition
  const [cheonjiinJamos, setCheonjiinJamos] = useState<string[]>([]);
  // For Naratgul
  const [naratgulJamos, setNaratgulJamos] = useState<string[]>([]);
  
  // Feedback popup for pressed key (mobile design craft)
  const [activePopupKey, setActivePopupKey] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Voice Input states
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  
  // Suggestion correction state for the [수정] (Correct) mechanism
  const [correctionCandidate, setCorrectionCandidate] = useState<{ original: string; corrected: string; sentence: string } | null>(null);
  const [showCorrectionToast, setShowCorrectionToast] = useState(false);

  const theme = settings.customTheme;
  const isSecurityMode = settings.preventPasswordHints && focusedInputId?.toLowerCase().includes('password');

  // Load language settings
  useEffect(() => {
    if (settings.languages.ko && !settings.languages.en) {
      setCurrentLanguage('ko');
    } else if (!settings.languages.ko && settings.languages.en) {
      setCurrentLanguage('en');
    }
  }, [settings.languages]);

  // Track the typed sentences to suggest corrections
  useEffect(() => {
    if (isSecurityMode) {
      setCorrectionCandidate(null);
      return;
    }
    const candidate = getSentenceCorrection(textValue, currentLanguage === 'ko');
    setCorrectionCandidate(candidate);
  }, [textValue, currentLanguage, isSecurityMode]);

  // Reset composition buffers when language or layout changes
  useEffect(() => {
    commitComposition();
  }, [currentLanguage, settings.activeKoreanLayout]);

  // Auto-Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = currentLanguage === 'ko' ? 'ko-KR' : 'en-US';
      
      rec.onresult = (e: any) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            final += e.results[i][0].transcript;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        setVoiceTranscript(final || interim);
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [currentLanguage]);

  // Vibrate helper
  const triggerVibration = () => {
    if (settings.vibrateOnPress && navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  // Commit current composition to final text
  const commitComposition = () => {
    setKoQwertyJamos([]);
    setCheonjiinJamos([]);
    setNaratgulJamos([]);
  };

  // Insert a text string at current position
  const insertText = (str: string) => {
    triggerVibration();
    setTextValue(textValue + str);
  };

  // Backspace key
  const handleBackspace = () => {
    triggerVibration();
    
    // Check if we have active Hangul Jamo buffers first
    if (currentLanguage === 'ko') {
      if (settings.activeKoreanLayout === 'qwerty' && koQwertyJamos.length > 0) {
        const nextJamos = koQwertyJamos.slice(0, -1);
        setKoQwertyJamos(nextJamos);
        
        // Replace the last composing word in the textValue
        const currentWordComposed = assembleJamos(koQwertyJamos);
        const nextWordComposed = assembleJamos(nextJamos);
        
        if (textValue.endsWith(currentWordComposed)) {
          setTextValue(textValue.slice(0, -currentWordComposed.length) + nextWordComposed);
        }
        return;
      }
      
      if (settings.activeKoreanLayout === 'cheonjiin' && cheonjiinJamos.length > 0) {
        const nextJamos = cheonjiinJamos.slice(0, -1);
        setCheonjiinJamos(nextJamos);
        const currentComposed = assembleJamos(cheonjiinJamos);
        const nextComposed = assembleJamos(nextJamos);
        if (textValue.endsWith(currentComposed)) {
          setTextValue(textValue.slice(0, -currentComposed.length) + nextComposed);
        }
        return;
      }

      if (settings.activeKoreanLayout === 'naratgul' && naratgulJamos.length > 0) {
        const nextJamos = naratgulJamos.slice(0, -1);
        setNaratgulJamos(nextJamos);
        const currentComposed = assembleJamos(naratgulJamos);
        const nextComposed = assembleJamos(nextJamos);
        if (textValue.endsWith(currentComposed)) {
          setTextValue(textValue.slice(0, -currentComposed.length) + nextComposed);
        }
        return;
      }
    }

    // Default backspace (removes last char)
    if (textValue.length > 0) {
      setTextValue(textValue.slice(0, -1));
    }
  };

  // Space key
  const handleSpace = () => {
    triggerVibration();
    
    // Extract the last typed word to update machine learning stats
    const words = textValue.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const prevWord = words[words.length - 2] || '';
    
    // Commit composition
    commitComposition();
    
    if (lastWord && !isSecurityMode) {
      updateMLStats(lastWord, prevWord);
    }
    
    setTextValue(textValue + ' ');
  };

  // Enter key
  const handleEnter = () => {
    triggerVibration();
    
    // If there is an active correction candidate, let's auto-correct on Enter!
    if (correctionCandidate) {
      applySentenceCorrection();
    } else {
      commitComposition();
      setTextValue(textValue + '\n');
    }
  };

  // Handle QWERTY Key taps
  const handleQwertyKey = (char: string, e: React.MouseEvent<HTMLButtonElement>) => {
    triggerVibration();
    
    // Show premium visual key preview popup
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPosition({ x: rect.left + rect.width / 2, y: rect.top - 20 });
    setActivePopupKey(char);
    setTimeout(() => {
      setActivePopupKey(null);
    }, 150);

    if (currentLanguage === 'en') {
      const letter = isShifted ? char.toUpperCase() : char.toLowerCase();
      insertText(letter);
      setIsShifted(false);
    } else {
      // Korean QWERTY layout input mapping
      let inputChar = char;
      if (isShifted) {
        // Handle shifted Korean keys (ㅃ, ㅉ, ㄸ, ㄲ, ㅆ, ㅒ, ㅖ)
        const shiftKoMap: Record<string, string> = {
          'ㅂ': 'ㅃ', 'ㅈ': 'ㅉ', 'ㄷ': 'ㄸ', 'ㄱ': 'ㄲ', 'ㅅ': 'ㅆ',
          'ㅐ': 'ㅒ', 'ㅔ': 'ㅖ'
        };
        inputChar = shiftKoMap[char] || char;
        setIsShifted(false);
      }
      
      const newJamos = [...koQwertyJamos, inputChar];
      setKoQwertyJamos(newJamos);
      
      // Update textValue: replace previous composing state with new composing state
      const prevComposed = assembleJamos(koQwertyJamos);
      const newComposed = assembleJamos(newJamos);
      
      if (textValue.endsWith(prevComposed)) {
        setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
      } else {
        setTextValue(textValue + newComposed);
      }
    }
  };

  // Handle Cheonjiin Vowel combinations
  const processCheonjiinVowelInput = (vowelKey: string) => {
    // Collect the vowel input key
    const newJamos = [...cheonjiinJamos, vowelKey];
    setCheonjiinJamos(newJamos);
    
    const prevComposed = assembleJamos(cheonjiinJamos);
    const newComposed = assembleJamos(newJamos);
    
    if (textValue.endsWith(prevComposed)) {
      setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
    } else {
      setTextValue(textValue + newComposed);
    }
  };

  // Handle Cheonjiin Consonants
  const processCheonjiinConsonantInput = (baseConsonants: string[]) => {
    // If the last jamo is from the same group, cycle them!
    // Example: click 'ㄱㅋ' -> 'ㄱ'. click again -> 'ㅋ'. click again -> 'ㄲ'.
    let newJamos = [...cheonjiinJamos];
    
    if (newJamos.length > 0) {
      const last = newJamos[newJamos.length - 1];
      const matchIndex = baseConsonants.indexOf(last);
      
      if (matchIndex !== -1) {
        // Cycle to the next consonant in the group
        const nextIndex = (matchIndex + 1) % baseConsonants.length;
        newJamos[newJamos.length - 1] = baseConsonants[nextIndex];
        setCheonjiinJamos(newJamos);
        
        const prevComposed = assembleJamos(cheonjiinJamos);
        const newComposed = assembleJamos(newJamos);
        if (textValue.endsWith(prevComposed)) {
          setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
        }
        return;
      }
    }
    
    // Add new consonant
    newJamos.push(baseConsonants[0]);
    setCheonjiinJamos(newJamos);
    
    const prevComposed = assembleJamos(cheonjiinJamos);
    const newComposed = assembleJamos(newJamos);
    if (textValue.endsWith(prevComposed)) {
      setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
    } else {
      setTextValue(textValue + newComposed);
    }
  };

  // Cheonjiin functional keys
  const handleCheonjiinStrokeAddition = () => {
    triggerVibration();
    if (cheonjiinJamos.length === 0) return;
    
    let nextJamos = [...cheonjiinJamos];
    const lastIdx = nextJamos.length - 1;
    const lastJamo = nextJamos[lastIdx];
    
    // Check if stroke can be added
    if (STROKE_ADDITIONS[lastJamo]) {
      nextJamos[lastIdx] = STROKE_ADDITIONS[lastJamo];
      setCheonjiinJamos(nextJamos);
      
      const prevComposed = assembleJamos(cheonjiinJamos);
      const newComposed = assembleJamos(nextJamos);
      if (textValue.endsWith(prevComposed)) {
        setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
      }
    }
  };

  const handleCheonjiinDoubleConsonant = () => {
    triggerVibration();
    if (cheonjiinJamos.length === 0) return;
    
    let nextJamos = [...cheonjiinJamos];
    const lastIdx = nextJamos.length - 1;
    const lastJamo = nextJamos[lastIdx];
    
    if (DOUBLE_CONSONANTS[lastJamo]) {
      nextJamos[lastIdx] = DOUBLE_CONSONANTS[lastJamo];
      setCheonjiinJamos(nextJamos);
      
      const prevComposed = assembleJamos(cheonjiinJamos);
      const newComposed = assembleJamos(nextJamos);
      if (textValue.endsWith(prevComposed)) {
        setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
      }
    }
  };

  // Handle Naratgul Inputs
  const handleNaratgulKey = (char: string) => {
    triggerVibration();
    let nextJamos = [...naratgulJamos, char];
    setNaratgulJamos(nextJamos);
    
    const prevComposed = assembleJamos(naratgulJamos);
    const newComposed = assembleJamos(nextJamos);
    
    if (textValue.endsWith(prevComposed)) {
      setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
    } else {
      setTextValue(textValue + newComposed);
    }
  };

  const handleNaratgulStrokeAddition = () => {
    triggerVibration();
    if (naratgulJamos.length === 0) return;
    
    let nextJamos = [...naratgulJamos];
    const lastIdx = nextJamos.length - 1;
    const lastJamo = nextJamos[lastIdx];
    
    if (STROKE_ADDITIONS[lastJamo]) {
      nextJamos[lastIdx] = STROKE_ADDITIONS[lastJamo];
      setNaratgulJamos(nextJamos);
      
      const prevComposed = assembleJamos(naratgulJamos);
      const newComposed = assembleJamos(nextJamos);
      if (textValue.endsWith(prevComposed)) {
        setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
      }
    }
  };

  const handleNaratgulDoubleConsonant = () => {
    triggerVibration();
    if (naratgulJamos.length === 0) return;
    
    let nextJamos = [...naratgulJamos];
    const lastIdx = nextJamos.length - 1;
    const lastJamo = nextJamos[lastIdx];
    
    if (DOUBLE_CONSONANTS[lastJamo]) {
      nextJamos[lastIdx] = DOUBLE_CONSONANTS[lastJamo];
      setNaratgulJamos(nextJamos);
      
      const prevComposed = assembleJamos(naratgulJamos);
      const newComposed = assembleJamos(nextJamos);
      if (textValue.endsWith(prevComposed)) {
        setTextValue(textValue.slice(0, -prevComposed.length) + newComposed);
      }
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    triggerVibration();
    
    // Find the last composing word or last token in textValue
    const words = textValue.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    
    // Commit composition state
    commitComposition();
    
    // Replace the active prefix with the suggestion
    if (textValue.endsWith(lastWord)) {
      const preceding = textValue.slice(0, -lastWord.length);
      setTextValue(preceding + suggestion + ' ');
    } else {
      setTextValue(textValue + suggestion + ' ');
    }
    
    // ML update
    if (!isSecurityMode) {
      updateMLStats(suggestion, words[words.length - 2] || '');
    }
  };

  // Apply corrected sentence
  const applySentenceCorrection = () => {
    if (!correctionCandidate) return;
    setTextValue(correctionCandidate.sentence);
    incrementCorrections();
    setCorrectionCandidate(null);
    setShowCorrectionToast(true);
    setTimeout(() => {
      setShowCorrectionToast(false);
    }, 2500);
  };

  // Start Voice recognition
  const toggleVoiceListening = () => {
    triggerVibration();
    if (!recognitionRef.current) {
      // Simulation mode
      if (!isListening) {
        setIsListening(true);
        setVoiceTranscript('인식 중...');
        setTimeout(() => {
          setVoiceTranscript(currentLanguage === 'ko' ? '안녕하세요 맞춤법 자동 추천 키보드입니다' : 'hello this is a custom keyboard');
        }, 1200);
        setTimeout(() => {
          setIsListening(false);
        }, 2500);
      } else {
        setIsListening(false);
      }
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setVoiceTranscript('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const commitVoiceInput = () => {
    if (voiceTranscript && voiceTranscript !== '인식 중...') {
      insertText(voiceTranscript);
      setVoiceTranscript('');
      setActiveTab('keyboard');
    }
  };

  // Generate layouts keyboard key row list
  const getQwertyRow = (rowNum: number): string[] => {
    const rowsKo = [
      ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'],
      ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'],
      ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ']
    ];
    
    const rowsEn = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];

    const currentMap = currentLanguage === 'ko' ? rowsKo : rowsEn;
    return currentMap[rowNum - 1];
  };

  // Key Styling Helper based on Settings (Shape & Themes)
  const getKeyShapeClass = () => {
    switch (theme.keyShape) {
      case 'round': return 'rounded-full';
      case 'pill': return 'rounded-3xl';
      case 'square': return 'rounded-none';
      case 'rectangular': return 'rounded-md';
      case 'borderless': return 'rounded-none border-transparent bg-transparent shadow-none';
      default: return 'rounded-lg';
    }
  };

  // Compile active suggestions list for suggestion bar
  const getSuggestions = (): string[] => {
    if (isSecurityMode) return [];
    
    // Find last typed token
    const words = textValue.split(/\s+/);
    const currentWord = words[words.length - 1] || '';
    
    if (currentWord) {
      // Suggest autocomplete
      return getAutocompleteSuggestions(currentWord, currentLanguage === 'ko', mlStats);
    } else {
      // Suggest next-word prediction based on previous word
      const lastWord = words[words.length - 2] || '';
      return predictNextWords(lastWord, currentLanguage === 'ko', mlStats);
    }
  };

  const currentSuggestions = getSuggestions();

  return (
    <div 
      className="select-none flex flex-col justify-end w-full relative"
      style={{
        height: `${settings.keyboardHeight}px`,
        backgroundColor: theme.isDark ? '#121214' : '#F1F3F5',
        fontFamily: settings.fontFamily,
        borderTop: theme.isDark ? '1px solid #2D3139' : '1px solid #E2E8F0',
      }}
      id="custom-virtual-keyboard"
    >
      {/* 1. Keyboard Preview Popup (Visual feedback) */}
      <AnimatePresence>
        {activePopupKey && popupPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1.2, y: -25 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute z-50 px-4 py-2 text-xl font-bold bg-white text-black rounded-lg shadow-xl border border-gray-200 pointer-events-none transform -translate-x-1/2"
            style={{
              left: popupPosition.x - (document.getElementById('custom-virtual-keyboard')?.getBoundingClientRect().left || 0),
              top: popupPosition.y - (document.getElementById('custom-virtual-keyboard')?.getBoundingClientRect().top || 0) - 20,
            }}
          >
            {activePopupKey}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Suggestion Bar (추천 바) */}
      <div 
        className="flex items-center justify-between px-2 h-10 border-b overflow-x-auto text-xs font-medium"
        style={{
          backgroundColor: theme.isDark ? '#1E1E22' : '#E9ECEF',
          borderColor: theme.isDark ? '#2D3139' : '#DEE2E6',
        }}
      >
        {isSecurityMode ? (
          <div className="flex items-center gap-1.5 px-3 py-1 text-red-500 font-bold mx-auto">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>보안 입력 모드 (비밀번호 입력 힌트 방지)</span>
          </div>
        ) : (
          <div className="flex items-center justify-around w-full divide-x divide-opacity-30 divide-gray-500 overflow-x-auto">
            {/* Clipboard Bar Overlay */}
            {clipboard.length > 0 && (
              <button
                onClick={() => handleSuggestionClick(clipboard[0])}
                className="flex items-center gap-1 px-2.5 py-1 text-sky-500 bg-sky-500/10 hover:bg-sky-500/20 rounded-full shrink-0 transition"
              >
                <Clipboard className="w-3 h-3" />
                <span className="truncate max-w-[80px] font-semibold">{clipboard[0]}</span>
              </button>
            )}

            {/* Main Suggestions */}
            {currentSuggestions.length > 0 ? (
              currentSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1 font-bold text-center flex-1 truncate transition active:scale-95"
                  style={{ color: theme.isDark ? '#E2E8F0' : '#2D3748' }}
                >
                  {suggestion}
                </button>
              ))
            ) : (
              <span className="text-gray-500 text-[11px] italic text-center w-full">추천 단어가 없습니다</span>
            )}

            {/* [수정] Correct Key suggestion bubble */}
            {correctionCandidate && (
              <button
                onClick={applySentenceCorrection}
                className="flex items-center gap-1.5 px-2.5 py-1 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 rounded-full font-bold ml-1 shrink-0 animate-pulse border border-amber-500/30"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="text-[10px]">수정: {correctionCandidate.original}→{correctionCandidate.corrected}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Keyboard Main Tab Area */}
      <div className="p-1.5 flex flex-col justify-between flex-1 overflow-hidden" style={{ color: theme.keyTextColor }}>
        
        {/* TAB 1: Standby Character Keyboard */}
        {activeTab === 'keyboard' && (
          <div className="flex flex-col justify-between h-full gap-1">
            
            {/* 3A. QWERTY / Standard Rows */}
            {(currentLanguage === 'en' || settings.activeKoreanLayout === 'qwerty') ? (
              <>
                {/* QWERTY Row 1 */}
                <div className="flex justify-center w-full gap-1">
                  {getQwertyRow(1).map((char) => (
                    <button
                      key={char}
                      onClick={(e) => handleQwertyKey(char, e)}
                      className={`flex-1 h-10 flex items-center justify-center font-bold text-sm shadow-sm transition active:scale-90 ${getKeyShapeClass()}`}
                      style={{
                        backgroundColor: theme.keyBgColor,
                        fontSize: `${settings.fontSize}px`
                      }}
                    >
                      {isShifted && currentLanguage === 'en' ? char.toUpperCase() : char}
                    </button>
                  ))}
                </div>

                {/* QWERTY Row 2 */}
                <div className="flex justify-center w-full gap-1 px-[3%]">
                  {getQwertyRow(2).map((char) => (
                    <button
                      key={char}
                      onClick={(e) => handleQwertyKey(char, e)}
                      className={`flex-1 h-10 flex items-center justify-center font-bold text-sm shadow-sm transition active:scale-90 ${getKeyShapeClass()}`}
                      style={{
                        backgroundColor: theme.keyBgColor,
                        fontSize: `${settings.fontSize}px`
                      }}
                    >
                      {isShifted && currentLanguage === 'en' ? char.toUpperCase() : char}
                    </button>
                  ))}
                </div>

                {/* QWERTY Row 3 */}
                <div className="flex justify-center w-full gap-1">
                  {/* Shift toggle */}
                  <button
                    onClick={() => { triggerVibration(); setIsShifted(!isShifted); }}
                    className={`px-3.5 h-10 flex items-center justify-center font-bold text-xs shadow-sm transition active:scale-90 ${getKeyShapeClass()}`}
                    style={{
                      backgroundColor: isShifted ? theme.accentColor : theme.keyBgColor,
                      color: isShifted ? '#fff' : theme.keyTextColor
                    }}
                  >
                    ↑
                  </button>

                  {getQwertyRow(3).map((char) => (
                    <button
                      key={char}
                      onClick={(e) => handleQwertyKey(char, e)}
                      className={`flex-1 h-10 flex items-center justify-center font-bold text-sm shadow-sm transition active:scale-90 ${getKeyShapeClass()}`}
                      style={{
                        backgroundColor: theme.keyBgColor,
                        fontSize: `${settings.fontSize}px`
                      }}
                    >
                      {isShifted && currentLanguage === 'en' ? char.toUpperCase() : char}
                    </button>
                  ))}

                  {/* Backspace */}
                  <button
                    onClick={handleBackspace}
                    className={`px-3 h-10 flex items-center justify-center font-bold shadow-sm transition active:scale-90 ${getKeyShapeClass()}`}
                    style={{ backgroundColor: theme.keyBgColor }}
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : settings.activeKoreanLayout === 'cheonjiin' ? (
              /* 3B. CHEONJIIN Layout Grid (천지인) */
              <div className="grid grid-cols-3 gap-1 flex-1 max-h-[170px]">
                {/* Row 1: Vowels */}
                <button
                  onClick={() => { triggerVibration(); processCheonjiinVowelInput('ㅣ'); }}
                  className={`h-[34px] flex items-center justify-center font-extrabold text-base shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅣ
                </button>
                <button
                  onClick={() => { triggerVibration(); processCheonjiinVowelInput('·'); }}
                  className={`h-[34px] flex items-center justify-center font-extrabold text-lg shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ·
                </button>
                <button
                  onClick={() => { triggerVibration(); processCheonjiinVowelInput('ㅡ'); }}
                  className={`h-[34px] flex items-center justify-center font-extrabold text-base shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅡ
                </button>

                {/* Row 2: ㄱㅋ, ㄴㄹ, ㄷㅌ */}
                <button
                  onClick={() => { triggerVibration(); processCheonjiinConsonantInput(['ㄱ', 'ㅋ', 'ㄲ']); }}
                  className={`h-[34px] flex flex-col items-center justify-center shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  <span className="font-bold text-sm">ㄱㅋ</span>
                  <span className="text-[9px] opacity-40">ㄲ</span>
                </button>
                <button
                  onClick={() => { triggerVibration(); processCheonjiinConsonantInput(['ㄴ', 'ㄹ']); }}
                  className={`h-[34px] flex flex-col items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㄴㄹ
                </button>
                <button
                  onClick={() => { triggerVibration(); processCheonjiinConsonantInput(['ㄷ', 'ㅌ', 'ㄸ']); }}
                  className={`h-[34px] flex flex-col items-center justify-center shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  <span className="font-bold text-sm">ㄷㅌ</span>
                  <span className="text-[9px] opacity-40">ㄸ</span>
                </button>

                {/* Row 3: ㅂㅍ, ㅅㅎ, ㅈㅊ */}
                <button
                  onClick={() => { triggerVibration(); processCheonjiinConsonantInput(['ㅂ', 'ㅍ', 'ㅃ']); }}
                  className={`h-[34px] flex flex-col items-center justify-center shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  <span className="font-bold text-sm">ㅂㅍ</span>
                  <span className="text-[9px] opacity-40">ㅃ</span>
                </button>
                <button
                  onClick={() => { triggerVibration(); processCheonjiinConsonantInput(['ㅅ', 'ㅎ', 'ㅆ']); }}
                  className={`h-[34px] flex flex-col items-center justify-center shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  <span className="font-bold text-sm">ㅅㅎ</span>
                  <span className="text-[9px] opacity-40">ㅆ</span>
                </button>
                <button
                  onClick={() => { triggerVibration(); processCheonjiinConsonantInput(['ㅈ', 'ㅊ', 'ㅉ']); }}
                  className={`h-[34px] flex flex-col items-center justify-center shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  <span className="font-bold text-sm">ㅈㅊ</span>
                  <span className="text-[9px] opacity-40">ㅉ</span>
                </button>

                {/* Row 4: 획추가, ㅇㅁ, 쌍자음 */}
                <button
                  onClick={handleCheonjiinStrokeAddition}
                  className={`h-[34px] flex items-center justify-center font-bold text-xs shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor, color: theme.accentColor }}
                >
                  획추가
                </button>
                <button
                  onClick={() => { triggerVibration(); processCheonjiinConsonantInput(['ㅇ', 'ㅁ']); }}
                  className={`h-[34px] flex flex-col items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅇㅁ
                </button>
                <button
                  onClick={handleCheonjiinDoubleConsonant}
                  className={`h-[34px] flex items-center justify-center font-bold text-xs shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor, color: theme.accentColor }}
                >
                  쌍자음
                </button>
              </div>
            ) : (
              /* 3C. NARATGUL Layout Grid (나랏글) */
              <div className="grid grid-cols-5 gap-1 flex-1 max-h-[170px]">
                {/* Consonants Row 1 */}
                <button
                  onClick={() => handleNaratgulKey('ㄱ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㄱ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㄴ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㄴ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㄷ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㄷ
                </button>
                {/* Vowels Row 1 */}
                <button
                  onClick={() => handleNaratgulKey('ㅏ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅏ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅓ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅓ
                </button>

                {/* Row 2 */}
                <button
                  onClick={() => handleNaratgulKey('ㄹ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㄹ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅁ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅁ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅅ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅅ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅗ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅗ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅜ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅜ
                </button>

                {/* Row 3 */}
                <button
                  onClick={() => handleNaratgulKey('ㅇ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅇ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅈ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅈ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅊ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅊ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅡ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅡ
                </button>
                <button
                  onClick={() => handleNaratgulKey('ㅣ')}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  ㅣ
                </button>

                {/* Row 4: Controls */}
                <button
                  onClick={handleNaratgulStrokeAddition}
                  className={`h-9 flex items-center justify-center font-bold text-xs shadow-sm active:scale-95 ${getKeyShapeClass()} col-span-2`}
                  style={{ backgroundColor: theme.keyBgColor, color: theme.accentColor }}
                >
                  획추가 (+1 Stroke)
                </button>
                <button
                  onClick={handleNaratgulDoubleConsonant}
                  className={`h-9 flex items-center justify-center font-bold text-xs shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor, color: theme.accentColor }}
                >
                  쌍자음
                </button>
                <button
                  onClick={handleBackspace}
                  className={`h-9 flex items-center justify-center font-bold text-sm shadow-sm active:scale-95 ${getKeyShapeClass()} col-span-2`}
                  style={{ backgroundColor: theme.keyBgColor }}
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 3D. Common Bottom Toolbar Key Row */}
            <div className="flex justify-between w-full gap-1">
              {/* Special Tab Toggle !?☺ */}
              <button
                onClick={() => { triggerVibration(); setActiveTab('emoji'); }}
                className={`px-3 h-10 flex items-center justify-center font-bold text-xs shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                style={{ backgroundColor: theme.keyBgColor }}
              >
                !?☺
              </button>

              {/* Language Switch Globe */}
              {settings.languages.ko && settings.languages.en && (
                <button
                  onClick={() => { triggerVibration(); setCurrentLanguage(currentLanguage === 'ko' ? 'en' : 'ko'); }}
                  className={`px-3.5 h-10 flex items-center justify-center font-bold text-xs shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                  style={{ backgroundColor: theme.keyBgColor, color: theme.accentColor }}
                >
                  <Globe className="w-4 h-4 mr-0.5" />
                  <span>{currentLanguage === 'ko' ? '한' : 'EN'}</span>
                </button>
              )}

              {/* Space Key */}
              <button
                onClick={handleSpace}
                className={`flex-1 h-10 flex items-center justify-center text-xs font-semibold shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                style={{ backgroundColor: theme.keyBgColor }}
              >
                {currentLanguage === 'ko' ? '스페이스' : 'Space'}
              </button>

              {/* Microphone Key */}
              <button
                onClick={() => { triggerVibration(); setActiveTab('voice'); }}
                className={`px-3.5 h-10 flex items-center justify-center shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                style={{ backgroundColor: theme.keyBgColor }}
              >
                <Mic className="w-4 h-4 text-sky-500" />
              </button>

              {/* Auto-Correction [수정] button */}
              <button
                onClick={() => { triggerVibration(); applySentenceCorrection(); }}
                disabled={!correctionCandidate}
                className={`px-3 h-10 flex items-center justify-center text-[10px] font-extrabold shadow-sm active:scale-95 ${getKeyShapeClass()}`}
                style={{
                  backgroundColor: correctionCandidate ? 'rgba(245, 158, 11, 0.2)' : theme.keyBgColor,
                  color: correctionCandidate ? '#F59E0B' : 'gray',
                  border: correctionCandidate ? '1px solid #F59E0B' : '1px solid transparent'
                }}
              >
                수정
              </button>

              {/* Enter / Action Button */}
              <button
                onClick={handleEnter}
                className={`px-5 h-10 flex items-center justify-center text-xs font-bold text-white shadow-md active:scale-95 ${getKeyShapeClass()}`}
                style={{ backgroundColor: theme.accentColor }}
              >
                Enter
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Emoji & Special characters Pane */}
        {activeTab === 'emoji' && (
          <div className="flex flex-col h-full justify-between gap-1.5 p-1">
            {/* Category tabs */}
            <div className="flex items-center gap-1 border-b border-gray-700/20 pb-1">
              <button
                onClick={() => setEmojiCategory('faces')}
                className={`flex-1 py-1 text-center text-xs rounded transition ${emojiCategory === 'faces' ? 'bg-sky-500/20 text-sky-500 font-bold' : 'opacity-60'}`}
              >
                ☺ 얼굴
              </button>
              <button
                onClick={() => setEmojiCategory('animals')}
                className={`flex-1 py-1 text-center text-xs rounded transition ${emojiCategory === 'animals' ? 'bg-sky-500/20 text-sky-500 font-bold' : 'opacity-60'}`}
              >
                🐱 동물
              </button>
              <button
                onClick={() => setEmojiCategory('objects')}
                className={`flex-1 py-1 text-center text-xs rounded transition ${emojiCategory === 'objects' ? 'bg-sky-500/20 text-sky-500 font-bold' : 'opacity-60'}`}
              >
                ✈ 사물
              </button>
              <button
                onClick={() => setEmojiCategory('symbols')}
                className={`flex-1 py-1 text-center text-xs rounded transition ${emojiCategory === 'symbols' ? 'bg-sky-500/20 text-sky-500 font-bold' : 'opacity-60'}`}
              >
                !#% 기호
              </button>
            </div>

            {/* Emoji Grid list */}
            <div className="grid grid-cols-7 gap-1 overflow-y-auto h-[100px] py-1 text-center text-lg content-start">
              {emojiCategory === 'faces' && ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓'].map(em => (
                <button key={em} onClick={() => insertText(em)} className="p-1 hover:bg-gray-500/10 rounded active:scale-90">{em}</button>
              ))}
              {emojiCategory === 'animals' && ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑'].map(em => (
                <button key={em} onClick={() => insertText(em)} className="p-1 hover:bg-gray-500/10 rounded active:scale-90">{em}</button>
              ))}
              {emojiCategory === 'objects' && ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🚲', '🛴', '🏍', '🛵', '🛫', '✈', '🚁', '🛰', '🚀', '🛸', '⏰', '📱', '💻', '📷', '🎥'].map(em => (
                <button key={em} onClick={() => insertText(em)} className="p-1 hover:bg-gray-500/10 rounded active:scale-90">{em}</button>
              ))}
              {emojiCategory === 'symbols' && ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=', '-', '{', '}', '[', ']', ';', ':', '"', "'", '<', '>', ',', '.', '?', '/'].map(em => (
                <button key={em} onClick={() => insertText(em)} className="p-1 hover:bg-gray-500/10 rounded active:scale-90">{em}</button>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-1.5 mt-auto">
              <button
                onClick={() => { triggerVibration(); setActiveTab('keyboard'); }}
                className={`flex-1 py-1.5 text-xs text-center font-bold bg-gray-500/20 rounded active:scale-95`}
              >
                키보드로 돌아가기
              </button>
              <button
                onClick={handleBackspace}
                className="px-4 py-1.5 bg-gray-500/20 rounded active:scale-95"
              >
                <Delete className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Voice input screen */}
        {activeTab === 'voice' && (
          <div className="flex flex-col h-full justify-between items-center p-2">
            <div className="flex flex-col items-center gap-1 w-full flex-1 justify-center">
              
              {/* Mic Icon & Wave Pulsing (Microphone interface) */}
              <div className="relative flex items-center justify-center">
                {isListening && (
                  <motion.div
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute w-12 h-12 bg-sky-500/20 rounded-full"
                  />
                )}
                <button
                  onClick={toggleVoiceListening}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-md ${isListening ? 'bg-red-500 text-white' : 'bg-sky-500 text-white'}`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              <span className="text-[10px] font-bold mt-1" style={{ color: isListening ? '#EF4444' : '#0EA5E9' }}>
                {isListening ? '말씀하세요... (음성 인식 중)' : '마이크를 눌러 말하기'}
              </span>

              {/* Transcription Result display */}
              <div 
                className="w-full text-center px-4 py-1.5 rounded text-xs font-semibold h-[42px] overflow-y-auto mt-1 max-w-[240px]"
                style={{ backgroundColor: theme.isDark ? '#1C1C1F' : '#E9ECEF' }}
              >
                {voiceTranscript ? (
                  <span className={theme.isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{voiceTranscript}</span>
                ) : (
                  <span className="text-gray-400 italic">아래 마이크를 켠 뒤 이야기를 시작하세요.</span>
                )}
              </div>
            </div>

            {/* Voice Input Bottom Options */}
            <div className="flex items-center gap-2 w-full mt-auto">
              <button
                onClick={() => { triggerVibration(); setIsListening(false); setActiveTab('keyboard'); }}
                className="flex-1 py-1.5 text-xs font-bold text-center bg-gray-500/10 border border-gray-500/20 rounded active:scale-95"
              >
                취소
              </button>
              
              <button
                onClick={commitVoiceInput}
                disabled={!voiceTranscript || voiceTranscript === '인식 중...'}
                className="flex-1 py-1.5 text-xs font-bold text-center text-white rounded active:scale-95 disabled:opacity-40"
                style={{ backgroundColor: theme.accentColor }}
              >
                텍스트 삽입
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating auto-correct Toast notification */}
      <AnimatePresence>
        {showCorrectionToast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 z-50 pointer-events-none"
          >
            <Check className="w-3.5 h-3.5" />
            <span>오타가 자동으로 수정되었습니다!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
