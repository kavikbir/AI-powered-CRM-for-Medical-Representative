import os
from typing import Annotated, Literal, Sequence, TypedDict, Optional
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool
import json
from database import SessionLocal
import models
from dotenv import load_dotenv

load_dotenv()

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "dummy_key")
llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)

class ExtractedData(TypedDict, total=False):
    doctor_name: str
    interaction_date: str
    products_discussed: list[str]
    notes: str
    follow_up_date: str

from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    intent: str
    extracted_data: dict

@tool
def save_new_meeting(doctor_name: str, interaction_type: str, notes: str, products: Optional[str] = None, follow_up_date: Optional[str] = None) -> str:
    """SaveNewMeetingTool: ONLY use this to save a NEW interaction. NEVER use this if the user is asking a question or asking for history.  """
    db = SessionLocal()
    
    # Anti-Hallucination: Prevent the AI from saving a question as a meeting!
    lower_notes = notes.lower()
    if "?" in notes or "what " in lower_notes or "can you " in lower_notes or "tell me " in lower_notes:
        db.close()
        return "ERROR: You attempted to save a question as a meeting log! Do NOT use this tool for questions. Use view_interaction_history instead."
        
    # Standardize doctor name format (e.g., "ENAKSHI" -> "Enakshi", "dr enakshi" -> "Dr Enakshi")
    doctor_name = doctor_name.title()
    
    try:
        summary_prompt = f"Summarize the following interaction notes briefly:\n{notes}"
        action_prompt = f"Extract any action items from the following notes:\n{notes}"
        summary = llm.invoke(summary_prompt).content
        action_items = llm.invoke(action_prompt).content
    except Exception as e:
        summary = "Summary generation failed."
        action_items = "Action items generation failed."

    new_interaction = models.Interaction(
        doctor_name=doctor_name,
        interaction_type=interaction_type,
        notes=notes,
        products=products,
        follow_up_date=follow_up_date,
        summary=summary,
        action_items=action_items
    )
    db.add(new_interaction)
    db.commit()
    db.refresh(new_interaction)
    db.close()
    return f"Successfully logged interaction ID {new_interaction.id} for {doctor_name}."

from typing import Optional

@tool
def edit_interaction(
    interaction_id: Optional[int] = None, 
    doctor_name: Optional[str] = None,
    new_notes: Optional[str] = None,
    new_follow_up_date: Optional[str] = None,
    new_products: Optional[str] = None,
    new_interaction_date: Optional[str] = None
) -> str:
    """EditInteractionTool: Edits an existing interaction. Provide interaction_id OR doctor_name (edits their most recent log).
    Use new_interaction_date if the user wants to backdate or fix the date of the meeting (e.g., 'yesterday', '2023-10-01').
    """
    db = SessionLocal()
    
    if interaction_id:
        interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    elif doctor_name:
        interaction = db.query(models.Interaction).filter(models.Interaction.doctor_name.ilike(f"%{doctor_name}%")).order_by(models.Interaction.id.desc()).first()
    else:
        db.close()
        return "You must provide either interaction_id or doctor_name to edit."
        
    if not interaction:
        db.close()
        return "Interaction not found."
    
    if new_notes:
        interaction.notes = new_notes
    if new_follow_up_date:
        interaction.follow_up_date = new_follow_up_date
    if new_products:
        interaction.products = new_products
    
    if new_interaction_date:
        import datetime
        lower_date = new_interaction_date.lower()
        if "yesterday" in lower_date:
            interaction.interaction_date = datetime.datetime.utcnow() - datetime.timedelta(days=1)
        elif "today" in lower_date:
            interaction.interaction_date = datetime.datetime.utcnow()
        else:
            try:
                # Try to parse a standard YYYY-MM-DD
                interaction.interaction_date = datetime.datetime.strptime(new_interaction_date, "%Y-%m-%d")
            except:
                pass

    # Re-generate summary and action items if anything changed
    try:
        summary_prompt = f"Summarize the following interaction notes (Products: {interaction.products}):\n{interaction.notes}"
        action_prompt = f"Extract any action items from the following notes:\n{interaction.notes}"
        interaction.summary = llm.invoke(summary_prompt).content
        interaction.action_items = llm.invoke(action_prompt).content
    except:
        pass
    
    db.commit()
    db.refresh(interaction)
    interaction_id = interaction.id
    db.close()
    return f"Successfully updated interaction ID {interaction_id} for {interaction.doctor_name}."

@tool
def view_interaction_history(doctor_name: str) -> str:
    """GetInteractionHistoryTool: Retrieves the interaction history for a specific HCP."""
    db = SessionLocal()
    interactions = db.query(models.Interaction).filter(models.Interaction.doctor_name.ilike(f"%{doctor_name}%")).all()
    db.close()
    if not interactions:
        return f"No history found for {doctor_name}."
    
    history = [f"ID: {i.id} | Date: {i.interaction_date} | Type: {i.interaction_type} | Products: {i.products} | Notes: {i.notes}" for i in interactions]
    return "\n".join(history)

@tool
def suggest_next_action(doctor_name: str) -> str:
    """SuggestNextActionTool: Suggests the next best action for an HCP based on past interactions."""
    history = view_interaction_history.invoke({"doctor_name": doctor_name})
    if "No history found" in history:
        return "Not enough history to suggest a next action."
    
    prompt = f"Based on the following interaction history with {doctor_name}, suggest the best next action for the sales representative (e.g., follow-up, product push, reminder):\n{history}"
    try:
        suggestion = llm.invoke(prompt).content
        return suggestion
    except Exception as e:
        return "Failed to generate suggestion."

@tool
def generate_summary_report() -> str:
    """GenerateSummaryReportTool: Generates a weekly/monthly summary of all interactions and insights on doctors."""
    db = SessionLocal()
    interactions = db.query(models.Interaction).all()
    db.close()
    if not interactions:
        return "No interactions logged yet to summarize."
    
    history = [f"Dr: {i.doctor_name} | Date: {i.interaction_date} | Type: {i.interaction_type} | Notes: {i.notes}" for i in interactions]
    history_str = "\n".join(history[-20:]) # Limit to last 20 for prompt
    prompt = f"Create a summary report of the recent activities based on the following logs. Highlight insights on doctors and activity patterns:\n{history_str}"
    try:
        report = llm.invoke(prompt).content
        return report
    except Exception as e:
        return "Failed to generate summary report."

@tool
def doctor_insight(doctor_name: str) -> str:
    """DoctorInsightTool: AI identifies doctor preferences and patterns based on their history."""
    history = view_interaction_history.invoke({"doctor_name": doctor_name})
    if "No history found" in history:
        return "Not enough history to generate insights."
    
    prompt = f"Analyze the following interaction history for {doctor_name} and identify their preferences, patterns, and potential opportunities:\n{history}"
    try:
        insight = llm.invoke(prompt).content
        return insight
    except Exception as e:
        return "Failed to generate doctor insights."

tools = [view_interaction_history, doctor_insight, suggest_next_action, generate_summary_report, edit_interaction, save_new_meeting]
tool_node = ToolNode(tools)

llm_with_tools = llm.bind_tools(tools)

SYSTEM_PROMPT = """You are an expert CRM AI Assistant. Your job is to listen to the user and seamlessly trigger the correct backend tool.
You MUST trigger the correct tool natively. Do NOT ask the user for permission. Do NOT ask them what they want to do.

1. `save_new_meeting`: Trigger this ONLY when the user is explicitly reporting a NEW meeting, call, or interaction that just happened. (e.g., "I called Dr. Akshay today...", "Met with Dr. Smith..."), or when user is telling you he et , consulted a dr and brefing you of saomething lke that 
2. `edit_interaction`: Trigger this if the user wants to correct or update a previous log., user use the terms that upadte or not fever its cold  , by mistake i wrote , its not hedache its fever , add , remove or rewrite or anything in the precious notes or id field ,user use terms like no i said , but actually i meant, anything related to previous chat and he wants to uodate that 
3. `view_interaction_history`: Trigger this if the user asks "What did I discuss with Dr. X?" or wants past history.,what did dr told me , what did we discuss with dr enakshi
4. `suggest_next_action`: Trigger this if the user asks for a recommendation on what to do next with a doctor.or what should i do next or what action should i take next 
5. `doctor_insight`: Trigger this if the user asks questions about a doctor's preferences, what they generally suggest, or their profile (e.g., "What does Dr. Joshi generally suggest?", "Tell me about Dr. Joshi")., what will dr josshi do if i prescribe , what will be his next move , what does dr enakshi think of this , in avrg cases what does dr 
6. `generate_summary_report`: Trigger this ONLY if the user explicitly asks for a macro-level report of ALL their recent activities.if user use term like summarize give me sumary of my recent interactions with doctors, if user ask for last 7 days summary or today summary report or anyother date range summary , if user are data of my 1 month or 2 or 3 months interaction with doctors 

CRITICAL DISTINCTION: 
- If the user is STATING facts about a meeting that happened -> use `save_new_meeting`or in confusion state askm user a question first to confirm which state to use 
- If the user is ASKING a question about a doctor (e.g., "What does Dr. X suggest?", "What is Dr. X's profile?") -> use `doctor_insight` or `view_interaction_history`. Do NOT log interactions for questions!
- If the user just says "hello" or asks a general conversational question -> DO NOT call any tools. Just reply conversationally like a normal AI assistant.
- if user messege is static that is non anwerable or a user reply, then initiate a genral conversation with the user 
 

Use the native tool calling feature. Just use the tool, do not output raw XML, python tags, or function tags in your text response."""

def call_model(state: AgentState):
    messages = state["messages"]
    extracted = state.get("extracted_data", {})
    
    sys_msg = SystemMessage(content=SYSTEM_PROMPT)
    invoke_messages = [sys_msg] + [m for m in messages if not isinstance(m, SystemMessage)]
    
    from langchain_core.messages import ToolMessage
    if len(invoke_messages) > 0 and isinstance(invoke_messages[-1], ToolMessage):
        last_tool_msg = invoke_messages[-1]
        
        # Check if the tool was a data mutation (save/edit) or just data retrieval
        if any(action in last_tool_msg.name for action in ["save", "log"]):
            anti_loop_msg = "System: The backend tool executed successfully and the data is saved. Please tell the user 'I have successfully saved the meeting.' and do not call any more tools."
        elif "edit" in last_tool_msg.name:
            anti_loop_msg = "System: The backend tool executed successfully and the interaction has been updated. Please tell the user 'I have successfully updated the log.' and do not call any more tools."
        else:
            anti_loop_msg = f"System: The backend tool executed successfully and returned the data above. Please summarize the data you just received to answer my original question. Do not call any more tools."
            
        from langchain_core.messages import HumanMessage
        invoke_messages.append(HumanMessage(content=anti_loop_msg))
        response = llm.invoke(invoke_messages)
    else:
        try:
            response = llm_with_tools.invoke(invoke_messages)
        except Exception as e:
            # Fallback for Groq/Llama 3.1 tool call failures
            response = llm.invoke(invoke_messages)
        
    import re
    import json
    
    # NLP Native Extraction: Capture the arguments the LLM decided to use!
    
    # 1. Fallback Parser for Groq Llama 3.1 XML Leak (Relaxed Regex)
    if not getattr(response, "tool_calls", None) and response.content and "<function=" in response.content:
        match = re.search(r'<function=(\w+)>(.*)', response.content, re.DOTALL)
        if match:
            tool_name = match.group(1)
            content = match.group(2).split("</function>")[0].strip()
            try:
                tool_args = json.loads(content)
                response.tool_calls = [{"name": tool_name, "args": tool_args, "id": "call_manual_" + str(hash(content))}]
            except:
                # If JSON is still malformed, try to find a JSON-like block
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        tool_args = json.loads(json_match.group(0))
                        response.tool_calls = [{"name": tool_name, "args": tool_args, "id": "call_manual_v2"}]
                    except:
                        pass

    # 2. Extract arguments for UI
    if getattr(response, "tool_calls", None):
        for tc in response.tool_calls:
            if tc["name"] == "save_new_meeting":
                args = tc["args"]
                extracted.update({
                    "doctor_name": args.get("doctor_name", "").title(),
                    "interaction_type": args.get("interaction_type", "In-person"),
                    "products_discussed": [args.get("products", "")] if args.get("products") else [],
                    "notes": args.get("notes", ""),
                    "follow_up_date": args.get("follow_up_date", "")
                })
                
    return {"messages": [response], "extracted_data": extracted}

def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    messages = state["messages"]
    last_message = messages[-1]
    # If the last message is an AIMessage without tool calls, end.
    if getattr(last_message, "tool_calls", None):
        return "tools"
    return "__end__"

workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")

app = workflow.compile()

def process_chat(message: str, thread_id: str):
    try:
        inputs = {"messages": [HumanMessage(content=message)]}
        config = {"configurable": {"thread_id": thread_id}}
        result = app.invoke(inputs, config=config)
        
        extracted = result.get("extracted_data", {})
        
        return {
            "response": result["messages"][-1].content,
            "extracted_data": extracted
        }
    except Exception as e:
        import traceback
        with open("error_log.txt", "w") as f:
            f.write(traceback.format_exc())
        raise e
