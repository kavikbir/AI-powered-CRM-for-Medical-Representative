import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInteractions, chatWithAgent, addChatUserMessage } from './features/interactionSlice';

// ─── Design Tokens ──────────────────────────────────────────────────────────
const tokens = {
  teal: { bg: "#E1F5EE", border: "#9FE1CB", text: "#085041", mid: "#1D9E75" },
  blue: { bg: "#E6F1FB", border: "#B5D4F4", text: "#0C447C" },
  amber: { bg: "#FAEEDA", border: "#FAC775", text: "#633806" },
  coral: { bg: "#F5C4B3", border: "#F0997B", text: "#993C1D" },
};

// ─── Helper Components ────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 32 }) {
  const c = tokens[color] || tokens.teal;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: c.bg,
        border: `0.5px solid ${c.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.3,
        fontWeight: 500,
        color: c.text,
        flexShrink: 0,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {initials}
    </div>
  );
}

function Tag({ label, color = "teal" }) {
  const c = tokens[color] || tokens.teal;
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 7px",
        borderRadius: 6,
        background: c.bg,
        border: `0.5px solid ${c.border}`,
        color: c.text,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
    </span>
  );
}

function ToolPill({ label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: tokens.teal.bg,
        border: `0.5px solid ${tokens.teal.border}`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 600,
        color: tokens.teal.text,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      ⚙ {label}
    </span>
  );
}

function MetricCard({ value, label, change }) {
  return (
    <div
      style={{
        background: "var(--surface-secondary, #f7f7f5)",
        borderRadius: 10,
        padding: "10px 12px",
        flex: 1,
      }}
    >
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary, #1a1a18)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-muted, #888780)",
          marginTop: 3,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 10, color: tokens.teal.mid, marginTop: 2, fontWeight: 500 }}>
        {change}
      </div>
    </div>
  );
}

function InteractionRow({ item, isNew }) {
  if (!item) return null;
  const initials = item.doctor_name ? item.doctor_name.replace("Dr. ", "").slice(0, 2).toUpperCase() : "HP";
  // Assign color based on id or name
  const colors = ["teal", "blue", "amber", "coral"];
  const color = colors[(typeof item.id === 'number' ? item.id : 0) % 4];

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        border: isNew
          ? `0.5px solid ${tokens.teal.border}`
          : "0.5px solid var(--border, rgba(0,0,0,0.12))",
        borderRadius: 10,
        background: isNew ? tokens.teal.bg : "var(--surface-secondary, #f7f7f5)",
        transition: "all 0.3s ease",
      }}
    >
      <Avatar initials={initials} color={color} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary, #1a1a18)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {item.doctor_name}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted, #888780)" }}>
            {item.interaction_date ? new Date(item.interaction_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
          </span>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted, #888780)", marginTop: 1 }}>
          {item.interaction_type}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-secondary, #5F5E5A)",
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.summary || item.notes}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
          {item.products && typeof item.products === 'string' && item.products.split(',').map((p) => (
            <Tag key={p} label={p.trim()} color="teal" />
          ))}
          {item.follow_up_date && <Tag label={`Follow-up: ${item.follow_up_date}`} color="amber" />}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Message ─────────────────────────────────────────────────────────────
function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: "82%",
          padding: "10px 13px",
          borderRadius: 12,
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily: "'DM Sans', sans-serif",
          background: isUser
            ? "var(--surface-secondary, #f0efea)"
            : "var(--surface-tertiary, #ebebea)",
          border: isUser
            ? "0.5px solid var(--border, rgba(0,0,0,0.12))"
            : "0.5px solid var(--border-em, rgba(0,0,0,0.18))",
          color: "var(--text-primary, #1a1a18)",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            marginBottom: 4,
            color: isUser ? "var(--text-muted, #888780)" : tokens.teal.mid,
            textAlign: isUser ? "right" : "left",
          }}
        >
          {isUser ? "You" : "AI Assistant"}
        </div>
        {msg.content}
        {msg.tools && msg.tools.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7 }}>
            {msg.tools.map((t) => (
              <ToolPill key={t} label={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ activeTab, setActiveTab }) {
  const tabs = ["Log Interaction", "Analytics", "Doctors", "Follow-ups"];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        background: "var(--surface-primary, #fff)",
        borderBottom: "0.5px solid var(--border, rgba(0,0,0,0.12))",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: tokens.teal.mid,
          }}
        />
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary, #1a1a18)",
            letterSpacing: "0.02em",
          }}
        >
          HCP CRM
        </span>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontSize: 12,
              padding: "5px 12px",
              borderRadius: 8,
              border: activeTab === tab ? "0.5px solid var(--border-em, rgba(0,0,0,0.2))" : "0.5px solid transparent",
              background: activeTab === tab ? "var(--surface-secondary, #f0efea)" : "transparent",
              color: activeTab === tab ? "var(--text-primary, #1a1a18)" : "var(--text-muted, #888780)",
              cursor: "pointer",
              fontWeight: activeTab === tab ? 500 : 400,
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: tokens.teal.mid,
          }}
        />
        <span style={{ fontSize: 11, color: "var(--text-muted, #888780)", fontFamily: "'DM Sans', sans-serif" }}>
          Live sync
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: tokens.teal.bg,
            border: `0.5px solid ${tokens.teal.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 500,
            color: tokens.teal.text,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          MR
        </div>
      </div>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ messages, onSend, chatStatus }) {
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || chatStatus === 'loading') return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--surface-primary, #fff)",
        borderRight: "0.5px solid var(--border, rgba(0,0,0,0.12))",
      }}
    >
      <div
        style={{
          padding: "12px 16px 8px",
          borderBottom: "0.5px solid var(--border, rgba(0,0,0,0.12))",
        }}
      >
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-muted, #888780)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          AI Assistant
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 14px 8px",
        }}
      >
        {Array.isArray(messages) && messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}
        {chatStatus === 'loading' && (
           <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
             <div style={{ padding: "10px 13px", borderRadius: 12, background: "var(--surface-tertiary, #ebebea)", fontSize: 13 }}>
                <span className="animate-pulse">Thinking...</span>
             </div>
           </div>
        )}
        <div ref={endRef} />
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderTop: "0.5px solid var(--border, rgba(0,0,0,0.12))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface-secondary, #f0efea)",
            border: "0.5px solid var(--border-em, rgba(0,0,0,0.18))",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Log a meeting or ask about a doctor..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "var(--text-primary, #1a1a18)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <button
            onClick={handleSend}
            disabled={chatStatus === 'loading'}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: tokens.teal.mid,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: "#fff",
              flexShrink: 0,
              transition: "opacity 0.15s",
              opacity: chatStatus === 'loading' ? 0.5 : 1,
            }}
          >
            ↑
          </button>
        </div>
        <div
          style={{
            marginTop: 6,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {[
            "I met Dr. Sharma today...",
            "What are Dr. Kumar's concerns?",
            "Log a call with Dr. Patel",
          ].map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 6,
                border: "0.5px solid var(--border, rgba(0,0,0,0.12))",
                background: "transparent",
                color: "var(--text-muted, #888780)",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Panel ──────────────────────────────────────────────────────────
function DashboardPanel({ interactions, newestId }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--surface-primary, #fff)",
      }}
    >
      <div
        style={{
          padding: "12px 16px 8px",
          borderBottom: "0.5px solid var(--border, rgba(0,0,0,0.12))",
        }}
      >
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-muted, #888780)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Interaction Dashboard
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 14px",
          borderBottom: "0.5px solid var(--border, rgba(0,0,0,0.12))",
        }}
      >
        <MetricCard value={Array.isArray(interactions) ? interactions.length : 0} label="Total logs" change="+1 today" />
        <MetricCard value={Array.isArray(interactions) ? interactions.filter(i => i && i.follow_up_date).length : 0} label="Follow-ups" change="Active" />
        <MetricCard value={new Set(Array.isArray(interactions) ? interactions.map(i => i ? i.doctor_name : '') : []).size} label="Doctors" change="Active" />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px 6px",
        }}
      >
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-muted, #888780)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Recent Interactions
        </span>
        <span
          style={{
            fontSize: 11,
            color: tokens.teal.mid,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          View all →
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 14px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {Array.isArray(interactions) && [...interactions].reverse().map((item) => (
          item && <InteractionRow key={item.id} item={item} isNew={item.id === newestId} />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 14px 10px",
          borderTop: "0.5px solid var(--border, rgba(0,0,0,0.12))",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: tokens.teal.mid,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: tokens.teal.mid,
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {window.location.hostname === 'localhost' ? 'WebSocket connected' : 'Cloud sync active'}
        </span>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const dispatch = useDispatch();
  const interactions = useSelector((state) => state.interactions.list);
  const chatHistory = useSelector((state) => state.interactions.chatHistory);
  const chatStatus = useSelector((state) => state.interactions.chatStatus);
  
  const [activeTab, setActiveTab] = useState("Log Interaction");
  const [newestId, setNewestId] = useState(null);

  useEffect(() => {
    console.log("App starting... interactions:", interactions);
    dispatch(fetchInteractions());

    // WebSockets are not supported on Vercel Serverless Functions.
    const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'ws://localhost:8000/ws' : null);
    
    if (wsUrl) {
      const socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        if (event.data === 'update') {
          dispatch(fetchInteractions());
        }
      };
      return () => socket.close();
    }
  }, [dispatch]);

  const handleSend = async (text) => {
    dispatch(addChatUserMessage(text));
    const result = await dispatch(chatWithAgent({ message: text, thread_id: 'default' }));
    
    if (result.payload && result.payload.extracted_data) {
       dispatch(fetchInteractions());
       // Find the newest interaction if it was just created
       // This is a bit tricky since we don't have the ID yet, but fetchInteractions will update the list
    }
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "var(--color-background-tertiary, #f4f3ef)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* App Shell */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-primary, #fff)",
          boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12)",
        }}
      >
        <Topbar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            overflow: "hidden",
          }}
        >
          <ChatPanel messages={chatHistory} onSend={handleSend} chatStatus={chatStatus} />
          <DashboardPanel interactions={interactions} newestId={newestId} />
        </div>
      </div>
    </div>
  );
}
