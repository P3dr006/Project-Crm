import os
import psycopg2
from dotenv import load_dotenv

# Como está na raiz agora, o caminho é só um nível acima
load_dotenv("../../.env")

try:
    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST"),
        database=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        port=os.getenv("POSTGRES_PORT")
    )
    print("Conexão bem-sucedida! O Python alcançou o Postgres.")
    conn.close()
except Exception as e:
    print(f"Falha na conexão: {e}")

