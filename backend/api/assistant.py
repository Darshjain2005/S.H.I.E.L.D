from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.llm_service import LLMService

router = APIRouter(prefix="/api/assistant", tags=["assistant"])
llm_service = LLMService()

class ChatRequest(BaseModel):
    message: str
    incident_id: str = None

class ChatResponse(BaseModel):
    reply: str

@router.post("/query", response_model=ChatResponse)
async def query_assistant(request: ChatRequest):
    system_prompt = """
    You are the Agentic SOC Copilot. 
    Assist the human analyst in investigating cybersecurity incidents.
    Keep your answers concise, structured, and action-oriented.
    """
    
    # In a real app, we would fetch the incident context here and pass it
    context = f"User message: {request.message}"
    if request.incident_id:
        context = f"[Context: Incident {request.incident_id}]\n{context}"
        
    try:
        reply = await llm_service.analyze(context, system_prompt, use_json=False)
        return ChatResponse(reply=reply)
    except Exception as e:
        error_msg = str(e)
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            error_msg = e.response.text
        print(f"Assistant Error: {error_msg}")
        return ChatResponse(reply=f"AI Assistant Error: Please check your API key. (Details: {error_msg[:100]}...)")
