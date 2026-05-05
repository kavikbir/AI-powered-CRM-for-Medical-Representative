import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInteractions, addInteraction, chatWithAgent, addChatUserMessage } from './features/interactionSlice';
import { Send, MessageSquare, Save, History, User, Bot, ClipboardList, Activity, LayoutDashboard, FileText } from 'lucide-react';

function App() {
  const dispatch = useDispatch();
  const interactions = useSelector((state) => state.interactions.list);
  const status = useSelector((state) => state.interactions.status);
  const chatHistory = useSelector((state) => state.interactions.chatHistory);
  const chatStatus = useSelector((state) => state.interactions.chatStatus);
  const extractedData = useSelector((state) => state.interactions.extractedData);
  const chatEndRef = useRef(null);
  
  const [formData, setFormData] = useState({
    doctor_name: '',
    interaction_type: 'In-person',
    notes: '',
    products: '',
    follow_up_date: ''
  });
  
  const [chatInput, setChatInput] = useState('');
  const [leftTab, setLeftTab] = useState('chat'); // 'chat' or 'history'
  
  useEffect(() => {
    dispatch(fetchInteractions());

    // WebSockets are not supported on Vercel Serverless Functions.
    // We only enable them in development or if a specific WS URL is provided.
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

  useEffect(() => {
    if (extractedData) {
      setFormData(prev => {
        let matchedType = prev.interaction_type;
        if (extractedData.interaction_type) {
          const t = extractedData.interaction_type.toLowerCase();
          if (t.includes('call')) matchedType = 'Call';
          else if (t.includes('email')) matchedType = 'Email';
          else if (t.includes('virtual')) matchedType = 'Virtual Meeting';
          else matchedType = 'In-person';
        }
        
        return {
          ...prev,
          doctor_name: extractedData.doctor_name || prev.doctor_name,
          notes: extractedData.notes || prev.notes,
          products: extractedData.products_discussed ? extractedData.products_discussed.join(', ') : prev.products,
          follow_up_date: extractedData.follow_up_date || prev.follow_up_date,
          interaction_type: matchedType
        };
      });
    }
  }, [extractedData]);

  useEffect(() => {
    if (leftTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, leftTab]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await dispatch(addInteraction(formData));
    dispatch(fetchInteractions()); 
    setFormData({ doctor_name: '', interaction_type: 'In-person', notes: '', products: '', follow_up_date: '' });
    setLeftTab('history'); 
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    dispatch(addChatUserMessage(chatInput));
    await dispatch(chatWithAgent({ message: chatInput, thread_id: 'default' }));
    dispatch(fetchInteractions());
    setChatInput('');
  };

  return (
    <div className="h-screen w-full font-inter text-slate-800 flex flex-col bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-sm flex items-center justify-center">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <span>AI-First CRM</span> 
              <span className="font-light text-slate-400">| HCP Module</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-grow p-6 w-full max-w-[1800px] mx-auto overflow-hidden flex gap-6">
        
        {/* LEFT COLUMN: AI CHAT or HISTORY */}
        <div className="w-2/3 flex flex-col gap-4 h-full overflow-hidden">
          {/* Tab Selection */}
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200 shrink-0 w-fit">
            <button 
              onClick={() => setLeftTab('chat')}
              className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-[14px] transition-all ${leftTab === 'chat' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <MessageSquare size={18} /> AI Assistant
            </button>
            <button 
              onClick={() => setLeftTab('history')}
              className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-[14px] transition-all ${leftTab === 'history' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
          </div>

          <div className="clean-panel rounded-2xl flex flex-col flex-1 overflow-hidden shadow-md border-slate-200">
            {leftTab === 'chat' ? (
              // AI Chat Interface
              <>
                <div className="p-5 border-b border-indigo-500 flex items-center justify-between bg-indigo-600 text-white shrink-0">
                  <div className="flex items-center gap-3">
                    <Bot className="text-indigo-100" size={24} />
                    <h2 className="font-bold text-lg tracking-wide">Intelligent Field Assistant</h2>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest bg-indigo-700 px-3 py-1.5 rounded-md border border-indigo-500 shadow-inner">Online</span>
                </div>

                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 bg-slate-50/50">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <div className="bg-indigo-100 p-6 rounded-full mb-6 shadow-inner border border-indigo-200">
                        <Bot size={48} className="text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to assist</h3>
                      <p className="text-sm max-w-[350px] text-center leading-relaxed text-slate-500 font-medium">
                        Log a meeting, correct a previous entry, or ask for a summary of a doctor's history. Just chat naturally.
                      </p>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-white border border-slate-200'}`}>
                          {msg.role === 'user' ? <User size={18} className="text-white" /> : <Bot size={18} className="text-indigo-600" />}
                        </div>
                        <div className={`p-4 rounded-2xl text-[14px] font-medium leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {chatStatus === 'loading' && (
                    <div className="flex gap-3 max-w-[85%] self-start">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                         <Bot size={18} className="text-indigo-600" />
                      </div>
                      <div className="p-5 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm flex gap-2 items-center">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="p-5 border-t border-slate-200 bg-white shrink-0">
                  <form onSubmit={handleChatSubmit} className="flex gap-3 relative">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-grow p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-[15px] text-slate-800 placeholder-slate-400 shadow-inner font-medium"
                      placeholder="Type a message to your AI assistant..."
                    />
                    <button 
                      type="submit" 
                      disabled={chatStatus === 'loading'}
                      className="bg-indigo-600 text-white px-8 rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none flex items-center justify-center shadow-md gap-2 font-bold"
                    >
                      <Send size={18} /> Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              // History Dashboard Interface
              <>
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
                  <div className="flex items-center gap-3">
                    <History className="text-emerald-500" size={24} />
                    <h2 className="font-bold text-lg text-slate-800 tracking-wide">Interaction Log</h2>
                  </div>
                  <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm">
                    Total Logs: {interactions.length}
                  </span>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                  {interactions && interactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm font-medium">
                      {status === 'loading' ? 'Loading history...' : 'No interactions logged yet.'}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {[...interactions].reverse().map((interaction) => (
                        <div key={interaction.id} className="border border-slate-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all bg-white shadow-sm group">
                          <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-4">
                            <div>
                              <h3 className="font-extrabold text-slate-800 text-xl flex items-center gap-3">
                                {interaction.doctor_name}
                                <span className="bg-slate-100 text-slate-400 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-colors">#{interaction.id}</span>
                              </h3>
                              <div className="text-sm font-medium text-slate-500 mt-2 flex gap-3 items-center">
                                <span className="text-slate-600 font-semibold">{new Date(interaction.interaction_date).toLocaleDateString()}</span>
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                                <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-xs border border-indigo-100">{interaction.interaction_type}</span>
                              </div>
                            </div>
                            {interaction.follow_up_date && (
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Follow-up</span>
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 shadow-sm">{interaction.follow_up_date}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div className="pr-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Original Notes</span>
                              <p className="text-[14px] text-slate-600 leading-relaxed font-medium">{interaction.notes}</p>
                              {interaction.products && (
                                <div className="mt-4">
                                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md inline-block border border-indigo-200 shadow-sm">{interaction.products}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-4">
                              {interaction.summary && interaction.summary !== "Summary generation failed." && (
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative overflow-hidden group-hover:border-emerald-200 group-hover:bg-emerald-50/30 transition-colors">
                                  <div className="absolute left-0 top-0 w-1 h-full bg-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-2">AI Summary</span>
                                  <p className="text-[13px] text-slate-700 font-medium leading-relaxed">{interaction.summary}</p>
                                </div>
                              )}
                              {interaction.action_items && interaction.action_items !== "Action items generation failed." && (
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative overflow-hidden group-hover:border-amber-200 group-hover:bg-amber-50/30 transition-colors">
                                  <div className="absolute left-0 top-0 w-1 h-full bg-amber-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-2">Extracted Actions</span>
                                  <p className="text-[13px] text-slate-700 font-medium leading-relaxed whitespace-pre-line">{interaction.action_items}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MANUAL FORM */}
        <div className="w-1/3 clean-panel rounded-2xl flex flex-col h-full overflow-hidden shrink-0 shadow-lg border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-slate-800" size={24} />
              <h2 className="font-bold text-lg text-slate-800 tracking-wide">Manual Entry</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shadow-inner">Fallback Tool</span>
          </div>
          
          <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50">
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-5 h-full">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Doctor Name</label>
                  <input 
                    type="text" 
                    value={formData.doctor_name}
                    onChange={(e) => setFormData({...formData, doctor_name: e.target.value})}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-slate-800 font-medium shadow-inner"
                    placeholder="e.g., Dr. Jane Smith"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Type</label>
                    <select 
                      value={formData.interaction_type}
                      onChange={(e) => setFormData({...formData, interaction_type: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-slate-800 font-medium appearance-none shadow-inner"
                    >
                      <option>In-person</option>
                      <option>Call</option>
                      <option>Email</option>
                      <option>Virtual Meeting</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Follow-up</label>
                    <input 
                      type="text" 
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-slate-800 font-medium shadow-inner"
                      placeholder="e.g., Next Mon"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Products</label>
                  <input 
                    type="text" 
                    value={formData.products}
                    onChange={(e) => setFormData({...formData, products: e.target.value})}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm text-slate-800 font-medium shadow-inner"
                    placeholder="e.g., Insulin"
                  />
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-grow">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Interaction Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full flex-grow p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-[15px] text-slate-800 resize-none min-h-[150px] font-medium shadow-inner leading-relaxed"
                  placeholder="Summarize the key points of the meeting here..."
                  required
                />
              </div>

              <button type="submit" className="w-full bg-slate-800 hover:bg-black text-white p-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-md shrink-0 mt-auto hover:shadow-lg transform hover:-translate-y-0.5">
                <Save size={18} /> Save Entry Manually
              </button>
            </form>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
