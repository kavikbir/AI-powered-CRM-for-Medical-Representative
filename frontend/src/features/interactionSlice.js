import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const fetchInteractions = createAsyncThunk('interactions/fetch', async () => {
  // Add timestamp to prevent browser caching
  const response = await axios.get(`${API_URL}/interactions?t=${Date.now()}`);
  return response.data;
});

export const addInteraction = createAsyncThunk('interactions/add', async (interaction) => {
  const response = await axios.post(`${API_URL}/interactions`, interaction);
  return response.data;
});

export const chatWithAgent = createAsyncThunk('interactions/chat', async (messageData) => {
  const response = await axios.post(`${API_URL}/chat`, messageData);
  return response.data;
});

const interactionSlice = createSlice({
  name: 'interactions',
  initialState: {
    list: [],
    status: 'idle',
    chatHistory: [],
    chatStatus: 'idle',
    extractedData: null,
  },
  reducers: {
    addChatUserMessage: (state, action) => {
      state.chatHistory.push({ role: 'user', content: action.payload });
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.list = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchInteractions.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(addInteraction.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(chatWithAgent.pending, (state) => {
        state.chatStatus = 'loading';
      })
      .addCase(chatWithAgent.fulfilled, (state, action) => {
        state.chatHistory.push({ role: 'agent', content: action.payload.response });
        state.extractedData = action.payload.extracted_data;
        state.chatStatus = 'succeeded';
      })
      .addCase(chatWithAgent.rejected, (state) => {
        state.chatHistory.push({ role: 'agent', content: "Sorry, I'm having trouble connecting to the server. Please check your connection." });
        state.chatStatus = 'failed';
      });
  },
});

export const { addChatUserMessage } = interactionSlice.actions;
export default interactionSlice.reducer;
