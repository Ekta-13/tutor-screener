"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Assessment {
  recommendation: string;
  overallScore: number;
  summary: string;
  dimensions: {
    [key: string]: {
      score: number;
      comment: string;
      quote: string;
    };
  };
}

export default function Home() {
  const [stage, setStage] = useState<"landing" | "interview" | "assessment">("landing");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const recognitionRef = useRef<InstanceType<typeof window.SpeechRecognition> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes("Samantha") ||
        v.name.includes("Karen") ||
        v.name.includes("Daniel")
    );
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (userMessage: string, currentMessages: Message[]) => {
    setIsLoading(true);
    const updated = [
      ...currentMessages,
      { role: "user" as const, content: userMessage },
    ];
    setMessages(updated);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      const reply = data.message;

      if (!reply) {
        console.error("No message in response", data);
        setIsLoading(false);
        return;
      }

      if (reply.trim() === "INTERVIEW_COMPLETE") {
        setIsLoading(false);
        await generateAssessment(updated);
        return;
      }

      setMessages([...updated, { role: "assistant", content: reply }]);
      speak(reply);
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  };

  const generateAssessment = async (finalMessages: Message[]) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: finalMessages }),
      });
      const data = await res.json();
      setAssessment(data.assessment);
      setStage("assessment");
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  };

  const startInterview = async () => {
    setStage("interview");
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });
      const data = await res.json();
      console.log("Start interview response:", data);
      if (data.message) {
        const firstMessage = {
          role: "assistant" as const,
          content: data.message,
        };
        setMessages([firstMessage]);
        speak(data.message);
      }
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported. Please use Chrome.");
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    transcriptRef.current = "";
    setTranscript("");

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const current = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      transcriptRef.current = current;
      setTranscript(current);
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalTranscript = transcriptRef.current;
      if (finalTranscript.trim()) {
        setTranscript("");
        transcriptRef.current = "";
        setMessages((prev) => {
          sendMessage(finalTranscript, prev);
          return prev;
        });
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 6) return "text-yellow-400";
    return "text-red-400";
  };

  if (stage === "landing") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 mb-6">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Cuemath Tutor Screener</h1>
            <p className="text-blue-200 text-lg mb-2">AI-Powered Interview Assessment</p>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Welcome! This is a short 5-minute voice interview to help us understand your teaching style and communication approach.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-6 mb-8 text-left space-y-3">
            <h2 className="text-white font-semibold mb-4">Before you begin:</h2>
            {[
              "Find a quiet place with good internet connection",
              "Allow microphone access when prompted",
              "Speak clearly and take your time — there are no trick questions",
              "The interview takes about 5 minutes",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-blue-400 mt-0.5">✓</span>
                <span className="text-slate-300 text-sm">{tip}</span>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Enter your full name"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 text-center"
            />
          </div>

          <button
            onClick={startInterview}
            disabled={!candidateName.trim()}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 text-lg"
          >
            Begin Interview
          </button>
        </div>
      </main>
    );
  }

  if (stage === "interview") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-white font-medium">Interview in progress</span>
          </div>
          <span className="text-slate-400 text-sm">{candidateName}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-3xl mx-auto w-full">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-white/10 text-slate-100"}`}>
                {msg.role === "assistant" && (
                  <p className="text-xs text-blue-300 mb-1 font-medium">Cuemath AI Interviewer</p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-white/10 px-6 py-6">
          <div className="max-w-3xl mx-auto">
            {transcript && (
              <div className="bg-white/5 rounded-xl px-4 py-2 mb-4 text-slate-300 text-sm italic">
                &quot;{transcript}&quot;
              </div>
            )}
            <div className="flex items-center justify-center gap-4">
              {isSpeaking && (
                <div className="flex items-center gap-2 text-blue-300 text-sm">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-1 bg-blue-400 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px` }}></div>
                    ))}
                  </div>
                  Speaking...
                </div>
              )}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || isSpeaking}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all duration-200 ${
                  isListening
                    ? "bg-red-500 hover:bg-red-400 text-white scale-105"
                    : "bg-blue-500 hover:bg-blue-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white"
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                {isListening ? "Stop Recording" : "Tap to Speak"}
              </button>
            </div>
            <p className="text-center text-slate-500 text-xs mt-3">
              {isListening ? "Listening... tap stop when done" : "Tap the button and speak your answer"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "assessment") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Interview Assessment</h1>
            <p className="text-slate-400">{candidateName}</p>
          </div>

          {assessment && (
            <>
              <div className={`rounded-2xl p-6 mb-6 text-center ${assessment.recommendation === "PROCEED" ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"}`}>
                <div className={`text-4xl font-bold mb-2 ${assessment.recommendation === "PROCEED" ? "text-green-400" : "text-red-400"}`}>
                  {assessment.recommendation === "PROCEED" ? "✓ Proceed to Next Round" : "✗ Not Recommended"}
                </div>
                <div className="text-white text-xl font-semibold mb-3">
                  Overall Score: {assessment.overallScore}/10
                </div>
                <p className="text-slate-300 text-sm">{assessment.summary}</p>
              </div>

              <div className="grid gap-4 mb-6">
                {Object.entries(assessment.dimensions).map(([key, val]) => (
                  <div key={key} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold capitalize">{key}</h3>
                      <span className={`text-2xl font-bold ${getScoreColor(val.score)}`}>{val.score}/10</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${val.score >= 8 ? "bg-green-400" : val.score >= 6 ? "bg-yellow-400" : "bg-red-400"}`}
                        style={{ width: `${val.score * 10}%` }}
                      ></div>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{val.comment}</p>
                    {val.quote && (
                      <p className="text-blue-300 text-xs italic">&quot;{val.quote}&quot;</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setStage("landing"); setMessages([]); setAssessment(null); setCandidateName(""); }}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Start New Interview
              </button>
            </>
          )}
        </div>
      </main>
    );
  }
}