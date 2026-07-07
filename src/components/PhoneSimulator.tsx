import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, FileText, Globe, Lock, Send, Wifi, Battery, Smartphone,
  Menu, ChevronLeft, Volume2, Search, Play, HelpCircle, ArrowRight, ShieldAlert,
  FolderMinus, CheckSquare, Sparkles, LogIn, ExternalLink
} from 'lucide-react';
import { ActiveApp, KeyboardSettings, ChatMessage } from '../types';

interface PhoneSimulatorProps {
  settings: KeyboardSettings;
  textValue: string;
  setTextValue: (val: string) => void;
  activeApp: ActiveApp;
  setActiveApp: (app: ActiveApp) => void;
  focusedInputId: string | null;
  setFocusedInputId: (id: string | null) => void;
  children: React.ReactNode; // Renders the keyboard inside the phone
  cannedPhrases: string[];
  addToClipboard: (text: string) => void;
  onLaunchExternalApp: (appName: string) => void;
}

export default function PhoneSimulator({
  settings,
  textValue,
  setTextValue,
  activeApp,
  setActiveApp,
  focusedInputId,
  setFocusedInputId,
  children,
  cannedPhrases,
  addToClipboard,
  onLaunchExternalApp
}: PhoneSimulatorProps) {
  
  // Simulated clock for top bar
  const [phoneTime, setPhoneTime] = useState('10:18');
  
  // Messages App Chat log
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'minji', text: '안녕! 오늘 약속 몇 시에 볼래?', timestamp: '오후 6:12' },
    { id: '2', sender: 'user', text: '나는 저녁 7시쯤이 좋을 것 같아! 😀', timestamp: '오후 6:13' },
    { id: '3', sender: 'minji', text: '오 좋은데? 맞춤법 맞나 보려고 키보드 테스트해보고 있어? ㅋㅋㅋ', timestamp: '오후 6:15' }
  ]);

  // Browser suggestions
  const browserQueries = [
    '맞춤법 검사기 한국어',
    '천지인 자판 빠르게 쓰는 법',
    '나랏글 자판 획추가 규칙',
    '안드로이드 커스텀 키보드 추천',
    'AI 스마트 추천 시스템 원리'
  ];

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hrs = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;
      setPhoneTime(`${hrs}:${mins} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Send in Messages App
  const handleSendMessage = () => {
    if (!textValue.trim()) return;
    
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textValue,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
    };

    setMessages([...messages, newMsg]);
    setTextValue('');
    
    // Simulate auto-reply from Minji to show typing interactions
    setTimeout(() => {
      const replies = [
        '와 진짜 편하다! 키보드 타이핑 반응도 대박이네 👍',
        '나랏글이랑 천지인도 다 지원하는구나!',
        '오타 수정 기능도 완전 신기해!',
        '상용구 기능도 써봤는데 진짜 편함 ㅋㅋㅋ'
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'minji',
        text: randomReply,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
      }]);
    }, 1500);
  };

  // Click canned phrase inside phone suggestions
  const handleSelectPhrase = (phrase: string) => {
    setTextValue(textValue + phrase);
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 select-none">
      
      {/* Dynamic Smartphone Shell */}
      <div 
        className="relative bg-slate-900 border-[12px] border-slate-950 rounded-[48px] shadow-2xl w-[320px] h-[640px] flex flex-col overflow-hidden ring-4 ring-slate-800"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)'
        }}
      >
        
        {/* Smartphone Camera Punchhole & Ear Speaker */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-b-2xl z-50 flex items-center justify-center gap-1">
          <div className="w-12 h-1 bg-zinc-800 rounded-full" /> {/* Ear Speaker */}
          <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full border border-zinc-800" /> {/* Camera */}
        </div>

        {/* 1. Android Status Bar */}
        <div className="bg-slate-950 text-white h-7 px-6 pt-1 flex items-center justify-between text-[10px] font-semibold z-40 shrink-0">
          <span>{phoneTime}</span>
          <div className="flex items-center gap-1">
            <span className="text-emerald-400 text-[8px] tracking-widest">5G</span>
            <Wifi className="w-3 h-3 text-zinc-300" />
            <span className="text-[9px]">94%</span>
            <Battery className="w-3.5 h-3.5 text-zinc-300 rotate-90 scale-90" />
          </div>
        </div>

        {/* 2. Simulated Android App Launcher / Toolbar */}
        <div className="bg-slate-900 text-zinc-300 border-b border-zinc-800 h-10 px-3 flex items-center justify-between z-40 shrink-0">
          <div className="flex items-center gap-1">
            <Menu className="w-4 h-4 text-zinc-500 hover:text-white transition cursor-pointer" />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              {activeApp === 'messages' && '💬 Messages'}
              {activeApp === 'notes' && '📝 Notepad'}
              {activeApp === 'browser' && '🌐 Google'}
              {activeApp === 'login' && '🔒 Authentication'}
            </span>
          </div>
          
          {/* Quick App Swapper Icons */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => { setActiveApp('messages'); setFocusedInputId('msg-input'); }}
              className={`p-1.5 rounded-lg transition ${activeApp === 'messages' ? 'bg-sky-500 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
              title="메시지 앱"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => { setActiveApp('notes'); setFocusedInputId('notes-input'); }}
              className={`p-1.5 rounded-lg transition ${activeApp === 'notes' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
              title="메모장 앱"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => { setActiveApp('browser'); setFocusedInputId('browser-input'); }}
              className={`p-1.5 rounded-lg transition ${activeApp === 'browser' ? 'bg-emerald-500 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
              title="브라우저 검색"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => { setActiveApp('login'); setFocusedInputId('login-password'); }}
              className={`p-1.5 rounded-lg transition ${activeApp === 'login' ? 'bg-rose-500 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}
              title="비밀번호 보안 로그인"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Simulator App Core viewport screen */}
        <div className="flex-1 bg-zinc-950 flex flex-col relative overflow-hidden">
          
          {/* APP A: MESSAGES */}
          {activeApp === 'messages' && (
            <div className="flex-1 flex flex-col bg-[#8FA7BD] p-3 overflow-y-auto pb-4 gap-2.5">
              <div className="text-[10px] text-center text-slate-700/80 font-semibold bg-white/30 backdrop-blur-sm rounded-full py-0.5 px-3 mx-auto w-fit mb-1">
                2026년 7월 5일 일요일
              </div>

              {/* Chat room scroll */}
              <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto pb-12 pr-1 select-text">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col max-w-[80%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                  >
                    <span className="text-[9px] text-slate-800 mb-0.5 ml-1">{msg.sender === 'user' ? '나' : '민지'}</span>
                    <div className="flex items-end gap-1">
                      {msg.sender === 'user' && <span className="text-[7px] text-slate-800 shrink-0">{msg.timestamp}</span>}
                      <div 
                        className={`px-3 py-1.5 rounded-2xl text-[11px] leading-snug break-all ${
                          msg.sender === 'user' 
                            ? 'bg-[#FEE500] text-zinc-900 rounded-tr-none shadow-sm' 
                            : 'bg-white text-zinc-900 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      {msg.sender !== 'user' && <span className="text-[7px] text-slate-800 shrink-0">{msg.timestamp}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Typing Input bar bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2.5 py-1.5 flex items-center gap-1.5 z-10 shadow-md">
                <input
                  id="msg-input"
                  type="text"
                  placeholder="메시지를 입력하세요..."
                  value={textValue}
                  onFocus={() => setFocusedInputId('msg-input')}
                  onChange={(e) => setTextValue(e.target.value)}
                  className="flex-1 text-[11px] px-2 py-1.5 bg-slate-100 rounded-full border border-slate-200 outline-none text-slate-900"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!textValue.trim()}
                  className="p-1.5 bg-sky-500 disabled:opacity-40 text-white rounded-full transition active:scale-95 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* APP B: NOTES */}
          {activeApp === 'notes' && (
            <div className="flex-1 flex flex-col bg-[#FCF8F2] p-4 text-zinc-800 pb-12">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-2">
                <span className="text-[11px] font-bold text-zinc-500">MEMO (작성 중)</span>
                <span className="text-[9px] text-zinc-400 font-mono">글자 수: {textValue.length}</span>
              </div>
              
              <textarea
                id="notes-input"
                placeholder="여기에 자유롭게 긴 메모를 작성해 보세요. 키보드의 타이핑 기능, 한글 완성기 및 [수정] 버튼 테스트에 안성맞춤입니다!"
                value={textValue}
                onFocus={() => setFocusedInputId('notes-input')}
                onChange={(e) => setTextValue(e.target.value)}
                className="w-full flex-1 bg-transparent resize-none border-none outline-none text-xs leading-relaxed select-text placeholder-zinc-400 focus:ring-0 text-zinc-900"
              />

              {/* Clipboard highlight helper inside Notepad */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-200">
                <button 
                  onClick={() => {
                    if (textValue.trim()) {
                      addToClipboard(textValue.trim());
                    }
                  }}
                  disabled={!textValue.trim()}
                  className="text-[9px] text-indigo-500 font-bold hover:text-indigo-600 disabled:opacity-40 cursor-pointer flex items-center gap-0.5"
                >
                  전체 복사 (클립보드에 추가)
                </button>
                <span className="text-[8px] text-zinc-400">Notepad v1.2</span>
              </div>
            </div>
          )}

          {/* APP C: BROWSER */}
          {activeApp === 'browser' && (
            <div className="flex-1 flex flex-col bg-zinc-900 p-4 pb-12 select-text">
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xl font-extrabold text-blue-500">G</span>
                  <span className="text-xl font-extrabold text-red-500">o</span>
                  <span className="text-xl font-extrabold text-yellow-500">o</span>
                  <span className="text-xl font-extrabold text-blue-500">g</span>
                  <span className="text-xl font-extrabold text-green-500">l</span>
                  <span className="text-xl font-extrabold text-red-500">e</span>
                </div>
                <span className="text-[8px] text-zinc-500">Custom Browser Simulator</span>
              </div>

              {/* Search Bar Input */}
              <div className="relative flex items-center bg-zinc-800 border border-zinc-700 rounded-full px-3.5 py-1.5 gap-2 shadow-sm focus-within:border-emerald-500">
                <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <input
                  id="browser-input"
                  type="text"
                  placeholder="Google 검색 또는 URL 입력"
                  value={textValue}
                  onFocus={() => setFocusedInputId('browser-input')}
                  onChange={(e) => setTextValue(e.target.value)}
                  className="w-full bg-transparent text-xs text-white border-none outline-none placeholder-zinc-500"
                />
              </div>

              {/* Simulated Search suggestions under active typing */}
              <div className="mt-4 flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-500 mb-1 px-1.5">추천 검색어</span>
                {browserQueries.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => setTextValue(q)}
                    className="flex items-center justify-between text-[11px] text-zinc-300 hover:bg-zinc-800 rounded-lg p-2 text-left transition"
                  >
                    <span>{q}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-zinc-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* APP D: SECURE LOGIN */}
          {activeApp === 'login' && (
            <div className="flex-1 flex flex-col bg-slate-950 p-5 justify-center items-center text-center">
              <div className="w-11 h-11 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              
              <h2 className="text-xs font-bold text-slate-100 mb-1">인증센터 로그인</h2>
              <p className="text-[9px] text-slate-400 mb-6 leading-relaxed max-w-[200px]">
                보안을 요구하는 가상 비밀번호를 입력해 보세요. 키보드의 <strong>비밀번호 힌트 방지 옵션</strong>을 실시간으로 확인할 수 있습니다.
              </p>

              {/* Form Input fields */}
              <div className="w-full flex flex-col gap-3">
                <div className="flex flex-col text-left gap-1">
                  <label className="text-[9px] text-slate-400 font-semibold px-1">아이디 (ID)</label>
                  <input
                    id="login-id"
                    type="text"
                    defaultValue="smart_user"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs outline-none text-slate-300 pointer-events-none opacity-60"
                  />
                </div>
                
                <div className="flex flex-col text-left gap-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] text-rose-400 font-bold flex items-center gap-0.5">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      비밀번호 (Password)
                    </label>
                    <span className="text-[7px] text-emerald-400 font-bold">보안 입력 작동 중</span>
                  </div>
                  
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={textValue}
                    onFocus={() => setFocusedInputId('login-password')}
                    onChange={(e) => setTextValue(e.target.value)}
                    className="w-full bg-slate-900 border border-rose-500/30 rounded-lg py-2 px-3 text-xs outline-none text-white focus:border-rose-500"
                  />
                </div>

                {/* Login Button mockup */}
                <button 
                  onClick={() => {
                    alert(`비밀번호가 안전하게 입력되었습니다: ${textValue}`);
                    setTextValue('');
                  }}
                  disabled={!textValue}
                  className="w-full mt-2 py-2 bg-rose-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>로그인 완료하기</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Launcher Keyboard Toolbar Overlay ( 다른 앱 실행 메뉴 ) */}
          <div className="absolute top-1/2 right-1.5 transform -translate-y-1/2 flex flex-col gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-1 rounded-full shadow-lg z-30">
            <span className="text-[6px] text-zinc-500 font-bold text-center border-b border-zinc-800 pb-0.5 mb-0.5">LAUNCH</span>
            <button
              onClick={() => onLaunchExternalApp('인터넷')}
              className="p-1 bg-zinc-900 text-teal-400 hover:bg-zinc-800 rounded-full transition active:scale-90"
              title="인터넷 앱 실행"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLaunchExternalApp('음성 검색')}
              className="p-1 bg-zinc-900 text-amber-400 hover:bg-zinc-800 rounded-full transition active:scale-90"
              title="음성 검색 비서 실행"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onLaunchExternalApp('설정')}
              className="p-1 bg-zinc-900 text-sky-400 hover:bg-zinc-800 rounded-full transition active:scale-90"
              title="시스템 설정 실행"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* 4. Custom Virtual Keyboard nested at bottom of the Smartphone viewport */}
        <div className="shrink-0 z-40 bg-zinc-900 border-t border-zinc-800">
          {children}
        </div>

        {/* 5. Android Navigation bar (Back, Home, Apps) */}
        <div className="bg-slate-950 h-6 px-16 flex items-center justify-between z-50 shrink-0 border-t border-slate-900">
          <ChevronLeft className="w-3.5 h-3.5 text-zinc-500 hover:text-white transition cursor-pointer" />
          <div className="w-2.5 h-2.5 border-2 border-zinc-500 rounded hover:border-white transition cursor-pointer" />
          <Menu className="w-3.5 h-3.5 text-zinc-500 hover:text-white transition cursor-pointer" />
        </div>

      </div>
    </div>
  );
}
