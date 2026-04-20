from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()

# Isso define o formato do Lead que vamos receber
class Lead(BaseModel):
    nome: str
    telefone: str

# Rota 1: Quando você acessar o site, ele mostra a tela HTML
@app.get("/")
def mostrar_tela():
    return FileResponse("../../front-end/index.html")

# Rota 2: A porta que vai receber os dados do formulário
@app.post("/api/leads")
def salvar_lead(lead: Lead):
    print(f"✅ Novo lead recebido com sucesso: {lead.nome} - {lead.telefone}")
    
    return {"mensagem": "Lead salvo com sucesso!"}